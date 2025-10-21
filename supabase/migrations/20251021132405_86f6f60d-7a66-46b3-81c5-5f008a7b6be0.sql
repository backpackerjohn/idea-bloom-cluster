-- Rename map_id back to momentum_map_id to match the code
ALTER TABLE public.chunks RENAME COLUMN map_id TO momentum_map_id;

-- Add time_estimate column to sub_steps
ALTER TABLE public.sub_steps ADD COLUMN time_estimate TEXT DEFAULT '30 mins';