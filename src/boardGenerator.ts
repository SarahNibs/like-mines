import * as ROT from 'rot-js'
import { Board, Tile, TileOwner, TileContent } from './types'

export interface BoardConfig {
  width: number
  height: number
  playerTileRatio: number // Target ratio of player tiles (0.4 = 40%)
  opponentTileRatio: number // Target ratio of opponent tiles
  seed?: number // For reproducible generation
}

export function generateBoard(config: BoardConfig): Board {
  const { width, height, playerTileRatio, opponentTileRatio, seed } = config
  
  // Set seed for reproducible generation
  if (seed !== undefined) {
    ROT.RNG.setSeed(seed)
  }
  
  const tiles: Tile[][] = []
  const totalTiles = width * height
  const targetPlayerTiles = Math.floor(totalTiles * playerTileRatio)
  const targetOpponentTiles = Math.floor(totalTiles * opponentTileRatio)
  
  // Initialize all tiles as neutral
  for (let y = 0; y < height; y++) {
    tiles[y] = []
    for (let x = 0; x < width; x++) {
      tiles[y][x] = {
        x,
        y,
        owner: TileOwner.Neutral,
        content: TileContent.Empty,
        revealed: false,
        contentVisible: false,
        annotated: false
      }
    }
  }
  
  // Create array of tile types to distribute uniformly
  const tileTypes: TileOwner[] = []
  
  // Add player tiles
  for (let i = 0; i < targetPlayerTiles; i++) {
    tileTypes.push(TileOwner.Player)
  }
  
  // Add opponent tiles
  for (let i = 0; i < targetOpponentTiles; i++) {
    tileTypes.push(TileOwner.Opponent)
  }
  
  // Fill remaining with neutral tiles
  while (tileTypes.length < totalTiles) {
    tileTypes.push(TileOwner.Neutral)
  }
  
  // Shuffle the tile types uniformly
  ROT.RNG.shuffle(tileTypes)
  
  // Assign tile types to positions
  let actualPlayerTiles = 0
  let actualOpponentTiles = 0
  let index = 0
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tileType = tileTypes[index++]
      tiles[y][x].owner = tileType
      
      if (tileType === TileOwner.Player) {
        actualPlayerTiles++
      } else if (tileType === TileOwner.Opponent) {
        actualOpponentTiles++
      }
    }
  }
  
  return {
    width,
    height,
    tiles,
    playerTilesTotal: actualPlayerTiles,
    opponentTilesTotal: actualOpponentTiles,
    playerTilesRevealed: 0,
    opponentTilesRevealed: 0
  }
}

// Predefined board configurations for different difficulties
export function getBoardConfigForLevel(level: number): BoardConfig {
  // Start small and grow progressively
  const baseWidth = 4
  const baseHeight = 3
  
  const width = Math.min(baseWidth + Math.floor(level / 3), 8) // Max 8 wide
  const height = Math.min(baseHeight + Math.floor(level / 4), 6) // Max 6 high
  
  // Player gets slightly more tiles early on, evens out later
  const playerTileRatio = Math.max(0.25, 0.45 - level * 0.02) // 45% -> 25%
  const opponentTileRatio = Math.min(0.35, 0.25 + level * 0.01) // 25% -> 35%
  
  return {
    width,
    height,
    playerTileRatio,
    opponentTileRatio,
    seed: level // Reproducible boards for same level
  }
}