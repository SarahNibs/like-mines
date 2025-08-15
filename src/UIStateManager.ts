/**
 * UIStateManager - Manages UI-specific state like modals, tool modes, and confirmations
 * This is a focused extraction that doesn't depend on game logic
 */

export interface DiscardConfirmation {
  itemIndex: number
  itemName: string
}

export interface ToolModeState {
  transmute?: { active: boolean; itemIndex: number }
  detector?: { active: boolean; itemIndex: number }
  key?: { active: boolean; itemIndex: number }
  staff?: { active: boolean; itemIndex: number }
  ring?: { active: boolean; itemIndex: number }
}

export interface UIState {
  pendingDiscard: DiscardConfirmation | null
  shopOpen: boolean
  toolModes: ToolModeState
}

export class UIStateManager {
  private state: UIState

  constructor() {
    this.state = {
      pendingDiscard: null,
      shopOpen: false,
      toolModes: {}
    }
  }

  // Get current UI state
  getState(): UIState {
    return { ...this.state, toolModes: { ...this.state.toolModes } }
  }

  // Update UI state
  updateState(updates: Partial<UIState>): void {
    this.state = { ...this.state, ...updates }
  }

  // Reset UI state to clean state
  resetState(): void {
    this.state = {
      pendingDiscard: null,
      shopOpen: false,
      toolModes: {}
    }
  }

  // === Discard Confirmation Management ===
  showDiscardConfirmation(itemIndex: number, itemName: string): void {
    this.state.pendingDiscard = { itemIndex, itemName }
  }

  hideDiscardConfirmation(): void {
    this.state.pendingDiscard = null
  }

  getDiscardConfirmation(): DiscardConfirmation | null {
    return this.state.pendingDiscard ? { ...this.state.pendingDiscard } : null
  }

  // === Shop Management ===
  openShop(): void {
    this.state.shopOpen = true
  }

  closeShop(): void {
    this.state.shopOpen = false
  }

  isShopOpen(): boolean {
    return this.state.shopOpen
  }

  // === Tool Mode Management ===
  
  // Start transmute mode
  startTransmuteMode(itemIndex: number): void {
    this.cancelAllToolModes()
    this.state.toolModes.transmute = { active: true, itemIndex }
  }

  // Cancel transmute mode
  cancelTransmuteMode(): void {
    this.state.toolModes.transmute = undefined
  }

  // Complete transmute tool usage
  completeTransmuteMode(): void {
    this.state.toolModes.transmute = undefined
  }

  // Start detector mode
  startDetectorMode(itemIndex: number): void {
    this.cancelAllToolModes()
    this.state.toolModes.detector = { active: true, itemIndex }
  }

  // Cancel detector mode
  cancelDetectorMode(): void {
    this.state.toolModes.detector = undefined
  }

  // Complete detector tool usage
  completeDetectorMode(): void {
    this.state.toolModes.detector = undefined
  }

  // Start key mode
  startKeyMode(itemIndex: number): void {
    this.cancelAllToolModes()
    this.state.toolModes.key = { active: true, itemIndex }
  }

  // Cancel key mode
  cancelKeyMode(): void {
    this.state.toolModes.key = undefined
  }

  // Complete key tool usage
  completeKeyMode(): void {
    this.state.toolModes.key = undefined
  }

  // Start staff mode
  startStaffMode(itemIndex: number): void {
    this.cancelAllToolModes()
    this.state.toolModes.staff = { active: true, itemIndex }
  }

  // Cancel staff mode
  cancelStaffMode(): void {
    this.state.toolModes.staff = undefined
  }

  // Complete staff tool usage
  completeStaffMode(): void {
    this.state.toolModes.staff = undefined
  }

  // Start ring mode
  startRingMode(itemIndex: number): void {
    this.cancelAllToolModes()
    this.state.toolModes.ring = { active: true, itemIndex }
  }

  // Cancel ring mode
  cancelRingMode(): void {
    this.state.toolModes.ring = undefined
  }

  // Complete ring tool usage
  completeRingMode(): void {
    this.state.toolModes.ring = undefined
  }

  // Cancel all active tool modes
  cancelAllToolModes(): void {
    this.state.toolModes = {}
  }

  // === Tool Mode Queries ===
  
  isTransmuteModeActive(): boolean {
    return this.state.toolModes.transmute?.active === true
  }

  isDetectorModeActive(): boolean {
    return this.state.toolModes.detector?.active === true
  }

  isKeyModeActive(): boolean {
    return this.state.toolModes.key?.active === true
  }

  isStaffModeActive(): boolean {
    return this.state.toolModes.staff?.active === true
  }

  isRingModeActive(): boolean {
    return this.state.toolModes.ring?.active === true
  }

  getActiveToolMode(): string | null {
    if (this.isTransmuteModeActive()) return 'transmute'
    if (this.isDetectorModeActive()) return 'detector'
    if (this.isKeyModeActive()) return 'key'
    if (this.isStaffModeActive()) return 'staff'
    if (this.isRingModeActive()) return 'ring'
    return null
  }

  getToolModeItemIndex(toolMode: string): number | null {
    switch (toolMode) {
      case 'transmute': return this.state.toolModes.transmute?.itemIndex ?? null
      case 'detector': return this.state.toolModes.detector?.itemIndex ?? null
      case 'key': return this.state.toolModes.key?.itemIndex ?? null
      case 'staff': return this.state.toolModes.staff?.itemIndex ?? null
      case 'ring': return this.state.toolModes.ring?.itemIndex ?? null
      default: return null
    }
  }

  // === Validation ===
  
  // Check if a tool mode can be activated (no conflicting modes active)
  canActivateToolMode(newMode: string): boolean {
    const activeMode = this.getActiveToolMode()
    return activeMode === null || activeMode === newMode
  }

  // Check if shop can be opened (no tool modes active)
  canOpenShop(): boolean {
    return this.getActiveToolMode() === null
  }

  // === Summary ===
  
  // Get summary of active UI states for debugging/display
  getActiveStatesSummary(): string[] {
    const active: string[] = []
    
    if (this.state.pendingDiscard) {
      active.push(`Discard confirmation for ${this.state.pendingDiscard.itemName}`)
    }
    
    if (this.state.shopOpen) {
      active.push('Shop open')
    }
    
    const activeToolMode = this.getActiveToolMode()
    if (activeToolMode) {
      active.push(`${activeToolMode} mode active`)
    }
    
    return active
  }
}