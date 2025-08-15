/**
 * Tests for InventoryManager
 */

import { InventoryManager, InventoryContext } from '../InventoryManager'

describe('InventoryManager', () => {
  let manager: InventoryManager
  let mockContext: InventoryContext
  
  beforeEach(() => {
    manager = new InventoryManager()
    mockContext = {
      run: {
        inventory: [null, null, null],
        temporaryBuffs: {},
        upgrades: []
      },
      board: {
        height: 3,
        width: 3,
        tiles: Array(3).fill(null).map(() => 
          Array(3).fill(null).map(() => ({
            owner: 'player',
            revealed: false,
            content: 'empty'
          }))
        )
      },
      triggerTransmuteMode: jest.fn(),
      triggerDetectorMode: jest.fn(),
      triggerKeyMode: jest.fn(),
      triggerStaffMode: jest.fn(),
      triggerRingMode: jest.fn(),
      updateState: jest.fn()
    }
  })
  
  describe('useInventoryItem', () => {
    describe('empty slots', () => {
      it('should handle empty inventory slots', () => {
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(false)
        expect(result.message).toBe('No item in this slot')
      })
    })
    
    describe('tool items', () => {
      it('should handle transmute item', () => {
        mockContext.run.inventory[0] = { id: 'transmute', name: 'Transmute' }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.message).toContain('Transmute activated')
        expect(mockContext.triggerTransmuteMode).toHaveBeenCalledWith(0)
      })
      
      it('should handle detector item', () => {
        mockContext.run.inventory[0] = { id: 'detector', name: 'Detector' }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.message).toContain('Detector activated')
        expect(mockContext.triggerDetectorMode).toHaveBeenCalledWith(0)
      })
      
      it('should handle key item', () => {
        mockContext.run.inventory[0] = { id: 'key', name: 'Key' }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.message).toContain('Key activated')
        expect(mockContext.triggerKeyMode).toHaveBeenCalledWith(0)
      })
      
      it('should handle staff item', () => {
        mockContext.run.inventory[0] = { id: 'staff-of-fireballs', name: 'Staff of Fireballs' }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.message).toContain('Staff of Fireballs activated')
        expect(mockContext.triggerStaffMode).toHaveBeenCalledWith(0)
      })
      
      it('should handle ring item', () => {
        mockContext.run.inventory[0] = { id: 'ring-of-true-seeing', name: 'Ring of True Seeing' }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.message).toContain('Ring targeting mode')
        expect(mockContext.triggerRingMode).toHaveBeenCalledWith(0)
      })
    })
    
    describe('crystal ball', () => {
      it('should reveal random player tile when crystal ball used', () => {
        mockContext.run.inventory[0] = { id: 'crystal-ball', name: 'Crystal Ball' }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.shouldUpdateState).toBe(true)
        expect(result.shouldRemoveItem).toBe(false) // Already removed
        expect(result.message).toContain('Crystal Ball: Revealing player tile')
        expect(result.stateUpdates.crystalBallTarget).toBeDefined()
      })
      
      it('should handle crystal ball when no player tiles available', () => {
        mockContext.run.inventory[0] = { id: 'crystal-ball', name: 'Crystal Ball' }
        
        // Make all tiles revealed
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 3; x++) {
            mockContext.board.tiles[y][x].revealed = true
          }
        }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.message).toContain('No unrevealed player tiles')
      })
    })
    
    describe('consumable items', () => {
      it('should handle ward item', () => {
        mockContext.run.inventory[0] = { id: 'ward', name: 'Ward' }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.shouldUpdateState).toBe(true)
        expect(result.shouldRemoveItem).toBe(true)
        expect(result.message).toContain('Ward activated')
        expect(mockContext.run.temporaryBuffs.ward).toBe(4)
        expect(mockContext.run.upgrades).toContain('ward-temp')
      })
      
      it('should stack ward bonuses', () => {
        mockContext.run.inventory[0] = { id: 'ward', name: 'Ward' }
        mockContext.run.temporaryBuffs.ward = 2
        mockContext.run.upgrades = ['ward-temp']
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(mockContext.run.temporaryBuffs.ward).toBe(6) // 2 + 4
        expect(result.message).toContain('total: +6')
      })
      
      it('should handle blaze item', () => {
        mockContext.run.inventory[0] = { id: 'blaze', name: 'Blaze' }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.shouldUpdateState).toBe(true)
        expect(result.shouldRemoveItem).toBe(true)
        expect(result.message).toContain('Blaze activated')
        expect(mockContext.run.temporaryBuffs.blaze).toBe(5)
        expect(mockContext.run.upgrades).toContain('blaze-temp')
      })
      
      it('should handle protection item', () => {
        mockContext.run.inventory[0] = { id: 'protection', name: 'Protection' }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.shouldUpdateState).toBe(true)
        expect(result.shouldRemoveItem).toBe(true)
        expect(result.message).toContain('Protection activated')
        expect(mockContext.run.temporaryBuffs.protection).toBe(1)
      })
      
      it('should handle clue item', () => {
        mockContext.run.inventory[0] = { id: 'clue', name: 'Clue' }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.shouldUpdateState).toBe(true)
        expect(result.shouldRemoveItem).toBe(true)
        expect(result.message).toContain('Clue used')
        expect(result.stateUpdates.additionalClue).toBeDefined()
      })
      
      it('should handle generic items', () => {
        mockContext.run.inventory[0] = { id: 'some-item', name: 'Some Item' }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.shouldUpdateState).toBe(true)
        expect(result.shouldRemoveItem).toBe(true)
      })
    })
    
    describe('whistle item', () => {
      beforeEach(() => {
        mockContext.run.inventory[0] = { id: 'whistle', name: 'Whistle' }
      })
      
      it('should redistribute monsters to new locations', () => {
        // Place monsters on board
        mockContext.board.tiles[0][0].content = 'monster'
        mockContext.board.tiles[0][0].monsterData = { name: 'Rat', hp: 5 }
        mockContext.board.tiles[1][1].content = 'monster'
        mockContext.board.tiles[1][1].monsterData = { name: 'Goblin', hp: 8 }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.shouldUpdateState).toBe(true)
        expect(result.shouldRemoveItem).toBe(true)
        expect(result.message).toContain('Redistributed 2 monsters')
        
        // Original locations should be empty
        expect(mockContext.board.tiles[0][0].content).toBe('empty')
        expect(mockContext.board.tiles[1][1].content).toBe('empty')
        
        // Count monsters on board
        let monsterCount = 0
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 3; x++) {
            if (mockContext.board.tiles[y][x].content === 'monster') {
              monsterCount++
            }
          }
        }
        expect(monsterCount).toBe(2)
      })
      
      it('should handle whistle when no monsters exist', () => {
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.message).toContain('No monsters found')
      })
      
      it('should handle whistle when no empty tiles available', () => {
        // Place a monster
        mockContext.board.tiles[0][0].content = 'monster'
        mockContext.board.tiles[0][0].monsterData = { name: 'Rat', hp: 5 }
        
        // Make ALL tiles either revealed or non-empty
        for (let y = 0; y < 3; y++) {
          for (let x = 0; x < 3; x++) {
            if (y === 0 && x === 0) {
              // Keep the monster
              continue
            }
            // Make all other tiles unusable (revealed or non-empty)
            mockContext.board.tiles[y][x].revealed = true
            mockContext.board.tiles[y][x].content = 'item' // Double ensure they can't hold monsters
          }
        }
        
        const result = manager.useInventoryItem(0, mockContext)
        
        expect(result.success).toBe(true)
        expect(result.message).toContain('No available tiles')
      })
    })
  })
  
  describe('discardItem', () => {
    it('should discard item successfully', () => {
      const run = {
        inventory: [{ id: 'sword', name: 'Sword' }, null, null]
      }
      
      const result = manager.discardItem(0, run)
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('Discarded Sword')
      expect(result.newRun.inventory[0]).toBe(null)
    })
    
    it('should handle discarding from empty slot', () => {
      const run = {
        inventory: [null, null, null]
      }
      
      const result = manager.discardItem(0, run)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('No item in this slot')
    })
  })
  
  describe('canUseItem', () => {
    it('should allow using valid items', () => {
      const run = {
        inventory: [{ id: 'sword', name: 'Sword' }, null, null]
      }
      
      const result = manager.canUseItem(0, run)
      
      expect(result.canUse).toBe(true)
    })
    
    it('should not allow using empty slots', () => {
      const run = {
        inventory: [null, null, null]
      }
      
      const result = manager.canUseItem(0, run)
      
      expect(result.canUse).toBe(false)
      expect(result.reason).toBe('No item in this slot')
    })
  })
  
  describe('getItemUsageDescription', () => {
    it('should return specific descriptions for known items', () => {
      const wardItem = { id: 'ward', name: 'Ward' }
      const blazeItem = { id: 'blaze', name: 'Blaze' }
      const unknownItem = { id: 'unknown', name: 'Unknown', description: 'Does something' }
      
      expect(manager.getItemUsageDescription(wardItem)).toContain('defense')
      expect(manager.getItemUsageDescription(blazeItem)).toContain('attack')
      expect(manager.getItemUsageDescription(unknownItem)).toBe('Does something')
    })
    
    it('should return fallback for items without known descriptions', () => {
      const unknownItem = { id: 'unknown', name: 'Unknown' }
      
      expect(manager.getItemUsageDescription(unknownItem)).toBe('Use this item')
    })
  })
})