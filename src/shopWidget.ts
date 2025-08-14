/**
 * Shop and discard widget functionality
 */

// Update shop widget display
export function updateShopWidget(
  state: any, 
  shopWidget: HTMLElement, 
  shopItemsEl: HTMLElement, 
  shopCloseBtn: HTMLElement, 
  canvas: HTMLCanvasElement,
  gameStore: any
) {
  if (state.shopOpen && state.shopItems.length > 0) {
    shopWidget.style.display = 'block'
    shopItemsEl.innerHTML = ''
    
    // Check if board is won while shop is open
    const isBoardWon = state.boardStatus === 'won'
    
    // Update close button text and disable board if board is won
    if (isBoardWon) {
      shopCloseBtn.textContent = 'Move on'
      canvas.style.pointerEvents = 'none' // Disable board interactions
    } else {
      shopCloseBtn.textContent = 'Close'
      canvas.style.pointerEvents = 'auto' // Enable board interactions
    }
    
    // Create shop item buttons
    state.shopItems.forEach((shopItem: any, index: number) => {
      const itemEl = document.createElement('div')
      itemEl.style.display = 'flex'
      itemEl.style.alignItems = 'center'
      itemEl.style.justifyContent = 'space-between'
      itemEl.style.padding = '6px'
      itemEl.style.border = '1px solid #666'
      itemEl.style.borderRadius = '2px'
      itemEl.style.background = '#444'
      itemEl.style.minHeight = '32px'
      
      const itemName = document.createElement('span')
      itemName.textContent = shopItem.item.name
      itemName.style.fontSize = '14px'
      itemName.title = `${shopItem.item.name}: ${shopItem.item.description}`
      
      const buyBtn = document.createElement('button')
      buyBtn.textContent = `${shopItem.cost}g`
      buyBtn.style.padding = '2px 6px'
      buyBtn.style.fontSize = '11px'
      buyBtn.style.border = 'none'
      buyBtn.style.borderRadius = '2px'
      buyBtn.style.cursor = 'pointer'
      
      // Check if player can afford
      const canAfford = state.run.gold >= shopItem.cost
      
      if (canAfford) {
        buyBtn.style.background = '#4a7c59'
        buyBtn.style.color = 'white'
        buyBtn.addEventListener('click', () => gameStore.buyShopItem(index))
      } else {
        buyBtn.style.background = '#7c4a4a'
        buyBtn.style.color = '#ccc'
        buyBtn.disabled = true
        buyBtn.title = 'Not enough gold'
      }
      
      itemEl.appendChild(itemName)
      itemEl.appendChild(buyBtn)
      shopItemsEl.appendChild(itemEl)
    })
  } else {
    shopWidget.style.display = 'none'
    // Re-enable board interactions when shop is closed
    canvas.style.pointerEvents = 'auto'
  }
}

// Update discard widget display
export function updateDiscardWidget(
  state: any, 
  discardWidget: HTMLElement, 
  discardMessage: HTMLElement
) {
  if (state.pendingDiscard) {
    discardWidget.style.display = 'block'
    discardMessage.textContent = `Discard "${state.pendingDiscard.itemName}"? This action cannot be undone.`
  } else {
    discardWidget.style.display = 'none'
  }
}