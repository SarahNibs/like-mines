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
    
    // Set up horizontal layout for items
    shopItemsEl.style.display = 'flex'
    shopItemsEl.style.flexDirection = 'row'
    shopItemsEl.style.alignItems = 'flex-start'
    shopItemsEl.style.gap = '4px'
    shopItemsEl.style.marginBottom = '2px'
    
    // Create shop item buttons in horizontal layout
    state.shopItems.forEach((shopItem: any, index: number) => {
      const itemEl = document.createElement('div')
      itemEl.style.display = 'flex'
      itemEl.style.flexDirection = 'column'
      itemEl.style.alignItems = 'center'
      itemEl.style.padding = '2px'
      itemEl.style.border = '1px solid #666'
      itemEl.style.borderRadius = '2px'
      itemEl.style.background = '#444'
      itemEl.style.cursor = 'pointer'
      itemEl.style.minWidth = '24px'
      
      // Item icon (clickable)
      const itemIcon = document.createElement('div')
      itemIcon.textContent = shopItem.item.icon || '📦'
      itemIcon.style.fontSize = '14px'
      itemIcon.style.lineHeight = '1'
      itemIcon.title = `${shopItem.item.name}: ${shopItem.item.description}`
      
      // Gold cost
      const costLabel = document.createElement('div')
      costLabel.textContent = `${shopItem.cost}g`
      costLabel.style.fontSize = '8px'
      costLabel.style.color = '#ffa500'
      costLabel.style.fontWeight = 'bold'
      costLabel.style.lineHeight = '1'
      costLabel.style.marginTop = '1px'
      
      // Check if player can afford
      const canAfford = state.run.gold >= shopItem.cost
      
      if (canAfford) {
        itemEl.addEventListener('click', () => gameStore.buyShopItem(index))
        itemEl.addEventListener('mouseenter', () => {
          itemEl.style.background = '#555'
          itemEl.style.borderColor = '#888'
        })
        itemEl.addEventListener('mouseleave', () => {
          itemEl.style.background = '#444'
          itemEl.style.borderColor = '#666'
        })
      } else {
        itemEl.style.opacity = '0.5'
        itemIcon.title = `${shopItem.item.name}: ${shopItem.item.description}\n\nNot enough gold (need ${shopItem.cost}g)`
        costLabel.style.color = '#ccc'
      }
      
      itemEl.appendChild(itemIcon)
      itemEl.appendChild(costLabel)
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