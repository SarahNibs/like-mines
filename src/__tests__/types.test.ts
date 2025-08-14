import { 
  getTileAt,
  getTilesByOwner,
  TileOwner,
  TileContent,
  Board,
  Tile
} from '../types'

// Helper function to create a test board
function createTestBoard(width: number, height: number): Board {
  const tiles = Array(height).fill(null).map((_, y) => 
    Array(width).fill(null).map((_, x) => ({
      x,
      y,
      owner: TileOwner.Neutral,
      content: TileContent.Empty,
      revealed: false,
      contentVisible: false,
      annotated: 'none' as const,
      fogged: false
    }))
  )

  return {
    width,
    height,
    tiles,
    playerTilesTotal: 0,
    opponentTilesTotal: 0,
    playerTilesRevealed: 0,
    opponentTilesRevealed: 0
  }
}

describe('types', () => {
  describe('getTileAt', () => {
    it('should return tile at valid coordinates', () => {
      const board = createTestBoard(5, 5)
      
      const tile = getTileAt(board, 2, 3)
      
      expect(tile).not.toBeNull()
      expect(tile!.x).toBe(2)
      expect(tile!.y).toBe(3)
    })

    it('should return null for out-of-bounds coordinates', () => {
      const board = createTestBoard(3, 3)
      
      // Test negative coordinates
      expect(getTileAt(board, -1, 0)).toBeNull()
      expect(getTileAt(board, 0, -1)).toBeNull()
      
      // Test coordinates beyond board size
      expect(getTileAt(board, 3, 0)).toBeNull()
      expect(getTileAt(board, 0, 3)).toBeNull()
      expect(getTileAt(board, 5, 5)).toBeNull()
    })

    it('should handle edge coordinates correctly', () => {
      const board = createTestBoard(4, 4)
      
      // Test corners
      expect(getTileAt(board, 0, 0)).not.toBeNull()
      expect(getTileAt(board, 3, 3)).not.toBeNull()
      expect(getTileAt(board, 0, 3)).not.toBeNull()
      expect(getTileAt(board, 3, 0)).not.toBeNull()
      
      // Test just beyond edges
      expect(getTileAt(board, 4, 0)).toBeNull()
      expect(getTileAt(board, 0, 4)).toBeNull()
    })

    it('should return correct tile reference', () => {
      const board = createTestBoard(2, 2)
      
      // Modify a specific tile
      board.tiles[1][0].owner = TileOwner.Player
      board.tiles[1][0].content = TileContent.Gold
      
      const tile = getTileAt(board, 0, 1)
      
      expect(tile).not.toBeNull()
      expect(tile!.owner).toBe(TileOwner.Player)
      expect(tile!.content).toBe(TileContent.Gold)
    })

    it('should handle 1x1 board', () => {
      const board = createTestBoard(1, 1)
      
      expect(getTileAt(board, 0, 0)).not.toBeNull()
      expect(getTileAt(board, 1, 0)).toBeNull()
      expect(getTileAt(board, 0, 1)).toBeNull()
    })
  })

  describe('getTilesByOwner', () => {
    it('should return empty array when no tiles match owner', () => {
      const board = createTestBoard(3, 3)
      
      // All tiles default to Neutral, so Player should return empty
      const playerTiles = getTilesByOwner(board, TileOwner.Player)
      
      expect(playerTiles).toEqual([])
      expect(playerTiles.length).toBe(0)
    })

    it('should return all tiles for matching owner', () => {
      const board = createTestBoard(2, 2)
      
      // All tiles default to Neutral
      const neutralTiles = getTilesByOwner(board, TileOwner.Neutral)
      
      expect(neutralTiles.length).toBe(4)
      expect(neutralTiles.every(tile => tile.owner === TileOwner.Neutral)).toBe(true)
    })

    it('should return mixed tiles correctly', () => {
      const board = createTestBoard(3, 3)
      
      // Set up mixed ownership
      board.tiles[0][0].owner = TileOwner.Player
      board.tiles[0][1].owner = TileOwner.Player
      board.tiles[1][0].owner = TileOwner.Opponent
      board.tiles[2][2].owner = TileOwner.Opponent
      // Rest remain Neutral
      
      const playerTiles = getTilesByOwner(board, TileOwner.Player)
      const opponentTiles = getTilesByOwner(board, TileOwner.Opponent)
      const neutralTiles = getTilesByOwner(board, TileOwner.Neutral)
      
      expect(playerTiles.length).toBe(2)
      expect(opponentTiles.length).toBe(2)
      expect(neutralTiles.length).toBe(5)
      
      // Verify total adds up
      expect(playerTiles.length + opponentTiles.length + neutralTiles.length).toBe(9)
    })

    it('should return tiles in correct order (row by row)', () => {
      const board = createTestBoard(2, 2)
      
      // Set all to same owner to test order
      board.tiles[0][0].owner = TileOwner.Player
      board.tiles[0][1].owner = TileOwner.Player
      board.tiles[1][0].owner = TileOwner.Player
      board.tiles[1][1].owner = TileOwner.Player
      
      const tiles = getTilesByOwner(board, TileOwner.Player)
      
      expect(tiles.length).toBe(4)
      expect(tiles[0]).toEqual(expect.objectContaining({ x: 0, y: 0 }))
      expect(tiles[1]).toEqual(expect.objectContaining({ x: 1, y: 0 }))
      expect(tiles[2]).toEqual(expect.objectContaining({ x: 0, y: 1 }))
      expect(tiles[3]).toEqual(expect.objectContaining({ x: 1, y: 1 }))
    })

    it('should return actual tile references, not copies', () => {
      const board = createTestBoard(2, 2)
      
      board.tiles[0][0].owner = TileOwner.Player
      board.tiles[1][1].owner = TileOwner.Player
      
      const tiles = getTilesByOwner(board, TileOwner.Player)
      
      expect(tiles.length).toBe(2)
      expect(tiles[0]).toBe(board.tiles[0][0])
      expect(tiles[1]).toBe(board.tiles[1][1])
      
      // Modifying returned tile should modify original
      tiles[0].revealed = true
      expect(board.tiles[0][0].revealed).toBe(true)
    })

    it('should handle all owner types', () => {
      const board = createTestBoard(2, 2)
      
      board.tiles[0][0].owner = TileOwner.Player
      board.tiles[0][1].owner = TileOwner.Opponent
      board.tiles[1][0].owner = TileOwner.Neutral
      board.tiles[1][1].owner = TileOwner.Wall
      
      expect(getTilesByOwner(board, TileOwner.Player).length).toBe(1)
      expect(getTilesByOwner(board, TileOwner.Opponent).length).toBe(1)
      expect(getTilesByOwner(board, TileOwner.Neutral).length).toBe(1)
      expect(getTilesByOwner(board, TileOwner.Wall).length).toBe(1)
    })

    it('should handle large boards efficiently', () => {
      const board = createTestBoard(10, 10)
      
      // Set up alternating pattern
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          board.tiles[y][x].owner = (x + y) % 2 === 0 ? TileOwner.Player : TileOwner.Opponent
        }
      }
      
      const playerTiles = getTilesByOwner(board, TileOwner.Player)
      const opponentTiles = getTilesByOwner(board, TileOwner.Opponent)
      
      expect(playerTiles.length + opponentTiles.length).toBe(100)
      expect(playerTiles.length).toBe(50) // Half should be player
      expect(opponentTiles.length).toBe(50) // Half should be opponent
    })

    it('should handle empty board', () => {
      const board = createTestBoard(0, 0)
      board.tiles = [] // Empty tiles array
      
      const tiles = getTilesByOwner(board, TileOwner.Player)
      
      expect(tiles).toEqual([])
      expect(tiles.length).toBe(0)
    })
  })

  describe('board structure validation', () => {
    it('should create boards with correct structure', () => {
      const board = createTestBoard(3, 4)
      
      expect(board.width).toBe(3)
      expect(board.height).toBe(4)
      expect(board.tiles.length).toBe(4) // Height rows
      expect(board.tiles[0].length).toBe(3) // Width columns
      
      // Check all tiles have correct coordinates
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 3; x++) {
          expect(board.tiles[y][x].x).toBe(x)
          expect(board.tiles[y][x].y).toBe(y)
        }
      }
    })

    it('should have consistent tile properties', () => {
      const board = createTestBoard(2, 2)
      
      board.tiles.forEach(row => {
        row.forEach(tile => {
          expect(tile).toMatchObject({
            x: expect.any(Number),
            y: expect.any(Number),
            owner: expect.any(String),
            content: expect.any(String),
            revealed: expect.any(Boolean),
            contentVisible: expect.any(Boolean),
            annotated: expect.any(String),
            fogged: expect.any(Boolean)
          })
        })
      })
    })
  })
})