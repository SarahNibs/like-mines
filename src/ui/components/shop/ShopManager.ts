/**
 * ShopManager - Handles shop UI display and interactions
 * Extracted from main.ts to improve code organization
 */

export class ShopManager {
  private shopWidget: HTMLElement
  private shopItemsEl: HTMLElement
  private shopCloseBtn: HTMLElement
  private canvas: HTMLCanvasElement
  private onBuyItem: (index: number) => void
  private onCloseShop: () => void

  constructor(
    shopWidgetId: string,
    shopItemsId: string,
    shopCloseBtnId: string,
    canvasId: string,
    onBuyItem: (index: number) => void,
    onCloseShop: () => void
  ) {
    this.shopWidget = this.getElement(shopWidgetId)
    this.shopItemsEl = this.getElement(shopItemsId)
    this.shopCloseBtn = this.getElement(shopCloseBtnId)
    this.canvas = this.getElement(canvasId) as HTMLCanvasElement
    this.onBuyItem = onBuyItem
    this.onCloseShop = onCloseShop

    this.setupEventListeners()
  }

  private getElement(id: string): HTMLElement {
    const element = document.getElementById(id)
    if (!element) {
      throw new Error(`Element with id '${id}' not found`)
    }
    return element
  }

  private setupEventListeners(): void {
    this.shopCloseBtn.addEventListener('click', () => {
      console.log('Closing shop')
      this.onCloseShop()
    })
  }

  /**
   * Update shop display based on current game state
   */
  updateShop(gameState: any): void {
    if (gameState.shopOpen && gameState.shopItems.length > 0) {
      this.showShop(gameState)
    } else {
      this.hideShop()
    }
  }

  /**
   * Show the shop with current items
   */
  private showShop(gameState: any): void {
    this.shopWidget.style.display = 'block'
    this.shopItemsEl.innerHTML = ''
    
    // Check if board is won while shop is open
    const isBoardWon = gameState.boardStatus === 'won'
    
    // Update close button text and disable board if board is won
    if (isBoardWon) {
      this.shopCloseBtn.textContent = 'Move on'
      this.canvas.style.pointerEvents = 'none' // Disable board interactions
    } else {
      this.shopCloseBtn.textContent = 'Close'
      this.canvas.style.pointerEvents = 'auto' // Enable board interactions
    }
    
    // Create shop item buttons (show only first 3 items)
    gameState.shopItems.slice(0, 3).forEach((shopItem: any, index: number) => {
      const itemEl = this.createShopItemElement(shopItem, index, gameState.run.gold)
      this.shopItemsEl.appendChild(itemEl)
    })
  }

  /**
   * Hide the shop
   */
  private hideShop(): void {
    this.shopWidget.style.display = 'none'
    // Re-enable board interactions when shop is closed
    this.canvas.style.pointerEvents = 'auto'
  }

  /**
   * Create a shop item element
   */
  private createShopItemElement(shopItem: any, index: number, playerGold: number): HTMLElement {
    const itemEl = document.createElement('div')
    itemEl.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px;
      border: 1px solid #666;
      border-radius: 2px;
      background: #444;
      min-height: 32px;
    `
    
    const itemName = document.createElement('span')
    itemName.textContent = shopItem.item.name
    itemName.style.fontSize = '14px'
    itemName.title = `${shopItem.item.name}: ${shopItem.item.description}`
    
    const buyBtn = this.createBuyButton(shopItem, index, playerGold)
    
    itemEl.appendChild(itemName)
    itemEl.appendChild(buyBtn)
    
    return itemEl
  }

  /**
   * Create a buy button for a shop item
   */
  private createBuyButton(shopItem: any, index: number, playerGold: number): HTMLElement {
    const buyBtn = document.createElement('button')
    buyBtn.textContent = `${shopItem.cost}g`
    buyBtn.style.cssText = `
      padding: 2px 6px;
      font-size: 11px;
      border: none;
      border-radius: 2px;
      cursor: pointer;
    `
    
    // Check if player can afford
    const canAfford = playerGold >= shopItem.cost
    
    if (canAfford) {
      buyBtn.style.background = '#4a7c59'
      buyBtn.style.color = 'white'
      buyBtn.addEventListener('click', () => this.onBuyItem(index))
      
      // Hover effects
      buyBtn.addEventListener('mouseenter', () => {
        buyBtn.style.background = '#5a8c69'
      })
      buyBtn.addEventListener('mouseleave', () => {
        buyBtn.style.background = '#4a7c59'
      })
    } else {
      buyBtn.style.background = '#7c4a4a'
      buyBtn.style.color = '#ccc'
      buyBtn.disabled = true
      buyBtn.title = 'Not enough gold'
    }
    
    return buyBtn
  }

  /**
   * Get the shop widget element
   */
  getElement(): HTMLElement {
    return this.shopWidget
  }

  /**
   * Check if shop is currently visible
   */
  isVisible(): boolean {
    return this.shopWidget.style.display === 'block'
  }
}