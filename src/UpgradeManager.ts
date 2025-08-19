/**
 * UpgradeManager - Handles upgrade application, effects, and choice management
 * Extracted from store.ts for better organization
 * Now supports character-specific upgrade modifications
 */

import { RunState, Board, TileContent, getTileAt } from './types'
import { CharacterManager } from './CharacterManager'

export interface UpgradeChoice {
  choices: Array<{ id: string, name: string, description: string }>
}

export interface UpgradeResult {
  newRun: RunState
  success: boolean
  message?: string
  placementEffect?: {
    type: 'rich'
    coordinates: { x: number, y: number }
    newBoard?: Board
  }
}

export interface UpgradeChoiceResult {
  upgradeChoice: UpgradeChoice | null
  success: boolean
  message?: string
}

export class UpgradeManager {
  private characterManager: CharacterManager

  constructor() {
    this.characterManager = new CharacterManager()
  }
  
  /**
   * Apply an upgrade to the run state
   * @param currentRun Current run state
   * @param upgradeId ID of upgrade to apply
   * @returns Result of upgrade application
   */
  applyUpgrade(currentRun: RunState, upgradeId: string): UpgradeResult {
    const run = { ...currentRun }
    
    // Get character-specific modifications if character is available
    let characterModification = {}
    if (run.character) {
      characterModification = this.characterManager.modifyUpgradeApplication(
        run.character,
        upgradeId,
        currentRun
      )
      
      // Check if upgrade is blocked for this character
      if (characterModification.blocked) {
        return {
          newRun: currentRun,
          success: false,
          message: `${upgradeId} upgrade is not available for ${run.character.name}`
        }
      }
    }
    
    // For repeatable upgrades, add multiple instances; for non-repeatable, only add once
    const isRepeatable = [
      'attack', 'defense', 'healthy', 'income', 'traders', 'bag', 'resting'
    ].includes(upgradeId)
    
    if (isRepeatable || !run.upgrades.includes(upgradeId)) {
      run.upgrades = [...run.upgrades, upgradeId]
    } else {
      // Non-repeatable upgrade already owned, don't add again
      return {
        newRun: currentRun,
        success: false,
        message: `Already have ${upgradeId} upgrade (non-repeatable)`
      }
    }
    
    // Apply base upgrade effects
    switch (upgradeId) {
      case 'attack':
        run.attack += 2
        break
      case 'defense':
        run.defense += 1
        break
      case 'healthy':
        run.maxHp += 25
        break
      case 'income':
        run.loot += 1
        break
      case 'bag':
        run.maxInventory += 2
        run.inventory.push(null, null) // Add two more inventory slots
        break
      // QUICK, RICH, WISDOM, TRADERS, LEFT_HAND, RIGHT_HAND are passive
      case 'quick':
      case 'rich':
      case 'wisdom':
      case 'traders':
      case 'left-hand':
      case 'right-hand':
      case 'resting':
      case 'magnet':
        // These are handled at clue generation / board generation / tile reveal time
        break
      default:
        return {
          newRun: currentRun,
          success: false,
          message: `Unknown upgrade: ${upgradeId}`
        }
    }
    
    // Apply character-specific bonuses
    if (characterModification.statBonuses) {
      const bonuses = characterModification.statBonuses
      if (bonuses.attack) run.attack += bonuses.attack
      if (bonuses.defense) run.defense += bonuses.defense
      if (bonuses.maxHp) run.maxHp += bonuses.maxHp
      if (bonuses.loot) run.loot += bonuses.loot
      if (bonuses.maxInventory) {
        run.maxInventory += bonuses.maxInventory
        // Add extra inventory slots
        for (let i = 0; i < bonuses.maxInventory; i++) {
          run.inventory.push(null)
        }
      }
    }
    
    // Build result message
    let message = `Applied ${upgradeId} upgrade`
    if (characterModification.customMessage) {
      message += ` - ${characterModification.customMessage}`
    }
    
    return {
      newRun: run,
      success: true,
      message
    }
  }

  /**
   * Apply Rich upgrade effect: place treasure chest on adjacent tile
   * @param currentBoard Current board state
   * @param x X coordinate where monster was defeated
   * @param y Y coordinate where monster was defeated
   * @returns Result with board modification
   */
  async applyRichUpgrade(currentBoard: Board, x: number, y: number): Promise<UpgradeResult> {
    const board = { ...currentBoard }
    
    try {
      // Import the CHEST item
      const { CHEST } = await import('./items')
      
      // Collect all valid adjacent positions
      const adjacentTiles = []
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue // Skip center tile
          
          const adjX = x + dx
          const adjY = y + dy
          const adjTile = getTileAt(board, adjX, adjY)
          
          // Only consider unrevealed empty tiles
          if (adjTile && !adjTile.revealed && adjTile.content === TileContent.Empty) {
            adjacentTiles.push({ tile: adjTile, x: adjX, y: adjY })
          }
        }
      }
      
      // Place chest on exactly one random adjacent tile (if any exist)
      if (adjacentTiles.length > 0) {
        const randomIndex = Math.floor(Math.random() * adjacentTiles.length)
        const chosenTile = adjacentTiles[randomIndex]
        
        // Modify the tile
        chosenTile.tile.content = TileContent.Item
        chosenTile.tile.itemData = CHEST
        
        console.log(`Rich upgrade: placed treasure chest at (${chosenTile.x}, ${chosenTile.y})`)
        
        return {
          newRun: {} as RunState, // Run not modified by Rich upgrade
          success: true,
          message: `Rich upgrade: placed treasure chest at (${chosenTile.x}, ${chosenTile.y})`,
          placementEffect: {
            type: 'rich',
            coordinates: { x: chosenTile.x, y: chosenTile.y },
            newBoard: board
          }
        }
      } else {
        return {
          newRun: {} as RunState,
          success: true,
          message: 'Rich upgrade: no valid adjacent tiles for treasure placement'
        }
      }
    } catch (error) {
      console.error('Error in Rich upgrade:', error)
      return {
        newRun: {} as RunState,
        success: false,
        message: 'Rich upgrade failed: could not place treasure'
      }
    }
  }

  /**
   * Generate upgrade choices for the player
   * @param currentUpgrades Currently owned upgrades
   * @returns Upgrade choice result
   */
  async generateUpgradeChoices(currentUpgrades: string[]): Promise<UpgradeChoiceResult> {
    try {
      const { getAvailableUpgrades } = await import('./upgrades')
      
      const availableUpgrades = getAvailableUpgrades(currentUpgrades)
      
      if (availableUpgrades.length === 0) {
        return {
          upgradeChoice: null,
          success: false,
          message: 'No upgrades available'
        }
      }
      
      // Select up to 3 random upgrades
      const maxChoices = Math.min(3, availableUpgrades.length)
      const shuffled = [...availableUpgrades].sort(() => Math.random() - 0.5)
      const choices = shuffled.slice(0, maxChoices)
      
      return {
        upgradeChoice: { choices },
        success: true,
        message: `Generated ${choices.length} upgrade choices`
      }
    } catch (error) {
      console.error('Error generating upgrade choices:', error)
      return {
        upgradeChoice: null,
        success: false,
        message: 'Failed to generate upgrade choices'
      }
    }
  }

  /**
   * Check if an upgrade has passive effects that need to be considered
   * @param upgradeId Upgrade to check
   * @returns Information about passive effects
   */
  getUpgradeInfo(upgradeId: string): {
    isPassive: boolean
    triggeredBy: string[]
    description: string
  } {
    switch (upgradeId) {
      case 'attack':
        return {
          isPassive: false,
          triggeredBy: [],
          description: 'Immediately increases attack by +2'
        }
      case 'defense':
        return {
          isPassive: false,
          triggeredBy: [],
          description: 'Immediately increases defense by +1'
        }
      case 'healthy':
        return {
          isPassive: false,
          triggeredBy: [],
          description: 'Immediately increases max HP by +25'
        }
      case 'income':
        return {
          isPassive: false,
          triggeredBy: [],
          description: 'Immediately increases loot gain by +1'
        }
      case 'bag':
        return {
          isPassive: false,
          triggeredBy: [],
          description: 'Immediately adds two inventory slots'
        }
      case 'quick':
        return {
          isPassive: true,
          triggeredBy: ['board generation'],
          description: 'At the beginning of every board, reveals one of your tiles at random'
        }
      case 'rich':
        return {
          isPassive: true,
          triggeredBy: ['monster defeat'],
          description: 'When you defeat a monster, places a treasure chest on an adjacent tile'
        }
      case 'wisdom':
        return {
          isPassive: true,
          triggeredBy: ['board generation'],
          description: 'At the beginning of every board, applies detector scan to one random tile'
        }
      case 'traders':
        return {
          isPassive: true,
          triggeredBy: ['shop opening'],
          description: 'Adds additional items and upgrades to all shops'
        }
      case 'left-hand':
        return {
          isPassive: true,
          triggeredBy: ['clue generation'],
          description: 'Adds one more of your tiles to the left hand of all future clues'
        }
      case 'right-hand':
        return {
          isPassive: true,
          triggeredBy: ['clue generation'],
          description: 'Adds one more of your tiles to the right hand of all future clues'
        }
      case 'resting':
        return {
          isPassive: true,
          triggeredBy: ['tile reveal'],
          description: 'Gain +2 HP when revealing neutral tiles'
        }
      case 'magnet':
        return {
          isPassive: true,
          triggeredBy: ['tile reveal'],
          description: 'When you reveal a tile, collect any adjacent coins'
        }
      default:
        return {
          isPassive: false,
          triggeredBy: [],
          description: 'Unknown upgrade'
        }
    }
  }

  /**
   * Check if a run has a specific upgrade
   * @param currentRun Run state to check
   * @param upgradeId Upgrade to look for
   * @returns Number of times the upgrade is owned (for repeatable upgrades)
   */
  getUpgradeCount(currentRun: RunState, upgradeId: string): number {
    return currentRun.upgrades.filter(id => id === upgradeId).length
  }

  /**
   * Check if Rich upgrade should trigger
   * @param currentRun Run state to check
   * @returns Whether Rich upgrade effect should be applied
   */
  shouldTriggerRichUpgrade(currentRun: RunState): boolean {
    return this.getUpgradeCount(currentRun, 'rich') > 0
  }

  /**
   * Get access to the character manager for other systems
   * @returns CharacterManager instance
   */
  getCharacterManager(): CharacterManager {
    return this.characterManager
  }
}