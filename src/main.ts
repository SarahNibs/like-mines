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
  const restingBonus = restingCount > 0 ? ` | Resting: +${restingCount * 3}` : ''
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
  
  statsInfoEl.textContent = `Attack: ${attackDisplay} | Defense: ${defenseDisplay}`
  
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
  updateInventory(state, inventoryEl, (index: number) => gameStore.useInventoryItem(index), (index: number) => gameStore.showDiscardConfirmation(index))
  
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
  
  const currentCluesHash = JSON.stringify({
    cluesLength: state.clues.length,
    revealedCount: state.board.playerTilesRevealed + state.board.opponentTilesRevealed,
    annotations: annotationData.join('|'),
    leftHandUpgrades: state.run.upgrades.filter(id => id === 'left-hand').length,
    rightHandUpgrades: state.run.upgrades.filter(id => id === 'right-hand').length,
    characterId: state.run.characterId || 'none'
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

// Clue scroll position preservation
let savedClueScrollTop = 0

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




// Rewind widget function removed





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
    clueSection.style.marginBottom = '4px' // Reduced from 10px
    // Removed separator line as requested
    clueSection.style.paddingBottom = '2px' // Reduced from 8px
    
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
      
      // Show annotation if tile is annotated (matching board tile state)
      if (boardTile.annotated === 'slash') {
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
      } else if (boardTile.annotated === 'dog-ear') {
        const dogEar = document.createElement('div')
        dogEar.style.position = 'absolute'
        dogEar.style.top = '2px'
        dogEar.style.right = '2px'
        dogEar.style.width = '16px'
        dogEar.style.height = '16px'
        dogEar.style.backgroundColor = '#90ee90'
        dogEar.style.borderRadius = '0 0 0 50%'
        dogEar.style.pointerEvents = 'none'
        
        tileEl.appendChild(dogEar)
      }
      
      // Hover effects - highlight whole hand, with this tile extra highlighted
      tileEl.addEventListener('mouseenter', () => {
        console.log('Mouse enter Hand A tile', tile.x, tile.y)
        currentHoverTiles = { tiles: clue.handA.tiles, extraTiles: [tile] }
        persistentHoverTiles = null // Clear any existing persistent highlights
        renderer.clearAllHighlights() // Clear any renderer persistent highlights 
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
      
      // Show annotation if tile is annotated (matching board tile state)
      if (boardTile.annotated === 'slash') {
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
      } else if (boardTile.annotated === 'dog-ear') {
        const dogEar = document.createElement('div')
        dogEar.style.position = 'absolute'
        dogEar.style.top = '2px'
        dogEar.style.right = '2px'
        dogEar.style.width = '16px'
        dogEar.style.height = '16px'
        dogEar.style.backgroundColor = '#90ee90'
        dogEar.style.borderRadius = '0 0 0 50%'
        dogEar.style.pointerEvents = 'none'
        
        tileEl.appendChild(dogEar)
      }
      
      // Hover effects - highlight whole hand, with this tile extra highlighted
      tileEl.addEventListener('mouseenter', () => {
        console.log('Mouse enter Hand B tile', tile.x, tile.y)
        currentHoverTiles = { tiles: clue.handB.tiles, extraTiles: [tile] }
        persistentHoverTiles = null // Clear any existing persistent highlights
        renderer.clearAllHighlights() // Clear any renderer persistent highlights
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
  const cluesStatusContent = document.querySelector('#right-panel .status:last-child .status-content')
  if (cluesStatusContent) {
    // Preserve scroll position before rebuilding
    const existingScrollContainer = cluesStatusContent.querySelector('div[style*="overflowY"]')
    if (existingScrollContainer) {
      savedClueScrollTop = existingScrollContainer.scrollTop
    }
    
    cluesStatusContent.innerHTML = ''
    cluesStatusContent.appendChild(allCluesContainer)
    
    // Restore scroll position after rebuilding
    allCluesContainer.scrollTop = savedClueScrollTop
    
    // Add scroll event listener to track future scroll changes
    allCluesContainer.addEventListener('scroll', () => {
      savedClueScrollTop = allCluesContainer.scrollTop
    })
    
    // Help text removed as requested
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
  const shiftKey = event.shiftKey
  
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
    
    // Check if we're in key mode
    if (state.keyMode) {
      console.log('Key mode: attempting to unlock tile at', tilePos.x, tilePos.y)
      const success = gameStore.useKeyAt(tilePos.x, tilePos.y)
      console.log('Key success:', success)
      return // Don't do normal tile reveal
    }
    
    // Check if we're in staff mode
    if (state.staffMode) {
      console.log('Staff mode: attempting to target monster at', tilePos.x, tilePos.y)
      const success = gameStore.useStaffAt(tilePos.x, tilePos.y)
      console.log('Staff success:', success)
      return // Don't do normal tile reveal
    }
    
    // Check if we're in ring mode
    if (state.ringMode) {
      console.log('Ring mode: attempting to remove fog at', tilePos.x, tilePos.y)
      const success = gameStore.useRingAt(tilePos.x, tilePos.y)
      console.log('Ring success:', success)
      return // Don't do normal tile reveal
    }
    
    console.log('Attempting to reveal tile at', tilePos.x, tilePos.y, shiftKey ? '(SHIFT bypass)' : '')
    const wasPlayerTurn = state.currentTurn === 'player'
    const success = gameStore.revealTileAt(tilePos.x, tilePos.y, shiftKey)
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
  
  // Right-click cancels key mode
  if (state.keyMode) {
    gameStore.cancelKey()
    return
  }
  
  // Right-click cancels staff or ring mode
  if (state.staffMode) {
    gameStore.cancelStaff()
    return
  }
  
  if (state.ringMode) {
    gameStore.cancelRing()
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
  clearUpgradeStateCache() // Clear upgrade state cache
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
  clearUpgradeStateCache() // Clear upgrade state cache
  gameStore.resetGame()
})

// Rewind widget handlers removed

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

// Upgrade choice widget button handlers
upgradeChoice0Btn.addEventListener('click', () => {
  console.log('Player chose upgrade option 0')
  gameStore.chooseUpgrade(0)
})

upgradeChoice1Btn.addEventListener('click', () => {
  console.log('Player chose upgrade option 1')
  gameStore.chooseUpgrade(1)
})

upgradeChoice2Btn.addEventListener('click', () => {
  console.log('Player chose upgrade option 2')
  gameStore.chooseUpgrade(2)
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
  
  // Force upgrade refresh on game status changes (like run reset)
  if (state.gameStatus !== (window as any).lastGameStatus) {
    clearUpgradeStateCache() // Clear upgrade cache to force refresh
    ;(window as any).lastGameStatus = state.gameStatus
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


// Debug controls toggle with 'd' key
document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'd') {
    const debugControls = document.getElementById('debug-controls')
    if (debugControls) {
      const isVisible = debugControls.style.display !== 'none'
      debugControls.style.display = isVisible ? 'none' : 'block'
      console.log(`Debug controls ${isVisible ? 'hidden' : 'shown'}`)
    }
  }
})

console.log('Game initialized - board rendered!')