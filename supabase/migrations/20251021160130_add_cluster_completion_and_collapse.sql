-- Migration: Add required fields for Brain Dump spec compliance
-- Source spec: Brain Dump Prompt 3 data base and logic (many-to-many + completion + collapse state)
-- Adds:
-- 1) public.cluster_thoughts.is_completed (BOOLEAN DEFAULT false)
-- 2) public.clusters.is_collapsed (BOOLEAN DEFAULT true)
-- Plus a composite index to optimize common queries

-- 1) Add is_completed to cluster_thoughts
ALTER TABLE public.cluster_thoughts
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false;

-- Helpful composite index for filtering by cluster and completion state
CREATE INDEX IF NOT EXISTS idx_cluster_thoughts_cluster_completed
  ON public.cluster_thoughts (cluster_id, is_completed);

-- 2) Add is_collapsed to clusters
ALTER TABLE public.clusters
ADD COLUMN IF NOT EXISTS is_collapsed BOOLEAN NOT NULL DEFAULT true;
