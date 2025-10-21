-- Add missing columns to clusters table
ALTER TABLE public.clusters ADD COLUMN is_collapsed BOOLEAN DEFAULT false;

-- Add missing columns to cluster_thoughts table  
ALTER TABLE public.cluster_thoughts ADD COLUMN is_completed BOOLEAN DEFAULT false;

-- Add missing columns to momentum_maps table
ALTER TABLE public.momentum_maps ADD COLUMN description TEXT;
ALTER TABLE public.momentum_maps ADD COLUMN target_date DATE;
ALTER TABLE public.momentum_maps ADD COLUMN ai_generated BOOLEAN DEFAULT true;
ALTER TABLE public.momentum_maps ADD COLUMN completed_at TIMESTAMPTZ;

-- Rename map_id to momentum_map_id in chunks table for consistency
ALTER TABLE public.chunks RENAME COLUMN map_id TO momentum_map_id;

-- Create enum for thought status
CREATE TYPE thought_status AS ENUM ('active', 'archived', 'completed');

-- Update thoughts table to use enum - drop default first, then alter type, then add default back
ALTER TABLE public.thoughts ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.thoughts ALTER COLUMN status TYPE thought_status USING status::thought_status;
ALTER TABLE public.thoughts ALTER COLUMN status SET DEFAULT 'active'::thought_status;