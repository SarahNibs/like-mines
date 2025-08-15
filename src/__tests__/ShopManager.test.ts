import { ShopManager, ShopGenerationConfig, ShopItem } from '../ShopManager'

// Mock the imports since they're dynamic
jest.mock('../items', () => ({
  SHOP_ITEMS: [
    { id: 'first-aid', name: 'First Aid', description: 'Heal 4 HP' },
    { id: 'gold-coin', name: 'Gold Coin', description: 'Gain 1 gold' },
    { id: 'protection', name: 'Protection', description: 'Block 1 damage' }
  ]
}))

jest.mock('../upgrades', () => ({
  getAvailableUpgrades: jest.fn(() => [
    { id: 'attack-boost', name: 'Attack Boost', description: 'Increase attack' },
    { id: 'defense-boost', name: 'Defense Boost', description: 'Increase defense' },
    { id: 'health-boost', name: 'Health Boost', description: 'Increase health' }
  ])
}))

describe('ShopManager', () => {
  let shopManager: ShopManager

  beforeEach(() => {
    shopManager = new ShopManager()
    
    // Mock console.log to reduce test noise
    jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with shop closed', () => {
      expect(shopManager.isShopOpen()).toBe(false)
      
      const state = shopManager.getShopState()
      expect(state.isOpen).toBe(false)
      expect(state.items).toEqual([])
    })

    it('should return empty shop items when closed', () => {
      expect(shopManager.getShopItems()).toEqual([])
    })
  })

  describe('shop generation', () => {
    it('should generate shop items based on configuration', async () => {
      const config: ShopGenerationConfig = {
        level: 3,
        tradersCount: 0
      }
      
      const items = await shopManager.generateShopItems(config)
      
      expect(items.length).toBeGreaterThan(0)
      expect(items.every(item => item.cost > 0)).toBe(true)
      expect(items.some(item => !item.isUpgrade)).toBe(true) // Should have items
      expect(items.some(item => item.isUpgrade)).toBe(true) // Should have upgrades
    })

    it('should increase item costs based on shop level', async () => {
      const config1: ShopGenerationConfig = { level: 3, tradersCount: 0 }
      const config2: ShopGenerationConfig = { level: 6, tradersCount: 0 }
      
      const items1 = await shopManager.generateShopItems(config1)
      const items2 = await shopManager.generateShopItems(config2)
      
      // Level 6 shop should have higher base costs than level 3
      const avgCost1 = items1.reduce((sum, item) => sum + item.cost, 0) / items1.length
      const avgCost2 = items2.reduce((sum, item) => sum + item.cost, 0) / items2.length
      
      expect(avgCost2).toBeGreaterThan(avgCost1)
    })

    it('should add extra items with traders bonus', async () => {
      const configNoTraders: ShopGenerationConfig = { level: 3, tradersCount: 0 }
      const configWithTraders: ShopGenerationConfig = { level: 3, tradersCount: 2 }
      
      const itemsNoTraders = await shopManager.generateShopItems(configNoTraders)
      const itemsWithTraders = await shopManager.generateShopItems(configWithTraders)
      
      expect(itemsWithTraders.length).toBeGreaterThan(itemsNoTraders.length)
    })

    it('should respect base item count configuration', async () => {
      const config: ShopGenerationConfig = {
        level: 3,
        tradersCount: 0,
        baseItemCount: 2
      }
      
      const items = await shopManager.generateShopItems(config)
      const regularItems = items.filter(item => !item.isUpgrade)
      
      expect(regularItems.length).toBe(2)
    })
  })

  describe('shop operations', () => {
    it('should open shop with generated items', async () => {
      const config: ShopGenerationConfig = { level: 3, tradersCount: 0 }
      
      const items = await shopManager.openShop(config)
      
      expect(shopManager.isShopOpen()).toBe(true)
      expect(items.length).toBeGreaterThan(0)
      expect(shopManager.getShopItems()).toEqual(items)
    })

    it('should close shop and clear items', async () => {
      await shopManager.openShop({ level: 3, tradersCount: 0 })
      
      shopManager.closeShop()
      
      expect(shopManager.isShopOpen()).toBe(false)
      expect(shopManager.getShopItems()).toEqual([])
    })

    it('should return immutable shop state', () => {
      const state1 = shopManager.getShopState()
      const state2 = shopManager.getShopState()
      
      expect(state1).not.toBe(state2) // Different objects
      expect(state1.items).not.toBe(state2.items) // Different arrays
      expect(state1).toEqual(state2) // Same content
    })

    it('should return immutable shop items array', async () => {
      await shopManager.openShop({ level: 3, tradersCount: 0 })
      
      const items1 = shopManager.getShopItems()
      const items2 = shopManager.getShopItems()
      
      expect(items1).not.toBe(items2) // Different arrays
      expect(items1).toEqual(items2) // Same content
    })
  })

  describe('purchase validation', () => {
    beforeEach(async () => {
      await shopManager.openShop({ level: 3, tradersCount: 0 })
    })

    it('should allow purchase when player has enough gold', () => {
      const items = shopManager.getShopItems()
      const itemCost = items[0].cost
      
      const result = shopManager.canPurchaseItem(0, itemCost + 5)
      
      expect(result.canPurchase).toBe(true)
      expect(result.reason).toBe(undefined)
    })

    it('should prevent purchase when player has insufficient gold', () => {
      const items = shopManager.getShopItems()
      const itemCost = items[0].cost
      
      const result = shopManager.canPurchaseItem(0, itemCost - 1)
      
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toContain('Not enough gold')
    })

    it('should prevent purchase with invalid item index', () => {
      const result = shopManager.canPurchaseItem(999, 1000)
      
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toContain('Invalid item index')
    })

    it('should prevent purchase when shop is closed', () => {
      shopManager.closeShop()
      
      const result = shopManager.canPurchaseItem(0, 1000)
      
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toContain('Shop is not open')
    })
  })

  describe('purchase execution', () => {
    beforeEach(async () => {
      await shopManager.openShop({ level: 3, tradersCount: 0 })
    })

    it('should execute successful purchase', () => {
      const items = shopManager.getShopItems()
      const originalItemCount = items.length
      const itemToPurchase = items[0]
      
      const result = shopManager.purchaseItem(0)
      
      expect(result.success).toBe(true)
      expect(result.goldSpent).toBe(itemToPurchase.cost)
      expect(result.itemPurchased).toEqual(itemToPurchase.item)
      expect(result.isUpgrade).toBe(itemToPurchase.isUpgrade)
      
      // Item should be removed from shop
      expect(shopManager.getShopItems().length).toBe(originalItemCount - 1)
    })

    it('should handle invalid item index in purchase', () => {
      const result = shopManager.purchaseItem(999)
      
      expect(result.success).toBe(false)
      expect(result.reason).toContain('Invalid item index')
    })

    it('should remove purchased item from shop', () => {
      const originalItems = shopManager.getShopItems()
      const itemToPurchase = originalItems[1] // Purchase middle item
      
      shopManager.purchaseItem(1)
      
      const remainingItems = shopManager.getShopItems()
      expect(remainingItems.length).toBe(originalItems.length - 1)
      expect(remainingItems).not.toContainEqual(itemToPurchase)
    })
  })

  describe('cost generation', () => {
    it('should generate progressive item costs', async () => {
      const config: ShopGenerationConfig = { level: 3, tradersCount: 0, baseItemCount: 4 }
      
      const items = await shopManager.generateShopItems(config)
      const regularItems = items.filter(item => !item.isUpgrade).sort((a, b) => a.cost - b.cost)
      
      // Costs should be progressive
      for (let i = 1; i < regularItems.length; i++) {
        expect(regularItems[i].cost).toBeGreaterThan(regularItems[i - 1].cost)
      }
    })

    it('should generate appropriate upgrade costs', async () => {
      const config: ShopGenerationConfig = { level: 3, tradersCount: 0 }
      
      const items = await shopManager.generateShopItems(config)
      const upgrades = items.filter(item => item.isUpgrade)
      const regularItems = items.filter(item => !item.isUpgrade)
      
      // Upgrades should generally cost more than items
      const avgUpgradeCost = upgrades.reduce((sum, item) => sum + item.cost, 0) / upgrades.length
      const avgItemCost = regularItems.reduce((sum, item) => sum + item.cost, 0) / regularItems.length
      
      expect(avgUpgradeCost).toBeGreaterThan(avgItemCost)
    })

    it('should handle traders bonus in cost calculation', async () => {
      const configWithTraders: ShopGenerationConfig = { level: 3, tradersCount: 2 }
      
      const items = await shopManager.generateShopItems(configWithTraders)
      const regularItems = items.filter(item => !item.isUpgrade)
      
      // Should have base items + traders bonus items
      expect(regularItems.length).toBe(4 + 2) // 4 base + 2 traders
      
      // Extra traders items should cost more
      const sortedCosts = regularItems.map(item => item.cost).sort((a, b) => a - b)
      expect(sortedCosts[sortedCosts.length - 1]).toBeGreaterThan(sortedCosts[0])
    })
  })

  describe('shop statistics', () => {
    it('should provide accurate shop summary when closed', () => {
      const summary = shopManager.getShopSummary()
      
      expect(summary).toBe('Shop is closed')
    })

    it('should provide accurate shop summary when open', async () => {
      await shopManager.openShop({ level: 3, tradersCount: 0 })
      
      const summary = shopManager.getShopSummary()
      
      expect(summary).toContain('Shop open:')
      expect(summary).toContain('items')
      expect(summary).toContain('upgrades')
    })

    it('should calculate total shop value correctly', async () => {
      await shopManager.openShop({ level: 3, tradersCount: 0 })
      
      const items = shopManager.getShopItems()
      const expectedTotal = items.reduce((sum, item) => sum + item.cost, 0)
      const actualTotal = shopManager.getTotalShopValue()
      
      expect(actualTotal).toBe(expectedTotal)
    })

    it('should provide detailed shop statistics', async () => {
      await shopManager.openShop({ level: 3, tradersCount: 1 })
      
      const stats = shopManager.getShopStats()
      
      expect(stats.itemCount).toBeGreaterThan(0)
      expect(stats.upgradeCount).toBeGreaterThan(0)
      expect(stats.totalValue).toBeGreaterThan(0)
      expect(stats.averageCost).toBeGreaterThan(0)
      expect(stats.itemCount + stats.upgradeCount).toBe(shopManager.getShopItems().length)
    })

    it('should handle empty shop statistics', () => {
      const stats = shopManager.getShopStats()
      
      expect(stats.itemCount).toBe(0)
      expect(stats.upgradeCount).toBe(0)
      expect(stats.totalValue).toBe(0)
      expect(stats.averageCost).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle zero traders count', async () => {
      const config: ShopGenerationConfig = { level: 3, tradersCount: 0 }
      
      const items = await shopManager.generateShopItems(config)
      
      expect(items.length).toBeGreaterThan(0)
    })

    it('should handle high level shops', async () => {
      const config: ShopGenerationConfig = { level: 18, tradersCount: 2 }
      
      const items = await shopManager.generateShopItems(config)
      
      expect(items.length).toBeGreaterThan(0)
      expect(items.every(item => item.cost > 0)).toBe(true)
      
      // High level shop should have expensive items
      const avgCost = items.reduce((sum, item) => sum + item.cost, 0) / items.length
      expect(avgCost).toBeGreaterThan(5)
    })

    it('should handle multiple purchases from same shop', async () => {
      await shopManager.openShop({ level: 3, tradersCount: 0 })
      const originalCount = shopManager.getShopItems().length
      
      shopManager.purchaseItem(0)
      shopManager.purchaseItem(0) // Purchase new first item
      
      expect(shopManager.getShopItems().length).toBe(originalCount - 2)
    })

    it('should handle purchasing all items', async () => {
      await shopManager.openShop({ level: 3, tradersCount: 0 })
      const itemCount = shopManager.getShopItems().length
      
      // Purchase all items
      for (let i = itemCount - 1; i >= 0; i--) {
        shopManager.purchaseItem(i)
      }
      
      expect(shopManager.getShopItems()).toEqual([])
      expect(shopManager.getTotalShopValue()).toBe(0)
    })
  })

  describe('shop state consistency', () => {
    it('should maintain state consistency through open/close cycles', async () => {
      // Open shop
      await shopManager.openShop({ level: 3, tradersCount: 0 })
      expect(shopManager.isShopOpen()).toBe(true)
      
      // Close shop
      shopManager.closeShop()
      expect(shopManager.isShopOpen()).toBe(false)
      expect(shopManager.getShopItems()).toEqual([])
      
      // Open again
      await shopManager.openShop({ level: 6, tradersCount: 1 })
      expect(shopManager.isShopOpen()).toBe(true)
      expect(shopManager.getShopItems().length).toBeGreaterThan(0)
    })

    it('should not affect state when validation fails', async () => {
      await shopManager.openShop({ level: 3, tradersCount: 0 })
      const originalItems = shopManager.getShopItems()
      
      // Try invalid purchase
      const result = shopManager.canPurchaseItem(999, 1000)
      expect(result.canPurchase).toBe(false)
      
      // State should be unchanged
      expect(shopManager.getShopItems()).toEqual(originalItems)
    })
  })
})