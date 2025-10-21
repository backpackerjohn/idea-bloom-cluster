-- Revert the rename - keep it as map_id
ALTER TABLE public.chunks RENAME COLUMN momentum_map_id TO map_id;

-- Add missing columns to chunks table
ALTER TABLE public.chunks ADD COLUMN sort_order INTEGER;
ALTER TABLE public.chunks ADD COLUMN status TEXT DEFAULT 'pending';
ALTER TABLE public.chunks ADD COLUMN completed_at TIMESTAMPTZ;

-- Set sort_order to match order_index for existing rows
UPDATE public.chunks SET sort_order = order_index WHERE sort_order IS NULL;