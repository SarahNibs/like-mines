import { ItemData } from './types'
import { PROTECTION, TRANSMUTE, STAFF_OF_FIREBALLS } from './items'

export interface Character {
  id: string
  name: string
  icon: string
  description: string
  startingUpgrades: string[]
  startingItems: ItemData[]
}

export const FIGHTER: Character = {
  id: 'fighter',
  name: 'FIGHTER',
  icon: '⚔️',
  description: 'Attack, Defense, and Healthy upgrades',
  startingUpgrades: ['attack', 'defense', 'healthy'],
  startingItems: [] // Base Scroll of Protection added automatically
}

export const CLERIC: Character = {
  id: 'cleric',
  name: 'CLERIC',
  icon: '🛡️',
  description: 'Resting and Defense upgrades, 2 extra Scrolls of Protection',
  startingUpgrades: ['resting', 'defense'],
  startingItems: [PROTECTION, PROTECTION] // 2 extra (+ 1 base = 3 total)
}

export const WIZARD: Character = {
  id: 'wizard',
  name: 'WIZARD',
  icon: '🧙',
  description: 'Wisdom upgrade, Staff of Fireballs, and 3 Transmutes (no Protection)',
  startingUpgrades: ['wisdom'],
  startingItems: [STAFF_OF_FIREBALLS, TRANSMUTE, TRANSMUTE, TRANSMUTE] // Staff + 3 transmutes, no protection
}

export const RANGER: Character = {
  id: 'ranger',
  name: 'RANGER',
  icon: '🏹',
  description: 'Two Attack upgrades and Quick upgrade',
  startingUpgrades: ['attack', 'attack', 'quick'],
  startingItems: [] // Base Scroll of Protection added automatically
}

export const TOURIST: Character = {
  id: 'tourist',
  name: 'TOURIST',
  icon: '🎒',
  description: 'Rich, Income, and Traders upgrades',
  startingUpgrades: ['rich', 'income', 'traders'],
  startingItems: [] // Base Scroll of Protection added automatically
}

export const BELOW: Character = {
  id: 'below',
  name: 'BELOW',
  icon: '🔄',
  description: 'Right Hand, Left Hand, and Bag upgrades',
  startingUpgrades: ['right-hand', 'left-hand', 'bag'],
  startingItems: [] // Base Scroll of Protection added automatically
}

export const ALL_CHARACTERS: Character[] = [
  FIGHTER,
  CLERIC, 
  WIZARD,
  RANGER,
  TOURIST,
  BELOW
]