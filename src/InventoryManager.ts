/**
 * InventoryManager - Manages inventory operations including item usage, discarding, and special items
 * This is a focused extraction for all inventory-related operations
 */

import { RunState, Board, GameState, getTileAt, TileContent } from './types'
import { removeItemFromInventory, applyItemEffect, revealTile, checkBoardStatus } from './gameLogic'
import { generateClue } from './clues'

// Deep copy utility for RunState to prevent shared object mutations
function deepCopyRunState(run: RunState): RunState {
  return {
    ...run,
    inventory: run.inventory.map(item => item ? { ...item } : null),
    temporaryBuffs: { ...run.temporaryBuffs },
    upgrades: [...run.upgrades],
    trophies: run.trophies.map(trophy => ({ ...trophy }))
  }
}

export interface InventoryItem {
  id: string
  name: string
  icon?: string
  immediate?: boolean
  multiUse?: {
    currentUses: number
    maxUses: number
  }
  description?: string
}

export interface ItemUsageResult {
  success: boolean
  message: string
  shouldRemoveItem: boolean
  updatedRun: RunState
  boardUpdated?: boolean
  activatedMode?: string
  itemIndex?: number
}

export interface DiscardResult {
  success: boolean
  updatedRun: RunState
  message: string
}

export interface CrystalBallResult {
  success: boolean
  revealedPosition?: { x: number; y: number }
  message: string
  newBoardStatus?: string
  shouldHandleTileContent?: boolean
}

export interface WhistleResult {
  success: boolean
  redistributedCount: number
  message: string
}

export class InventoryManager {
  
  // Use a specific inventory item
  useItem(
    item: InventoryItem, 
    itemIndex: number, 
    run: RunState, 
    board: Board
  ): ItemUsageResult {
    const updatedRun = deepCopyRunState(run)
    
    // Handle null/undefined items
    if (!item || !item.id) {
      return {
        success: false,
        message: 'Invalid item',
        shouldRemoveItem: false,
        updatedRun
      }
    }
    
    // Handle special items with unique logic
    switch (item.id) {
      case 'crystal-ball':
        return this.handleCrystalBallUsage(itemIndex, updatedRun, board)
      
      case 'transmute':
        return this.handleToolModeActivation('transmute', itemIndex, updatedRun)
      
      case 'detector':
        return this.handleToolModeActivation('detector', itemIndex, updatedRun)
      
      case 'ward':
        return this.handleWardUsage(itemIndex, updatedRun)
      
      case 'blaze':
        return this.handleBlazeUsage(itemIndex, updatedRun)
      
      case 'protection':
        return this.handleProtectionUsage(itemIndex, updatedRun)
      
      case 'clue':
        return this.handleClueUsage(itemIndex, updatedRun)
      
      case 'whistle':
        return this.handleWhistleUsage(itemIndex, updatedRun, board)
      
      case 'key':
        return this.handleToolModeActivation('key', itemIndex, updatedRun)
      
      case 'staff-of-fireballs':
        return this.handleToolModeActivation('staff', itemIndex, updatedRun)
      
      case 'ring-of-true-seeing':
        return this.handleRingUsage(itemIndex, updatedRun)
      
      default:
        return this.handleGenericItemUsage(item, itemIndex, updatedRun)
    }
  }
  
  // Handle crystal ball usage - reveals a random player tile
  private handleCrystalBallUsage(itemIndex: number, run: RunState, board: Board): ItemUsageResult {
    const unrevealedPlayerTiles: { x: number; y: number }[] = []
    
    // Validate board
    if (!board || !board.tiles || board.tiles.length === 0) {
      return {
        success: false,
        message: 'Crystal Ball: No valid board to reveal tiles on!',
        shouldRemoveItem: true,
        updatedRun: this.removeItemFromInventory(run, itemIndex)
      }
    }
    
    // Find all unrevealed player tiles
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = getTileAt(board, x, y)
        if (tile && tile.owner === 'player' && !tile.revealed) {
          unrevealedPlayerTiles.push({ x, y })
        }
      }
    }
    
    if (unrevealedPlayerTiles.length === 0) {
      return {
        success: false,
        message: 'Crystal Ball: No unrevealed player tiles to reveal!',
        shouldRemoveItem: true, // Still consume the item
        updatedRun: this.removeItemFromInventory(run, itemIndex)
      }
    }
    
    // Select random tile
    const randomIndex = Math.floor(Math.random() * unrevealedPlayerTiles.length)
    const tilePos = unrevealedPlayerTiles[randomIndex]
    
    return {
      success: true,
      message: `Crystal Ball: Revealing player tile at (${tilePos.x}, ${tilePos.y})`,
      shouldRemoveItem: true,
      updatedRun: this.removeItemFromInventory(run, itemIndex),
      boardUpdated: true
    }
  }
  
  // Handle tool mode activation items (transmute, detector, key, staff)
  private handleToolModeActivation(mode: string, itemIndex: number, run: RunState): ItemUsageResult {
    const modeMessages = {
      transmute: 'Transmute activated! Click any unrevealed tile to convert it to your tile.',
      detector: 'Detector activated! Click any unrevealed tile to see adjacent tile info.',
      key: 'Key activated! Click any locked tile to unlock it.',
      staff: 'Staff of Fireballs activated! Click any monster to attack it.'
    }
    
    return {
      success: true,
      message: modeMessages[mode] || `${mode} mode activated!`,
      shouldRemoveItem: false, // Item will be consumed when mode is used
      updatedRun: run,
      activatedMode: mode,
      itemIndex
    }
  }
  
  // Handle ward usage - adds defense buff
  private handleWardUsage(itemIndex: number, run: RunState): ItemUsageResult {
    const updatedRun = deepCopyRunState(run)
    updatedRun.temporaryBuffs.ward = (updatedRun.temporaryBuffs.ward || 0) + 4
    
    if (!updatedRun.upgrades.includes('ward-temp')) {
      updatedRun.upgrades.push('ward-temp')
    }
    
    return {
      success: true,
      message: `Ward activated! +4 defense (total: +${updatedRun.temporaryBuffs.ward}) for your next fight.`,
      shouldRemoveItem: true,
      updatedRun: this.removeItemFromInventory(updatedRun, itemIndex)
    }
  }
  
  // Handle blaze usage - adds attack buff
  private handleBlazeUsage(itemIndex: number, run: RunState): ItemUsageResult {
    const updatedRun = deepCopyRunState(run)
    updatedRun.temporaryBuffs.blaze = (updatedRun.temporaryBuffs.blaze || 0) + 5
    
    if (!updatedRun.upgrades.includes('blaze-temp')) {
      updatedRun.upgrades.push('blaze-temp')
    }
    
    return {
      success: true,
      message: `Blaze activated! +5 attack (total: +${updatedRun.temporaryBuffs.blaze}) for your next fight.`,
      shouldRemoveItem: true,
      updatedRun: this.removeItemFromInventory(updatedRun, itemIndex)
    }
  }
  
  // Handle protection usage - adds turn protection
  private handleProtectionUsage(itemIndex: number, run: RunState): ItemUsageResult {
    const updatedRun = deepCopyRunState(run)
    updatedRun.temporaryBuffs.protection = (updatedRun.temporaryBuffs.protection || 0) + 1
    
    return {
      success: true,
      message: `Protection activated! Next ${updatedRun.temporaryBuffs.protection} opponent/neutral reveal(s) won't end your turn.`,
      shouldRemoveItem: true,
      updatedRun: this.removeItemFromInventory(updatedRun, itemIndex)
    }
  }
  
  // Handle clue usage - grants additional clue
  private handleClueUsage(itemIndex: number, run: RunState): ItemUsageResult {
    return {
      success: true,
      message: 'Clue used! You have gained an additional clue.',
      shouldRemoveItem: true,
      updatedRun: this.removeItemFromInventory(run, itemIndex)
    }
  }
  
  // Handle whistle usage - redistributes monsters
  private handleWhistleUsage(itemIndex: number, run: RunState, board: Board): ItemUsageResult {
    const result = this.redistributeMonsters(board)
    
    return {
      success: result.success,
      message: result.message,
      shouldRemoveItem: true,
      updatedRun: this.removeItemFromInventory(run, itemIndex),
      boardUpdated: result.success
    }
  }
  
  // Handle ring usage - activates ring targeting mode
  private handleRingUsage(itemIndex: number, run: RunState): ItemUsageResult {
    return {
      success: true,
      message: 'Ring targeting mode activated.',
      shouldRemoveItem: false, // Item will be consumed when mode is used
      updatedRun: run,
      activatedMode: 'ring',
      itemIndex
    }
  }
  
  // Handle generic item usage with applyItemEffect
  private handleGenericItemUsage(item: InventoryItem, itemIndex: number, run: RunState): ItemUsageResult {
    // Apply the item effect
    const updatedRun = deepCopyRunState(run)
    const message = applyItemEffect(updatedRun, item)
    
    return {
      success: true,
      message,
      shouldRemoveItem: true,
      updatedRun: this.removeItemFromInventory(updatedRun, itemIndex)
    }
  }
  
  // Redistribute monsters on the board (whistle functionality)
  redistributeMonsters(board: Board): WhistleResult {
    // Validate board
    if (!board || !board.tiles || board.tiles.length === 0) {
      return {
        success: false,
        redistributedCount: 0,
        message: 'Whistle: No valid board to redistribute monsters on!'
      }
    }
    
    // First, find all monsters and count empty tiles BEFORE moving anything
    const monsterPositions: Array<{ x: number; y: number; monster: any }> = []
    let emptyTileCount = 0
    
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = getTileAt(board, x, y)
        if (tile && !tile.revealed) {
          if (tile.content === TileContent.Monster && tile.monsterData) {
            monsterPositions.push({ x, y, monster: tile.monsterData })
          } else if (tile.content === TileContent.Empty) {
            emptyTileCount++
          }
        }
      }
    }
    
    if (monsterPositions.length === 0) {
      return {
        success: false,
        redistributedCount: 0,
        message: 'Whistle: No monsters found to redistribute!'
      }
    }
    
    // Check if we have any empty tiles BEFORE we clear the monster tiles
    if (emptyTileCount === 0) {
      return {
        success: false,
        redistributedCount: 0,
        message: 'Whistle: No available tiles to place monsters!'
      }
    }
    
    // Now clear all monster tiles and collect their data
    const monsters: any[] = []
    for (const pos of monsterPositions) {
      const tile = getTileAt(board, pos.x, pos.y)
      if (tile) {
        monsters.push(pos.monster)
        tile.content = TileContent.Empty
        tile.monsterData = undefined
      }
    }
    
    // Find available empty tiles (including the newly cleared ones)
    const availableTiles: { x: number; y: number }[] = []
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = getTileAt(board, x, y)
        if (tile && !tile.revealed && tile.content === TileContent.Empty) {
          availableTiles.push({ x, y })
        }
      }
    }
    
    if (availableTiles.length === 0) {
      return {
        success: false,
        redistributedCount: 0,
        message: 'Whistle: No available tiles to place monsters!'
      }
    }
    
    // Place monsters in random available locations
    for (const monster of monsters) {
      if (availableTiles.length === 0) break // No more tiles available
      
      const randomIndex = Math.floor(Math.random() * availableTiles.length)
      const tilePos = availableTiles.splice(randomIndex, 1)[0]
      const tile = getTileAt(board, tilePos.x, tilePos.y)
      
      if (tile) {
        tile.content = TileContent.Monster
        tile.monsterData = monster
      }
    }
    
    return {
      success: true,
      redistributedCount: monsters.length,
      message: `Whistle: Redistributed ${monsters.length} monsters to new locations!`
    }
  }
  
  // Remove item from inventory
  removeItemFromInventory(run: RunState, index: number): RunState {
    const updatedRun = deepCopyRunState(run)
    removeItemFromInventory(updatedRun, index)
    return updatedRun
  }
  
  // Discard item from inventory
  discardItem(run: RunState, index: number): DiscardResult {
    if (index < 0 || index >= run.inventory.length) {
      return {
        success: false,
        updatedRun: run,
        message: 'Invalid inventory index'
      }
    }
    
    const item = run.inventory[index]
    const updatedRun = this.removeItemFromInventory(run, index)
    
    return {
      success: true,
      updatedRun,
      message: `Discarded ${item?.name || 'item'}`
    }
  }
  
  // Check if inventory has space
  hasInventorySpace(run: RunState): boolean {
    const maxSlots = 3 + run.upgrades.filter(id => id === 'bag').length
    return run.inventory.length < maxSlots
  }
  
  // Get inventory capacity
  getInventoryCapacity(run: RunState): { current: number; max: number } {
    const maxSlots = 3 + run.upgrades.filter(id => id === 'bag').length
    return {
      current: run.inventory.length,
      max: maxSlots
    }
  }
  
  // Validate item index
  isValidItemIndex(run: RunState, index: number): boolean {
    return index >= 0 && index < run.inventory.length
  }
  
  // Get item by index
  getItem(run: RunState, index: number): InventoryItem | null {
    if (!this.isValidItemIndex(run, index)) {
      return null
    }
    return run.inventory[index]
  }
  
  // Check if item is multi-use
  isMultiUseItem(item: InventoryItem): boolean {
    return Boolean(item.multiUse && item.multiUse.currentUses > 0)
  }
  
  // Update multi-use item charges
  updateMultiUseItem(run: RunState, itemIndex: number, chargesUsed: number = 1): { updatedRun: RunState; shouldRemove: boolean } {
    const updatedRun = { ...run, inventory: [...run.inventory] }
    const item = updatedRun.inventory[itemIndex]
    
    if (!item || !item.multiUse) {
      return { updatedRun: deepCopyRunState(run), shouldRemove: false }
    }
    
    item.multiUse.currentUses -= chargesUsed
    const shouldRemove = item.multiUse.currentUses <= 0
    
    if (shouldRemove) {
      return {
        updatedRun: this.removeItemFromInventory(updatedRun, itemIndex),
        shouldRemove: true
      }
    }
    
    return { updatedRun, shouldRemove: false }
  }
  
  // Get inventory summary for UI
  getInventorySummary(run: RunState): {
    items: Array<{ name: string; icon?: string; usesRemaining?: string }>
    capacity: string
    hasSpace: boolean
  } {
    const capacity = this.getInventoryCapacity(run)
    
    const items = run.inventory.map(item => ({
      name: item.name,
      icon: item.icon,
      usesRemaining: item.multiUse ? `${item.multiUse.currentUses}/${item.multiUse.maxUses}` : undefined
    }))
    
    return {
      items,
      capacity: `${capacity.current}/${capacity.max}`,
      hasSpace: this.hasInventorySpace(run)
    }
  }
}