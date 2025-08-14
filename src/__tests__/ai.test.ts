import { DumbAI } from '../ai'
import { Board, Tile, TileOwner, TileContent } from '../types'

// Custom matcher for checking if value is one of several options
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R
    }
  }
}

expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received)
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false
      }
    }
  }
})

// Helper function to create test board
function createTestBoard(
  opponentTileData: Array<{x: number, y: number, revealed?: boolean, content?: TileContent, itemData?: any}>
): Board {
  const maxX = Math.max(...opponentTileData.map(t => t.x))
  const maxY = Math.max(...opponentTileData.map(t => t.y))
  const width = maxX + 1
  const height = maxY + 1
  
  // Initialize board with neutral tiles
  const tiles: Tile[][] = Array(height).fill(null).map((_, y) => 
    Array(width).fill(null).map((_, x) => ({
      x, y,
      owner: TileOwner.Neutral,
      revealed: false,
      content: TileContent.Empty,
      itemData: null,
      upgradeData: null,
      monsterData: null,
      annotation: '',
      highlighted: false
    }))
  )
  
  // Set opponent tiles with specified properties
  opponentTileData.forEach(tileData => {
    const tile = tiles[tileData.y][tileData.x]
    tile.owner = TileOwner.Opponent
    tile.revealed = tileData.revealed || false
    tile.content = tileData.content || TileContent.Empty
    tile.itemData = tileData.itemData || null
  })
  
  return { width, height, tiles }
}

// Extract AI decision logic as pure functions for testing
function filterSafeTilesFirstTurn(tiles: Tile[]): Tile[] {
  return tiles.filter(tile => 
    tile.content !== TileContent.PermanentUpgrade && 
    (tile.content !== TileContent.Item || 
     (tile.content === TileContent.Item && tile.itemData?.id !== 'shop'))
  )
}

function selectRandomTile(tiles: Tile[], rng: () => number = Math.random): Tile {
  const randomIndex = Math.floor(rng() * tiles.length)
  return tiles[randomIndex]
}

describe('ai', () => {
  describe('DumbAI', () => {
    let ai: DumbAI

    beforeEach(() => {
      ai = new DumbAI()
    })

    it('should have correct name', () => {
      expect(ai.name).toBe('Random AI')
    })

    it('should return null when no unrevealed opponent tiles available', () => {
      const board = createTestBoard([
        { x: 0, y: 0, revealed: true },
        { x: 1, y: 0, revealed: true }
      ])
      
      const move = ai.takeTurn(board)
      
      expect(move).toBeNull()
    })

    it('should return valid coordinates for available opponent tiles', () => {
      const board = createTestBoard([
        { x: 1, y: 1, revealed: false },
        { x: 2, y: 1, revealed: false }
      ])
      
      const move = ai.takeTurn(board)
      
      expect(move).not.toBeNull()
      expect(move!.x).toBeOneOf([1, 2])
      expect(move!.y).toBe(1)
    })

    it('should avoid upgrades on first turn when safe tiles available', () => {
      const board = createTestBoard([
        { x: 0, y: 0, revealed: false, content: TileContent.PermanentUpgrade },
        { x: 1, y: 0, revealed: false, content: TileContent.Empty },
        { x: 2, y: 0, revealed: false, content: TileContent.Empty }
      ])
      
      const move = ai.takeTurn(board)
      
      expect(move).not.toBeNull()
      expect(move!.x).not.toBe(0) // Should avoid the upgrade tile
      expect(move!.x).toBeOneOf([1, 2]) // Should pick one of the safe tiles
    })

    it('should avoid shops on first turn when safe tiles available', () => {
      const board = createTestBoard([
        { x: 0, y: 0, revealed: false, content: TileContent.Item, itemData: { id: 'shop' }},
        { x: 1, y: 0, revealed: false, content: TileContent.Empty },
        { x: 2, y: 0, revealed: false, content: TileContent.Empty }
      ])
      
      const move = ai.takeTurn(board)
      
      expect(move).not.toBeNull()
      expect(move!.x).not.toBe(0) // Should avoid the shop tile
      expect(move!.x).toBeOneOf([1, 2]) // Should pick one of the safe tiles
    })

    it('should allow non-shop items on first turn', () => {
      const board = createTestBoard([
        { x: 0, y: 0, revealed: false, content: TileContent.Item, itemData: { id: 'first-aid' }},
        { x: 1, y: 0, revealed: false, content: TileContent.Empty }
      ])
      
      const move = ai.takeTurn(board)
      
      expect(move).not.toBeNull()
      // Should be able to pick either tile since first-aid is safe
      expect(move!.x).toBeOneOf([0, 1])
    })

    it('should fall back to unsafe tiles if no safe tiles available on first turn', () => {
      const board = createTestBoard([
        { x: 0, y: 0, revealed: false, content: TileContent.PermanentUpgrade },
        { x: 1, y: 0, revealed: false, content: TileContent.Item, itemData: { id: 'shop' }}
      ])
      
      const move = ai.takeTurn(board)
      
      expect(move).not.toBeNull()
      // Should pick one of the unsafe tiles since no safe ones available
      expect(move!.x).toBeOneOf([0, 1])
    })

    it('should not avoid upgrades/shops after first turn', () => {
      const board = createTestBoard([
        { x: 0, y: 0, revealed: false, content: TileContent.PermanentUpgrade },
        { x: 1, y: 0, revealed: false, content: TileContent.Empty }
      ])
      
      // Make first turn to disable first-turn logic
      ai.takeTurn(board)
      
      // Make second turn - should be able to pick upgrade tile
      const secondBoard = createTestBoard([
        { x: 0, y: 0, revealed: false, content: TileContent.PermanentUpgrade },
        { x: 1, y: 0, revealed: true } // First tile now revealed
      ])
      
      const move = ai.takeTurn(secondBoard)
      
      expect(move).not.toBeNull()
      expect(move!.x).toBe(0) // Should pick the upgrade tile now
    })

    it('should reset first turn state when resetForNewBoard is called', () => {
      const board = createTestBoard([
        { x: 0, y: 0, revealed: false, content: TileContent.Empty }
      ])
      
      // Make a turn to set isFirstTurn to false
      ai.takeTurn(board)
      
      // Reset for new board
      ai.resetForNewBoard()
      
      // Should now act as first turn again
      const newBoard = createTestBoard([
        { x: 0, y: 0, revealed: false, content: TileContent.PermanentUpgrade },
        { x: 1, y: 0, revealed: false, content: TileContent.Empty }
      ])
      
      const move = ai.takeTurn(newBoard)
      
      expect(move).not.toBeNull()
      expect(move!.x).toBe(1) // Should avoid upgrade on first turn again
    })

    it('should only consider opponent tiles', () => {
      // Create a board with mixed tile owners
      const board: Board = {
        width: 3,
        height: 1,
        tiles: [[
          {
            x: 0, y: 0,
            owner: TileOwner.Player,
            revealed: false,
            content: TileContent.Empty,
            itemData: null, upgradeData: null, monsterData: null,
            annotation: '', highlighted: false
          },
          {
            x: 1, y: 0,
            owner: TileOwner.Opponent,
            revealed: false,
            content: TileContent.Empty,
            itemData: null, upgradeData: null, monsterData: null,
            annotation: '', highlighted: false
          },
          {
            x: 2, y: 0,
            owner: TileOwner.Neutral,
            revealed: false,
            content: TileContent.Empty,
            itemData: null, upgradeData: null, monsterData: null,
            annotation: '', highlighted: false
          }
        ]]
      }
      
      const move = ai.takeTurn(board)
      
      expect(move).not.toBeNull()
      expect(move!.x).toBe(1) // Should only pick the opponent tile
      expect(move!.y).toBe(0)
    })
  })

  describe('AI decision logic (extracted pure functions)', () => {
    describe('filterSafeTilesFirstTurn', () => {
      it('should filter out permanent upgrades', () => {
        const tiles = [
          { content: TileContent.PermanentUpgrade } as Tile,
          { content: TileContent.Empty } as Tile,
          { content: TileContent.Monster } as Tile
        ]
        
        const safeTiles = filterSafeTilesFirstTurn(tiles)
        
        expect(safeTiles).toHaveLength(2)
        expect(safeTiles).not.toContain(tiles[0])
      })

      it('should filter out shop items', () => {
        const tiles = [
          { content: TileContent.Item, itemData: { id: 'shop' } } as Tile,
          { content: TileContent.Item, itemData: { id: 'first-aid' } } as Tile,
          { content: TileContent.Empty } as Tile
        ]
        
        const safeTiles = filterSafeTilesFirstTurn(tiles)
        
        expect(safeTiles).toHaveLength(2)
        expect(safeTiles).not.toContain(tiles[0])
      })

      it('should allow non-shop items', () => {
        const tiles = [
          { content: TileContent.Item, itemData: { id: 'first-aid' } } as Tile,
          { content: TileContent.Item, itemData: { id: 'gold-coin' } } as Tile,
          { content: TileContent.Empty } as Tile
        ]
        
        const safeTiles = filterSafeTilesFirstTurn(tiles)
        
        expect(safeTiles).toHaveLength(3)
      })

      it('should handle null itemData', () => {
        const tiles = [
          { content: TileContent.Item, itemData: null } as Tile,
          { content: TileContent.Empty } as Tile
        ]
        
        const safeTiles = filterSafeTilesFirstTurn(tiles)
        
        expect(safeTiles).toHaveLength(2) // Should include both
      })

      it('should allow all other content types', () => {
        const tiles = [
          { content: TileContent.Empty } as Tile,
          { content: TileContent.Monster } as Tile,
          { content: TileContent.TemporaryUpgrade } as Tile
        ]
        
        const safeTiles = filterSafeTilesFirstTurn(tiles)
        
        expect(safeTiles).toHaveLength(3)
      })
    })

    describe('selectRandomTile', () => {
      it('should select tiles based on RNG', () => {
        const tiles = [
          { x: 0, y: 0 } as Tile,
          { x: 1, y: 0 } as Tile,
          { x: 2, y: 0 } as Tile
        ]
        
        // Test deterministic selection
        const tile1 = selectRandomTile(tiles, () => 0.1) // Should select index 0
        const tile2 = selectRandomTile(tiles, () => 0.5) // Should select index 1
        const tile3 = selectRandomTile(tiles, () => 0.9) // Should select index 2
        
        expect(tile1.x).toBe(0)
        expect(tile2.x).toBe(1)
        expect(tile3.x).toBe(2)
      })

      it('should handle single tile array', () => {
        const tiles = [{ x: 5, y: 3 } as Tile]
        
        const selected = selectRandomTile(tiles, () => 0.9)
        
        expect(selected.x).toBe(5)
        expect(selected.y).toBe(3)
      })

      it('should handle edge RNG values', () => {
        const tiles = [
          { x: 0 } as Tile,
          { x: 1 } as Tile,
          { x: 2 } as Tile
        ]
        
        // Test edge cases
        const firstTile = selectRandomTile(tiles, () => 0) // Minimum
        const lastTile = selectRandomTile(tiles, () => 0.999) // Near maximum
        
        expect(firstTile.x).toBe(0)
        expect(lastTile.x).toBe(2)
      })
    })
  })
})