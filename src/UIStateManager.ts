/**
 * UIStateManager - Manages UI tool modes, modals, and interactive states
 * Extracted from store.ts to isolate UI interaction concerns
 */

export type ToolMode = 'transmute' | 'detector' | 'key' | 'staff' | 'ring'

export interface UIState {
  // Tool modes
  transmuteMode: boolean
  detectorMode: boolean  
  keyMode: boolean
  staffMode: boolean
  ringMode: boolean
  
  // Tool mode item indices (which inventory slot is being used)
  transmuteItemIndex?: number
  detectorItemIndex?: number
  keyItemIndex?: number
  staffItemIndex?: number
  ringItemIndex?: number
  
  // Modal states
  discardConfirmation: {
    visible: boolean
    itemIndex?: number
  }
  
  // Shop state
  shopOpen: boolean
}

export interface ToolModeResult {
  newUIState: Partial<UIState>
  consumeItem?: boolean
  itemIndex?: number
  message?: string
}

export class UIStateManager {
  private uiState: UIState

  constructor() {
    this.uiState = this.createInitialUIState()
  }

  // Get current UI state
  getUIState(): UIState {
    return { ...this.uiState }
  }

  // Update UI state
  updateUIState(updates: Partial<UIState>): void {
    this.uiState = { ...this.uiState, ...updates }
  }

  // Reset UI state to initial values
  resetUIState(): void {
    this.uiState = this.createInitialUIState()
  }

  // Create initial UI state
  private createInitialUIState(): UIState {
    return {
      transmuteMode: false,
      detectorMode: false,
      keyMode: false,
      staffMode: false,
      ringMode: false,
      discardConfirmation: {
        visible: false
      },
      shopOpen: false
    }
  }

  // Start tool mode
  startToolMode(mode: ToolMode, itemIndex: number): ToolModeResult {
    // Cancel any existing tool mode first
    this.cancelAllToolModes()
    
    const modeKey = `${mode}Mode` as keyof UIState
    const indexKey = `${mode}ItemIndex` as keyof UIState
    
    const newUIState: Partial<UIState> = {
      [modeKey]: true,
      [indexKey]: itemIndex
    }
    
    this.updateUIState(newUIState)
    
    const messages = {
      transmute: 'Transmute activated! Click any unrevealed tile to convert it to your tile.',
      detector: 'Detector activated! Click any unrevealed tile to see adjacent tile info.',
      key: 'Key activated! Click any locked tile to unlock it.',
      staff: 'Staff of Fireballs activated! Click any monster to attack it.',
      ring: 'Ring of True Seeing activated! Click any tile to reveal its contents.'
    }
    
    return {
      newUIState,
      message: messages[mode]
    }
  }

  // Cancel specific tool mode
  cancelToolMode(mode: ToolMode): ToolModeResult {
    const modeKey = `${mode}Mode` as keyof UIState
    const indexKey = `${mode}ItemIndex` as keyof UIState
    
    const newUIState: Partial<UIState> = {
      [modeKey]: false,
      [indexKey]: undefined
    }
    
    this.updateUIState(newUIState)
    
    return {
      newUIState
    }
  }

  // Cancel all tool modes
  cancelAllToolModes(): void {
    this.updateUIState({
      transmuteMode: false,
      detectorMode: false,
      keyMode: false,
      staffMode: false,
      ringMode: false,
      transmuteItemIndex: undefined,
      detectorItemIndex: undefined,
      keyItemIndex: undefined,
      staffItemIndex: undefined,
      ringItemIndex: undefined
    })
  }

  // Complete tool usage (consume item and exit mode)
  completeToolUsage(mode: ToolMode): ToolModeResult {
    const indexKey = `${mode}ItemIndex` as keyof UIState
    const itemIndex = this.uiState[indexKey] as number
    
    const result = this.cancelToolMode(mode)
    
    return {
      ...result,
      consumeItem: true,
      itemIndex
    }
  }

  // Check if any tool mode is active
  isAnyToolModeActive(): boolean {
    return this.uiState.transmuteMode || 
           this.uiState.detectorMode || 
           this.uiState.keyMode || 
           this.uiState.staffMode || 
           this.uiState.ringMode
  }

  // Get active tool mode
  getActiveToolMode(): ToolMode | null {
    if (this.uiState.transmuteMode) return 'transmute'
    if (this.uiState.detectorMode) return 'detector'
    if (this.uiState.keyMode) return 'key'
    if (this.uiState.staffMode) return 'staff'
    if (this.uiState.ringMode) return 'ring'
    return null
  }

  // Get item index for active tool mode
  getActiveToolItemIndex(): number | undefined {
    const activeMode = this.getActiveToolMode()
    if (!activeMode) return undefined
    
    const indexKey = `${activeMode}ItemIndex` as keyof UIState
    return this.uiState[indexKey] as number
  }

  // Show discard confirmation modal
  showDiscardConfirmation(itemIndex: number): void {
    this.updateUIState({
      discardConfirmation: {
        visible: true,
        itemIndex
      }
    })
  }

  // Hide discard confirmation modal
  hideDiscardConfirmation(): void {
    this.updateUIState({
      discardConfirmation: {
        visible: false,
        itemIndex: undefined
      }
    })
  }

  // Get discard confirmation state
  getDiscardConfirmation(): { visible: boolean; itemIndex?: number } {
    return { ...this.uiState.discardConfirmation }
  }

  // Open shop
  openShop(): void {
    this.updateUIState({ shopOpen: true })
  }

  // Close shop
  closeShop(): void {
    this.updateUIState({ shopOpen: false })
  }

  // Check if shop is open
  isShopOpen(): boolean {
    return this.uiState.shopOpen
  }

  // Validate tool mode usage conditions
  canUseToolMode(mode: ToolMode): { canUse: boolean; reason?: string } {
    if (this.isAnyToolModeActive()) {
      const activeMode = this.getActiveToolMode()
      if (activeMode !== mode) {
        return {
          canUse: false,
          reason: `Another tool (${activeMode}) is already active`
        }
      }
    }
    
    if (this.uiState.shopOpen) {
      return {
        canUse: false,
        reason: 'Cannot use tools while shop is open'
      }
    }
    
    return { canUse: true }
  }

  // Get UI state summary for debugging
  getUIStateSummary(): string {
    const activeMode = this.getActiveToolMode()
    const parts = []
    
    if (activeMode) {
      parts.push(`Tool: ${activeMode}`)
    }
    
    if (this.uiState.shopOpen) {
      parts.push('Shop: open')
    }
    
    if (this.uiState.discardConfirmation.visible) {
      parts.push('Discard confirmation: visible')
    }
    
    return parts.length > 0 ? parts.join(', ') : 'No active UI states'
  }
}