/**
 * Hover highlighting functionality for board tiles
 */

// Update hover highlights based on current hover state
export function updateHoverHighlights(
  currentHoverTiles: any,
  persistentHoverTiles: any,
  renderer: any
) {
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