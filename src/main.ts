import './style.css'
import { gameStore } from './store'
import { GameRenderer } from './renderer'
import { showDetectorTooltip, hideDetectorTooltip, showItemTooltip, hideItemTooltip } from './tooltips'
import { updateTrophies } from './trophies'
import { isMouseOverTileContent, isMouseOverDetectorScan, isMouseOverChainIndicator } from './tileHover'
import { updateCharacterSelection } from './characterSelection'
import { highlightCluetilesForBoardTile, clearClueTileHighlights, getTileDisplayColor } from './clueHighlighting'
import { updateInventory } from './inventory'
import { updateUpgrades, updateUpgradeChoiceWidget, clearUpgradeStateCache } from './upgradeDisplay'
import { updateShopWidget, updateDiscardWidget } from './shopWidget'
import { updateHoverHighlights, setHoverTiles, getCurrentHoverTiles, getPersistentHoverTiles } from './hoverHighlights'
import { handleCanvasClick, handleCanvasRightClick } from './canvasEventHandlers'
import { setupButtonHandlers } from './buttonHandlers'
import { setupGlobalEventHandlers, setupStoreSubscription } from './globalEventHandlers'
import { updateClues as updateCluesDisplay } from './cluesDisplay'

console.log('Emdash Delve - Starting up...')

// Get canvas and initialize renderer
const canvas = document.getElementById('game-board') as HTMLCanvasElement
const renderer = new GameRenderer(canvas)

// Canvas is now fixed size - no need for dynamic resizing

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
const upgradesEl = document.getElementById('upgrades')!
const boardOverlay = document.getElementById('board-overlay')!
const overlayMessage = document.getElementById('overlay-message')!
// Rewind elements removed
const shopWidget = document.getElementById('shop-widget')!
const shopItemsEl = document.getElementById('shop-items')!
const shopCloseBtn = document.getElementById('shop-close')!
const discardWidget = document.getElementById('discard-widget')!
const discardMessage = document.getElementById('discard-message')!
const discardConfirmBtn = document.getElementById('discard-confirm')!
const discardCancelBtn = document.getElementById('discard-cancel')!
const upgradeChoiceWidget = document.getElementById('upgrade-choice-widget')!
const upgradeChoice0Btn = document.getElementById('upgrade-choice-0')!
const upgradeChoice1Btn = document.getElementById('upgrade-choice-1')!
const upgradeChoice2Btn = document.getElementById('upgrade-choice-2')!
const trophiesContainer = document.getElementById('trophies-container')!
const characterSelectOverlay = document.getElementById('character-select-overlay')!
const characterChoicesEl = document.getElementById('character-choices')!


// Update UI with current game state
function updateUI() {
  const state = gameStore.getState()
  const board = state.board
  
  // Update run progress
  levelInfoEl.textContent = `Level ${state.run.currentLevel} / ${state.run.maxLevel}`
  // Calculate resting bonus for HP line display
  const restingCount = state.run.upgrades.filter(id => id === 'resting').length
  let restingStatValue = 0
  if (restingCount > 0) {
    // For Cleric: Each resting upgrade grants +3 to resting stat
    // For others: Each resting upgrade grants +2 to resting stat
    const baseRestingPerUpgrade = state.run.character?.id === 'cleric' ? 3 : 2
    restingStatValue = restingCount * baseRestingPerUpgrade
  }
  const restingBonus = restingStatValue > 0 ? ` | Resting: +${restingStatValue}` : ''
  hpInfoEl.textContent = `HP: ${state.run.hp} / ${state.run.maxHp}${restingBonus}`
  goldInfoEl.textContent = `Gold: ${state.run.gold} | Loot: +${state.run.loot}`
  // Calculate effective stats including temporary buffs
  const effectiveAttack = state.run.attack + (state.run.temporaryBuffs.blaze || 0)
  const effectiveDefense = state.run.defense + (state.run.temporaryBuffs.ward || 0)
  
  // Show temporary buffs in the display
  const attackDisplay = state.run.temporaryBuffs.blaze ? 
    `${state.run.attack}+${state.run.temporaryBuffs.blaze}` : 
    state.run.attack.toString()
  const defenseDisplay = state.run.temporaryBuffs.ward ? 
    `${state.run.defense}+${state.run.temporaryBuffs.ward}` : 
    state.run.defense.toString()
  
  // Add mana display for characters with mana
  const manaDisplay = state.run.maxMana > 0 ? ` | Mana: ${state.run.mana}/${state.run.maxMana}` : ''
  
  statsInfoEl.textContent = `Attack: ${attackDisplay} | Defense: ${defenseDisplay}${manaDisplay}`
  
  // Update board border based on active modes
  canvas.className = '' // Reset all classes
  const hasProtection = state.run.temporaryBuffs.protection && state.run.temporaryBuffs.protection > 0
  
  if (hasProtection) {
    canvas.classList.add('protection-mode')
    canvas.title = 'Protection Active: Next reveal won\'t end your turn'
  } else if (state.detectorMode) {
    canvas.classList.add('detector-mode')
    canvas.title = 'Detector Mode: Click any tile to scan adjacent tiles'
  } else if (state.transmuteMode) {
    canvas.classList.add('transmute-mode')
    canvas.title = 'Transmute Mode: Click any tile to convert it to yours'
  } else if (state.keyMode) {
    canvas.classList.add('key-mode')
    canvas.title = 'Key Mode: Click any locked tile to unlock it'
  } else if (state.staffMode) {
    canvas.classList.add('staff-mode')
    canvas.title = 'Staff Mode: Click any monster to attack it'
  } else if (state.ringMode) {
    canvas.classList.add('ring-mode')
    canvas.title = 'Ring Mode: Click any fogged tile to remove fog'
  } else if (state.spellTargetMode) {
    canvas.classList.add('spell-target-mode')
    const spellName = state.spellTargetData?.spell?.name || 'Unknown Spell'
    canvas.title = `Spell Targeting: Click to cast ${spellName}`
  } else {
    canvas.title = ''
  }
  
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
    } else if (state.keyMode) {
      turnInfoEl.textContent = '🗝️ KEY MODE: Click locked tile to unlock'
      turnInfoEl.style.color = '#ffff00'
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
    
    // Calculate trophy summary
    const totalTrophiesEarned = state.run.trophies.length
    const stolenTrophies = state.run.trophies.filter(t => t.stolen).length
    const keptTrophies = totalTrophiesEarned - stolenTrophies
    
    let summaryText = `🏆 Victory!\n\nYou gained ${totalTrophiesEarned} trophies!`
    if (stolenTrophies > 0) {
      summaryText += ` (And kept ${keptTrophies} of them)`
    }
    
    overlayMessage.innerHTML = summaryText.replace(/\n/g, '<br>')
    boardOverlay.style.display = 'flex'
  } else if (state.gameStatus === 'player-died') {
    winStatusEl.textContent = '💀 You Died!'
    winStatusEl.style.color = '#7c4a4a'
    // Show overlay message
    overlayMessage.textContent = '💀 You Died!'
    boardOverlay.style.display = 'flex'
  } else if (state.boardStatus === 'won') {
    winStatusEl.textContent = '🎉 Advancing...'
    winStatusEl.style.color = '#4a7c59'
    
    // Calculate trophies earned for overlay message
    const opponentTilesLeft = state.board.opponentTilesTotal - state.board.opponentTilesRevealed
    const trophiesEarned = Math.max(0, opponentTilesLeft - 1)
    
    let overlayText = ''
    if (trophiesEarned === 0) {
      overlayText = '🎉 Whew!'
    } else {
      overlayText = '🎉 Board Cleared!\n' + '🏆'.repeat(trophiesEarned)
    }
    
    overlayMessage.innerHTML = overlayText.replace('\n', '<br>')
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
  
  // Update tile counts with character info
  if (state.run.characterId) {
    // Import character data to get icon and name
    import('./characters').then(({ ALL_CHARACTERS }) => {
      const character = ALL_CHARACTERS.find(c => c.id === state.run.characterId)
      if (character) {
        playerTilesEl.textContent = `${character.icon} ${character.name}: ${board.playerTilesRevealed}/${board.playerTilesTotal}`
      } else {
        playerTilesEl.textContent = `Player tiles: ${board.playerTilesRevealed}/${board.playerTilesTotal}`
      }
    })
  } else {
    playerTilesEl.textContent = `Player tiles: ${board.playerTilesRevealed}/${board.playerTilesTotal}`
  }
  opponentTilesEl.textContent = `AI tiles: ${board.opponentTilesRevealed}/${board.opponentTilesTotal}`
  
  // Show/hide End Turn button
  if (state.gameStatus === 'playing' && state.currentTurn === 'player' && state.boardStatus === 'in-progress') {
    endTurnBtn.style.display = 'block'
  } else {
    endTurnBtn.style.display = 'none'
  }
  
  // Update inventory
  updateInventory(state, inventoryEl, (index: number) => gameStore.useInventoryItem(index), (index: number) => gameStore.showDiscardConfirmation(index), (spellIndex: number) => gameStore.castSpell(spellIndex))
  
  // Update upgrades
  updateUpgrades(state, upgradesEl)
  
  // Rewind widget removed
  
  // Update shop widget
  updateShopWidget(state, shopWidget, shopItemsEl, shopCloseBtn, canvas, gameStore)
  
  // Update discard widget
  updateDiscardWidget(state, discardWidget, discardMessage)
  
  // Update upgrade choice widget
  updateUpgradeChoiceWidget(state, upgradeChoiceWidget, upgradeChoice0Btn, upgradeChoice1Btn, upgradeChoice2Btn)
  
  // Update character selection
  updateCharacterSelection(state, characterSelectOverlay, characterChoicesEl, (characterId: string) => gameStore.selectCharacter(characterId))
  
  // Update trophies
  updateTrophies(state, trophiesContainer)
  
  // Update clues only when necessary
  // Calculate annotation hash for hash detection (include both position and type)
  const annotationData = []
  for (let y = 0; y < state.board.height; y++) {
    for (let x = 0; x < state.board.width; x++) {
      const tile = state.board.tiles[y][x]
      if (tile.annotated !== 'none') {
        annotationData.push(`${x},${y}:${tile.annotated}`)
      }
    }
  }
  
  // Collect revealed tile positions for clue UI updates
  const revealedTileData = []
  for (let y = 0; y < state.board.height; y++) {
    for (let x = 0; x < state.board.width; x++) {
      const tile = state.board.tiles[y][x]
      if (tile.revealed) {
        revealedTileData.push(`${x},${y}`)
      }
    }
  }
  
  const currentCluesHash = JSON.stringify({
    cluesLength: state.clues.length,
    revealedCount: state.board.playerTilesRevealed + state.board.opponentTilesRevealed,
    revealedTiles: revealedTileData.join('|'), // Include specific revealed tile positions
    annotations: annotationData.join('|'),
    leftHandUpgrades: state.run.upgrades.filter(id => id === 'left-hand').length,
    rightHandUpgrades: state.run.upgrades.filter(id => id === 'right-hand').length,
    characterId: state.run.characterId || 'none'
  })
  
  
  if (window.lastCluesHash !== currentCluesHash) {
    console.log('Updating clues UI - hash changed')
    const cluesStatusContent = document.querySelector('#right-panel .status:last-child .status-content') as HTMLElement
    if (cluesStatusContent) {
      updateCluesDisplay(state, cluesStatusContent, gameStore, renderer, render)
    }
    window.lastCluesHash = currentCluesHash
  }
  
  // Always update hover highlights (independent of clue rebuilding)
  updateHoverHighlights(renderer)
}

// Clue scroll position preservation
let savedClueScrollTop = 0




// Rewind widget function removed






// Render game
function render() {
  const state = gameStore.getState()
  renderer.renderBoard(state.board)
  updateUI()
}


// Click handling
canvas.addEventListener('click', (event) => {
  handleCanvasClick(event, canvas, gameStore, renderer, render)
})

// Right-click handling for annotations and transmute cancel
canvas.addEventListener('contextmenu', (event) => {
  handleCanvasRightClick(event, canvas, gameStore, renderer)
})


// Mouse hover handling for board tiles to highlight corresponding clue tiles and show detector tooltips
canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  
  const state = gameStore.getState()
  const tilePos = renderer.getTileFromCoordinates(state.board, mouseX, mouseY)
  
  // Check for detector scan hover and item/upgrade content hover
  let detectorHover = false
  let itemHover = false
  
  if (tilePos) {
    const tile = state.board.tiles[tilePos.y][tilePos.x]
    
    // Skip all hover effects for fogged tiles except detector scans
    if (tile.fogged && !tile.revealed) {
      // Get actual renderer properties for detector check only
      const tileSize = renderer.getTileSize()
      const startX = renderer.getStartX()
      const startY = renderer.getStartY()
      const gap = renderer.getGap()
      
      // Only allow detector scan hover for fogged tiles
      if (isMouseOverDetectorScan(mouseX, mouseY, tile, tileSize, startX, startY, gap)) {
        const clientX = event.clientX
        const clientY = event.clientY
        showDetectorTooltip(clientX, clientY, tile.detectorScan.playerAdjacent, tile.detectorScan.opponentAdjacent, tile.detectorScan.neutralAdjacent)
        detectorHover = true
      }
    } else {
      // Normal hover handling for non-fogged tiles
      // Get actual renderer properties
      const tileSize = renderer.getTileSize()
      const startX = renderer.getStartX()
      const startY = renderer.getStartY()
      const gap = renderer.getGap()
      
      // Check detector scan first (takes priority)
      if (isMouseOverDetectorScan(mouseX, mouseY, tile, tileSize, startX, startY, gap)) {
        const clientX = event.clientX
        const clientY = event.clientY
        showDetectorTooltip(clientX, clientY, tile.detectorScan.playerAdjacent, tile.detectorScan.opponentAdjacent, tile.detectorScan.neutralAdjacent)
        detectorHover = true
      } else if (isMouseOverChainIndicator(mouseX, mouseY, tile, tileSize, startX, startY, gap, state.board)) {
        const clientX = event.clientX
        const clientY = event.clientY
        
        // Show chain tooltip
        const chainData = tile.chainData
        
        if (chainData.isBlocked) {
          const title = "🔒 Chained Tile"
          const description = "This tile is locked! Must reveal the connected tile first."
          showItemTooltip(clientX, clientY, title, description)
        } else {
          const title = "🔑 Chain Key"
          const description = "This tile unlocks a chained tile."
          showItemTooltip(clientX, clientY, title, description)
        }
        itemHover = true
      } else if (isMouseOverTileContent(mouseX, mouseY, tile, tileSize, startX, startY, gap)) {
        const clientX = event.clientX
        const clientY = event.clientY
        
        if (tile.itemData) {
          showItemTooltip(clientX, clientY, tile.itemData.name, tile.itemData.description)
          itemHover = true
        } else if (tile.upgradeData) {
          showItemTooltip(clientX, clientY, "⭐ Upgrade", "Gain a permanent benefit")
          itemHover = true
        } else if (tile.monsterData) {
          const monster = tile.monsterData
          const description = `Attack: ${monster.attack} | Defense: ${monster.defense} | HP: ${monster.hp}`
          showItemTooltip(clientX, clientY, monster.name, description)
          itemHover = true
        }
      }
    }
  }
  
  if (!detectorHover) {
    hideDetectorTooltip()
  }
  
  if (!itemHover) {
    hideItemTooltip()
  }
  
  if (tilePos) {
    highlightCluetilesForBoardTile(tilePos.x, tilePos.y, state)
  } else {
    clearClueTileHighlights()
  }
})

canvas.addEventListener('mouseleave', () => {
  clearClueTileHighlights()
  hideDetectorTooltip()
  hideItemTooltip()
})


// Set up all button event handlers
setupButtonHandlers(gameStore, clearUpgradeStateCache)

// Set up global event handlers and store subscription
setupGlobalEventHandlers(gameStore, clearUpgradeStateCache, renderer, render)
setupStoreSubscription(gameStore, clearUpgradeStateCache, renderer, render)

// Initial render
render()

// Debug: log initial board state
const initialState = gameStore.getState()
console.log('Initial board state:')
console.log('Board dimensions:', initialState.board.width, 'x', initialState.board.height)
console.log('Player tiles total:', initialState.board.playerTilesTotal)
console.log('Opponent tiles total:', initialState.board.opponentTilesTotal)
console.log('First few tiles:', initialState.board.tiles[0].slice(0, 3))


// Debug keyboard shortcuts are now handled in globalEventHandlers

console.log('Game initialized - board rendered!')