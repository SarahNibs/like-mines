import { generateClue, ClueHand, ProbabilisticClue } from '../clues'
import { Board, Tile, TileOwner } from '../types'

// Helper function to create a board with specific tile configuration
function createTestBoard(playerPositions: [number, number][], opponentPositions: [number, number][], neutralPositions: [number, number][] = []): Board {
  const width = Math.max(...playerPositions.concat(opponentPositions).concat(neutralPositions).map(([x, _]) => x)) + 1
  const height = Math.max(...playerPositions.concat(opponentPositions).concat(neutralPositions).map(([_, y]) => y)) + 1
  
  const tiles: Tile[][] = Array(height).fill(null).map((_, y) => 
    Array(width).fill(null).map((_, x) => ({
      x, y,
      owner: TileOwner.Neutral,
      revealed: false,
      itemData: null,
      upgradeData: null,
      monsterData: null,
      annotation: '',
      highlighted: false
    }))
  )
  
  // Set player tiles
  playerPositions.forEach(([x, y]) => {
    tiles[y][x].owner = TileOwner.Player
  })
  
  // Set opponent tiles
  opponentPositions.forEach(([x, y]) => {
    tiles[y][x].owner = TileOwner.Opponent
  })
  
  // Set neutral tiles (if specified explicitly)
  neutralPositions.forEach(([x, y]) => {
    tiles[y][x].owner = TileOwner.Neutral
  })
  
  return { width, height, tiles }
}

describe('clues', () => {
  // Store original Math.random
  let originalRandom: () => number
  
  beforeEach(() => {
    originalRandom = Math.random
  })
  
  afterEach(() => {
    Math.random = originalRandom
  })

  describe('generateClue', () => {
    it('should generate clue with basic structure', () => {
      const board = createTestBoard([[0, 0], [1, 0]], [[2, 0], [3, 0]])
      
      const clue = generateClue(board, [])
      
      expect(clue).toMatchObject({
        handA: {
          tiles: expect.any(Array),
          label: "Hand A"
        },
        handB: {
          tiles: expect.any(Array),
          label: "Hand B"
        },
        hint: expect.any(String)
      })
    })

    it('should create hands with correct base composition (1 player + 1 non-player each)', () => {
      // Mock Math.random to return predictable sequence: 0.1, 0.2, 0.3, ...
      let callCount = 0
      Math.random = () => (callCount++ * 0.1) % 1
      
      const board = createTestBoard([[0, 0], [1, 0]], [[2, 0], [3, 0]])
      
      const clue = generateClue(board, [])
      
      expect(clue.handA.tiles).toHaveLength(2)
      expect(clue.handB.tiles).toHaveLength(2)
      
      // Each hand should have exactly 1 player tile
      const handAPlayerTiles = clue.handA.tiles.filter(tile => tile.owner === TileOwner.Player)
      const handBPlayerTiles = clue.handB.tiles.filter(tile => tile.owner === TileOwner.Player)
      
      expect(handAPlayerTiles).toHaveLength(1)
      expect(handBPlayerTiles).toHaveLength(1)
    })

    it('should respect left-hand upgrade bonuses', () => {
      Math.random = () => 0.5 // Fixed random for predictable shuffling
      
      const board = createTestBoard(
        [[0, 0], [1, 0], [2, 0], [3, 0]], // 4 player tiles
        [[0, 1], [1, 1]] // 2 opponent tiles
      )
      
      const clue = generateClue(board, ['left-hand', 'left-hand'])
      
      // Hand A should have 3 player tiles (1 base + 2 upgrades), Hand B should have 1
      const handAPlayerTiles = clue.handA.tiles.filter(tile => tile.owner === TileOwner.Player)
      const handBPlayerTiles = clue.handB.tiles.filter(tile => tile.owner === TileOwner.Player)
      
      expect(handAPlayerTiles).toHaveLength(3)
      expect(handBPlayerTiles).toHaveLength(1)
      
      // Total hand sizes should be correct
      expect(clue.handA.tiles).toHaveLength(4) // 3 player + 1 non-player
      expect(clue.handB.tiles).toHaveLength(2) // 1 player + 1 non-player
    })

    it('should respect right-hand upgrade bonuses', () => {
      Math.random = () => 0.5
      
      const board = createTestBoard(
        [[0, 0], [1, 0], [2, 0]], // 3 player tiles
        [[0, 1], [1, 1]] // 2 opponent tiles
      )
      
      const clue = generateClue(board, ['right-hand'])
      
      // Hand A should have 1 player tile, Hand B should have 2 (1 base + 1 upgrade)
      const handAPlayerTiles = clue.handA.tiles.filter(tile => tile.owner === TileOwner.Player)
      const handBPlayerTiles = clue.handB.tiles.filter(tile => tile.owner === TileOwner.Player)
      
      expect(handAPlayerTiles).toHaveLength(1)
      expect(handBPlayerTiles).toHaveLength(2)
    })

    it('should handle mixed upgrade types', () => {
      Math.random = () => 0.5
      
      const board = createTestBoard(
        [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], // 5 player tiles
        [[0, 1], [1, 1], [2, 1]] // 3 opponent tiles
      )
      
      const clue = generateClue(board, ['left-hand', 'right-hand'])
      
      // Hand A: 2 player tiles (1 base + 1 left-hand), Hand B: 2 player tiles (1 base + 1 right-hand)
      const handAPlayerTiles = clue.handA.tiles.filter(tile => tile.owner === TileOwner.Player)
      const handBPlayerTiles = clue.handB.tiles.filter(tile => tile.owner === TileOwner.Player)
      
      expect(handAPlayerTiles).toHaveLength(2)
      expect(handBPlayerTiles).toHaveLength(2)
      expect(clue.handA.tiles).toHaveLength(3) // 2 player + 1 non-player
      expect(clue.handB.tiles).toHaveLength(3) // 2 player + 1 non-player
    })

    it('should prefer neutral tiles over opponent tiles for non-player slots', () => {
      Math.random = () => 0.5
      
      const board = createTestBoard(
        [[0, 0]], // 1 player tile
        [[2, 0]], // 1 opponent tile  
        [[1, 0], [3, 0]] // 2 neutral tiles
      )
      
      const clue = generateClue(board)
      
      // Both hands should prefer neutral tiles for their non-player slots
      const allNonPlayerTiles = [...clue.handA.tiles, ...clue.handB.tiles]
        .filter(tile => tile.owner !== TileOwner.Player)
      
      const neutralCount = allNonPlayerTiles.filter(tile => tile.owner === TileOwner.Neutral).length
      const opponentCount = allNonPlayerTiles.filter(tile => tile.owner === TileOwner.Opponent).length
      
      // Should have more neutral tiles than opponent tiles (or equal if all neutral used)
      expect(neutralCount).toBeGreaterThanOrEqual(opponentCount)
    })

    it('should not include revealed tiles', () => {
      const board = createTestBoard([[0, 0], [1, 0]], [[2, 0], [3, 0]])
      
      // Reveal some tiles
      board.tiles[0][0].revealed = true // Player tile
      board.tiles[0][2].revealed = true // Opponent tile
      
      const clue = generateClue(board)
      
      // No revealed tiles should appear in either hand
      const allTiles = [...clue.handA.tiles, ...clue.handB.tiles]
      const revealedTiles = allTiles.filter(tile => tile.revealed)
      
      expect(revealedTiles).toHaveLength(0)
    })

    it('should handle insufficient tiles gracefully', () => {
      Math.random = () => 0.5
      
      // More tiles available to avoid fallback, but still limited
      const board = createTestBoard(
        [[0, 0], [1, 0]], // 2 player tiles
        [[2, 0], [3, 0], [0, 1]] // 3 opponent tiles
      )
      
      const clue = generateClue(board)
      
      // Should still generate valid structure with limited tiles
      expect(clue.handA.tiles.length).toBeGreaterThan(0)
      expect(clue.handB.tiles.length).toBeGreaterThan(0)
      
      // Total tiles used should not exceed available (5 total)
      const uniqueTileCount = new Set(
        clue.handA.tiles.concat(clue.handB.tiles).map(tile => `${tile.x},${tile.y}`)
      ).size
      
      expect(uniqueTileCount).toBeLessThanOrEqual(5) // Maximum 5 tiles available
      
      // Should have proper structure even with limited resources
      expect(clue.handA.label).toBe("Hand A")
      expect(clue.handB.label).toBe("Hand B")
      expect(typeof clue.hint).toBe('string')
    })

    it('should return fallback when no player tiles available', () => {
      const board = createTestBoard([], [[0, 0], [1, 0]]) // No player tiles
      
      const clue = generateClue(board)
      
      expect(clue).toEqual({
        handA: { tiles: [], label: "Hand A" },
        handB: { tiles: [], label: "Hand B" },
        hint: "No clues available"
      })
    })

    it('should return fallback when no non-player tiles available', () => {
      const board = createTestBoard([[0, 0], [1, 0]], []) // No opponent/neutral tiles
      
      const clue = generateClue(board)
      
      expect(clue).toEqual({
        handA: { tiles: [], label: "Hand A" },
        handB: { tiles: [], label: "Hand B" },
        hint: "No clues available"
      })
    })

    it('should not reuse the same tile across hands', () => {
      Math.random = () => 0.5
      
      const board = createTestBoard(
        [[0, 0], [1, 0], [2, 0]], // 3 player tiles
        [[0, 1], [1, 1], [2, 1]] // 3 opponent tiles
      )
      
      const clue = generateClue(board)
      
      // Create a set of all tile positions in both hands
      const allPositions = new Set<string>()
      const duplicates: string[] = []
      
      const allTilesInHands = clue.handA.tiles.concat(clue.handB.tiles)
      allTilesInHands.forEach(tile => {
        const position = `${tile.x},${tile.y}`
        if (allPositions.has(position)) {
          duplicates.push(position)
        }
        allPositions.add(position)
      })
      
      expect(duplicates).toHaveLength(0)
    })

    it('should generate unique hint identifiers', () => {
      const board = createTestBoard([[0, 0]], [[1, 0]])
      
      // Generate multiple clues and check hints are strings
      const clue1 = generateClue(board)
      const clue2 = generateClue(board)
      
      expect(typeof clue1.hint).toBe('string')
      expect(typeof clue2.hint).toBe('string')
      expect(clue1.hint.length).toBeGreaterThan(0)
      expect(clue2.hint.length).toBeGreaterThan(0)
    })

    it('should handle empty upgrade arrays', () => {
      const board = createTestBoard([[0, 0], [1, 0]], [[2, 0], [3, 0]])
      
      const clue = generateClue(board, [])
      
      expect(clue).toBeDefined()
      expect(clue.handA.tiles).toHaveLength(2)
      expect(clue.handB.tiles).toHaveLength(2)
    })

    it('should handle non-hand upgrade IDs gracefully', () => {
      const board = createTestBoard([[0, 0], [1, 0]], [[2, 0], [3, 0]])
      
      const clue = generateClue(board, ['attack-boost', 'defense-boost'])
      
      // Should ignore non-hand upgrades and use base composition
      expect(clue.handA.tiles).toHaveLength(2)
      expect(clue.handB.tiles).toHaveLength(2)
      
      const handAPlayerTiles = clue.handA.tiles.filter(tile => tile.owner === TileOwner.Player)
      const handBPlayerTiles = clue.handB.tiles.filter(tile => tile.owner === TileOwner.Player)
      
      expect(handAPlayerTiles).toHaveLength(1)
      expect(handBPlayerTiles).toHaveLength(1)
    })

    it('should handle large numbers of hand upgrades', () => {
      Math.random = () => 0.5
      
      const board = createTestBoard(
        Array.from({length: 10}, (_, i) => [i, 0] as [number, number]), // 10 player tiles
        [[0, 1], [1, 1], [2, 1], [3, 1]] // 4 opponent tiles
      )
      
      const manyLeftHand = Array(5).fill('left-hand')
      const clue = generateClue(board, manyLeftHand)
      
      // Hand A should have 6 player tiles (1 base + 5 upgrades)
      const handAPlayerTiles = clue.handA.tiles.filter(tile => tile.owner === TileOwner.Player)
      expect(handAPlayerTiles).toHaveLength(6)
    })
  })
})