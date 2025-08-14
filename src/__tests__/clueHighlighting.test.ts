import { getTileDisplayColor } from '../clueHighlighting'

describe('clueHighlighting', () => {
  describe('getTileDisplayColor', () => {
    it('should return unrevealed color for unrevealed tiles', () => {
      const unrevealedTile = {
        revealed: false,
        owner: 'player'
      }
      
      const color = getTileDisplayColor(unrevealedTile)
      
      expect(color).toBe('#555')
    })

    it('should return player color for revealed player tiles', () => {
      const playerTile = {
        revealed: true,
        owner: 'player'
      }
      
      const color = getTileDisplayColor(playerTile)
      
      expect(color).toBe('#4CAF50')
    })

    it('should return opponent color for revealed opponent tiles', () => {
      const opponentTile = {
        revealed: true,
        owner: 'opponent'
      }
      
      const color = getTileDisplayColor(opponentTile)
      
      expect(color).toBe('#F44336')
    })

    it('should return neutral color for revealed neutral tiles', () => {
      const neutralTile = {
        revealed: true,
        owner: 'neutral'
      }
      
      const color = getTileDisplayColor(neutralTile)
      
      expect(color).toBe('#9E9E9E')
    })

    it('should return default color for unknown owner types', () => {
      const unknownTile = {
        revealed: true,
        owner: 'unknown'
      }
      
      const color = getTileDisplayColor(unknownTile)
      
      expect(color).toBe('#555')
    })

    it('should prioritize revealed state over owner - unrevealed player tile', () => {
      const unrevealedPlayerTile = {
        revealed: false,
        owner: 'player'
      }
      
      const color = getTileDisplayColor(unrevealedPlayerTile)
      
      // Should return unrevealed color regardless of owner
      expect(color).toBe('#555')
    })

    it('should prioritize revealed state over owner - unrevealed opponent tile', () => {
      const unrevealedOpponentTile = {
        revealed: false,
        owner: 'opponent'
      }
      
      const color = getTileDisplayColor(unrevealedOpponentTile)
      
      // Should return unrevealed color regardless of owner
      expect(color).toBe('#555')
    })

    it('should handle undefined revealed property', () => {
      const tileWithUndefinedRevealed = {
        owner: 'player'
        // revealed property missing
      }
      
      const color = getTileDisplayColor(tileWithUndefinedRevealed as any)
      
      // Should treat undefined as falsy and return unrevealed color
      expect(color).toBe('#555')
    })

    it('should handle null tile input gracefully', () => {
      expect(() => {
        getTileDisplayColor(null as any)
      }).toThrow()
    })

    it('should handle undefined tile input gracefully', () => {
      expect(() => {
        getTileDisplayColor(undefined as any)
      }).toThrow()
    })

    it('should handle tile with missing owner property', () => {
      const tileWithoutOwner = {
        revealed: true
        // owner property missing
      }
      
      const color = getTileDisplayColor(tileWithoutOwner as any)
      
      // Should return default color when owner is undefined
      expect(color).toBe('#555')
    })

    it('should return correct colors matching renderer colors', () => {
      // Test that colors match the ones specified in comments
      const revealedPlayerTile = { revealed: true, owner: 'player' }
      const revealedOpponentTile = { revealed: true, owner: 'opponent' }
      const revealedNeutralTile = { revealed: true, owner: 'neutral' }
      
      // Colors should match the "vibrant" colors mentioned in comments
      expect(getTileDisplayColor(revealedPlayerTile)).toBe('#4CAF50') // Green
      expect(getTileDisplayColor(revealedOpponentTile)).toBe('#F44336') // Red
      expect(getTileDisplayColor(revealedNeutralTile)).toBe('#9E9E9E') // Gray
    })

    it('should be case-sensitive for owner values', () => {
      const uppercasePlayerTile = {
        revealed: true,
        owner: 'PLAYER'
      }
      
      const color = getTileDisplayColor(uppercasePlayerTile)
      
      // Should not match 'player' and return default color
      expect(color).toBe('#555')
    })

    it('should handle different boolean representations for revealed', () => {
      const truthyTile = {
        revealed: 1,
        owner: 'player'
      }
      
      const falsyTile = {
        revealed: 0,
        owner: 'player'
      }
      
      // JavaScript truthiness should work for revealed check
      const truthyColor = getTileDisplayColor(truthyTile as any)
      const falsyColor = getTileDisplayColor(falsyTile as any)
      
      expect(truthyColor).toBe('#4CAF50') // Should be treated as revealed
      expect(falsyColor).toBe('#555') // Should be treated as unrevealed
    })
  })
})