/**
 * CharacterManager - Handles character-specific behaviors and upgrade modifications
 * Provides hooks for characters to customize game mechanics
 */

import { RunState, UpgradeData } from './types'
import { Character } from './characters'

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
  modifyShopPrice?: (basePrice: number, itemId: string) => number
  /** Whether shops should spawn on every level for this character */
  forceShopOnEveryLevel?: boolean
  /** Whether this character can learn spells */
  canLearnSpells?: boolean
}

export class CharacterManager {
  private characterBehaviors: Map<string, CharacterBehavior> = new Map()

  constructor() {
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

    // Tourist: "everything in shops costs +2 gold but a shop spawns on every level"
    this.characterBehaviors.set('tourist', {
      modifyShopPrice: (basePrice: number, itemId: string) => {
        return basePrice + 2 // Everything costs +2 gold
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
    const behavior = this.getCharacterBehavior(character)
    if (behavior.modifyUpgrade) {
      return behavior.modifyUpgrade(upgradeId, currentRun)
    }
    return {}
  }

  /**
   * Apply character-specific shop price modifications
   */
  modifyShopPrice(character: Character, basePrice: number, itemId: string): number {
    const behavior = this.getCharacterBehavior(character)
    if (behavior.modifyShopPrice) {
      return behavior.modifyShopPrice(basePrice, itemId)
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
}