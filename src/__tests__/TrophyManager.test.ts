/**
 * TrophyManager Tests
 */

import { TrophyManager } from '../TrophyManager'
import { Trophy } from '../types'

describe('TrophyManager', () => {
  let manager: TrophyManager

  beforeEach(() => {
    manager = new TrophyManager()
  })

  describe('awardTrophies', () => {
    it('should award N-1 trophies for opponent tiles left', () => {
      const result = manager.awardTrophies([], 5, 0)
      
      // 4 base + 10 perfect = 14 total, which auto-collapses to 1 gold + 4 silver
      expect(result.newTrophies.length).toBe(5) 
      expect(result.newTrophies.filter(t => t.type === 'gold').length).toBe(1)
      expect(result.newTrophies.filter(t => t.type === 'silver').length).toBe(4)
    })

    it('should award perfect board bonus when opponent revealed 0 tiles', () => {
      const result = manager.awardTrophies([], 3, 0)
      
      // 2 base + 10 perfect = 12 total, which auto-collapses to 1 gold + 2 silver
      expect(result.newTrophies.length).toBe(3) 
      expect(result.newTrophies.filter(t => t.type === 'gold').length).toBe(1)
      expect(result.newTrophies.filter(t => t.type === 'silver').length).toBe(2)
    })

    it('should not award perfect bonus when opponent revealed tiles', () => {
      const result = manager.awardTrophies([], 3, 1)
      
      expect(result.newTrophies.length).toBe(2) // 2 base only
    })

    it('should preserve existing trophies', () => {
      const existingTrophies: Trophy[] = [
        { id: 'existing', type: 'gold', stolen: false }
      ]
      
      const result = manager.awardTrophies(existingTrophies, 3, 1)
      
      expect(result.newTrophies.length).toBe(3) // 1 existing + 2 new
      expect(result.newTrophies[0]).toEqual(existingTrophies[0])
    })

    it('should auto-collapse when earning enough silver trophies', () => {
      const result = manager.awardTrophies([], 12, 0)
      
      // Should earn 11 + 10 = 21 silver, which converts to 2 gold + 1 silver
      expect(result.newTrophies.filter(t => t.type === 'gold').length).toBe(2)
      expect(result.newTrophies.filter(t => t.type === 'silver').length).toBe(1)
    })

    it('should handle zero opponent tiles left', () => {
      const result = manager.awardTrophies([], 0, 0)
      
      // 0 base + 10 perfect = 10 total, which auto-collapses to 1 gold + 0 silver
      expect(result.newTrophies.length).toBe(1)
      expect(result.newTrophies.filter(t => t.type === 'gold').length).toBe(1)
    })
  })

  describe('collapseTrophies', () => {
    it('should collapse exactly 10 silver trophies into 1 gold', () => {
      const silverTrophies: Trophy[] = Array.from({ length: 10 }, (_, i) => ({
        id: `silver_${i}`,
        type: 'silver',
        stolen: false
      }))

      const result = manager.collapseTrophies(silverTrophies)

      expect(result.newTrophies.length).toBe(1)
      expect(result.newTrophies[0].type).toBe('gold')
      expect(result.message).toContain('1 gold trophy created')
    })

    it('should not collapse fewer than 10 silver trophies', () => {
      const silverTrophies: Trophy[] = Array.from({ length: 9 }, (_, i) => ({
        id: `silver_${i}`,
        type: 'silver',
        stolen: false
      }))

      const result = manager.collapseTrophies(silverTrophies)

      expect(result.newTrophies.length).toBe(9)
      expect(result.newTrophies.every(t => t.type === 'silver')).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should collapse multiple sets of 10 silver trophies', () => {
      const silverTrophies: Trophy[] = Array.from({ length: 23 }, (_, i) => ({
        id: `silver_${i}`,
        type: 'silver',
        stolen: false
      }))

      const result = manager.collapseTrophies(silverTrophies)

      expect(result.newTrophies.filter(t => t.type === 'gold').length).toBe(2)
      expect(result.newTrophies.filter(t => t.type === 'silver').length).toBe(3)
      expect(result.message).toContain('2 gold trophies created')
    })

    it('should preserve gold trophies during collapse', () => {
      const mixedTrophies: Trophy[] = [
        { id: 'gold1', type: 'gold', stolen: false },
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `silver_${i}`,
          type: 'silver',
          stolen: false
        }))
      ]

      const result = manager.collapseTrophies(mixedTrophies)

      expect(result.newTrophies.filter(t => t.type === 'gold').length).toBe(2)
    })

    it('should not collapse stolen silver trophies', () => {
      const trophies: Trophy[] = [
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `silver_${i}`,
          type: 'silver',
          stolen: false
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `stolen_${i}`,
          type: 'silver',
          stolen: true,
          stolenBy: 'Monster'
        }))
      ]

      const result = manager.collapseTrophies(trophies)

      // Only 5 non-stolen silver, not enough to collapse
      expect(result.newTrophies.filter(t => t.type === 'gold').length).toBe(0)
      expect(result.newTrophies.filter(t => t.type === 'silver' && !t.stolen).length).toBe(5)
      expect(result.newTrophies.filter(t => t.type === 'silver' && t.stolen).length).toBe(8)
    })
  })

  describe('stealGoldTrophy', () => {
    it('should steal available gold trophy', () => {
      const trophies: Trophy[] = [
        { id: 'gold1', type: 'gold', stolen: false },
        { id: 'silver1', type: 'silver', stolen: false }
      ]

      const result = manager.stealGoldTrophy(trophies, 'Dragon')

      expect(result.wasStolen).toBe(true)
      expect(result.newTrophies![0].stolen).toBe(true)
      expect(result.newTrophies![0].stolenBy).toBe('Dragon')
      expect(result.message).toContain('Dragon stole a gold trophy')
    })

    it('should fail when no gold trophies available', () => {
      const trophies: Trophy[] = [
        { id: 'silver1', type: 'silver', stolen: false }
      ]

      const result = manager.stealGoldTrophy(trophies, 'Dragon')

      expect(result.wasStolen).toBe(false)
      expect(result.newTrophies).toBeUndefined()
    })

    it('should not steal already stolen gold trophies', () => {
      const trophies: Trophy[] = [
        { id: 'gold1', type: 'gold', stolen: true, stolenBy: 'Other Monster' }
      ]

      const result = manager.stealGoldTrophy(trophies, 'Dragon')

      expect(result.wasStolen).toBe(false)
      expect(result.newTrophies).toBeUndefined()
    })

    it('should steal first available gold trophy', () => {
      const trophies: Trophy[] = [
        { id: 'gold1', type: 'gold', stolen: true, stolenBy: 'Other' },
        { id: 'gold2', type: 'gold', stolen: false },
        { id: 'gold3', type: 'gold', stolen: false }
      ]

      const result = manager.stealGoldTrophy(trophies, 'Dragon')

      expect(result.wasStolen).toBe(true)
      expect(result.newTrophies![1].stolen).toBe(true)
      expect(result.newTrophies![1].stolenBy).toBe('Dragon')
      expect(result.newTrophies![2].stolen).toBe(false) // Should not steal second one
    })
  })

  describe('getTrophyStats', () => {
    it('should count different trophy types correctly', () => {
      const trophies: Trophy[] = [
        { id: 'gold1', type: 'gold', stolen: false },
        { id: 'gold2', type: 'gold', stolen: true, stolenBy: 'Monster' },
        { id: 'silver1', type: 'silver', stolen: false },
        { id: 'silver2', type: 'silver', stolen: false },
        { id: 'silver3', type: 'silver', stolen: true, stolenBy: 'Monster' }
      ]

      const stats = manager.getTrophyStats(trophies)

      expect(stats.gold).toBe(1)
      expect(stats.goldStolen).toBe(1)
      expect(stats.silver).toBe(2)
      expect(stats.silverStolen).toBe(1)
      expect(stats.total).toBe(5)
    })

    it('should handle empty trophy array', () => {
      const stats = manager.getTrophyStats([])

      expect(stats.gold).toBe(0)
      expect(stats.goldStolen).toBe(0)
      expect(stats.silver).toBe(0)
      expect(stats.silverStolen).toBe(0)
      expect(stats.total).toBe(0)
    })
  })
})