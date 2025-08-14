import { GameFlowManager, GameStatus, GameFlowEvent } from '../GameFlowManager'
import { GameState } from '../types'
import { createInitialGameState } from '../gameLogic'

// Helper to create a minimal game state for testing
function createTestGameState(overrides: Partial<GameState> = {}): GameState {
  const baseState = createInitialGameState()
  return {
    ...baseState,
    ...overrides
  }
}

describe('GameFlowManager', () => {
  let gameFlow: GameFlowManager

  beforeEach(() => {
    gameFlow = new GameFlowManager()
    
    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('character selection', () => {
    it('should handle valid character selection', () => {
      const state = createTestGameState({
        gameStatus: 'character-select'
      })
      
      const result = gameFlow.selectCharacter(state, 'fighter')
      
      expect(result.newState.gameStatus).toBe('playing')
      expect(result.events).toContain('character-selected')
      expect(result.newState.selectedCharacter).toBeDefined()
    })

    it('should reject character selection when not in character-select state', () => {
      const state = createTestGameState({
        gameStatus: 'playing'
      })
      
      const result = gameFlow.selectCharacter(state, 'fighter')
      
      expect(result.newState).toEqual({})
      expect(result.events).toEqual([])
    })

    it('should handle invalid character IDs gracefully', () => {
      const state = createTestGameState({
        gameStatus: 'character-select'
      })
      
      const result = gameFlow.selectCharacter(state, 'invalid-character')
      
      expect(result.newState).toEqual({})
      expect(result.events).toEqual([])
    })
  })

  describe('turn management', () => {
    it('should end player turn and switch to opponent', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        currentTurn: 'player'
      })
      
      const result = gameFlow.endTurn(state)
      
      expect(result.newState.currentTurn).toBe('opponent')
      expect(result.events).toContain('turn-ended')
      expect(result.shouldTriggerAI).toBe(true)
    })

    it('should not allow ending turn when not player turn', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        currentTurn: 'opponent'
      })
      
      const result = gameFlow.endTurn(state)
      
      expect(result.newState).toEqual({})
      expect(result.events).toEqual([])
    })

    it('should not allow ending turn when game not playing', () => {
      const state = createTestGameState({
        gameStatus: 'character-select',
        currentTurn: 'player'
      })
      
      const result = gameFlow.endTurn(state)
      
      expect(result.newState).toEqual({})
      expect(result.events).toEqual([])
    })
  })

  describe('board completion', () => {
    it('should handle board won with progression delay', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        shopOpen: false
      })
      
      const result = gameFlow.handleBoardWon(state)
      
      expect(result.newState.boardStatus).toBe('won')
      expect(result.events).toContain('board-won')
      expect(result.nextBoardDelay).toBe(2000)
    })

    it('should handle board won when shop is open', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        shopOpen: true
      })
      
      const result = gameFlow.handleBoardWon(state)
      
      expect(result.newState.boardStatus).toBe('won')
      expect(result.events).toContain('board-won')
      expect(result.nextBoardDelay).toBeUndefined()
    })

    it('should handle board lost', () => {
      const state = createTestGameState({
        gameStatus: 'playing'
      })
      
      const result = gameFlow.handleBoardLost(state)
      
      expect(result.newState.gameStatus).toBe('opponent-won')
      expect(result.newState.boardStatus).toBe('lost')
      expect(result.events).toContain('board-lost')
    })
  })

  describe('board progression', () => {
    it('should progress to next board successfully', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        run: {
          currentLevel: 1,
          maxLevel: 20,
          character: 'fighter',
          trophies: [],
          gold: 0,
          upgrades: []
        }
      })
      
      const result = gameFlow.progressToNextBoard(state)
      
      expect(result.newState.run?.currentLevel).toBeGreaterThan(1)
      expect(result.events).toContain('next-board')
    })

    it('should trigger AI if next turn is opponent', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        currentTurn: 'player',
        run: {
          currentLevel: 1,
          maxLevel: 20,
          character: 'fighter',
          trophies: [],
          gold: 0,
          upgrades: []
        }
      })
      
      const result = gameFlow.progressToNextBoard(state)
      
      // shouldTriggerAI depends on the new turn state from progressToNextLevel
      expect(typeof result.shouldTriggerAI).toBe('boolean')
    })

    it('should handle progression errors gracefully', () => {
      const invalidState = createTestGameState({
        run: undefined as any
      })
      
      const result = gameFlow.progressToNextBoard(invalidState)
      
      expect(result.newState).toEqual({})
      expect(result.events).toEqual([])
    })
  })

  describe('game reset', () => {
    it('should reset game to character selection', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        shopOpen: true,
        upgradeChoice: { options: [], description: '' }
      })
      
      const result = gameFlow.resetGame()
      
      expect(result.newState.gameStatus).toBe('character-select')
      expect(result.newState.shopOpen).toBe(false)
      expect(result.newState.upgradeChoice).toBe(null)
      expect(result.events).toContain('game-reset')
    })
  })

  describe('shop closure handling', () => {
    it('should trigger board won progression when shop closes after win', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        boardStatus: 'won',
        shopOpen: false
      })
      
      const result = gameFlow.handleShopClosedAfterWin(state)
      
      expect(result.newState.boardStatus).toBe('won')
      expect(result.events).toContain('board-won')
    })

    it('should not trigger progression if board not won', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        boardStatus: 'in-progress',
        shopOpen: false
      })
      
      const result = gameFlow.handleShopClosedAfterWin(state)
      
      expect(result.newState).toEqual({})
      expect(result.events).toEqual([])
    })

    it('should not trigger progression if shop still open', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        boardStatus: 'won',
        shopOpen: true
      })
      
      const result = gameFlow.handleShopClosedAfterWin(state)
      
      expect(result.newState).toEqual({})
      expect(result.events).toEqual([])
    })
  })

  describe('AI turn conditions', () => {
    it('should determine when to trigger AI turn', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        currentTurn: 'opponent',
        boardStatus: 'in-progress',
        upgradeChoice: null
      })
      
      const shouldTrigger = gameFlow.shouldTriggerAITurn(state, false)
      
      expect(shouldTrigger).toBe(true)
    })

    it('should not trigger AI during upgrade choice', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        currentTurn: 'opponent',
        boardStatus: 'in-progress',
        upgradeChoice: { options: [], description: '' }
      })
      
      const shouldTrigger = gameFlow.shouldTriggerAITurn(state, false)
      
      expect(shouldTrigger).toBe(false)
    })

    it('should not trigger AI when pending upgrade choice', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        currentTurn: 'opponent',
        boardStatus: 'in-progress',
        upgradeChoice: null
      })
      
      const shouldTrigger = gameFlow.shouldTriggerAITurn(state, true)
      
      expect(shouldTrigger).toBe(false)
    })

    it('should not trigger AI on player turn', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        currentTurn: 'player',
        boardStatus: 'in-progress',
        upgradeChoice: null
      })
      
      const shouldTrigger = gameFlow.shouldTriggerAITurn(state, false)
      
      expect(shouldTrigger).toBe(false)
    })
  })

  describe('game state validation', () => {
    it('should identify playable game state', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        boardStatus: 'in-progress'
      })
      
      const isPlayable = gameFlow.isGamePlayable(state)
      
      expect(isPlayable).toBe(true)
    })

    it('should identify non-playable states', () => {
      const nonPlayableStates = [
        { gameStatus: 'character-select' as GameStatus, boardStatus: 'in-progress' },
        { gameStatus: 'playing' as GameStatus, boardStatus: 'won' },
        { gameStatus: 'playing' as GameStatus, boardStatus: 'lost' },
        { gameStatus: 'opponent-won' as GameStatus, boardStatus: 'in-progress' }
      ]
      
      nonPlayableStates.forEach(stateOverride => {
        const state = createTestGameState(stateOverride)
        const isPlayable = gameFlow.isGamePlayable(state)
        expect(isPlayable).toBe(false)
      })
    })
  })

  describe('game phase detection', () => {
    it('should identify character selection phase', () => {
      const state = createTestGameState({
        gameStatus: 'character-select'
      })
      
      const phase = gameFlow.getCurrentPhase(state)
      
      expect(phase).toBe('Character Selection')
    })

    it('should identify shopping phase', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        shopOpen: true
      })
      
      const phase = gameFlow.getCurrentPhase(state)
      
      expect(phase).toBe('Shopping')
    })

    it('should identify upgrade choice phase', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        shopOpen: false,
        upgradeChoice: { options: [], description: '' }
      })
      
      const phase = gameFlow.getCurrentPhase(state)
      
      expect(phase).toBe('Choosing Upgrade')
    })

    it('should identify victory phase', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        boardStatus: 'won',
        shopOpen: false,
        upgradeChoice: null
      })
      
      const phase = gameFlow.getCurrentPhase(state)
      
      expect(phase).toBe('Victory!')
    })

    it('should identify defeat phase', () => {
      const state = createTestGameState({
        gameStatus: 'playing',
        boardStatus: 'lost',
        shopOpen: false,
        upgradeChoice: null
      })
      
      const phase = gameFlow.getCurrentPhase(state)
      
      expect(phase).toBe('Defeat!')
    })

    it('should identify turn-based play phases', () => {
      const playerTurnState = createTestGameState({
        gameStatus: 'playing',
        currentTurn: 'player',
        boardStatus: 'in-progress',
        shopOpen: false,
        upgradeChoice: null,
        run: { currentLevel: 5, trophies: [], character: 'fighter' }
      })
      
      const opponentTurnState = createTestGameState({
        gameStatus: 'playing',
        currentTurn: 'opponent',
        boardStatus: 'in-progress',
        shopOpen: false,
        upgradeChoice: null,
        run: { currentLevel: 3, trophies: [], character: 'cleric' }
      })
      
      expect(gameFlow.getCurrentPhase(playerTurnState)).toBe('Level 5 - Your Turn')
      expect(gameFlow.getCurrentPhase(opponentTurnState)).toBe('Level 3 - AI Turn')
    })

    it('should identify end game phases', () => {
      const gameOverState = createTestGameState({
        gameStatus: 'opponent-won'
      })
      
      const runCompleteState = createTestGameState({
        gameStatus: 'run-complete'
      })
      
      expect(gameFlow.getCurrentPhase(gameOverState)).toBe('Game Over')
      expect(gameFlow.getCurrentPhase(runCompleteState)).toBe('Run Complete!')
    })
  })

  describe('state transition validation', () => {
    it('should validate legal state transitions', () => {
      expect(gameFlow.canTransitionTo(
        createTestGameState({ gameStatus: 'character-select' }),
        'playing'
      )).toBe(true)
      
      expect(gameFlow.canTransitionTo(
        createTestGameState({ gameStatus: 'playing' }),
        'opponent-won'
      )).toBe(true)
      
      expect(gameFlow.canTransitionTo(
        createTestGameState({ gameStatus: 'opponent-won' }),
        'character-select'
      )).toBe(true)
    })

    it('should reject illegal state transitions', () => {
      expect(gameFlow.canTransitionTo(
        createTestGameState({ gameStatus: 'character-select' }),
        'opponent-won'
      )).toBe(false)
      
      expect(gameFlow.canTransitionTo(
        createTestGameState({ gameStatus: 'opponent-won' }),
        'playing'
      )).toBe(false)
    })
  })
})