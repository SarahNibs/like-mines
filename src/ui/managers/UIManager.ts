/**
 * UIManager - Central coordinator for all UI components
 * Manages the overall UI state and coordinates between components
 */

import { TooltipManager } from '../components/tooltips/TooltipManager'
import { InventoryManager } from '../components/inventory/InventoryManager'
import { ShopManager } from '../components/shop/ShopManager'
import { CharacterSelection } from '../components/character/CharacterSelection'
import { StatusPanel } from '../components/game/StatusPanel'

export class UIManager {
  private tooltipManager: TooltipManager
  private inventoryManager: InventoryManager
  private shopManager: ShopManager
  private characterSelection: CharacterSelection
  private statusPanel: StatusPanel
  
  // Game store reference for callbacks
  private gameStore: any

  constructor(gameStore: any) {
    this.gameStore = gameStore
    
    // Initialize all UI components
    this.tooltipManager = new TooltipManager()
    
    this.inventoryManager = new InventoryManager(
      'inventory',
      (index: number) => this.gameStore.useInventoryItem(index),
      (index: number) => this.gameStore.showDiscardConfirmation(index)
    )
    
    this.shopManager = new ShopManager(
      'shop-widget',
      'shop-items',
      'shop-close',
      'game-board',
      (index: number) => this.gameStore.buyShopItem(index),
      () => this.gameStore.closeShop()
    )
    
    this.characterSelection = new CharacterSelection(
      'character-select-overlay',
      'character-choices',
      (characterId: string) => this.gameStore.selectCharacter(characterId)
    )
    
    this.statusPanel = new StatusPanel()
  }

  /**
   * Update all UI components based on current game state
   */
  updateUI(gameState: any): void {
    // Update status panel
    this.statusPanel.updateStatus(gameState)
    
    // Update inventory
    this.inventoryManager.updateInventory(gameState)
    
    // Update shop
    this.shopManager.updateShop(gameState)
    
    // Update character selection
    this.characterSelection.updateCharacterSelection(gameState)
    
    // Update canvas classes for game modes
    this.updateCanvasClasses(gameState)
  }

  /**
   * Update canvas CSS classes based on current game mode
   */
  private updateCanvasClasses(gameState: any): void {
    const canvas = document.getElementById('game-board') as HTMLCanvasElement
    if (!canvas) return

    // Clear all mode classes
    canvas.className = ''
    
    // Add appropriate mode class
    if (gameState.transmuteMode) {
      canvas.classList.add('transmute-mode')
      canvas.title = 'Transmute Mode: Click any tile to convert it to yours'
    } else if (gameState.detectorMode) {
      canvas.classList.add('detector-mode')
      canvas.title = 'Detector Mode: Click any tile to scan adjacent tiles'
    } else if (gameState.keyMode) {
      canvas.classList.add('key-mode')
      canvas.title = 'Key Mode: Click any locked tile to unlock it'
    } else if (gameState.staffMode) {
      canvas.classList.add('staff-mode')
      canvas.title = 'Staff Mode: Click any monster to attack it'
    } else if (gameState.ringMode) {
      canvas.classList.add('ring-mode')
      canvas.title = 'Ring Mode: Click any fogged tile to remove fog'
    } else {
      canvas.title = ''
    }
  }

  /**
   * Get tooltip manager for external use
   */
  getTooltipManager(): TooltipManager {
    return this.tooltipManager
  }

  /**
   * Get inventory manager for external use
   */
  getInventoryManager(): InventoryManager {
    return this.inventoryManager
  }

  /**
   * Get shop manager for external use
   */
  getShopManager(): ShopManager {
    return this.shopManager
  }

  /**
   * Get character selection for external use
   */
  getCharacterSelection(): CharacterSelection {
    return this.characterSelection
  }

  /**
   * Get status panel for external use
   */
  getStatusPanel(): StatusPanel {
    return this.statusPanel
  }

  /**
   * Clean up all UI components
   */
  destroy(): void {
    this.tooltipManager.destroy()
    // Other components don't need explicit cleanup currently
  }
}