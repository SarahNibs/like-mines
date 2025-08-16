/**
 * GameFlowManager - Handles core game flow logic including turns, board progression, and game state transitions
 */

import { GameState, Board, RunState, getTileAt, TileContent } from './types'
import { revealTile, checkBoardStatus, progressToNextLevel } from './gameLogic'
import { generateClue } from './clues'
import { DumbAI, AIOpponent } from './ai'

export interface BoardProgressionResult {
  success: boolean
  newGameState: Partial<GameState>
  message?: string
}

export interface TileRevealResult {
  success: boolean
  newGameState: Partial<GameState>
  shouldTriggerAI: boolean
  shouldPauseForUpgrade: boolean
  shouldPauseForShop: boolean
  playerDied: boolean
  deferredAITurn: boolean // True if AI turn should happen after pause resolves
}

export interface TurnEndResult {
  success: boolean
  newGameState: Partial<GameState>
  shouldTriggerAI: boolean
}

export class GameFlowManager {
  private ai: AIOpponent
  private aiTurnTimeout: number | null = null
  private boardProgressionTimeout: number | null = null
  private pendingUpgradeChoice: boolean = false

  constructor() {
    this.ai = new DumbAI()
  }

  // Handle tile reveal and all associated game flow logic
  revealTile(
    gameState: GameState, 
    x: number, 
    y: number, 
    tileContentHandler: (tile: any) => { triggerUpgradeChoice?: boolean; triggerShop?: boolean; playerDied?: boolean; updatedRun: RunState },
    bypassRewind: boolean = false
  ): TileRevealResult {
    if (gameState.gameStatus !== 'playing' || gameState.currentTurn !== 'player') {
      return {
        success: false,
        newGameState: {},
        shouldTriggerAI: false,
        shouldPauseForUpgrade: false,
        shouldPauseForShop: false,
        playerDied: false,
        deferredAITurn: false
      }
    }
    
    // Block player actions when upgrade choice is pending
    if (gameState.upgradeChoice || this.pendingUpgradeChoice) {
      return {
        success: false,
        newGameState: {},
        shouldTriggerAI: false,
        shouldPauseForUpgrade: false,
        shouldPauseForShop: false,
        playerDied: false,
        deferredAITurn: false
      }
    }
    
    const tile = getTileAt(gameState.board, x, y)
    if (!tile || tile.revealed) {
      return {
        success: false,
        newGameState: {},
        shouldTriggerAI: false,
        shouldPauseForUpgrade: false,
        shouldPauseForShop: false,
        playerDied: false,
        deferredAITurn: false
      }
    }
    
    // Check if tile is blocked by a chain
    if (tile.chainData && tile.chainData.isBlocked) {
      const requiredTile = getTileAt(gameState.board, tile.chainData.requiredTileX, tile.chainData.requiredTileY)
      if (requiredTile && !requiredTile.revealed) {
        console.log('Cannot click this tile - it\'s chained! Must reveal the connected tile first.')
        return {
          success: false,
          newGameState: {},
          shouldTriggerAI: false,
          shouldPauseForUpgrade: false,
          shouldPauseForShop: false,
          playerDied: false,
        deferredAITurn: false
        }
      }
    }
    
    // Check for Rewind protection on dangerous tiles (unless bypassed with SHIFT)
    const wouldProtectionActivate = tile.owner !== 'player' && 
                                   gameState.run.temporaryBuffs.protection && 
                                   gameState.run.temporaryBuffs.protection > 0
    
    const success = revealTile(gameState.board, x, y, 'player')
    if (!success) {
      return {
        success: false,
        newGameState: {},
        shouldTriggerAI: false,
        shouldPauseForUpgrade: false,
        shouldPauseForShop: false,
        playerDied: false,
        deferredAITurn: false
      }
    }

    const newBoardStatus = checkBoardStatus(gameState.board)
    const isPlayerTile = tile.owner === 'player'
    
    // Create mutable copy of run for modifications
    const updatedRun = { ...gameState.run }
    
    // Award loot bonus for revealing opponent tiles
    if (tile.owner === 'opponent') {
      updatedRun.gold += updatedRun.loot
    }
    
    // RESTING upgrade: heal when revealing neutral tiles
    if (tile.owner === 'neutral') {
      const restingCount = updatedRun.upgrades.filter(id => id === 'resting').length
      if (restingCount > 0) {
        const healAmount = restingCount * 2
        updatedRun.hp = Math.min(updatedRun.maxHp, updatedRun.hp + healAmount)
        console.log(`Resting: Healed ${healAmount} HP from revealing neutral tile`)
      }
    }
    
    // Handle tile content through provided handler
    const contentResult = tileContentHandler(tile)
    const finalRun = contentResult.updatedRun
    
    // Check if player died after handling content
    if (contentResult.playerDied) {
      return {
        success: true,
        newGameState: {
          board: { ...gameState.board },
          run: finalRun,
          gameStatus: 'player-died'
        },
        shouldTriggerAI: false,
        shouldPauseForUpgrade: false,
        shouldPauseForShop: false,
        playerDied: true,
        deferredAITurn: false
      }
    }
    
    // Determine if this would trigger AI (non-player tile without protection)
    const hadProtection = finalRun.temporaryBuffs.protection && finalRun.temporaryBuffs.protection > 0
    const wouldTriggerAI = newBoardStatus === 'in-progress' && !isPlayerTile && !hadProtection
    
    // Check if upgrade choice or shop was triggered - pause game until resolved
    if (contentResult.triggerUpgradeChoice) {
      this.pendingUpgradeChoice = true
      
      // Determine what the turn should be after the upgrade choice
      let newTurn = 'player'
      if (newBoardStatus === 'in-progress' && !isPlayerTile && !hadProtection) {
        newTurn = 'opponent'
      }
      
      return {
        success: true,
        newGameState: {
          board: { ...gameState.board },
          run: finalRun,
          currentTurn: newTurn,
          boardStatus: newBoardStatus
        },
        shouldTriggerAI: false,
        shouldPauseForUpgrade: true,
        shouldPauseForShop: false,
        playerDied: false,
        deferredAITurn: wouldTriggerAI
      }
    }

    if (contentResult.triggerShop) {
      // Determine what the turn should be after the shop closes
      let newTurn = 'player'
      if (newBoardStatus === 'in-progress' && !isPlayerTile && !hadProtection) {
        newTurn = 'opponent'
      }
      
      return {
        success: true,
        newGameState: {
          board: { ...gameState.board },
          run: finalRun,
          currentTurn: newTurn,
          boardStatus: newBoardStatus
        },
        shouldTriggerAI: false,
        shouldPauseForUpgrade: false,
        shouldPauseForShop: true,
        playerDied: false,
        deferredAITurn: wouldTriggerAI
      }
    }
    
    // Check if Protection should activate before consuming it
    
    // Consume Protection charge on ANY tile reveal (if active)
    if (hadProtection) {
      finalRun.temporaryBuffs.protection -= 1
      console.log(`Protection consumed! ${finalRun.temporaryBuffs.protection} charges remaining.`)
    }
    
    // Player continues turn if they revealed their own tile, or if protection was active
    let newTurn = 'player'
    if (newBoardStatus === 'in-progress' && !isPlayerTile && !hadProtection) {
      // Player revealed opponent/neutral tile without protection - turn ends
      newTurn = 'opponent'
    }
    
    const newGameState: Partial<GameState> = {
      board: { ...gameState.board },
      boardStatus: newBoardStatus,
      currentTurn: newTurn,
      run: finalRun
    }

    // Determine if AI should be triggered
    const shouldTriggerAI = newBoardStatus === 'in-progress' && newTurn === 'opponent'
    
    return {
      success: true,
      newGameState,
      shouldTriggerAI,
      shouldPauseForUpgrade: false,
      shouldPauseForShop: false,
      playerDied: false,
      deferredAITurn: false
    }
  }

  // Handle board won scenario
  handleBoardWon(gameState: GameState, trophyAwarder: () => void, progressCallback: () => void): BoardProgressionResult {
    console.log('Board won! Preparing for next level...')
    
    // Award trophies for winning
    trophyAwarder()
    
    // Clear any scheduled AI turns
    if (this.aiTurnTimeout) {
      clearTimeout(this.aiTurnTimeout)
      this.aiTurnTimeout = null
    }
    
    // Schedule automatic progression to next level
    this.boardProgressionTimeout = setTimeout(() => {
      progressCallback()
    }, 3000) as any // 3 second delay
    
    // Prevent timeout from keeping test process alive
    if (this.boardProgressionTimeout && typeof this.boardProgressionTimeout === 'object' && 'unref' in this.boardProgressionTimeout) {
      (this.boardProgressionTimeout as any).unref()
    }
    
    return {
      success: true,
      newGameState: {
        boardStatus: 'won'
      },
      message: 'Board completed! Progressing to next level...'
    }
  }

  // Handle board lost scenario  
  handleBoardLost(gameState: GameState): BoardProgressionResult {
    console.log('Board lost!')
    
    // Clear any scheduled AI turns
    if (this.aiTurnTimeout) {
      clearTimeout(this.aiTurnTimeout)
      this.aiTurnTimeout = null
    }
    
    return {
      success: true,
      newGameState: {
        gameStatus: 'game-over',
        boardStatus: 'lost'
      },
      message: 'Board lost! Game over.'
    }
  }

  // End current turn and switch to AI
  endTurn(gameState: GameState): TurnEndResult {
    if (gameState.gameStatus !== 'playing' || gameState.currentTurn !== 'player') {
      return {
        success: false,
        newGameState: {},
        shouldTriggerAI: false
      }
    }
    
    return {
      success: true,
      newGameState: {
        currentTurn: 'opponent'
      },
      shouldTriggerAI: true
    }
  }

  // Progress to next board
  progressToNextBoard(gameState: GameState): BoardProgressionResult {
    console.log('Progressing to level', gameState.run.currentLevel + 1)
    
    const newGameState = progressToNextLevel(gameState)
    
    return {
      success: true,
      newGameState,
      message: `Progressed to level ${newGameState.run.currentLevel}`
    }
  }

  // Schedule AI turn with delay
  scheduleAITurn(executeCallback: () => void, delay: number = 1000): void {
    if (this.aiTurnTimeout) {
      clearTimeout(this.aiTurnTimeout)
    }
    
    this.aiTurnTimeout = setTimeout(executeCallback, delay) as any
    
    // Prevent timeout from keeping test process alive
    if (this.aiTurnTimeout && typeof this.aiTurnTimeout === 'object' && 'unref' in this.aiTurnTimeout) {
      (this.aiTurnTimeout as any).unref()
    }
  }

  // Execute AI turn
  executeAITurn(gameState: GameState): BoardProgressionResult {
    if (gameState.gameStatus !== 'playing' || gameState.currentTurn !== 'opponent') {
      return {
        success: false,
        newGameState: {},
        message: 'Cannot execute AI turn in current state'
      }
    }
    
    const aiMove = this.ai.takeTurn(gameState.board)
    if (!aiMove) {
      return {
        success: false,
        newGameState: {},
        message: 'AI could not find valid move'
      }
    }
    
    console.log(`AI reveals tile at (${aiMove.x}, ${aiMove.y})`)
    const success = revealTile(gameState.board, aiMove.x, aiMove.y, 'opponent')
    
    if (!success) {
      return {
        success: false,
        newGameState: {},
        message: 'AI move failed'
      }
    }
    
    const newBoardStatus = checkBoardStatus(gameState.board)
    
    // Generate new clue when switching to player turn and add to array
    const newClues = newBoardStatus === 'in-progress' ? 
      [...gameState.clues, generateClue(gameState.board, gameState.run.upgrades)] : gameState.clues
    
    return {
      success: true,
      newGameState: {
        board: { ...gameState.board },
        boardStatus: newBoardStatus,
        clues: newClues,
        // Switch back to player turn (if board still in progress)
        currentTurn: newBoardStatus === 'in-progress' ? 'player' : 'opponent'
      }
    }
  }

  // Clear pending upgrade choice
  clearPendingUpgradeChoice(): void {
    this.pendingUpgradeChoice = false
  }

  // Check if upgrade choice is pending
  isPendingUpgradeChoice(): boolean {
    return this.pendingUpgradeChoice
  }

  // Clean up timeouts
  cleanup(): void {
    if (this.aiTurnTimeout) {
      clearTimeout(this.aiTurnTimeout)
      this.aiTurnTimeout = null
    }
    if (this.boardProgressionTimeout) {
      clearTimeout(this.boardProgressionTimeout)
      this.boardProgressionTimeout = null
    }
    this.pendingUpgradeChoice = false
  }
}