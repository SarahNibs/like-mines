/**
 * Hover highlighting functionality for board tiles
 */

// Hover state management
let currentHoverTiles: any = null // {tiles: Tile[], extraTiles: Tile[]}
let persistentHoverTiles: any = null // Same structure but dimmer

// Set hover tiles state
export function setHoverTiles(current: any, persistent: any): void {
  currentHoverTiles = current
  persistentHoverTiles = persistent
}

// Get current hover tiles state
export function getCurrentHoverTiles(): any {
  return currentHoverTiles
}

// Get persistent hover tiles state  
export function getPersistentHoverTiles(): any {
  return persistentHoverTiles
}

// Update hover highlights on board based on current state
export function updateHoverHighlights(renderer: any): void {
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