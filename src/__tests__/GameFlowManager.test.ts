/**
 * Tests for GameFlowManager - Core game flow logic including turns, board progression, and game state transitions
 */

import { GameFlowManager, TileRevealResult, BoardProgressionResult, TurnEndResult } from '../GameFlowManager'
import { GameState, Board, RunState, TileOwner, TileContent } from '../types'

// Mock dependencies
jest.mock('../gameLogic', () => ({
  revealTile: jest.fn(),
  checkBoardStatus: jest.fn(),
  progressToNextLevel: jest.fn()
}))

jest.mock('../clues', () => ({
  generateClue: jest.fn()
}))

jest.mock('../ai', () => ({
  DumbAI: jest.fn().mockImplementation(() => ({
    takeTurn: jest.fn()
  }))
}))

import { revealTile, checkBoardStatus, progressToNextLevel } from '../gameLogic'
import { generateClue } from '../clues'

const mockRevealTile = revealTile as jest.MockedFunction<typeof revealTile>
const mockCheckBoardStatus = checkBoardStatus as jest.MockedFunction<typeof checkBoardStatus>
const mockProgressToNextLevel = progressToNextLevel as jest.MockedFunction<typeof progressToNextLevel>
const mockGenerateClue = generateClue as jest.MockedFunction<typeof generateClue>

// Test helper functions
function createTestBoard(width: number = 3, height: number = 3): Board {
  const tiles = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      row.push({
        x,
        y,
        owner: TileOwner.Player,
        content: TileContent.Empty,
        revealed: false,
        fogged: false,
        annotated: null,
        chainData: null,
        detectorScan: null,
        itemData: null,
        monsterData: null,
        upgradeData: null,
        revealedBy: null
      })
    }
    tiles.push(row)
  }
  
  return {
    width,
    height,
    tiles
  }
}

function createTestRun(): RunState {
  return {
    currentLevel: 1,
    hp: 10,
    maxHp: 10,
    gold: 50,
    loot: 1,
    inventory: [null, null, null, null],
    upgrades: [],
    temporaryBuffs: {
      protection: 0
    }
  }
}

function createTestGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    board: createTestBoard(),
    boardStatus: 'in-progress',
    gameStatus: 'playing',
    currentTurn: 'player',
    clues: [],
    shopOpen: false,
    shopItems: [],
    pendingDiscard: null,
    upgradeChoice: null,
    run: createTestRun(),
    ...overrides
  }
}

describe('GameFlowManager', () => {
  let gameFlowManager: GameFlowManager
  
  beforeEach(() => {
    gameFlowManager = new GameFlowManager()
    jest.clearAllMocks()
  })

  afterEach(() => {
    gameFlowManager.cleanup()
  })

  describe('revealTile', () => {
    const mockTileContentHandler = jest.fn()

    beforeEach(() => {
      mockTileContentHandler.mockReset()
      mockTileContentHandler.mockReturnValue({
        updatedRun: createTestRun(),
        triggerUpgradeChoice: false,
        triggerShop: false,
        playerDied: false
      })
      mockRevealTile.mockReturnValue(true)
      mockCheckBoardStatus.mockReturnValue('in-progress')
    })

    it('should fail when game is not in playing state', () => {
      const gameState = createTestGameState({ gameStatus: 'game-over' })
      
      const result = gameFlowManager.revealTile(gameState, 0, 0, mockTileContentHandler)
      
      expect(result.success).toBe(false)
      expect(result.shouldTriggerAI).toBe(false)
      expect(result.deferredAITurn).toBe(false)
      expect(mockRevealTile).not.toHaveBeenCalled()
    })

    it('should fail when it is not player turn', () => {
      const gameState = createTestGameState({ currentTurn: 'opponent' })
      
      const result = gameFlowManager.revealTile(gameState, 0, 0, mockTileContentHandler)
      
      expect(result.success).toBe(false)
      expect(result.shouldTriggerAI).toBe(false)
      expect(result.deferredAITurn).toBe(false)
      expect(mockRevealTile).not.toHaveBeenCalled()
    })

    it('should fail when upgrade choice is pending', () => {
      const gameState = createTestGameState({ upgradeChoice: { choices: [], callback: jest.fn() } })
      
      const result = gameFlowManager.revealTile(gameState, 0, 0, mockTileContentHandler)
      
      expect(result.success).toBe(false)
      expect(result.shouldTriggerAI).toBe(false)
      expect(result.deferredAITurn).toBe(false)
      expect(mockRevealTile).not.toHaveBeenCalled()
    })

    it('should fail when tile is already revealed', () => {
      const gameState = createTestGameState()
      gameState.board.tiles[0][0].revealed = true
      
      const result = gameFlowManager.revealTile(gameState, 0, 0, mockTileContentHandler)
      
      expect(result.success).toBe(false)
      expect(result.shouldTriggerAI).toBe(false)
      expect(result.deferredAITurn).toBe(false)
      expect(mockRevealTile).not.toHaveBeenCalled()
    })

    it('should successfully reveal player tile and continue turn', () => {
      const gameState = createTestGameState()
      
      const result = gameFlowManager.revealTile(gameState, 0, 0, mockTileContentHandler)
      
      expect(result.success).toBe(true)
      expect(result.newGameState.currentTurn).toBe('player')
      expect(result.shouldTriggerAI).toBe(false)
      expect(result.deferredAITurn).toBe(false)
      expect(mockRevealTile).toHaveBeenCalledWith(gameState.board, 0, 0, 'player')
    })

    it('should successfully reveal opponent tile and switch turn', () => {
      const gameState = createTestGameState()
      gameState.board.tiles[0][0].owner = TileOwner.Opponent
      
      const result = gameFlowManager.revealTile(gameState, 0, 0, mockTileContentHandler)
      
      expect(result.success).toBe(true)
      expect(result.newGameState.currentTurn).toBe('opponent')
      expect(result.shouldTriggerAI).toBe(true)
      expect(result.deferredAITurn).toBe(false)
    })

    it('should handle player death', () => {
      const gameState = createTestGameState()
      
      mockTileContentHandler.mockReturnValue({
        updatedRun: gameState.run,
        triggerUpgradeChoice: false,
        triggerShop: false,
        playerDied: true
      })
      
      const result = gameFlowManager.revealTile(gameState, 0, 0, mockTileContentHandler)
      
      expect(result.success).toBe(true)
      expect(result.playerDied).toBe(true)
      expect(result.newGameState.gameStatus).toBe('player-died')
      expect(result.shouldTriggerAI).toBe(false)
      expect(result.deferredAITurn).toBe(false)
    })

    it('should pause for upgrade choice', () => {
      const gameState = createTestGameState()
      
      mockTileContentHandler.mockReturnValue({
        updatedRun: gameState.run,
        triggerUpgradeChoice: true,
        triggerShop: false,
        playerDied: false
      })
      
      const result = gameFlowManager.revealTile(gameState, 0, 0, mockTileContentHandler)
      
      expect(result.success).toBe(true)
      expect(result.shouldPauseForUpgrade).toBe(true)
      expect(result.shouldTriggerAI).toBe(false)
      expect(result.deferredAITurn).toBe(false)
      expect(gameFlowManager.isPendingUpgradeChoice()).toBe(true)
    })

    it('should defer AI turn when upgrade choice triggered on non-player tile', () => {
      const gameState = createTestGameState()
      gameState.board.tiles[0][0].owner = TileOwner.Opponent
      
      mockTileContentHandler.mockReturnValue({
        updatedRun: gameState.run,
        triggerUpgradeChoice: true,
        triggerShop: false,
        playerDied: false
      })
      
      const result = gameFlowManager.revealTile(gameState, 0, 0, mockTileContentHandler)
      
      expect(result.success).toBe(true)
      expect(result.shouldPauseForUpgrade).toBe(true)
      expect(result.shouldTriggerAI).toBe(false)
      expect(result.deferredAITurn).toBe(true)
    })

    it('should defer AI turn when shop triggered on non-player tile', () => {
      const gameState = createTestGameState()
      gameState.board.tiles[0][0].owner = TileOwner.Neutral
      
      mockTileContentHandler.mockReturnValue({
        updatedRun: gameState.run,
        triggerUpgradeChoice: false,
        triggerShop: true,
        playerDied: false
      })
      
      const result = gameFlowManager.revealTile(gameState, 0, 0, mockTileContentHandler)
      
      expect(result.success).toBe(true)
      expect(result.shouldPauseForShop).toBe(true)
      expect(result.shouldTriggerAI).toBe(false)
      expect(result.deferredAITurn).toBe(true)
    })

    it('should consume protection charge on tile reveal', () => {
      const gameState = createTestGameState()
      gameState.board.tiles[0][0].owner = TileOwner.Opponent
      gameState.run.temporaryBuffs.protection = 2
      
      mockTileContentHandler.mockReturnValue({
        updatedRun: { ...gameState.run, temporaryBuffs: { protection: 2 } },
        triggerUpgradeChoice: false,
        triggerShop: false,
        playerDied: false
      })
      
      const result = gameFlowManager.revealTile(gameState, 0, 0, mockTileContentHandler)
      
      expect(result.success).toBe(true)
      expect(result.newGameState.run?.temporaryBuffs.protection).toBe(1)
      expect(result.newGameState.currentTurn).toBe('player') // Protection keeps turn
      expect(result.deferredAITurn).toBe(false) // No AI turn needed with protection
    })
  })

  describe('handleBoardWon', () => {
    it('should handle board won scenario', () => {
      const gameState = createTestGameState()
      const mockTrophyAwarder = jest.fn()
      
      const result = gameFlowManager.handleBoardWon(gameState, mockTrophyAwarder)
      
      expect(result.success).toBe(true)
      expect(result.newGameState.boardStatus).toBe('won')
      expect(mockTrophyAwarder).toHaveBeenCalled()
    })
  })

  describe('handleBoardLost', () => {
    it('should handle board lost scenario', () => {
      const gameState = createTestGameState()
      
      const result = gameFlowManager.handleBoardLost(gameState)
      
      expect(result.success).toBe(true)
      expect(result.newGameState.gameStatus).toBe('game-over')
      expect(result.newGameState.boardStatus).toBe('lost')
    })
  })

  describe('endTurn', () => {
    it('should successfully end player turn', () => {
      const gameState = createTestGameState()
      
      const result = gameFlowManager.endTurn(gameState)
      
      expect(result.success).toBe(true)
      expect(result.newGameState.currentTurn).toBe('opponent')
      expect(result.shouldTriggerAI).toBe(true)
    })

    it('should fail when not player turn', () => {
      const gameState = createTestGameState({ currentTurn: 'opponent' })
      
      const result = gameFlowManager.endTurn(gameState)
      
      expect(result.success).toBe(false)
      expect(result.shouldTriggerAI).toBe(false)
    })
  })

  describe('executeAITurn', () => {
    let mockAI: any

    beforeEach(() => {
      mockAI = {
        takeTurn: jest.fn()
      }
      // Access the private AI instance through constructor
      ;(gameFlowManager as any).ai = mockAI
    })

    it('should successfully execute AI turn', () => {
      const gameState = createTestGameState({ currentTurn: 'opponent' })
      const aiMove = { x: 1, y: 1 }
      
      mockAI.takeTurn.mockReturnValue(aiMove)
      mockRevealTile.mockReturnValue(true)
      mockCheckBoardStatus.mockReturnValue('in-progress')
      
      const mockClue = { handA: { tiles: [] }, handB: { tiles: [] } }
      mockGenerateClue.mockReturnValue(mockClue)
      
      const result = gameFlowManager.executeAITurn(gameState)
      
      expect(result.success).toBe(true)
      expect(result.newGameState.currentTurn).toBe('player')
      expect(result.newGameState.clues).toContain(mockClue)
      expect(mockRevealTile).toHaveBeenCalledWith(gameState.board, 1, 1, 'opponent')
    })
  })

  describe('upgrade choice management', () => {
    it('should track pending upgrade choice', () => {
      expect(gameFlowManager.isPendingUpgradeChoice()).toBe(false)
      
      const gameState = createTestGameState()
      const mockTileContentHandler = jest.fn().mockReturnValue({
        updatedRun: gameState.run,
        triggerUpgradeChoice: true,
        triggerShop: false,
        playerDied: false
      })
      
      mockRevealTile.mockReturnValue(true)
      mockCheckBoardStatus.mockReturnValue('in-progress')
      
      gameFlowManager.revealTile(gameState, 0, 0, mockTileContentHandler)
      
      expect(gameFlowManager.isPendingUpgradeChoice()).toBe(true)
      
      gameFlowManager.clearPendingUpgradeChoice()
      
      expect(gameFlowManager.isPendingUpgradeChoice()).toBe(false)
    })
  })
})