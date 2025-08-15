/**
 * Tests for InventoryManager
 */

import { InventoryManager } from '../InventoryManager'
import { RunState, Board, TileContent } from '../types'

// Mock the gameLogic module
jest.mock('../gameLogic', () => ({
  removeItemFromInventory: jest.fn((run, index) => {
    const newInventory = [...run.inventory]
    newInventory.splice(index, 1)
    run.inventory = newInventory
  }),
  applyItemEffect: jest.fn(() => 'Generic item effect applied')
}))

describe('InventoryManager', () => {
  let manager: InventoryManager
  let mockRun: RunState
  let mockBoard: Board

  beforeEach(() => {
    manager = new InventoryManager()
    
    mockRun = {
      inventory: [],
      temporaryBuffs: {},
      upgrades: [],
      hp: 50,
      maxHp: 100,
      gold: 100
    } as RunState

    // Create 2D array for tiles as expected by getTileAt
    const tiles = []
    for (let y = 0; y < 5; y++) {
      tiles[y] = []
      for (let x = 0; x < 5; x++) {
        tiles[y][x] = {
          x,
          y,
          revealed: false,
          owner: 'neutral', // Start as neutral so tests can set specific owners
          content: TileContent.Empty
        }
      }
    }

    mockBoard = {
      width: 5,
      height: 5,
      tiles
    } as Board
  })

  describe('crystal ball usage', () => {
    it('should reveal a random player tile', () => {
      const item = { id: 'crystal-ball', name: 'Crystal Ball' }
      mockRun.inventory = [item]
      
      // Set up some unrevealed player tiles
      mockBoard.tiles[0][0].owner = 'player'
      mockBoard.tiles[0][0].revealed = false
      mockBoard.tiles[0][1].owner = 'player'
      mockBoard.tiles[0][1].revealed = false
      mockBoard.tiles[0][2].owner = 'opponent'
      mockBoard.tiles[0][2].revealed = false
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(true)
      expect(result.shouldRemoveItem).toBe(true)
      expect(result.boardUpdated).toBe(true)
      expect(result.message).toContain('Crystal Ball: Revealing player tile at')
    })

    it('should handle no unrevealed player tiles', () => {
      const item = { id: 'crystal-ball', name: 'Crystal Ball' }
      mockRun.inventory = [item]
      
      // Make all tiles revealed or non-player
      for (let y = 0; y < mockBoard.height; y++) {
        for (let x = 0; x < mockBoard.width; x++) {
          mockBoard.tiles[y][x].revealed = true
        }
      }
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(false)
      expect(result.shouldRemoveItem).toBe(true)
      expect(result.message).toBe('Crystal Ball: No unrevealed player tiles to reveal!')
    })
  })

  describe('tool mode activation', () => {
    it('should activate transmute mode', () => {
      const item = { id: 'transmute', name: 'Transmute' }
      mockRun.inventory = [item]
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(true)
      expect(result.shouldRemoveItem).toBe(false)
      expect(result.activatedMode).toBe('transmute')
      expect(result.itemIndex).toBe(0)
      expect(result.message).toContain('Transmute activated!')
    })

    it('should activate detector mode', () => {
      const item = { id: 'detector', name: 'Detector' }
      mockRun.inventory = [item]
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(true)
      expect(result.shouldRemoveItem).toBe(false)
      expect(result.activatedMode).toBe('detector')
      expect(result.itemIndex).toBe(0)
      expect(result.message).toContain('Detector activated!')
    })

    it('should activate key mode', () => {
      const item = { id: 'key', name: 'Key' }
      mockRun.inventory = [item]
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(true)
      expect(result.shouldRemoveItem).toBe(false)
      expect(result.activatedMode).toBe('key')
      expect(result.message).toContain('Key activated!')
    })

    it('should activate staff mode', () => {
      const item = { id: 'staff-of-fireballs', name: 'Staff of Fireballs' }
      mockRun.inventory = [item]
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(true)
      expect(result.shouldRemoveItem).toBe(false)
      expect(result.activatedMode).toBe('staff')
      expect(result.message).toContain('Staff of Fireballs activated!')
    })

    it('should activate ring mode', () => {
      const item = { id: 'ring-of-true-seeing', name: 'Ring of True Seeing' }
      mockRun.inventory = [item]
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(true)
      expect(result.shouldRemoveItem).toBe(false)
      expect(result.activatedMode).toBe('ring')
      expect(result.message).toContain('Ring targeting mode activated.')
    })
  })

  describe('buff items usage', () => {
    it('should apply ward buff', () => {
      const item = { id: 'ward', name: 'Ward' }
      mockRun.inventory = [item]
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(true)
      expect(result.shouldRemoveItem).toBe(true)
      expect(result.updatedRun.temporaryBuffs.ward).toBe(4)
      expect(result.updatedRun.upgrades).toContain('ward-temp')
      expect(result.message).toContain('Ward activated! +4 defense')
    })

    it('should stack ward buffs', () => {
      const item = { id: 'ward', name: 'Ward' }
      mockRun.inventory = [item]
      mockRun.temporaryBuffs.ward = 3
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.updatedRun.temporaryBuffs.ward).toBe(7)
      expect(result.message).toContain('total: +7')
    })

    it('should apply blaze buff', () => {
      const item = { id: 'blaze', name: 'Blaze' }
      mockRun.inventory = [item]
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(true)
      expect(result.shouldRemoveItem).toBe(true)
      expect(result.updatedRun.temporaryBuffs.blaze).toBe(5)
      expect(result.updatedRun.upgrades).toContain('blaze-temp')
      expect(result.message).toContain('Blaze activated! +5 attack')
    })

    it('should apply protection buff', () => {
      const item = { id: 'protection', name: 'Protection' }
      mockRun.inventory = [item]
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(true)
      expect(result.shouldRemoveItem).toBe(true)
      expect(result.updatedRun.temporaryBuffs.protection).toBe(1)
      expect(result.message).toContain('Protection activated!')
    })

    it('should handle clue usage', () => {
      const item = { id: 'clue', name: 'Clue' }
      mockRun.inventory = [item]
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(true)
      expect(result.shouldRemoveItem).toBe(true)
      expect(result.message).toBe('Clue used! You have gained an additional clue.')
    })
  })

  describe('whistle usage', () => {
    it('should redistribute monsters successfully', () => {
      const item = { id: 'whistle', name: 'Whistle' }
      mockRun.inventory = [item]
      
      // Set up monsters and empty tiles
      mockBoard.tiles[0][0].content = TileContent.Monster
      mockBoard.tiles[0][0].monsterData = { name: 'Rat', hp: 5 }
      mockBoard.tiles[0][0].revealed = false
      mockBoard.tiles[0][1].content = TileContent.Monster
      mockBoard.tiles[0][1].monsterData = { name: 'Orc', hp: 10 }
      mockBoard.tiles[0][1].revealed = false
      mockBoard.tiles[0][2].content = TileContent.Empty
      mockBoard.tiles[0][2].revealed = false
      mockBoard.tiles[0][3].content = TileContent.Empty
      mockBoard.tiles[0][3].revealed = false
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(true)
      expect(result.shouldRemoveItem).toBe(true)
      expect(result.boardUpdated).toBe(true)
      expect(result.message).toContain('Whistle: Redistributed 2 monsters')
    })

    it('should handle no monsters to redistribute', () => {
      const item = { id: 'whistle', name: 'Whistle' }
      mockRun.inventory = [item]
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(false)
      expect(result.shouldRemoveItem).toBe(true)
      expect(result.message).toBe('Whistle: No monsters found to redistribute!')
    })

    it('should handle no available tiles for monsters', () => {
      const item = { id: 'whistle', name: 'Whistle' }
      mockRun.inventory = [item]
      
      // Set up monsters but no empty tiles
      mockBoard.tiles[0][0].content = TileContent.Monster
      mockBoard.tiles[0][0].monsterData = { name: 'Rat', hp: 5 }
      mockBoard.tiles[0][0].revealed = false
      
      // Make all other tiles non-empty
      for (let y = 0; y < mockBoard.height; y++) {
        for (let x = 0; x < mockBoard.width; x++) {
          if (!(y === 0 && x === 0)) { // Skip the monster tile
            mockBoard.tiles[y][x].content = TileContent.PermanentUpgrade
            mockBoard.tiles[y][x].revealed = false
          }
        }
      }
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(false)
      expect(result.shouldRemoveItem).toBe(true)
      expect(result.message).toBe('Whistle: No available tiles to place monsters!')
    })
  })

  describe('generic item usage', () => {
    it('should handle generic items with applyItemEffect', () => {
      const item = { id: 'healing-potion', name: 'Healing Potion' }
      mockRun.inventory = [item]
      
      const result = manager.useItem(item, 0, mockRun, mockBoard)

      expect(result.success).toBe(true)
      expect(result.shouldRemoveItem).toBe(true)
      expect(result.message).toBe('Generic item effect applied')
    })
  })

  describe('inventory management', () => {
    it('should discard item successfully', () => {
      const item = { id: 'test-item', name: 'Test Item' }
      mockRun.inventory = [item]
      
      const result = manager.discardItem(mockRun, 0)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Discarded Test Item')
    })

    it('should handle invalid discard index', () => {
      const result = manager.discardItem(mockRun, 5)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid inventory index')
    })

    it('should check inventory space correctly', () => {
      expect(manager.hasInventorySpace(mockRun)).toBe(true)
      
      mockRun.inventory = [{ id: '1' }, { id: '2' }, { id: '3' }] as any
      expect(manager.hasInventorySpace(mockRun)).toBe(false)
      
      mockRun.upgrades = ['bag']
      expect(manager.hasInventorySpace(mockRun)).toBe(true)
    })

    it('should calculate inventory capacity correctly', () => {
      const capacity = manager.getInventoryCapacity(mockRun)
      expect(capacity).toEqual({ current: 0, max: 3 })
      
      mockRun.inventory = [{ id: '1' }, { id: '2' }] as any
      mockRun.upgrades = ['bag', 'bag']
      
      const newCapacity = manager.getInventoryCapacity(mockRun)
      expect(newCapacity).toEqual({ current: 2, max: 5 })
    })

    it('should validate item index correctly', () => {
      mockRun.inventory = [{ id: '1' }, { id: '2' }] as any
      
      expect(manager.isValidItemIndex(mockRun, 0)).toBe(true)
      expect(manager.isValidItemIndex(mockRun, 1)).toBe(true)
      expect(manager.isValidItemIndex(mockRun, 2)).toBe(false)
      expect(manager.isValidItemIndex(mockRun, -1)).toBe(false)
    })

    it('should get item by index correctly', () => {
      const item1 = { id: 'item1', name: 'Item 1' }
      const item2 = { id: 'item2', name: 'Item 2' }
      mockRun.inventory = [item1, item2] as any
      
      expect(manager.getItem(mockRun, 0)).toBe(item1)
      expect(manager.getItem(mockRun, 1)).toBe(item2)
      expect(manager.getItem(mockRun, 2)).toBeNull()
      expect(manager.getItem(mockRun, -1)).toBeNull()
    })
  })

  describe('multi-use items', () => {
    it('should identify multi-use items correctly', () => {
      const singleUseItem = { id: 'potion', name: 'Potion' }
      const multiUseItem = { 
        id: 'staff', 
        name: 'Staff',
        multiUse: { currentUses: 3, maxUses: 3 }
      }
      const depletedItem = {
        id: 'depleted',
        name: 'Depleted',
        multiUse: { currentUses: 0, maxUses: 5 }
      }
      
      expect(manager.isMultiUseItem(singleUseItem)).toBe(false)
      expect(manager.isMultiUseItem(multiUseItem)).toBe(true)
      expect(manager.isMultiUseItem(depletedItem)).toBe(false)
    })

    it('should update multi-use item charges correctly', () => {
      const multiUseItem = {
        id: 'staff',
        name: 'Staff',
        multiUse: { currentUses: 3, maxUses: 3 }
      }
      mockRun.inventory = [multiUseItem] as any
      
      const result1 = manager.updateMultiUseItem(mockRun, 0, 1)
      expect(result1.shouldRemove).toBe(false)
      expect(result1.updatedRun.inventory[0].multiUse.currentUses).toBe(2)
      
      const result2 = manager.updateMultiUseItem(result1.updatedRun, 0, 2)
      expect(result2.shouldRemove).toBe(true)
    })

    it('should handle non-multi-use items in update', () => {
      const singleUseItem = { id: 'potion', name: 'Potion' }
      mockRun.inventory = [singleUseItem] as any
      
      const result = manager.updateMultiUseItem(mockRun, 0, 1)
      expect(result.shouldRemove).toBe(false)
      expect(result.updatedRun).toEqual(mockRun)
      expect(result.updatedRun).not.toBe(mockRun) // Should be a new object
    })
  })

  describe('inventory summary', () => {
    it('should generate inventory summary correctly', () => {
      const items = [
        { id: 'potion', name: 'Healing Potion', icon: '🧪' },
        { 
          id: 'staff', 
          name: 'Fire Staff', 
          icon: '🔥',
          multiUse: { currentUses: 2, maxUses: 5 }
        }
      ]
      mockRun.inventory = items as any
      mockRun.upgrades = ['bag']
      
      const summary = manager.getInventorySummary(mockRun)
      
      expect(summary.items).toEqual([
        { name: 'Healing Potion', icon: '🧪', usesRemaining: undefined },
        { name: 'Fire Staff', icon: '🔥', usesRemaining: '2/5' }
      ])
      expect(summary.capacity).toBe('2/4')
      expect(summary.hasSpace).toBe(true)
    })

    it('should handle empty inventory', () => {
      const summary = manager.getInventorySummary(mockRun)
      
      expect(summary.items).toEqual([])
      expect(summary.capacity).toBe('0/3')
      expect(summary.hasSpace).toBe(true)
    })
  })

  describe('monster redistribution edge cases', () => {
    it('should handle partial redistribution when not enough empty tiles', () => {
      // Set up 3 monsters but only 2 empty tiles
      mockBoard.tiles[0][0].content = TileContent.Monster
      mockBoard.tiles[0][0].monsterData = { name: 'Monster1' }
      mockBoard.tiles[0][0].revealed = false
      mockBoard.tiles[0][1].content = TileContent.Monster
      mockBoard.tiles[0][1].monsterData = { name: 'Monster2' }
      mockBoard.tiles[0][1].revealed = false
      mockBoard.tiles[0][2].content = TileContent.Monster
      mockBoard.tiles[0][2].monsterData = { name: 'Monster3' }
      mockBoard.tiles[0][2].revealed = false
      
      // Only 2 empty tiles available
      mockBoard.tiles[0][3].content = TileContent.Empty
      mockBoard.tiles[0][3].revealed = false
      mockBoard.tiles[0][4].content = TileContent.Empty
      mockBoard.tiles[0][4].revealed = false
      
      // All other tiles are non-empty
      for (let y = 1; y < mockBoard.height; y++) {
        for (let x = 0; x < mockBoard.width; x++) {
          mockBoard.tiles[y][x].content = TileContent.PermanentUpgrade
          mockBoard.tiles[y][x].revealed = false
        }
      }
      
      const result = manager.redistributeMonsters(mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.redistributedCount).toBe(3) // All monsters were processed
      expect(result.message).toContain('Redistributed 3 monsters')
    })

    it('should handle revealed tiles correctly', () => {
      mockBoard.tiles[0][0].content = TileContent.Monster
      mockBoard.tiles[0][0].monsterData = { name: 'RevealedMonster' }
      mockBoard.tiles[0][0].revealed = true // This monster should not be redistributed
      
      mockBoard.tiles[0][1].content = TileContent.Monster
      mockBoard.tiles[0][1].monsterData = { name: 'UnrevealedMonster' }
      mockBoard.tiles[0][1].revealed = false // This one should be redistributed
      
      mockBoard.tiles[0][2].content = TileContent.Empty
      mockBoard.tiles[0][2].revealed = false
      
      const result = manager.redistributeMonsters(mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.redistributedCount).toBe(1) // Only unrevealed monster
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle null/undefined items gracefully', () => {
      mockRun.inventory = [null as any]
      
      const result = manager.useItem(null as any, 0, mockRun, mockBoard)
      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid item')
    })

    it('should handle empty inventory operations', () => {
      expect(manager.getItem(mockRun, 0)).toBeNull()
      expect(manager.isValidItemIndex(mockRun, 0)).toBe(false)
      
      const summary = manager.getInventorySummary(mockRun)
      expect(summary.items).toEqual([])
    })

    it('should handle board with no tiles', () => {
      const emptyBoard = { ...mockBoard, tiles: [] }
      const item = { id: 'crystal-ball', name: 'Crystal Ball' }
      
      const result = manager.useItem(item, 0, mockRun, emptyBoard)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('Crystal Ball: No valid board to reveal tiles on!')
    })
  })
})