/**
 * GameFlowManager - Manages high-level game flow and state transitions
 * Extracted from store.ts to isolate game flow concerns
 */

import { GameState } from './types'
import { createCharacterRunState, progressToNextLevel } from './gameLogic'

export type GameStatus = 'character-select' | 'playing' | 'opponent-won' | 'run-complete'
export type GameFlowEvent = 
  | 'character-selected'
  | 'board-won' 
  | 'board-lost'
  | 'turn-ended'
  | 'next-board'
  | 'game-reset'

export interface GameFlowResult {
  newState: Partial<GameState> | GameState
  events: GameFlowEvent[]
  shouldTriggerAI?: boolean
  shouldShowShop?: boolean
  nextBoardDelay?: number
}

export class GameFlowManager {
  
  // Handle character selection and game start
  selectCharacter(currentState: GameState, characterId: string): GameFlowResult {
    if (currentState.gameStatus !== 'character-select') {
      return { newState: {}, events: [] }
    }

    try {
      const newState = createCharacterRunState(characterId)
      
      return {
        newState: {
          ...newState,
          gameStatus: 'playing' as GameStatus,
          selectedCharacter: characterId
        },
        events: ['character-selected']
      }
    } catch (error) {
      console.error(`Error creating character run state: ${error}`)
      return { newState: {}, events: [] }
    }
  }

  // Handle end of player turn
  endTurn(currentState: GameState): GameFlowResult {
    if (currentState.gameStatus !== 'playing' || currentState.currentTurn !== 'player') {
      return { newState: {}, events: [] }
    }

    return {
      newState: {
        currentTurn: 'opponent'
      },
      events: ['turn-ended'],
      shouldTriggerAI: true
    }
  }

  // Handle board won (player revealed all their tiles first)
  handleBoardWon(currentState: GameState): GameFlowResult {
    console.log('Board won! Preparing for next level...')
    
    // If shop is open, don't auto-progress - wait for shop to close
    if (currentState.shopOpen) {
      return {
        newState: {
          boardStatus: 'won'
        },
        events: ['board-won']
      }
    }

    // Schedule transition to next level after delay
    return {
      newState: {
        boardStatus: 'won'
      },
      events: ['board-won'],
      nextBoardDelay: 2000 // 2 second delay to show victory
    }
  }

  // Handle board lost (AI revealed all their tiles first)
  handleBoardLost(currentState: GameState): GameFlowResult {
    console.log('Board lost! Run ends.')
    
    return {
      newState: {
        gameStatus: 'opponent-won' as GameStatus,
        boardStatus: 'lost'
      },
      events: ['board-lost']
    }
  }

  // Progress to next board
  progressToNextBoard(currentState: GameState): GameFlowResult {
    try {
      const newState = progressToNextLevel(currentState)
      console.log(`Progressing to level ${newState.run.currentLevel}`)
      
      return {
        newState: newState, // Return the full new state from progressToNextLevel
        events: ['next-board'],
        shouldTriggerAI: newState.currentTurn === 'opponent'
      }
    } catch (error) {
      console.error(`Error progressing to next level: ${error}`)
      return { newState: {}, events: [] }
    }
  }

  // Reset game to initial state
  resetGame(): GameFlowResult {
    return {
      newState: {
        gameStatus: 'character-select' as GameStatus,
        shopOpen: false,
        upgradeChoice: null,
        selectedCharacter: null,
        // Note: createInitialGameState() should be called by the caller
        // We just provide the status change here
      },
      events: ['game-reset']
    }
  }

  // Handle shop closure when board was won
  handleShopClosedAfterWin(currentState: GameState): GameFlowResult {
    if (currentState.boardStatus === 'won' && !currentState.shopOpen) {
      console.log('Shop closed and board was won - triggering progression')
      return this.handleBoardWon(currentState)
    }
    
    return { newState: {}, events: [] }
  }

  // Determine if game flow should trigger AI turn
  shouldTriggerAITurn(currentState: GameState, pendingUpgradeChoice: boolean): boolean {
    return currentState.currentTurn === 'opponent' && 
           currentState.gameStatus === 'playing' && 
           currentState.boardStatus === 'in-progress' &&
           !currentState.upgradeChoice && 
           !pendingUpgradeChoice
  }

  // Check if game is in a playable state
  isGamePlayable(currentState: GameState): boolean {
    return currentState.gameStatus === 'playing' && 
           currentState.boardStatus === 'in-progress'
  }

  // Get current game phase for UI display
  getCurrentPhase(currentState: GameState): string {
    if (currentState.gameStatus === 'character-select') {
      return 'Character Selection'
    }
    
    if (currentState.gameStatus === 'playing') {
      if (currentState.shopOpen) {
        return 'Shopping'
      }
      if (currentState.upgradeChoice) {
        return 'Choosing Upgrade'
      }
      if (currentState.boardStatus === 'won') {
        return 'Victory!'
      }
      if (currentState.boardStatus === 'lost') {
        return 'Defeat!'
      }
      return `Level ${currentState.run.currentLevel} - ${currentState.currentTurn === 'player' ? 'Your Turn' : 'AI Turn'}`
    }
    
    if (currentState.gameStatus === 'opponent-won') {
      return 'Game Over'
    }
    
    if (currentState.gameStatus === 'run-complete') {
      return 'Run Complete!'
    }
    
    return 'Unknown Phase'
  }

  // Validate state transition
  canTransitionTo(currentState: GameState, newStatus: GameStatus): boolean {
    const current = currentState.gameStatus
    
    // Define valid transitions
    const validTransitions: Record<GameStatus, GameStatus[]> = {
      'character-select': ['playing'],
      'playing': ['opponent-won', 'run-complete', 'character-select'],
      'opponent-won': ['character-select'],
      'run-complete': ['character-select']
    }
    
    return validTransitions[current]?.includes(newStatus) || false
  }
}