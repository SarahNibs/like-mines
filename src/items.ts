import { ItemData, MonsterData } from './types'

// Easy items to implement immediately
export const GOLD_COIN: ItemData = {
  id: 'gold-coin',
  name: 'Gold Coin',
  description: 'Grants +1 gold',
  icon: '💰',
  immediate: true
}

export const BEAR_TRAP: ItemData = {
  id: 'bear-trap', 
  name: 'Bear Trap',
  description: 'Deals 1 HP damage',
  icon: '🪤',
  immediate: true
}

export const FIRST_AID: ItemData = {
  id: 'first-aid',
  name: 'First Aid',
  description: 'Gain 10 HP instantly',
  icon: '❤️',
  immediate: true
}

// Crystal Ball - reveals random player tile
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
  description: 'Prevents dangerous reveals - prompts before revealing enemy tiles or monsters',
  icon: '↶',
  immediate: false
}

export const SHOP: ItemData = {
  id: 'shop',
  name: 'Shop',
  description: 'A traveling merchant with wares to sell',
  icon: '🏪',
  immediate: true
}

// All available items
export const ALL_ITEMS: ItemData[] = [
  GOLD_COIN, BEAR_TRAP, FIRST_AID, 
  CRYSTAL_BALL, DETECTOR, TRANSMUTE, REWIND
]

// Items available for purchase in shops (excludes shop itself and gold)
export const SHOP_ITEMS: ItemData[] = [
  BEAR_TRAP, FIRST_AID, CRYSTAL_BALL, DETECTOR, TRANSMUTE, REWIND
]

// Sample monsters - no scaling, fixed stats
export const createMonster = (level: number): MonsterData => {
  const monsters = [
    {
      id: 'rat',
      name: 'Rat',
      icon: '🐀',
      attack: 3,
      defense: 0,
      hp: 5
    },
    {
      id: 'spider',
      name: 'Spider', 
      icon: '🕷️',
      attack: 4,
      defense: 1,
      hp: 6
    },
    {
      id: 'goblin',
      name: 'Goblin',
      icon: '👹',
      attack: 5,
      defense: 1,
      hp: 8
    },
    {
      id: 'orc',
      name: 'Orc',
      icon: '👺',
      attack: 6,
      defense: 2,
      hp: 12
    }
  ]
  
  // Pick monster based on level, no scaling
  const baseMonster = monsters[Math.min(Math.floor(level / 3), monsters.length - 1)]
  
  const monster = {
    ...baseMonster,
    id: `${baseMonster.id}-${level}`
  }
  
  console.log(`Created monster for level ${level}: ${monster.name} (${monster.attack} atk, ${monster.defense} def, ${monster.hp} hp)`)
  
  return monster
}