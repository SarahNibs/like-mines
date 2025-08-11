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
  description: 'If you have 5+ gold, lose 5 gold and gain 10 HP',
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
  description: 'TODO: Should allow clicking tiles for adjacency info. Gives +2 gold for now.',
  icon: '📡',
  immediate: true
}

export const TRANSMUTE: ItemData = {
  id: 'transmute', 
  name: 'Transmute',
  description: 'TODO: Should convert unrevealed tile to player tile. Gives +2 gold for now.',
  icon: '🪄',
  immediate: true
}

export const REWIND: ItemData = {
  id: 'rewind',
  name: 'Rewind',
  description: 'TODO: Should prompt before revealing dangerous tiles. Gives +2 gold for now.',
  icon: '↶',
  immediate: true
}

// All available items
export const ALL_ITEMS: ItemData[] = [
  GOLD_COIN, BEAR_TRAP, FIRST_AID, 
  CRYSTAL_BALL, DETECTOR, TRANSMUTE, REWIND
]

// Sample monsters with scaling difficulty
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
  
  // Pick monster based on level, with some scaling
  const baseMonster = monsters[Math.min(Math.floor(level / 3), monsters.length - 1)]
  const levelMultiplier = 1 + (level - 1) * 0.1 // +10% stats per level
  
  const scaledMonster = {
    ...baseMonster,
    id: `${baseMonster.id}-${level}`,
    attack: Math.floor(baseMonster.attack * levelMultiplier),
    defense: Math.floor(baseMonster.defense * levelMultiplier),
    hp: Math.floor(baseMonster.hp * levelMultiplier)
  }
  
  console.log(`Created monster for level ${level}: ${scaledMonster.name} (${scaledMonster.attack} atk, ${scaledMonster.defense} def, ${scaledMonster.hp} hp), multiplier: ${levelMultiplier}`)
  
  return scaledMonster
}