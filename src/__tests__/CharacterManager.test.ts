/**
 * CharacterManager Tests
 */

import { CharacterManager } from '../CharacterManager'
import { Character } from '../characters'
import { RunState, UpgradeData } from '../types'

describe('CharacterManager', () => {
  let manager: CharacterManager
  let mockRun: RunState
  let fighter: Character
  let tourist: Character
  let wizard: Character

  beforeEach(() => {
    manager = new CharacterManager()
    
    mockRun = {
      currentLevel: 1,
      maxLevel: 25,
      gold: 50,
      upgrades: [],
      hp: 10,
      maxHp: 10,
      attack: 5,
      defense: 2,
      loot: 1,
      maxInventory: 3,
      inventory: [null, null, null],
      trophies: [],
      characterId: 'fighter',
      temporaryBuffs: {},
      mana: 2,
      maxMana: 2,
      spells: [],
      spellEffects: []
    }

    fighter = {
      id: 'fighter',
      name: 'FIGHTER',
      icon: '⚔️',
      description: 'Combat specialist',
      startingUpgrades: ['attack', 'defense'],
      startingItems: [],
      startingMana: 0
    }

    tourist = {
      id: 'tourist',
      name: 'TOURIST',
      icon: '🎒',
      description: 'Shopping enthusiast',
      startingUpgrades: ['rich'],
      startingItems: [],
      startingMana: 2
    }

    wizard = {
      id: 'wizard',
      name: 'WIZARD',
      icon: '🧙',
      description: 'Magic user',
      startingUpgrades: ['wisdom'],
      startingItems: [],
      startingMana: 4
    }
  })

  describe('Fighter character behaviors', () => {
    it('should provide attack bonus when fighter gains attack upgrade', () => {
      const modification = manager.modifyUpgradeApplication(fighter, 'attack', mockRun)
      
      expect(modification.statBonuses?.attack).toBe(1)
      expect(modification.customMessage).toContain('FIGHTER trait: +1 extra attack')
    })

    it('should provide defense bonus when fighter gains defense upgrade', () => {
      const modification = manager.modifyUpgradeApplication(fighter, 'defense', mockRun)
      
      expect(modification.statBonuses?.defense).toBe(1)
      expect(modification.customMessage).toContain('FIGHTER trait: +1 extra defense')
    })

    it('should not provide bonuses for other upgrades', () => {
      const modification = manager.modifyUpgradeApplication(fighter, 'healthy', mockRun)
      
      expect(modification.statBonuses).toBeUndefined()
      expect(modification.customMessage).toBeUndefined()
    })

    it('should block spells for fighter', () => {
      expect(manager.canCharacterLearnSpells(fighter)).toBe(false)
    })
  })

  describe('Tourist character behaviors', () => {
    it('should increase shop prices by 2 gold', () => {
      const modifiedPrice = manager.modifyShopPrice(tourist, 10, 'crystal-ball')
      
      expect(modifiedPrice).toBe(12)
    })

    it('should force shops to spawn on every level', () => {
      expect(manager.shouldForceShopOnEveryLevel(tourist)).toBe(true)
    })

    it('should allow spells for tourist', () => {
      expect(manager.canCharacterLearnSpells(tourist)).toBe(true)
    })
  })

  describe('Default character behaviors', () => {
    it('should not modify upgrades for characters without special behaviors', () => {
      const modification = manager.modifyUpgradeApplication(wizard, 'attack', mockRun)
      
      expect(modification.statBonuses).toBeUndefined()
      expect(modification.customMessage).toBeUndefined()
    })

    it('should not modify shop prices for characters without special behaviors', () => {
      const modifiedPrice = manager.modifyShopPrice(wizard, 10, 'crystal-ball')
      
      expect(modifiedPrice).toBe(10)
    })

    it('should not force shops for characters without special behaviors', () => {
      expect(manager.shouldForceShopOnEveryLevel(wizard)).toBe(false)
    })

    it('should allow spells by default', () => {
      expect(manager.canCharacterLearnSpells(wizard)).toBe(true)
    })
  })

  describe('getCharacterUpgradeDescription', () => {
    it('should enhance upgrade descriptions with character bonuses', () => {
      const attackUpgrade: UpgradeData = {
        id: 'attack',
        name: 'Attack',
        description: 'Permanently add +2 to your attack',
        icon: '⚔️',
        repeatable: true
      }

      const description = manager.getCharacterUpgradeDescription(fighter, attackUpgrade)
      
      expect(description).toContain('Permanently add +2 to your attack')
      expect(description).toContain('FIGHTER bonus: +1 extra attack')
    })

    it('should return normal description for characters without bonuses', () => {
      const attackUpgrade: UpgradeData = {
        id: 'attack',
        name: 'Attack',
        description: 'Permanently add +2 to your attack',
        icon: '⚔️',
        repeatable: true
      }

      const description = manager.getCharacterUpgradeDescription(wizard, attackUpgrade)
      
      expect(description).toBe('Permanently add +2 to your attack')
    })

    it('should show multiple bonuses in description', () => {
      // Create a test character with multiple bonuses
      manager.setCharacterBehavior('test-character', {
        modifyUpgrade: (upgradeId: string) => {
          if (upgradeId === 'test-upgrade') {
            return {
              statBonuses: {
                attack: 2,
                defense: 1,
                maxHp: 10
              }
            }
          }
          return {}
        }
      })

      const testCharacter: Character = {
        id: 'test-character',
        name: 'TEST',
        icon: '🧪',
        description: 'Test character',
        startingUpgrades: [],
        startingItems: [],
        startingMana: 2
      }

      const testUpgrade: UpgradeData = {
        id: 'test-upgrade',
        name: 'Test Upgrade',
        description: 'Base description',
        icon: '📊',
        repeatable: true
      }

      const description = manager.getCharacterUpgradeDescription(testCharacter, testUpgrade)
      
      expect(description).toContain('Base description')
      expect(description).toContain('TEST bonus:')
      expect(description).toContain('+2 extra attack')
      expect(description).toContain('+1 extra defense')
      expect(description).toContain('+10 extra HP')
    })
  })

  describe('setCharacterBehavior', () => {
    it('should allow adding custom character behaviors', () => {
      const customBehavior = {
        modifyUpgrade: (upgradeId: string) => {
          if (upgradeId === 'income') {
            return { statBonuses: { loot: 5 } }
          }
          return {}
        }
      }

      manager.setCharacterBehavior('custom-character', customBehavior)

      const customCharacter: Character = {
        id: 'custom-character',
        name: 'CUSTOM',
        icon: '🔧',
        description: 'Custom character',
        startingUpgrades: [],
        startingItems: [],
        startingMana: 2
      }

      const modification = manager.modifyUpgradeApplication(customCharacter, 'income', mockRun)
      
      expect(modification.statBonuses?.loot).toBe(5)
    })

    it('should allow overriding existing character behaviors', () => {
      const newFighterBehavior = {
        modifyUpgrade: (upgradeId: string) => {
          if (upgradeId === 'attack') {
            return { statBonuses: { attack: 10 } } // Much larger bonus
          }
          return {}
        }
      }

      manager.setCharacterBehavior('fighter', newFighterBehavior)

      const modification = manager.modifyUpgradeApplication(fighter, 'attack', mockRun)
      
      expect(modification.statBonuses?.attack).toBe(10)
    })
  })

  describe('getCharacterBehavior', () => {
    it('should return empty object for unknown characters', () => {
      const unknownCharacter: Character = {
        id: 'unknown',
        name: 'UNKNOWN',
        icon: '❓',
        description: 'Unknown character',
        startingUpgrades: [],
        startingItems: [],
        startingMana: 2
      }

      const behavior = manager.getCharacterBehavior(unknownCharacter)
      
      expect(behavior).toEqual({})
    })

    it('should return correct behavior for known characters', () => {
      const behavior = manager.getCharacterBehavior(fighter)
      
      expect(behavior.modifyUpgrade).toBeDefined()
      expect(behavior.canLearnSpells).toBe(false)
    })
  })
})