/**
 * AIManager - Manages AI opponent coordination and turn scheduling
 * Extracted from store.ts to isolate AI-related concerns
 */

import { AIOpponent, DumbAI } from './ai'
import { Board } from './types'

export interface AITurnResult {
  x: number
  y: number
  success: boolean
}

export type AITurnCallback = (result: AITurnResult) => void

export class AIManager {
  private ai: AIOpponent
  private turnTimeout: number | null = null
  private turnDelay: number = 1000 // 1 second delay for better UX

  constructor(ai: AIOpponent = new DumbAI()) {
    this.ai = ai
  }

  // Get current AI opponent
  getAI(): AIOpponent {
    return this.ai
  }

  // Set a different AI opponent
  setAI(ai: AIOpponent): void {
    this.ai = ai
    this.cancelScheduledTurn()
  }

  // Set turn delay (for testing or UX tuning)
  setTurnDelay(delayMs: number): void {
    this.turnDelay = delayMs
  }

  // Schedule AI turn with configurable delay
  scheduleTurn(board: Board, onTurnComplete: AITurnCallback): void {
    this.cancelScheduledTurn()
    
    this.turnTimeout = setTimeout(() => {
      this.executeTurn(board, onTurnComplete)
    }, this.turnDelay) as any
  }

  // Execute AI turn immediately
  executeTurn(board: Board, onTurnComplete: AITurnCallback): void {
    const aiMove = this.ai.takeTurn(board)
    
    if (aiMove) {
      console.log(`AI reveals tile at (${aiMove.x}, ${aiMove.y})`)
      // Note: The actual tile revealing is handled by the callback
      // This maintains separation of concerns - AIManager doesn't modify game state
      onTurnComplete({
        x: aiMove.x,
        y: aiMove.y,
        success: true
      })
    } else {
      console.log('AI has no valid moves')
      onTurnComplete({
        x: -1,
        y: -1,
        success: false
      })
    }
  }

  // Cancel any scheduled AI turn
  cancelScheduledTurn(): void {
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout)
      this.turnTimeout = null
    }
  }

  // Reset AI for new board/game
  resetForNewBoard(): void {
    this.cancelScheduledTurn()
    this.ai.resetForNewBoard()
  }

  // Check if AI turn is currently scheduled
  isTurnScheduled(): boolean {
    return this.turnTimeout !== null
  }

  // Get AI name for display purposes
  getAIName(): string {
    return this.ai.name
  }

  // Cleanup method
  cleanup(): void {
    this.cancelScheduledTurn()
  }
}