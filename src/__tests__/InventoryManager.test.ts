/**
 * InventoryManager Tests
 */

import { InventoryManager } from '../InventoryManager'
import { RunState, ItemData } from '../types'

describe('InventoryManager', () => {
  let manager: InventoryManager
  let mockRun: RunState

  beforeEach(() => {
    manager = new InventoryManager()
    mockRun = {
      currentLevel: 1,
      gold: 50,
      upgrades: [],
      hp: 10,
      maxHp: 10,
      inventory: [
        { id: 'crystal-ball', name: 'Crystal Ball', description: 'Reveals tiles' } as ItemData,
        { id: 'clue', name: 'Clue', description: 'Generates clue' } as ItemData,
        null
      ],
      trophies: [],
      character: {
        id: 'fighter',
        name: 'Fighter',
        description: 'A brave warrior',
        startingHp: 10,
        startingItems: [],
        startingUpgrades: []
      }
    }
  })

  describe('useInventoryItem', () => {
    const mockApplyItemEffect = jest.fn((run: RunState, item: ItemData) => {
      if (item.id === 'first-aid') {
        run.hp += 10
        return 'Healed 10 HP'
      }
      return `Used ${item.name}`
    })

    const mockRemoveFromInventory = jest.fn((run: RunState, index: number) => {
      run.inventory[index] = null
    })

    const mockGenerateClue = jest.fn()
    const mockUseCrystalBall = jest.fn()
    const mockUseWhistle = jest.fn()

    beforeEach(() => {
      mockApplyItemEffect.mockClear()
      mockRemoveFromInventory.mockClear()
      mockGenerateClue.mockClear()
      mockUseCrystalBall.mockClear()
      mockUseWhistle.mockClear()
    })

    it('should use crystal ball and indicate tile reveal needed', async () => {
      const result = await manager.useInventoryItem(
        mockRun,
        0, // Crystal ball
        mockApplyItemEffect,
        mockRemoveFromInventory,
        mockGenerateClue,
        mockUseCrystalBall,
        mockUseWhistle
      )

      expect(result.success).toBe(true)
      expect(result.shouldRevealTile).toBe(true)
      expect(result.message).toContain('Crystal Ball used')
      expect(mockRemoveFromInventory).toHaveBeenCalledWith(expect.any(Object), 0)
      expect(mockUseCrystalBall).toHaveBeenCalled()
    })

    it('should use clue item and trigger clue generation', async () => {
      const result = await manager.useInventoryItem(
        mockRun,
        1, // Clue
        mockApplyItemEffect,
        mockRemoveFromInventory,
        mockGenerateClue,
        mockUseCrystalBall,
        mockUseWhistle
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('gained an additional clue')
      expect(mockGenerateClue).toHaveBeenCalled()
      expect(mockRemoveFromInventory).toHaveBeenCalledWith(expect.any(Object), 1)
    })

    it('should use generic items through effect system', async () => {
      const healingItem = { id: 'first-aid', name: 'First Aid', description: 'Heals HP' } as ItemData
      const runWithHealing = {
        ...mockRun,
        inventory: [healingItem, null, null]
      }

      const result = await manager.useInventoryItem(
        runWithHealing,
        0,
        mockApplyItemEffect,
        mockRemoveFromInventory,
        mockGenerateClue,
        mockUseCrystalBall,
        mockUseWhistle
      )

      expect(result.success).toBe(true)
      expect(mockApplyItemEffect).toHaveBeenCalledWith(expect.any(Object), healingItem)
      expect(result.message).toBe('Healed 10 HP')
    })

    it('should fail when using empty inventory slot', async () => {
      const result = await manager.useInventoryItem(
        mockRun,
        2, // Empty slot
        mockApplyItemEffect,
        mockRemoveFromInventory,
        mockGenerateClue,
        mockUseCrystalBall,
        mockUseWhistle
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('No item in that slot')
      expect(mockApplyItemEffect).not.toHaveBeenCalled()
    })

    it('should fail when using invalid inventory index', async () => {
      const result = await manager.useInventoryItem(
        mockRun,
        99, // Invalid index
        mockApplyItemEffect,
        mockRemoveFromInventory,
        mockGenerateClue,
        mockUseCrystalBall,
        mockUseWhistle
      )

      expect(result.success).toBe(false)
      expect(mockRemoveFromInventory).not.toHaveBeenCalled()
    })

    it('should use ward item and apply defense buff', async () => {
      const wardItem = { id: 'ward', name: 'Ward', description: 'Defense buff' } as ItemData
      const runWithWard = {
        ...mockRun,
        inventory: [wardItem, null, null],
        temporaryBuffs: {}
      }

      const result = await manager.useInventoryItem(
        runWithWard,
        0,
        mockApplyItemEffect,
        mockRemoveFromInventory,
        mockGenerateClue,
        mockUseCrystalBall,
        mockUseWhistle
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('Ward activated! +4 defense')
      expect(result.newRun.temporaryBuffs?.ward).toBe(4)
      expect(result.newRun.upgrades).toContain('ward-temp')
      expect(mockRemoveFromInventory).toHaveBeenCalledWith(expect.any(Object), 0)
    })

    it('should use blaze item and apply attack buff', async () => {
      const blazeItem = { id: 'blaze', name: 'Blaze', description: 'Attack buff' } as ItemData
      const runWithBlaze = {
        ...mockRun,
        inventory: [blazeItem, null, null],
        temporaryBuffs: {}
      }

      const result = await manager.useInventoryItem(
        runWithBlaze,
        0,
        mockApplyItemEffect,
        mockRemoveFromInventory,
        mockGenerateClue,
        mockUseCrystalBall,
        mockUseWhistle
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('Blaze activated! +6 attack')
      expect(result.newRun.temporaryBuffs?.blaze).toBe(6)
      expect(result.newRun.upgrades).toContain('blaze-temp')
      expect(mockRemoveFromInventory).toHaveBeenCalledWith(expect.any(Object), 0)
    })

    it('should use protection item and add protection charges', async () => {
      const protectionItem = { id: 'protection', name: 'Protection', description: 'Protection' } as ItemData
      const runWithProtection = {
        ...mockRun,
        inventory: [protectionItem, null, null],
        temporaryBuffs: {}
      }

      const result = await manager.useInventoryItem(
        runWithProtection,
        0,
        mockApplyItemEffect,
        mockRemoveFromInventory,
        mockGenerateClue,
        mockUseCrystalBall,
        mockUseWhistle
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('Protection activated!')
      expect(result.newRun.temporaryBuffs?.protection).toBe(1)
      expect(mockRemoveFromInventory).toHaveBeenCalledWith(expect.any(Object), 0)
    })

    it('should use whistle item and trigger whistle callback', async () => {
      const whistleItem = { id: 'whistle', name: 'Whistle', description: 'Redistributes monsters' } as ItemData
      const runWithWhistle = {
        ...mockRun,
        inventory: [whistleItem, null, null]
      }

      const result = await manager.useInventoryItem(
        runWithWhistle,
        0,
        mockApplyItemEffect,
        mockRemoveFromInventory,
        mockGenerateClue,
        mockUseCrystalBall,
        mockUseWhistle
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('Whistle used - redistributing monsters')
      expect(mockUseWhistle).toHaveBeenCalled()
      expect(mockRemoveFromInventory).toHaveBeenCalledWith(expect.any(Object), 0)
    })

    it('should return behavior trigger for transmute item', async () => {
      const transmuteItem = { id: 'transmute', name: 'Transmute', description: 'Special item' } as ItemData
      const runWithTransmute = {
        ...mockRun,
        inventory: [transmuteItem, null, null]
      }

      const result = await manager.useInventoryItem(
        runWithTransmute,
        0,
        mockApplyItemEffect,
        mockRemoveFromInventory,
        mockGenerateClue,
        mockUseCrystalBall,
        mockUseWhistle
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('Transmute mode activated')
      expect(result.triggerBehavior).toEqual({
        type: 'transmute',
        itemIndex: 0,
        consumeItem: false
      })
      expect(mockRemoveFromInventory).not.toHaveBeenCalled()
    })

    it('should return behavior trigger for detector item', async () => {
      const detectorItem = { id: 'detector', name: 'Detector', description: 'Special item' } as ItemData
      const runWithDetector = {
        ...mockRun,
        inventory: [detectorItem, null, null]
      }

      const result = await manager.useInventoryItem(
        runWithDetector,
        0,
        mockApplyItemEffect,
        mockRemoveFromInventory,
        mockGenerateClue,
        mockUseCrystalBall,
        mockUseWhistle
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('Detector mode activated')
      expect(result.triggerBehavior).toEqual({
        type: 'detector',
        itemIndex: 0,
        consumeItem: false
      })
    })

    it('should return behavior trigger for staff item', async () => {
      const staffItem = { id: 'staff-of-fireballs', name: 'Staff', description: 'Special item' } as ItemData
      const runWithStaff = {
        ...mockRun,
        inventory: [staffItem, null, null]
      }

      const result = await manager.useInventoryItem(
        runWithStaff,
        0,
        mockApplyItemEffect,
        mockRemoveFromInventory,
        mockGenerateClue,
        mockUseCrystalBall,
        mockUseWhistle
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('Staff of Fireballs ready to use')
      expect(result.triggerBehavior).toEqual({
        type: 'staff',
        itemIndex: 0,
        consumeItem: false
      })
      expect(mockRemoveFromInventory).not.toHaveBeenCalled()
    })
  })

  describe('discardInventoryItem', () => {
    const mockRemoveFromInventory = jest.fn((run: RunState, index: number) => {
      run.inventory[index] = null
    })

    beforeEach(() => {
      mockRemoveFromInventory.mockClear()
    })

    it('should successfully discard item', () => {
      const result = manager.discardInventoryItem(
        mockRun,
        0, // Crystal ball
        mockRemoveFromInventory
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('Discarded Crystal Ball')
      expect(mockRemoveFromInventory).toHaveBeenCalledWith(expect.any(Object), 0)
    })

    it('should fail when trying to discard from empty slot', () => {
      const result = manager.discardInventoryItem(
        mockRun,
        2, // Empty slot
        mockRemoveFromInventory
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('No item to discard')
      expect(mockRemoveFromInventory).not.toHaveBeenCalled()
    })
  })

  describe('useMultiUseItem', () => {
    it('should use staff of fireballs with damage', () => {
      const staff = {
        id: 'staff-of-fireballs',
        name: 'Staff of Fireballs',
        description: 'Deals damage',
        multiUse: { maxUses: 3, currentUses: 3 }
      } as ItemData

      const runWithStaff = {
        ...mockRun,
        inventory: [staff, null, null]
      }

      const result = manager.useMultiUseItem(runWithStaff, 0, 6)

      expect(result.success).toBe(true)
      expect(result.message).toContain('Staff deals 6 damage')
      expect(result.message).toContain('2 uses remaining')
      expect(result.newRun.inventory[0]?.multiUse?.currentUses).toBe(2)
    })

    it('should remove staff when depleted', () => {
      const staff = {
        id: 'staff-of-fireballs',
        name: 'Staff of Fireballs',
        description: 'Deals damage',
        multiUse: { maxUses: 3, currentUses: 1 }
      } as ItemData

      const runWithStaff = {
        ...mockRun,
        inventory: [staff, null, null]
      }

      const result = manager.useMultiUseItem(runWithStaff, 0, 6)

      expect(result.success).toBe(true)
      expect(result.newRun.inventory[0]).toBe(null)
    })

    it('should use ring of true seeing', () => {
      const ring = {
        id: 'ring-of-true-seeing',
        name: 'Ring of True Seeing',
        description: 'Reveals contents',
        multiUse: { maxUses: 6, currentUses: 4 }
      } as ItemData

      const runWithRing = {
        ...mockRun,
        inventory: [ring, null, null]
      }

      const result = manager.useMultiUseItem(runWithRing, 0)

      expect(result.success).toBe(true)
      expect(result.message).toContain('Ring reveals tile contents')
      expect(result.message).toContain('3 uses remaining')
      expect(result.newRun.inventory[0]?.multiUse?.currentUses).toBe(3)
    })

    it('should fail with non-multi-use item', () => {
      const result = manager.useMultiUseItem(mockRun, 0) // Crystal ball is not multi-use

      expect(result.success).toBe(false)
      expect(result.message).toContain('not a multi-use item')
    })

    it('should fail when staff used without damage parameter', () => {
      const staff = {
        id: 'staff-of-fireballs',
        name: 'Staff of Fireballs',
        description: 'Deals damage',
        multiUse: { maxUses: 3, currentUses: 3 }
      } as ItemData

      const runWithStaff = {
        ...mockRun,
        inventory: [staff, null, null]
      }

      const result = manager.useMultiUseItem(runWithStaff, 0) // No damage parameter

      expect(result.success).toBe(false)
      expect(result.message).toContain('Staff requires damage amount')
    })
  })

  describe('canUseItem', () => {
    it('should allow staff only in combat', () => {
      const staff = { id: 'staff-of-fireballs', name: 'Staff' } as ItemData
      
      expect(manager.canUseItem(staff, 'combat')).toBe(true)
      expect(manager.canUseItem(staff, 'normal')).toBe(false)
      expect(manager.canUseItem(staff, 'shop')).toBe(false)
    })

    it('should allow ward in combat or normal contexts', () => {
      const ward = { id: 'ward', name: 'Ward' } as ItemData
      
      expect(manager.canUseItem(ward, 'combat')).toBe(true)
      expect(manager.canUseItem(ward, 'normal')).toBe(true)
      expect(manager.canUseItem(ward, 'shop')).toBe(false)
    })

    it('should allow generic items in any context', () => {
      const crystal = { id: 'crystal-ball', name: 'Crystal Ball' } as ItemData
      
      expect(manager.canUseItem(crystal, 'combat')).toBe(true)
      expect(manager.canUseItem(crystal, 'normal')).toBe(true)
      expect(manager.canUseItem(crystal, 'shop')).toBe(true)
    })
  })

  describe('getItemUsageInfo', () => {
    it('should return specific info for crystal ball', () => {
      const crystal = { id: 'crystal-ball', name: 'Crystal Ball' } as ItemData
      const info = manager.getItemUsageInfo(crystal)
      
      expect(info).toContain('Reveals a random unrevealed player tile')
    })

    it('should return info with remaining uses for multi-use items', () => {
      const staff = {
        id: 'staff-of-fireballs',
        name: 'Staff',
        multiUse: { maxUses: 3, currentUses: 2 }
      } as ItemData
      
      const info = manager.getItemUsageInfo(staff)
      expect(info).toContain('2 uses remaining')
    })

    it('should return description for unknown items', () => {
      const unknownItem = {
        id: 'mystery-item',
        name: 'Mystery',
        description: 'Does mysterious things'
      } as ItemData
      
      const info = manager.getItemUsageInfo(unknownItem)
      expect(info).toBe('Does mysterious things')
    })

    it('should return fallback for items without description', () => {
      const unknownItem = { id: 'mystery-item', name: 'Mystery' } as ItemData
      
      const info = manager.getItemUsageInfo(unknownItem)
      expect(info).toBe('Use this item')
    })

    it('should return info for behavior-triggering items', () => {
      const transmuteItem = { id: 'transmute', name: 'Transmute' } as ItemData
      const detectorItem = { id: 'detector', name: 'Detector' } as ItemData
      
      expect(manager.getItemUsageInfo(transmuteItem)).toContain('Turn any unrevealed tile')
      expect(manager.getItemUsageInfo(detectorItem)).toContain('see how many adjacent tiles')
    })
  })

  describe('triggerBehavior', () => {
    it('should trigger transmute behavior from external source', () => {
      const result = manager.triggerBehavior('transmute', 'wizard spell')
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('transmute activated by wizard spell')
      expect(result.triggerBehavior).toEqual({
        type: 'transmute',
        itemIndex: -1,
        consumeItem: false
      })
    })

    it('should trigger detector behavior from external source', () => {
      const result = manager.triggerBehavior('detector', 'upgrade bonus')
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('detector activated by upgrade bonus')
      expect(result.triggerBehavior).toEqual({
        type: 'detector',
        itemIndex: -1,
        consumeItem: false
      })
    })

    it('should use default source when none provided', () => {
      const result = manager.triggerBehavior('key')
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('key activated by unknown')
    })

    it('should trigger behavior with parameters', () => {
      const result = manager.triggerBehavior('staff', 'wizard spell', { 
        target: { x: 5, y: 3 }, 
        damage: 8 
      })
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('staff activated by wizard spell')
      expect(result.triggerBehavior?.parameters).toEqual({
        target: { x: 5, y: 3 },
        damage: 8
      })
    })
  })

  describe('useStaffAt', () => {
    it('should use staff at target location and consume charge', () => {
      const staff = {
        id: 'staff-of-fireballs',
        name: 'Staff of Fireballs',
        description: 'Deals damage',
        multiUse: { maxUses: 3, currentUses: 3 }
      } as ItemData

      const runWithStaff = {
        ...mockRun,
        inventory: [staff, null, null]
      }

      const result = manager.useStaffAt(runWithStaff, 0, { x: 5, y: 7 }, 6)

      expect(result.success).toBe(true)
      expect(result.message).toContain('Staff deals 6 damage at (5, 7)')
      expect(result.message).toContain('2 uses remaining')
      expect(result.newRun.inventory[0]?.multiUse?.currentUses).toBe(2)
      expect(result.triggerBehavior).toEqual({
        type: 'staff',
        itemIndex: 0,
        consumeItem: false,
        parameters: { target: { x: 5, y: 7 }, damage: 6 }
      })
    })

    it('should remove staff when depleted', () => {
      const staff = {
        id: 'staff-of-fireballs',
        name: 'Staff of Fireballs',
        description: 'Deals damage',
        multiUse: { maxUses: 3, currentUses: 1 }
      } as ItemData

      const runWithStaff = {
        ...mockRun,
        inventory: [staff, null, null]
      }

      const result = manager.useStaffAt(runWithStaff, 0, { x: 2, y: 3 }, 6)

      expect(result.success).toBe(true)
      expect(result.newRun.inventory[0]).toBe(null)
      expect(result.triggerBehavior?.consumeItem).toBe(true)
    })

    it('should fail with invalid staff item', () => {
      const result = manager.useStaffAt(mockRun, 0, { x: 1, y: 1 }, 6) // Crystal ball, not staff

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid staff item')
    })

    it('should use default damage if not specified', () => {
      const staff = {
        id: 'staff-of-fireballs',
        name: 'Staff of Fireballs',
        description: 'Deals damage',
        multiUse: { maxUses: 3, currentUses: 2 }
      } as ItemData

      const runWithStaff = {
        ...mockRun,
        inventory: [staff, null, null]
      }

      const result = manager.useStaffAt(runWithStaff, 0, { x: 1, y: 1 }) // No damage parameter

      expect(result.success).toBe(true)
      expect(result.triggerBehavior?.parameters?.damage).toBe(6)
    })
  })

  describe('useRingAt', () => {
    it('should use ring at target location and consume charge', () => {
      const ring = {
        id: 'ring-of-true-seeing',
        name: 'Ring of True Seeing',
        description: 'Reveals contents',
        multiUse: { maxUses: 6, currentUses: 4 }
      } as ItemData

      const runWithRing = {
        ...mockRun,
        inventory: [ring, null, null]
      }

      const result = manager.useRingAt(runWithRing, 0, { x: 3, y: 4 })

      expect(result.success).toBe(true)
      expect(result.message).toContain('Ring reveals tile at (3, 4)')
      expect(result.message).toContain('3 uses remaining')
      expect(result.newRun.inventory[0]?.multiUse?.currentUses).toBe(3)
      expect(result.triggerBehavior).toEqual({
        type: 'ring',
        itemIndex: 0,
        consumeItem: false,
        parameters: { target: { x: 3, y: 4 } }
      })
    })

    it('should remove ring when depleted', () => {
      const ring = {
        id: 'ring-of-true-seeing',
        name: 'Ring of True Seeing',
        description: 'Reveals contents',
        multiUse: { maxUses: 6, currentUses: 1 }
      } as ItemData

      const runWithRing = {
        ...mockRun,
        inventory: [ring, null, null]
      }

      const result = manager.useRingAt(runWithRing, 0, { x: 1, y: 2 })

      expect(result.success).toBe(true)
      expect(result.newRun.inventory[0]).toBe(null)
      expect(result.triggerBehavior?.consumeItem).toBe(true)
    })

    it('should fail with invalid ring item', () => {
      const result = manager.useRingAt(mockRun, 1, { x: 1, y: 1 }) // Clue, not ring

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid ring item')
    })
  })

  describe('Tourist Transmute auto-discard', () => {
    const mockRemoveFromInventory = jest.fn((run: RunState, index: number) => {
      run.inventory[index] = null
    })

    beforeEach(() => {
      mockRemoveFromInventory.mockClear()
    })

    it('should auto-discard Transmute item for Tourist character', async () => {
      const transmuteItem = {
        id: 'transmute',
        name: 'Transmute',
        description: 'Turn tiles into yours'
      } as ItemData

      const touristRun = {
        ...mockRun,
        character: {
          id: 'tourist',
          name: 'Tourist',
          description: 'A traveler',
          startingHp: 10,
          startingItems: [],
          startingUpgrades: []
        },
        inventory: [transmuteItem, null, null]
      }

      const result = await manager.useInventoryItem(
        touristRun,
        0, // Transmute at index 0
        () => 'No effect', // mockApplyItemEffect
        mockRemoveFromInventory, // mockRemoveFromInventory
        undefined, // generateClueCallback
        undefined, // useCrystalBallCallback
        undefined  // useWhistleCallback
      )

      expect(result.success).toBe(true)
      expect(result.message).toBe('Tourist cannot use Transmute! Item discarded automatically.')
      expect(mockRemoveFromInventory).toHaveBeenCalledWith(touristRun, 0)
      expect(result.triggerBehavior).toBeUndefined() // No transmute mode should be triggered
    })

    it('should allow Transmute for non-Tourist characters', async () => {
      const transmuteItem = {
        id: 'transmute',
        name: 'Transmute',
        description: 'Turn tiles into yours'
      } as ItemData

      const fighterRun = {
        ...mockRun,
        character: {
          id: 'fighter',
          name: 'Fighter',
          description: 'A warrior',
          startingHp: 10,
          startingItems: [],
          startingUpgrades: []
        },
        inventory: [transmuteItem, null, null]
      }

      const result = await manager.useInventoryItem(
        fighterRun,
        0, // Transmute at index 0
        () => 'No effect', // mockApplyItemEffect
        mockRemoveFromInventory, // mockRemoveFromInventory
        undefined, // generateClueCallback
        undefined, // useCrystalBallCallback
        undefined  // useWhistleCallback
      )

      expect(result.success).toBe(true)
      expect(result.message).toBe('Transmute mode activated')
      expect(mockRemoveFromInventory).not.toHaveBeenCalled() // Item should not be removed
      expect(result.triggerBehavior).toBeDefined() // Transmute mode should be triggered
      expect(result.triggerBehavior?.type).toBe('transmute')
    })
  })
})