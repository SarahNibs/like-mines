import * as ROT from 'rot-js'
import { Board, Tile, TileOwner, TileContent } from './types'
import { ALL_ITEMS, SHOP, PROTECTION, createMonster, createGuaranteedNewMonster } from './items'
import { getAvailableUpgrades } from './upgrades'
import { getLevelSpec, LevelSpec } from './levelSpecs'

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
  // rewinds removed
  wards: { min: number; max: number }
  blazes: { min: number; max: number }
  keys: { min: number; max: number }
  shops: { min: number; max: number }
  protections: { min: number; max: number }
  clues: { min: number; max: number }
  staffOfFireballs: { min: number; max: number }
  ringOfTrueSeeing: { min: number; max: number }
}

// Convert level spec to spawn config format
function getSpawnConfigForLevel(level: number): SpawnConfig {
  const spec = getLevelSpec(level)
  return {
    chains: spec.chains,
    upgrades: spec.upgrades,
    monsters: spec.monsters,
    goldCoins: spec.goldCoins,
    firstAid: spec.firstAid,
    crystalBalls: spec.crystalBalls,
    detectors: spec.detectors,
    transmutes: spec.transmutes,
    wards: spec.wards,
    blazes: spec.blazes,
    keys: spec.keys,
    shops: { min: spec.hasShop ? 1 : 0, max: spec.hasShop ? 1 : 0 },
    protections: spec.protections,
    clues: spec.clues,
    staffOfFireballs: spec.staffOfFireballs,
    ringOfTrueSeeing: spec.ringOfTrueSeeing
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

// Spawn upgrades preferring locked tiles but allowing any tile
function spawnUpgrades(tiles: Tile[][], width: number, height: number, count: number, rng: ROT.RNG, ownedUpgrades: string[]): void {
  const availableUpgrades = getAvailableUpgrades(ownedUpgrades)
  if (availableUpgrades.length === 0) return
  
  // Find locked tiles and all empty tiles
  const lockedTiles = []
  const allEmptyTiles = []
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y][x]
      if (tile.content === TileContent.Empty && !tile.revealed) {
        allEmptyTiles.push({x, y})
        if (tile.chainData && tile.chainData.isBlocked) {
          lockedTiles.push({x, y})
        }
      }
    }
  }
  
  // Prefer locked tiles when they exist, but use any empty tile as fallback
  for (let i = 0; i < count; i++) {
    const randomUpgrade = availableUpgrades[Math.floor(rng.getUniform() * availableUpgrades.length)]
    
    // Try locked tiles first
    if (lockedTiles.length > 0) {
      placeOnRandomEmptyTile(tiles, lockedTiles, rng, TileContent.PermanentUpgrade, randomUpgrade)
    } else if (allEmptyTiles.length > 0) {
      // Use any empty tile (including player tiles) if no locked tiles available
      placeOnRandomEmptyTile(tiles, allEmptyTiles, rng, TileContent.PermanentUpgrade, randomUpgrade)
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
  
  // First, place the guaranteed new monster if this level spec indicates it
  const levelSpec = getLevelSpec(level)
  const guaranteedMonster = levelSpec.guaranteedNewMonster ? createGuaranteedNewMonster(level) : null
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
function spawnHealthPotions(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG, playerGold: number): void {
  // Health Potions can spawn from level 1 regardless of gold
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const healthPotion = ALL_ITEMS.find(i => i.id === 'health-potion')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, healthPotion)
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

// Rewind spawning removed


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
function spawnShops(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG, character?: any): void {
  // Skip spawning shop tiles for Tourist characters - they get auto-opened shops instead
  if (character && character.id === 'tourist') {
    console.log('Tourist character: Skipping shop tile placement (auto-opens shops instead)')
    return
  }
  
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

// Spawn staff of fireballs  
function spawnStaffOfFireballs(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const staff = ALL_ITEMS.find(i => i.id === 'staff-of-fireballs')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    // Create a fresh copy of the staff with full charges
    const freshStaff = {
      ...staff,
      multiUse: {
        maxUses: 3,
        currentUses: 3
      }
    }
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, freshStaff)
  }
}

// Spawn Ring of True Seeing items
function spawnRingOfTrueSeeing(tiles: Tile[][], width: number, height: number, range: {min: number, max: number}, rng: ROT.RNG): void {
  
  const count = Math.floor(rng.getUniform() * (range.max - range.min + 1)) + range.min
  const emptyTiles = getEmptyTiles(tiles, width, height)
  const ring = ALL_ITEMS.find(i => i.id === 'ring-of-true-seeing')!
  
  for (let i = 0; i < count && emptyTiles.length > 0; i++) {
    // Create a fresh copy of the ring with full charges
    const freshRing = {
      ...ring,
      multiUse: {
        maxUses: 6,
        currentUses: 6
      }
    }
    placeOnRandomEmptyTile(tiles, emptyTiles, rng, TileContent.Item, freshRing)
  }
}

// Apply fog effect to random tiles with level-scaled counts
function applyFogEffect(tiles: Tile[][], width: number, height: number, rng: ROT.RNG, level: number): void {
  let fogCount: number
  
  // Level-based fog scaling: 3x on 12, 4x on 16, 5x on 18, 6x on 20
  if (level >= 20) {
    fogCount = 6
  } else if (level >= 18) {
    fogCount = 5
  } else if (level >= 16) {
    fogCount = 4
  } else if (level >= 12) {
    fogCount = 3
  } else {
    // Levels 8-11: Use 2 fogged tiles (same as before)
    fogCount = 2
  }
  
  console.log(`Applying fog to ${fogCount} tiles on level ${level}`)
  
  // Get all tiles that can be fogged (any tile)
  const availableTiles = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      availableTiles.push({ x, y })
    }
  }
  
  // Apply fog to random tiles
  for (let i = 0; i < fogCount && availableTiles.length > 0; i++) {
    const randomIndex = Math.floor(rng.getUniform() * availableTiles.length)
    const tilePos = availableTiles.splice(randomIndex, 1)[0]
    const tile = tiles[tilePos.y][tilePos.x]
    tile.fogged = true
  }
}

export function generateBoard(config: BoardConfig, playerGold: number = 0, ownedUpgrades: string[] = [], character?: any): Board {
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
        annotated: 'none',
        fogged: false
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
  spawnHealthPotions(tiles, width, height, spawnConfig.firstAid, rng, playerGold)
  spawnCrystalBalls(tiles, width, height, spawnConfig.crystalBalls, rng)
  spawnDetectors(tiles, width, height, spawnConfig.detectors, rng)
  spawnTransmutes(tiles, width, height, spawnConfig.transmutes, rng)
  // spawnRewinds removed
  spawnWards(tiles, width, height, spawnConfig.wards, rng)
  spawnBlazes(tiles, width, height, spawnConfig.blazes, rng)
  spawnKeys(tiles, width, height, spawnConfig.keys, rng)
  spawnShops(tiles, width, height, spawnConfig.shops, rng, character)
  spawnProtections(tiles, width, height, spawnConfig.protections, rng)
  spawnClues(tiles, width, height, spawnConfig.clues, rng)
  spawnStaffOfFireballs(tiles, width, height, spawnConfig.staffOfFireballs, rng)
  spawnRingOfTrueSeeing(tiles, width, height, spawnConfig.ringOfTrueSeeing, rng)
  
  // Apply fog effect starting from level 8
  if (actualLevel >= 8) {
    applyFogEffect(tiles, width, height, rng, actualLevel)
  }
  
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

// Get board configuration from level specifications
export function getBoardConfigForLevel(level: number): BoardConfig {
  const spec = getLevelSpec(level)
  
  return {
    width: spec.width,
    height: spec.height,
    playerTileRatio: spec.playerTileRatio,
    opponentTileRatio: spec.opponentTileRatio,
    seed: level * 1000 + Math.floor(Math.random() * 1000) // Semi-random seed
  }
}