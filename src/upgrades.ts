import { UpgradeData } from './types'

export const ATTACK: UpgradeData = {
  id: 'attack',
  name: 'Attack',
  description: 'Permanently add +2 to your attack',
  icon: '⚔️',
  repeatable: true
}

export const DEFENSE: UpgradeData = {
  id: 'defense',
  name: 'Defense',
  description: 'Permanently add +1 to your defense',
  icon: '🛡️',
  repeatable: true
}

export const HEALTHY: UpgradeData = {
  id: 'healthy',
  name: 'Healthy',
  description: 'Permanently add +25 to your max HP',
  icon: '📈',
  repeatable: true
}

export const INCOME: UpgradeData = {
  id: 'income',
  name: 'Income',
  description: 'Permanently add +$1 to gold gained from opponent tiles and monsters',
  icon: '💲',
  repeatable: true
}

export const QUICK: UpgradeData = {
  id: 'quick',
  name: 'Quick',
  description: 'At the beginning of every board, reveal one of your tiles at random',
  icon: '⚡',
  repeatable: false
}

export const RICH: UpgradeData = {
  id: 'rich',
  name: 'Rich',
  description: 'Spread coins to adjacent tiles when you defeat a monster',
  icon: '🐷',
  repeatable: false
}

export const WISDOM: UpgradeData = {
  id: 'wisdom',
  name: 'Wisdom',
  description: 'At the beginning of every board, apply detector scan to one random tile',
  icon: '🙏',
  repeatable: false
}

export const TRADERS: UpgradeData = {
  id: 'traders',
  name: 'Traders',
  description: 'Shops have one additional item and one additional upgrade available for purchase',
  icon: '🤝',
  repeatable: true
}

export const BAG: UpgradeData = {
  id: 'bag',
  name: 'Bag',
  description: 'Permanently increases inventory slots by +2',
  icon: '🎒',
  repeatable: true
}

export const LEFT_HAND: UpgradeData = {
  id: 'left-hand',
  name: 'Left Hand',
  description: 'Adds one more of your tiles to the left hand of all future clues',
  icon: '👈',
  repeatable: false
}

export const RIGHT_HAND: UpgradeData = {
  id: 'right-hand',
  name: 'Right Hand',
  description: 'Adds one more of your tiles to the right hand of all future clues',
  icon: '👉',
  repeatable: false
}

export const RESTING: UpgradeData = {
  id: 'resting',
  name: 'Resting',
  description: 'Gain +2 HP when revealing neutral tiles',
  icon: '🛏️',
  repeatable: true
}

export const MAGNET: UpgradeData = {
  id: 'magnet',
  name: 'Magnet',
  description: 'When you reveal a tile, collect any adjacent coins',
  icon: '🧲',
  repeatable: false
}

export const MEDITATION: UpgradeData = {
  id: 'meditation',
  name: 'Meditation',
  description: 'Permanently increases max mana by +2',
  icon: '🧘',
  repeatable: true
}

export const SPELLBOOK: UpgradeData = {
  id: 'spellbook',
  name: 'Spellbook',
  description: 'Grants you one random spell you don\'t already have',
  icon: '📖',
  repeatable: false
}

export const WELLSPRING: UpgradeData = {
  id: 'wellspring',
  name: 'Wellspring',
  description: 'Increases the amount of mana you gain per level by 1',
  icon: '🌊',
  repeatable: false
}

// Temporary buff display upgrades (not selectable, just for UI display)
export const WARD_TEMP: UpgradeData = {
  id: 'ward-temp',
  name: 'Ward (Active)',
  description: '+3 defense for your next fight',
  icon: '🔰',
  repeatable: false
}

export const BLAZE_TEMP: UpgradeData = {
  id: 'blaze-temp',
  name: 'Blaze (Active)',
  description: '+5 attack for your next fight',
  icon: '🔥',
  repeatable: false
}

// Array of all upgrades for random selection
export const ALL_UPGRADES: UpgradeData[] = [
  ATTACK,
  DEFENSE,
  HEALTHY,
  INCOME,
  QUICK,
  RICH,
  WISDOM,
  TRADERS,
  BAG,
  LEFT_HAND,
  RIGHT_HAND,
  RESTING,
  MAGNET,
  MEDITATION,
  SPELLBOOK,
  WELLSPRING
]

// Comprehensive array including temporary upgrades for display lookup
export const ALL_UPGRADES_LOOKUP: UpgradeData[] = [
  ...ALL_UPGRADES,
  WARD_TEMP,
  BLAZE_TEMP
]

// Get available upgrades (excluding non-repeatable ones already owned)
export function getAvailableUpgrades(ownedUpgrades: string[]): UpgradeData[] {
  return ALL_UPGRADES.filter(upgrade => 
    upgrade.repeatable || !ownedUpgrades.includes(upgrade.id)
  )
}