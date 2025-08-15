/**
 * Tests for TrophyManager
 */

import { TrophyManager, Trophy } from '../TrophyManager'

describe('TrophyManager', () => {
  let manager: TrophyManager
  
  beforeEach(() => {
    manager = new TrophyManager()
  })
  
  describe('awardTrophies', () => {
    it('should award correct number of trophies based on opponent tiles left', () => {
      const currentTrophies: Trophy[] = []
      const awardData = {
        opponentTilesLeft: 5,
        opponentTilesRevealed: 2
      }
      
      const result = manager.awardTrophies(currentTrophies, awardData)
      
      expect(result.trophiesAwarded).toBe(4) // 5 - 1 = 4
      expect(result.perfectBoardBonus).toBe(0) // opponent revealed 2 tiles
      expect(result.newTrophies).toHaveLength(4)
      expect(result.newTrophies.every(t => t.type === 'silver')).toBe(true)
      expect(result.shouldCollapse).toBe(false)
    })
    
    it('should award perfect board bonus when opponent revealed 0 tiles', () => {
      const currentTrophies: Trophy[] = []
      const awardData = {
        opponentTilesLeft: 3,
        opponentTilesRevealed: 0
      }
      
      const result = manager.awardTrophies(currentTrophies, awardData)
      
      expect(result.trophiesAwarded).toBe(12) // (3-1) + 10 bonus = 12
      expect(result.perfectBoardBonus).toBe(10)
      expect(result.newTrophies).toHaveLength(12)
      expect(result.shouldCollapse).toBe(true) // 12 silver should collapse
    })
    
    it('should handle minimum trophy award (0 when 1 tile left)', () => {
      const currentTrophies: Trophy[] = []
      const awardData = {
        opponentTilesLeft: 1,
        opponentTilesRevealed: 3
      }
      
      const result = manager.awardTrophies(currentTrophies, awardData)
      
      expect(result.trophiesAwarded).toBe(0) // max(0, 1-1) = 0
      expect(result.perfectBoardBonus).toBe(0)
      expect(result.newTrophies).toHaveLength(0)
      expect(result.shouldCollapse).toBe(false)
    })
    
    it('should preserve existing trophies when awarding new ones', () => {
      const existingTrophy: Trophy = {
        id: 'existing_1',
        type: 'gold',
        stolen: false
      }
      const currentTrophies = [existingTrophy]
      const awardData = {
        opponentTilesLeft: 3,
        opponentTilesRevealed: 1
      }
      
      const result = manager.awardTrophies(currentTrophies, awardData)
      
      expect(result.newTrophies).toHaveLength(3) // 1 existing + 2 new
      expect(result.newTrophies[0]).toBe(existingTrophy) // First should be existing
      expect(result.newTrophies.slice(1).every(t => t.type === 'silver')).toBe(true)
    })
    
    it('should generate unique trophy IDs', () => {
      const currentTrophies: Trophy[] = []
      const awardData = {
        opponentTilesLeft: 5,
        opponentTilesRevealed: 1
      }
      
      const result = manager.awardTrophies(currentTrophies, awardData)
      
      const ids = result.newTrophies.map(t => t.id)
      const uniqueIds = new Set(ids)
      expect(ids.length).toBe(uniqueIds.size) // All IDs should be unique
    })
  })
  
  describe('shouldCollapseTrophies', () => {
    it('should return true when 10 or more silver trophies exist', () => {
      const trophies: Trophy[] = Array(12).fill(null).map((_, i) => ({
        id: `silver_${i}`,
        type: 'silver' as const,
        stolen: false
      }))
      
      expect(manager.shouldCollapseTrophies(trophies)).toBe(true)
    })
    
    it('should return false when less than 10 silver trophies exist', () => {
      const trophies: Trophy[] = Array(9).fill(null).map((_, i) => ({
        id: `silver_${i}`,
        type: 'silver' as const,
        stolen: false
      }))
      
      expect(manager.shouldCollapseTrophies(trophies)).toBe(false)
    })
    
    it('should ignore stolen silver trophies in count', () => {
      const trophies: Trophy[] = [
        ...Array(8).fill(null).map((_, i) => ({
          id: `silver_${i}`,
          type: 'silver' as const,
          stolen: false
        })),
        ...Array(5).fill(null).map((_, i) => ({
          id: `stolen_silver_${i}`,
          type: 'silver' as const,
          stolen: true
        }))
      ]
      
      expect(manager.shouldCollapseTrophies(trophies)).toBe(false) // Only 8 non-stolen silver
    })
    
    it('should ignore gold trophies in silver count', () => {
      const trophies: Trophy[] = [
        ...Array(9).fill(null).map((_, i) => ({
          id: `silver_${i}`,
          type: 'silver' as const,
          stolen: false
        })),
        ...Array(5).fill(null).map((_, i) => ({
          id: `gold_${i}`,
          type: 'gold' as const,
          stolen: false
        }))
      ]
      
      expect(manager.shouldCollapseTrophies(trophies)).toBe(false) // Only 9 silver
    })
  })
  
  describe('collapseTrophies', () => {
    it('should collapse exactly 10 silver trophies into 1 gold', () => {
      const trophies: Trophy[] = Array(12).fill(null).map((_, i) => ({
        id: `silver_${i}`,
        type: 'silver' as const,
        stolen: false
      }))
      
      const result = manager.collapseTrophies(trophies)
      
      expect(result.changed).toBe(true)
      expect(result.goldTrophiesCreated).toBe(1)
      expect(result.newTrophies).toHaveLength(3) // 2 silver + 1 gold
      
      const silverCount = result.newTrophies.filter(t => t.type === 'silver').length
      const goldCount = result.newTrophies.filter(t => t.type === 'gold').length
      expect(silverCount).toBe(2)
      expect(goldCount).toBe(1)
    })
    
    it('should collapse multiple sets of 10 silver trophies', () => {
      const trophies: Trophy[] = Array(25).fill(null).map((_, i) => ({
        id: `silver_${i}`,
        type: 'silver' as const,
        stolen: false
      }))
      
      const result = manager.collapseTrophies(trophies)
      
      expect(result.changed).toBe(true)
      expect(result.goldTrophiesCreated).toBe(2) // 20 silver -> 2 gold
      expect(result.newTrophies).toHaveLength(7) // 5 silver + 2 gold
      
      const silverCount = result.newTrophies.filter(t => t.type === 'silver').length
      const goldCount = result.newTrophies.filter(t => t.type === 'gold').length
      expect(silverCount).toBe(5)
      expect(goldCount).toBe(2)
    })
    
    it('should not change anything when less than 10 silver trophies', () => {
      const trophies: Trophy[] = Array(9).fill(null).map((_, i) => ({
        id: `silver_${i}`,
        type: 'silver' as const,
        stolen: false
      }))
      
      const result = manager.collapseTrophies(trophies)
      
      expect(result.changed).toBe(false)
      expect(result.goldTrophiesCreated).toBe(0)
      expect(result.newTrophies).toHaveLength(9)
      expect(result.newTrophies.every(t => t.type === 'silver')).toBe(true)
    })
    
    it('should ignore stolen silver trophies in collapsing', () => {
      const trophies: Trophy[] = [
        ...Array(8).fill(null).map((_, i) => ({
          id: `silver_${i}`,
          type: 'silver' as const,
          stolen: false
        })),
        ...Array(5).fill(null).map((_, i) => ({
          id: `stolen_silver_${i}`,
          type: 'silver' as const,
          stolen: true
        }))
      ]
      
      const result = manager.collapseTrophies(trophies)
      
      expect(result.changed).toBe(false) // Only 8 non-stolen silver
      expect(result.newTrophies).toHaveLength(13) // Original count preserved
    })
    
    it('should preserve existing gold trophies during collapse', () => {
      const existingGold: Trophy = {
        id: 'existing_gold',
        type: 'gold',
        stolen: false
      }
      
      const trophies: Trophy[] = [
        existingGold,
        ...Array(12).fill(null).map((_, i) => ({
          id: `silver_${i}`,
          type: 'silver' as const,
          stolen: false
        }))
      ]
      
      const result = manager.collapseTrophies(trophies)
      
      expect(result.changed).toBe(true)
      expect(result.newTrophies).toContain(existingGold)
      
      const goldCount = result.newTrophies.filter(t => t.type === 'gold').length
      expect(goldCount).toBe(2) // 1 existing + 1 new
    })
  })
  
  describe('stealGoldTrophy', () => {
    it('should steal first available gold trophy', () => {
      const goldTrophy: Trophy = {
        id: 'gold_1',
        type: 'gold',
        stolen: false
      }
      
      const trophies = [goldTrophy]
      const result = manager.stealGoldTrophy(trophies, 'Dragon')
      
      expect(result.success).toBe(true)
      expect(result.newTrophies).toBeDefined()
      expect(result.newTrophies![0].stolen).toBe(true)
      expect(result.newTrophies![0].stolenBy).toBe('Dragon')
      expect(result.message).toContain('Dragon stole a gold trophy')
    })
    
    it('should not steal already stolen gold trophies', () => {
      const stolenTrophy: Trophy = {
        id: 'gold_1',
        type: 'gold',
        stolen: true,
        stolenBy: 'Previous Monster'
      }
      
      const availableTrophy: Trophy = {
        id: 'gold_2',
        type: 'gold',
        stolen: false
      }
      
      const trophies = [stolenTrophy, availableTrophy]
      const result = manager.stealGoldTrophy(trophies, 'Dragon')
      
      expect(result.success).toBe(true)
      expect(result.newTrophies![1].stolen).toBe(true)
      expect(result.newTrophies![1].stolenBy).toBe('Dragon')
      expect(result.newTrophies![0].stolenBy).toBe('Previous Monster') // Unchanged
    })
    
    it('should fail when no gold trophies available', () => {
      const trophies: Trophy[] = [
        { id: 'silver_1', type: 'silver', stolen: false }
      ]
      
      const result = manager.stealGoldTrophy(trophies, 'Dragon')
      
      expect(result.success).toBe(false)
      expect(result.newTrophies).toBeUndefined()
      expect(result.message).toBeUndefined()
    })
    
    it('should fail when all gold trophies are already stolen', () => {
      const trophies: Trophy[] = [
        { id: 'gold_1', type: 'gold', stolen: true, stolenBy: 'Other Monster' }
      ]
      
      const result = manager.stealGoldTrophy(trophies, 'Dragon')
      
      expect(result.success).toBe(false)
      expect(result.newTrophies).toBeUndefined()
    })
    
    it('should not affect silver trophies when stealing', () => {
      const silverTrophy: Trophy = { id: 'silver_1', type: 'silver', stolen: false }
      const goldTrophy: Trophy = { id: 'gold_1', type: 'gold', stolen: false }
      
      const trophies = [silverTrophy, goldTrophy]
      const result = manager.stealGoldTrophy(trophies, 'Dragon')
      
      expect(result.success).toBe(true)
      expect(result.newTrophies![0]).toEqual(silverTrophy) // Unchanged
      expect(result.newTrophies![1].stolen).toBe(true)
    })
  })
  
  describe('getTrophyCounts', () => {
    it('should correctly count different trophy types', () => {
      const trophies: Trophy[] = [
        { id: 'silver_1', type: 'silver', stolen: false },
        { id: 'silver_2', type: 'silver', stolen: false },
        { id: 'silver_3', type: 'silver', stolen: true },
        { id: 'gold_1', type: 'gold', stolen: false },
        { id: 'gold_2', type: 'gold', stolen: true, stolenBy: 'Monster' }
      ]
      
      const counts = manager.getTrophyCounts(trophies)
      
      expect(counts.silver).toBe(2)
      expect(counts.gold).toBe(1)
      expect(counts.stolenGold).toBe(1)
      expect(counts.total).toBe(5)
    })
    
    it('should handle empty trophy array', () => {
      const counts = manager.getTrophyCounts([])
      
      expect(counts.silver).toBe(0)
      expect(counts.gold).toBe(0)
      expect(counts.stolenGold).toBe(0)
      expect(counts.total).toBe(0)
    })
  })
  
  describe('getTrophyValue', () => {
    it('should calculate correct trophy values', () => {
      const trophies: Trophy[] = [
        { id: 'silver_1', type: 'silver', stolen: false }, // +1
        { id: 'silver_2', type: 'silver', stolen: false }, // +1
        { id: 'silver_3', type: 'silver', stolen: true }, // +0 (stolen)
        { id: 'gold_1', type: 'gold', stolen: false }, // +10
        { id: 'gold_2', type: 'gold', stolen: true, stolenBy: 'Monster' } // +0 (stolen)
      ]
      
      const value = manager.getTrophyValue(trophies)
      
      expect(value).toBe(12) // 2 silver + 1 gold = 2 + 10 = 12
    })
    
    it('should return 0 for empty trophy array', () => {
      expect(manager.getTrophyValue([])).toBe(0)
    })
    
    it('should return 0 when all trophies are stolen', () => {
      const trophies: Trophy[] = [
        { id: 'silver_1', type: 'silver', stolen: true },
        { id: 'gold_1', type: 'gold', stolen: true, stolenBy: 'Monster' }
      ]
      
      expect(manager.getTrophyValue(trophies)).toBe(0)
    })
  })
  
  describe('validateTrophies', () => {
    it('should validate correct trophy data', () => {
      const trophies: Trophy[] = [
        { id: 'silver_1', type: 'silver', stolen: false },
        { id: 'gold_1', type: 'gold', stolen: true, stolenBy: 'Monster' }
      ]
      
      const validation = manager.validateTrophies(trophies)
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
    
    it('should detect duplicate trophy IDs', () => {
      const trophies: Trophy[] = [
        { id: 'duplicate', type: 'silver', stolen: false },
        { id: 'duplicate', type: 'gold', stolen: false }
      ]
      
      const validation = manager.validateTrophies(trophies)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Duplicate trophy IDs found')
    })
    
    it('should detect invalid trophy types', () => {
      const trophies: any[] = [
        { id: 'invalid_1', type: 'bronze', stolen: false },
        { id: 'invalid_2', type: 'platinum', stolen: false }
      ]
      
      const validation = manager.validateTrophies(trophies)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('Invalid trophy types'))).toBe(true)
    })
    
    it('should detect stolen trophies without stolenBy', () => {
      const trophies: Trophy[] = [
        { id: 'invalid_stolen', type: 'gold', stolen: true } as Trophy
      ]
      
      const validation = manager.validateTrophies(trophies)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Stolen trophies missing stolenBy field')
    })
    
    it('should detect multiple validation errors', () => {
      const trophies: any[] = [
        { id: 'duplicate', type: 'silver', stolen: false },
        { id: 'duplicate', type: 'bronze', stolen: true }
      ]
      
      const validation = manager.validateTrophies(trophies)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(1)
    })
  })
})