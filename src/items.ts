import { ItemData, MonsterData } from './types'

// =============================================================================
// IMMEDIATE EFFECT ITEMS (used instantly when picked up)
// =============================================================================

export const GOLD_COIN: ItemData = {
  id: 'gold-coin',
  name: 'Gold Coin',
  description: 'Grants +1 gold',
  icon: '🪙',
  immediate: true
}

export const FIRST_AID: ItemData = {
  id: 'first-aid',
  name: 'First Aid',
  description: 'Gain 10 HP instantly',
  icon: '❤️',
  immediate: true
}



export const SHOP: ItemData = {
  id: 'shop',
  name: 'Shop',
  description: 'A traveling merchant with wares to sell',
  icon: '🏪',
  immediate: true
}

// =============================================================================
// INVENTORY ITEMS (stored and used manually)
// =============================================================================

export const CRYSTAL_BALL: ItemData = {
  id: 'crystal-ball',
  name: 'Crystal Ball',
  description: 'Reveals a random unrevealed player tile',
  icon: '🔮',
  immediate: false
}

export const DETECTOR: ItemData = {
  id: 'detector',
  name: 'Detector',
  description: 'Click any unrevealed tile to see how many adjacent tiles belong to each player',
  icon: '📡',
  immediate: false
}

export const TRANSMUTE: ItemData = {
  id: 'transmute', 
  name: 'Transmute',
  description: 'Turn any unrevealed tile into your own tile',
  icon: '🪄',
  immediate: false
}

export const REWIND: ItemData = {
  id: 'rewind',
  name: 'Rewind',
  description: 'Prevents dangerous reveals - prompts before revealing enemy tiles or monsters. Hold SHIFT while clicking to auto-bypass.',
  icon: '↶',
  immediate: false
}

export const WARD: ItemData = {
  id: 'ward',
  name: 'Ward',
  description: 'Grants +4 defense for your next fight only',
  icon: '🔰',
  immediate: false
}

export const BLAZE: ItemData = {
  id: 'blaze',
  name: 'Blaze',
  description: 'Grants +5 attack for your next fight only',
  icon: '🔥',
  immediate: false
}

export const WHISTLE: ItemData = {
  id: 'whistle',
  name: 'Whistle',
  description: 'Redistributes all monsters on the board to random unrevealed tiles',
  icon: '🎺',
  immediate: false
}

export const KEY: ItemData = {
  id: 'key',
  name: 'Key',
  description: 'Unlocks any locked tile, removing both the lock and the corresponding key',
  icon: '🗝️',
  immediate: false
}

export const PROTECTION: ItemData = {
  id: 'protection',
  name: 'Protection',
  description: 'The next tile you reveal never ends your turn',
  icon: '📜',
  immediate: false
}

export const CLUE: ItemData = {
  id: 'clue',
  name: 'Clue',
  description: 'Grants you an additional clue about the board',
  icon: '🔍',
  immediate: false
}

// =============================================================================
// ITEM COLLECTIONS
// =============================================================================

// All available items
export const ALL_ITEMS: ItemData[] = [
  // Immediate items
  GOLD_COIN, FIRST_AID, SHOP,
  // Inventory items  
  CRYSTAL_BALL, DETECTOR, TRANSMUTE, REWIND, WARD, BLAZE, WHISTLE, KEY, PROTECTION, CLUE
]

// Items available for purchase in shops (excludes shop itself, gold, and negative items like bear traps)
export const SHOP_ITEMS: ItemData[] = [
  FIRST_AID, CRYSTAL_BALL, DETECTOR, TRANSMUTE, REWIND, WARD, BLAZE, WHISTLE, KEY, PROTECTION, CLUE
]

// =============================================================================
// MONSTERS (introduced every 2 levels)
// =============================================================================

const MONSTERS = [
  { // Level 1-2
    id: 'rat',
    name: 'Rat',
    icon: '🐀',
    attack: 3,
    defense: 0,
    hp: 6
  },
  { // Level 3-4
    id: 'spider',
    name: 'Spider', 
    icon: '🕸️',
    attack: 4,
    defense: 1,
    hp: 8
  },
  { // Level 5-6
    id: 'goblin',
    name: 'Goblin',
    icon: '👹',
    attack: 5,
    defense: 1,
    hp: 11
  },
  { // Level 7-8
    id: 'orc',
    name: 'Orc',
    icon: '👺',
    attack: 6,
    defense: 2,
    hp: 16
  },
  { // Level 9-10
    id: 'demon',
    name: 'Demon',
    icon: '👿',
    attack: 8,
    defense: 3,
    hp: 23
  },
  { // Level 11-12
    id: 'skeleton',
    name: 'Skeleton',
    icon: '💀',
    attack: 10,
    defense: 2,
    hp: 26
  },
  { // Level 13-14
    id: 'dragon',
    name: 'Dragon',
    icon: '🐉',
    attack: 15,
    defense: 4,
    hp: 42
  },
  { // Level 15-16
    id: 'lich',
    name: 'Lich',
    icon: '🧙‍♂️',
    attack: 18,
    defense: 5,
    hp: 48
  },
  { // Level 17-18
    id: 'titan',
    name: 'Titan',
    icon: '⚡',
    attack: 22,
    defense: 6,
    hp: 59
  },
  { // Level 19-20
    id: 'void-lord',
    name: 'Void Lord',
    icon: '🌌',
    attack: 28,
    defense: 8,
    hp: 70
  }
]

export const createMonster = (level: number): MonsterData => {
  // Determine which monsters are available for this level
  const maxMonsterIndex = Math.min(Math.floor((level + 1) / 2), MONSTERS.length) - 1
  const availableMonsters = MONSTERS.slice(0, maxMonsterIndex + 1)
  
  // Pick a random monster from available monsters
  const baseMonster = availableMonsters[Math.floor(Math.random() * availableMonsters.length)]
  
  const monster = {
    ...baseMonster,
    id: `${baseMonster.id}-${level}`
  }
  
  console.log(`Created monster for level ${level}: ${monster.name} (${monster.attack} atk, ${monster.defense} def, ${monster.hp} hp)`)
  
  return monster
}

// Export function to guarantee the newest monster appears at least once per level
export const createGuaranteedNewMonster = (level: number): MonsterData | null => {
  const monsterIndex = Math.floor((level + 1) / 2) - 1
  
  // Check if this level introduces a new monster
  if (monsterIndex >= 0 && monsterIndex < MONSTERS.length && (level + 1) % 2 === 0) {
    const newMonster = MONSTERS[monsterIndex]
    return {
      ...newMonster,
      id: `${newMonster.id}-${level}`
    }
  }
  
  return null
}