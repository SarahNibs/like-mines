/**
 * Inventory display and management
 */

import { isSpellData } from './types'

// Update inventory display
export function updateInventory(state: any, inventoryEl: HTMLElement, onUseItem: (index: number) => void, onDiscardItem: (index: number) => void) {
  // Add null checks for DOM elements
  if (!inventoryEl) {
    console.error('Inventory element not found')
    return
  }
  
  inventoryEl.innerHTML = ''
  
  // Add spell slots first (if any spells)
  if (state.run.spells && state.run.spells.length > 0) {
    state.run.spells.forEach((spell, spellIndex) => {
      const spellSlot = document.createElement('div')
      spellSlot.className = 'inventory-slot spell-slot'
      spellSlot.textContent = spell.icon
      spellSlot.title = `${spell.name}: ${spell.description}\nMana Cost: ${spell.manaCost}\nClick to cast`
      spellSlot.addEventListener('click', () => {
        // TODO: Handle spell casting - for now just log
        console.log(`Attempting to cast spell: ${spell.name}`)
      })
      inventoryEl.appendChild(spellSlot)
    })
  }
  
  // Create regular inventory slots based on maxInventory (increased by Bag upgrades)
  for (let i = 0; i < state.run.maxInventory; i++) {
    const slot = document.createElement('div')
    slot.className = 'inventory-slot'
    const item = state.run.inventory[i]
    
    if (item) {
      // Regular item logic (spells are handled separately above)
      if (item.multiUse) {
        slot.innerHTML = `${item.icon}<span class="charge-counter">${item.multiUse.currentUses}</span>`
        slot.title = `${item.name}: ${item.description} (${item.multiUse.currentUses}/${item.multiUse.maxUses} uses)\nRight-click to discard`
      } else {
        slot.textContent = item.icon
        slot.title = `${item.name}: ${item.description}\nRight-click to discard`
      }
      slot.addEventListener('click', () => onUseItem(i))
      slot.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        onDiscardItem(i)
      })
    } else {
      slot.classList.add('empty')
    }
    
    inventoryEl.appendChild(slot)
  }
}