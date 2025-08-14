/**
 * InventoryManager - Handles inventory UI display and interactions
 * Extracted from main.ts to improve code organization
 */

export class InventoryManager {
  private inventoryEl: HTMLElement
  private onItemClick: (index: number) => void
  private onItemDiscard: (index: number) => void

  constructor(
    inventoryElementId: string,
    onItemClick: (index: number) => void,
    onItemDiscard: (index: number) => void
  ) {
    const element = document.getElementById(inventoryElementId)
    if (!element) {
      throw new Error(`Inventory element with id '${inventoryElementId}' not found`)
    }
    this.inventoryEl = element
    this.onItemClick = onItemClick
    this.onItemDiscard = onItemDiscard
  }

  /**
   * Update inventory display based on current game state
   */
  updateInventory(gameState: any): void {
    // Clear existing inventory
    this.inventoryEl.innerHTML = ''
    
    // Create inventory slots based on maxInventory (increased by Bag upgrades)
    for (let i = 0; i < gameState.run.maxInventory; i++) {
      const slot = this.createInventorySlot(gameState.run.inventory[i], i)
      this.inventoryEl.appendChild(slot)
    }
  }

  /**
   * Create a single inventory slot element
   */
  private createInventorySlot(item: any, index: number): HTMLElement {
    const slot = document.createElement('div')
    slot.className = 'inventory-slot'
    
    if (item) {
      this.populateSlotWithItem(slot, item, index)
    } else {
      this.populateEmptySlot(slot)
    }
    
    return slot
  }

  /**
   * Populate inventory slot with item data
   */
  private populateSlotWithItem(slot: HTMLElement, item: any, index: number): void {
    // Display icon with charge count for multi-use items
    if (item.multiUse) {
      slot.innerHTML = `${item.icon}<span class="charge-counter">${item.multiUse.currentUses}</span>`
      slot.title = `${item.name}: ${item.description} (${item.multiUse.currentUses}/${item.multiUse.maxUses} uses)\nRight-click to discard`
    } else {
      slot.textContent = item.icon
      slot.title = `${item.name}: ${item.description}\nRight-click to discard`
    }
    
    // Add click handlers
    slot.addEventListener('click', () => this.onItemClick(index))
    slot.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      this.onItemDiscard(index)
    })
    
    slot.addEventListener('mouseenter', () => {
      slot.style.borderColor = '#ffa500'
      slot.style.background = '#555'
    })
    
    slot.addEventListener('mouseleave', () => {
      slot.style.borderColor = '#666'
      slot.style.background = '#444'
    })
  }

  /**
   * Populate empty inventory slot
   */
  private populateEmptySlot(slot: HTMLElement): void {
    slot.classList.add('empty')
    slot.textContent = ''
    slot.title = 'Empty slot'
  }

  /**
   * Get the inventory container element
   */
  getElement(): HTMLElement {
    return this.inventoryEl
  }

  /**
   * Highlight a specific inventory slot
   */
  highlightSlot(index: number, highlight: boolean = true): void {
    const slots = this.inventoryEl.children
    if (index >= 0 && index < slots.length) {
      const slot = slots[index] as HTMLElement
      if (highlight) {
        slot.style.borderColor = '#ffa500'
        slot.style.boxShadow = '0 0 8px rgba(255, 165, 0, 0.5)'
      } else {
        slot.style.borderColor = '#666'
        slot.style.boxShadow = 'none'
      }
    }
  }

  /**
   * Clear all slot highlights
   */
  clearHighlights(): void {
    const slots = this.inventoryEl.children
    for (let i = 0; i < slots.length; i++) {
      this.highlightSlot(i, false)
    }
  }
}