-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create thoughts table for brain dump
CREATE TABLE public.thoughts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own thoughts"
  ON public.thoughts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own thoughts"
  ON public.thoughts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own thoughts"
  ON public.thoughts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own thoughts"
  ON public.thoughts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_thoughts_user_id ON public.thoughts(user_id);
CREATE INDEX idx_thoughts_status ON public.thoughts(status);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- Create thought_categories junction table
CREATE TABLE public.thought_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(thought_id, category_id)
);

ALTER TABLE public.thought_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own thought categories"
  ON public.thought_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_categories.thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own thought categories"
  ON public.thought_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_categories.thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own thought categories"
  ON public.thought_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_categories.thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

-- Create clusters table
CREATE TABLE public.clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clusters"
  ON public.clusters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clusters"
  ON public.clusters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clusters"
  ON public.clusters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clusters"
  ON public.clusters FOR DELETE
  USING (auth.uid() = user_id);

-- Create cluster_thoughts junction table
CREATE TABLE public.cluster_thoughts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cluster_id, thought_id)
);

ALTER TABLE public.cluster_thoughts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cluster thoughts"
  ON public.cluster_thoughts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clusters
      WHERE clusters.id = cluster_thoughts.cluster_id
      AND clusters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own cluster thoughts"
  ON public.cluster_thoughts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clusters
      WHERE clusters.id = cluster_thoughts.cluster_id
      AND clusters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own cluster thoughts"
  ON public.cluster_thoughts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clusters
      WHERE clusters.id = cluster_thoughts.cluster_id
      AND clusters.user_id = auth.uid()
    )
  );

-- Create connections table for thought connections
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  thought_id_1 UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
  thought_id_2 UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
  connection_type TEXT,
  strength DECIMAL(3,2),
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
  ON public.connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
  ON public.connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_connections_thought_1 ON public.connections(thought_id_1);
CREATE INDEX idx_connections_thought_2 ON public.connections(thought_id_2);

-- Create momentum_maps table
CREATE TABLE public.momentum_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  acceptance_criteria TEXT[] DEFAULT '{}',
  locked_chunks TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.momentum_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own momentum maps"
  ON public.momentum_maps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own momentum maps"
  ON public.momentum_maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own momentum maps"
  ON public.momentum_maps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own momentum maps"
  ON public.momentum_maps FOR DELETE
  USING (auth.uid() = user_id);

-- Create chunks table
CREATE TABLE public.chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.momentum_maps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  energy_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chunks of their own maps"
  ON public.chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.momentum_maps
      WHERE momentum_maps.id = chunks.map_id
      AND momentum_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chunks for their own maps"
  ON public.chunks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.momentum_maps
      WHERE momentum_maps.id = chunks.map_id
      AND momentum_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chunks of their own maps"
  ON public.chunks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.momentum_maps
      WHERE momentum_maps.id = chunks.map_id
      AND momentum_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks of their own maps"
  ON public.chunks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.momentum_maps
      WHERE momentum_maps.id = chunks.map_id
      AND momentum_maps.user_id = auth.uid()
    )
  );

CREATE INDEX idx_chunks_map_id ON public.chunks(map_id);

-- Create sub_steps table
CREATE TABLE public.sub_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES public.chunks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sub_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sub_steps of their own chunks"
  ON public.sub_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chunks
      JOIN public.momentum_maps ON momentum_maps.id = chunks.map_id
      WHERE chunks.id = sub_steps.chunk_id
      AND momentum_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sub_steps for their own chunks"
  ON public.sub_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chunks
      JOIN public.momentum_maps ON momentum_maps.id = chunks.map_id
      WHERE chunks.id = sub_steps.chunk_id
      AND momentum_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sub_steps of their own chunks"
  ON public.sub_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chunks
      JOIN public.momentum_maps ON momentum_maps.id = chunks.map_id
      WHERE chunks.id = sub_steps.chunk_id
      AND momentum_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sub_steps of their own chunks"
  ON public.sub_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chunks
      JOIN public.momentum_maps ON momentum_maps.id = chunks.map_id
      WHERE chunks.id = sub_steps.chunk_id
      AND momentum_maps.user_id = auth.uid()
    )
  );

CREATE INDEX idx_sub_steps_chunk_id ON public.sub_steps(chunk_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_thoughts_updated_at
  BEFORE UPDATE ON public.thoughts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_clusters_updated_at
  BEFORE UPDATE ON public.clusters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_momentum_maps_updated_at
  BEFORE UPDATE ON public.momentum_maps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_chunks_updated_at
  BEFORE UPDATE ON public.chunks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sub_steps_updated_at
  BEFORE UPDATE ON public.sub_steps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.thoughts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clusters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cluster_thoughts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.momentum_maps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chunks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sub_steps;