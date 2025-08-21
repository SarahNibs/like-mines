/**
 * Clues display functionality for showing tile hands
 */

import { getTileDisplayColor } from './clueHighlighting'
import { setHoverTiles, updateHoverHighlights } from './hoverHighlights'

// Track scroll position to preserve it across updates
let savedClueScrollTop = 0

// Add annotation to clue tile element based on annotation type
function addAnnotationToClueElement(tileEl: HTMLElement, annotationType: string) {
  if (annotationType === 'none') {
    return // No annotation to add
  }

  switch (annotationType) {
    case 'slash':
      // Gray slash (bottom-left to top-right) - "not player's"
      const graySlash = createSlashElement('#999')
      tileEl.appendChild(graySlash)
      break

    case 'dog-ear':
      // Light green dog-ear - "player's"
      const greenDogEar = createDogEarElement('#90ee90')
      tileEl.appendChild(greenDogEar)
      break

    case 'opponent-slash':
      // Red slash (bottom-left to top-right) - "opponent's"
      const redSlash = createSlashElement('#ff6666')
      tileEl.appendChild(redSlash)
      break

    case 'neutral-slash':
      // Pure white slash (bottom-left to top-right) - "neutral"
      const whiteSlash = createSlashElement('#ffffff')
      tileEl.appendChild(whiteSlash)
      break

    case 'not-opponent-dog-ear':
      // Gray dog-ear - "not opponent's"
      const grayDogEar = createDogEarElement('#999999')
      tileEl.appendChild(grayDogEar)
      break
  }
}

// Create a slash element for annotations
function createSlashElement(color: string): HTMLElement {
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
  slashLine.style.background = color
  slashLine.style.transform = 'translateY(-50%) rotate(-45deg)' // Bottom-left to top-right
  slashLine.style.transformOrigin = 'center'
  
  slash.appendChild(slashLine)
  return slash
}

// Create a dog-ear element for annotations
function createDogEarElement(color: string): HTMLElement {
  const dogEar = document.createElement('div')
  dogEar.style.position = 'absolute'
  dogEar.style.top = '1px'
  dogEar.style.right = '1px'
  dogEar.style.width = '6px'
  dogEar.style.height = '6px'
  dogEar.style.backgroundColor = color
  dogEar.style.borderRadius = '0 0 0 50%'
  dogEar.style.pointerEvents = 'none'
  return dogEar
}

// Update clue display
export function updateClues(
  state: any,
  cluesStatusContent: HTMLElement,
  gameStore: any,
  renderer: any,
  renderFunction: () => void
) {
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
      const tileEl = createClueTileElement(
        tile, tileIndex, clueIndex, 'A', boardTile, clue, 
        gameStore, renderer, renderFunction
      )
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
      const tileEl = createClueTileElement(
        tile, tileIndex, clueIndex, 'B', boardTile, clue, 
        gameStore, renderer, renderFunction
      )
      handBGrid.appendChild(tileEl)
    })
    
    handsContainer.appendChild(handAGrid)
    handsContainer.appendChild(handBGrid)
    clueSection.appendChild(handsContainer)
    
    allCluesContainer.appendChild(clueSection)
  })
  
  // Clear existing content and add new clues
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

// Create a single clue tile element with all event handlers
function createClueTileElement(
  tile: any,
  tileIndex: number,
  clueIndex: number,
  hand: 'A' | 'B',
  boardTile: any,
  clue: any,
  gameStore: any,
  renderer: any,
  renderFunction: () => void
): HTMLElement {
  const tileEl = document.createElement('div')
  tileEl.className = 'clue-tile'
  tileEl.setAttribute('data-clue', clueIndex.toString())
  tileEl.setAttribute('data-hand', hand)
  tileEl.setAttribute('data-tile', tileIndex.toString())
  tileEl.style.width = '18px'
  tileEl.style.height = '18px'
  tileEl.style.background = getTileDisplayColor(boardTile)
  tileEl.style.border = '1px solid #999'
  tileEl.style.borderRadius = '1px'
  tileEl.style.cursor = 'pointer'
  tileEl.style.position = 'relative'
  
  // Show annotation if tile is annotated (matching board tile state)
  addAnnotationToClueElement(tileEl, boardTile.annotated)
  
  // Get the tiles for the hand this tile belongs to
  const handTiles = hand === 'A' ? clue.handA.tiles : clue.handB.tiles
  
  // Hover effects - highlight whole hand, with this tile extra highlighted
  tileEl.addEventListener('mouseenter', () => {
    console.log(`Mouse enter Hand ${hand} tile`, tile.x, tile.y)
    setHoverTiles({ tiles: handTiles, extraTiles: [tile] }, null)
    renderer.clearAllHighlights() // Clear any renderer persistent highlights 
    updateHoverHighlights(renderer) // Update highlights immediately
    renderFunction()
  })
  
  tileEl.addEventListener('mouseleave', () => {
    console.log(`Mouse leave Hand ${hand} tile`, tile.x, tile.y)
    // Move current hover to persistent, then clear current
    const currentHoverTiles = { tiles: handTiles, extraTiles: [tile] }
    setHoverTiles(null, { ...currentHoverTiles })
    updateHoverHighlights(renderer) // Update highlights immediately
    renderFunction()
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
    setHoverTiles(null, null)
    
    // Set persistent highlight first
    renderer.setPersistentHighlights(handTiles, [tile])
    
    // Try to reveal the tile (using normal method that respects turns)
    console.log('Attempting to reveal tile at', tile.x, tile.y)
    const success = gameStore.revealTileAt(tile.x, tile.y)
    console.log('Reveal success:', success)
    
    // Handle highlight clearing same as board clicks
    const newState = gameStore.getState()
    if (!success || newState.currentTurn !== 'player') {
      setHoverTiles(null, null)
      renderer.clearAllHighlights()
    }
    renderFunction()
  })
  
  // Right click to annotate
  tileEl.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    e.stopPropagation()
    gameStore.toggleAnnotation(tile.x, tile.y)
    renderFunction()
  })
  
  return tileEl
}