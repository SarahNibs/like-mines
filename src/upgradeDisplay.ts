/**
 * Upgrade display and management functionality
 */

import { ALL_UPGRADES_LOOKUP } from './upgrades'

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
  currentUpgrades.forEach((upgradeId: string) => {
    const upgrade = ALL_UPGRADES_LOOKUP.find((u: any) => u.id === upgradeId)
    if (upgrade) {
      const icon = document.createElement('span')
      icon.textContent = upgrade.icon
      icon.title = `${upgrade.name}: ${upgrade.description}`
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
        buttons[index].textContent = upgrade.icon
        buttons[index].title = `${upgrade.name}: ${upgrade.description}`
        buttons[index].style.display = 'flex'
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