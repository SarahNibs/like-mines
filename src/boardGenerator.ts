import * as ROT from 'rot-js'
import { Board, Tile, TileOwner, TileContent } from './types'
import { ALL_ITEMS, SHOP, PROTECTION, createMonster, createGuaranteedNewMonster } from './items'
import { getAvailableUpgrades } from './upgrades'

export interface BoardConfig {
  width: number
  height: number
  playerTileRatio: number // Target ratio of player tiles (0.4 = 40%)
  opponentTileRatio: number // Target ratio of opponent tiles
  seed?: number // For reproducible generation
}

export interface SpawnConfig {
  chains: { min: number; max: number }
  upgrades: { min: number; max: number }
  monsters: { min: number; max: number }
  goldCoins: { min: number; max: number }
  firstAid: { min: number; max: number }
  crystalBalls: { min: number; max: number }
  detectors: { min: number; max: number }
  transmutes: { min: number; max: number }
  rewinds: { min: number; max: number }
  wards: { min: number; max: number }
  blazes: { min: number; max: number }
  keys: { min: number; max: number }
  shops: { min: number; max: number }
  protections: { min: number; max: number }
  clues: { min: number; max: number }
}

// Spawn configuration per level
function getSpawnConfigForLevel(level: number): SpawnConfig {
  return {
    chains: { 
      min: Math.min(Math.floor(level * level * 0.07), level - 1), 
      max: Math.min(Math.floor(level * level * 0.09), level) 
    },
    upgrades: { min: 1, max: 1 }, // Always exactly 1
    monsters: { 
      min: Math.max(2, Math.floor(Math.sqrt(level) * 1.8)), 
      max: Math.max(3, Math.floor(Math.sqrt(level) * 2.5)) 
    },
    goldCoins: { 
      min: Math.max(1, Math.floor(level * 0.6)), 
      max: Math.max(2, Math.floor(level * 1.0)) 
    },
    firstAid: { 
      min: level >= 1 ? 1 : 0, 
      max: level >= 3 ? 3 : (level >= 1 ? 2 : 0) 
    },
    crystalBalls: { 
      min: level >= 2 ? 1 : 0, 
      max: level >= 4 ? 2 : (level >= 2 ? 1 : 0) 
    },
    detectors: { 
      min: level >= 3 ? 1 : 0, 
      max: level >= 6 ? 2 : (level >= 3 ? 1 : 0) 
    },
    transmutes: { 
      min: level >= 6 ? 1 : 0, 
      max: level >= 12 ? 2 : (level >= 6 ? 1 : 0) 
    },
    rewinds: { 
      min: level >= 5 ? 1 : 0, 
      max: level >= 8 ? 2 : (level >= 5 ? 1 : 0) 
    },
    wards: { 
      min: level >= 4 ? 1 : 0, 
      max: level >= 8 ? 2 : (level >= 4 ? 1 : 0) 
    },
    blazes: { 
      min: level >= 4 ? 1 : 0, 
      max: level >= 8 ? 2 : (level >= 4 ? 1 : 0) 
    },
    keys: { 
      min: level >= 6 ? 1 : 0, 
      max: level >= 10 ? 2 : (level >= 6 ? 1 : 0) 
    },
    shops: { 
      min: (level >= 3 && level % 3 === 0) ? 1 : 0, 
      max: (level >= 3 && level % 3 === 0) ? 1 : 0 
    },
    protections: { 
      min: 1, 
      max: 1 
    },
    clues: {
      min: level >= 4 ? 1 : 0,
      max: level >= 8 ? 2 : (level >= 4 ? 1 : 0)
    }
  }
}


// Generate chains between orthogonally adjacent tiles
function generateChains(tiles: Tile[][], width: number, height: number, chainCount: number, rng: ROT.RNG): void {
  const createdChains = new Set<string>() // Track created chains to avoid duplicates
  let longChainsCreated = 0
  const targetLongChains = Math.floor(chainCount * 0.2) // 20% of chains should be longer
  
  for (let chainIndex = 0; chainIndex < chainCount; chainIndex++) {
    let attempts = 0
    const maxAttempts = 100 // Prevent infinite loops
    
    // Decide if this should be a long chain (3 tiles)
    const shouldBeLongChain = longChainsCreated < targetLongChains && rng.getUniform() < 0.5
    
    while (attempts < maxAttempts) {
      attempts++
      
      if (shouldBeLongChain) {
        // Try to create a 3-tile chain: A (key) -> B (key+lock) -> C (lock)
        if (createLongChain(tiles, width, height, chainIndex, rng, createdChains)) {
          longChainsCreated++
          break
        }
      } else {
        // Create regular 2-tile chain
        if (createRegularChain(tiles, width, height, chainIndex, rng, createdChains)) {
          break
        }
      }
    }
  }
}

// Create a regular 2-tile chain
function createRegularChain(tiles: Tile[][], width: number, height: number, chainIndex: number, rng: ROT.RNG, createdChains: Set<string>): boolean {
  // Pick a random tile that doesn't already have a chain
  const x1 = Math.floor(rng.getUniform() * width)
  const y1 = Math.floor(rng.getUniform() * height)
  const tile1 = tiles[y1][x1]
  
  if (tile1.chainData) return false // Tile already has a chain
  
  // Pick a random orthogonally adjacent direction
  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 1, dy: 0 },  // right
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }  // left
  ]
  const direction = directions[Math.floor(rng.getUniform() * directions.length)]
  const x2 = x1 + direction.dx
  const y2 = y1 + direction.dy
  
  // Check if second tile is valid and doesn't have a chain
  if (x2 < 0 || x2 >= width || y2 < 0 || y2 >= height) return false
  const tile2 = tiles[y2][x2]
  if (tile2.chainData) return false
  
  // Create unique chain identifier
  const chainId = `chain_${chainIndex}_${x1}_${y1}_${x2}_${y2}`
  const chainKey = `${Math.min(x1, x2)},${Math.min(y1, y2)}-${Math.max(x1, x2)},${Math.max(y1, y2)}`
  
  if (createdChains.has(chainKey)) return false // Chain already exists between these tiles
  
  createdChains.add(chainKey)
  
  // Favor blocking player tiles over other tile types
  let blockFirst: boolean
  
  if (tile1.owner === 'player' && tile2.owner !== 'player') {
    // Block the player tile (tile1)
    blockFirst = true
  } else if (tile2.owner === 'player' && tile1.owner !== 'player') {
    // Block the player tile (tile2)
    blockFirst = false
  } else {
    // Both same type or neither player - random decision
    blockFirst = rng.getUniform() < 0.5
  }
  
  if (blockFirst) {
    // tile1 is blocked, requires tile2 to be revealed first
    tile1.chainData = {
      chainId,
      isBlocked: true,
      requiredTileX: x2,
      requiredTileY: y2
    }
    tile2.chainData = {
      chainId,
      isBlocked: false,
      requiredTileX: x1,
      requiredTileY: y1
    }
  } else {
    // tile2 is blocked, requires tile1 to be revealed first
    tile2.chainData = {
      chainId,
      isBlocked: true,
      requiredTileX: x1,
      requiredTileY: y1
    }
    tile1.chainData = {
      chainId,
      isBlocked: false,
      requiredTileX: x2,
      requiredTileY: y2
    }
  }
  
  return true
}

// Create a 3-tile chain: A (key) -> B (key+lock) -> C (lock)
function createLongChain(tiles: Tile[][], width: number, height: number, chainIndex: number, rng: ROT.RNG, createdChains: Set<string>): boolean {
  // Find a starting tile that doesn't have a chain
  const x1 = Math.floor(rng.getUniform() * width)
  const y1 = Math.floor(rng.getUniform() * height)
  const tileA = tiles[y1][x1]
  
  if (tileA.chainData) return false
  
  // Find an adjacent tile for the middle of the chain
  const directions = [
    { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
  ]
  const dir1 = directions[Math.floor(rng.getUniform() * directions.length)]
  const x2 = x1 + dir1.dx
  const y2 = y1 + dir1.dy
  
  if (x2 < 0 || x2 >= width || y2 < 0 || y2 >= height) return false
  const tileB = tiles[y2][x2]
  if (tileB.chainData) return false
  
  // Find a third tile adjacent to the middle tile (but not the first tile)
  const validDirections = directions.filter(dir => {
    const x3 = x2 + dir.dx
    const y3 = y2 + dir.dy
    return x3 >= 0 && x3 < width && y3 >= 0 && y3 < height && 
           !(x3 === x1 && y3 === y1) // Not the first tile
  })
  
  if (validDirections.length === 0) return false
  
  const dir2 = validDirections[Math.floor(rng.getUniform() * validDirections.length)]
  const x3 = x2 + dir2.dx
  const y3 = y2 + dir2.dy
  const tileC = tiles[y3][x3]
  if (tileC.chainData) return false
  
  // Create chain identifiers
  const chainId1 = `longchain_${chainIndex}_1`
  const chainId2 = `longchain_${chainIndex}_2`
  
  // Set up the 3-tile chain: A unlocks B, B unlocks C
  // A has key for B
  tileA.chainData = {
    chainId: chainId1,
    isBlocked: false,
    requiredTileX: x2,
    requiredTileY: y2
  }
  
  // B is locked by A and has key for C
  tileB.chainData = {
    chainId: chainId1,
    isBlocked: true,
    requiredTileX: x1,
    requiredTileY: y1,
    // Additional properties for the second part of the chain
    hasSecondaryKey: true,
    secondaryChainId: chainId2,
    secondaryRequiredTileX: x3,
    secondaryRequiredTileY: y3
  }
  
  // C is locked by B
  tileC.chainData = {
    chainId: chainId2,
    isBlocked: true,
    requiredTileX: x2,
    requiredTileY: y2
  }
  
  return true
}

// Helper function to get all empty tiles
function getEmptyTiles(tiles: Tile[][], width: number, height: number): Array<{x: number, y: number}> {
  const emptyTiles = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x].content === TileContent.Empty) {
        emptyTiles.push({x, y})
      }
    }
  }
  return emptyTiles
}

// Helper function to place item on random empty tile
function placeOnRandomEmptyTile(tiles: Tile[][], emptyTiles: Array<{x: number, y: number}>, rng: ROT.RNG, content: TileContent, data: any): boolean {
  if (emptyTiles.length === 0) return false
  
  const randomIndex = Math.floor(rng.getUniform() * emptyTiles.length)
  const tilePos = emptyTiles.splice(randomIndex, 1)[0]
  const tile = tiles[tilePos.y][tilePos.x]
  
  tile.content = content
  if (content === TileContent.Item) {
    tile.itemData = data
  } else if (content === TileContent.Monster) {
    tile.monsterData = data
  } else if (content === TileContent.PermanentUpgrade) {
    tile.upgradeData = data
  }
  
  return true
}

// Spawn upgrades preferring locked tiles
function spawnUpgrades(tiles: Tile[][], width: number, height: number, count: number, rng: ROT.RNG, ownedUpgrades: string[]): void {
  const availableUpgrades = getAvailableUpgrades(ownedUpgrades)
  if (availableUpgrades.length === 0) return
  
  // Find locked tiles and non-player tiles
  const lockedTiles = []
  const nonPlayerTiles = []
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y][x]
      if (tile.owner !== TileOwner.Player && tile.content === TileContent.Empty) {
        nonPlayerTiles.push({x, y})
        if (tile.chainData && tile.chainData.isBlocked) {
          lockedTiles.push({x, y})
        }
      }
    }
  }
  
  // Always prefer locked tiles when they exist, only use non-player tiles as absolute fallback
  for (let i = 0; i < count; i++) {
    const randomUpgrade = availableUpgrades[Math.floor(rng.getUniform() * availableUpgrades.length)]
    
    // Try locked tiles first
    if (lockedTiles.length > 0) {
      placeOnRandomEmptyTile(tiles, lockedTiles, rng, TileContent.PermanentUpgrade, randomUpgrade)
    } else if (nonPlayerTiles.length > 0) {
      // Only use non-player tiles if no locked tiles available
      placeOnRandomEmptyTile(tiles, nonPlayerTiles, rng, TileContent.PermanentUpgrade, randomUpgrade)
    } else {
      // No suitable tiles available
      break
    }
  }
}

// Spawn monsters
function spawnMonsters(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG, level: number): void {
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  
  // Get empty tiles with heavy preference for player tiles
  const emptyPlayerTiles = []
  const emptyNonPlayerTiles = []
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x].content === TileContent.Empty) {
        if (tiles[y][x].owner === TileOwner.Player) {
          emptyPlayerTiles.push({x, y})
        } else {
          emptyNonPlayerTiles.push({x, y})
        }
      }
    }
  }
  
  // Create a weighted pool (4:1 ratio favoring player tiles)
  const weightedTiles = [
    ...emptyPlayerTiles,
    ...emptyPlayerTiles, 
    ...emptyPlayerTiles,
    ...emptyPlayerTiles, // 4x weight for player tiles
    ...emptyNonPlayerTiles
  ]
  
  // First, place the guaranteed new monster if this level introduces one
  const guaranteedMonster = createGuaranteedNewMonster(level)
  let monstersPlaced = 0
  
  if (guaranteedMonster && weightedTiles.length > 0) {
    placeOnRandomEmptyTile(tiles, [...weightedTiles], rng, TileContent.Monster, guaranteedMonster)
    monstersPlaced++
  }
  
  // Then place remaining monsters with player tile preference
  for (let i = monstersPlaced; i < count && weightedTiles.length > 0; i++) {
    const monster = createMonster(level)
    placeOnRandomEmptyTile(tiles, [...weightedTiles], rng, TileContent.Monster, monster)
  }
}

// Spawn gold coins
function spawnGoldCoins(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const goldCoin = ALL_ITEMS.find(i => i.id === 'gold-coin')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, goldCoin)
  }
}

// Spawn first aid
function spawnFirstAid(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG, playerGold: number): void {
  if (playerGold < 5) return // Don't spawn if player can't afford
  
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const firstAid = ALL_ITEMS.find(i => i.id === 'first-aid')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, firstAid)
  }
}

// Spawn crystal balls
function spawnCrystalBalls(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const crystalBall = ALL_ITEMS.find(i => i.id === 'crystal-ball')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, crystalBall)
  }
}

// Spawn detectors
function spawnDetectors(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const detector = ALL_ITEMS.find(i => i.id === 'detector')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, detector)
  }
}

// Spawn transmutes
function spawnTransmutes(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const transmute = ALL_ITEMS.find(i => i.id === 'transmute')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, transmute)
  }
}

// Spawn rewinds
function spawnRewinds(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const rewind = ALL_ITEMS.find(i => i.id === 'rewind')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, rewind)
  }
}


// Spawn wards
function spawnWards(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const ward = ALL_ITEMS.find(i => i.id === 'ward')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, ward)
  }
}

// Spawn blazes
function spawnBlazes(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const blaze = ALL_ITEMS.find(i => i.id === 'blaze')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, blaze)
  }
}

// Spawn keys
function spawnKeys(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const key = ALL_ITEMS.find(i => i.id === 'key')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, key)
  }
}

// Spawn shops
function spawnShops(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  
  // Only spawn shops on neutral tiles
  const neutralEmptyTiles = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y][x]
      if (tile.content === TileContent.Empty && tile.owner === TileOwner.Neutral) {
        neutralEmptyTiles.push({x, y})
      }
    }
  }
  
  for (let i = 0; i < count && neutralEmptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, neutralEmptyTiles, rng, TileContent.Item, SHOP)
  }
}

// Spawn protections (on neutral tiles only)
function spawnProtections(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  
  // Only spawn protections on neutral tiles
  const neutralEmptyTiles = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y][x]
      if (tile.content === TileContent.Empty && tile.owner === TileOwner.Neutral) {
        neutralEmptyTiles.push({x, y})
      }
    }
  }
  
  for (let i = 0; i < count && neutralEmptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, neutralEmptyTiles, rng, TileContent.Item, PROTECTION)
  }
}

// Spawn clues
function spawnClues(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const clue = ALL_ITEMS.find(i => i.id === 'clue')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, clue)
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
  
  // Initialize all tiles as neutral with empty content
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
  
  // Assign tile types to positions (no content yet)
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
  
  // Apply QUICK upgrade: reveal random player tile BEFORE placing items/monsters
  let quickRevealed = 0
  if (ownedUpgrades.includes('quick')) {
    const playerTiles = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x]
        if (tile.owner === 'player' && !tile.revealed) {
          playerTiles.push({x, y})
        }
      }
    }
    
    if (playerTiles.length > 0) {
      const randomTile = playerTiles[Math.floor(Math.random() * playerTiles.length)]
      tiles[randomTile.y][randomTile.x].revealed = true
      tiles[randomTile.y][randomTile.x].revealedBy = 'player'
      quickRevealed = 1
    }
  }
  
  // Get spawn configuration for this level
  const spawnConfig = getSpawnConfigForLevel(actualLevel)
  
  // Step 1: Generate chains
  const chainCount = Math.floor(rng.getUniform() * (spawnConfig.chains.max - spawnConfig.chains.min + 1)) + spawnConfig.chains.min
  generateChains(tiles, width, height, chainCount, rng)
  
  // Step 2: Place upgrades (preferring locked tiles)
  const upgradeCount = Math.floor(rng.getUniform() * (spawnConfig.upgrades.max - spawnConfig.upgrades.min + 1)) + spawnConfig.upgrades.min
  spawnUpgrades(tiles, width, height, upgradeCount, rng, ownedUpgrades)
  
  // Step 3: Spawn specific item types with deterministic counts
  spawnMonsters(tiles, width, height, spawnConfig.monsters, rng, actualLevel)
  spawnGoldCoins(tiles, width, height, spawnConfig.goldCoins, rng)
  spawnFirstAid(tiles, width, height, spawnConfig.firstAid, rng, playerGold)
  spawnCrystalBalls(tiles, width, height, spawnConfig.crystalBalls, rng)
  spawnDetectors(tiles, width, height, spawnConfig.detectors, rng)
  spawnTransmutes(tiles, width, height, spawnConfig.transmutes, rng)
  spawnRewinds(tiles, width, height, spawnConfig.rewinds, rng)
  spawnWards(tiles, width, height, spawnConfig.wards, rng)
  spawnBlazes(tiles, width, height, spawnConfig.blazes, rng)
  spawnKeys(tiles, width, height, spawnConfig.keys, rng)
  spawnShops(tiles, width, height, spawnConfig.shops, rng)
  spawnProtections(tiles, width, height, spawnConfig.protections, rng)
  spawnClues(tiles, width, height, spawnConfig.clues, rng)
  
  return {
    width,
    height,
    tiles,
    playerTilesTotal: actualPlayerTiles,
    opponentTilesTotal: actualOpponentTiles,
    playerTilesRevealed: quickRevealed,
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