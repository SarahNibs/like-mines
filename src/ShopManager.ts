/**
 * ShopManager - Manages shop functionality including item generation, purchasing, and upgrades
 * This is a focused extraction for all shop-related operations
 */

import { GameState, RunState } from './types'

export interface ShopItem {
  item: any // Item or Upgrade
  cost: number
  isUpgrade: boolean
}

export interface ShopConfiguration {
  level: number
  tradersCount: number
  baseItemCount: number
  baseItemCost: number
  baseUpgradeCost: number
}

export interface ShopPurchaseResult {
  success: boolean
  message: string
  updatedRun: RunState
  remainingItems: ShopItem[]
}

export class ShopManager {
  
  // Generate shop configuration based on current game state
  generateShopConfiguration(currentState: GameState): ShopConfiguration {
    const level = currentState.run.currentLevel
    const shopNumber = Math.floor(level / 3) // 1st shop (level 3) = 1, 2nd shop (level 6) = 2, etc.
    
    // Count Traders upgrades for additional items
    const tradersCount = currentState.run.upgrades.filter(id => id === 'traders').length
    
    return {
      level,
      tradersCount,
      baseItemCount: 5,
      baseItemCost: 1 + shopNumber, // Level 3 = shop 1, base cost 2. Level 6 = shop 2, base cost 3.
      baseUpgradeCost: 6 + shopNumber // Level 3 = shop 1, upgrade cost 7. Level 6 = shop 2, upgrade cost 8.
    }
  }
  
  // Generate shop items with proper cost scaling
  async generateShopItems(config: ShopConfiguration): Promise<ShopItem[]> {
    // Import shop items and upgrades modules
    const { SHOP_ITEMS } = await import('./items')
    const { getAvailableUpgrades } = await import('./upgrades')
    
    const totalItemCount = config.baseItemCount + config.tradersCount
    const totalUpgradeCount = 1 + config.tradersCount
    
    // Generate item costs: Level 3: 2,3,4,5 / Level 6: 3,4,5,6 / Level 9: 4,5,6,7 etc.
    const itemCosts = []
    for (let i = 0; i < totalItemCount; i++) {
      const extraCost = i >= config.baseItemCount ? i - config.baseItemCount + 1 : 0 // Traders extra items cost +1 more
      itemCosts.push(config.baseItemCost + i + extraCost)
    }
    
    // Generate upgrade costs: Level 3: 7 / Level 6: 8 / Level 9: 9 etc.
    const upgradeCosts = []
    for (let i = 0; i < totalUpgradeCount; i++) {
      upgradeCosts.push(config.baseUpgradeCost + (i > 0 ? i : 0))
    }
    
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
    
    // Add random upgrades - Note: this requires current upgrades to determine availability
    // We'll need to pass current upgrades when calling this method
    return shopItems // Return items only for now, upgrades will be added separately
  }
  
  // Add available upgrades to shop items
  async addUpgradesToShop(shopItems: ShopItem[], currentUpgrades: string[], config: ShopConfiguration): Promise<ShopItem[]> {
    const { getAvailableUpgrades } = await import('./upgrades')
    
    const totalUpgradeCount = 1 + config.tradersCount
    const availableUpgrades = getAvailableUpgrades(currentUpgrades)
    
    // Generate upgrade costs
    const upgradeCosts = []
    for (let i = 0; i < totalUpgradeCount; i++) {
      upgradeCosts.push(config.baseUpgradeCost + (i > 0 ? i : 0))
    }
    
    // Add random upgrades
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
  
  // Complete shop opening process
  async openShop(currentState: GameState): Promise<ShopItem[]> {
    const config = this.generateShopConfiguration(currentState)
    let shopItems = await this.generateShopItems(config)
    shopItems = await this.addUpgradesToShop(shopItems, currentState.run.upgrades, config)
    
    console.log('Shop opened with items:', shopItems)
    return shopItems
  }
  
  // Validate shop purchase
  canPurchaseItem(run: RunState, shopItem: ShopItem, shopOpen: boolean, shopItems: ShopItem[], itemIndex: number): { canPurchase: boolean; reason?: string } {
    if (!shopOpen) {
      return { canPurchase: false, reason: 'Shop is not open' }
    }
    
    if (itemIndex >= shopItems.length || itemIndex < 0) {
      return { canPurchase: false, reason: 'Invalid item index' }
    }
    
    if (run.gold < shopItem.cost) {
      return { canPurchase: false, reason: `Not enough gold! Need ${shopItem.cost}, have ${run.gold}` }
    }
    
    return { canPurchase: true }
  }
  
  // Purchase shop item
  async purchaseItem(run: RunState, shopItem: ShopItem, applyUpgradeCallback: (upgradeId: string) => RunState): Promise<ShopPurchaseResult> {
    // Import necessary modules for item effects
    const { addItemToInventory, applyItemEffect } = await import('./gameLogic')
    
    // Create a copy of the run to modify
    const updatedRun = { ...run }
    
    // Deduct gold
    updatedRun.gold -= shopItem.cost
    
    let message = ''
    
    if (shopItem.isUpgrade) {
      // Apply upgrade immediately
      const upgradeResult = applyUpgradeCallback(shopItem.item.id)
      message = `Bought and applied ${shopItem.item.name} upgrade for ${shopItem.cost} gold`
      
      return {
        success: true,
        message,
        updatedRun: upgradeResult,
        remainingItems: [] // Will be handled by caller
      }
    } else if (shopItem.item.immediate) {
      // Use immediate item right away
      const effectMessage = applyItemEffect(updatedRun, shopItem.item)
      message = `Bought and used ${shopItem.item.name} for ${shopItem.cost} gold: ${effectMessage}`
      
      return {
        success: true,
        message,
        updatedRun,
        remainingItems: [] // Will be handled by caller
      }
    } else {
      // Try to add item to inventory
      const success = addItemToInventory(updatedRun, shopItem.item)
      if (!success) {
        message = `Bought ${shopItem.item.name} for ${shopItem.cost} gold but inventory full - item lost!`
      } else {
        message = `Bought ${shopItem.item.name} for ${shopItem.cost} gold`
      }
      
      return {
        success: true,
        message,
        updatedRun,
        remainingItems: [] // Will be handled by caller
      }
    }
  }
  
  // Remove purchased item from shop
  removePurchasedItem(shopItems: ShopItem[], itemIndex: number): ShopItem[] {
    const newShopItems = [...shopItems]
    newShopItems.splice(itemIndex, 1)
    return newShopItems
  }
  
  // Complete purchase transaction
  async completePurchase(
    run: RunState, 
    shopItems: ShopItem[], 
    itemIndex: number,
    applyUpgradeCallback: (upgradeId: string) => RunState
  ): Promise<{ success: boolean; message: string; updatedRun: RunState; updatedShopItems: ShopItem[] }> {
    
    const shopItem = shopItems[itemIndex]
    const validation = this.canPurchaseItem(run, shopItem, true, shopItems, itemIndex)
    
    if (!validation.canPurchase) {
      return {
        success: false,
        message: validation.reason || 'Purchase failed',
        updatedRun: run,
        updatedShopItems: shopItems
      }
    }
    
    const result = await this.purchaseItem(run, shopItem, applyUpgradeCallback)
    const updatedShopItems = this.removePurchasedItem(shopItems, itemIndex)
    
    console.log(result.message)
    
    return {
      success: result.success,
      message: result.message,
      updatedRun: result.updatedRun,
      updatedShopItems
    }
  }
  
  // Calculate shop statistics
  getShopStatistics(shopItems: ShopItem[]): { totalItems: number; totalUpgrades: number; minCost: number; maxCost: number; totalValue: number } {
    const items = shopItems.filter(item => !item.isUpgrade)
    const upgrades = shopItems.filter(item => item.isUpgrade)
    const costs = shopItems.map(item => item.cost)
    
    return {
      totalItems: items.length,
      totalUpgrades: upgrades.length,
      minCost: costs.length > 0 ? Math.min(...costs) : 0,
      maxCost: costs.length > 0 ? Math.max(...costs) : 0,
      totalValue: costs.reduce((sum, cost) => sum + cost, 0)
    }
  }
  
  // Get affordable items for player
  getAffordableItems(shopItems: ShopItem[], playerGold: number): ShopItem[] {
    return shopItems.filter(item => item.cost <= playerGold)
  }
  
  // Check if shop should be available at current level
  isShopLevel(level: number): boolean {
    // Shops appear on levels 3, 6, 9, 12, 15, 18
    return level > 0 && level % 3 === 0
  }
  
  // Reset shop state
  resetShop(): { shopOpen: false; shopItems: [] } {
    return {
      shopOpen: false,
      shopItems: []
    }
  }
}