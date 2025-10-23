import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useChunkOperations() {
  const queryClient = useQueryClient();

  const toggleSubStep = useMutation({
    mutationFn: async ({ subStepId, isCompleted }: { subStepId: string; isCompleted: boolean }) => {
      const { error } = await supabase
        .from('sub_steps')
        .update({ 
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', subStepId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['momentum-maps'] });
    },
    onError: (error) => {
      toast({
        title: "Error updating step",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleLockChunk = useMutation({
    mutationFn: async ({ mapId, chunkId, lockedChunks }: { 
      mapId: string; 
      chunkId: string; 
      lockedChunks: string[];
    }) => {
      const isLocked = lockedChunks.includes(chunkId);
      const newLockedChunks = isLocked
        ? lockedChunks.filter(id => id !== chunkId)
        : [...lockedChunks, chunkId];

      const { error } = await supabase
        .from('momentum_maps')
        .update({ locked_chunks: newLockedChunks })
        .eq('id', mapId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['momentum-maps'] });
    },
    onError: (error) => {
      toast({
        title: "Error locking chunk",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAcceptanceCriteria = useMutation({
    mutationFn: async ({ mapId, criteria }: { mapId: string; criteria: string[] }) => {
      const { error } = await supabase
        .from('momentum_maps')
        .update({ acceptance_criteria: criteria })
        .eq('id', mapId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['momentum-maps'] });
      toast({ title: "Finish line updated" });
    },
    onError: (error) => {
      toast({
        title: "Error updating finish line",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addSubStep = useMutation({
    mutationFn: async ({ chunkId, title, timeEstimate = '30 mins' }: { chunkId: string; title: string; timeEstimate?: string }) => {
      const { count, error: countError } = await supabase
        .from('sub_steps')
        .select('id', { count: 'exact', head: true })
        .eq('chunk_id', chunkId);

      if (countError) throw countError;
      const sort_order = (count ?? 0);

      const { error } = await supabase
        .from('sub_steps')
        .insert({
          chunk_id: chunkId,
          title,
          time_estimate: timeEstimate,
          sort_order,
          is_completed: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['momentum-maps'] });
      toast({ title: 'Added new sub-step' });
    },
    onError: (error) => {
      toast({
        title: 'Error adding sub-step',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    toggleSubStep: toggleSubStep.mutate,
    toggleLockChunk: toggleLockChunk.mutate,
    updateAcceptanceCriteria: updateAcceptanceCriteria.mutate,
    addSubStep: addSubStep.mutate,
  };
}
