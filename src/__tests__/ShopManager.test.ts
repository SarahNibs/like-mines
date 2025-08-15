/**
 * Tests for ShopManager
 */

import { ShopManager } from '../ShopManager'
import { GameState, RunState } from '../types'

// Mock the modules that ShopManager imports
jest.mock('../items', () => ({
  SHOP_ITEMS: [
    { id: 'test-item-1', name: 'Test Item 1', immediate: false },
    { id: 'test-item-2', name: 'Test Item 2', immediate: true },
    { id: 'test-item-3', name: 'Test Item 3', immediate: false }
  ]
}))

jest.mock('../upgrades', () => ({
  getAvailableUpgrades: jest.fn((currentUpgrades: string[]) => [
    { id: 'test-upgrade-1', name: 'Test Upgrade 1' },
    { id: 'test-upgrade-2', name: 'Test Upgrade 2' }
  ])
}))

jest.mock('../gameLogic', () => ({
  addItemToInventory: jest.fn(() => true),
  applyItemEffect: jest.fn(() => 'Item effect applied')
}))

describe('ShopManager', () => {
  let manager: ShopManager
  let mockGameState: GameState
  let mockRunState: RunState

  beforeEach(() => {
    manager = new ShopManager()
    
    mockRunState = {
      currentLevel: 3,
      upgrades: ['existing-upgrade'],
      gold: 100,
      hp: 50,
      maxHp: 100,
      inventory: [],
      temporaryBuffs: {},
      trophies: []
    } as RunState

    mockGameState = {
      run: mockRunState,
      gameStatus: 'playing',
      boardStatus: 'in-progress',
      shopOpen: false,
      shopItems: []
    } as GameState
  })

  describe('shop configuration', () => {
    it('should generate correct shop configuration for level 3', () => {
      const config = manager.generateShopConfiguration(mockGameState)

      expect(config).toEqual({
        level: 3,
        tradersCount: 0,
        baseItemCount: 5,
        baseItemCost: 2, // 1 + shopNumber(1)
        baseUpgradeCost: 7 // 6 + shopNumber(1)
      })
    })

    it('should generate correct shop configuration for level 6', () => {
      mockGameState.run.currentLevel = 6
      const config = manager.generateShopConfiguration(mockGameState)

      expect(config).toEqual({
        level: 6,
        tradersCount: 0,
        baseItemCount: 5,
        baseItemCost: 3, // 1 + shopNumber(2)
        baseUpgradeCost: 8 // 6 + shopNumber(2)
      })
    })

    it('should account for traders upgrades', () => {
      mockGameState.run.upgrades = ['traders', 'traders', 'other-upgrade']
      const config = manager.generateShopConfiguration(mockGameState)

      expect(config.tradersCount).toBe(2)
    })
  })

  describe('shop item generation', () => {
    it('should generate correct number of shop items', async () => {
      const config = manager.generateShopConfiguration(mockGameState)
      const shopItems = await manager.generateShopItems(config)

      expect(shopItems).toHaveLength(5) // baseItemCount
      expect(shopItems.every(item => !item.isUpgrade)).toBe(true)
    })

    it('should generate additional items with traders upgrade', async () => {
      mockGameState.run.upgrades = ['traders']
      const config = manager.generateShopConfiguration(mockGameState)
      const shopItems = await manager.generateShopItems(config)

      expect(shopItems).toHaveLength(6) // baseItemCount + 1 trader
    })

    it('should assign correct costs to items', async () => {
      const config = manager.generateShopConfiguration(mockGameState)
      const shopItems = await manager.generateShopItems(config)

      // Level 3: base cost 2, so items should cost 2,3,4,5,6
      expect(shopItems[0].cost).toBe(2)
      expect(shopItems[1].cost).toBe(3)
      expect(shopItems[2].cost).toBe(4)
      expect(shopItems[3].cost).toBe(5)
      expect(shopItems[4].cost).toBe(6)
    })

    it('should assign higher costs to trader extra items', async () => {
      mockGameState.run.upgrades = ['traders']
      const config = manager.generateShopConfiguration(mockGameState)
      const shopItems = await manager.generateShopItems(config)

      // 6th item (first trader item) should cost baseItemCost + 5 + 1 = 8
      expect(shopItems[5].cost).toBe(8)
    })
  })

  describe('upgrade addition', () => {
    it('should add upgrades to shop items', async () => {
      const config = manager.generateShopConfiguration(mockGameState)
      let shopItems = await manager.generateShopItems(config)
      shopItems = await manager.addUpgradesToShop(shopItems, mockGameState.run.upgrades, config)

      const upgrades = shopItems.filter(item => item.isUpgrade)
      expect(upgrades).toHaveLength(1) // base upgrade count
      expect(upgrades[0].cost).toBe(7) // base upgrade cost for level 3
    })

    it('should add extra upgrades with traders', async () => {
      mockGameState.run.upgrades = ['traders']
      const config = manager.generateShopConfiguration(mockGameState)
      let shopItems = await manager.generateShopItems(config)
      shopItems = await manager.addUpgradesToShop(shopItems, mockGameState.run.upgrades, config)

      const upgrades = shopItems.filter(item => item.isUpgrade)
      expect(upgrades).toHaveLength(2) // 1 + traders count
    })
  })

  describe('complete shop opening', () => {
    it('should generate complete shop with items and upgrades', async () => {
      const shopItems = await manager.openShop(mockGameState)

      const items = shopItems.filter(item => !item.isUpgrade)
      const upgrades = shopItems.filter(item => item.isUpgrade)

      expect(items).toHaveLength(5)
      expect(upgrades).toHaveLength(1)
      expect(shopItems).toHaveLength(6)
    })
  })

  describe('purchase validation', () => {
    it('should allow valid purchases', () => {
      const shopItem = { item: { id: 'test' }, cost: 50, isUpgrade: false }
      const validation = manager.canPurchaseItem(
        mockRunState,
        shopItem,
        true,
        [shopItem],
        0
      )

      expect(validation.canPurchase).toBe(true)
    })

    it('should reject purchase when shop is closed', () => {
      const shopItem = { item: { id: 'test' }, cost: 50, isUpgrade: false }
      const validation = manager.canPurchaseItem(
        mockRunState,
        shopItem,
        false,
        [shopItem],
        0
      )

      expect(validation.canPurchase).toBe(false)
      expect(validation.reason).toBe('Shop is not open')
    })

    it('should reject purchase with insufficient gold', () => {
      const shopItem = { item: { id: 'test' }, cost: 150, isUpgrade: false }
      const validation = manager.canPurchaseItem(
        mockRunState,
        shopItem,
        true,
        [shopItem],
        0
      )

      expect(validation.canPurchase).toBe(false)
      expect(validation.reason).toBe('Not enough gold! Need 150, have 100')
    })

    it('should reject invalid item index', () => {
      const shopItem = { item: { id: 'test' }, cost: 50, isUpgrade: false }
      const validation = manager.canPurchaseItem(
        mockRunState,
        shopItem,
        true,
        [shopItem],
        5
      )

      expect(validation.canPurchase).toBe(false)
      expect(validation.reason).toBe('Invalid item index')
    })
  })

  describe('item purchasing', () => {
    it('should purchase regular items successfully', async () => {
      const shopItem = { 
        item: { id: 'test-item', name: 'Test Item', immediate: false }, 
        cost: 50, 
        isUpgrade: false 
      }
      const mockUpgradeCallback = jest.fn()

      const result = await manager.purchaseItem(mockRunState, shopItem, mockUpgradeCallback)

      expect(result.success).toBe(true)
      expect(result.updatedRun.gold).toBe(50) // 100 - 50
      expect(result.message).toContain('Bought Test Item for 50 gold')
    })

    it('should purchase immediate items successfully', async () => {
      const shopItem = { 
        item: { id: 'test-item', name: 'Test Item', immediate: true }, 
        cost: 30, 
        isUpgrade: false 
      }
      const mockUpgradeCallback = jest.fn()

      const result = await manager.purchaseItem(mockRunState, shopItem, mockUpgradeCallback)

      expect(result.success).toBe(true)
      expect(result.updatedRun.gold).toBe(70) // 100 - 30
      expect(result.message).toContain('Bought and used Test Item for 30 gold')
    })

    it('should purchase upgrades successfully', async () => {
      const shopItem = { 
        item: { id: 'test-upgrade', name: 'Test Upgrade' }, 
        cost: 70, 
        isUpgrade: true 
      }
      const mockUpgradeCallback = jest.fn(() => ({ ...mockRunState, gold: 30 }))

      const result = await manager.purchaseItem(mockRunState, shopItem, mockUpgradeCallback)

      expect(result.success).toBe(true)
      expect(mockUpgradeCallback).toHaveBeenCalledWith('test-upgrade')
      expect(result.message).toContain('Bought and applied Test Upgrade upgrade for 70 gold')
    })
  })

  describe('shop item removal', () => {
    it('should remove purchased item from shop', () => {
      const shopItems = [
        { item: { id: 'item1' }, cost: 10, isUpgrade: false },
        { item: { id: 'item2' }, cost: 20, isUpgrade: false },
        { item: { id: 'item3' }, cost: 30, isUpgrade: false }
      ]

      const updatedItems = manager.removePurchasedItem(shopItems, 1)

      expect(updatedItems).toHaveLength(2)
      expect(updatedItems[0].item.id).toBe('item1')
      expect(updatedItems[1].item.id).toBe('item3')
    })
  })

  describe('complete purchase transaction', () => {
    it('should complete successful purchase', async () => {
      const shopItems = [
        { item: { id: 'test-item', name: 'Test Item', immediate: false }, cost: 50, isUpgrade: false }
      ]
      const mockUpgradeCallback = jest.fn()

      const result = await manager.completePurchase(mockRunState, shopItems, 0, mockUpgradeCallback)

      expect(result.success).toBe(true)
      expect(result.updatedRun.gold).toBe(50)
      expect(result.updatedShopItems).toHaveLength(0)
    })

    it('should fail purchase with insufficient gold', async () => {
      const shopItems = [
        { item: { id: 'expensive-item', name: 'Expensive Item' }, cost: 150, isUpgrade: false }
      ]
      const mockUpgradeCallback = jest.fn()

      const result = await manager.completePurchase(mockRunState, shopItems, 0, mockUpgradeCallback)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Not enough gold! Need 150, have 100')
      expect(result.updatedRun.gold).toBe(100) // Unchanged
      expect(result.updatedShopItems).toHaveLength(1) // Unchanged
    })
  })

  describe('shop statistics', () => {
    it('should calculate shop statistics correctly', () => {
      const shopItems = [
        { item: { id: 'item1' }, cost: 10, isUpgrade: false },
        { item: { id: 'item2' }, cost: 20, isUpgrade: false },
        { item: { id: 'upgrade1' }, cost: 50, isUpgrade: true },
        { item: { id: 'upgrade2' }, cost: 60, isUpgrade: true }
      ]

      const stats = manager.getShopStatistics(shopItems)

      expect(stats).toEqual({
        totalItems: 2,
        totalUpgrades: 2,
        minCost: 10,
        maxCost: 60,
        totalValue: 140
      })
    })

    it('should handle empty shop', () => {
      const stats = manager.getShopStatistics([])

      expect(stats).toEqual({
        totalItems: 0,
        totalUpgrades: 0,
        minCost: 0,
        maxCost: 0,
        totalValue: 0
      })
    })
  })

  describe('affordable items', () => {
    it('should filter affordable items correctly', () => {
      const shopItems = [
        { item: { id: 'cheap' }, cost: 10, isUpgrade: false },
        { item: { id: 'affordable' }, cost: 50, isUpgrade: false },
        { item: { id: 'expensive' }, cost: 150, isUpgrade: false }
      ]

      const affordable = manager.getAffordableItems(shopItems, 75)

      expect(affordable).toHaveLength(2)
      expect(affordable[0].item.id).toBe('cheap')
      expect(affordable[1].item.id).toBe('affordable')
    })

    it('should return empty array when nothing is affordable', () => {
      const shopItems = [
        { item: { id: 'expensive1' }, cost: 100, isUpgrade: false },
        { item: { id: 'expensive2' }, cost: 150, isUpgrade: false }
      ]

      const affordable = manager.getAffordableItems(shopItems, 50)

      expect(affordable).toHaveLength(0)
    })
  })

  describe('shop level validation', () => {
    it('should identify shop levels correctly', () => {
      expect(manager.isShopLevel(3)).toBe(true)
      expect(manager.isShopLevel(6)).toBe(true)
      expect(manager.isShopLevel(9)).toBe(true)
      expect(manager.isShopLevel(12)).toBe(true)
      expect(manager.isShopLevel(15)).toBe(true)
      expect(manager.isShopLevel(18)).toBe(true)
    })

    it('should identify non-shop levels correctly', () => {
      expect(manager.isShopLevel(0)).toBe(false)
      expect(manager.isShopLevel(1)).toBe(false)
      expect(manager.isShopLevel(2)).toBe(false)
      expect(manager.isShopLevel(4)).toBe(false)
      expect(manager.isShopLevel(5)).toBe(false)
      expect(manager.isShopLevel(7)).toBe(false)
    })
  })

  describe('shop reset', () => {
    it('should reset shop state correctly', () => {
      const resetState = manager.resetShop()

      expect(resetState).toEqual({
        shopOpen: false,
        shopItems: []
      })
    })
  })

  describe('cost calculations', () => {
    it('should calculate trader item costs correctly', async () => {
      mockGameState.run.upgrades = ['traders', 'traders'] // 2 traders
      const config = manager.generateShopConfiguration(mockGameState)
      const shopItems = await manager.generateShopItems(config)

      // Base items: 2,3,4,5,6
      // Trader items: 8,10 (base + index + extra cost)
      expect(shopItems).toHaveLength(7) // 5 base + 2 trader
      expect(shopItems[5].cost).toBe(8) // 2 + 5 + 1
      expect(shopItems[6].cost).toBe(10) // 2 + 6 + 2
    })

    it('should calculate upgrade costs with traders correctly', async () => {
      mockGameState.run.upgrades = ['traders']
      const config = manager.generateShopConfiguration(mockGameState)
      let shopItems = await manager.generateShopItems(config)
      shopItems = await manager.addUpgradesToShop(shopItems, mockGameState.run.upgrades, config)

      const upgrades = shopItems.filter(item => item.isUpgrade)
      expect(upgrades).toHaveLength(2)
      expect(upgrades[0].cost).toBe(7) // base upgrade cost
      expect(upgrades[1].cost).toBe(8) // base + 1
    })
  })

  describe('edge cases', () => {
    it('should handle inventory full scenario', async () => {
      const { addItemToInventory } = await import('../gameLogic')
      ;(addItemToInventory as jest.Mock).mockReturnValueOnce(false)

      const shopItem = { 
        item: { id: 'test-item', name: 'Test Item', immediate: false }, 
        cost: 50, 
        isUpgrade: false 
      }
      const mockUpgradeCallback = jest.fn()

      const result = await manager.purchaseItem(mockRunState, shopItem, mockUpgradeCallback)

      expect(result.success).toBe(true)
      expect(result.message).toContain('inventory full - item lost!')
    })

    it('should handle zero gold correctly', () => {
      const zeroGoldRun = { ...mockRunState, gold: 0 }
      const shopItem = { item: { id: 'test' }, cost: 1, isUpgrade: false }
      
      const validation = manager.canPurchaseItem(zeroGoldRun, shopItem, true, [shopItem], 0)

      expect(validation.canPurchase).toBe(false)
      expect(validation.reason).toBe('Not enough gold! Need 1, have 0')
    })

    it('should handle negative item index', () => {
      const shopItem = { item: { id: 'test' }, cost: 50, isUpgrade: false }
      const validation = manager.canPurchaseItem(
        mockRunState,
        shopItem,
        true,
        [shopItem],
        -1
      )

      expect(validation.canPurchase).toBe(false)
      expect(validation.reason).toBe('Invalid item index')
    })
  })
})