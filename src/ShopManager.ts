/**
 * ShopManager - Handles shop operations including opening, purchasing, and closing
 * Extracted from store.ts for better organization
 */

import { GameState, RunState, ItemData, UpgradeData } from './types'
import { CharacterTraitManager } from './CharacterTraits'
import { CharacterManager } from './CharacterManager'

export interface ShopItem {
  item: ItemData | UpgradeData
  cost: number
  isUpgrade?: boolean
}

export interface ShopResult {
  shopOpen: boolean
  shopItems: ShopItem[]
  newRun?: RunState
  success?: boolean
  message?: string
}

export class ShopManager {
  private characterManager: CharacterManager
  
  constructor() {
    this.characterManager = new CharacterManager()
  }
  
  /**
   * Open shop and generate items/upgrades with level-based pricing
   * @param currentRun Current run state for determining level and upgrades
   * @returns Promise with shop state and items
   */
  async openShop(currentRun: RunState): Promise<ShopResult> {
    try {
      // Dynamic imports for shop items and upgrades
      const { SHOP_ITEMS } = await import('./items')
      const { getAvailableUpgrades } = await import('./upgrades')
      
      // Base costs based on shop number (shops appear on levels 3, 6, 9, 12, 15, 18)
      const level = currentRun.currentLevel
      const shopNumber = Math.floor(level / 3) // 1st shop (level 3) = 1, 2nd shop (level 6) = 2, etc.
      
      // Count Traders upgrades for additional items
      const tradersCount = currentRun.upgrades.filter(id => id === 'traders').length
      const baseItemCount = 5
      const totalItemCount = baseItemCount + tradersCount
      
      // Generate item costs: Level 3: 2,3,4,5 / Level 6: 3,4,5,6 / Level 9: 4,5,6,7 etc.
      const baseItemCost = 1 + shopNumber // Level 3 = shop 1, base cost 2. Level 6 = shop 2, base cost 3.
      const itemCosts = []
      for (let i = 0; i < totalItemCount; i++) {
        const extraCost = i >= baseItemCount ? i - baseItemCount + 1 : 0 // Traders extra items cost +1 more
        let cost = baseItemCost + i + extraCost
        
        // Apply character-specific price modifications
        if (currentRun.character) {
          cost = this.characterManager.modifyShopPrice(currentRun.character, cost, 'item', level)
        }
        
        itemCosts.push(cost)
      }
      
      // Generate upgrade costs: Level 3: 7 / Level 6: 8 / Level 9: 9 etc.
      const baseUpgradeCost = 6 + shopNumber // Level 3 = shop 1, upgrade cost 7. Level 6 = shop 2, upgrade cost 8.
      const totalUpgradeCount = 1 + tradersCount
      const upgradeCosts = []
      for (let i = 0; i < totalUpgradeCount; i++) {
        let cost = baseUpgradeCost + (i > 0 ? i : 0)
        
        // Apply character-specific price modifications
        if (currentRun.character) {
          cost = this.characterManager.modifyShopPrice(currentRun.character, cost, 'upgrade', level)
        }
        
        upgradeCosts.push(cost)
      }
      
      const shopItems: ShopItem[] = []
      
      // Ensure at least one healing potion by placing it at a random cost position
      const { HEALTH_POTION } = await import('./items')
      const randomHealthPotionIndex = Math.floor(Math.random() * totalItemCount)
      
      // Add items, guaranteeing healing potion at random position
      for (let i = 0; i < totalItemCount; i++) {
        if (i === randomHealthPotionIndex) {
          // Place healing potion at this position
          shopItems.push({
            item: HEALTH_POTION,
            cost: itemCosts[i],
            isUpgrade: false
          })
        } else {
          // Add random item (excluding healing potion to avoid duplicates)
          const nonHealthPotionItems = SHOP_ITEMS.filter(item => item.id !== 'health-potion')
          const randomItem = nonHealthPotionItems[Math.floor(Math.random() * nonHealthPotionItems.length)]
          shopItems.push({
            item: randomItem,
            cost: itemCosts[i],
            isUpgrade: false
          })
        }
      }
      
      // Add random upgrades (filtered by character restrictions)
      let availableUpgrades = getAvailableUpgrades(currentRun.upgrades)
      
      // Filter out upgrades blocked by character traits
      if (currentRun.character) {
        const traitManager = new CharacterTraitManager()
        
        availableUpgrades = availableUpgrades.filter(upgrade => {
          // Check if upgrade is blocked
          if (traitManager.isUpgradeBlocked(currentRun.character!, upgrade.id)) {
            return false
          }
          
          // Check if upgrade has reached its limit
          const currentCount = currentRun.upgrades.filter(id => id === upgrade.id).length
          if (traitManager.isUpgradeLimitReached(currentRun.character!, upgrade.id, currentCount)) {
            return false
          }
          
          return true
        })
      }
      
      for (let i = 0; i < totalUpgradeCount && i < availableUpgrades.length; i++) {
        const randomUpgrade = availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)]
        shopItems.push({
          item: randomUpgrade,
          cost: upgradeCosts[i],
          isUpgrade: true
        })
      }
      
      console.log('Shop opened with items:', shopItems)
      
      return {
        shopOpen: true,
        shopItems
      }
    } catch (error) {
      console.error('Error opening shop:', error)
      return {
        shopOpen: false,
        shopItems: [],
        success: false,
        message: 'Failed to open shop'
      }
    }
  }

  /**
   * Attempt to purchase an item from the shop
   * @param currentRun Current run state
   * @param shopItems Current shop items
   * @param itemIndex Index of item to purchase
   * @param applyUpgradeCallback Callback to apply upgrades
   * @param applyItemEffectCallback Callback to apply immediate item effects
   * @param addItemToInventoryCallback Callback to add items to inventory
   * @returns Result of purchase attempt
   */
  buyShopItem(
    currentRun: RunState,
    shopItems: ShopItem[],
    itemIndex: number,
    applyUpgradeCallback: (upgradeId: string, run: RunState) => RunState,
    applyItemEffectCallback: (run: RunState, item: ItemData) => string,
    addItemToInventoryCallback: (run: RunState, item: ItemData) => boolean
  ): ShopResult {
    if (itemIndex >= shopItems.length) {
      return {
        shopOpen: true,
        shopItems,
        success: false,
        message: 'Invalid item index'
      }
    }
    
    const shopItem = shopItems[itemIndex]
    const run = { ...currentRun }
    
    // Check if player has enough gold
    if (run.gold < shopItem.cost) {
      console.log(`Not enough gold! Need ${shopItem.cost}, have ${run.gold}`)
      return {
        shopOpen: true,
        shopItems,
        success: false,
        message: `Not enough gold! Need ${shopItem.cost}, have ${run.gold}`
      }
    }
    
    // Deduct gold
    run.gold -= shopItem.cost
    
    // Remove the bought item from shop
    const newShopItems = [...shopItems]
    newShopItems.splice(itemIndex, 1)
    
    // Handle upgrades vs items
    if (shopItem.isUpgrade) {
      // Apply upgrade immediately
      const updatedRun = applyUpgradeCallback(shopItem.item.id, run)
      console.log(`Bought and applied ${shopItem.item.name} upgrade for ${shopItem.cost} gold`)
      
      return {
        shopOpen: true,
        shopItems: newShopItems,
        newRun: updatedRun,
        success: true,
        message: `Bought and applied ${shopItem.item.name} upgrade for ${shopItem.cost} gold`
      }
    } else if ((shopItem.item as ItemData).immediate) {
      // Use immediate item right away
      const message = applyItemEffectCallback(run, shopItem.item as ItemData)
      console.log(`Bought and used ${shopItem.item.name} for ${shopItem.cost} gold: ${message}`)
      
      return {
        shopOpen: true,
        shopItems: newShopItems,
        newRun: run,
        success: true,
        message: `Bought and used ${shopItem.item.name} for ${shopItem.cost} gold: ${message}`
      }
    } else {
      // Try to add item to inventory
      const success = addItemToInventoryCallback(run, shopItem.item as ItemData)
      let message: string
      
      if (!success) {
        // Special handling for auto-apply items when inventory is full
        const item = shopItem.item as ItemData
        if (item.id === 'health-potion') {
          // Auto-apply health potion effect
          let hpGain = 8
          // Apply Cleric HP gain bonus
          if (run.character) {
            const traitManager = new CharacterTraitManager()
            hpGain += traitManager.getHpGainBonus(run.character, 'healthPotion')
          }
          run.hp = Math.min(run.maxHp, run.hp + hpGain)
          message = `Bought ${shopItem.item.name} for ${shopItem.cost} gold - inventory full, auto-applied: +${hpGain} HP (${run.hp}/${run.maxHp})`
          console.log(message)
        } else if (item.id === 'mana-potion') {
          // Auto-apply mana potion effect
          run.mana = Math.min(run.maxMana, run.mana + 3)
          message = `Bought ${shopItem.item.name} for ${shopItem.cost} gold - inventory full, auto-applied: +3 mana (${run.mana}/${run.maxMana})`
          console.log(message)
        } else if (item.id === 'ward') {
          // Auto-apply ward effect
          if (!run.temporaryBuffs) run.temporaryBuffs = {}
          let wardBonus = 3
          // Apply Fighter trait bonus
          if (run.character) {
            const traitManager = new CharacterTraitManager()
            wardBonus += traitManager.getItemEffectBonus(run.character, 'ward')
          }
          run.temporaryBuffs.ward = (run.temporaryBuffs.ward || 0) + wardBonus
          if (!run.upgrades.includes('ward-temp')) {
            run.upgrades = [...run.upgrades, 'ward-temp']
          }
          message = `Bought ${shopItem.item.name} for ${shopItem.cost} gold - inventory full, auto-applied: +${wardBonus} defense (total: +${run.temporaryBuffs.ward})`
          console.log(message)
        } else if (item.id === 'blaze') {
          // Auto-apply blaze effect
          if (!run.temporaryBuffs) run.temporaryBuffs = {}
          let blazeBonus = 5
          // Apply Fighter trait bonus
          if (run.character) {
            const traitManager = new CharacterTraitManager()
            blazeBonus += traitManager.getItemEffectBonus(run.character, 'blaze')
          }
          run.temporaryBuffs.blaze = (run.temporaryBuffs.blaze || 0) + blazeBonus
          if (!run.upgrades.includes('blaze-temp')) {
            run.upgrades = [...run.upgrades, 'blaze-temp']
          }
          message = `Bought ${shopItem.item.name} for ${shopItem.cost} gold - inventory full, auto-applied: +${blazeBonus} attack (total: +${run.temporaryBuffs.blaze})`
          console.log(message)
        } else {
          message = `Bought ${shopItem.item.name} for ${shopItem.cost} gold but inventory full - item lost!`
          console.log(message)
        }
      } else {
        message = `Bought ${shopItem.item.name} for ${shopItem.cost} gold`
        console.log(message)
      }
      
      return {
        shopOpen: true,
        shopItems: newShopItems,
        newRun: run,
        success: true,
        message
      }
    }
  }

  /**
   * Close the shop
   * @returns Shop result with closed state
   */
  closeShop(): ShopResult {
    return {
      shopOpen: false,
      shopItems: []
    }
  }
}