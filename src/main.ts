import './style.css'
import { gameStore } from './store'
import { GameRenderer } from './renderer'

console.log('Roguelike Minesweeper - Starting up...')

// Get canvas and initialize renderer
const canvas = document.getElementById('game-board') as HTMLCanvasElement
const renderer = new GameRenderer(canvas)

// UI elements
const levelInfoEl = document.getElementById('level-info')!
const hpInfoEl = document.getElementById('hp-info')!
const goldInfoEl = document.getElementById('gold-info')!
const statsInfoEl = document.getElementById('stats-info')!
const turnInfoEl = document.getElementById('turn-info')!
const winStatusEl = document.getElementById('win-status')!
const playerTilesEl = document.getElementById('player-tiles')!
const opponentTilesEl = document.getElementById('opponent-tiles')!
const clueHintEl = document.getElementById('clue-hint')!
const handAEl = document.getElementById('hand-a')!
const handBEl = document.getElementById('hand-b')!
const endTurnBtn = document.getElementById('end-turn')!
const inventoryEl = document.getElementById('inventory')!
const boardOverlay = document.getElementById('board-overlay')!
const overlayMessage = document.getElementById('overlay-message')!
const rewindWidget = document.getElementById('rewind-widget')!
const rewindMessage = document.getElementById('rewind-message')!
const rewindProceedBtn = document.getElementById('rewind-proceed')!
const rewindCancelBtn = document.getElementById('rewind-cancel')!
const shopWidget = document.getElementById('shop-widget')!
const shopItemsEl = document.getElementById('shop-items')!
const shopCloseBtn = document.getElementById('shop-close')!
const discardWidget = document.getElementById('discard-widget')!
const discardMessage = document.getElementById('discard-message')!
const discardConfirmBtn = document.getElementById('discard-confirm')!
const discardCancelBtn = document.getElementById('discard-cancel')!

// Detector hover tooltip element
let detectorTooltip: HTMLElement | null = null

// Create detector tooltip if it doesn't exist
function createDetectorTooltip(): HTMLElement {
  if (!detectorTooltip) {
    detectorTooltip = document.createElement('div')
    detectorTooltip.style.position = 'absolute'
    detectorTooltip.style.background = 'rgba(0, 0, 0, 0.9)'
    detectorTooltip.style.color = '#fff'
    detectorTooltip.style.padding = '8px'
    detectorTooltip.style.borderRadius = '4px'
    detectorTooltip.style.fontSize = '12px'
    detectorTooltip.style.fontFamily = 'Courier New, monospace'
    detectorTooltip.style.pointerEvents = 'none'
    detectorTooltip.style.zIndex = '1000'
    detectorTooltip.style.display = 'none'
    detectorTooltip.style.border = '1px solid #666'
    document.body.appendChild(detectorTooltip)
  }
  return detectorTooltip
}

// Show detector tooltip
function showDetectorTooltip(x: number, y: number, playerCount: number, opponentCount: number, neutralCount: number): void {
  const tooltip = createDetectorTooltip()
  tooltip.innerHTML = `Detector Scan (3x3 area):<br/>Player tiles: ${playerCount}<br/>Opponent tiles: ${opponentCount}<br/>Neutral tiles: ${neutralCount}`
  tooltip.style.left = `${x + 10}px`
  tooltip.style.top = `${y - 10}px`
  tooltip.style.display = 'block'
}

// Hide detector tooltip
function hideDetectorTooltip(): void {
  if (detectorTooltip) {
    detectorTooltip.style.display = 'none'
  }
}

// Update UI with current game state
function updateUI() {
  const state = gameStore.getState()
  const board = state.board
  
  // Update run progress
  levelInfoEl.textContent = `Level ${state.run.currentLevel} / ${state.run.maxLevel}`
  hpInfoEl.textContent = `HP: ${state.run.hp} / ${state.run.maxHp}`
  goldInfoEl.textContent = `Gold: ${state.run.gold}`
  statsInfoEl.textContent = `Attack: ${state.run.attack} | Defense: ${state.run.defense}`
  
  // Update turn info
  if (state.gameStatus === 'run-complete') {
    turnInfoEl.textContent = 'Victory!'
  } else if (state.gameStatus === 'playing') {
    if (state.transmuteMode) {
      turnInfoEl.textContent = '🪄 TRANSMUTE MODE: Click tile to convert'
      turnInfoEl.style.color = '#ffa500'
    } else if (state.detectorMode) {
      turnInfoEl.textContent = '📡 DETECTOR MODE: Click tile to scan'
      turnInfoEl.style.color = '#00ffff'
    } else if (state.boardStatus === 'in-progress') {
      turnInfoEl.textContent = state.currentTurn === 'player' ? "Player's Turn" : "AI's Turn"
      turnInfoEl.style.color = '#ffffff'
    } else {
      turnInfoEl.textContent = 'Board Complete'
      turnInfoEl.style.color = '#ffffff'
    }
  } else {
    turnInfoEl.textContent = 'Run Over'
    turnInfoEl.style.color = '#ffffff'
  }
  
  // Update board/run status (check run-complete first)
  if (state.gameStatus === 'run-complete') {
    winStatusEl.textContent = '🏆 Victory!'
    winStatusEl.style.color = '#ffa500'
    boardOverlay.style.display = 'none'
  } else if (state.gameStatus === 'player-died') {
    winStatusEl.textContent = '💀 You Died!'
    winStatusEl.style.color = '#7c4a4a'
    // Show overlay message
    overlayMessage.textContent = '💀 You Died!'
    boardOverlay.style.display = 'flex'
  } else if (state.boardStatus === 'won') {
    winStatusEl.textContent = '🎉 Advancing...'
    winStatusEl.style.color = '#4a7c59'
    // Show overlay message
    overlayMessage.textContent = '🎉 Board Cleared!'
    boardOverlay.style.display = 'flex'
  } else if (state.boardStatus === 'lost') {
    winStatusEl.textContent = '💀 Run Ends!'
    winStatusEl.style.color = '#7c4a4a'
    // Show overlay message
    overlayMessage.textContent = '💀 Board Lost!'
    boardOverlay.style.display = 'flex'
  } else {
    winStatusEl.textContent = ''
    boardOverlay.style.display = 'none'
  }
  
  // Update tile counts
  playerTilesEl.textContent = `Player tiles: ${board.playerTilesRevealed}/${board.playerTilesTotal}`
  opponentTilesEl.textContent = `AI tiles: ${board.opponentTilesRevealed}/${board.opponentTilesTotal}`
  
  // Show/hide End Turn button
  if (state.gameStatus === 'playing' && state.currentTurn === 'player' && state.boardStatus === 'in-progress') {
    endTurnBtn.style.display = 'block'
  } else {
    endTurnBtn.style.display = 'none'
  }
  
  // Update inventory
  updateInventory(state)
  
  // Update rewind widget
  updateRewindWidget(state)
  
  // Update shop widget
  updateShopWidget(state)
  
  // Update discard widget
  updateDiscardWidget(state)
  
  // Update clues only when necessary
  let annotatedCount = 0
  for (let y = 0; y < state.board.height; y++) {
    for (let x = 0; x < state.board.width; x++) {
      if (state.board.tiles[y][x].annotated) annotatedCount++
    }
  }
  
  const currentCluesHash = JSON.stringify({
    cluesLength: state.clues.length,
    revealedCount: state.board.playerTilesRevealed + state.board.opponentTilesRevealed,
    annotatedCount: annotatedCount
  })
  
  if (window.lastCluesHash !== currentCluesHash) {
    console.log('Updating clues UI - hash changed')
    updateClues(state)
    window.lastCluesHash = currentCluesHash
  }
  
  // Always update hover highlights (independent of clue rebuilding)
  updateHoverHighlights()
}

// Hover state management
let currentHoverTiles = null // {tiles: Tile[], extraTiles: Tile[]}
let persistentHoverTiles = null // Same structure but dimmer

// Update hover highlights on board
function updateHoverHighlights() {
  if (currentHoverTiles) {
    // Active hover - bright highlights
    console.log('Setting BRIGHT highlights for', currentHoverTiles.tiles.length, 'tiles')
    renderer.setHighlightedTiles(currentHoverTiles.tiles)
    renderer.setExtraHighlighted(currentHoverTiles.extraTiles || [])
  } else if (persistentHoverTiles) {
    // Persistent hover - dimmer highlights  
    console.log('Setting DIMMED highlights for', persistentHoverTiles.tiles.length, 'tiles')
    renderer.setDimmedHighlights(persistentHoverTiles.tiles, persistentHoverTiles.extraTiles || [])
  } else {
    // No highlights
    console.log('Clearing all highlights')
    renderer.clearHighlights()
  }
}

// Update inventory display
function updateInventory(state: any) {
  // Add null checks for DOM elements
  if (!inventoryEl) {
    console.error('Inventory element not found')
    return
  }
  
  inventoryEl.innerHTML = ''
  
  // Create inventory slots
  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('div')
    slot.className = 'inventory-slot'
    const item = state.run.inventory[i]
    
    if (item) {
      slot.textContent = item.icon
      slot.title = `${item.name}: ${item.description}\nRight-click to discard`
      slot.addEventListener('click', () => gameStore.useInventoryItem(i))
      slot.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        gameStore.showDiscardConfirmation(i)
      })
    } else {
      slot.classList.add('empty')
    }
    
    inventoryEl.appendChild(slot)
  }
}

// Update rewind widget display
function updateRewindWidget(state: any) {
  if (state.pendingRewind) {
    rewindWidget.style.display = 'block'
    rewindMessage.textContent = `This is a ${state.pendingRewind.description}! Use Rewind to prevent revealing it, or proceed anyway.`
  } else {
    rewindWidget.style.display = 'none'
  }
}

// Update shop widget display
function updateShopWidget(state: any) {
  if (state.shopOpen && state.shopItems.length > 0) {
    shopWidget.style.display = 'block'
    shopItemsEl.innerHTML = ''
    
    // Create shop item buttons
    state.shopItems.forEach((shopItem: any, index: number) => {
      const itemEl = document.createElement('div')
      itemEl.style.display = 'flex'
      itemEl.style.alignItems = 'center'
      itemEl.style.justifyContent = 'space-between'
      itemEl.style.padding = '4px'
      itemEl.style.border = '1px solid #666'
      itemEl.style.borderRadius = '2px'
      itemEl.style.background = '#444'
      
      const itemInfo = document.createElement('div')
      itemInfo.style.display = 'flex'
      itemInfo.style.alignItems = 'center'
      itemInfo.style.gap = '6px'
      
      const itemIcon = document.createElement('span')
      itemIcon.textContent = shopItem.item.icon
      itemIcon.style.fontSize = '16px'
      
      const itemName = document.createElement('span')
      itemName.textContent = shopItem.item.name
      itemName.style.fontSize = '12px'
      
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
      
      itemInfo.appendChild(itemIcon)
      itemInfo.appendChild(itemName)
      itemEl.appendChild(itemInfo)
      itemEl.appendChild(buyBtn)
      shopItemsEl.appendChild(itemEl)
    })
  } else {
    shopWidget.style.display = 'none'
  }
}

// Update discard widget display
function updateDiscardWidget(state: any) {
  if (state.pendingDiscard) {
    discardWidget.style.display = 'block'
    discardMessage.textContent = `Discard "${state.pendingDiscard.itemName}"? This action cannot be undone.`
  } else {
    discardWidget.style.display = 'none'
  }
}

// Helper to get tile color based on reveal status
function getTileDisplayColor(boardTile: any): string {
  if (!boardTile.revealed) {
    return '#555' // Unrevealed color
  }
  
  // Revealed colors matching renderer (more vibrant)
  switch (boardTile.owner) {
    case 'player': return '#4CAF50'
    case 'opponent': return '#F44336'  
    case 'neutral': return '#9E9E9E'
    default: return '#555'
  }
}

// Update clue display
function updateClues(state: any) {
  if (!state.clues || state.clues.length === 0) {
    return
  }
  
  // Create a scrollable container for all clues
  const allCluesContainer = document.createElement('div')
  allCluesContainer.style.maxHeight = '140px'
  allCluesContainer.style.overflowY = 'auto'
  allCluesContainer.style.padding = '4px'
  
  state.clues.forEach((clue: any, clueIndex: number) => {
    const clueSection = document.createElement('div')
    clueSection.style.marginBottom = '10px'
    clueSection.style.borderBottom = clueIndex < state.clues.length - 1 ? '1px solid #555' : 'none'
    clueSection.style.paddingBottom = '8px'
    
    // Two hands side by side, no labels, just bordered containers
    const handsContainer = document.createElement('div')
    handsContainer.style.display = 'flex'
    handsContainer.style.gap = '6px'
    handsContainer.style.alignItems = 'flex-start'
    
    // Hand A tiles
    const handAGrid = document.createElement('div')
    handAGrid.style.display = 'flex'
    handAGrid.style.flexWrap = 'wrap'
    handAGrid.style.gap = '2px'
    handAGrid.style.padding = '3px'
    handAGrid.style.border = '1px solid #888'
    handAGrid.style.borderRadius = '2px'
    handAGrid.style.background = '#2a2a2a'
    
    clue.handA.tiles.forEach((tile: any, tileIndex: number) => {
      const boardTile = state.board.tiles[tile.y][tile.x]
      const tileEl = document.createElement('div')
      tileEl.className = 'clue-tile'
      tileEl.setAttribute('data-clue', clueIndex.toString())
      tileEl.setAttribute('data-hand', 'A')
      tileEl.setAttribute('data-tile', tileIndex.toString())
      tileEl.style.width = '18px'
      tileEl.style.height = '18px'
      tileEl.style.background = getTileDisplayColor(boardTile)
      tileEl.style.border = '1px solid #999'
      tileEl.style.borderRadius = '1px'
      tileEl.style.cursor = 'pointer'
      tileEl.style.position = 'relative'
      
      // Show annotation if tile is annotated (diagonal slash like board)
      if (boardTile.annotated) {
        const slash = document.createElement('div')
        slash.style.position = 'absolute'
        slash.style.top = '0'
        slash.style.left = '0'
        slash.style.width = '100%'
        slash.style.height = '100%'
        slash.style.pointerEvents = 'none'
        
        // Create the actual slash line
        const slashLine = document.createElement('div')
        slashLine.style.position = 'absolute'
        slashLine.style.top = '50%'
        slashLine.style.left = '10%'
        slashLine.style.width = '80%'
        slashLine.style.height = '1px'
        slashLine.style.background = '#999'
        slashLine.style.transform = 'translateY(-50%) rotate(-45deg)' // Bottom-left to top-right
        slashLine.style.transformOrigin = 'center'
        
        slash.appendChild(slashLine)
        tileEl.appendChild(slash)
      }
      
      // Hover effects - highlight whole hand, with this tile extra highlighted
      tileEl.addEventListener('mouseenter', () => {
        console.log('Mouse enter Hand A tile', tile.x, tile.y)
        currentHoverTiles = { tiles: clue.handA.tiles, extraTiles: [tile] }
        persistentHoverTiles = null // Clear any existing persistent highlights
        updateHoverHighlights() // Update highlights immediately
        render()
      })
      
      tileEl.addEventListener('mouseleave', () => {
        console.log('Mouse leave Hand A tile', tile.x, tile.y)
        // Move current hover to persistent, then clear current
        if (currentHoverTiles) {
          persistentHoverTiles = { ...currentHoverTiles }
        }
        currentHoverTiles = null
        updateHoverHighlights() // Update highlights immediately
        render()
      })
      
      // Left click to reveal tile (only on player turn)
      console.log('Attaching click handler to clue tile:', tile.x, tile.y)
      tileEl.addEventListener('click', (e) => {
        e.stopPropagation()
        console.log('Clue tile clicked!', tile.x, tile.y)
        const state = gameStore.getState()
        console.log('Current turn:', state.currentTurn)
        if (state.currentTurn !== 'player') {
          console.log('Not player turn, ignoring click')
          return // Don't do anything if not player's turn
        }
        
        // Clear hover state when clicking
        currentHoverTiles = null
        persistentHoverTiles = null
        
        // Set persistent highlight first
        renderer.setPersistentHighlights(clue.handA.tiles, [tile])
        
        // Try to reveal the tile (using normal method that respects turns)
        console.log('Attempting to reveal tile at', tile.x, tile.y)
        const success = gameStore.revealTileAt(tile.x, tile.y)
        console.log('Reveal success:', success)
        
        // Handle highlight clearing same as board clicks
        const newState = gameStore.getState()
        if (!success || newState.currentTurn !== 'player') {
          currentHoverTiles = null
          persistentHoverTiles = null
          renderer.clearAllHighlights()
        }
        render()
      })
      
      // Right click to annotate
      tileEl.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        gameStore.toggleAnnotation(tile.x, tile.y)
        render()
      })
      
      handAGrid.appendChild(tileEl)
    })
    
    // Hand B tiles  
    const handBGrid = document.createElement('div')
    handBGrid.style.display = 'flex'
    handBGrid.style.flexWrap = 'wrap'
    handBGrid.style.gap = '2px'
    handBGrid.style.padding = '3px'
    handBGrid.style.border = '1px solid #888'
    handBGrid.style.borderRadius = '2px'
    handBGrid.style.background = '#2a2a2a'
    
    clue.handB.tiles.forEach((tile: any, tileIndex: number) => {
      const boardTile = state.board.tiles[tile.y][tile.x]
      const tileEl = document.createElement('div')
      tileEl.className = 'clue-tile'
      tileEl.setAttribute('data-clue', clueIndex.toString())
      tileEl.setAttribute('data-hand', 'B')
      tileEl.setAttribute('data-tile', tileIndex.toString())
      tileEl.style.width = '18px'
      tileEl.style.height = '18px'
      tileEl.style.background = getTileDisplayColor(boardTile)
      tileEl.style.border = '1px solid #999'
      tileEl.style.borderRadius = '1px'
      tileEl.style.cursor = 'pointer'
      tileEl.style.position = 'relative'
      
      // Show annotation if tile is annotated (diagonal slash like board)
      if (boardTile.annotated) {
        const slash = document.createElement('div')
        slash.style.position = 'absolute'
        slash.style.top = '0'
        slash.style.left = '0'
        slash.style.width = '100%'
        slash.style.height = '100%'
        slash.style.pointerEvents = 'none'
        
        // Create the actual slash line
        const slashLine = document.createElement('div')
        slashLine.style.position = 'absolute'
        slashLine.style.top = '50%'
        slashLine.style.left = '10%'
        slashLine.style.width = '80%'
        slashLine.style.height = '1px'
        slashLine.style.background = '#999'
        slashLine.style.transform = 'translateY(-50%) rotate(-45deg)' // Bottom-left to top-right
        slashLine.style.transformOrigin = 'center'
        
        slash.appendChild(slashLine)
        tileEl.appendChild(slash)
      }
      
      // Hover effects - highlight whole hand, with this tile extra highlighted
      tileEl.addEventListener('mouseenter', () => {
        console.log('Mouse enter Hand B tile', tile.x, tile.y)
        currentHoverTiles = { tiles: clue.handB.tiles, extraTiles: [tile] }
        persistentHoverTiles = null // Clear any existing persistent highlights
        updateHoverHighlights() // Update highlights immediately
        render()
      })
      
      tileEl.addEventListener('mouseleave', () => {
        console.log('Mouse leave Hand B tile', tile.x, tile.y)
        // Move current hover to persistent, then clear current
        if (currentHoverTiles) {
          persistentHoverTiles = { ...currentHoverTiles }
        }
        currentHoverTiles = null
        updateHoverHighlights() // Update highlights immediately
        render()
      })
      
      // Left click to reveal tile (only on player turn)
      console.log('Attaching click handler to clue tile (Hand B):', tile.x, tile.y)
      tileEl.addEventListener('click', (e) => {
        e.stopPropagation()
        console.log('Clue tile clicked! (Hand B)', tile.x, tile.y)
        const state = gameStore.getState()
        console.log('Current turn:', state.currentTurn)
        if (state.currentTurn !== 'player') {
          console.log('Not player turn, ignoring click')
          return // Don't do anything if not player's turn
        }
        
        // Clear hover state when clicking
        currentHoverTiles = null
        persistentHoverTiles = null
        
        // Set persistent highlight first
        renderer.setPersistentHighlights(clue.handB.tiles, [tile])
        
        // Try to reveal the tile (using normal method that respects turns)
        console.log('Attempting to reveal tile at', tile.x, tile.y)
        const success = gameStore.revealTileAt(tile.x, tile.y)
        console.log('Reveal success:', success)
        
        // Handle highlight clearing same as board clicks
        const newState = gameStore.getState()
        if (!success || newState.currentTurn !== 'player') {
          currentHoverTiles = null
          persistentHoverTiles = null
          renderer.clearAllHighlights()
        }
        render()
      })
      
      // Right click to annotate
      tileEl.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        gameStore.toggleAnnotation(tile.x, tile.y)
        render()
      })
      
      handBGrid.appendChild(tileEl)
    })
    
    handsContainer.appendChild(handAGrid)
    handsContainer.appendChild(handBGrid)
    clueSection.appendChild(handsContainer)
    allCluesContainer.appendChild(clueSection)
  })
  
  // Replace the hands display with our new all-clues container
  const cluesStatusContent = document.querySelector('#right-panel .status:nth-child(3) .status-content')
  if (cluesStatusContent) {
    cluesStatusContent.innerHTML = ''
    cluesStatusContent.appendChild(allCluesContainer)
    
    // Add the help text
    const helpText = document.createElement('div')
    helpText.textContent = 'Hover: highlight, Click: persist, Right-click board: annotate'
    helpText.style.marginTop = '8px'
    helpText.style.fontSize = '11px'
    helpText.style.color = '#aaa'
    cluesStatusContent.appendChild(helpText)
  }
}

// Render game
function render() {
  const state = gameStore.getState()
  renderer.renderBoard(state.board)
  updateUI()
}

// Click handling
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  
  const state = gameStore.getState()
  const tilePos = renderer.getTileFromCoordinates(state.board, mouseX, mouseY)
  
  console.log('Click at canvas coordinates:', mouseX, mouseY)
  console.log('Tile position:', tilePos)
  
  if (tilePos) {
    // Check if we're in transmute mode
    if (state.transmuteMode) {
      console.log('Transmute mode: attempting to transmute tile at', tilePos.x, tilePos.y)
      const success = gameStore.transmuteTileAt(tilePos.x, tilePos.y)
      console.log('Transmute success:', success)
      return // Don't do normal tile reveal
    }
    
    // Check if we're in detector mode
    if (state.detectorMode) {
      console.log('Detector mode: attempting to detect tile at', tilePos.x, tilePos.y)
      const success = gameStore.detectTileAt(tilePos.x, tilePos.y)
      console.log('Detector success:', success)
      return // Don't do normal tile reveal
    }
    
    console.log('Attempting to reveal tile at', tilePos.x, tilePos.y)
    const wasPlayerTurn = state.currentTurn === 'player'
    const success = gameStore.revealTileAt(tilePos.x, tilePos.y)
    console.log('Reveal success:', success)
    
    // Only clear highlights if turn actually changes
    const newState = gameStore.getState()
    if (success && wasPlayerTurn && newState.currentTurn !== 'player') {
      // Clear highlights only when turn switches from player to AI
      currentHoverTiles = null
      persistentHoverTiles = null
      renderer.clearAllHighlights()
      render()
    }
  } else {
    // Clicked outside any tile - clear all highlights
    currentHoverTiles = null
    persistentHoverTiles = null
    renderer.clearAllHighlights()
    render()
  }
})

// Right-click handling for annotations and transmute cancel
canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault() // Prevent context menu
  
  const state = gameStore.getState()
  
  // Right-click cancels transmute mode
  if (state.transmuteMode) {
    gameStore.cancelTransmute()
    return
  }
  
  // Right-click cancels detector mode
  if (state.detectorMode) {
    gameStore.cancelDetector()
    return
  }
  
  const rect = canvas.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  
  const tilePos = renderer.getTileFromCoordinates(state.board, mouseX, mouseY)
  
  if (tilePos) {
    console.log('Toggling annotation for tile at', tilePos.x, tilePos.y)
    const success = gameStore.toggleAnnotation(tilePos.x, tilePos.y)
    console.log('Annotation toggle success:', success)
  }
})

// Check if mouse is over detector scan area for a tile
function isMouseOverDetectorScan(mouseX: number, mouseY: number, tile: any, tileSize: number, padding: number, gap: number): boolean {
  if (!tile.detectorScan) return false
  
  // Calculate tile position
  const x = padding + tile.x * (tileSize + gap)
  const y = padding + tile.y * (tileSize + gap)
  
  // Calculate detector box position (same logic as renderer)
  const scanText = `${tile.detectorScan.playerAdjacent}/${tile.detectorScan.opponentAdjacent}/${tile.detectorScan.neutralAdjacent}`
  
  // Approximate text width calculation (we'll use a rough estimate)
  const textWidth = scanText.length * (tileSize * 0.08) // Rough approximation
  const textHeight = tileSize * 0.12
  const boxPadding = 2
  const boxWidth = textWidth + boxPadding * 2
  const boxHeight = textHeight + boxPadding * 2
  const boxX = x + tileSize - boxWidth - 2
  const boxY = y + tileSize - boxHeight - 2
  
  // Check if mouse is within the box
  return mouseX >= boxX && mouseX <= boxX + boxWidth && 
         mouseY >= boxY && mouseY <= boxY + boxHeight
}

// Mouse hover handling for board tiles to highlight corresponding clue tiles and show detector tooltips
canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  
  const state = gameStore.getState()
  const tilePos = renderer.getTileFromCoordinates(state.board, mouseX, mouseY)
  
  // Check for detector scan hover first
  let detectorHover = false
  if (tilePos) {
    const tile = state.board.tiles[tilePos.y][tilePos.x]
    // Get actual renderer properties
    const tileSize = renderer.getTileSize()
    const padding = renderer.getPadding()
    const gap = renderer.getGap()
    
    if (isMouseOverDetectorScan(mouseX, mouseY, tile, tileSize, padding, gap)) {
      const clientX = event.clientX
      const clientY = event.clientY
      showDetectorTooltip(clientX, clientY, tile.detectorScan.playerAdjacent, tile.detectorScan.opponentAdjacent, tile.detectorScan.neutralAdjacent)
      detectorHover = true
    }
  }
  
  if (!detectorHover) {
    hideDetectorTooltip()
  }
  
  if (tilePos) {
    highlightCluetilesForBoardTile(tilePos.x, tilePos.y)
  } else {
    clearClueTileHighlights()
  }
})

canvas.addEventListener('mouseleave', () => {
  clearClueTileHighlights()
  hideDetectorTooltip()
})

// Function to highlight clue tiles that correspond to a board tile
function highlightCluetilesForBoardTile(boardX: number, boardY: number) {
  const state = gameStore.getState()
  
  // Find all clue tiles that match this board position
  const matchingClueElements: HTMLElement[] = []
  
  state.clues.forEach((clue: any, clueIndex: number) => {
    // Check hand A
    clue.handA.tiles.forEach((tile: any, tileIndex: number) => {
      if (tile.x === boardX && tile.y === boardY) {
        const clueElement = document.querySelector(`.clue-tile[data-clue="${clueIndex}"][data-hand="A"][data-tile="${tileIndex}"]`)
        if (clueElement) matchingClueElements.push(clueElement as HTMLElement)
      }
    })
    
    // Check hand B  
    clue.handB.tiles.forEach((tile: any, tileIndex: number) => {
      if (tile.x === boardX && tile.y === boardY) {
        const clueElement = document.querySelector(`.clue-tile[data-clue="${clueIndex}"][data-hand="B"][data-tile="${tileIndex}"]`)
        if (clueElement) matchingClueElements.push(clueElement as HTMLElement)
      }
    })
  })
  
  // Clear previous highlights and add new ones
  clearClueTileHighlights()
  matchingClueElements.forEach(element => {
    element.classList.add('board-hover-highlight')
  })
}

function clearClueTileHighlights() {
  document.querySelectorAll('.board-hover-highlight').forEach(element => {
    element.classList.remove('board-hover-highlight')
  })
}

// Debug button handlers
document.getElementById('reveal-all-player')!.addEventListener('click', () => {
  console.log('Revealing all player tiles...')
  gameStore.revealAllPlayerTiles()
})

document.getElementById('reveal-all-opponent')!.addEventListener('click', () => {
  console.log('Revealing all opponent tiles...')
  gameStore.revealAllOpponentTiles()
})

document.getElementById('next-level')!.addEventListener('click', () => {
  console.log('Manually advancing to next level...')
  gameStore.progressToNextBoard()
})

document.getElementById('reset-game')!.addEventListener('click', () => {
  console.log('Resetting run...')
  gameStore.resetGame()
})

// End Turn button handler
endTurnBtn.addEventListener('click', () => {
  console.log('Ending turn manually...')
  gameStore.endTurn()
})

// Start New Run button handler
document.getElementById('start-new-run')!.addEventListener('click', () => {
  console.log('Starting new run...')
  gameStore.resetGame()
})

// Rewind widget button handlers
rewindProceedBtn.addEventListener('click', () => {
  console.log('Player chose to proceed with dangerous reveal')
  gameStore.proceedWithReveal()
})

rewindCancelBtn.addEventListener('click', () => {
  console.log('Player chose to use Rewind item')
  gameStore.proceedWithRewind()
})

// Shop widget button handlers
shopCloseBtn.addEventListener('click', () => {
  console.log('Closing shop')
  gameStore.closeShop()
})

// Discard widget button handlers
discardConfirmBtn.addEventListener('click', () => {
  console.log('Player confirmed item discard')
  gameStore.confirmDiscard()
})

discardCancelBtn.addEventListener('click', () => {
  console.log('Player cancelled item discard')
  gameStore.cancelDiscard()
})

// General click handler to clear highlights when clicking outside clue areas
document.addEventListener('click', (event) => {
  const target = event.target as Element
  // Don't clear if clicking on clue tiles or the canvas (canvas has its own handler)
  if (!target.closest('.clue-tile') && !target.closest('#game-board')) {
    currentHoverTiles = null
    persistentHoverTiles = null
    renderer.clearAllHighlights()
    render()
  }
})

// Subscribe to store changes
gameStore.subscribe(() => {
  // Clear highlights when board changes (new level)
  const state = gameStore.getState()
  if (state.run.currentLevel !== (window as any).lastLevel) {
    currentHoverTiles = null
    persistentHoverTiles = null
    renderer.clearAllHighlights()
    ;(window as any).lastLevel = state.run.currentLevel
  }
  render()
})

// Initial render
render()

// Debug: log initial board state
const initialState = gameStore.getState()
console.log('Initial board state:')
console.log('Board dimensions:', initialState.board.width, 'x', initialState.board.height)
console.log('Player tiles total:', initialState.board.playerTilesTotal)
console.log('Opponent tiles total:', initialState.board.opponentTilesTotal)
console.log('First few tiles:', initialState.board.tiles[0].slice(0, 3))

console.log('Game initialized - board rendered!')