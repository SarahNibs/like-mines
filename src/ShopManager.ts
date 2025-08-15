/**
 * ShopManager - Manages shop operations, item generation, and purchasing
 * Extracted from store.ts to isolate shop-related concerns
 */

import { Item } from './types'
import { Upgrade } from './types'

export interface ShopItem {
  item: Item | Upgrade
  cost: number
  isUpgrade: boolean
}

export interface ShopState {
  isOpen: boolean
  items: ShopItem[]
}

export interface ShopGenerationConfig {
  level: number
  tradersCount: number
  baseItemCount?: number
}

export interface PurchaseResult {
  success: boolean
  reason?: string
  goldSpent?: number
  itemPurchased?: Item | Upgrade
  isUpgrade?: boolean
}

export class ShopManager {
  private shopState: ShopState

  constructor() {
    this.shopState = {
      isOpen: false,
      items: []
    }
  }

  // Get current shop state
  getShopState(): ShopState {
    return {
      isOpen: this.shopState.isOpen,
      items: [...this.shopState.items] // Return copy of items array
    }
  }

  // Generate shop items based on level and bonuses
  async generateShopItems(config: ShopGenerationConfig): Promise<ShopItem[]> {
    const { level, tradersCount, baseItemCount = 4 } = config
    
    // Import items and upgrades dynamically
    const { SHOP_ITEMS } = await import('./items')
    const { getAvailableUpgrades } = await import('./upgrades')
    
    // Calculate shop parameters
    const shopNumber = Math.floor(level / 3) // 1st shop (level 3) = 1, 2nd shop (level 6) = 2, etc.
    const totalItemCount = baseItemCount + tradersCount
    
    // Generate item costs: Level 3: 2,3,4,5 / Level 6: 3,4,5,6 / Level 9: 4,5,6,7 etc.
    const itemCosts = this.generateItemCosts(shopNumber, totalItemCount, baseItemCount, tradersCount)
    
    // Generate upgrade costs: Level 3: 7 / Level 6: 8 / Level 9: 9 etc.
    const upgradeCosts = this.generateUpgradeCosts(shopNumber, tradersCount)
    
    const shopItems: ShopItem[] = []
    
    // Add random items
    for (let i = 0; i < totalItemCount; i++) {
      const randomItem = SHOP_ITEMS[Math.floor(Math.random() * SHOP_ITEMS.length)]
      shopItems.push({
        item: randomItem,
        cost: itemCosts[i],
        isUpgrade: false
      })
    }
    
    // Add random upgrades
    const availableUpgrades = getAvailableUpgrades([]) // Pass empty array to get all upgrades for shop
    const totalUpgradeCount = 1 + tradersCount
    
    for (let i = 0; i < totalUpgradeCount && i < availableUpgrades.length; i++) {
      const randomUpgrade = availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)]
      shopItems.push({
        item: randomUpgrade,
        cost: upgradeCosts[i],
        isUpgrade: true
      })
    }
    
    return shopItems
  }

  // Open shop with generated items
  async openShop(config: ShopGenerationConfig): Promise<ShopItem[]> {
    const items = await this.generateShopItems(config)
    
    this.shopState = {
      isOpen: true,
      items
    }
    
    console.log('Shop opened with items:', items)
    return items
  }

  // Close shop
  closeShop(): void {
    this.shopState = {
      isOpen: false,
      items: []
    }
  }

  // Check if shop is open
  isShopOpen(): boolean {
    return this.shopState.isOpen
  }

  // Get shop items
  getShopItems(): ShopItem[] {
    return [...this.shopState.items]
  }

  // Validate purchase attempt
  canPurchaseItem(itemIndex: number, playerGold: number): { canPurchase: boolean; reason?: string } {
    if (!this.shopState.isOpen) {
      return { canPurchase: false, reason: 'Shop is not open' }
    }
    
    if (itemIndex < 0 || itemIndex >= this.shopState.items.length) {
      return { canPurchase: false, reason: 'Invalid item index' }
    }
    
    const shopItem = this.shopState.items[itemIndex]
    if (playerGold < shopItem.cost) {
      return { 
        canPurchase: false, 
        reason: `Not enough gold! Need ${shopItem.cost}, have ${playerGold}` 
      }
    }
    
    return { canPurchase: true }
  }

  // Execute purchase (validation should be done before calling this)
  purchaseItem(itemIndex: number): PurchaseResult {
    if (itemIndex < 0 || itemIndex >= this.shopState.items.length) {
      return {
        success: false,
        reason: 'Invalid item index'
      }
    }
    
    const shopItem = this.shopState.items[itemIndex]
    
    // Remove item from shop
    this.shopState.items.splice(itemIndex, 1)
    
    return {
      success: true,
      goldSpent: shopItem.cost,
      itemPurchased: shopItem.item,
      isUpgrade: shopItem.isUpgrade
    }
  }

  // Generate item costs based on shop parameters
  private generateItemCosts(shopNumber: number, totalItemCount: number, baseItemCount: number, tradersCount: number): number[] {
    const baseItemCost = 1 + shopNumber // Level 3 = shop 1, base cost 2. Level 6 = shop 2, base cost 3.
    const itemCosts: number[] = []
    
    for (let i = 0; i < totalItemCount; i++) {
      const extraCost = i >= baseItemCount ? i - baseItemCount + 1 : 0 // Traders extra items cost +1 more
      itemCosts.push(baseItemCost + i + extraCost)
    }
    
    return itemCosts
  }

  // Generate upgrade costs based on shop parameters
  private generateUpgradeCosts(shopNumber: number, tradersCount: number): number[] {
    const baseUpgradeCost = 6 + shopNumber // Level 3 = shop 1, upgrade cost 7. Level 6 = shop 2, upgrade cost 8.
    const totalUpgradeCount = 1 + tradersCount
    const upgradeCosts: number[] = []
    
    for (let i = 0; i < totalUpgradeCount; i++) {
      upgradeCosts.push(baseUpgradeCost + (i > 0 ? i : 0))
    }
    
    return upgradeCosts
  }

  // Get shop summary for display
  getShopSummary(): string {
    if (!this.shopState.isOpen) {
      return 'Shop is closed'
    }
    
    const itemCount = this.shopState.items.filter(item => !item.isUpgrade).length
    const upgradeCount = this.shopState.items.filter(item => item.isUpgrade).length
    
    return `Shop open: ${itemCount} items, ${upgradeCount} upgrades`
  }

  // Calculate total shop value (for analytics/debugging)
  getTotalShopValue(): number {
    return this.shopState.items.reduce((total, item) => total + item.cost, 0)
  }

  // Get shop statistics
  getShopStats(): { itemCount: number; upgradeCount: number; totalValue: number; averageCost: number } {
    const items = this.shopState.items
    const itemCount = items.filter(item => !item.isUpgrade).length
    const upgradeCount = items.filter(item => item.isUpgrade).length
    const totalValue = this.getTotalShopValue()
    const averageCost = items.length > 0 ? totalValue / items.length : 0
    
    return {
      itemCount,
      upgradeCount,
      totalValue,
      averageCost: Math.round(averageCost * 100) / 100 // Round to 2 decimal places
    }
  }
}