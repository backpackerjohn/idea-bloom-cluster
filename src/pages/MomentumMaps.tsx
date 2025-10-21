import { useEffect, useReducer } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GoalInput } from "@/components/momentum-maps/GoalInput";
import { ChunkCard } from "@/components/momentum-maps/ChunkCard";
import { FinishLinePanel } from "@/components/momentum-maps/FinishLinePanel";
import { ImStuckModal } from "@/components/momentum-maps/ImStuckModal";
import { ReplanDiffModal } from "@/components/momentum-maps/ReplanDiffModal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, PlusCircle, ArrowLeft } from "lucide-react";
import { useMomentumMaps, Chunk } from "@/hooks/useMomentumMaps";
import { useMapGeneration } from "@/hooks/useMapGeneration";
import { useChunkOperations } from "@/hooks/useChunkOperations";
import { momentumMapsReducer, initialMomentumMapsState } from "@/reducers/momentumMapsReducer";

/**
 * MomentumMaps - AI-powered task breakdown and progress tracking
 * 
 * This component uses the reducer pattern for state management (similar to BrainDump).
 * State is managed via momentumMapsReducer for better organization and testability.
 */
export default function MomentumMaps() {
  const [state, dispatch] = useReducer(momentumMapsReducer, initialMomentumMapsState);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { maps, isLoading: mapsLoading } = useMomentumMaps();
  const { generateMap, replanMap, getStuckSuggestions, isGenerating, error, setError } = useMapGeneration();
  const { toggleSubStep, toggleLockChunk, updateAcceptanceCriteria } = useChunkOperations();

  const mapId = searchParams.get('map');
  const currentMap = maps.find(m => m.id === mapId);
  const showInput = !mapId || (!currentMap && !mapsLoading);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        dispatch({ type: 'SET_AUTHENTICATED', isAuthenticated: true });
      }
    });
  }, [navigate]);

  const handleGenerateMap = async (goal: string) => {
    const map = await generateMap(goal);
    if (map) {
      setSearchParams({ map: map.id });
    }
  };

  const handleReplan = async () => {
    if (!currentMap) return;

    const lockedChunks = currentMap.chunks
      .filter(chunk => currentMap.locked_chunks.includes(chunk.id))
      .map(chunk => ({
        title: chunk.title,
        energy_tag: chunk.energy_tag,
        sub_steps: chunk.sub_steps.map(step => ({
          title: step.title,
          time_estimate: step.time_estimate
        }))
      }));

    const plan = await replanMap(currentMap.id, currentMap.goal, lockedChunks);
    if (plan) {
      dispatch({ type: 'OPEN_REPLAN_MODAL', plan });
    }
  };

  /**
   * Applies a replan by replacing all chunks with new ones from the AI-generated plan.
   * This is a complex operation involving multiple DB writes that must succeed together.
   */
  const applyReplanToDatabase = async (mapId: string, plan: any) => {
    // Step 1: Delete old chunks (cascades to sub_steps via DB constraints)
    const { error: deleteError } = await supabase
      .from('chunks')
      .delete()
      .eq('momentum_map_id', mapId);

    if (deleteError) throw deleteError;

    // Step 2: Update map metadata (acceptance criteria and unlock chunks)
    const { error: updateError } = await supabase
      .from('momentum_maps')
      .update({ 
        acceptance_criteria: plan.acceptance_criteria || [],
        locked_chunks: []
      })
      .eq('id', mapId);

    if (updateError) throw updateError;

    // Step 3: Create new chunks with their sub-steps
    for (const chunk of plan.chunks) {
      const { data: chunkData, error: chunkError } = await supabase
        .from('chunks')
        .insert({
          momentum_map_id: mapId,
          title: chunk.title,
          energy_tag: chunk.energy_tag || 'medium',
          sort_order: chunk.sort_order
        } as any)
        .select()
        .single();

      if (chunkError) throw chunkError;

      // Add sub-steps for this chunk if they exist
      if (chunk.sub_steps && chunk.sub_steps.length > 0) {
        const subStepsToInsert = chunk.sub_steps.map((step: any) => ({
          chunk_id: chunkData.id,
          title: step.title,
          time_estimate: step.time_estimate || '30 mins',
          sort_order: step.sort_order
        }));

        const { error: subStepsError } = await supabase
          .from('sub_steps')
          .insert(subStepsToInsert);

        if (subStepsError) throw subStepsError;
      }
    }
  };

  const handleAcceptReplan = async () => {
    if (!currentMap || !state.newPlan) return;

    dispatch({ type: 'SET_ACCEPTING_REPLAN', isAccepting: true });
    try {
      await applyReplanToDatabase(currentMap.id, state.newPlan);
      dispatch({ type: 'CLOSE_REPLAN_MODAL' });
    } catch (error) {
      console.error('Error accepting replan:', error);
      // Modal stays open so user can retry
    } finally {
      dispatch({ type: 'SET_ACCEPTING_REPLAN', isAccepting: false });
    }
  };

  const handleGetHelp = (chunk: Chunk) => {
    dispatch({ type: 'OPEN_STUCK_MODAL', chunk });
  };

  const handleBackToInput = () => {
    setSearchParams({});
  };

  if (!state.isAuthenticated) return null;

  if (showInput) {
    return (
      <GoalInput
        onSubmit={handleGenerateMap}
        isLoading={isGenerating}
        error={error}
      />
    );
  }

  if (mapsLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!currentMap) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">Map not found</p>
          <Button onClick={handleBackToInput}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Create a new map
          </Button>
        </Card>
      </div>
    );
  }

  const totalSteps = currentMap.chunks.reduce((acc, chunk) => acc + chunk.sub_steps.length, 0);
  const completedSteps = currentMap.chunks.reduce(
    (acc, chunk) => acc + chunk.sub_steps.filter(s => s.is_completed).length,
    0
  );
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const isMapComplete = overallProgress === 100;

  return (
    <>
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToInput}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to input
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{currentMap.goal}</h1>
          <div className="flex items-center gap-4 flex-wrap">
            <Progress value={overallProgress} className="flex-1 max-w-md h-3" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {completedSteps} / {totalSteps} steps
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(overallProgress)}%
              </span>
            </div>
          </div>
          
          {/* Celebration overlay when complete */}
          {isMapComplete && (
            <div className="mt-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg animate-celebrate">
              <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                🎉 Congratulations! You've completed this map!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                All {totalSteps} steps are done. Great work!
              </p>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Chunks */}
          <div className="lg:col-span-2 space-y-4">
            {currentMap.chunks
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((chunk, index) => (
                <ChunkCard
                  key={chunk.id}
                  chunk={chunk}
                  chunkNumber={index + 1}
                  isLocked={currentMap.locked_chunks.includes(chunk.id)}
                  onToggleLock={() => 
                    toggleLockChunk({ 
                      mapId: currentMap.id, 
                      chunkId: chunk.id,
                      lockedChunks: currentMap.locked_chunks
                    })
                  }
                  onToggleSubStep={(subStepId, isCompleted) => 
                    toggleSubStep({ subStepId, isCompleted })
                  }
                  onGetHelp={() => handleGetHelp(chunk)}
                />
              ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <FinishLinePanel
              criteria={currentMap.acceptance_criteria}
              onUpdate={(criteria) => 
                updateAcceptanceCriteria({ mapId: currentMap.id, criteria })
              }
            />

            <div className="space-y-2">
              <Button
                onClick={handleReplan}
                disabled={isGenerating}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Replanning...' : 'Replan'}
              </Button>
              <Button
                onClick={handleBackToInput}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Another Map
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ImStuckModal
        isOpen={state.stuckModalOpen}
        onClose={() => dispatch({ type: 'CLOSE_STUCK_MODAL' })}
        chunk={state.stuckChunk}
        getSuggestions={getStuckSuggestions}
        goal={currentMap.goal}
      />

      <ReplanDiffModal
        isOpen={state.replanModalOpen}
        onClose={() => dispatch({ type: 'CLOSE_REPLAN_MODAL' })}
        newPlan={state.newPlan}
        onAccept={handleAcceptReplan}
        isAccepting={state.isAcceptingReplan}
      />
    </>
  );
}
