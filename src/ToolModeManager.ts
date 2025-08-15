/**
 * ToolModeManager - Manages special tool modes (transmute, detector, key, staff, ring)
 * This handles the logic for tool-based interactions that modify tiles or reveal information
 */

import { Board, RunState, TileContent, getTileAt } from './types'

export interface ToolModeResult {
  success: boolean
  message: string
  shouldEndMode: boolean
  boardModified?: boolean
  inventoryModified?: boolean
  updatedRun?: RunState
  scanData?: any
}

export interface DetectorScanResult {
  playerAdjacent: number
  opponentAdjacent: number
  neutralAdjacent: number
}

export interface TransmuteResult extends ToolModeResult {
  oldOwner?: string
  newOwner: 'player'
}

export interface DetectorResult extends ToolModeResult {
  scanData: DetectorScanResult
}

export interface KeyResult extends ToolModeResult {
  unlockedPosition?: { x: number; y: number }
  keyPosition?: { x: number; y: number }
}

export interface StaffResult extends ToolModeResult {
  damage?: number
  monsterDefeated?: boolean
  monsterName?: string
  usesRemaining?: number
}

export interface RingResult extends ToolModeResult {
  defoggedPosition?: { x: number; y: number }
  usesRemaining?: number
}

export class ToolModeManager {
  
  // Transmute a tile to player ownership
  transmuteTileAt(board: Board, x: number, y: number, run: RunState): TransmuteResult {
    const tile = getTileAt(board, x, y)
    
    if (!tile || tile.revealed) {
      return {
        success: false,
        message: 'Can only transmute unrevealed tiles!',
        shouldEndMode: true, // End mode and consume item even on invalid attempts
        inventoryModified: true
      }
    }
    
    const oldOwner = tile.owner
    
    if (tile.owner === 'player') {
      return {
        success: false,
        message: 'Tile is already yours! Transmute consumed anyway.',
        shouldEndMode: true,
        inventoryModified: true,
        oldOwner,
        newOwner: 'player'
      }
    }
    
    // Change tile ownership to player
    tile.owner = 'player'
    
    // Update board tile counts
    if (oldOwner === 'opponent') {
      board.opponentTilesTotal--
      board.playerTilesTotal++
    } else if (oldOwner === 'neutral') {
      board.neutralTilesTotal--
      board.playerTilesTotal++
    }
    
    return {
      success: true,
      message: `Transmuted ${oldOwner} tile at (${x}, ${y}) to player tile!`,
      shouldEndMode: true,
      boardModified: true,
      inventoryModified: true,
      oldOwner,
      newOwner: 'player'
    }
  }
  
  // Use detector to scan adjacent tiles
  detectTileAt(board: Board, x: number, y: number): DetectorResult {
    const tile = getTileAt(board, x, y)
    
    if (!tile) {
      return {
        success: false,
        message: 'Invalid tile position!',
        shouldEndMode: true,
        inventoryModified: true,
        scanData: { playerAdjacent: 0, opponentAdjacent: 0, neutralAdjacent: 0 }
      }
    }
    
    // Count adjacent tiles by ownership
    let playerAdjacent = 0
    let opponentAdjacent = 0
    let neutralAdjacent = 0
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const adjTile = getTileAt(board, x + dx, y + dy)
        if (adjTile) {
          if (adjTile.owner === 'player') playerAdjacent++
          else if (adjTile.owner === 'opponent') opponentAdjacent++
          else if (adjTile.owner === 'neutral') neutralAdjacent++
        }
      }
    }
    
    const scanData = { playerAdjacent, opponentAdjacent, neutralAdjacent }
    
    // Add scan data to the tile for visual display
    tile.detectorScan = {
      playerAdjacent,
      opponentAdjacent,
      neutralAdjacent
    }
    
    return {
      success: true,
      message: `Detector scan at (${x}, ${y}): ${playerAdjacent} player, ${opponentAdjacent} opponent, ${neutralAdjacent} neutral adjacent tiles`,
      shouldEndMode: true,
      inventoryModified: true,
      boardModified: true,
      scanData
    }
  }
  
  // Use key to unlock a chained tile
  useKeyAt(board: Board, x: number, y: number): KeyResult {
    const tile = getTileAt(board, x, y)
    
    if (!tile || tile.revealed || !tile.chainData || !tile.chainData.isBlocked) {
      return {
        success: false,
        message: 'Can only use keys on locked tiles!',
        shouldEndMode: true,
        inventoryModified: true
      }
    }
    
    const { requiredTileX, requiredTileY } = tile.chainData
    
    // Remove the chain blocking
    tile.chainData.isBlocked = false
    tile.chainData = undefined
    
    // Find and remove the corresponding key tile
    const keyTile = getTileAt(board, requiredTileX, requiredTileY)
    
    if (keyTile && keyTile.chainData) {
      keyTile.content = TileContent.Empty
      keyTile.chainData = undefined
    }
    
    return {
      success: true,
      message: `Key used! Unlocked tile at (${x}, ${y}) and removed corresponding key.`,
      shouldEndMode: true,
      inventoryModified: true,
      boardModified: true,
      unlockedPosition: { x, y },
      keyPosition: { x: requiredTileX, y: requiredTileY }
    }
  }
  
  // Use staff to attack a monster
  useStaffAt(board: Board, x: number, y: number, run: RunState): StaffResult {
    const tile = getTileAt(board, x, y)
    
    if (!tile || !tile.monsterData) {
      return {
        success: false,
        message: 'Can only target monsters with the Staff of Fireballs!',
        shouldEndMode: false, // Don't end mode for invalid targeting
        inventoryModified: false
      }
    }
    
    // Calculate damage (5 + attack upgrades)
    const attackUpgrades = run.upgrades.filter(id => id === 'attack').length
    const damage = 5 + attackUpgrades
    
    tile.monsterData.hp -= damage
    const monsterName = tile.monsterData.name
    
    let monsterDefeated = false
    let updatedRun = { ...run }
    
    if (tile.monsterData.hp <= 0) {
      // Monster defeated - remove it and award gold
      monsterDefeated = true
      tile.content = TileContent.Empty
      tile.monsterData = undefined
      
      // Award gold for defeating monster
      const incomeUpgrades = updatedRun.upgrades.filter(id => id === 'income').length
      updatedRun.loot = 1 + incomeUpgrades
      updatedRun.gold += updatedRun.loot
    }
    
    const baseMessage = monsterDefeated 
      ? `Staff defeated ${monsterName}! Gained ${updatedRun.loot} gold.`
      : `Staff of Fireballs hits ${monsterName} for ${damage} damage! (${tile.monsterData.hp} HP remaining)`
    
    return {
      success: true,
      message: baseMessage,
      shouldEndMode: false, // Staff can be used multiple times if it has charges
      inventoryModified: true, // Will consume a charge
      boardModified: monsterDefeated,
      updatedRun,
      damage,
      monsterDefeated,
      monsterName
    }
  }
  
  // Use ring to remove fog from a tile
  useRingAt(board: Board, x: number, y: number): RingResult {
    const tile = getTileAt(board, x, y)
    
    if (!tile || !tile.fogged) {
      return {
        success: false,
        message: 'Can only target fogged tiles with the Ring of True Seeing!',
        shouldEndMode: false, // Don't end mode for invalid targeting
        inventoryModified: false
      }
    }
    
    // Remove fog from the tile
    tile.fogged = false
    
    return {
      success: true,
      message: `Ring of True Seeing removes fog from tile at (${x}, ${y})`,
      shouldEndMode: false, // Ring can be used multiple times if it has charges
      inventoryModified: true, // Will consume a charge
      boardModified: true,
      defoggedPosition: { x, y }
    }
  }
  
  // Update all detector scans when tile ownership changes
  updateDetectorScans(board: Board): void {
    // Find all tiles with detector scans and update their results
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = getTileAt(board, x, y)
        
        if (tile && tile.detectorScan) {
          // Recalculate adjacent tile counts
          let playerAdjacent = 0
          let opponentAdjacent = 0
          let neutralAdjacent = 0
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const adjTile = getTileAt(board, x + dx, y + dy)
              if (adjTile) {
                if (adjTile.owner === 'player') playerAdjacent++
                else if (adjTile.owner === 'opponent') opponentAdjacent++
                else if (adjTile.owner === 'neutral') neutralAdjacent++
              }
            }
          }
          
          // Update the scan data
          tile.detectorScan = {
            playerAdjacent,
            opponentAdjacent,
            neutralAdjacent
          }
        }
      }
    }
  }
  
  // Validate if a tool mode action is possible
  canUseToolAt(toolMode: string, board: Board, x: number, y: number): { canUse: boolean; reason?: string } {
    const tile = getTileAt(board, x, y)
    
    if (!tile) {
      return { canUse: false, reason: 'Invalid tile position' }
    }
    
    switch (toolMode) {
      case 'transmute':
        if (tile.revealed) {
          return { canUse: false, reason: 'Can only transmute unrevealed tiles' }
        }
        return { canUse: true }
      
      case 'detector':
        return { canUse: true } // Detector can scan any tile
      
      case 'key':
        if (!tile.chainData || !tile.chainData.isBlocked) {
          return { canUse: false, reason: 'Can only use keys on locked tiles' }
        }
        if (tile.revealed) {
          return { canUse: false, reason: 'Cannot use key on revealed tiles' }
        }
        return { canUse: true }
      
      case 'staff':
        if (!tile.monsterData) {
          return { canUse: false, reason: 'Can only target monsters with staff' }
        }
        return { canUse: true }
      
      case 'ring':
        if (!tile.fogged) {
          return { canUse: false, reason: 'Can only target fogged tiles with ring' }
        }
        return { canUse: true }
      
      default:
        return { canUse: false, reason: 'Unknown tool mode' }
    }
  }
  
  // Get usage statistics for a tool mode
  getToolModeStats(toolMode: string, board: Board): { validTargets: number; totalTiles: number } {
    let validTargets = 0
    let totalTiles = 0
    
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        totalTiles++
        const validation = this.canUseToolAt(toolMode, board, x, y)
        if (validation.canUse) {
          validTargets++
        }
      }
    }
    
    return { validTargets, totalTiles }
  }
  
  // Check if any tool mode has valid targets
  hasValidTargets(toolMode: string, board: Board): boolean {
    const stats = this.getToolModeStats(toolMode, board)
    return stats.validTargets > 0
  }
  
  // Get all valid target positions for a tool mode
  getValidTargets(toolMode: string, board: Board): Array<{ x: number; y: number }> {
    const targets: Array<{ x: number; y: number }> = []
    
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const validation = this.canUseToolAt(toolMode, board, x, y)
        if (validation.canUse) {
          targets.push({ x, y })
        }
      }
    }
    
    return targets
  }
}