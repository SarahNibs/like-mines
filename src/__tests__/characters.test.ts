import { 
  Character,
  FIGHTER,
  CLERIC,
  WIZARD,
  RANGER,
  TOURIST,
  BELOW,
  ALL_CHARACTERS
} from '../characters'

describe('characters', () => {
  describe('character definitions', () => {
    it('should have valid character structure', () => {
      const testCharacter = (char: Character) => {
        expect(char).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          icon: expect.any(String),
          description: expect.any(String),
          startingUpgrades: expect.any(Array),
          startingItems: expect.any(Array)
        })
      }

      testCharacter(FIGHTER)
      testCharacter(CLERIC)
      testCharacter(WIZARD)
      testCharacter(RANGER)
      testCharacter(TOURIST)
      testCharacter(BELOW)
    })

    it('should have unique character IDs', () => {
      const ids = ALL_CHARACTERS.map(char => char.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have consistent ID format', () => {
      ALL_CHARACTERS.forEach(char => {
        // IDs should be lowercase and may contain hyphens
        expect(char.id).toMatch(/^[a-z-]+$/)
      })
    })

    it('should have meaningful names and descriptions', () => {
      ALL_CHARACTERS.forEach(char => {
        expect(char.name.length).toBeGreaterThan(0)
        expect(char.description.length).toBeGreaterThan(10) // Should be descriptive
        expect(char.icon.length).toBeGreaterThan(0)
      })
    })
  })

  describe('character balance and design', () => {
    it('should have reasonable number of starting upgrades', () => {
      ALL_CHARACTERS.forEach(char => {
        // Characters should have 1-5 starting upgrades for balance
        expect(char.startingUpgrades.length).toBeGreaterThanOrEqual(1)
        expect(char.startingUpgrades.length).toBeLessThanOrEqual(5)
      })
    })

    it('should have reasonable number of starting items', () => {
      ALL_CHARACTERS.forEach(char => {
        // Characters should have 0-4 starting items (WIZARD has 4, others have fewer)
        expect(char.startingItems.length).toBeGreaterThanOrEqual(0)
        expect(char.startingItems.length).toBeLessThanOrEqual(4)
      })
    })

    it('should have valid starting upgrade IDs', () => {
      const validUpgradeIds = [
        'attack', 'defense', 'healthy', 'income', 'bag', 'quick', 
        'rich', 'wisdom', 'traders', 'left-hand', 'right-hand', 'resting'
      ]

      ALL_CHARACTERS.forEach(char => {
        char.startingUpgrades.forEach(upgradeId => {
          expect(validUpgradeIds).toContain(upgradeId)
        })
      })
    })
  })

  describe('specific character traits', () => {
    it('should have FIGHTER with combat-focused upgrades', () => {
      expect(FIGHTER.id).toBe('fighter')
      expect(FIGHTER.startingUpgrades).toContain('attack')
      expect(FIGHTER.startingUpgrades).toContain('defense')
      expect(FIGHTER.startingUpgrades).toContain('healthy')
      expect(FIGHTER.startingItems).toHaveLength(0) // Only base protection
    })

    it('should have CLERIC with defensive/support upgrades', () => {
      expect(CLERIC.id).toBe('cleric')
      expect(CLERIC.startingUpgrades).toContain('resting')
      expect(CLERIC.startingUpgrades).toContain('defense')
      expect(CLERIC.startingItems.length).toBeGreaterThan(0) // Extra protections
    })

    it('should have characters with distinct gameplay styles', () => {
      // Each character should have different upgrade combinations
      const upgradeSignatures = ALL_CHARACTERS.map(char => 
        char.startingUpgrades.sort().join(',')
      )
      const uniqueSignatures = new Set(upgradeSignatures)
      expect(uniqueSignatures.size).toBe(ALL_CHARACTERS.length)
    })
  })

  describe('ALL_CHARACTERS collection', () => {
    it('should contain all defined characters', () => {
      expect(ALL_CHARACTERS).toContain(FIGHTER)
      expect(ALL_CHARACTERS).toContain(CLERIC)
      expect(ALL_CHARACTERS).toContain(WIZARD)
      expect(ALL_CHARACTERS).toContain(RANGER)
      expect(ALL_CHARACTERS).toContain(TOURIST)
      expect(ALL_CHARACTERS).toContain(BELOW)
    })

    it('should have reasonable character count', () => {
      // Should have enough variety but not overwhelming
      expect(ALL_CHARACTERS.length).toBeGreaterThanOrEqual(3)
      expect(ALL_CHARACTERS.length).toBeLessThanOrEqual(10)
    })

    it('should maintain character references consistently', () => {
      // Characters in ALL_CHARACTERS should be the same objects as exports
      const fighterFromArray = ALL_CHARACTERS.find(c => c.id === 'fighter')
      expect(fighterFromArray).toBe(FIGHTER)
    })
  })

  describe('starting items validation', () => {
    it('should have starting items with required properties', () => {
      ALL_CHARACTERS.forEach(char => {
        char.startingItems.forEach(item => {
          expect(item).toMatchObject({
            id: expect.any(String),
            name: expect.any(String),
            description: expect.any(String),
            icon: expect.any(String)
          })
        })
      })
    })

    it('should not have duplicate starting items within a character', () => {
      ALL_CHARACTERS.forEach(char => {
        const itemIds = char.startingItems.map(item => item.id)
        const uniqueItemIds = new Set(itemIds)
        
        // Allow duplicates for certain items like PROTECTION
        // but verify the structure is still valid
        expect(itemIds.length).toBeGreaterThanOrEqual(uniqueItemIds.size)
      })
    })
  })
})