import { 
  countAdjacentTiles, 
  checkBoardStatus, 
  addItemToInventory, 
  removeItemFromInventory,
  createInitialRunState
} from '../gameLogic'
import { Board, TileOwner, TileContent, RunState, ItemData } from '../types'

// Helper function to create a minimal test board
function createTestBoard(width: number, height: number): Board {
  const tiles = Array(height).fill(null).map((_, y) => 
    Array(width).fill(null).map((_, x) => ({
      x,
      y,
      owner: TileOwner.Neutral,
      content: TileContent.Empty,
      revealed: false,
      contentVisible: false,
      annotated: 'none' as const,
      fogged: false
    }))
  )

  return {
    width,
    height,
    tiles,
    playerTilesTotal: 0,
    opponentTilesTotal: 0,
    playerTilesRevealed: 0,
    opponentTilesRevealed: 0
  }
}

// Helper function to create test items
const testItem: ItemData = {
  id: 'test-item',
  name: 'Test Item',
  description: 'A test item',
  icon: '🧪'
}

const anotherTestItem: ItemData = {
  id: 'another-item', 
  name: 'Another Item',
  description: 'Another test item',
  icon: '⚗️'
}

describe('gameLogic', () => {
  describe('countAdjacentTiles', () => {
    it('should count adjacent tiles of specified owner type', () => {
      const board = createTestBoard(5, 5)
      
      // Set center tile as neutral, surround with player tiles
      board.tiles[2][2].owner = TileOwner.Neutral
      board.tiles[1][1].owner = TileOwner.Player
      board.tiles[1][2].owner = TileOwner.Player  
      board.tiles[1][3].owner = TileOwner.Player
      board.tiles[2][1].owner = TileOwner.Opponent
      board.tiles[2][3].owner = TileOwner.Opponent
      
      const playerCount = countAdjacentTiles(board, 2, 2, TileOwner.Player)
      const opponentCount = countAdjacentTiles(board, 2, 2, TileOwner.Opponent)
      const neutralCount = countAdjacentTiles(board, 2, 2, TileOwner.Neutral)
      
      expect(playerCount).toBe(3)
      expect(opponentCount).toBe(2)
      expect(neutralCount).toBe(3) // The remaining adjacent tiles
    })

    it('should handle edge cases correctly', () => {
      const board = createTestBoard(3, 3)
      
      // Test corner tile (0,0) - only has 3 adjacent positions
      board.tiles[0][1].owner = TileOwner.Player
      board.tiles[1][0].owner = TileOwner.Player
      board.tiles[1][1].owner = TileOwner.Opponent
      
      const playerCount = countAdjacentTiles(board, 0, 0, TileOwner.Player)
      const opponentCount = countAdjacentTiles(board, 0, 0, TileOwner.Opponent)
      
      expect(playerCount).toBe(2)
      expect(opponentCount).toBe(1)
    })

    it('should handle out-of-bounds positions gracefully', () => {
      const board = createTestBoard(3, 3)
      
      // All tiles default to neutral, so should return 0 for non-existent adjacent tiles
      const count = countAdjacentTiles(board, 0, 0, TileOwner.Player)
      expect(count).toBe(0)
    })
  })

  describe('checkBoardStatus', () => {
    it('should return "won" when all player tiles are revealed', () => {
      const board = createTestBoard(3, 3)
      board.playerTilesTotal = 5
      board.playerTilesRevealed = 5
      board.opponentTilesTotal = 4
      board.opponentTilesRevealed = 2
      
      expect(checkBoardStatus(board)).toBe('won')
    })

    it('should return "lost" when all opponent tiles are revealed', () => {
      const board = createTestBoard(3, 3)
      board.playerTilesTotal = 5
      board.playerTilesRevealed = 3
      board.opponentTilesTotal = 4
      board.opponentTilesRevealed = 4
      
      expect(checkBoardStatus(board)).toBe('lost')
    })

    it('should return "in-progress" when neither win nor loss condition is met', () => {
      const board = createTestBoard(3, 3)
      board.playerTilesTotal = 5
      board.playerTilesRevealed = 3
      board.opponentTilesTotal = 4
      board.opponentTilesRevealed = 2
      
      expect(checkBoardStatus(board)).toBe('in-progress')
    })

    it('should prioritize player win over opponent win', () => {
      const board = createTestBoard(3, 3)
      board.playerTilesTotal = 5
      board.playerTilesRevealed = 5
      board.opponentTilesTotal = 4
      board.opponentTilesRevealed = 4
      
      // Both conditions met, but player win should take priority
      expect(checkBoardStatus(board)).toBe('won')
    })
  })

  describe('addItemToInventory', () => {
    it('should add item to first empty slot', () => {
      const runState: RunState = {
        ...createInitialRunState(),
        inventory: [null, testItem, null, null, null]
      }
      
      const result = addItemToInventory(runState, anotherTestItem)
      
      expect(result).toBe(true)
      expect(runState.inventory[0]).toEqual(anotherTestItem)
      expect(runState.inventory[1]).toEqual(testItem) // Should remain unchanged
    })

    it('should return false when inventory is full', () => {
      const runState: RunState = {
        ...createInitialRunState(),
        inventory: [testItem, testItem, testItem, testItem, testItem]
      }
      
      const result = addItemToInventory(runState, anotherTestItem)
      
      expect(result).toBe(false)
      // Inventory should remain unchanged
      expect(runState.inventory.every(item => item === testItem)).toBe(true)
    })

    it('should add to the last slot if others are full', () => {
      const runState: RunState = {
        ...createInitialRunState(),
        inventory: [testItem, testItem, testItem, testItem, null]
      }
      
      const result = addItemToInventory(runState, anotherTestItem)
      
      expect(result).toBe(true)
      expect(runState.inventory[4]).toEqual(anotherTestItem)
    })
  })

  describe('removeItemFromInventory', () => {
    it('should remove item from valid index', () => {
      const runState: RunState = {
        ...createInitialRunState(),
        inventory: [testItem, anotherTestItem, testItem, null, null]
      }
      
      removeItemFromInventory(runState, 1)
      
      expect(runState.inventory[1]).toBeNull()
      expect(runState.inventory[0]).toEqual(testItem) // Should remain
      expect(runState.inventory[2]).toEqual(testItem) // Should remain
    })

    it('should handle invalid indices gracefully', () => {
      const originalInventory = [testItem, anotherTestItem, null, null, null]
      const runState: RunState = {
        ...createInitialRunState(),
        inventory: [...originalInventory]
      }
      
      // Test negative index
      removeItemFromInventory(runState, -1)
      expect(runState.inventory).toEqual(originalInventory)
      
      // Test out of bounds index
      removeItemFromInventory(runState, 10)
      expect(runState.inventory).toEqual(originalInventory)
    })

    it('should handle removing from already empty slot', () => {
      const runState: RunState = {
        ...createInitialRunState(),
        inventory: [testItem, null, testItem, null, null]
      }
      
      removeItemFromInventory(runState, 1)
      
      expect(runState.inventory[1]).toBeNull()
      // Other items should remain unchanged
      expect(runState.inventory[0]).toEqual(testItem)
      expect(runState.inventory[2]).toEqual(testItem)
    })
  })

  describe('createInitialRunState', () => {
    it('should create a valid initial run state', () => {
      const runState = createInitialRunState()
      
      expect(runState).toMatchObject({
        currentLevel: 1,
        maxLevel: 20,
        hp: 75,
        maxHp: 75,
        gold: 0,
        attack: 5,
        defense: 0,
        loot: 0,
        maxInventory: 4,
        upgrades: [],
        trophies: [],
        temporaryBuffs: {},
        // Spell system fields
        mana: 0,
        maxMana: 0,
        spells: [],
        spellEffects: []
      })
      
      expect(runState.inventory).toHaveLength(4)
      expect(runState.inventory.every(slot => slot === null)).toBe(true)
    })

    it('should create consistent state on multiple calls', () => {
      const state1 = createInitialRunState()
      const state2 = createInitialRunState()
      
      // Should be equivalent but not the same reference
      expect(state1).toEqual(state2)
      expect(state1).not.toBe(state2)
      expect(state1.inventory).not.toBe(state2.inventory)
    })
  })
})