-- Drop old policies that reference map_id
DROP POLICY IF EXISTS "Users can view chunks of their own maps" ON public.chunks;
DROP POLICY IF EXISTS "Users can create chunks for their own maps" ON public.chunks;
DROP POLICY IF EXISTS "Users can update chunks of their own maps" ON public.chunks;
DROP POLICY IF EXISTS "Users can delete chunks of their own maps" ON public.chunks;

-- Recreate policies with correct column name momentum_map_id
CREATE POLICY "Users can view chunks of their own maps"
  ON public.chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.momentum_maps
      WHERE momentum_maps.id = chunks.momentum_map_id
      AND momentum_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chunks for their own maps"
  ON public.chunks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.momentum_maps
      WHERE momentum_maps.id = chunks.momentum_map_id
      AND momentum_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chunks of their own maps"
  ON public.chunks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.momentum_maps
      WHERE momentum_maps.id = chunks.momentum_map_id
      AND momentum_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks of their own maps"
  ON public.chunks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.momentum_maps
      WHERE momentum_maps.id = chunks.momentum_map_id
      AND momentum_maps.user_id = auth.uid()
    )
  );

-- Update the index as well
DROP INDEX IF EXISTS idx_chunks_map_id;
CREATE INDEX idx_chunks_momentum_map_id ON public.chunks(momentum_map_id);