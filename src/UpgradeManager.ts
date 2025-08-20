/**
 * UpgradeManager - Handles upgrade application, effects, and choice management
 * Extracted from store.ts for better organization
 * Now supports character-specific upgrade modifications
 */

import { RunState, Board, TileContent, getTileAt } from './types'
import { CharacterManager } from './CharacterManager'
import { ALL_SPELLS } from './SpellManager'

export interface UpgradeChoice {
  choices: Array<{ id: string, name: string, description: string, blocked?: boolean, blockReason?: string }>
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
      'attack', 'defense', 'healthy', 'income', 'traders', 'bag', 'resting', 'meditation'
    ].includes(upgradeId)
    
    // Special case: Below character can take Left Hand and Right Hand repeatedly
    const isRepeatableForCharacter = (run.character?.id === 'below' && (upgradeId === 'left-hand' || upgradeId === 'right-hand'))
    
    if (isRepeatable || isRepeatableForCharacter || !run.upgrades.includes(upgradeId)) {
      run.upgrades = [...run.upgrades, upgradeId]
    } else {
      // Non-repeatable upgrade already owned, don't add again
      return {
        newRun: currentRun,
        success: false,
        message: `Already have ${upgradeId} upgrade (non-repeatable)`
      }
    }
    
    // Get complete upgrade effects including character bonuses
    const upgradeEffects = this.characterManager.getUpgradeEffects(run.character, upgradeId)
    
    // Apply all stat bonuses
    const bonuses = upgradeEffects.statBonuses
    if (bonuses.attack) run.attack += bonuses.attack
    if (bonuses.defense) run.defense += bonuses.defense
    if (bonuses.maxHp) run.maxHp += bonuses.maxHp
    if (bonuses.loot) run.loot += bonuses.loot
    if (bonuses.maxInventory) {
      run.maxInventory += bonuses.maxInventory
      // Add the actual inventory slots
      for (let i = 0; i < bonuses.maxInventory; i++) {
        run.inventory.push(null)
      }
    }
    if (bonuses.maxMana) {
      run.maxMana += bonuses.maxMana
      run.mana += bonuses.maxMana // Also increase current mana
    }
    
    // Handle upgrades that don't have direct stat effects
    switch (upgradeId) {
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
      case 'spellbook':
        // Grant a random spell - need to import SpellManager for this
        return this.applySpellbookUpgrade(run)
      case 'wellspring':
        // Wellspring upgrade - passive effect on level progression
        break
      default:
        // If we don't recognize the upgrade and it has no stat bonuses, it's unknown
        if (Object.keys(bonuses).length === 0) {
          return {
            newRun: currentRun,
            success: false,
            message: `Unknown upgrade: ${upgradeId}`
          }
        }
    }
    
    // Build result message
    let message = `Applied ${upgradeId} upgrade`
    
    // Add stat bonus details to message for immediate upgrades
    if (upgradeId === 'attack' && bonuses.attack) {
      message += ` (+${bonuses.attack} attack)`
    } else if (upgradeId === 'defense' && bonuses.defense) {
      message += ` (+${bonuses.defense} defense)`
    } else if (upgradeId === 'healthy' && bonuses.maxHp) {
      message += ` (+${bonuses.maxHp} max HP)`
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
   * @param currentRun Current run state (for character trait filtering)
   * @returns Upgrade choice result
   */
  async generateUpgradeChoices(currentUpgrades: string[], currentRun?: RunState): Promise<UpgradeChoiceResult> {
    try {
      const { getAvailableUpgrades } = await import('./upgrades')
      
      let allUpgrades = getAvailableUpgrades(currentUpgrades)
      let availableUpgrades = []
      let blockedUpgrades = []
      
      // Separate available and blocked upgrades instead of filtering them out completely
      if (currentRun?.character) {
        for (const upgrade of allUpgrades) {
          let blocked = false
          let blockReason = ''
          
          // Check if upgrade is blocked by character traits
          if (this.characterManager.getTraitManager().isUpgradeBlocked(currentRun.character!, upgrade.id)) {
            blocked = true
            blockReason = `${currentRun.character.name} cannot take ${upgrade.name}`
          }
          
          // Check if upgrade count limit is reached
          const currentCount = currentUpgrades.filter(id => id === upgrade.id).length
          if (!blocked && this.characterManager.getTraitManager().isUpgradeLimitReached(currentRun.character!, upgrade.id, currentCount)) {
            blocked = true
            blockReason = `${upgrade.name} limit reached for ${currentRun.character.name}`
          }
          
          // Special case: Below character can take Left Hand and Right Hand upgrades repeatedly
          if (!blocked && currentRun.character.id === 'below' && (upgrade.id === 'left-hand' || upgrade.id === 'right-hand')) {
            availableUpgrades.push(upgrade) // Always available for Below
            continue
          }
          
          // Normal repeatability check
          if (!blocked && !upgrade.repeatable && currentUpgrades.includes(upgrade.id)) {
            blocked = true
            blockReason = `${upgrade.name} can only be taken once`
          }
          
          if (blocked) {
            blockedUpgrades.push({ upgrade, blockReason })
          } else {
            availableUpgrades.push(upgrade)
          }
        }
      } else {
        // No character, all upgrades are available
        availableUpgrades = allUpgrades
      }
      
      // Ensure we have at least some choices (even if blocked)
      const totalUpgrades = availableUpgrades.length + blockedUpgrades.length
      if (totalUpgrades === 0) {
        return {
          upgradeChoice: null,
          success: false,
          message: 'No upgrades available'
        }
      }
      
      // Select up to 3 upgrades, prioritizing available ones but including blocked ones if needed
      let selectedUpgrades = []
      let selectedBlocked = []
      
      // First, shuffle and take available upgrades
      const shuffledAvailable = [...availableUpgrades].sort(() => Math.random() - 0.5)
      const shuffledBlocked = [...blockedUpgrades].sort(() => Math.random() - 0.5)
      
      const maxChoices = 3
      let choicesMade = 0
      
      // Fill with available upgrades first
      while (choicesMade < maxChoices && selectedUpgrades.length < shuffledAvailable.length) {
        selectedUpgrades.push(shuffledAvailable[selectedUpgrades.length])
        choicesMade++
      }
      
      // If we still need more choices and have blocked upgrades, include some blocked ones
      while (choicesMade < maxChoices && selectedBlocked.length < shuffledBlocked.length) {
        selectedBlocked.push(shuffledBlocked[selectedBlocked.length])
        choicesMade++
      }
      
      // Convert to choice format with character-specific descriptions
      const choices = []
      
      // Add available upgrades
      for (const upgrade of selectedUpgrades) {
        choices.push({
          id: upgrade.id,
          name: upgrade.name,
          description: currentRun?.character 
            ? this.characterManager.getCharacterUpgradeDescription(currentRun.character, upgrade)
            : upgrade.description,
          icon: upgrade.icon,
          blocked: false
        })
      }
      
      // Add blocked upgrades
      for (const { upgrade, blockReason } of selectedBlocked) {
        choices.push({
          id: upgrade.id,
          name: upgrade.name,
          description: currentRun?.character 
            ? this.characterManager.getCharacterUpgradeDescription(currentRun.character, upgrade)
            : upgrade.description,
          icon: upgrade.icon,
          blocked: true,
          blockReason
        })
      }
      
      return {
        upgradeChoice: { choices },
        success: true,
        message: `Generated ${choices.length} upgrade choices (${selectedUpgrades.length} available, ${selectedBlocked.length} blocked)`
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

  /**
   * Apply Spellbook upgrade - grants a random spell the player doesn't have
   * @param run Current run state
   * @returns Upgrade result with spell granted
   */
  private applySpellbookUpgrade(run: RunState): UpgradeResult {
    // Check if character can cast spells
    if (run.character && !this.characterManager.getTraitManager().canCharacterCastSpells(run.character)) {
      return {
        newRun: run,
        success: false,
        message: `${run.character.name} cannot use Spellbook - unable to cast spells`
      }
    }

    // Get spells the player doesn't already have
    const availableSpells = ALL_SPELLS.filter(spell => 
      !run.spells.some(ownedSpell => ownedSpell.id === spell.id)
    )

    if (availableSpells.length === 0) {
      return {
        newRun: run,
        success: false,
        message: 'Spellbook upgrade failed - you already know all spells!'
      }
    }

    // Pick a random spell
    const randomSpell = availableSpells[Math.floor(Math.random() * availableSpells.length)]
    
    // Add the spell to the player's spells
    run.spells = [...run.spells, randomSpell]
    
    return {
      newRun: run,
      success: true,
      message: `Spellbook granted you the spell: ${randomSpell.name}!`
    }
  }
}