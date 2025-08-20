/**
 * Upgrade display and management functionality
 */

import { ALL_UPGRADES_LOOKUP } from './upgrades'
import { CharacterManager } from './CharacterManager'

// Cache for upgrade state to prevent unnecessary updates
let lastUpgradeState: string[] = []

// Update upgrades display in run progress
export function updateUpgrades(state: any, upgradesEl: HTMLElement) {
  // Add null checks for DOM elements
  if (!upgradesEl) {
    console.error('Upgrades element not found')
    return
  }
  
  // Check if upgrades have actually changed to prevent flickering
  const currentUpgrades = state.run.upgrades || []
  const upgradesChanged = JSON.stringify(currentUpgrades) !== JSON.stringify(lastUpgradeState)
  
  if (!upgradesChanged) {
    return // No changes, don't update
  }
  
  lastUpgradeState = [...currentUpgrades]
  upgradesEl.innerHTML = ''
  
  // Create upgrade icons synchronously - smaller and more compact for Run Progress box
  const characterManager = new CharacterManager()
  
  // Add character icon first if character exists
  if (state.run.character) {
    const characterIcon = document.createElement('span')
    characterIcon.textContent = state.run.character.icon
    
    // Create character trait description (ongoing changes, not starting equipment)
    let traitDescription = ''
    switch (state.run.character.id) {
      case 'fighter':
        traitDescription = 'All attack and defense increases get +1; cannot cast spells'
        break
      case 'cleric':
        traitDescription = 'HP bonuses from all sources +1; cannot pick Rich, Income only once'
        break
      case 'wizard':
        traitDescription = '+1 spell damage, new spells at levels 6/11/16; cannot take Defense'
        break
      case 'ranger':
        traitDescription = 'Attacks first in combat, takes no damage if attack defeats monster'
        break
      case 'tourist':
        traitDescription = 'Shop appears every level but items cost +2/+3/+4/+5 gold; cannot use Transmute (auto-discarded)'
        break
      case 'below':
        traitDescription = 'Can pick unlimited clue enhancers (Left Hand/Right Hand); cannot use Wands of Transmute'
        break
      default:
        traitDescription = state.run.character.description
    }
    
    characterIcon.title = `${state.run.character.name}: ${traitDescription}`
    characterIcon.style.fontSize = '16px'
    characterIcon.style.padding = '2px'
    characterIcon.style.margin = '1px'
    characterIcon.style.cursor = 'default'
    characterIcon.style.border = '2px solid #ffa500' // Orange border to distinguish from upgrades
    characterIcon.style.borderRadius = '3px'
    characterIcon.style.backgroundColor = 'rgba(255, 165, 0, 0.1)' // Light orange background
    
    upgradesEl.appendChild(characterIcon)
  }
  
  currentUpgrades.forEach((upgradeId: string) => {
    const upgrade = ALL_UPGRADES_LOOKUP.find((u: any) => u.id === upgradeId)
    if (upgrade) {
      const icon = document.createElement('span')
      icon.textContent = upgrade.icon
      
      // Get character-specific description if character exists
      let description = upgrade.description
      if (state.run.character) {
        const upgradeEffects = characterManager.getUpgradeEffects(state.run.character, upgradeId)
        description = upgradeEffects.description
      }
      
      icon.title = `${upgrade.name}: ${description}`
      icon.style.fontSize = '16px'
      icon.style.padding = '2px'
      icon.style.margin = '1px'
      icon.style.cursor = 'default'
      icon.style.display = 'inline-block'
      icon.style.border = '1px solid #666'
      icon.style.borderRadius = '3px'
      icon.style.background = '#444'
      
      upgradesEl.appendChild(icon)
    }
  })
  
  // If no upgrades, show a subtle message
  if (currentUpgrades.length === 0) {
    const message = document.createElement('span')
    message.textContent = 'None'
    message.style.fontSize = '11px'
    message.style.color = '#888'
    message.style.fontStyle = 'italic'
    upgradesEl.appendChild(message)
  }
}

// Update upgrade choice widget display
export function updateUpgradeChoiceWidget(
  state: any, 
  upgradeChoiceWidget: HTMLElement,
  upgradeChoice0Btn: HTMLElement,
  upgradeChoice1Btn: HTMLElement,
  upgradeChoice2Btn: HTMLElement
) {
  if (state.upgradeChoice) {
    upgradeChoiceWidget.style.display = 'block'
    
    // Update buttons with just icons and hover tooltips
    const buttons = [upgradeChoice0Btn, upgradeChoice1Btn, upgradeChoice2Btn]
    state.upgradeChoice.choices.forEach((upgrade: any, index: number) => {
      if (index < buttons.length) {
        const button = buttons[index]
        button.textContent = upgrade.icon
        
        if (upgrade.blocked) {
          // Blocked upgrade styling
          button.title = `${upgrade.name}: ${upgrade.description}\n\n❌ ${upgrade.blockReason}`
          button.style.display = 'flex'
          button.style.opacity = '0.4'
          button.style.cursor = 'not-allowed'
          button.style.backgroundColor = '#333'
          button.style.color = '#666'
          button.disabled = true
          
          // Add a visual indicator for blocked status
          button.style.position = 'relative'
          button.style.textDecoration = 'line-through'
        } else {
          // Available upgrade styling
          button.title = `${upgrade.name}: ${upgrade.description}`
          button.style.display = 'flex'
          button.style.opacity = '1'
          button.style.cursor = 'pointer'
          button.style.backgroundColor = '#444' // Dark background like the rest of the UI
          button.style.color = '#fff' // White text for contrast
          button.disabled = false
          button.style.textDecoration = 'none'
        }
      }
    })
    
    // Hide unused buttons if there are fewer than 3 choices
    for (let i = state.upgradeChoice.choices.length; i < buttons.length; i++) {
      buttons[i].style.display = 'none'
    }
  } else {
    upgradeChoiceWidget.style.display = 'none'
  }
}

// Clear upgrade state cache (used when starting new run)
export function clearUpgradeStateCache() {
  lastUpgradeState = []
}