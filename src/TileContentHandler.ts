/**
 * TileContentHandler - Manages tile content interaction logic
 * Extracted from store.ts to isolate tile content handling concerns
 */

import { TileContent } from './types'
import { fightMonster, addItemToInventory, applyItemEffect } from './gameLogic'

export interface TileContentResult {
  shouldTriggerUpgradeChoice?: boolean
  shouldOpenShop?: boolean
  shouldDie?: boolean
  shouldUpdateRunState?: boolean
  message?: string
  runStateChanges?: any
}

export interface TileContentContext {
  run: any
  stealGoldTrophy: (monsterName: string) => boolean
  applyRichUpgrade: (x: number, y: number) => Promise<void>
}

export class TileContentHandler {
  
  // Handle tile content when revealed
  handleTileContent(tile: any, context: TileContentContext): TileContentResult {
    const { run } = context
    const result: TileContentResult = {}
    
    if (tile.content === TileContent.PermanentUpgrade && tile.upgradeData) {
      // Trigger upgrade choice widget
      result.shouldTriggerUpgradeChoice = true
      result.message = 'Found upgrade! Choose your enhancement.'
      
    } else if (tile.content === TileContent.Item && tile.itemData) {
      const item = tile.itemData
      
      if (item.immediate) {
        // Apply immediate effect
        const message = applyItemEffect(run, item)
        result.message = message
        
        // Check for game over after immediate effects (like bear trap)
        if (run.hp <= 0) {
          result.shouldDie = true
          result.message = 'Player died! Game over.'
          return result
        }
        
        // Handle shop opening
        if (item.id === 'shop') {
          result.shouldOpenShop = true
        }
        
        result.shouldUpdateRunState = true
        
      } else {
        // Try to add to inventory
        const success = addItemToInventory(run, item)
        if (!success) {
          // Inventory full - check if this is an item that can be auto-applied
          const autoApplyResult = this.handleInventoryFullAutoApply(run, item)
          result.message = autoApplyResult.message
          if (autoApplyResult.applied) {
            result.shouldUpdateRunState = true
          }
        } else {
          result.shouldUpdateRunState = true
        }
      }
      
    } else if (tile.content === TileContent.Monster && tile.monsterData) {
      const monsterResult = this.handleMonsterContent(tile, context)
      return monsterResult
    }
    
    return result
  }
  
  // Handle monster content specifically
  private handleMonsterContent(tile: any, context: TileContentContext): TileContentResult {
    const { run, stealGoldTrophy, applyRichUpgrade } = context
    const monster = tile.monsterData
    const damage = fightMonster(monster, run)
    const newHp = run.hp - damage
    
    // Check if player would die from this damage
    if (newHp <= 0) {
      // Try to steal a gold trophy to prevent death
      if (stealGoldTrophy(monster.name)) {
        run.hp = 1 // Survive with 1 HP instead of taking full damage
        return {
          shouldUpdateRunState: true,
          message: `${monster.name} stole a gold trophy! You survive with 1 HP.`
        }
      } else {
        run.hp = newHp // Apply the lethal damage
        return {
          shouldDie: true,
          message: 'Player died! Game over.'
        }
      }
    } else {
      // Apply damage normally and award loot
      run.hp = newHp
      run.gold += run.loot
      
      // RICH upgrade: add gold items to adjacent tiles when defeating monsters
      if (run.upgrades.includes('rich')) {
        applyRichUpgrade(tile.x, tile.y).catch(console.error)
      }
      
      return {
        shouldUpdateRunState: true,
        message: `Fought ${monster.name}! Took ${damage} damage, gained ${run.loot} gold. HP: ${run.hp}/${run.maxHp}`
      }
    }
  }
  
  // Handle auto-apply when inventory is full
  private handleInventoryFullAutoApply(run: any, item: any): { applied: boolean; message: string } {
    if (item.id === 'ward') {
      // Apply ward effect immediately
      run.temporaryBuffs.ward = (run.temporaryBuffs.ward || 0) + 4
      if (!run.upgrades.includes('ward-temp')) {
        run.upgrades.push('ward-temp') // Add to upgrades list for display
      }
      return {
        applied: true,
        message: `Inventory full! Ward auto-applied: +4 defense (total: +${run.temporaryBuffs.ward}) for your next fight.`
      }
    } else if (item.id === 'blaze') {
      // Apply blaze effect immediately
      run.temporaryBuffs.blaze = (run.temporaryBuffs.blaze || 0) + 5
      if (!run.upgrades.includes('blaze-temp')) {
        run.upgrades.push('blaze-temp') // Add to upgrades list for display
      }
      return {
        applied: true,
        message: `Inventory full! Blaze auto-applied: +5 attack (total: +${run.temporaryBuffs.blaze}) for your next fight.`
      }
    } else {
      return {
        applied: false,
        message: `Inventory full! ${item.name} was lost.`
      }
    }
  }
}