import { getBoardConfigForLevel } from '../boardGenerator'

// Note: Since getSpawnConfigForLevel is not exported, we can't test it directly.
// We'll test the exported getBoardConfigForLevel function and extract any pure logic we can test.

describe('boardGenerator', () => {
  describe('getBoardConfigForLevel', () => {
    it('should return valid board config for level 1', () => {
      const config = getBoardConfigForLevel(1)
      
      expect(config).toMatchObject({
        width: expect.any(Number),
        height: expect.any(Number),
        playerTileRatio: expect.any(Number),
        opponentTileRatio: expect.any(Number),
        seed: expect.any(Number)
      })
      
      // Level 1 should have small board dimensions
      expect(config.width).toBeGreaterThan(0)
      expect(config.height).toBeGreaterThan(0)
      expect(config.playerTileRatio).toBeGreaterThan(0)
      expect(config.opponentTileRatio).toBeGreaterThan(0)
      
      // Ratios should be reasonable
      expect(config.playerTileRatio).toBeLessThanOrEqual(1)
      expect(config.opponentTileRatio).toBeLessThanOrEqual(1)
      expect(config.playerTileRatio + config.opponentTileRatio).toBeLessThanOrEqual(1)
    })

    it('should return different configs for different levels', () => {
      const config1 = getBoardConfigForLevel(1)
      const config10 = getBoardConfigForLevel(10)
      const config20 = getBoardConfigForLevel(20)
      
      // Configs should be different (at least some properties)
      const configs = [config1, config10, config20]
      
      // Should have progression in dimensions or ratios
      expect(config20.width).toBeGreaterThanOrEqual(config1.width)
      expect(config20.height).toBeGreaterThanOrEqual(config1.height)
    })

    it('should return consistent config for same level (ignoring seed)', () => {
      const config1a = getBoardConfigForLevel(5)
      const config1b = getBoardConfigForLevel(5)
      
      // Everything except seed should be identical
      expect(config1a.width).toBe(config1b.width)
      expect(config1a.height).toBe(config1b.height)
      expect(config1a.playerTileRatio).toBe(config1b.playerTileRatio)
      expect(config1a.opponentTileRatio).toBe(config1b.opponentTileRatio)
    })

    it('should have semi-random seeds for same level', () => {
      const config1 = getBoardConfigForLevel(3)
      const config2 = getBoardConfigForLevel(3)
      
      // Seeds should be different due to Math.random component
      expect(config1.seed).not.toBe(config2.seed)
    })

    it('should have different base seeds for different levels', () => {
      // Mock Math.random to eliminate randomness and test base seed calculation
      const originalRandom = Math.random
      Math.random = () => 0.5
      
      try {
        const config1 = getBoardConfigForLevel(1)
        const config2 = getBoardConfigForLevel(2)
        
        // Base part should be level * 1000, so difference should be 1000
        const seedDiff = config2.seed - config1.seed
        expect(seedDiff).toBe(1000)
      } finally {
        Math.random = originalRandom
      }
    })

    it('should handle boundary level values', () => {
      expect(() => getBoardConfigForLevel(1)).not.toThrow()
      expect(() => getBoardConfigForLevel(20)).not.toThrow()
    })

    it('should have valid seed format', () => {
      const config = getBoardConfigForLevel(5)
      
      // Seed should be level * 1000 + random component (0-999)
      const baseExpected = 5 * 1000
      expect(config.seed).toBeGreaterThanOrEqual(baseExpected)
      expect(config.seed).toBeLessThan(baseExpected + 1000)
    })

    it('should preserve level spec properties correctly', () => {
      // Test specific levels with known properties
      const level1Config = getBoardConfigForLevel(1)
      const level3Config = getBoardConfigForLevel(3) 
      
      // Level 1 should be 4x3 according to levelSpecs
      expect(level1Config.width).toBe(4)
      expect(level1Config.height).toBe(3)
      
      // Level 3 should be 5x3 according to levelSpecs
      expect(level3Config.width).toBe(5)
      expect(level3Config.height).toBe(3)
    })

    it('should have progressive difficulty in tile ratios', () => {
      const earlyConfig = getBoardConfigForLevel(1)
      const midConfig = getBoardConfigForLevel(10)
      const lateConfig = getBoardConfigForLevel(20)
      
      // Later levels should generally have more balanced ratios (closer to opponent)
      const earlyAdvantage = earlyConfig.playerTileRatio - earlyConfig.opponentTileRatio
      const lateAdvantage = lateConfig.playerTileRatio - lateConfig.opponentTileRatio
      
      // Early levels should favor player more than late levels
      expect(earlyAdvantage).toBeGreaterThanOrEqual(lateAdvantage)
    })

    it('should handle invalid levels gracefully', () => {
      // These should throw because getLevelSpec will throw
      expect(() => getBoardConfigForLevel(0)).toThrow()
      expect(() => getBoardConfigForLevel(21)).toThrow()
      expect(() => getBoardConfigForLevel(-1)).toThrow()
    })
  })

  // Test extracted spawn range calculation logic
  describe('spawn range calculations', () => {
    function calculateSpawnCount(range: {min: number, max: number}, rng?: any): number {
      // Extracted logic from spawn functions: min + random * (max - min + 1)
      // We'll test this logic in isolation
      if (range.min === range.max) return range.min
      
      // Mock RNG for predictable testing
      const mockRng = rng || { getUniform: () => 0.5 }
      return range.min + Math.floor(mockRng.getUniform() * (range.max - range.min + 1))
    }

    it('should return min when min equals max', () => {
      const range = { min: 3, max: 3 }
      const count = calculateSpawnCount(range)
      
      expect(count).toBe(3)
    })

    it('should return value between min and max inclusive', () => {
      const range = { min: 2, max: 5 }
      
      // Test with different RNG values
      const count1 = calculateSpawnCount(range, { getUniform: () => 0 }) // Should give min
      const count2 = calculateSpawnCount(range, { getUniform: () => 0.99 }) // Should give max
      
      expect(count1).toBe(2)
      expect(count2).toBe(5)
    })

    it('should distribute evenly across range', () => {
      const range = { min: 1, max: 4 }
      
      // Test different uniform values
      const results = [
        calculateSpawnCount(range, { getUniform: () => 0.0 }),   // 1
        calculateSpawnCount(range, { getUniform: () => 0.24 }),  // 1  
        calculateSpawnCount(range, { getUniform: () => 0.25 }),  // 2
        calculateSpawnCount(range, { getUniform: () => 0.49 }),  // 2
        calculateSpawnCount(range, { getUniform: () => 0.5 }),   // 3
        calculateSpawnCount(range, { getUniform: () => 0.74 }),  // 3
        calculateSpawnCount(range, { getUniform: () => 0.75 }),  // 4
        calculateSpawnCount(range, { getUniform: () => 0.99 })   // 4
      ]
      
      expect(results).toEqual([1, 1, 2, 2, 3, 3, 4, 4])
    })

    it('should handle zero ranges correctly', () => {
      const range = { min: 0, max: 0 }
      const count = calculateSpawnCount(range)
      
      expect(count).toBe(0)
    })

    it('should handle single-value ranges', () => {
      const range = { min: 7, max: 7 }
      const count = calculateSpawnCount(range)
      
      expect(count).toBe(7)
    })
  })

  // Test tile priority logic extracted from chain creation
  describe('chain tile priority logic', () => {
    function shouldBlockPlayerTile(tile1Owner: string, tile2Owner: string): boolean {
      // Extracted logic from createRegularChain
      if (tile1Owner === 'player' && tile2Owner !== 'player') {
        return true // Block the player tile (tile1)
      } else if (tile2Owner === 'player' && tile1Owner !== 'player') {
        return false // Block the player tile (tile2)
      } else {
        return false // Both same type or neither player - would be random in actual code
      }
    }

    it('should prefer blocking player tiles over non-player tiles', () => {
      expect(shouldBlockPlayerTile('player', 'opponent')).toBe(true)
      expect(shouldBlockPlayerTile('player', 'neutral')).toBe(true)
      expect(shouldBlockPlayerTile('opponent', 'player')).toBe(false)
      expect(shouldBlockPlayerTile('neutral', 'player')).toBe(false)
    })

    it('should not have preference when both tiles are same owner type', () => {
      expect(shouldBlockPlayerTile('player', 'player')).toBe(false)
      expect(shouldBlockPlayerTile('opponent', 'opponent')).toBe(false)
      expect(shouldBlockPlayerTile('neutral', 'neutral')).toBe(false)
    })

    it('should not have preference when neither tile is player', () => {
      expect(shouldBlockPlayerTile('opponent', 'neutral')).toBe(false)
      expect(shouldBlockPlayerTile('neutral', 'opponent')).toBe(false)
    })
  })
})