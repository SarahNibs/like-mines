/**
 * Tests for TrophyManager
 */

import { TrophyManager, Trophy } from '../TrophyManager'
import { Board } from '../types'

describe('TrophyManager', () => {
  let manager: TrophyManager
  let mockBoard: Board

  beforeEach(() => {
    manager = new TrophyManager()
    
    mockBoard = {
      opponentTilesTotal: 10,
      opponentTilesRevealed: 3,
      playerTilesTotal: 8,
      playerTilesRevealed: 8
    } as Board
  })

  describe('trophy award calculation', () => {
    it('should calculate correct trophies for normal win', () => {
      const result = manager.calculateTrophyAward(mockBoard)

      // 10 total - 3 revealed = 7 left, so 6 trophies (N-1)
      expect(result.trophiesEarned).toBe(6)
      expect(result.perfectBoardBonus).toBe(0)
    })

    it('should calculate perfect board bonus', () => {
      mockBoard.opponentTilesRevealed = 0
      const result = manager.calculateTrophyAward(mockBoard)

      // 10 total - 0 revealed = 10 left, so 9 + 10 bonus = 19 trophies
      expect(result.trophiesEarned).toBe(19)
      expect(result.perfectBoardBonus).toBe(10)
    })

    it('should handle edge case when all opponent tiles revealed', () => {
      mockBoard.opponentTilesRevealed = 10
      const result = manager.calculateTrophyAward(mockBoard)

      // 10 total - 10 revealed = 0 left, so max(0, -1) = 0 trophies
      expect(result.trophiesEarned).toBe(0)
      expect(result.perfectBoardBonus).toBe(0)
    })

    it('should handle single tile left', () => {
      mockBoard.opponentTilesRevealed = 9
      const result = manager.calculateTrophyAward(mockBoard)

      // 10 total - 9 revealed = 1 left, so 0 trophies (1-1)
      expect(result.trophiesEarned).toBe(0)
      expect(result.perfectBoardBonus).toBe(0)
    })
  })

  describe('trophy awarding', () => {
    it('should award correct number of trophies', () => {
      const existingTrophies: Trophy[] = [
        { id: 'existing', type: 'silver', stolen: false }
      ]

      const result = manager.awardTrophies(mockBoard, existingTrophies)

      expect(result.trophiesEarned).toBe(6)
      expect(result.perfectBoardBonus).toBe(0)
      expect(result.updatedTrophies).toHaveLength(7) // 1 existing + 6 new
      expect(result.shouldCollapse).toBe(false)
    })

    it('should create unique trophy IDs', () => {
      const result = manager.awardTrophies(mockBoard, [])

      const ids = result.updatedTrophies.map(t => t.id)
      const uniqueIds = new Set(ids)
      expect(ids.length).toBe(uniqueIds.size) // All IDs should be unique
    })

    it('should create silver trophies by default', () => {
      const result = manager.awardTrophies(mockBoard, [])

      expect(result.updatedTrophies.every(t => t.type === 'silver')).toBe(true)
      expect(result.updatedTrophies.every(t => !t.stolen)).toBe(true)
    })

    it('should indicate collapse needed when 10+ silver trophies', () => {
      const existingTrophies: Trophy[] = Array.from({ length: 8 }, (_, i) => ({
        id: `silver_${i}`,
        type: 'silver' as const,
        stolen: false
      }))

      const result = manager.awardTrophies(mockBoard, existingTrophies)

      expect(result.updatedTrophies).toHaveLength(14) // 8 + 6
      expect(result.shouldCollapse).toBe(true)
    })
  })

  describe('trophy collapse detection', () => {
    it('should detect when collapse is needed', () => {
      const trophies: Trophy[] = Array.from({ length: 10 }, (_, i) => ({
        id: `silver_${i}`,
        type: 'silver',
        stolen: false
      }))

      expect(manager.shouldCollapseTrophies(trophies)).toBe(true)
    })

    it('should not trigger collapse with less than 10 silver', () => {
      const trophies: Trophy[] = Array.from({ length: 9 }, (_, i) => ({
        id: `silver_${i}`,
        type: 'silver',
        stolen: false
      }))

      expect(manager.shouldCollapseTrophies(trophies)).toBe(false)
    })

    it('should ignore stolen trophies when checking collapse', () => {
      const trophies: Trophy[] = [
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `silver_${i}`,
          type: 'silver' as const,
          stolen: false
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `stolen_${i}`,
          type: 'silver' as const,
          stolen: true
        }))
      ]

      expect(manager.shouldCollapseTrophies(trophies)).toBe(false)
    })

    it('should ignore gold trophies when checking collapse', () => {
      const trophies: Trophy[] = [
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `silver_${i}`,
          type: 'silver' as const,
          stolen: false
        })),
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `gold_${i}`,
          type: 'gold' as const,
          stolen: false
        }))
      ]

      expect(manager.shouldCollapseTrophies(trophies)).toBe(false)
    })
  })

  describe('trophy collapsing', () => {
    it('should collapse exactly 10 silver trophies into 1 gold', () => {
      const trophies: Trophy[] = Array.from({ length: 10 }, (_, i) => ({
        id: `silver_${i}`,
        type: 'silver',
        stolen: false
      }))

      const result = manager.collapseTrophies(trophies)

      expect(result.collapsed).toBe(true)
      expect(result.goldTrophiesCreated).toBe(1)
      expect(result.finalTrophies).toHaveLength(1)
      expect(result.finalTrophies[0].type).toBe('gold')
    })

    it('should handle multiple collapses', () => {
      const trophies: Trophy[] = Array.from({ length: 25 }, (_, i) => ({
        id: `silver_${i}`,
        type: 'silver',
        stolen: false
      }))

      const result = manager.collapseTrophies(trophies)

      expect(result.collapsed).toBe(true)
      expect(result.goldTrophiesCreated).toBe(2)
      expect(result.finalTrophies).toHaveLength(7) // 2 gold + 5 remaining silver
      
      const goldTrophies = result.finalTrophies.filter(t => t.type === 'gold')
      const silverTrophies = result.finalTrophies.filter(t => t.type === 'silver')
      expect(goldTrophies).toHaveLength(2)
      expect(silverTrophies).toHaveLength(5)
    })

    it('should preserve existing gold trophies', () => {
      const trophies: Trophy[] = [
        { id: 'existing_gold', type: 'gold', stolen: false },
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `silver_${i}`,
          type: 'silver' as const,
          stolen: false
        }))
      ]

      const result = manager.collapseTrophies(trophies)

      expect(result.collapsed).toBe(true)
      expect(result.goldTrophiesCreated).toBe(1)
      expect(result.finalTrophies).toHaveLength(2) // 2 gold total
      expect(result.finalTrophies.filter(t => t.type === 'gold')).toHaveLength(2)
    })

    it('should not collapse stolen silver trophies', () => {
      const trophies: Trophy[] = [
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `silver_${i}`,
          type: 'silver' as const,
          stolen: false
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `stolen_${i}`,
          type: 'silver' as const,
          stolen: true
        }))
      ]

      const result = manager.collapseTrophies(trophies)

      expect(result.collapsed).toBe(false)
      expect(result.goldTrophiesCreated).toBe(0)
      expect(result.finalTrophies).toHaveLength(15) // Unchanged
    })

    it('should not collapse when less than 10 silver available', () => {
      const trophies: Trophy[] = Array.from({ length: 5 }, (_, i) => ({
        id: `silver_${i}`,
        type: 'silver',
        stolen: false
      }))

      const result = manager.collapseTrophies(trophies)

      expect(result.collapsed).toBe(false)
      expect(result.goldTrophiesCreated).toBe(0)
      expect(result.finalTrophies).toHaveLength(5)
    })
  })

  describe('trophy stealing', () => {
    it('should steal available gold trophy', () => {
      const trophies: Trophy[] = [
        { id: 'gold1', type: 'gold', stolen: false },
        { id: 'silver1', type: 'silver', stolen: false }
      ]

      const result = manager.stealGoldTrophy(trophies, 'Dragon')

      expect(result.stolen).toBe(true)
      expect(result.stolenTrophyId).toBe('gold1')
      expect(result.updatedTrophies).toHaveLength(2)
      
      const stolenTrophy = result.updatedTrophies.find(t => t.id === 'gold1')
      expect(stolenTrophy?.stolen).toBe(true)
      expect(stolenTrophy?.stolenBy).toBe('Dragon')
    })

    it('should fail to steal when no gold trophies available', () => {
      const trophies: Trophy[] = [
        { id: 'silver1', type: 'silver', stolen: false },
        { id: 'silver2', type: 'silver', stolen: false }
      ]

      const result = manager.stealGoldTrophy(trophies, 'Dragon')

      expect(result.stolen).toBe(false)
      expect(result.stolenTrophyId).toBeUndefined()
      expect(result.updatedTrophies).toBe(trophies) // No changes
    })

    it('should fail to steal when all gold trophies already stolen', () => {
      const trophies: Trophy[] = [
        { id: 'gold1', type: 'gold', stolen: true, stolenBy: 'Orc' },
        { id: 'silver1', type: 'silver', stolen: false }
      ]

      const result = manager.stealGoldTrophy(trophies, 'Dragon')

      expect(result.stolen).toBe(false)
      expect(result.stolenTrophyId).toBeUndefined()
      expect(result.updatedTrophies).toBe(trophies) // No changes
    })

    it('should steal first available gold trophy', () => {
      const trophies: Trophy[] = [
        { id: 'gold1', type: 'gold', stolen: true, stolenBy: 'Orc' },
        { id: 'gold2', type: 'gold', stolen: false },
        { id: 'gold3', type: 'gold', stolen: false }
      ]

      const result = manager.stealGoldTrophy(trophies, 'Dragon')

      expect(result.stolen).toBe(true)
      expect(result.stolenTrophyId).toBe('gold2')
      
      const stolenTrophy = result.updatedTrophies.find(t => t.id === 'gold2')
      expect(stolenTrophy?.stolen).toBe(true)
      expect(stolenTrophy?.stolenBy).toBe('Dragon')
      
      // Other trophies should be unchanged
      const untouchedTrophy = result.updatedTrophies.find(t => t.id === 'gold3')
      expect(untouchedTrophy?.stolen).toBe(false)
    })
  })

  describe('trophy statistics', () => {
    it('should calculate trophy statistics correctly', () => {
      const trophies: Trophy[] = [
        { id: 'silver1', type: 'silver', stolen: false },
        { id: 'silver2', type: 'silver', stolen: false },
        { id: 'silver3', type: 'silver', stolen: true, stolenBy: 'Orc' },
        { id: 'gold1', type: 'gold', stolen: false },
        { id: 'gold2', type: 'gold', stolen: true, stolenBy: 'Dragon' }
      ]

      const stats = manager.getTrophyStatistics(trophies)

      expect(stats).toEqual({
        total: 5,
        silver: 2,
        gold: 1,
        stolen: 2,
        available: 3
      })
    })

    it('should handle empty trophy array', () => {
      const stats = manager.getTrophyStatistics([])

      expect(stats).toEqual({
        total: 0,
        silver: 0,
        gold: 0,
        stolen: 0,
        available: 0
      })
    })
  })

  describe('trophy value calculation', () => {
    it('should calculate trophy value correctly', () => {
      const trophies: Trophy[] = [
        { id: 'silver1', type: 'silver', stolen: false },
        { id: 'silver2', type: 'silver', stolen: false },
        { id: 'silver3', type: 'silver', stolen: true, stolenBy: 'Orc' },
        { id: 'gold1', type: 'gold', stolen: false },
        { id: 'gold2', type: 'gold', stolen: true, stolenBy: 'Dragon' }
      ]

      const value = manager.getTrophyValue(trophies)

      // 2 silver (2 points) + 1 gold (10 points) = 12 points
      expect(value).toBe(12)
    })

    it('should ignore stolen trophies in value calculation', () => {
      const trophies: Trophy[] = [
        { id: 'silver1', type: 'silver', stolen: true, stolenBy: 'Orc' },
        { id: 'gold1', type: 'gold', stolen: true, stolenBy: 'Dragon' }
      ]

      const value = manager.getTrophyValue(trophies)

      expect(value).toBe(0)
    })
  })

  describe('death prevention', () => {
    it('should detect available death prevention', () => {
      const trophies: Trophy[] = [
        { id: 'silver1', type: 'silver', stolen: false },
        { id: 'gold1', type: 'gold', stolen: false }
      ]

      expect(manager.canPreventDeath(trophies)).toBe(true)
    })

    it('should detect no death prevention available', () => {
      const trophies: Trophy[] = [
        { id: 'silver1', type: 'silver', stolen: false },
        { id: 'gold1', type: 'gold', stolen: true, stolenBy: 'Orc' }
      ]

      expect(manager.canPreventDeath(trophies)).toBe(false)
    })

    it('should detect no death prevention with only silver trophies', () => {
      const trophies: Trophy[] = [
        { id: 'silver1', type: 'silver', stolen: false },
        { id: 'silver2', type: 'silver', stolen: false }
      ]

      expect(manager.canPreventDeath(trophies)).toBe(false)
    })
  })

  describe('trophy filtering', () => {
    const sampleTrophies: Trophy[] = [
      { id: 'silver1', type: 'silver', stolen: false },
      { id: 'silver2', type: 'silver', stolen: true, stolenBy: 'Orc' },
      { id: 'gold1', type: 'gold', stolen: false },
      { id: 'gold2', type: 'gold', stolen: true, stolenBy: 'Dragon' }
    ]

    it('should filter silver trophies excluding stolen', () => {
      const silverTrophies = manager.getTrophiesByType(sampleTrophies, 'silver', false)

      expect(silverTrophies).toHaveLength(1)
      expect(silverTrophies[0].id).toBe('silver1')
    })

    it('should filter silver trophies including stolen', () => {
      const silverTrophies = manager.getTrophiesByType(sampleTrophies, 'silver', true)

      expect(silverTrophies).toHaveLength(2)
      expect(silverTrophies.map(t => t.id)).toEqual(['silver1', 'silver2'])
    })

    it('should filter gold trophies excluding stolen', () => {
      const goldTrophies = manager.getTrophiesByType(sampleTrophies, 'gold', false)

      expect(goldTrophies).toHaveLength(1)
      expect(goldTrophies[0].id).toBe('gold1')
    })

    it('should filter gold trophies including stolen', () => {
      const goldTrophies = manager.getTrophiesByType(sampleTrophies, 'gold', true)

      expect(goldTrophies).toHaveLength(2)
      expect(goldTrophies.map(t => t.id)).toEqual(['gold1', 'gold2'])
    })
  })

  describe('stolen trophy tracking', () => {
    it('should get stolen trophies with thief info', () => {
      const trophies: Trophy[] = [
        { id: 'silver1', type: 'silver', stolen: false },
        { id: 'silver2', type: 'silver', stolen: true, stolenBy: 'Orc' },
        { id: 'gold1', type: 'gold', stolen: false },
        { id: 'gold2', type: 'gold', stolen: true, stolenBy: 'Dragon' }
      ]

      const stolenTrophies = manager.getStolenTrophies(trophies)

      expect(stolenTrophies).toHaveLength(2)
      expect(stolenTrophies[0]).toEqual({
        id: 'silver2',
        type: 'silver',
        stolen: true,
        stolenBy: 'Orc'
      })
      expect(stolenTrophies[1]).toEqual({
        id: 'gold2',
        type: 'gold',
        stolen: true,
        stolenBy: 'Dragon'
      })
    })

    it('should return empty array when no trophies stolen', () => {
      const trophies: Trophy[] = [
        { id: 'silver1', type: 'silver', stolen: false },
        { id: 'gold1', type: 'gold', stolen: false }
      ]

      const stolenTrophies = manager.getStolenTrophies(trophies)

      expect(stolenTrophies).toHaveLength(0)
    })
  })

  describe('trophy validation', () => {
    it('should validate correct trophy array', () => {
      const trophies: Trophy[] = [
        { id: 'silver1', type: 'silver', stolen: false },
        { id: 'gold1', type: 'gold', stolen: true, stolenBy: 'Orc' }
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
      const trophies: Trophy[] = [
        { id: 'invalid', type: 'bronze' as any, stolen: false }
      ]

      const validation = manager.validateTrophies(trophies)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Invalid trophy types found: bronze')
    })

    it('should detect stolen trophies without thief', () => {
      const trophies: Trophy[] = [
        { id: 'invalid_stolen', type: 'gold', stolen: true }
      ]

      const validation = manager.validateTrophies(trophies)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Stolen trophies found without thief information')
    })
  })

  describe('trophy creation', () => {
    it('should create valid silver trophy', () => {
      const trophy = manager.createTrophy('silver')

      expect(trophy.type).toBe('silver')
      expect(trophy.stolen).toBe(false)
      expect(trophy.stolenBy).toBeUndefined()
      expect(trophy.id).toMatch(/^silver_trophy_/)
    })

    it('should create valid gold trophy', () => {
      const trophy = manager.createTrophy('gold')

      expect(trophy.type).toBe('gold')
      expect(trophy.stolen).toBe(false)
      expect(trophy.stolenBy).toBeUndefined()
      expect(trophy.id).toMatch(/^gold_trophy_/)
    })

    it('should create stolen trophy with thief', () => {
      const trophy = manager.createTrophy('gold', true, 'Dragon')

      expect(trophy.type).toBe('gold')
      expect(trophy.stolen).toBe(true)
      expect(trophy.stolenBy).toBe('Dragon')
    })

    it('should create unique trophy IDs', () => {
      const trophy1 = manager.createTrophy('silver')
      const trophy2 = manager.createTrophy('silver')

      expect(trophy1.id).not.toBe(trophy2.id)
    })
  })

  describe('reset functionality', () => {
    it('should reset trophies to empty array', () => {
      const emptyTrophies = manager.resetTrophies()

      expect(emptyTrophies).toEqual([])
      expect(emptyTrophies).toHaveLength(0)
    })
  })

  describe('complete victory trophy flow', () => {
    it('should process victory without collapse', () => {
      const existingTrophies: Trophy[] = [
        { id: 'existing', type: 'silver', stolen: false }
      ]

      const result = manager.processVictoryTrophies(mockBoard, existingTrophies)

      expect(result.awardResult.trophiesEarned).toBe(6)
      expect(result.collapseResult).toBeUndefined()
      expect(result.finalTrophies).toHaveLength(7)
    })

    it('should process victory with collapse', () => {
      const existingTrophies: Trophy[] = Array.from({ length: 8 }, (_, i) => ({
        id: `silver_${i}`,
        type: 'silver' as const,
        stolen: false
      }))

      const result = manager.processVictoryTrophies(mockBoard, existingTrophies)

      expect(result.awardResult.trophiesEarned).toBe(6)
      expect(result.collapseResult).toBeDefined()
      expect(result.collapseResult!.collapsed).toBe(true)
      expect(result.collapseResult!.goldTrophiesCreated).toBe(1)
      expect(result.finalTrophies).toHaveLength(5) // 1 gold + 4 remaining silver
    })
  })
})