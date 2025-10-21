import type { Chunk } from "@/hooks/useMomentumMaps";

export interface MomentumMapsState {
  isAuthenticated: boolean;
  stuckModalOpen: boolean;
  stuckChunk: Chunk | null;
  replanModalOpen: boolean;
  newPlan: any; // TODO: Type this properly based on replan response
  isAcceptingReplan: boolean;
}

export type MomentumMapsAction =
  | { type: 'SET_AUTHENTICATED'; isAuthenticated: boolean }
  | { type: 'OPEN_STUCK_MODAL'; chunk: Chunk }
  | { type: 'CLOSE_STUCK_MODAL' }
  | { type: 'OPEN_REPLAN_MODAL'; plan: any }
  | { type: 'CLOSE_REPLAN_MODAL' }
  | { type: 'SET_ACCEPTING_REPLAN'; isAccepting: boolean };

export const initialMomentumMapsState: MomentumMapsState = {
  isAuthenticated: false,
  stuckModalOpen: false,
  stuckChunk: null,
  replanModalOpen: false,
  newPlan: null,
  isAcceptingReplan: false,
};

export function momentumMapsReducer(
  state: MomentumMapsState,
  action: MomentumMapsAction
): MomentumMapsState {
  switch (action.type) {
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.isAuthenticated };
    
    case 'OPEN_STUCK_MODAL':
      return { 
        ...state, 
        stuckModalOpen: true, 
        stuckChunk: action.chunk 
      };
    
    case 'CLOSE_STUCK_MODAL':
      return { 
        ...state, 
        stuckModalOpen: false, 
        stuckChunk: null 
      };
    
    case 'OPEN_REPLAN_MODAL':
      return { 
        ...state, 
        replanModalOpen: true, 
        newPlan: action.plan 
      };
    
    case 'CLOSE_REPLAN_MODAL':
      return { 
        ...state, 
        replanModalOpen: false, 
        newPlan: null 
      };
    
    case 'SET_ACCEPTING_REPLAN':
      return { ...state, isAcceptingReplan: action.isAccepting };
    
    default:
      return state;
  }
}
