/**
 * TileContentManager - Handles processing tile contents when revealed
 * This manages monsters, items, upgrades, shops, traps, and gold when tiles are revealed
 */

import { RunState, Board, Tile, TileContent, getTileAt } from './types'
import { addItemToInventory, applyItemEffect, fightMonster } from './gameLogic'
import { CHEST } from './items'

export interface TileContentResult {
  success: boolean
  message: string
  updatedRun: RunState
  triggerUpgradeChoice?: boolean
  triggerShop?: boolean
  playerDied?: boolean
  boardModified?: boolean
  preventAI?: boolean // Prevent AI turn until choice is made
}

export interface MonsterFightResult {
  success: boolean
  damage: number
  monsterDefeated: boolean
  playerDied: boolean
  survivedViaTrophy?: boolean
  stolenTrophyMonster?: string
  lootGained?: number
  richEffectTriggered?: boolean
  updatedRun: RunState
}

export interface RichEffectResult {
  success: boolean
  chestPlaced: boolean
  placementPosition?: { x: number; y: number }
  message: string
}

export class TileContentManager {
  
  // Process tile content when revealed
  handleTileContent(tile: Tile, run: RunState, board: Board): TileContentResult {
    const updatedRun = { ...run }
    
    console.log('TileContentManager.handleTileContent called with tile:', {
      x: tile.x,
      y: tile.y,
      content: tile.content,
      owner: tile.owner
    })
    
    switch (tile.content) {
      case TileContent.PermanentUpgrade:
        console.log('Handling PermanentUpgrade tile')
        return this.handleUpgradeTile(tile, updatedRun)
      
      case TileContent.Item:
        console.log('Handling Item tile')
        return this.handleItemTile(tile, updatedRun)
      
      case TileContent.Monster:
        console.log('Handling Monster tile')
        return this.handleMonsterTile(tile, updatedRun, board)
      
      case TileContent.Shop:
        console.log('Handling Shop tile - should return triggerShop: true')
        return this.handleShopTile(tile, updatedRun)
      
      case TileContent.Gold:
        console.log('Handling Gold tile')
        return this.handleGoldTile(tile, updatedRun)
      
      case TileContent.Trap:
        console.log('Handling Trap tile')
        return this.handleTrapTile(tile, updatedRun)
      
      case TileContent.Empty:
      default:
        console.log('Handling Empty/default tile')
        return {
          success: true,
          message: 'Empty tile revealed',
          updatedRun
        }
    }
  }
  
  // Handle upgrade tiles - trigger upgrade choice
  private handleUpgradeTile(tile: Tile, run: RunState): TileContentResult {
    return {
      success: true,
      message: 'Found upgrade! Choose your enhancement.',
      updatedRun: run,
      triggerUpgradeChoice: true,
      preventAI: true // Prevent AI turn until upgrade is chosen
    }
  }
  
  // Handle item tiles - add to inventory or apply immediately
  private handleItemTile(tile: Tile, run: RunState): TileContentResult {
    if (!tile.itemData) {
      return {
        success: false,
        message: 'Invalid item data',
        updatedRun: run
      }
    }
    
    const item = tile.itemData
    const updatedRun = { ...run }
    
    if (item.immediate) {
      // Apply immediate effect using gameLogic
      const message = applyItemEffect(updatedRun, item)
      
      // Check for game over after immediate effects (like bear trap)
      if (updatedRun.hp <= 0) {
        return {
          success: true,
          message,
          updatedRun,
          playerDied: true
        }
      }
      
      return {
        success: true,
        message,
        updatedRun
      }
    } else {
      // Try to add to inventory
      const inventoryFull = !this.hasInventorySpace(updatedRun)
      
      if (inventoryFull) {
        // Inventory full - check if this is an item that can be auto-applied
        if (item.id === 'ward') {
          // Apply ward effect immediately
          updatedRun.temporaryBuffs.ward = (updatedRun.temporaryBuffs.ward || 0) + 4
          if (!updatedRun.upgrades.includes('ward-temp')) {
            updatedRun.upgrades.push('ward-temp')
          }
          return {
            success: true,
            message: `Inventory full! Ward auto-applied: +4 defense (total: +${updatedRun.temporaryBuffs.ward}) for your next fight.`,
            updatedRun
          }
        } else if (item.id === 'blaze') {
          // Apply blaze effect immediately
          updatedRun.temporaryBuffs.blaze = (updatedRun.temporaryBuffs.blaze || 0) + 5
          if (!updatedRun.upgrades.includes('blaze-temp')) {
            updatedRun.upgrades.push('blaze-temp')
          }
          return {
            success: true,
            message: `Inventory full! Blaze auto-applied: +5 attack (total: +${updatedRun.temporaryBuffs.blaze}) for your next fight.`,
            updatedRun
          }
        } else {
          return {
            success: false,
            message: `Inventory full! Could not pick up ${item.name}.`,
            updatedRun
          }
        }
      }
      
      // Add item to inventory
      addItemToInventory(updatedRun, item)
      return {
        success: true,
        message: `Picked up ${item.name}!`,
        updatedRun
      }
    }
  }
  
  // Handle monster tiles - fight the monster
  private handleMonsterTile(tile: Tile, run: RunState, board: Board): TileContentResult {
    if (!tile.monsterData) {
      return {
        success: false,
        message: 'Invalid monster data',
        updatedRun: run
      }
    }
    
    const fightResult = this.fightMonster(tile.monsterData, run, board, tile.x, tile.y)
    
    return {
      success: fightResult.success,
      message: this.buildMonsterMessage(fightResult),
      updatedRun: fightResult.updatedRun,
      playerDied: fightResult.playerDied,
      boardModified: fightResult.richEffectTriggered || fightResult.monsterDefeated
    }
  }
  
  // Handle shop tiles - open shop
  private handleShopTile(tile: Tile, run: RunState): TileContentResult {
    return {
      success: true,
      message: 'Shop discovered! Browse items and upgrades.',
      updatedRun: run,
      triggerShop: true
    }
  }
  
  // Handle gold tiles - award gold
  private handleGoldTile(tile: Tile, run: RunState): TileContentResult {
    const updatedRun = { ...run }
    const goldAmount = 3 // Base gold amount
    updatedRun.gold += goldAmount
    
    return {
      success: true,
      message: `Found ${goldAmount} gold!`,
      updatedRun
    }
  }
  
  // Handle trap tiles - apply damage
  private handleTrapTile(tile: Tile, run: RunState): TileContentResult {
    let updatedRun = { ...run }
    const trapDamage = 10 // Base trap damage
    
    // Check if player would die from trap damage
    if (updatedRun.hp <= trapDamage) {
      // Try to steal a gold trophy to prevent death
      const stealResult = this.stealGoldTrophy(updatedRun, 'Bear Trap')
      if (stealResult.success) {
        updatedRun = stealResult.updatedRun // Use the updated run with stolen trophy
        updatedRun.hp = 1 // Survive with 1 HP
        return {
          success: true,
          message: `Bear Trap triggered! A gold trophy was stolen but you survive with 1 HP.`,
          updatedRun
        }
      } else {
        // No gold trophy to steal - player dies
        updatedRun.hp = 0
        return {
          success: true,
          message: `Bear Trap triggered! You take ${trapDamage} damage and die.`,
          updatedRun,
          playerDied: true
        }
      }
    } else {
      // Apply damage normally
      updatedRun.hp -= trapDamage
      return {
        success: true,
        message: `Bear Trap triggered! You take ${trapDamage} damage.`,
        updatedRun
      }
    }
  }
  
  // Fight a monster and determine outcome
  fightMonster(monster: any, run: RunState, board: Board, tileX: number, tileY: number): MonsterFightResult {
    let updatedRun = { ...run }
    
    // Fight the monster using gameLogic
    const { damage: damageTaken, monsterDefeated } = fightMonster(updatedRun, monster)
    
    // Check if player would die from this damage
    const newHp = updatedRun.hp - damageTaken
    let playerDied = false
    let survivedViaTrophy = false
    let stolenTrophyMonster = undefined
    
    if (newHp <= 0) {
      // Try to steal a gold trophy to prevent death
      const stealResult = this.stealGoldTrophy(updatedRun, monster.name)
      if (stealResult.success) {
        updatedRun = stealResult.updatedRun // Use the updated run with stolen trophy
        updatedRun.hp = 1 // Survive with 1 HP instead of taking full damage
        survivedViaTrophy = true
        stolenTrophyMonster = monster.name
        // No loot or Rich upgrade when saved by trophy theft
      } else {
        updatedRun.hp = newHp // Apply the lethal damage
        playerDied = true
      }
    } else {
      updatedRun.hp = newHp // Apply damage normally
      
      if (monsterDefeated) {
        // Award loot bonus for defeating the monster
        updatedRun.gold += updatedRun.loot
      }
    }
    
    // Apply RICH upgrade effect if monster was defeated and player didn't die
    let richEffectTriggered = false
    if (monsterDefeated && !playerDied && !survivedViaTrophy) {
      const richResult = this.applyRichEffect(board, tileX, tileY, updatedRun)
      richEffectTriggered = richResult.success
    }
    
    return {
      success: true,
      damage: damageTaken,
      monsterDefeated,
      playerDied,
      survivedViaTrophy,
      stolenTrophyMonster,
      lootGained: monsterDefeated && !survivedViaTrophy ? updatedRun.loot : 0,
      richEffectTriggered,
      updatedRun
    }
  }
  
  // Apply RICH upgrade effect: place a single treasure chest on an adjacent tile
  applyRichEffect(board: Board, centerX: number, centerY: number, run: RunState): RichEffectResult {
    // Check if player has RICH upgrade
    const hasRich = run.upgrades.includes('rich')
    if (!hasRich) {
      return {
        success: false,
        chestPlaced: false,
        message: 'No RICH upgrade to apply'
      }
    }
    
    // Use the imported CHEST item
    
    // Collect all valid adjacent positions
    const adjacentPositions: { x: number; y: number }[] = []
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue // Skip center tile
        
        const adjX = centerX + dx
        const adjY = centerY + dy
        const adjTile = getTileAt(board, adjX, adjY)
        
        if (adjTile && !adjTile.revealed && adjTile.content === TileContent.Empty) {
          // Only consider unrevealed empty tiles
          adjacentPositions.push({ x: adjX, y: adjY })
        }
      }
    }
    
    // Place chest on exactly one random adjacent tile (if any exist)
    if (adjacentPositions.length > 0) {
      const randomIndex = Math.floor(Math.random() * adjacentPositions.length)
      const chestPosition = adjacentPositions[randomIndex]
      const chestTile = getTileAt(board, chestPosition.x, chestPosition.y)
      
      if (chestTile) {
        chestTile.content = TileContent.Item
        chestTile.itemData = CHEST
        chestTile.contentVisible = true // Make the chest visible
        
        return {
          success: true,
          chestPlaced: true,
          placementPosition: chestPosition,
          message: `RICH upgrade: Treasure chest placed at (${chestPosition.x}, ${chestPosition.y})`
        }
      }
    }
    
    return {
      success: false,
      chestPlaced: false,
      message: 'No adjacent tiles available for RICH chest placement'
    }
  }
  
  // Steal a gold trophy when player would die
  stealGoldTrophy(run: RunState, monsterName: string): { success: boolean; updatedRun: RunState } {
    const goldTrophyIndex = run.trophies.findIndex(t => t.type === 'gold' && !t.stolen)
    
    if (goldTrophyIndex !== -1) {
      const updatedRun = { ...run }
      const newTrophies = [...updatedRun.trophies]
      newTrophies[goldTrophyIndex] = {
        ...newTrophies[goldTrophyIndex],
        stolen: true,
        stolenBy: monsterName
      }
      updatedRun.trophies = newTrophies
      
      return {
        success: true,
        updatedRun
      }
    }
    
    return {
      success: false,
      updatedRun: run
    }
  }
  
  // Check if inventory has space
  private hasInventorySpace(run: RunState): boolean {
    const maxSlots = 3 + run.upgrades.filter(id => id === 'bag').length
    return run.inventory.length < maxSlots
  }
  
  // Build message for monster fight results
  private buildMonsterMessage(fightResult: MonsterFightResult): string {
    if (fightResult.playerDied) {
      return `Monster defeated you! You take ${fightResult.damage} damage and die.`
    }
    
    if (fightResult.survivedViaTrophy) {
      return `${fightResult.stolenTrophyMonster} stole a gold trophy! You survive with 1 HP.`
    }
    
    if (fightResult.monsterDefeated) {
      let message = `Monster defeated! You take ${fightResult.damage} damage and gain ${fightResult.lootGained} gold.`
      if (fightResult.richEffectTriggered) {
        message += ' RICH upgrade triggered!'
      }
      return message
    } else {
      return `You take ${fightResult.damage} damage from the monster.`
    }
  }
  
  // Validate tile content data
  validateTileContent(tile: Tile): { valid: boolean; reason?: string } {
    switch (tile.content) {
      case TileContent.Monster:
        if (!tile.monsterData) {
          return { valid: false, reason: 'Monster tile missing monster data' }
        }
        break
      
      case TileContent.Item:
        if (!tile.itemData) {
          return { valid: false, reason: 'Item tile missing item data' }
        }
        break
      
      case TileContent.PermanentUpgrade:
        if (!tile.upgradeData) {
          return { valid: false, reason: 'Upgrade tile missing upgrade data' }
        }
        break
    }
    
    return { valid: true }
  }
  
  // Get content summary for a tile
  getTileContentSummary(tile: Tile): string {
    switch (tile.content) {
      case TileContent.Monster:
        return tile.monsterData ? `Monster: ${tile.monsterData.name} (${tile.monsterData.hp} HP)` : 'Unknown Monster'
      
      case TileContent.Item:
        return tile.itemData ? `Item: ${tile.itemData.name}` : 'Unknown Item'
      
      case TileContent.PermanentUpgrade:
        return tile.upgradeData ? `Upgrade: ${tile.upgradeData.name}` : 'Unknown Upgrade'
      
      case TileContent.Shop:
        return 'Shop'
      
      case TileContent.Gold:
        return 'Gold (3)'
      
      case TileContent.Trap:
        return 'Bear Trap (10 damage)'
      
      case TileContent.Empty:
      default:
        return 'Empty'
    }
  }
}