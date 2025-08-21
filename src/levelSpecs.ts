// Level specifications for all 20 levels
// This file contains all parameters for level design and can be tuned without code changes

export interface LevelSpec {
  // Board dimensions
  width: number
  height: number
  
  // Tile distribution (ratios that sum to <= 1.0, remainder is neutral)
  playerTileRatio: number
  opponentTileRatio: number
  
  // Spawn counts (min/max ranges)
  chains: { min: number; max: number }
  upgrades: { min: number; max: number }
  monsters: { min: number; max: number }
  goldCoins: { min: number; max: number }
  firstAid: { min: number; max: number }
  manaPotions: { min: number; max: number }
  crystalBalls: { min: number; max: number }
  detectors: { min: number; max: number }
  transmutes: { min: number; max: number }
  wards: { min: number; max: number }
  blazes: { min: number; max: number }
  keys: { min: number; max: number }
  protections: { min: number; max: number }
  clues: { min: number; max: number }
  staffOfFireballs: { min: number; max: number }
  ringOfTrueSeeing: { min: number; max: number }
  
  // Shop availability
  hasShop: boolean
  
  // Special rules
  guaranteedNewMonster?: boolean // True if this level introduces a new monster type
}

export const LEVEL_SPECS: LevelSpec[] = [
  // Level 1 - Tutorial level
  {
    width: 4, height: 3,
    playerTileRatio: 0.40, opponentTileRatio: 0.34, // 40% player, 34% opponent (4 AI minimum)
    chains: { min: 0, max: 0 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 2, max: 2 },
    goldCoins: { min: 0, max: 1 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 0 },
    crystalBalls: { min: 0, max: 0 },
    detectors: { min: 0, max: 0 },
    transmutes: { min: 0, max: 0 },
    wards: { min: 0, max: 0 },
    blazes: { min: 0, max: 0 },
    keys: { min: 0, max: 0 },
    protections: { min: 1, max: 1 },
    clues: { min: 0, max: 0 },
    staffOfFireballs: { min: 0, max: 0 },
    ringOfTrueSeeing: { min: 0, max: 0 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 2 - Introduce crystal balls
  {
    width: 4, height: 3,
    playerTileRatio: 0.38, opponentTileRatio: 0.34, // 38% player, 34% opponent (4 AI minimum)
    chains: { min: 0, max: 1 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 2, max: 3 },
    goldCoins: { min: 0, max: 1 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 0 },
    crystalBalls: { min: 1, max: 1 },
    detectors: { min: 0, max: 0 },
    transmutes: { min: 0, max: 0 },
    wards: { min: 0, max: 0 },
    blazes: { min: 0, max: 0 },
    keys: { min: 0, max: 0 },
    protections: { min: 1, max: 1 },
    clues: { min: 0, max: 0 },
    staffOfFireballs: { min: 0, max: 0 },
    ringOfTrueSeeing: { min: 0, max: 0 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 3 - First shop, introduce detectors
  {
    width: 5, height: 3,
    playerTileRatio: 0.36, opponentTileRatio: 0.33, // 36% player, 33% opponent
    chains: { min: 1, max: 2 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 3, max: 4 },
    goldCoins: { min: 1, max: 2 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 0 },
    crystalBalls: { min: 1, max: 1 },
    detectors: { min: 1, max: 1 },
    transmutes: { min: 0, max: 0 },
    wards: { min: 0, max: 0 },
    blazes: { min: 0, max: 0 },
    keys: { min: 0, max: 0 },
    protections: { min: 1, max: 1 },
    clues: { min: 0, max: 0 },
    staffOfFireballs: { min: 0, max: 0 },
    ringOfTrueSeeing: { min: 0, max: 0 },
    hasShop: true,
    guaranteedNewMonster: true
  },
  
  // Level 4 - Introduce wards, blazes, and clue items
  {
    width: 5, height: 4,
    playerTileRatio: 0.35, opponentTileRatio: 0.32,
    chains: { min: 1, max: 3 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 4, max: 5 },
    goldCoins: { min: 1, max: 2 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 0 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 1 },
    transmutes: { min: 0, max: 0 },
    wards: { min: 1, max: 1 },
    blazes: { min: 1, max: 1 },
    keys: { min: 0, max: 0 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 1 },
    staffOfFireballs: { min: 0, max: 0 },
    ringOfTrueSeeing: { min: 0, max: 0 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 5
  {
    width: 5, height: 4,
    playerTileRatio: 0.35, opponentTileRatio: 0.32,
    chains: { min: 2, max: 4 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 4, max: 6 },
    goldCoins: { min: 1, max: 2 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 1 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 0, max: 1 },
    transmutes: { min: 0, max: 0 },
    wards: { min: 1, max: 1 },
    blazes: { min: 1, max: 1 },
    keys: { min: 0, max: 0 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 1 },
    staffOfFireballs: { min: 0, max: 0 },
    ringOfTrueSeeing: { min: 0, max: 0 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 6 - Second shop, introduce transmutes and keys
  {
    width: 6, height: 4,
    playerTileRatio: 0.34, opponentTileRatio: 0.31,
    chains: { min: 3, max: 5 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 5, max: 7 },
    goldCoins: { min: 1, max: 2 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 1 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 0, max: 1 },
    transmutes: { min: 0, max: 1 },
    wards: { min: 0, max: 1 },
    blazes: { min: 0, max: 1 },
    keys: { min: 1, max: 1 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 0 },
    hasShop: true,
    guaranteedNewMonster: true
  },
  
  // Level 7
  {
    width: 6, height: 4,
    playerTileRatio: 0.34, opponentTileRatio: 0.31,
    chains: { min: 4, max: 6 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 5, max: 8 },
    goldCoins: { min: 1, max: 2 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 1 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 1 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 1 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 8
  {
    width: 6, height: 5,
    playerTileRatio: 0.33, opponentTileRatio: 0.30,
    chains: { min: 5, max: 8 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 6, max: 9 },
    goldCoins: { min: 1, max: 3 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 1 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 1 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 1 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 9 - Third shop
  {
    width: 7, height: 5,
    playerTileRatio: 0.33, opponentTileRatio: 0.30,
    chains: { min: 6, max: 10 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 7, max: 10 },
    goldCoins: { min: 1, max: 3 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 1 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 2 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 1 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: true,
    guaranteedNewMonster: true
  },
  
  // Level 10
  {
    width: 7, height: 5,
    playerTileRatio: 0.32, opponentTileRatio: 0.30,
    chains: { min: 7, max: 12 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 8, max: 11 },
    goldCoins: { min: 2, max: 3 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 1 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 2 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 2 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 11
  {
    width: 7, height: 6,
    playerTileRatio: 0.32, opponentTileRatio: 0.30,
    chains: { min: 8, max: 14 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 9, max: 12 },
    goldCoins: { min: 2, max: 4 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 2 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 2 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 2 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 12 - Fourth shop, max transmutes
  {
    width: 8, height: 6,
    playerTileRatio: 0.31, opponentTileRatio: 0.30,
    chains: { min: 9, max: 16 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 10, max: 13 },
    goldCoins: { min: 2, max: 4 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 2 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 2 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 2 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: true,
    guaranteedNewMonster: true
  },
  
  // Level 13
  {
    width: 8, height: 6,
    playerTileRatio: 0.31, opponentTileRatio: 0.30,
    chains: { min: 10, max: 18 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 11, max: 14 },
    goldCoins: { min: 2, max: 5 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 2 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 2 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 2 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 14
  {
    width: 8, height: 6,
    playerTileRatio: 0.31, opponentTileRatio: 0.30,
    chains: { min: 11, max: 20 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 12, max: 15 },
    goldCoins: { min: 3, max: 5 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 2 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 2 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 2 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 15 - Fifth shop
  {
    width: 8, height: 6,
    playerTileRatio: 0.30, opponentTileRatio: 0.30,
    chains: { min: 12, max: 22 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 13, max: 16 },
    goldCoins: { min: 3, max: 5 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 2 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 2 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 2 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: true,
    guaranteedNewMonster: true
  },
  
  // Level 16
  {
    width: 8, height: 6,
    playerTileRatio: 0.30, opponentTileRatio: 0.30,
    chains: { min: 13, max: 24 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 14, max: 17 },
    goldCoins: { min: 3, max: 6 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 2 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 2 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 2 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 17
  {
    width: 8, height: 6,
    playerTileRatio: 0.30, opponentTileRatio: 0.30,
    chains: { min: 14, max: 26 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 15, max: 18 },
    goldCoins: { min: 4, max: 6 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 2 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 2 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 2 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 18 - Sixth shop
  {
    width: 8, height: 6,
    playerTileRatio: 0.30, opponentTileRatio: 0.30,
    chains: { min: 15, max: 28 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 16, max: 19 },
    goldCoins: { min: 4, max: 7 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 2 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 2 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 2 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: true,
    guaranteedNewMonster: true
  },
  
  // Level 19 - Penultimate challenge
  {
    width: 8, height: 6,
    playerTileRatio: 0.30, opponentTileRatio: 0.30,
    chains: { min: 16, max: 30 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 17, max: 20 },
    goldCoins: { min: 4, max: 7 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 2 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 2 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 2 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: false,
    guaranteedNewMonster: true
  },
  
  // Level 20 - Final boss level
  {
    width: 8, height: 6,
    playerTileRatio: 0.30, opponentTileRatio: 0.30,
    chains: { min: 18, max: 32 },
    upgrades: { min: 1, max: 1 },
    monsters: { min: 18, max: 22 },
    goldCoins: { min: 5, max: 8 },
    firstAid: { min: 0, max: 1 },
    manaPotions: { min: 0, max: 2 },
    crystalBalls: { min: 0, max: 1 },
    detectors: { min: 1, max: 2 },
    transmutes: { min: 1, max: 2 },
    wards: { min: 1, max: 2 },
    blazes: { min: 1, max: 2 },
    keys: { min: 1, max: 2 },
    protections: { min: 1, max: 1 },
    clues: { min: 1, max: 2 },
    staffOfFireballs: { min: 0, max: 1 },
    ringOfTrueSeeing: { min: 0, max: 1 },
    hasShop: false,
    guaranteedNewMonster: true
  }
]

// Helper function to get level specification
export function getLevelSpec(level: number): LevelSpec {
  if (level < 1 || level > LEVEL_SPECS.length) {
    throw new Error(`Invalid level: ${level}. Must be between 1 and ${LEVEL_SPECS.length}`)
  }
  return LEVEL_SPECS[level - 1] // Convert to 0-based index
}