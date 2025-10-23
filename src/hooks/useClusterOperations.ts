import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types.generated";

type ClusterRow = Database["public"]["Tables"]["clusters"]["Row"]; 

export function useClusterOperations() {
  async function createCluster(name: string, description?: string): Promise<ClusterRow | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not authenticated", variant: "destructive" });
        return null;
      }

      const { data, error } = await supabase
        .from("clusters")
        .insert({
          user_id: user.id,
          name,
          description: description ?? null,
          is_collapsed: true
        })
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Cluster created" });
      return data as ClusterRow;
    } catch (_) {
      toast({ title: "Failed to create cluster", variant: "destructive" });
      return null;
    }
  }

  async function addThoughtToCluster(clusterId: string, thoughtId: string) {
    try {
      const { error } = await supabase
        .from("cluster_thoughts")
        .insert({
          cluster_id: clusterId,
          thought_id: thoughtId,
          is_completed: false
        });

      if (error) throw error;
      toast({ title: "Added to cluster" });
    } catch (_) {
      toast({ title: "Failed to add to cluster", variant: "destructive" });
    }
  }

  async function toggleThoughtCompletion(clusterId: string, thoughtId: string, isCompleted: boolean) {
    try {
      const { error } = await supabase
        .from("cluster_thoughts")
        .update({ is_completed: isCompleted })
        .eq("cluster_id", clusterId)
        .eq("thought_id", thoughtId);

      if (error) throw error;
      toast({ title: isCompleted ? "Marked complete" : "Marked incomplete" });
    } catch (_) {
      toast({ title: "Failed to toggle completion", variant: "destructive" });
    }
  }

  async function toggleClusterCollapse(clusterId: string, isCollapsed: boolean) {
    try {
      const { error } = await supabase
        .from("clusters")
        .update({ is_collapsed: isCollapsed })
        .eq("id", clusterId);

      if (error) throw error;
    } catch (_) {
      toast({ title: "Failed to toggle collapse", variant: "destructive" });
    }
  }

  async function deleteCluster(clusterId: string) {
    try {
      const { error } = await supabase
        .from("clusters")
        .delete()
        .eq("id", clusterId);

      if (error) throw error;
      toast({ title: "Cluster deleted" });
    } catch (_) {
      toast({ title: "Failed to delete cluster", variant: "destructive" });
    }
  }

  return {
    createCluster,
    addThoughtToCluster,
    toggleThoughtCompletion,
    toggleClusterCollapse,
    deleteCluster
  };
}
