/**
 * CharacterManager - Handles character-specific behaviors and upgrade modifications
 * Provides hooks for characters to customize game mechanics
 */

import { RunState, UpgradeData } from './types'
import { Character } from './characters'
import { CharacterTraitManager } from './CharacterTraits'

export interface UpgradeModification {
  /** Additional stat bonuses when this upgrade is applied */
  statBonuses?: {
    attack?: number
    defense?: number
    maxHp?: number
    loot?: number
    maxInventory?: number
  }
  /** Whether this upgrade should be blocked for this character */
  blocked?: boolean
  /** Custom message when applying this upgrade */
  customMessage?: string
}

export interface CharacterBehavior {
  /** Modify how upgrades are applied for this character */
  modifyUpgrade?: (upgradeId: string, currentRun: RunState) => UpgradeModification
  /** Modify shop prices for this character */
  modifyShopPrice?: (basePrice: number, itemId: string, level?: number) => number
  /** Whether shops should spawn on every level for this character */
  forceShopOnEveryLevel?: boolean
  /** Whether this character can learn spells */
  canLearnSpells?: boolean
}

export class CharacterManager {
  private characterBehaviors: Map<string, CharacterBehavior> = new Map()
  private traitManager: CharacterTraitManager

  constructor() {
    this.traitManager = new CharacterTraitManager()
    this.initializeCharacterBehaviors()
  }

  /**
   * Initialize character-specific behaviors
   */
  private initializeCharacterBehaviors(): void {
    // Fighter: "whenever you gain attack or defense, gain +1 more; you cannot learn spells"
    this.characterBehaviors.set('fighter', {
      modifyUpgrade: (upgradeId: string, currentRun: RunState) => {
        if (upgradeId === 'attack') {
          return {
            statBonuses: { attack: 1 }, // +1 bonus on top of normal +2
            customMessage: 'Fighter bonus: +1 additional attack!'
          }
        }
        if (upgradeId === 'defense') {
          return {
            statBonuses: { defense: 1 }, // +1 bonus on top of normal +1
            customMessage: 'Fighter bonus: +1 additional defense!'
          }
        }
        return {}
      },
      canLearnSpells: false
    })

    // Tourist: "everything in shops costs +2/+3/+4/+5 gold from level 1/6/11/16 but a shop spawns on every level"
    this.characterBehaviors.set('tourist', {
      modifyShopPrice: (basePrice: number, itemId: string, level?: number) => {
        const currentLevel = level || 1
        if (currentLevel >= 16) return basePrice + 5
        if (currentLevel >= 11) return basePrice + 4
        if (currentLevel >= 6) return basePrice + 3
        return basePrice + 2 // Level 1-5
      },
      forceShopOnEveryLevel: true
    })

    // Add placeholder behaviors for other characters
    this.characterBehaviors.set('cleric', {})
    this.characterBehaviors.set('wizard', {})
    this.characterBehaviors.set('ranger', {})
    this.characterBehaviors.set('sub', {})
  }

  /**
   * Get character behavior for a specific character
   */
  getCharacterBehavior(character: Character): CharacterBehavior {
    return this.characterBehaviors.get(character.id) || {}
  }

  /**
   * Apply character-specific upgrade modifications
   */
  modifyUpgradeApplication(
    character: Character,
    upgradeId: string,
    currentRun: RunState
  ): UpgradeModification {
    // Check trait-based restrictions first
    if (this.traitManager.isUpgradeBlocked(character, upgradeId)) {
      return { blocked: true }
    }
    
    // Check upgrade count limits
    const currentCount = currentRun.upgrades?.filter(id => id === upgradeId).length || 0
    if (this.traitManager.isUpgradeLimitReached(character, upgradeId, currentCount)) {
      return { 
        blocked: true,
        customMessage: `${upgradeId} upgrade limit reached for ${character.name}`
      }
    }
    
    // Get trait-based stat bonuses
    const traitBonuses = this.traitManager.getUpgradeStatBonuses(character, upgradeId)
    let modification: UpgradeModification = {}
    
    if (Object.keys(traitBonuses).length > 0) {
      modification.statBonuses = traitBonuses
      
      // Build custom message for trait bonuses
      const bonusMessages = []
      if (traitBonuses.attack) bonusMessages.push(`+${traitBonuses.attack} extra attack`)
      if (traitBonuses.defense) bonusMessages.push(`+${traitBonuses.defense} extra defense`)
      if (traitBonuses.maxHp) bonusMessages.push(`+${traitBonuses.maxHp} extra HP`)
      if (traitBonuses.loot) bonusMessages.push(`+${traitBonuses.loot} extra loot`)
      
      if (bonusMessages.length > 0) {
        modification.customMessage = `${character.name} trait: ${bonusMessages.join(', ')}`
      }
    }
    
    // Apply legacy behavior modifications (if any)
    const behavior = this.getCharacterBehavior(character)
    if (behavior.modifyUpgrade) {
      const legacyMod = behavior.modifyUpgrade(upgradeId, currentRun)
      // Merge legacy modifications with trait modifications
      if (legacyMod.statBonuses) {
        modification.statBonuses = {
          ...(modification.statBonuses || {}),
          ...legacyMod.statBonuses
        }
      }
      if (legacyMod.customMessage) {
        modification.customMessage = modification.customMessage 
          ? `${modification.customMessage}; ${legacyMod.customMessage}`
          : legacyMod.customMessage
      }
      if (legacyMod.blocked) {
        modification.blocked = true
      }
    }
    
    return modification
  }

  /**
   * Apply character-specific shop price modifications
   */
  modifyShopPrice(character: Character, basePrice: number, itemId: string, level?: number): number {
    const behavior = this.getCharacterBehavior(character)
    if (behavior.modifyShopPrice) {
      return behavior.modifyShopPrice(basePrice, itemId, level)
    }
    return basePrice
  }

  /**
   * Check if shops should spawn on every level for this character
   */
  shouldForceShopOnEveryLevel(character: Character): boolean {
    const behavior = this.getCharacterBehavior(character)
    return behavior.forceShopOnEveryLevel || false
  }

  /**
   * Check if a character can learn spells
   */
  canCharacterLearnSpells(character: Character): boolean {
    // Check trait system first
    if (!this.traitManager.canCharacterCastSpells(character)) {
      return false
    }
    
    // Fall back to legacy behavior system
    const behavior = this.getCharacterBehavior(character)
    return behavior.canLearnSpells !== false // Default to true unless explicitly false
  }

  /**
   * Get character-specific upgrade description
   */
  getCharacterUpgradeDescription(
    character: Character,
    upgrade: UpgradeData
  ): string {
    const modification = this.modifyUpgradeApplication(character, upgrade.id, {} as RunState)
    
    if (modification.blocked) {
      return `${upgrade.description} (Blocked for ${character.name})`
    }

    // Special case for Cleric Resting upgrade: show "+3 HP" instead of "+2 HP"
    if (character.id === 'cleric' && upgrade.id === 'resting') {
      return 'Gain +3 HP when revealing neutral tiles'
    }

    // Special case for Fighter attack/defense upgrades: show total with bonus
    if (character.id === 'fighter' && upgrade.id === 'attack') {
      return 'Permanently add +3 to your attack (Fighter +1 bonus)'
    }
    if (character.id === 'fighter' && upgrade.id === 'defense') {
      return 'Permanently add +2 to your defense (Fighter +1 bonus)'
    }

    if (modification.statBonuses) {
      const bonuses = []
      if (modification.statBonuses.attack) {
        bonuses.push(`+${modification.statBonuses.attack} extra attack`)
      }
      if (modification.statBonuses.defense) {
        bonuses.push(`+${modification.statBonuses.defense} extra defense`)
      }
      if (modification.statBonuses.maxHp) {
        bonuses.push(`+${modification.statBonuses.maxHp} extra HP`)
      }
      if (modification.statBonuses.loot) {
        bonuses.push(`+${modification.statBonuses.loot} extra loot`)
      }
      
      if (bonuses.length > 0) {
        return `${upgrade.description} (${character.name} bonus: ${bonuses.join(', ')})`
      }
    }

    return upgrade.description
  }

  /**
   * Add or modify character behavior (for testing or future character additions)
   */
  setCharacterBehavior(characterId: string, behavior: CharacterBehavior): void {
    this.characterBehaviors.set(characterId, behavior)
  }
  
  /**
   * Get access to the trait manager for other systems
   */
  getTraitManager(): CharacterTraitManager {
    return this.traitManager
  }
}