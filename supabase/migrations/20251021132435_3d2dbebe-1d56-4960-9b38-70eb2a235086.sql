-- Add sort_order column to sub_steps table
ALTER TABLE public.sub_steps ADD COLUMN sort_order INTEGER;

-- Set sort_order to match order_index for existing rows
UPDATE public.sub_steps SET sort_order = order_index WHERE sort_order IS NULL;