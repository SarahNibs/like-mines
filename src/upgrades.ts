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
  description: 'When you defeat a monster, adjacent tiles gain +1 gold items',
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

// Array of all upgrades for random selection
export const ALL_UPGRADES: UpgradeData[] = [
  ATTACK,
  DEFENSE,
  HEALTHY,
  INCOME,
  QUICK,
  RICH,
  WISDOM
]

// Get available upgrades (excluding non-repeatable ones already owned)
export function getAvailableUpgrades(ownedUpgrades: string[]): UpgradeData[] {
  return ALL_UPGRADES.filter(upgrade => 
    upgrade.repeatable || !ownedUpgrades.includes(upgrade.id)
  )
}