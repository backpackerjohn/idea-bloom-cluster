import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useClusterOperations } from "@/hooks/useClusterOperations";
import type { Database } from "@/integrations/supabase/types.generated";

type Cluster = Database['public']['Tables']['clusters']['Row'];
type Thought = Database['public']['Tables']['thoughts']['Row'];

interface ClusterWithThoughts extends Cluster {
  cluster_thoughts: {
    thought_id: string;
    is_completed: boolean;
    thoughts: Thought;
  }[];
}

interface ClusterCardProps {
  cluster: ClusterWithThoughts;
  onUpdate?: () => void;
  availableThoughts?: Thought[];
}

export function ClusterCard({ cluster, onUpdate, availableThoughts }: ClusterCardProps) {
  const [isExpanded, setIsExpanded] = useState(!cluster.is_collapsed);
  const [isLoading, setIsLoading] = useState(false);
  const { addThoughtToCluster, toggleThoughtCompletion, toggleClusterCollapse, deleteCluster } = useClusterOperations();

  const totalThoughts = cluster.cluster_thoughts.length;
  const completedThoughts = cluster.cluster_thoughts.filter(ct => ct.is_completed).length;
  const progressPercentage = totalThoughts > 0 ? Math.round((completedThoughts / totalThoughts) * 100) : 0;

  const activeThoughts = cluster.cluster_thoughts.filter(ct => !ct.is_completed);
  const completedThoughtsList = cluster.cluster_thoughts.filter(ct => ct.is_completed);

  async function handleToggleExpanded() {
    setIsLoading(true);
    const newCollapsedState = isExpanded;
    await toggleClusterCollapse(cluster.id, newCollapsedState);
    setIsExpanded(!newCollapsedState);
    setIsLoading(false);
  }

  async function handleToggleThoughtCompletion(thoughtId: string, currentCompleted: boolean) {
    setIsLoading(true);
    await toggleThoughtCompletion(cluster.id, thoughtId, !currentCompleted);
    onUpdate?.();
    setIsLoading(false);
  }

  async function handleAddThought(thoughtId: string) {
    setIsLoading(true);
    await addThoughtToCluster(cluster.id, thoughtId);
    onUpdate?.();
    setIsLoading(false);
  }

  async function handleDeleteCluster() {
    setIsLoading(true);
    await deleteCluster(cluster.id);
    onUpdate?.();
    setIsLoading(false);
  }

  return (
    <Card 
      className="p-4"
      onDragOver={(e) => {
        // Allow drop for future drag-and-drop from ThoughtCard
        e.preventDefault();
      }}
      onDrop={(e) => {
        const thoughtId = e.dataTransfer.getData('text/thought-id') || e.dataTransfer.getData('text/plain');
        if (thoughtId) {
          handleAddThought(thoughtId);
        }
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={handleToggleExpanded}
      >
        <div className="flex items-center gap-3 flex-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="p-0 h-6 w-6"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          
          <div className="flex-1">
            <h3 className="text-h3 mb-1">{cluster.name}</h3>
            <div className="flex items-center gap-4">
              <Progress value={progressPercentage} className="flex-1 max-w-40" />
              <Badge variant="secondary" className="text-ui-label">
                {completedThoughts}/{totalThoughts}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                Add Thought
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <p className="text-caption text-muted-foreground mb-2">Add a thought to this cluster</p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {availableThoughts?.map((thought) => (
                  <Button 
                    key={thought.id} 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleAddThought(thought.id)}
                  >
                    {thought.content.split('\n')[0]}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive hover:text-destructive"
            disabled={isLoading}
            onClick={(e) => { e.stopPropagation(); handleDeleteCluster(); }}
            title="Delete cluster"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Quick add list for available thoughts */}
          <div className="flex items-center justify-between">
            <div className="text-caption text-muted-foreground">Drag thoughts here or use Add Thought</div>
          </div>
          {/* Active Tasks */}
          {activeThoughts.length > 0 && (
            <div>
              <h4 className="text-body font-medium mb-2 text-muted-foreground">
                Active ({activeThoughts.length})
              </h4>
              <div className="space-y-2">
                {activeThoughts.map((ct) => (
                  <div
                    key={ct.thought_id}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleThoughtCompletion(ct.thought_id, ct.is_completed)}
                      disabled={isLoading}
                      className="mt-0.5 h-4 w-4 p-0 rounded border-2 border-muted-foreground hover:border-green-500"
                    />
                    <div className="flex-1">
                      <p className="text-body leading-relaxed">
                        {ct.thoughts.content.split('\n')[0]}
                      </p>
                      {ct.thoughts.content.split('\n').length > 1 && (
                        <p className="text-caption text-muted-foreground mt-1">
                          {ct.thoughts.content.split('\n').slice(1, 2).join(' ')}...
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedThoughtsList.length > 0 && (
            <div>
              <h4 className="text-body font-medium mb-2 text-muted-foreground">
                Completed ({completedThoughtsList.length})
              </h4>
              <div className="space-y-2">
                {completedThoughtsList.map((ct) => (
                  <div
                    key={ct.thought_id}
                    className="flex items-start gap-3 p-2 rounded-md opacity-60 hover:opacity-80 transition-opacity"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleThoughtCompletion(ct.thought_id, ct.is_completed)}
                      disabled={isLoading}
                      className="mt-0.5 h-4 w-4 p-0 rounded bg-green-500 hover:bg-green-600 border-green-500"
                    >
                      <span className="text-white text-xs">✓</span>
                    </Button>
                    <div className="flex-1">
                      <p className="text-body leading-relaxed line-through">
                        {ct.thoughts.content.split('\n')[0]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {totalThoughts === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-body">No thoughts in this cluster yet</p>
              <p className="text-caption">Drag thoughts here or use bulk actions to add them</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}