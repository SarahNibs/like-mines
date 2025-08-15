/**
 * InventoryManager - Manages inventory item usage and special item effects
 * Extracted from store.ts to isolate inventory interaction concerns
 */

import { removeItemFromInventory, addItemToInventory, applyItemEffect } from './gameLogic'
import { generateClue } from './clues'

export interface InventoryContext {
  run: any
  board: any
  triggerTransmuteMode: (itemIndex: number) => void
  triggerDetectorMode: (itemIndex: number) => void
  triggerKeyMode: (itemIndex: number) => void
  triggerStaffMode: (itemIndex: number) => void
  triggerRingMode: (itemIndex: number) => void
  updateState: (updates: any) => void
}

export interface InventoryItemResult {
  success: boolean
  message?: string
  shouldUpdateState?: boolean
  shouldRemoveItem?: boolean
  stateUpdates?: any
}

export class InventoryManager {
  
  // Use item from inventory by index
  useInventoryItem(itemIndex: number, context: InventoryContext): InventoryItemResult {
    const { run } = context
    const item = run.inventory[itemIndex]
    
    if (!item) {
      return { success: false, message: 'No item in this slot' }
    }
    
    // Handle special items that don't get consumed immediately
    if (item.id === 'crystal-ball') {
      return this.useCrystalBall(itemIndex, context)
    } else if (item.id === 'transmute') {
      context.triggerTransmuteMode(itemIndex)
      return { success: true, message: 'Transmute activated! Click any unrevealed tile to convert it to your tile.' }
    } else if (item.id === 'detector') {
      context.triggerDetectorMode(itemIndex)
      return { success: true, message: 'Detector activated! Click any unrevealed tile to see adjacent tile info.' }
    } else if (item.id === 'key') {
      context.triggerKeyMode(itemIndex)
      return { success: true, message: 'Key activated! Click any locked tile to unlock it.' }
    } else if (item.id === 'staff-of-fireballs') {
      context.triggerStaffMode(itemIndex)
      return { success: true, message: 'Staff of Fireballs activated! Click any monster to attack it.' }
    } else if (item.id === 'ring-of-true-seeing') {
      context.triggerRingMode(itemIndex)
      return { success: true, message: 'Ring targeting mode activated.' }
    }
    
    // Handle consumable items
    return this.useConsumableItem(item, itemIndex, context)
  }
  
  // Use crystal ball (special case - removes item first then reveals tile)
  private useCrystalBall(itemIndex: number, context: InventoryContext): InventoryItemResult {
    const { run, board } = context
    
    // Remove the crystal ball BEFORE revealing the tile to free up inventory space
    removeItemFromInventory(run, itemIndex)
    
    // Find all unrevealed player tiles
    const unrevealedPlayerTiles = []
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x]
        if (tile.owner === 'player' && !tile.revealed) {
          unrevealedPlayerTiles.push({ x, y })
        }
      }
    }
    
    if (unrevealedPlayerTiles.length === 0) {
      return {
        success: true,
        shouldUpdateState: true,
        shouldRemoveItem: false, // Already removed
        message: 'Crystal Ball: No unrevealed player tiles to reveal!',
        stateUpdates: { run: { ...run } }
      }
    }
    
    // Pick a random unrevealed player tile
    const randomIndex = Math.floor(Math.random() * unrevealedPlayerTiles.length)
    const tilePos = unrevealedPlayerTiles[randomIndex]
    
    return {
      success: true,
      shouldUpdateState: true,
      shouldRemoveItem: false, // Already removed
      message: `Crystal Ball: Revealing player tile at (${tilePos.x}, ${tilePos.y})`,
      stateUpdates: { 
        run: { ...run },
        crystalBallTarget: tilePos // Pass target to be handled by caller
      }
    }
  }
  
  // Use consumable items (ward, blaze, protection, clue, etc.)
  private useConsumableItem(item: any, itemIndex: number, context: InventoryContext): InventoryItemResult {
    const { run, board } = context
    
    if (item.id === 'ward') {
      // Stack ward bonuses
      run.temporaryBuffs.ward = (run.temporaryBuffs.ward || 0) + 4
      if (!run.upgrades.includes('ward-temp')) {
        run.upgrades.push('ward-temp') // Add to upgrades list for display
      }
      
      return {
        success: true,
        shouldUpdateState: true,
        shouldRemoveItem: true,
        message: `Ward activated! +4 defense (total: +${run.temporaryBuffs.ward}) for your next fight.`,
        stateUpdates: { run: { ...run } }
      }
      
    } else if (item.id === 'blaze') {
      // Stack blaze bonuses
      run.temporaryBuffs.blaze = (run.temporaryBuffs.blaze || 0) + 5
      if (!run.upgrades.includes('blaze-temp')) {
        run.upgrades.push('blaze-temp') // Add to upgrades list for display
      }
      
      return {
        success: true,
        shouldUpdateState: true,
        shouldRemoveItem: true,
        message: `Blaze activated! +5 attack (total: +${run.temporaryBuffs.blaze}) for your next fight.`,
        stateUpdates: { run: { ...run } }
      }
      
    } else if (item.id === 'protection') {
      // Stack protection charges
      run.temporaryBuffs.protection = (run.temporaryBuffs.protection || 0) + 1
      
      return {
        success: true,
        shouldUpdateState: true,
        shouldRemoveItem: true,
        message: `Protection activated! Next ${run.temporaryBuffs.protection} opponent/neutral reveal(s) won't end your turn.`,
        stateUpdates: { run: { ...run } }
      }
      
    } else if (item.id === 'clue') {
      // Grant additional clue
      const newClue = generateClue(board, run.upgrades)
      
      return {
        success: true,
        shouldUpdateState: true,
        shouldRemoveItem: true,
        message: 'Clue used! You have gained an additional clue.',
        stateUpdates: { 
          run: { ...run },
          additionalClue: newClue // Pass new clue to be added by caller
        }
      }
      
    } else if (item.id === 'whistle') {
      return this.useWhistle(context)
      
    } else {
      // Generic item effect
      const message = applyItemEffect(run, item)
      
      return {
        success: true,
        shouldUpdateState: true,
        shouldRemoveItem: true,
        message,
        stateUpdates: { run: { ...run } }
      }
    }
  }
  
  // Whistle functionality - redistribute all monsters to random unrevealed tiles
  private useWhistle(context: InventoryContext): InventoryItemResult {
    const { board } = context
    const monsters = []
    const originalMonsterPositions = new Set<string>()
    
    // Find all monsters on unrevealed tiles and collect their data
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x]
        if (tile.content === 'monster' && !tile.revealed && tile.monsterData) {
          monsters.push(tile.monsterData)
          originalMonsterPositions.add(`${x},${y}`)
          // Clear the monster from this tile
          tile.content = 'empty'
          tile.monsterData = undefined
        }
      }
    }
    
    if (monsters.length === 0) {
      return {
        success: true,
        shouldUpdateState: true,
        shouldRemoveItem: true,
        message: 'Whistle: No monsters found to redistribute!',
        stateUpdates: { board: { ...board } }
      }
    }
    
    // Find all unrevealed tiles that can hold monsters (excluding original positions)
    const availableTiles = []
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x]
        const posKey = `${x},${y}`
        if (!tile.revealed && tile.content === 'empty' && !originalMonsterPositions.has(posKey)) {
          availableTiles.push({ x, y })
        }
      }
    }
    
    if (availableTiles.length === 0) {
      return {
        success: true,
        shouldUpdateState: true,
        shouldRemoveItem: true,
        message: 'Whistle: No available tiles to place monsters!',
        stateUpdates: { board: { ...board } }
      }
    }
    
    // Redistribute monsters to random available tiles
    for (const monster of monsters) {
      if (availableTiles.length === 0) break // No more tiles available
      
      const randomIndex = Math.floor(Math.random() * availableTiles.length)
      const tilePos = availableTiles.splice(randomIndex, 1)[0]
      const tile = board.tiles[tilePos.y][tilePos.x]
      
      tile.content = 'monster'
      tile.monsterData = monster
    }
    
    return {
      success: true,
      shouldUpdateState: true,
      shouldRemoveItem: true,
      message: `Whistle: Redistributed ${monsters.length} monsters to new locations!`,
      stateUpdates: { board: { ...board } }
    }
  }
  
  // Discard item from inventory
  discardItem(itemIndex: number, run: any): { success: boolean; message: string; newRun: any } {
    const item = run.inventory[itemIndex]
    if (!item) {
      return {
        success: false,
        message: 'No item in this slot',
        newRun: run
      }
    }
    
    const itemName = item.name
    removeItemFromInventory(run, itemIndex)
    
    return {
      success: true,
      message: `Discarded ${itemName}`,
      newRun: { ...run }
    }
  }
  
  // Check if item can be used
  canUseItem(itemIndex: number, run: any): { canUse: boolean; reason?: string } {
    const item = run.inventory[itemIndex]
    
    if (!item) {
      return { canUse: false, reason: 'No item in this slot' }
    }
    
    // Most items can always be used
    return { canUse: true }
  }
  
  // Get item usage description
  getItemUsageDescription(item: any): string {
    const descriptions: { [key: string]: string } = {
      'ward': 'Grants +4 defense for your next fight',
      'blaze': 'Grants +5 attack for your next fight',  
      'protection': 'Next opponent/neutral reveal won\'t end your turn',
      'clue': 'Grants an additional clue',
      'crystal-ball': 'Reveals a random player tile',
      'transmute': 'Convert any unrevealed tile to your tile',
      'detector': 'Scan a 3x3 area to see tile ownership',
      'key': 'Unlock a chained tile',
      'staff-of-fireballs': 'Deal 6 damage to any monster',
      'ring-of-true-seeing': 'Remove fog from tiles',
      'whistle': 'Redistribute all monsters to new locations'
    }
    
    return descriptions[item.id] || item.description || 'Use this item'
  }
}