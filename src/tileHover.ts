/**
 * Tile hover detection utilities for mouse interactions
 */

// Check if mouse is over a tile with item/upgrade/monster content (specifically over the icon area)
export function isMouseOverTileContent(mouseX: number, mouseY: number, tile: any, tileSize: number, startX: number, startY: number, gap: number): boolean {
  if (!tile.itemData && !tile.upgradeData && !tile.monsterData) return false
  if (tile.revealed) return false // Don't show hover on revealed tiles
  
  // Calculate tile position
  const x = startX + tile.x * (tileSize + gap)
  const y = startY + tile.y * (tileSize + gap)
  
  // Icon is positioned at x + tileSize * 0.25, y + tileSize * 0.25 with font size tileSize * 0.4
  // Create a hover area around the icon position (roughly icon size)
  const iconX = x + tileSize * 0.25
  const iconY = y + tileSize * 0.25
  const iconSize = tileSize * 0.4
  const iconHalfSize = iconSize * 0.5
  
  // Check if mouse is within the icon area (centered around icon position)
  return mouseX >= iconX - iconHalfSize && mouseX <= iconX + iconHalfSize && 
         mouseY >= iconY - iconHalfSize && mouseY <= iconY + iconHalfSize
}

// Check if mouse is over detector scan area for a tile
export function isMouseOverDetectorScan(mouseX: number, mouseY: number, tile: any, tileSize: number, startX: number, startY: number, gap: number): boolean {
  if (!tile.detectorScan) return false
  
  // Calculate tile position
  const x = startX + tile.x * (tileSize + gap)
  const y = startY + tile.y * (tileSize + gap)
  
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

// Check if mouse is over chain indicator
export function isMouseOverChainIndicator(mouseX: number, mouseY: number, tile: any, tileSize: number, startX: number, startY: number, gap: number, board: any): boolean {
  if (!tile.chainData || tile.revealed) return false
  
  // Check if the required tile is revealed - if so, chain is no longer active
  const requiredTile = board.tiles[tile.chainData.requiredTileY][tile.chainData.requiredTileX]
  if (requiredTile.revealed) return false
  
  const x = startX + tile.x * (tileSize + gap)
  const y = startY + tile.y * (tileSize + gap)
  const chainData = tile.chainData
  
  if (chainData.isBlocked) {
    // Check if hovering over the lock icon in center
    const centerX = x + tileSize / 2
    const centerY = y + tileSize / 2
    const radius = tileSize * 0.15
    const distance = Math.sqrt((mouseX - centerX) * (mouseX - centerX) + (mouseY - centerY) * (mouseY - centerY))
    return distance <= radius * 1.5 // Slightly larger hover area
  } else {
    // Check if hovering over the key icon on the edge
    const dx = chainData.requiredTileX - tile.x
    const dy = chainData.requiredTileY - tile.y
    const keyRadius = tileSize * 0.12
    const centerX = x + tileSize / 2
    const centerY = y + tileSize / 2
    
    let keyX: number, keyY: number
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal positioning
      if (dx > 0) {
        keyX = x + tileSize - keyRadius * 1.2
        keyY = centerY
      } else {
        keyX = x + keyRadius * 1.2
        keyY = centerY
      }
    } else {
      // Vertical positioning
      if (dy > 0) {
        keyX = centerX
        keyY = y + tileSize - keyRadius * 1.2
      } else {
        keyX = centerX
        keyY = y + keyRadius * 1.2
      }
    }
    
    const distance = Math.sqrt((mouseX - keyX) * (mouseX - keyX) + (mouseY - keyY) * (mouseY - keyY))
    return distance <= keyRadius * 1.5 // Slightly larger hover area
  }
}