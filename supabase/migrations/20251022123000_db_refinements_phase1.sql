-- Reconciliation Migration: Phase 1 Database Refinements
-- Date: 2025-10-22
-- Purpose: Normalize schema across environments to match app needs and spec

-- 1) Ensure thought_status enum includes 'processing' (retain existing values)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'thought_status' AND e.enumlabel = 'processing'
  ) THEN
    ALTER TYPE thought_status ADD VALUE 'processing';
  END IF;
END $$;

-- 2) thought_categories canonical shape: composite PK, no surrogate id
ALTER TABLE IF EXISTS public.thought_categories
  DROP COLUMN IF EXISTS id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.thought_categories'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.thought_categories
      ADD PRIMARY KEY (thought_id, category_id);
  END IF;
END $$;

-- Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_thought_categories_thought ON public.thought_categories(thought_id);
CREATE INDEX IF NOT EXISTS idx_thought_categories_category ON public.thought_categories(category_id);

-- 3) clusters/cluster_thoughts quality-of-life columns and indexes
ALTER TABLE IF EXISTS public.clusters
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_collapsed BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE IF EXISTS public.cluster_thoughts
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_cluster_thoughts_cluster_completed
  ON public.cluster_thoughts (cluster_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_cluster_thoughts_thought ON public.cluster_thoughts(thought_id);

-- 4) momentum_maps fields
-- Ensure acceptance_criteria TEXT[] exists (added in prior migrations in most envs)
ALTER TABLE IF EXISTS public.momentum_maps
  ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT[] DEFAULT '{}'::text[];

-- Normalize locked_chunks to UUID[] if currently TEXT[] in this environment
DO $$
DECLARE
  v_udt TEXT;
BEGIN
  SELECT udt_name INTO v_udt
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='momentum_maps' AND column_name='locked_chunks';

  IF v_udt IS NULL THEN
    -- Column missing: add as UUID[]
    ALTER TABLE public.momentum_maps
      ADD COLUMN locked_chunks UUID[] DEFAULT '{}'::uuid[];
  ELSIF v_udt = '_text' THEN
    -- Convert from TEXT[] -> UUID[] (requires all values to be valid UUIDs)
    ALTER TABLE public.momentum_maps
      ALTER COLUMN locked_chunks TYPE uuid[] USING locked_chunks::uuid[];
  END IF;
END $$;

-- 5) Chunks/Sub-steps indexing for ordering and filtering
CREATE INDEX IF NOT EXISTS idx_chunks_momentum_map_sort_order ON public.chunks (momentum_map_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_sub_steps_chunk_completed_sort ON public.sub_steps (chunk_id, is_completed, sort_order);

-- 6) Connections helpful indexes
CREATE INDEX IF NOT EXISTS idx_connections_user_thought1 ON public.connections(user_id, thought1_id);
CREATE INDEX IF NOT EXISTS idx_connections_user_thought2 ON public.connections(user_id, thought2_id);

-- 7) Anchors table per Smart Reminders spec (days[], start_min/end_min)
CREATE TABLE IF NOT EXISTS public.anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  days INT[] NOT NULL,
  start_min INT NOT NULL CHECK (start_min >= 0 AND start_min <= 1439),
  end_min INT NOT NULL CHECK (end_min > start_min AND end_min <= 1440),
  color TEXT DEFAULT '#e57452',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.anchors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='anchors' AND policyname='Users can manage own anchors'
  ) THEN
    CREATE POLICY "Users can manage own anchors"
      ON public.anchors FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Indexes for anchors
CREATE INDEX IF NOT EXISTS idx_anchors_user ON public.anchors(user_id);
CREATE INDEX IF NOT EXISTS idx_anchors_days_gin ON public.anchors USING GIN(days);

-- updated_at trigger helper (idempotent)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_anchors_updated_at'
  ) THEN
    CREATE TRIGGER update_anchors_updated_at
      BEFORE UPDATE ON public.anchors
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- 8) Database functions
-- 8a) Cluster progress aggregation
CREATE OR REPLACE FUNCTION public.get_cluster_progress(p_cluster_id uuid)
RETURNS TABLE(total INT, completed INT, percent NUMERIC)
LANGUAGE sql STABLE AS $$
  SELECT
    COUNT(*)::INT AS total,
    COUNT(*) FILTER (WHERE is_completed)::INT AS completed,
    CASE WHEN COUNT(*) = 0 THEN 0
         ELSE ROUND((COUNT(*) FILTER (WHERE is_completed))::NUMERIC * 100 / COUNT(*), 2)
    END AS percent
  FROM public.cluster_thoughts
  WHERE cluster_id = p_cluster_id;
$$;

-- 8b) Thought connections fetcher
CREATE OR REPLACE FUNCTION public.get_thought_connections(p_thought_id uuid)
RETURNS SETOF public.connections
LANGUAGE sql STABLE AS $$
  SELECT c.*
  FROM public.connections c
  WHERE c.thought1_id = p_thought_id OR c.thought2_id = p_thought_id;
$$;

-- 8c) Next occurrences for an anchor (UTC), simple helper for scheduling
CREATE OR REPLACE FUNCTION public.next_anchor_occurrences(
  p_anchor_id uuid,
  p_from_ts timestamptz,
  p_days_ahead int DEFAULT 14
) RETURNS SETOF timestamptz
LANGUAGE plpgsql STABLE AS $$
DECLARE
  a_days INT[];
  a_start INT;
  i INT;
  d DATE;
  dow INT;
  ts timestamptz;
BEGIN
  SELECT days, start_min INTO a_days, a_start
  FROM public.anchors
  WHERE id = p_anchor_id;

  IF a_days IS NULL THEN
    RETURN;
  END IF;

  FOR i IN 0..p_days_ahead LOOP
    d := (date_trunc('day', p_from_ts) + make_interval(days => i))::date;
    dow := EXTRACT(DOW FROM d)::INT; -- 0=Sunday..6=Saturday
    IF dow = ANY (a_days) THEN
      ts := (d::timestamp AT TIME ZONE 'UTC') + make_interval(mins => a_start);
      RETURN NEXT ts;
    END IF;
  END LOOP;
  RETURN;
END;
$$;
