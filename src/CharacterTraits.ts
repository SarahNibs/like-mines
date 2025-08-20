/**
 * CharacterTraits - Defines permanent character trait effects that modify gameplay
 * These effects persist throughout the entire run and modify various game systems
 */

import { RunState, SpellData, ItemData } from './types'
import { Character } from './characters'

export interface TraitEffect {
  /** Character this trait belongs to */
  characterId: string
  
  /** Upgrade restrictions - upgrades that cannot be taken */
  blockedUpgrades?: string[]
  
  /** Upgrade count limits - max times an upgrade can be taken */
  upgradeCountLimits?: { [upgradeId: string]: number }
  
  /** Additional stat bonuses when specific upgrades are applied */
  upgradeStatBonuses?: {
    [upgradeId: string]: {
      attack?: number
      defense?: number
      maxHp?: number
      loot?: number
    }
  }
  
  /** HP gain bonuses - multipliers for various HP sources */
  hpGainBonuses?: {
    healthPotion?: number // Extra HP from health potions
    restingUpgrade?: number // Extra HP from resting upgrade
    restingTrigger?: number // Extra HP each time resting triggers
  }
  
  /** Spell system modifications */
  spellModifications?: {
    canCastSpells?: boolean // Whether character can cast spells
    damageBonus?: number // Extra damage for damaging spells
    newSpellLevels?: number[] // Levels at which character gains random spells
  }
  
  /** Combat modifications */
  combatModifications?: {
    attacksFirst?: boolean // Whether character attacks before monster
    preventDamageOnKill?: boolean // Whether character takes no damage if attack kills monster
  }
  
  /** Item effect bonuses */
  itemEffectBonuses?: {
    [effectName: string]: number // Extra bonus for specific item effects (e.g., 'blaze', 'ward')
  }
}

// Character trait definitions
export const FIGHTER_TRAIT: TraitEffect = {
  characterId: 'fighter',
  blockedUpgrades: [], // Fighter can take any upgrade
  upgradeStatBonuses: {
    'attack': { attack: 1 }, // Attack upgrade grants +3 total (+2 base + 1 bonus)
    'defense': { defense: 1 } // Defense upgrade grants +2 total (+1 base + 1 bonus)
  },
  spellModifications: {
    canCastSpells: false // Cannot gain or cast spells
  },
  itemEffectBonuses: {
    'blaze': 1, // Blaze grants an extra +1 attack
    'ward': 1   // Ward grants an extra +1 defense
  }
}

export const CLERIC_TRAIT: TraitEffect = {
  characterId: 'cleric',
  blockedUpgrades: ['rich'], // Cannot pick Rich at all
  upgradeCountLimits: {
    'income': 1 // Cannot pick Income more than once
  },
  upgradeStatBonuses: {
    'resting': { maxHp: 1 } // Resting upgrade grants +3 base value instead of +2
  },
  hpGainBonuses: {
    healthPotion: 1, // Health Potion gives +9 HP instead of +8
    restingUpgrade: 1, // Resting upgrade gives +3 instead of +2
    restingTrigger: 1 // Every time resting triggers, get an extra +1 HP
  }
}

export const WIZARD_TRAIT: TraitEffect = {
  characterId: 'wizard',
  blockedUpgrades: ['defense'], // Cannot pick Defense upgrade
  spellModifications: {
    damageBonus: 1, // Damaging spells deal +1 damage
    newSpellLevels: [6, 11, 16] // Gain random spell at levels 6, 11, and 16
  }
}

export const RANGER_TRAIT: TraitEffect = {
  characterId: 'ranger',
  blockedUpgrades: ['resting'], // Cannot pick Resting upgrade
  combatModifications: {
    attacksFirst: true, // Attacks first
    preventDamageOnKill: true // If attack defeats monster, take no damage
  }
}

export const TOURIST_TRAIT: TraitEffect = {
  characterId: 'tourist',
  // Tourist special shop mechanics are handled in CharacterManager
}

export const BELOW_TRAIT: TraitEffect = {
  characterId: 'below',
  // Cannot use Transmute items (handled in item usage logic)
  // Left Hand and Right Hand upgrades are repeatable (handled in upgrade repeatability logic)
}

// All character traits
export const ALL_TRAITS: TraitEffect[] = [
  FIGHTER_TRAIT,
  CLERIC_TRAIT,
  WIZARD_TRAIT,
  RANGER_TRAIT,
  TOURIST_TRAIT,
  BELOW_TRAIT
]

/**
 * Character Trait Manager - Handles trait effect application
 */
export class CharacterTraitManager {
  private traits: Map<string, TraitEffect> = new Map()
  
  constructor() {
    // Initialize all traits
    ALL_TRAITS.forEach(trait => {
      this.traits.set(trait.characterId, trait)
    })
  }
  
  /**
   * Get trait for a character
   */
  getCharacterTrait(character: Character): TraitEffect | undefined {
    return this.traits.get(character.id)
  }
  
  /**
   * Check if an upgrade is blocked for a character
   */
  isUpgradeBlocked(character: Character, upgradeId: string): boolean {
    const trait = this.getCharacterTrait(character)
    if (!trait) return false
    
    return trait.blockedUpgrades?.includes(upgradeId) || false
  }
  
  /**
   * Check if an upgrade has reached its limit for a character
   */
  isUpgradeLimitReached(character: Character, upgradeId: string, currentCount: number): boolean {
    const trait = this.getCharacterTrait(character)
    if (!trait || !trait.upgradeCountLimits) return false
    
    const limit = trait.upgradeCountLimits[upgradeId]
    return limit !== undefined && currentCount >= limit
  }
  
  /**
   * Get upgrade stat bonuses for a character
   */
  getUpgradeStatBonuses(character: Character, upgradeId: string): { [stat: string]: number } {
    const trait = this.getCharacterTrait(character)
    if (!trait || !trait.upgradeStatBonuses) return {}
    
    return trait.upgradeStatBonuses[upgradeId] || {}
  }
  
  /**
   * Get HP gain bonus for a specific source
   */
  getHpGainBonus(character: Character, source: string): number {
    const trait = this.getCharacterTrait(character)
    if (!trait || !trait.hpGainBonuses) return 0
    
    return trait.hpGainBonuses[source as keyof typeof trait.hpGainBonuses] || 0
  }
  
  /**
   * Get spell damage bonus for a character
   */
  getSpellDamageBonus(character: Character): number {
    const trait = this.getCharacterTrait(character)
    if (!trait || !trait.spellModifications) return 0
    
    return trait.spellModifications.damageBonus || 0
  }
  
  /**
   * Check if character can cast spells
   */
  canCharacterCastSpells(character: Character): boolean {
    const trait = this.getCharacterTrait(character)
    if (!trait || !trait.spellModifications) return true
    
    return trait.spellModifications.canCastSpells !== false
  }
  
  /**
   * Get levels at which character gains new spells
   */
  getNewSpellLevels(character: Character): number[] {
    const trait = this.getCharacterTrait(character)
    if (!trait || !trait.spellModifications) return []
    
    return trait.spellModifications.newSpellLevels || []
  }
  
  /**
   * Check if character attacks first in combat
   */
  doesCharacterAttackFirst(character: Character): boolean {
    const trait = this.getCharacterTrait(character)
    if (!trait || !trait.combatModifications) return false
    
    return trait.combatModifications.attacksFirst || false
  }
  
  /**
   * Check if character prevents damage when killing monster
   */
  doesCharacterPreventDamageOnKill(character: Character): boolean {
    const trait = this.getCharacterTrait(character)
    if (!trait || !trait.combatModifications) return false
    
    return trait.combatModifications.preventDamageOnKill || false
  }
  
  /**
   * Get item effect bonus for a character
   */
  getItemEffectBonus(character: Character, effectName: string): number {
    const trait = this.getCharacterTrait(character)
    if (!trait || !trait.itemEffectBonuses) return 0
    
    return trait.itemEffectBonuses[effectName] || 0
  }
  
  /**
   * Check if character should gain a new spell at current level
   */
  shouldGainSpellAtLevel(character: Character, level: number): boolean {
    const newSpellLevels = this.getNewSpellLevels(character)
    return newSpellLevels.includes(level)
  }
}