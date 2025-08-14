import { 
  ATTACK,
  DEFENSE, 
  HEALTHY,
  INCOME,
  QUICK,
  RICH,
  BAG,
  WISDOM,
  TRADERS,
  LEFT_HAND,
  RIGHT_HAND,
  RESTING,
  ALL_UPGRADES,
  ALL_UPGRADES_LOOKUP,
  WARD_TEMP,
  BLAZE_TEMP,
  getAvailableUpgrades
} from '../upgrades'

describe('upgrades', () => {
  describe('upgrade definitions', () => {
    it('should have valid structure for all basic upgrades', () => {
      const testUpgrade = (upgrade: any) => {
        expect(upgrade).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          description: expect.any(String),
          icon: expect.any(String),
          repeatable: expect.any(Boolean)
        })
      }

      testUpgrade(ATTACK)
      testUpgrade(DEFENSE)
      testUpgrade(HEALTHY)
      testUpgrade(INCOME)
      testUpgrade(QUICK)
      testUpgrade(RICH)
    })

    it('should have consistent ID format', () => {
      ALL_UPGRADES.forEach(upgrade => {
        // IDs should be kebab-case
        expect(upgrade.id).toMatch(/^[a-z-]+$/)
        // Should have meaningful content
        expect(upgrade.name).toBeTruthy()
        expect(upgrade.description).toBeTruthy()
        expect(upgrade.icon).toBeTruthy()
      })
    })

    it('should have unique upgrade IDs', () => {
      const ids = ALL_UPGRADES.map(upgrade => upgrade.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have meaningful descriptions', () => {
      ALL_UPGRADES.forEach(upgrade => {
        // Descriptions should be descriptive
        expect(upgrade.description.length).toBeGreaterThan(15)
        expect(upgrade.description).not.toBe(upgrade.name)
      })
    })
  })

  describe('upgrade repeatability', () => {
    it('should have correct repeatable values for basic upgrades', () => {
      // Combat upgrades should be repeatable
      expect(ATTACK.repeatable).toBe(true)
      expect(DEFENSE.repeatable).toBe(true)
      expect(HEALTHY.repeatable).toBe(true)
      expect(INCOME.repeatable).toBe(true)

      // Utility upgrades should not be repeatable
      expect(QUICK.repeatable).toBe(false)
      expect(RICH.repeatable).toBe(false)
    })

    it('should have consistent repeatability logic', () => {
      const repeatable = ALL_UPGRADES.filter(u => u.repeatable)
      const nonRepeatable = ALL_UPGRADES.filter(u => !u.repeatable)
      
      // Should have some of each type
      expect(repeatable.length).toBeGreaterThan(0)
      expect(nonRepeatable.length).toBeGreaterThan(0)
      
      // Total should match ALL_UPGRADES length
      expect(repeatable.length + nonRepeatable.length).toBe(ALL_UPGRADES.length)
    })
  })

  describe('upgrade collections', () => {
    it('should have non-empty ALL_UPGRADES collection', () => {
      expect(ALL_UPGRADES.length).toBeGreaterThan(0)
    })

    it('should include all defined upgrades in ALL_UPGRADES', () => {
      expect(ALL_UPGRADES).toContain(ATTACK)
      expect(ALL_UPGRADES).toContain(DEFENSE)
      expect(ALL_UPGRADES).toContain(HEALTHY)
      expect(ALL_UPGRADES).toContain(INCOME)
      expect(ALL_UPGRADES).toContain(QUICK)
      expect(ALL_UPGRADES).toContain(RICH)
      expect(ALL_UPGRADES).toContain(BAG)
      expect(ALL_UPGRADES).toContain(WISDOM)
      expect(ALL_UPGRADES).toContain(TRADERS)
      expect(ALL_UPGRADES).toContain(LEFT_HAND)
      expect(ALL_UPGRADES).toContain(RIGHT_HAND)
      expect(ALL_UPGRADES).toContain(RESTING)
    })

    it('should have ALL_UPGRADES_LOOKUP include temporary upgrades', () => {
      // Should include all normal upgrades
      ALL_UPGRADES.forEach(upgrade => {
        expect(ALL_UPGRADES_LOOKUP).toContain(upgrade)
      })

      // Should also include temporary upgrades
      expect(ALL_UPGRADES_LOOKUP).toContain(WARD_TEMP)
      expect(ALL_UPGRADES_LOOKUP).toContain(BLAZE_TEMP)

      // Should be larger than regular upgrades
      expect(ALL_UPGRADES_LOOKUP.length).toBeGreaterThan(ALL_UPGRADES.length)
    })
  })

  describe('temporary upgrades', () => {
    it('should have valid temporary upgrade structure', () => {
      expect(WARD_TEMP).toMatchObject({
        id: 'ward-temp',
        name: expect.any(String),
        description: expect.stringContaining('defense'),
        icon: expect.any(String),
        repeatable: false
      })

      expect(BLAZE_TEMP).toMatchObject({
        id: 'blaze-temp', 
        name: expect.any(String),
        description: expect.stringContaining('attack'),
        icon: expect.any(String),
        repeatable: false
      })
    })

    it('should have temporary upgrades not repeatable', () => {
      expect(WARD_TEMP.repeatable).toBe(false)
      expect(BLAZE_TEMP.repeatable).toBe(false)
    })
  })

  describe('getAvailableUpgrades', () => {
    it('should return all upgrades when none are owned', () => {
      const available = getAvailableUpgrades([])
      expect(available).toEqual(ALL_UPGRADES)
      expect(available.length).toBe(ALL_UPGRADES.length)
    })

    it('should exclude non-repeatable upgrades that are owned', () => {
      const ownedUpgrades = ['quick', 'rich']
      const available = getAvailableUpgrades(ownedUpgrades)
      
      // Should not include owned non-repeatable upgrades
      expect(available).not.toContain(QUICK)
      expect(available).not.toContain(RICH)
      
      // Should still include repeatable upgrades even if owned
      expect(available).toContain(ATTACK)
      expect(available).toContain(DEFENSE)
    })

    it('should include repeatable upgrades even when owned', () => {
      const ownedUpgrades = ['attack', 'defense', 'healthy']
      const available = getAvailableUpgrades(ownedUpgrades)
      
      // Should still include all repeatable upgrades
      expect(available).toContain(ATTACK)
      expect(available).toContain(DEFENSE)
      expect(available).toContain(HEALTHY)
      expect(available).toContain(INCOME)
    })

    it('should handle mixed owned upgrades correctly', () => {
      const ownedUpgrades = ['attack', 'quick', 'defense', 'rich']
      const available = getAvailableUpgrades(ownedUpgrades)
      
      // Should include repeatable ones even though owned
      expect(available).toContain(ATTACK)
      expect(available).toContain(DEFENSE)
      
      // Should exclude non-repeatable ones that are owned
      expect(available).not.toContain(QUICK)
      expect(available).not.toContain(RICH)
      
      // Should include non-repeatable ones that aren't owned
      expect(available).toContain(WISDOM)
      expect(available).toContain(BAG)
    })

    it('should handle empty owned array', () => {
      const available = getAvailableUpgrades([])
      expect(available.length).toBe(ALL_UPGRADES.length)
      expect(available).toEqual(ALL_UPGRADES)
    })

    it('should handle unknown upgrade IDs gracefully', () => {
      const ownedUpgrades = ['nonexistent-upgrade', 'attack']
      const available = getAvailableUpgrades(ownedUpgrades)
      
      // Should still work normally, ignoring unknown IDs
      expect(available).toContain(ATTACK) // Repeatable, should be included
      expect(available).toContain(QUICK) // Non-repeatable, not owned, should be included
    })

    it('should return new array, not modify original', () => {
      const ownedUpgrades = ['quick']
      const available = getAvailableUpgrades(ownedUpgrades)
      
      // Should be different array
      expect(available).not.toBe(ALL_UPGRADES)
      
      // Original should be unchanged
      expect(ALL_UPGRADES).toContain(QUICK)
    })
  })

  describe('upgrade balance validation', () => {
    it('should have reasonable distribution of repeatable vs non-repeatable', () => {
      const repeatable = ALL_UPGRADES.filter(u => u.repeatable).length
      const nonRepeatable = ALL_UPGRADES.filter(u => !u.repeatable).length
      
      // Should have both types for game balance
      expect(repeatable).toBeGreaterThanOrEqual(3)
      expect(nonRepeatable).toBeGreaterThanOrEqual(3)
      
      // Neither should completely dominate
      expect(repeatable / ALL_UPGRADES.length).toBeGreaterThan(0.2)
      expect(nonRepeatable / ALL_UPGRADES.length).toBeGreaterThan(0.2)
    })

    it('should have logical upgrade categories', () => {
      const combatUpgrades = ['attack', 'defense', 'healthy']
      const utilityUpgrades = ['quick', 'rich', 'wisdom', 'bag', 'traders']
      const handUpgrades = ['left-hand', 'right-hand']
      
      combatUpgrades.forEach(id => {
        const upgrade = ALL_UPGRADES.find(u => u.id === id)
        expect(upgrade).toBeDefined()
        expect(upgrade!.repeatable).toBe(true) // Combat upgrades should stack
      })
      
      utilityUpgrades.forEach(id => {
        const upgrade = ALL_UPGRADES.find(u => u.id === id)
        expect(upgrade).toBeDefined()
        // Most utility upgrades should not be repeatable for balance
      })
      
      handUpgrades.forEach(id => {
        const upgrade = ALL_UPGRADES.find(u => u.id === id)
        expect(upgrade).toBeDefined()
      })
    })
  })
})