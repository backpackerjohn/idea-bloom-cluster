export interface BrainDumpState {
  isQuickCaptureOpen: boolean;
  categorizingThoughts: Set<string>;
  connections: any[];
  isLoadingConnections: boolean;
  isSelectionMode: boolean;
  selectedThoughts: Set<string>;
  isPerformingBulkAction: boolean;
}

export type BrainDumpAction =
  | { type: 'OPEN_QUICK_CAPTURE' }
  | { type: 'CLOSE_QUICK_CAPTURE' }
  | { type: 'SET_CATEGORIZING'; thoughtIds: string[]; isCategorizing: boolean }
  | { type: 'SET_CONNECTIONS'; connections: any[] }
  | { type: 'SET_LOADING_CONNECTIONS'; isLoading: boolean }
  | { type: 'TOGGLE_SELECTION_MODE' }
  | { type: 'TOGGLE_THOUGHT_SELECTION'; thoughtId: string }
  | { type: 'SELECT_ALL'; thoughtIds: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_PERFORMING_BULK_ACTION'; isPerforming: boolean }
  | { type: 'RESET_CONNECTIONS' };

export const initialBrainDumpState: BrainDumpState = {
  isQuickCaptureOpen: false,
  categorizingThoughts: new Set(),
  connections: [],
  isLoadingConnections: false,
  isSelectionMode: false,
  selectedThoughts: new Set(),
  isPerformingBulkAction: false,
};

export function brainDumpReducer(
  state: BrainDumpState,
  action: BrainDumpAction
): BrainDumpState {
  switch (action.type) {
    case 'OPEN_QUICK_CAPTURE':
      return { ...state, isQuickCaptureOpen: true };
    
    case 'CLOSE_QUICK_CAPTURE':
      return { ...state, isQuickCaptureOpen: false };
    
    case 'SET_CATEGORIZING': {
      const next = new Set(state.categorizingThoughts);
      action.thoughtIds.forEach(id => {
        if (action.isCategorizing) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return { ...state, categorizingThoughts: next };
    }
    
    case 'SET_CONNECTIONS':
      return { ...state, connections: action.connections };
    
    case 'RESET_CONNECTIONS':
      return { ...state, connections: [] };
    
    case 'SET_LOADING_CONNECTIONS':
      return { ...state, isLoadingConnections: action.isLoading };
    
    case 'TOGGLE_SELECTION_MODE':
      return {
        ...state,
        isSelectionMode: !state.isSelectionMode,
        selectedThoughts: new Set(),
      };
    
    case 'TOGGLE_THOUGHT_SELECTION': {
      const newSet = new Set(state.selectedThoughts);
      if (newSet.has(action.thoughtId)) {
        newSet.delete(action.thoughtId);
      } else {
        newSet.add(action.thoughtId);
      }
      return { ...state, selectedThoughts: newSet };
    }
    
    case 'SELECT_ALL':
      return { ...state, selectedThoughts: new Set(action.thoughtIds) };
    
    case 'CLEAR_SELECTION':
      return { ...state, selectedThoughts: new Set(), isSelectionMode: false };
    
    case 'SET_PERFORMING_BULK_ACTION':
      return { ...state, isPerformingBulkAction: action.isPerforming };
    
    default:
      return state;
  }
}
