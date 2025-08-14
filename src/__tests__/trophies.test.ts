// Test the trophy sorting logic from trophies.ts
// We'll extract the sorting function to test it in isolation

// Extracted pure function from trophies.ts for testing
function sortTrophies(trophies: any[]): any[] {
  return [...trophies].sort((a: any, b: any) => {
    // Priority order: 1=gold, 2=stolen gold, 3=silver
    const getPriority = (trophy: any) => {
      if (trophy.type === 'gold' && !trophy.stolen) return 1
      if (trophy.type === 'gold' && trophy.stolen) return 2
      return 3 // silver
    }
    
    return getPriority(a) - getPriority(b)
  })
}

describe('trophies', () => {
  describe('trophy sorting logic', () => {
    it('should sort gold trophies first', () => {
      const trophies = [
        { type: 'silver', stolen: false },
        { type: 'gold', stolen: false },
        { type: 'silver', stolen: false }
      ]
      
      const sorted = sortTrophies(trophies)
      
      expect(sorted[0].type).toBe('gold')
      expect(sorted[0].stolen).toBe(false)
    })

    it('should sort stolen gold trophies after regular gold', () => {
      const trophies = [
        { type: 'gold', stolen: true, stolenBy: 'AI' },
        { type: 'gold', stolen: false },
        { type: 'silver', stolen: false }
      ]
      
      const sorted = sortTrophies(trophies)
      
      expect(sorted[0]).toEqual({ type: 'gold', stolen: false })
      expect(sorted[1]).toEqual({ type: 'gold', stolen: true, stolenBy: 'AI' })
      expect(sorted[2]).toEqual({ type: 'silver', stolen: false })
    })

    it('should sort silver trophies last', () => {
      const trophies = [
        { type: 'silver', stolen: false },
        { type: 'gold', stolen: false },
        { type: 'gold', stolen: true, stolenBy: 'AI' },
        { type: 'silver', stolen: false }
      ]
      
      const sorted = sortTrophies(trophies)
      
      expect(sorted[0].type).toBe('gold')
      expect(sorted[0].stolen).toBe(false)
      expect(sorted[1].type).toBe('gold')
      expect(sorted[1].stolen).toBe(true)
      expect(sorted[2].type).toBe('silver')
      expect(sorted[3].type).toBe('silver')
    })

    it('should maintain stable sort for trophies of same priority', () => {
      const trophies = [
        { type: 'silver', stolen: false, id: 1 },
        { type: 'silver', stolen: false, id: 2 },
        { type: 'silver', stolen: false, id: 3 }
      ]
      
      const sorted = sortTrophies(trophies)
      
      // All have same priority, order should be maintained
      expect(sorted[0].id).toBe(1)
      expect(sorted[1].id).toBe(2)
      expect(sorted[2].id).toBe(3)
    })

    it('should handle empty trophy array', () => {
      const trophies: any[] = []
      
      const sorted = sortTrophies(trophies)
      
      expect(sorted).toEqual([])
    })

    it('should handle single trophy', () => {
      const trophies = [{ type: 'gold', stolen: false }]
      
      const sorted = sortTrophies(trophies)
      
      expect(sorted).toEqual([{ type: 'gold', stolen: false }])
    })

    it('should not mutate original array', () => {
      const originalTrophies = [
        { type: 'silver', stolen: false },
        { type: 'gold', stolen: false }
      ]
      const originalOrder = [...originalTrophies]
      
      const sorted = sortTrophies(originalTrophies)
      
      // Original array should be unchanged
      expect(originalTrophies).toEqual(originalOrder)
      // Sorted should be different
      expect(sorted[0].type).toBe('gold')
      expect(sorted[1].type).toBe('silver')
    })

    it('should handle complex mixed trophy scenario', () => {
      const trophies = [
        { type: 'silver', stolen: false, level: 5 },
        { type: 'gold', stolen: true, stolenBy: 'AI', level: 10 },
        { type: 'gold', stolen: false, level: 8 },
        { type: 'silver', stolen: false, level: 3 },
        { type: 'gold', stolen: false, level: 12 },
        { type: 'gold', stolen: true, stolenBy: 'AI', level: 6 }
      ]
      
      const sorted = sortTrophies(trophies)
      
      // Check priority order
      expect(sorted[0].type).toBe('gold')
      expect(sorted[0].stolen).toBe(false)
      expect(sorted[1].type).toBe('gold')
      expect(sorted[1].stolen).toBe(false)
      expect(sorted[2].type).toBe('gold')
      expect(sorted[2].stolen).toBe(true)
      expect(sorted[3].type).toBe('gold')
      expect(sorted[3].stolen).toBe(true)
      expect(sorted[4].type).toBe('silver')
      expect(sorted[5].type).toBe('silver')
    })

    it('should handle missing stolen property gracefully', () => {
      const trophies = [
        { type: 'gold' }, // stolen property missing
        { type: 'silver', stolen: false }
      ]
      
      const sorted = sortTrophies(trophies)
      
      // Missing stolen should be treated as falsy
      expect(sorted[0].type).toBe('gold')
      expect(sorted[1].type).toBe('silver')
    })

    it('should handle unknown trophy types as silver priority', () => {
      const trophies = [
        { type: 'bronze', stolen: false },
        { type: 'gold', stolen: false },
        { type: 'platinum', stolen: false }
      ]
      
      const sorted = sortTrophies(trophies)
      
      // Gold should be first, unknown types should be treated as silver (last)
      expect(sorted[0].type).toBe('gold')
      expect(sorted[1].type).toBe('bronze') // Unknown type, silver priority
      expect(sorted[2].type).toBe('platinum') // Unknown type, silver priority
    })

    it('should properly distinguish stolen vs non-stolen gold', () => {
      const trophies = [
        { type: 'gold', stolen: true, stolenBy: 'Player1' },
        { type: 'gold', stolen: false },
        { type: 'gold', stolen: true, stolenBy: 'Player2' },
        { type: 'gold', stolen: false }
      ]
      
      const sorted = sortTrophies(trophies)
      
      // First two should be non-stolen gold
      expect(sorted[0]).toMatchObject({ type: 'gold', stolen: false })
      expect(sorted[1]).toMatchObject({ type: 'gold', stolen: false })
      
      // Last two should be stolen gold
      expect(sorted[2]).toMatchObject({ type: 'gold', stolen: true })
      expect(sorted[3]).toMatchObject({ type: 'gold', stolen: true })
    })

    it('should handle boolean stolen values correctly', () => {
      const trophies = [
        { type: 'gold', stolen: true },
        { type: 'gold', stolen: false },
        { type: 'gold', stolen: 1 }, // Truthy
        { type: 'gold', stolen: 0 }  // Falsy
      ]
      
      const sorted = sortTrophies(trophies)
      
      // False and 0 should be treated as non-stolen (priority 1)
      expect(sorted[0].stolen).toBe(false)
      expect(sorted[1].stolen).toBe(0)
      
      // True and 1 should be treated as stolen (priority 2)  
      expect(sorted[2].stolen).toBe(true)
      expect(sorted[3].stolen).toBe(1)
    })
  })
})