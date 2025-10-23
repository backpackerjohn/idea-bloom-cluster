import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from "lucide-react";
import type { MomentumMap } from "@/hooks/useMomentumMaps";

interface ReplanDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  newPlan: any;
  onAccept: () => void;
  isAccepting: boolean;
  currentMap: MomentumMap | null;
}

export function ReplanDiffModal({
  isOpen,
  onClose,
  newPlan,
  onAccept,
  isAccepting,
  currentMap,
}: ReplanDiffModalProps) {
  if (!newPlan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Review Your Replan</DialogTitle>
          </div>
          <DialogDescription>
            Here's your updated momentum map. Review the changes and accept when ready.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-8 pr-4">
            <div>
              <h3 className="font-semibold mb-3">Finish Line</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Current</div>
                  <ul className="space-y-2">
                    {(currentMap?.acceptance_criteria || []).map((c, i) => {
                      const isRemoved = !(newPlan.acceptance_criteria || []).includes(c);
                      return (
                        <li key={i} className={`text-sm ${isRemoved ? 'line-through text-muted-foreground' : ''}`}>{c}</li>
                      );
                    })}
                  </ul>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Proposed</div>
                  <ul className="space-y-2">
                    {(newPlan.acceptance_criteria || []).map((c: string, i: number) => {
                      const isAdded = !(currentMap?.acceptance_criteria || []).includes(c);
                      return (
                        <li key={i} className={`text-sm ${isAdded ? 'bg-green-500/10 text-green-700 dark:text-green-400 rounded px-2 py-1' : ''}`}>{c}</li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Phases</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Current</div>
                  <ul className="space-y-2">
                    {(currentMap?.chunks || []).map((chunk, i) => {
                      const existsInNew = (newPlan.chunks || []).some((c: any) => c.title === chunk.title);
                      return (
                        <li key={chunk.id} className={`text-sm ${existsInNew ? '' : 'line-through text-muted-foreground'}`}>
                          {chunk.title}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Proposed</div>
                  <div className="space-y-3">
                    {(newPlan.chunks || []).map((chunk: any, idx: number) => {
                      const isNew = !(currentMap?.chunks || []).some(c => c.title === chunk.title);
                      return (
                        <div key={idx} className={`border rounded-lg p-3 ${isNew ? 'border-green-500/30 bg-green-500/5' : 'bg-accent/20'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-muted-foreground">Phase {idx + 1}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">{chunk.energy_tag} energy</span>
                          </div>
                          <div className="font-semibold mb-2">{chunk.title}</div>
                          {Array.isArray(chunk.sub_steps) && chunk.sub_steps.length > 0 && (
                            <ul className="space-y-1 text-sm">
                              {chunk.sub_steps.map((step: any, sidx: number) => (
                                <li key={sidx} className="flex items-start gap-2">
                                  <span className="text-muted-foreground">•</span>
                                  <span className="flex-1">{step.title}</span>
                                  <span className="text-xs font-mono text-muted-foreground">{step.time_estimate}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAccepting}>
            Cancel
          </Button>
          <Button onClick={onAccept} disabled={isAccepting}>
            {isAccepting ? 'Accepting...' : 'Accept Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
