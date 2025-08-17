/**
 * ShopManager Tests
 */

import { ShopManager } from '../ShopManager'
import { RunState, ItemData, UpgradeData } from '../types'

describe('ShopManager', () => {
  let manager: ShopManager
  let mockRun: RunState

  beforeEach(() => {
    manager = new ShopManager()
    mockRun = {
      currentLevel: 3,
      gold: 100,
      upgrades: [],
      hp: 10,
      maxHp: 10,
      inventory: [null, null, null],
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

  describe('openShop', () => {
    it('should open shop with correct item counts for base level', async () => {
      const result = await manager.openShop(mockRun)
      
      expect(result.shopOpen).toBe(true)
      expect(result.shopItems.length).toBeGreaterThan(0)
      // Base: 5 items + 1 upgrade = 6 total (no Traders upgrades)
      expect(result.shopItems.length).toBe(6)
    })

    it('should include more items with Traders upgrades', async () => {
      const runWithTraders = {
        ...mockRun,
        upgrades: ['traders', 'traders'] // 2 Traders upgrades
      }
      
      const result = await manager.openShop(runWithTraders)
      
      expect(result.shopOpen).toBe(true)
      // Base: 5 items + 2 Traders = 7 items, plus 1 + 2 Traders = 3 upgrades = 10 total
      expect(result.shopItems.length).toBe(10)
    })

    it('should scale costs by shop number', async () => {
      const level6Run = {
        ...mockRun,
        currentLevel: 6 // Shop number 2
      }
      
      const result = await manager.openShop(level6Run)
      
      expect(result.shopOpen).toBe(true)
      expect(result.shopItems.length).toBe(6)
      
      // Items should cost 3,4,5,6,7 for level 6 (shop 2)
      const itemCosts = result.shopItems
        .filter(item => !item.isUpgrade)
        .map(item => item.cost)
        .sort((a, b) => a - b)
      
      expect(itemCosts[0]).toBe(3) // Base cost for shop 2
    })

    it('should handle shop opening errors gracefully', async () => {
      // Test with a run that might cause import issues
      const result = await manager.openShop(mockRun)
      
      // Should still return a valid result even if imports fail
      expect(result).toHaveProperty('shopOpen')
      expect(result).toHaveProperty('shopItems')
    })
  })

  describe('buyShopItem', () => {
    const mockUpgradeCallback = jest.fn((upgradeId: string, run: RunState) => ({
      ...run,
      upgrades: [...run.upgrades, upgradeId]
    }))
    
    const mockItemEffectCallback = jest.fn((run: RunState, item: ItemData) => {
      run.hp += 5
      return `Healed 5 HP`
    })
    
    const mockAddToInventoryCallback = jest.fn((run: RunState, item: ItemData) => {
      const emptySlot = run.inventory.findIndex(slot => slot === null)
      if (emptySlot !== -1) {
        run.inventory[emptySlot] = item
        return true
      }
      return false
    })

    const mockShopItems = [
      {
        item: { id: 'health_potion', name: 'Health Potion', description: 'Heals HP', immediate: true } as ItemData,
        cost: 5,
        isUpgrade: false
      },
      {
        item: { id: 'crystal_ball', name: 'Crystal Ball', description: 'Reveals tiles' } as ItemData,
        cost: 3,
        isUpgrade: false
      },
      {
        item: { id: 'attack', name: 'Attack', description: 'Increases damage' } as UpgradeData,
        cost: 10,
        isUpgrade: true
      }
    ]

    beforeEach(() => {
      mockUpgradeCallback.mockClear()
      mockItemEffectCallback.mockClear()
      mockAddToInventoryCallback.mockClear()
    })

    it('should successfully buy immediate use items', () => {
      const result = manager.buyShopItem(
        mockRun,
        mockShopItems,
        0, // Health potion
        mockUpgradeCallback,
        mockItemEffectCallback,
        mockAddToInventoryCallback
      )

      expect(result.success).toBe(true)
      expect(result.newRun!.gold).toBe(95) // 100 - 5
      expect(result.shopItems.length).toBe(2) // Item removed from shop
      expect(mockItemEffectCallback).toHaveBeenCalledWith(expect.any(Object), mockShopItems[0].item)
      expect(result.message).toContain('Bought and used Health Potion')
    })

    it('should successfully buy inventory items', () => {
      const result = manager.buyShopItem(
        mockRun,
        mockShopItems,
        1, // Crystal ball
        mockUpgradeCallback,
        mockItemEffectCallback,
        mockAddToInventoryCallback
      )

      expect(result.success).toBe(true)
      expect(result.newRun!.gold).toBe(97) // 100 - 3
      expect(result.shopItems.length).toBe(2) // Item removed from shop
      expect(mockAddToInventoryCallback).toHaveBeenCalledWith(expect.any(Object), mockShopItems[1].item)
      expect(result.message).toContain('Bought Crystal Ball')
    })

    it('should successfully buy upgrades', () => {
      const result = manager.buyShopItem(
        mockRun,
        mockShopItems,
        2, // Attack upgrade
        mockUpgradeCallback,
        mockItemEffectCallback,
        mockAddToInventoryCallback
      )

      expect(result.success).toBe(true)
      expect(result.newRun!.gold).toBe(90) // 100 - 10
      expect(result.shopItems.length).toBe(2) // Item removed from shop
      expect(mockUpgradeCallback).toHaveBeenCalledWith('attack', expect.any(Object))
      expect(result.message).toContain('Bought and applied Attack')
    })

    it('should fail when player has insufficient gold', () => {
      const poorRun = { ...mockRun, gold: 2 }
      
      const result = manager.buyShopItem(
        poorRun,
        mockShopItems,
        0, // Health potion costs 5
        mockUpgradeCallback,
        mockItemEffectCallback,
        mockAddToInventoryCallback
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('Not enough gold')
      expect(result.shopItems.length).toBe(3) // No item removed
      expect(mockItemEffectCallback).not.toHaveBeenCalled()
    })

    it('should handle inventory full scenario', () => {
      const fullInventoryRun = {
        ...mockRun,
        inventory: [
          { id: 'item1' } as ItemData,
          { id: 'item2' } as ItemData,
          { id: 'item3' } as ItemData
        ]
      }
      
      // Mock inventory callback to return false (inventory full)
      const fullInventoryCallback = jest.fn(() => false)
      
      const result = manager.buyShopItem(
        fullInventoryRun,
        mockShopItems,
        1, // Crystal ball
        mockUpgradeCallback,
        mockItemEffectCallback,
        fullInventoryCallback
      )

      expect(result.success).toBe(true)
      expect(result.newRun!.gold).toBe(97) // Gold still deducted
      expect(result.message).toContain('inventory full - item lost')
    })

    it('should fail with invalid item index', () => {
      const result = manager.buyShopItem(
        mockRun,
        mockShopItems,
        99, // Invalid index
        mockUpgradeCallback,
        mockItemEffectCallback,
        mockAddToInventoryCallback
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('Invalid item index')
      expect(result.shopItems.length).toBe(3) // No changes to shop
    })
  })

  describe('closeShop', () => {
    it('should close shop and clear items', () => {
      const result = manager.closeShop()
      
      expect(result.shopOpen).toBe(false)
      expect(result.shopItems.length).toBe(0)
    })
  })
})