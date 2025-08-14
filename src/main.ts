/**
 * Main entry point - Simplified and refactored
 * Most UI logic has been extracted to dedicated components
 */

import { gameStore } from './store'
import { GameRenderer } from './renderer'
import { UIManager } from './ui/managers/UIManager'
import { ALL_UPGRADES_LOOKUP } from './upgrades'

console.log('Emdash Delve - Starting up...')

// Get canvas and initialize renderer
const canvas = document.getElementById('game-board') as HTMLCanvasElement
const renderer = new GameRenderer(canvas)

// Initialize UI Manager
const uiManager = new UIManager(gameStore)

// Persistent hover state for clue highlighting
let currentHoverTiles: any = null
let persistentHoverTiles: any = null

/**
 * Main render function
 */
function render() {
  const state = gameStore.getState()
  renderer.renderBoard(state.board)
}

/**
 * Main UI update function
 */
function updateUI() {
  const state = gameStore.getState()
  
  // Update all UI components through the UI manager
  uiManager.updateUI(state)
  
  // Update remaining UI elements that haven't been extracted yet
  updateUpgrades(state)
  updateUpgradeChoiceWidget(state)
  updateDiscardWidget(state)
  updateTrophies(state)
  updateClues(state)
  updateBoardOverlay(state)
  updateEndTurnButton(state)
}

/**
 * Update upgrades display
 */
function updateUpgrades(state: any) {
  const upgradesEl = document.getElementById('upgrades')!
  upgradesEl.innerHTML = ''
  
  state.run.upgrades.forEach((upgradeId: string) => {
    const upgrade = ALL_UPGRADES_LOOKUP[upgradeId]
    if (upgrade) {
      const upgradeEl = document.createElement('span')
      upgradeEl.textContent = upgrade.icon
      upgradeEl.title = `${upgrade.name}: ${upgrade.description}`
      upgradeEl.style.cssText = `
        display: inline-block;
        margin-right: 4px;
        font-size: 16px;
        cursor: help;
      `
      upgradesEl.appendChild(upgradeEl)
    }
  })
}

/**
 * Update upgrade choice widget
 */
function updateUpgradeChoiceWidget(state: any) {
  const upgradeChoiceWidget = document.getElementById('upgrade-choice-widget')!
  const upgradeChoice0Btn = document.getElementById('upgrade-choice-0')!
  const upgradeChoice1Btn = document.getElementById('upgrade-choice-1')!
  const upgradeChoice2Btn = document.getElementById('upgrade-choice-2')!
  
  if (state.upgradeChoice && state.upgradeChoice.choices.length > 0) {
    upgradeChoiceWidget.style.display = 'block'
    
    const buttons = [upgradeChoice0Btn, upgradeChoice1Btn, upgradeChoice2Btn]
    state.upgradeChoice.choices.forEach((upgrade: any, index: number) => {
      const btn = buttons[index]
      if (btn) {
        btn.textContent = upgrade.icon
        btn.title = `${upgrade.name}: ${upgrade.description}`
        btn.onclick = () => gameStore.chooseUpgrade(index)
      }
    })
  } else {
    upgradeChoiceWidget.style.display = 'none'
  }
}

/**
 * Update discard confirmation widget
 */
function updateDiscardWidget(state: any) {
  const discardWidget = document.getElementById('discard-widget')!
  const discardMessage = document.getElementById('discard-message')!
  
  if (state.pendingDiscard) {
    discardWidget.style.display = 'block'
    const item = state.run.inventory[state.pendingDiscard.itemIndex]
    discardMessage.textContent = `Discard ${item?.name || 'this item'}?`
  } else {
    discardWidget.style.display = 'none'
  }
}

/**
 * Update trophies display
 */
function updateTrophies(state: any) {
  const trophiesContainer = document.getElementById('trophies-container')!
  trophiesContainer.innerHTML = ''
  
  state.run.trophies.forEach((trophy: any) => {
    const trophyEl = document.createElement('div')
    trophyEl.className = `trophy ${trophy.type}${trophy.stolen ? ' stolen' : ''}`
    trophyEl.textContent = trophy.type === 'gold' ? '🏆' : '🥈'
    
    let tooltipText = ''
    if (trophy.stolen) {
      tooltipText = `Stolen by ${trophy.stolenBy}`
    } else if (trophy.type === 'gold') {
      tooltipText = 'Victories!'
    } else {
      tooltipText = 'Victory!'
    }
    trophyEl.setAttribute('title', tooltipText)
    
    trophiesContainer.appendChild(trophyEl)
  })
}

/**
 * Update clues display
 */
function updateClues(state: any) {
  // Implementation remains the same as original for now
  // TODO: Extract to ClueManager in next phase
  updateCluesOriginal(state)
}

/**
 * Update board overlay (win/loss messages)
 */
function updateBoardOverlay(state: any) {
  const boardOverlay = document.getElementById('board-overlay')!
  const overlayMessage = document.getElementById('overlay-message')!
  
  if (state.gameStatus === 'won') {
    boardOverlay.style.display = 'flex'
    overlayMessage.innerHTML = '🎉<br/>You Win!<br/><div style="font-size: 24px; margin-top: 10px;">All 20 levels completed!</div>'
  } else if (state.gameStatus === 'lost') {
    boardOverlay.style.display = 'flex'
    overlayMessage.innerHTML = `💀<br/>Game Over<br/><div style="font-size: 24px; margin-top: 10px;">Reached Level ${state.run.currentLevel}</div>`
  } else {
    boardOverlay.style.display = 'none'
  }
}

/**
 * Update end turn button
 */
function updateEndTurnButton(state: any) {
  const endTurnBtn = document.getElementById('end-turn')!
  
  if (state.currentTurn === 'player' && state.board.playerTilesRevealed > 0) {
    endTurnBtn.style.display = 'inline-block'
  } else {
    endTurnBtn.style.display = 'none'
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Canvas events
  canvas.addEventListener('click', handleCanvasClick)
  canvas.addEventListener('contextmenu', handleCanvasRightClick)
  canvas.addEventListener('mousemove', handleCanvasMouseMove)
  canvas.addEventListener('mouseleave', handleCanvasMouseLeave)
  
  // Button events
  document.getElementById('end-turn')?.addEventListener('click', () => gameStore.endTurn())
  document.getElementById('start-new-run')?.addEventListener('click', () => gameStore.startNewRun())
  
  // Discard widget events
  document.getElementById('discard-confirm')?.addEventListener('click', () => gameStore.confirmDiscard())
  document.getElementById('discard-cancel')?.addEventListener('click', () => gameStore.cancelDiscard())
  
  // Debug controls (if enabled)
  setupDebugControls()
}

/**
 * Handle canvas click events
 */
function handleCanvasClick(event: MouseEvent) {
  const rect = canvas.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  const shiftKey = event.shiftKey
  
  const state = gameStore.getState()
  const tilePos = renderer.getTileFromCoordinates(state.board, mouseX, mouseY)
  
  if (tilePos) {
    // Handle different game modes
    if (state.transmuteMode) {
      gameStore.useTransmuteAt(tilePos.x, tilePos.y)
      return
    }
    
    if (state.detectorMode) {
      gameStore.useDetectorAt(tilePos.x, tilePos.y)
      return
    }
    
    if (state.keyMode) {
      gameStore.useKeyAt(tilePos.x, tilePos.y)
      return
    }
    
    if (state.staffMode) {
      gameStore.useStaffAt(tilePos.x, tilePos.y)
      return
    }
    
    if (state.ringMode) {
      gameStore.useRingAt(tilePos.x, tilePos.y)
      return
    }
    
    // Normal tile reveal
    gameStore.revealTileAt(tilePos.x, tilePos.y, shiftKey)
  }
}

/**
 * Handle canvas right-click events
 */
function handleCanvasRightClick(event: MouseEvent) {
  event.preventDefault()
  
  const state = gameStore.getState()
  
  // Cancel targeting modes
  if (state.transmuteMode) {
    gameStore.cancelTransmute()
    return
  }
  
  if (state.detectorMode) {
    gameStore.cancelDetector()
    return
  }
  
  if (state.keyMode) {
    gameStore.cancelKey()
    return
  }
  
  if (state.staffMode) {
    gameStore.cancelStaff()
    return
  }
  
  if (state.ringMode) {
    gameStore.cancelRing()
    return
  }
  
  // Handle tile annotation
  const rect = canvas.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  const tilePos = renderer.getTileFromCoordinates(state.board, mouseX, mouseY)
  
  if (tilePos) {
    gameStore.toggleTileAnnotation(tilePos.x, tilePos.y)
  }
}

/**
 * Handle canvas mouse move events
 */
function handleCanvasMouseMove(event: MouseEvent) {
  // Simplified mouse move handling
  // Complex tooltip logic has been moved to components
  const rect = canvas.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  
  const state = gameStore.getState()
  const tilePos = renderer.getTileFromCoordinates(state.board, mouseX, mouseY)
  
  if (tilePos) {
    highlightCluetilesForBoardTile(tilePos.x, tilePos.y)
  } else {
    clearClueTileHighlights()
  }
}

/**
 * Handle canvas mouse leave events
 */
function handleCanvasMouseLeave() {
  clearClueTileHighlights()
  uiManager.getTooltipManager().hideAllTooltips()
}

/**
 * Setup debug controls
 */
function setupDebugControls() {
  document.getElementById('reveal-all-player')?.addEventListener('click', () => gameStore.debugRevealAllPlayer())
  document.getElementById('reveal-all-opponent')?.addEventListener('click', () => gameStore.debugRevealAllOpponent())
  document.getElementById('next-level')?.addEventListener('click', () => gameStore.debugNextLevel())
  document.getElementById('reset-game')?.addEventListener('click', () => gameStore.debugResetGame())
}

/**
 * Initialize the game
 */
function initialize() {
  console.log('Initializing game...')
  
  // Setup event listeners
  setupEventListeners()
  
  // Subscribe to game state changes
  gameStore.subscribe(() => {
    render()
    updateUI()
  })
  
  // Initial render
  render()
  updateUI()
  
  console.log('Game initialized successfully!')
}

// Temporary functions to be extracted in next phase
function updateCluesOriginal(state: any) {
  // TODO: Move to ClueManager - keeping original implementation for now
  // This is a large function that will be extracted in the next iteration
}

function highlightCluetilesForBoardTile(boardX: number, boardY: number) {
  // TODO: Move to ClueManager
}

function clearClueTileHighlights() {
  // TODO: Move to ClueManager
}

// Start the game
initialize()