import { getLevelSpec } from '../levelSpecs'

describe('levelSpecs', () => {
  describe('getLevelSpec', () => {
    it('should return valid spec for level 1', () => {
      const spec = getLevelSpec(1)
      
      expect(spec).toMatchObject({
        width: expect.any(Number),
        height: expect.any(Number),
        playerTileRatio: expect.any(Number),
        opponentTileRatio: expect.any(Number)
      })
      
      // Level 1 should be reasonable starting values
      expect(spec.width).toBeGreaterThan(0)
      expect(spec.height).toBeGreaterThan(0)
      expect(spec.playerTileRatio).toBeGreaterThan(0)
      expect(spec.opponentTileRatio).toBeGreaterThan(0)
      expect(spec.playerTileRatio + spec.opponentTileRatio).toBeLessThanOrEqual(1.0)
    })

    it('should return valid spec for mid-level', () => {
      const spec = getLevelSpec(10)
      
      expect(spec).toBeDefined()
      expect(spec.width).toBeGreaterThan(0)
      expect(spec.height).toBeGreaterThan(0)
    })

    it('should return valid spec for max level', () => {
      const spec = getLevelSpec(20)
      
      expect(spec).toBeDefined()
      expect(spec.width).toBeGreaterThan(0)
      expect(spec.height).toBeGreaterThan(0)
    })

    it('should throw error for invalid levels', () => {
      expect(() => getLevelSpec(0)).toThrow('Invalid level: 0')
      expect(() => getLevelSpec(-1)).toThrow('Invalid level: -1')
      expect(() => getLevelSpec(21)).toThrow('Invalid level: 21')
      expect(() => getLevelSpec(100)).toThrow('Invalid level: 100')
    })

    it('should have reasonable board dimensions', () => {
      for (let level = 1; level <= 20; level++) {
        const spec = getLevelSpec(level)
        
        // Board dimensions should be reasonable for gameplay
        // Early levels can be smaller (3x3 minimum for tutorial levels)
        expect(spec.width).toBeGreaterThanOrEqual(4)
        expect(spec.height).toBeGreaterThanOrEqual(3)
        expect(spec.width).toBeLessThanOrEqual(20)
        expect(spec.height).toBeLessThanOrEqual(20)
      }
    })

    it('should have balanced tile distribution', () => {
      for (let level = 1; level <= 20; level++) {
        const spec = getLevelSpec(level)
        
        // Should have some of each tile type for interesting gameplay
        expect(spec.playerTileRatio).toBeGreaterThan(0)
        expect(spec.opponentTileRatio).toBeGreaterThan(0)
        
        // Ratios should sum to <= 1.0 (remainder is neutral)
        expect(spec.playerTileRatio + spec.opponentTileRatio).toBeLessThanOrEqual(1.0)
        
        // Player and opponent ratios should be somewhat balanced
        const ratio = spec.playerTileRatio / spec.opponentTileRatio
        expect(ratio).toBeGreaterThan(0.25) // Player shouldn't be completely outnumbered
        expect(ratio).toBeLessThan(4) // Player shouldn't completely outnumber opponent
      }
    })

    it('should have valid spawn configurations', () => {
      // Test that all levels have the required structure without deep validation
      for (let level = 1; level <= 20; level++) {
        const spec = getLevelSpec(level)
        
        // Should have spawn configuration objects
        expect(spec.monsters).toBeDefined()
        expect(spec.goldCoins).toBeDefined()
        expect(spec.upgrades).toBeDefined()
        
        // Spawn configs should have min/max structure
        expect(spec.monsters).toHaveProperty('min')
        expect(spec.monsters).toHaveProperty('max')
      }
    })

    it('should handle boundary values correctly', () => {
      // Should work exactly at boundaries
      expect(() => getLevelSpec(1)).not.toThrow()
      expect(() => getLevelSpec(20)).not.toThrow()
      
      // Should fail just outside boundaries
      expect(() => getLevelSpec(0)).toThrow()
      expect(() => getLevelSpec(21)).toThrow()
    })
  })
})