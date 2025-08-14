import { AIManager, AITurnResult } from '../AIManager'
import { AIOpponent } from '../ai'
import { Board, TileOwner } from '../types'

// Mock AI for testing
class MockAI implements AIOpponent {
  name = 'Mock AI'
  private moveToReturn: { x: number; y: number } | null = { x: 1, y: 1 }
  private resetCalled = false

  takeTurn(board: Board): { x: number; y: number } | null {
    return this.moveToReturn
  }

  resetForNewBoard(): void {
    this.resetCalled = true
  }

  // Test utilities
  setNextMove(move: { x: number; y: number } | null): void {
    this.moveToReturn = move
  }

  wasResetCalled(): boolean {
    return this.resetCalled
  }

  clearResetFlag(): void {
    this.resetCalled = false
  }
}

// Helper to create a basic test board
function createTestBoard(): Board {
  return {
    width: 3,
    height: 3,
    tiles: Array(3).fill(null).map((_, y) => 
      Array(3).fill(null).map((_, x) => ({
        x, y,
        owner: TileOwner.Opponent,
        revealed: false,
        content: 0,
        itemData: null,
        upgradeData: null,
        monsterData: null,
        annotation: '',
        highlighted: false
      }))
    )
  }
}

describe('AIManager', () => {
  let aiManager: AIManager
  let mockAI: MockAI

  beforeEach(() => {
    mockAI = new MockAI()
    aiManager = new AIManager(mockAI)
    
    // Mock console.log to reduce test noise
    jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    aiManager.cleanup()
    jest.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with provided AI', () => {
      expect(aiManager.getAI()).toBe(mockAI)
      expect(aiManager.getAIName()).toBe('Mock AI')
    })

    it('should initialize with default DumbAI if none provided', () => {
      const defaultManager = new AIManager()
      expect(defaultManager.getAI().name).toBe('Random AI')
      defaultManager.cleanup()
    })

    it('should not have any scheduled turns initially', () => {
      expect(aiManager.isTurnScheduled()).toBe(false)
    })
  })

  describe('AI management', () => {
    it('should allow setting a different AI', () => {
      const newMockAI = new MockAI()
      newMockAI.name = 'New Mock AI'
      
      aiManager.setAI(newMockAI)
      
      expect(aiManager.getAI()).toBe(newMockAI)
      expect(aiManager.getAIName()).toBe('New Mock AI')
    })

    it('should cancel scheduled turns when setting new AI', () => {
      const board = createTestBoard()
      const callback = jest.fn()
      
      aiManager.scheduleTurn(board, callback)
      expect(aiManager.isTurnScheduled()).toBe(true)
      
      aiManager.setAI(new MockAI())
      expect(aiManager.isTurnScheduled()).toBe(false)
    })
  })

  describe('turn scheduling', () => {
    it('should schedule AI turn with delay', (done) => {
      const board = createTestBoard()
      const callback = jest.fn((result: AITurnResult) => {
        expect(result.success).toBe(true)
        expect(result.x).toBe(1)
        expect(result.y).toBe(1)
        done()
      })
      
      aiManager.setTurnDelay(10) // Short delay for test
      aiManager.scheduleTurn(board, callback)
      
      expect(aiManager.isTurnScheduled()).toBe(true)
    })

    it('should cancel previous scheduled turn when scheduling new one', () => {
      const board = createTestBoard()
      const callback1 = jest.fn()
      const callback2 = jest.fn()
      
      aiManager.setTurnDelay(100) // Longer delay to prevent execution
      
      aiManager.scheduleTurn(board, callback1)
      const firstScheduled = aiManager.isTurnScheduled()
      
      aiManager.scheduleTurn(board, callback2)
      
      expect(firstScheduled).toBe(true)
      expect(aiManager.isTurnScheduled()).toBe(true)
      
      // Wait a bit and verify only the second callback might be called
      setTimeout(() => {
        expect(callback1).not.toHaveBeenCalled()
      }, 50)
    })

    it('should handle turn scheduling cancellation', () => {
      const board = createTestBoard()
      const callback = jest.fn()
      
      aiManager.setTurnDelay(100)
      aiManager.scheduleTurn(board, callback)
      expect(aiManager.isTurnScheduled()).toBe(true)
      
      aiManager.cancelScheduledTurn()
      expect(aiManager.isTurnScheduled()).toBe(false)
      
      // Wait to ensure callback is not called
      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled()
      }, 150)
    })
  })

  describe('turn execution', () => {
    it('should execute AI turn immediately', () => {
      const board = createTestBoard()
      const callback = jest.fn()
      
      mockAI.setNextMove({ x: 2, y: 1 })
      aiManager.executeTurn(board, callback)
      
      expect(callback).toHaveBeenCalledWith({
        x: 2,
        y: 1,
        success: true
      })
    })

    it('should handle AI returning no valid moves', () => {
      const board = createTestBoard()
      const callback = jest.fn()
      
      mockAI.setNextMove(null)
      aiManager.executeTurn(board, callback)
      
      expect(callback).toHaveBeenCalledWith({
        x: -1,
        y: -1,
        success: false
      })
    })

    it('should log AI moves', () => {
      const board = createTestBoard()
      const callback = jest.fn()
      const consoleSpy = jest.spyOn(console, 'log')
      
      mockAI.setNextMove({ x: 0, y: 2 })
      aiManager.executeTurn(board, callback)
      
      expect(consoleSpy).toHaveBeenCalledWith('AI reveals tile at (0, 2)')
    })

    it('should log when AI has no valid moves', () => {
      const board = createTestBoard()
      const callback = jest.fn()
      const consoleSpy = jest.spyOn(console, 'log')
      
      mockAI.setNextMove(null)
      aiManager.executeTurn(board, callback)
      
      expect(consoleSpy).toHaveBeenCalledWith('AI has no valid moves')
    })
  })

  describe('board reset functionality', () => {
    it('should reset AI for new board', () => {
      aiManager.resetForNewBoard()
      
      expect(mockAI.wasResetCalled()).toBe(true)
    })

    it('should cancel scheduled turns when resetting for new board', () => {
      const board = createTestBoard()
      const callback = jest.fn()
      
      aiManager.setTurnDelay(100)
      aiManager.scheduleTurn(board, callback)
      expect(aiManager.isTurnScheduled()).toBe(true)
      
      aiManager.resetForNewBoard()
      expect(aiManager.isTurnScheduled()).toBe(false)
    })
  })

  describe('configuration', () => {
    it('should allow setting custom turn delay', () => {
      const originalDelay = 1000
      const newDelay = 500
      
      aiManager.setTurnDelay(newDelay)
      
      // We can't directly test the private turnDelay, but we can test its effect
      const board = createTestBoard()
      const callback = jest.fn()
      
      const startTime = Date.now()
      aiManager.scheduleTurn(board, () => {
        const endTime = Date.now()
        const actualDelay = endTime - startTime
        
        // Allow some tolerance for timing
        expect(actualDelay).toBeGreaterThanOrEqual(newDelay - 50)
        expect(actualDelay).toBeLessThan(originalDelay)
      })
    })
  })

  describe('cleanup', () => {
    it('should cancel scheduled turns on cleanup', () => {
      const board = createTestBoard()
      const callback = jest.fn()
      
      aiManager.setTurnDelay(100)
      aiManager.scheduleTurn(board, callback)
      expect(aiManager.isTurnScheduled()).toBe(true)
      
      aiManager.cleanup()
      expect(aiManager.isTurnScheduled()).toBe(false)
    })

    it('should be safe to call cleanup multiple times', () => {
      expect(() => {
        aiManager.cleanup()
        aiManager.cleanup()
        aiManager.cleanup()
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle multiple rapid scheduling calls', () => {
      const board = createTestBoard()
      const callback = jest.fn()
      
      aiManager.setTurnDelay(50)
      
      // Schedule multiple turns rapidly
      aiManager.scheduleTurn(board, callback)
      aiManager.scheduleTurn(board, callback)
      aiManager.scheduleTurn(board, callback)
      
      // Should only have one scheduled
      expect(aiManager.isTurnScheduled()).toBe(true)
    })

    it('should handle cancellation when no turn is scheduled', () => {
      expect(() => {
        aiManager.cancelScheduledTurn()
      }).not.toThrow()
      
      expect(aiManager.isTurnScheduled()).toBe(false)
    })

    it('should handle immediate execution followed by scheduling', (done) => {
      const board = createTestBoard()
      const immediateCallback = jest.fn()
      const scheduledCallback = jest.fn(() => {
        expect(immediateCallback).toHaveBeenCalled()
        expect(scheduledCallback).toHaveBeenCalled()
        done()
      })
      
      // Execute immediately
      aiManager.executeTurn(board, immediateCallback)
      
      // Then schedule another
      aiManager.setTurnDelay(10)
      aiManager.scheduleTurn(board, scheduledCallback)
    })
  })

  describe('state queries', () => {
    it('should correctly report scheduled turn status', () => {
      const board = createTestBoard()
      const callback = jest.fn()
      
      expect(aiManager.isTurnScheduled()).toBe(false)
      
      aiManager.setTurnDelay(100)
      aiManager.scheduleTurn(board, callback)
      expect(aiManager.isTurnScheduled()).toBe(true)
      
      aiManager.cancelScheduledTurn()
      expect(aiManager.isTurnScheduled()).toBe(false)
    })
  })
})