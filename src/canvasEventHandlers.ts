/**
 * Canvas event handlers for mouse interactions
 */

// Import required functions (these should be passed as parameters in a real implementation)
import { isMouseOverDetectorScan, isMouseOverChainIndicator, isMouseOverTileContent } from './tileHover'
import { showDetectorTooltip, hideDetectorTooltip, showItemTooltip, hideItemTooltip } from './tooltips'
import { highlightCluetilesForBoardTile, clearClueTileHighlights } from './clueHighlighting'
import { setHoverTiles, getCurrentHoverTiles, getPersistentHoverTiles } from './hoverHighlights'

// Handle canvas click events (left click)
export function handleCanvasClick(
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  gameStore: any,
  renderer: any,
  renderFunction: () => void
) {
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
      setHoverTiles(null, null)
      renderer.clearAllHighlights()
      renderFunction()
    }
  } else {
    // Clicked outside any tile - clear all highlights
    setHoverTiles(null, null)
    renderer.clearAllHighlights()
    renderFunction()
  }
}

// Handle canvas right-click events (context menu)
export function handleCanvasRightClick(
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  gameStore: any,
  renderer: any
) {
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
}

// Handle canvas mouse move events for tooltips and highlights
export function handleCanvasMouseMove(
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  gameStore: any,
  renderer: any
) {
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
          const requiredTile = state.board.tiles[chainData.requiredTileY][chainData.requiredTileX]
          showItemTooltip(clientX, clientY, "🔒 Locked", `This tile is locked until you reveal the tile at (${chainData.requiredTileX}, ${chainData.requiredTileY})`)
        } else {
          showItemTooltip(clientX, clientY, "🗝️ Key", `This tile unlocks when you reveal the tile at (${chainData.requiredTileX}, ${chainData.requiredTileY})`)
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
}

// Handle canvas mouse leave events
export function handleCanvasMouseLeave() {
  clearClueTileHighlights()
  hideDetectorTooltip()
  hideItemTooltip()
}