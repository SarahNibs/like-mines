/**
 * Clue tile highlighting functionality for board interaction
 */

// Function to highlight clue tiles that correspond to a board tile
export function highlightCluetilesForBoardTile(boardX: number, boardY: number, gameState: any) {
  // Find all clue tiles that match this board position
  const matchingClueElements: HTMLElement[] = []
  
  gameState.clues.forEach((clue: any, clueIndex: number) => {
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

export function clearClueTileHighlights() {
  document.querySelectorAll('.board-hover-highlight').forEach(element => {
    element.classList.remove('board-hover-highlight')
  })
}

// Helper to get tile color for display
export function getTileDisplayColor(boardTile: any): string {
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