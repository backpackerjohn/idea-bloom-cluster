import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Thought = Database['public']['Tables']['thoughts']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type ThoughtStatus = Database['public']['Enums']['thought_status'];

interface ThoughtCategory {
  categories: Pick<Category, 'id' | 'name' | 'color'> | null;
}

interface ThoughtWithCategories extends Thought {
  thought_categories: ThoughtCategory[];
}

export function useBrainDumpData(status: ThoughtStatus = 'active') {
  const [thoughts, setThoughts] = useState<ThoughtWithCategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchThoughts();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('thoughts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thoughts'
        },
        () => {
          fetchThoughts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status]); // fetchThoughts is stable and doesn't need to be in deps

  async function fetchThoughts() {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("Not authenticated");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('thoughts')
        .select('*, thought_categories(categories(id, name, color))')
        .eq('user_id', user.id)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setThoughts((data as ThoughtWithCategories[]) || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch thoughts');
    } finally {
      setIsLoading(false);
    }
  }

  return { thoughts, isLoading, error, refetch: fetchThoughts };
}
