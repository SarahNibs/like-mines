import * as ROT from 'rot-js'
import { Board, Tile, TileOwner, TileContent } from './types'
import { ALL_ITEMS, SHOP, createMonster } from './items'
import { getAvailableUpgrades } from './upgrades'

export interface BoardConfig {
  width: number
  height: number
  playerTileRatio: number // Target ratio of player tiles (0.4 = 40%)
  opponentTileRatio: number // Target ratio of opponent tiles
  seed?: number // For reproducible generation
}

// Generate content for a tile based on its owner and level
function generateTileContent(owner: TileOwner, level: number, rng: ROT.RNG, playerGold: number = 0, forceShop: boolean = false, forceUpgrade: boolean = false, ownedUpgrades: string[] = []): { content: TileContent, itemData?: any, monsterData?: any, upgradeData?: any } {
  // Force shop if requested (for guaranteed shop placement)
  if (forceShop && owner === TileOwner.Neutral) {
    return { content: TileContent.Item, itemData: SHOP }
  }
  
  // Force upgrade if requested (upgrades never appear on player tiles)
  if (forceUpgrade && owner !== TileOwner.Player) {
    const availableUpgrades = getAvailableUpgrades(ownedUpgrades)
    if (availableUpgrades.length > 0) {
      const randomUpgrade = availableUpgrades[Math.floor(rng.getUniform() * availableUpgrades.length)]
      return { content: TileContent.PermanentUpgrade, upgradeData: randomUpgrade }
    }
  }
  // Balanced content frequency
  const roll = rng.getUniform()
  
  if (roll < 0.75) {
    return { content: TileContent.Empty }
  }
  
  // Content distribution based on tile owner
  if (owner === TileOwner.Player) {
    // Player tiles: 85% items, 15% monsters - much more items, fewer monsters
    if (roll < 0.9625) {
      const itemRoll = rng.getUniform()
      let item
      if (itemRoll < 0.6) {
        item = ALL_ITEMS.find(i => i.id === 'gold-coin')! // Much more common
      } else if (itemRoll < 0.8) {
        // Only show first aid if player has enough gold to use it
        item = playerGold >= 5 
          ? ALL_ITEMS.find(i => i.id === 'first-aid')! 
          : ALL_ITEMS.find(i => i.id === 'gold-coin')! // Give gold instead
      } else if (itemRoll < 0.9) {
        item = ALL_ITEMS.find(i => i.id === 'bear-trap')! // Less bear traps
      } else {
        item = ALL_ITEMS[Math.floor(rng.getUniform() * ALL_ITEMS.length)]
      }
      return { content: TileContent.Item, itemData: item }
    } else {
      const monster = createMonster(level)
      return { content: TileContent.Monster, monsterData: monster }
    }
  } else if (owner === TileOwner.Neutral) {
    // Neutral tiles: 85% items, 15% monsters - more healing items
    if (roll < 0.9625) {
      const itemRoll = rng.getUniform()
      let item
      if (itemRoll < 0.5) {
        item = ALL_ITEMS.find(i => i.id === 'gold-coin')! // Common
      } else if (itemRoll < 0.7) {
        // Only show first aid if player has enough gold to use it
        item = playerGold >= 5 
          ? ALL_ITEMS.find(i => i.id === 'first-aid')! 
          : ALL_ITEMS.find(i => i.id === 'gold-coin')! // Give gold instead
      } else if (itemRoll < 0.82) {
        item = ALL_ITEMS.find(i => i.id === 'crystal-ball')! // Preferentially on neutral
      } else if (itemRoll < 0.86) {
        item = SHOP // Small chance for shops on neutral tiles
      } else {
        item = ALL_ITEMS[Math.floor(rng.getUniform() * ALL_ITEMS.length)]
      }
      return { content: TileContent.Item, itemData: item }
    } else {
      const monster = createMonster(level)
      return { content: TileContent.Monster, monsterData: monster }
    }
  } else {
    // Opponent tiles: 90% items, 10% monsters - mostly safe
    if (roll < 0.975) {
      const itemRoll = rng.getUniform()
      let item
      if (itemRoll < 0.7) {
        item = ALL_ITEMS.find(i => i.id === 'gold-coin')! // Mostly gold
      } else if (itemRoll < 0.85) {
        // Only show first aid if player has enough gold to use it
        item = playerGold >= 5 
          ? ALL_ITEMS.find(i => i.id === 'first-aid')! 
          : ALL_ITEMS.find(i => i.id === 'gold-coin')! // Give gold instead
      } else {
        item = ALL_ITEMS[Math.floor(rng.getUniform() * ALL_ITEMS.length)]
      }
      return { content: TileContent.Item, itemData: item }
    } else {
      const monster = createMonster(level)
      return { content: TileContent.Monster, monsterData: monster }
    }
  }
}

export function generateBoard(config: BoardConfig, playerGold: number = 0, ownedUpgrades: string[] = []): Board {
  const { width, height, playerTileRatio, opponentTileRatio, seed } = config
  
  // Extract the actual level from the seed (seed = level * 1000 + random)
  const actualLevel = Math.floor((seed || 1) / 1000) || 1
  
  // Create RNG instance for content generation (use seed for content, not layout)
  const rng = ROT.RNG
  if (seed !== undefined) {
    rng.setSeed(seed)
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
  
  // Shuffle the tile types uniformly using Fisher-Yates shuffle with Math.random
  for (let i = tileTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tileTypes[i], tileTypes[j]] = [tileTypes[j], tileTypes[i]]
  }
  
  // Assign tile types to positions
  let actualPlayerTiles = 0
  let actualOpponentTiles = 0
  let index = 0
  let shopPlaced = false // Track if shop has been placed for level 6
  let upgradePlaced = false // Track if upgrade has been placed
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tileType = tileTypes[index++]
      tiles[y][x].owner = tileType
      
      // Check if we need to force a shop on level 6
      const shouldForceShop = actualLevel === 6 && !shopPlaced && tileType === TileOwner.Neutral
      
      // Check if we need to force an upgrade (exactly one per board, never on player tiles)
      const shouldForceUpgrade = !upgradePlaced && tileType !== TileOwner.Player && rng.getUniform() < 0.1 // 10% chance per non-player tile
      
      // Generate content for this tile based on level
      const contentData = generateTileContent(tileType, actualLevel, rng, playerGold, shouldForceShop, shouldForceUpgrade, ownedUpgrades)
      tiles[y][x].content = contentData.content
      if (contentData.itemData) {
        tiles[y][x].itemData = contentData.itemData
        // Track if we placed a shop
        if (contentData.itemData.id === 'shop') {
          shopPlaced = true
        }
      }
      if (contentData.monsterData) {
        tiles[y][x].monsterData = contentData.monsterData
      }
      if (contentData.upgradeData) {
        tiles[y][x].upgradeData = contentData.upgradeData
        upgradePlaced = true
      }
      
      if (tileType === TileOwner.Player) {
        actualPlayerTiles++
      } else if (tileType === TileOwner.Opponent) {
        actualOpponentTiles++
      }
    }
  }
  
  // Fallback: if no upgrade was placed, force one on a random non-player tile
  if (!upgradePlaced) {
    const nonPlayerTiles = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (tiles[y][x].owner !== TileOwner.Player) {
          nonPlayerTiles.push({x, y})
        }
      }
    }
    
    if (nonPlayerTiles.length > 0) {
      const randomTile = nonPlayerTiles[Math.floor(rng.getUniform() * nonPlayerTiles.length)]
      const availableUpgrades = getAvailableUpgrades(ownedUpgrades)
      if (availableUpgrades.length > 0) {
        const randomUpgrade = availableUpgrades[Math.floor(rng.getUniform() * availableUpgrades.length)]
        tiles[randomTile.y][randomTile.x].content = TileContent.PermanentUpgrade
        tiles[randomTile.y][randomTile.x].upgradeData = randomUpgrade
        // Clear any existing item/monster data
        delete tiles[randomTile.y][randomTile.x].itemData
        delete tiles[randomTile.y][randomTile.x].monsterData
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
    seed: level * 1000 + Math.floor(Math.random() * 1000) // Semi-random seed
  }
}