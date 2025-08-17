/**
 * CoordinatedStore - Streamlined store using GameCoordinator
 * Replaces complex store logic with clean delegation pattern
 */

import { GameState } from './types'
import { createInitialGameState } from './gameLogic'
import { GameCoordinator } from './GameCoordinator'
import { DumbAI, AIOpponent } from './ai'

class CoordinatedStore {
  private state: GameState
  private observers: Array<() => void> = []
  private coordinator: GameCoordinator
  private ai: AIOpponent
  private aiTurnTimeout: number | null = null

  constructor() {
    this.state = createInitialGameState()
    this.state.gameStatus = 'character-select' // Start in character selection
    this.coordinator = new GameCoordinator()
    this.ai = new DumbAI()
  }

  // === CORE STATE MANAGEMENT ===

  getState(): GameState {
    return this.state
  }

  subscribe(callback: () => void): () => void {
    this.observers.push(callback)
    
    return () => {
      const index = this.observers.indexOf(callback)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  private notify(): void {
    this.observers.forEach(callback => callback())
  }

  private setState(newState: Partial<GameState> | GameState): void {
    if ('board' in newState && 'run' in newState) {
      // Full state replacement
      this.state = newState as GameState
    } else {
      // Partial state update
      this.state = { ...this.state, ...newState }
    }
    this.notify()
  }

  // === GAME ACTIONS (delegated to coordinator) ===

  selectCharacter(characterId: string): void {
    const result = this.coordinator.selectCharacter(this.state, characterId)
    
    if (result.error) {
      console.warn(`Character selection failed: ${result.error}`)
      return
    }

    this.setState(result.newState)
    console.log(`Selected character: ${characterId}`)
  }

  revealTileAt(x: number, y: number): boolean {
    const result = this.coordinator.revealTile(this.state, x, y)
    
    if (result.error) {
      console.warn(`Tile reveal failed: ${result.error}`)
      return false
    }

    this.setState(result.newState)

    // Handle post-reveal actions
    if (result.shouldTriggerAI) {
      this.scheduleAITurn()
    }

    if (result.nextBoardDelay) {
      this.scheduleNextBoard(result.nextBoardDelay)
    }

    return true
  }

  chooseUpgrade(index: number): void {
    const result = this.coordinator.chooseUpgrade(this.state, index)
    
    if (result.error) {
      console.warn(`Upgrade choice failed: ${result.error}`)
      return
    }

    this.setState(result.newState)

    if (result.shouldTriggerAI) {
      this.scheduleAITurn()
    }
  }

  triggerUpgradeChoice(): void {
    const result = this.coordinator.debugTriggerUpgradeChoice(this.state)
    
    if (result.error) {
      console.warn(`Trigger upgrade choice failed: ${result.error}`)
      return
    }

    this.setState(result.newState)
  }

  openShop(): void {
    const result = this.coordinator.openShop(this.state)
    
    if (result.error) {
      console.warn(`Open shop failed: ${result.error}`)
      return
    }

    this.setState(result.newState)
  }

  closeShop(): void {
    const result = this.coordinator.closeShop(this.state)
    
    if (result.error) {
      console.warn(`Close shop failed: ${result.error}`)
      return
    }

    this.setState(result.newState)

    if (result.shouldTriggerAI) {
      this.scheduleAITurn()
    }

    if (result.nextBoardDelay) {
      this.scheduleNextBoard(result.nextBoardDelay)
    }
  }

  useItem(itemId: string): void {
    const result = this.coordinator.useItem(this.state, itemId)
    
    if (result.error) {
      console.warn(`Use item failed: ${result.error}`)
      return
    }

    this.setState(result.newState)
  }

  resetGame(): void {
    // Clear any pending timeouts
    if (this.aiTurnTimeout) {
      clearTimeout(this.aiTurnTimeout)
      this.aiTurnTimeout = null
    }

    const result = this.coordinator.resetGame()
    
    if (result.error) {
      console.warn(`Reset game failed: ${result.error}`)
      return
    }

    // Reset to initial state
    this.state = createInitialGameState()
    this.state.gameStatus = 'character-select'
    this.notify()
  }

  // === AI MANAGEMENT ===

  private scheduleAITurn(delay: number = 1000): void {
    if (this.aiTurnTimeout) {
      clearTimeout(this.aiTurnTimeout)
    }

    this.aiTurnTimeout = setTimeout(() => {
      this.performAITurn()
    }, delay)
  }

  private performAITurn(): void {
    if (!this.coordinator.isGamePlayable(this.state) || this.state.currentTurn !== 'opponent') {
      return
    }

    const result = this.coordinator.performAITurn(this.state)
    
    if (result.error) {
      console.warn(`AI turn failed: ${result.error}`)
      return
    }

    this.setState(result.newState)

    // Continue AI turns if needed
    if (result.shouldTriggerAI) {
      this.scheduleAITurn()
    }
  }

  private scheduleNextBoard(delay: number): void {
    setTimeout(() => {
      const result = this.coordinator.progressToNextBoard(this.state)
      
      if (result.error) {
        console.warn(`Progress to next board failed: ${result.error}`)
        return
      }

      this.setState(result.newState)

      if (result.shouldTriggerAI) {
        this.scheduleAITurn()
      }
    }, delay)
  }

  // === DEBUG METHODS ===

  debugAddGold(amount: number = 1): void {
    const result = this.coordinator.debugAddGold(this.state, amount)
    this.setState(result.newState)
  }

  debugAddHealth(amount: number = 10): void {
    const result = this.coordinator.debugAddHealth(this.state, amount)
    this.setState(result.newState)
  }

  debugRevealAllPlayerTiles(): void {
    const result = this.coordinator.debugRevealAllPlayerTiles(this.state)
    
    if (result.error) {
      console.warn(`Debug reveal all failed: ${result.error}`)
      return
    }

    this.setState(result.newState)

    if (result.shouldTriggerAI) {
      this.scheduleAITurn()
    }

    if (result.nextBoardDelay) {
      this.scheduleNextBoard(result.nextBoardDelay)
    }
  }

  // === QUERY METHODS ===

  isGamePlayable(): boolean {
    return this.coordinator.isGamePlayable(this.state)
  }

  getCurrentPhase(): string {
    return this.coordinator.getCurrentPhase(this.state)
  }

  // === LEGACY COMPATIBILITY ===
  
  // These methods are called by existing UI/event handlers
  // They delegate to the coordinator or handle special cases

  // Reveal all player tiles (for 'w' debug command)
  revealAllPlayerTiles(): void {
    this.debugRevealAllPlayerTiles()
  }

  // Legacy setState for debug commands that need direct state access
  // Only used by globalEventHandlers.ts for 'g' and 'h' debug commands
  __legacySetState(newState: Partial<GameState>): void {
    console.warn('Using legacy setState - consider using coordinator methods instead')
    this.setState(newState)
  }
}

// Export singleton instance
export const gameStore = new CoordinatedStore()
export default gameStore