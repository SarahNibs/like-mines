/**
 * Tests for CharacterTraits system
 */

import { CharacterTraitManager, FIGHTER_TRAIT, CLERIC_TRAIT, WIZARD_TRAIT, RANGER_TRAIT } from '../CharacterTraits'
import { FIGHTER, CLERIC, WIZARD, RANGER } from '../characters'

describe('CharacterTraitManager', () => {
  let traitManager: CharacterTraitManager
  
  beforeEach(() => {
    traitManager = new CharacterTraitManager()
  })
  
  describe('Fighter Traits', () => {
    it('should provide attack and defense upgrade bonuses', () => {
      const attackBonus = traitManager.getUpgradeStatBonuses(FIGHTER, 'attack')
      const defenseBonus = traitManager.getUpgradeStatBonuses(FIGHTER, 'defense')
      
      expect(attackBonus).toEqual({ attack: 1 })
      expect(defenseBonus).toEqual({ defense: 1 })
    })
    
    it('should provide blaze and ward item effect bonuses', () => {
      const blazeBonus = traitManager.getItemEffectBonus(FIGHTER, 'blaze')
      const wardBonus = traitManager.getItemEffectBonus(FIGHTER, 'ward')
      
      expect(blazeBonus).toBe(1)
      expect(wardBonus).toBe(1)
    })
    
    it('should not be able to cast spells', () => {
      const canCastSpells = traitManager.canCharacterCastSpells(FIGHTER)
      expect(canCastSpells).toBe(false)
    })
    
    it('should not block any upgrades', () => {
      const isAttackBlocked = traitManager.isUpgradeBlocked(FIGHTER, 'attack')
      const isDefenseBlocked = traitManager.isUpgradeBlocked(FIGHTER, 'defense')
      const isRichBlocked = traitManager.isUpgradeBlocked(FIGHTER, 'rich')
      
      expect(isAttackBlocked).toBe(false)
      expect(isDefenseBlocked).toBe(false)
      expect(isRichBlocked).toBe(false)
    })
  })
  
  describe('Cleric Traits', () => {
    it('should block Rich upgrade completely', () => {
      const isRichBlocked = traitManager.isUpgradeBlocked(CLERIC, 'rich')
      expect(isRichBlocked).toBe(true)
    })
    
    it('should limit Income upgrade to once', () => {
      const isLimitReached0 = traitManager.isUpgradeLimitReached(CLERIC, 'income', 0)
      const isLimitReached1 = traitManager.isUpgradeLimitReached(CLERIC, 'income', 1)
      
      expect(isLimitReached0).toBe(false)
      expect(isLimitReached1).toBe(true)
    })
    
    it('should provide HP gain bonuses', () => {
      const healthPotionBonus = traitManager.getHpGainBonus(CLERIC, 'healthPotion')
      const restingTriggerBonus = traitManager.getHpGainBonus(CLERIC, 'restingTrigger')
      
      expect(healthPotionBonus).toBe(1)
      expect(restingTriggerBonus).toBe(1)
    })
    
    it('should provide resting upgrade stat bonus', () => {
      const restingBonus = traitManager.getUpgradeStatBonuses(CLERIC, 'resting')
      expect(restingBonus).toEqual({ maxHp: 1 })
    })
    
    it('should be able to cast spells', () => {
      const canCastSpells = traitManager.canCharacterCastSpells(CLERIC)
      expect(canCastSpells).toBe(true)
    })
  })
  
  describe('Wizard Traits', () => {
    it('should block Defense upgrade', () => {
      const isDefenseBlocked = traitManager.isUpgradeBlocked(WIZARD, 'defense')
      expect(isDefenseBlocked).toBe(true)
    })
    
    it('should provide spell damage bonus', () => {
      const damageBonus = traitManager.getSpellDamageBonus(WIZARD)
      expect(damageBonus).toBe(1)
    })
    
    it('should gain spells at levels 6, 11, and 16', () => {
      const shouldGainAtLevel5 = traitManager.shouldGainSpellAtLevel(WIZARD, 5)
      const shouldGainAtLevel6 = traitManager.shouldGainSpellAtLevel(WIZARD, 6)
      const shouldGainAtLevel11 = traitManager.shouldGainSpellAtLevel(WIZARD, 11)
      const shouldGainAtLevel16 = traitManager.shouldGainSpellAtLevel(WIZARD, 16)
      const shouldGainAtLevel17 = traitManager.shouldGainSpellAtLevel(WIZARD, 17)
      
      expect(shouldGainAtLevel5).toBe(false)
      expect(shouldGainAtLevel6).toBe(true)
      expect(shouldGainAtLevel11).toBe(true)
      expect(shouldGainAtLevel16).toBe(true)
      expect(shouldGainAtLevel17).toBe(false)
    })
    
    it('should be able to cast spells', () => {
      const canCastSpells = traitManager.canCharacterCastSpells(WIZARD)
      expect(canCastSpells).toBe(true)
    })
    
    it('should get new spell levels list', () => {
      const newSpellLevels = traitManager.getNewSpellLevels(WIZARD)
      expect(newSpellLevels).toEqual([6, 11, 16])
    })
  })
  
  describe('Ranger Traits', () => {
    it('should attack first in combat', () => {
      const attacksFirst = traitManager.doesCharacterAttackFirst(RANGER)
      expect(attacksFirst).toBe(true)
    })
    
    it('should prevent damage when killing monsters', () => {
      const preventsDamage = traitManager.doesCharacterPreventDamageOnKill(RANGER)
      expect(preventsDamage).toBe(true)
    })
    
    it('should be able to cast spells', () => {
      const canCastSpells = traitManager.canCharacterCastSpells(RANGER)
      expect(canCastSpells).toBe(true)
    })
    
    it('should not have any upgrade restrictions', () => {
      const isAttackBlocked = traitManager.isUpgradeBlocked(RANGER, 'attack')
      const isDefenseBlocked = traitManager.isUpgradeBlocked(RANGER, 'defense')
      const isRichBlocked = traitManager.isUpgradeBlocked(RANGER, 'rich')
      
      expect(isAttackBlocked).toBe(false)
      expect(isDefenseBlocked).toBe(false)
      expect(isRichBlocked).toBe(false)
    })
  })
  
  describe('Generic Character Behavior', () => {
    it('should return empty bonuses for non-existent upgrades', () => {
      const bonuses = traitManager.getUpgradeStatBonuses(FIGHTER, 'nonexistent')
      expect(bonuses).toEqual({})
    })
    
    it('should return 0 for non-existent HP gain sources', () => {
      const bonus = traitManager.getHpGainBonus(CLERIC, 'nonexistent')
      expect(bonus).toBe(0)
    })
    
    it('should return 0 for non-existent item effect bonuses', () => {
      const bonus = traitManager.getItemEffectBonus(FIGHTER, 'nonexistent')
      expect(bonus).toBe(0)
    })
    
    it('should return 0 spell damage bonus for characters without traits', () => {
      // Create a mock character without trait
      const mockCharacter = { ...FIGHTER, id: 'nonexistent' }
      const bonus = traitManager.getSpellDamageBonus(mockCharacter)
      expect(bonus).toBe(0)
    })
    
    it('should return false for combat modifications on non-Ranger characters', () => {
      const fighterAttacksFirst = traitManager.doesCharacterAttackFirst(FIGHTER)
      const clerictAttacksFirst = traitManager.doesCharacterAttackFirst(CLERIC)
      const wizardAttacksFirst = traitManager.doesCharacterAttackFirst(WIZARD)
      
      expect(fighterAttacksFirst).toBe(false)
      expect(clerictAttacksFirst).toBe(false)
      expect(wizardAttacksFirst).toBe(false)
      
      const fighterPreventsDamage = traitManager.doesCharacterPreventDamageOnKill(FIGHTER)
      const clericPreventsDamage = traitManager.doesCharacterPreventDamageOnKill(CLERIC)
      const wizardPreventsDamage = traitManager.doesCharacterPreventDamageOnKill(WIZARD)
      
      expect(fighterPreventsDamage).toBe(false)
      expect(clericPreventsDamage).toBe(false)
      expect(wizardPreventsDamage).toBe(false)
    })
  })
  
  describe('Trait Definitions', () => {
    it('should have correct Fighter trait definition', () => {
      expect(FIGHTER_TRAIT.characterId).toBe('fighter')
      expect(FIGHTER_TRAIT.spellModifications?.canCastSpells).toBe(false)
      expect(FIGHTER_TRAIT.upgradeStatBonuses?.attack?.attack).toBe(1)
      expect(FIGHTER_TRAIT.upgradeStatBonuses?.defense?.defense).toBe(1)
      expect(FIGHTER_TRAIT.itemEffectBonuses?.blaze).toBe(1)
      expect(FIGHTER_TRAIT.itemEffectBonuses?.ward).toBe(1)
    })
    
    it('should have correct Cleric trait definition', () => {
      expect(CLERIC_TRAIT.characterId).toBe('cleric')
      expect(CLERIC_TRAIT.blockedUpgrades).toContain('rich')
      expect(CLERIC_TRAIT.upgradeCountLimits?.income).toBe(1)
      expect(CLERIC_TRAIT.hpGainBonuses?.healthPotion).toBe(1)
      expect(CLERIC_TRAIT.hpGainBonuses?.restingTrigger).toBe(1)
    })
    
    it('should have correct Wizard trait definition', () => {
      expect(WIZARD_TRAIT.characterId).toBe('wizard')
      expect(WIZARD_TRAIT.blockedUpgrades).toContain('defense')
      expect(WIZARD_TRAIT.spellModifications?.damageBonus).toBe(1)
      expect(WIZARD_TRAIT.spellModifications?.newSpellLevels).toEqual([6, 11, 16])
    })
    
    it('should have correct Ranger trait definition', () => {
      expect(RANGER_TRAIT.characterId).toBe('ranger')
      expect(RANGER_TRAIT.combatModifications?.attacksFirst).toBe(true)
      expect(RANGER_TRAIT.combatModifications?.preventDamageOnKill).toBe(true)
    })
  })
})