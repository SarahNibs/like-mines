import { ItemData, SpellData } from './types'
import { PROTECTION, TRANSMUTE, STAFF_OF_FIREBALLS } from './items'

export interface Character {
  id: string
  name: string
  icon: string
  description: string
  startingUpgrades: string[]
  startingItems: ItemData[]
  startingMana: number // Starting and max mana
  startingSpell?: SpellData // Starting spell (random if not specified)
}

export const FIGHTER: Character = {
  id: 'fighter',
  name: 'FIGHTER',
  icon: '⚔️',
  description: 'Attack, Defense, and Healthy upgrades. +1 bonus to attack/defense upgrades and Blaze/Ward items. Cannot cast spells.',
  startingUpgrades: ['attack', 'defense', 'healthy'],
  startingItems: [], // Base Scroll of Protection added automatically
  startingMana: 0 // Fighter has no mana system
}

export const CLERIC: Character = {
  id: 'cleric',
  name: 'CLERIC',
  icon: '🛡️',
  description: 'Resting and Defense upgrades, 2 extra Scrolls of Protection. HP bonuses from all sources +1. Cannot pick Rich, Income only once.',
  startingUpgrades: ['resting', 'defense'],
  startingItems: [PROTECTION, PROTECTION], // 2 extra (+ 1 base = 3 total)
  startingMana: 3 // 3/3 mana
}

export const WIZARD: Character = {
  id: 'wizard',
  name: 'WIZARD',
  icon: '🧙',
  description: 'Wisdom and Wellspring upgrades, Staff of Fireballs, and 1 Transmute (no Protection). 4/4 mana, +1 spell damage, new spells at levels 6/11/16. Cannot take Defense.',
  startingUpgrades: ['wisdom', 'wellspring'],
  startingItems: [STAFF_OF_FIREBALLS, TRANSMUTE], // Staff + 1 transmute, no protection
  startingMana: 4 // 4/4 mana
}

export const RANGER: Character = {
  id: 'ranger',
  name: 'RANGER',
  icon: '🏹',
  description: 'Two Attack upgrades and Quick upgrade. Attacks first in combat, takes no damage if attack defeats monster.',
  startingUpgrades: ['attack', 'attack', 'quick'],
  startingItems: [], // Base Scroll of Protection added automatically
  startingMana: 2 // 2/2 mana
}

export const TOURIST: Character = {
  id: 'tourist',
  name: 'TOURIST',
  icon: '🎒',
  description: 'Rich, Income, and Traders upgrades',
  startingUpgrades: ['rich', 'income', 'traders'],
  startingItems: [], // Base Scroll of Protection added automatically
  startingMana: 2 // 2/2 mana
}

export const BELOW: Character = {
  id: 'below',
  name: 'BELOW',
  icon: '🔄',
  description: 'Right Hand, Left Hand, and Bag upgrades',
  startingUpgrades: ['right-hand', 'left-hand', 'bag'],
  startingItems: [], // Base Scroll of Protection added automatically
  startingMana: 2 // 2/2 mana
}

export const ALL_CHARACTERS: Character[] = [
  FIGHTER,
  CLERIC, 
  WIZARD,
  RANGER,
  TOURIST,
  BELOW
]