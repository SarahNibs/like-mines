import { Board, TileOwner, TileContent } from './types'
import { getTilesByOwner } from './types'

export interface AIOpponent {
  name: string
  takeTurn(board: Board): { x: number; y: number } | null
  resetForNewBoard(): void
}

// Simple AI that reveals random own tiles
export class DumbAI implements AIOpponent {
  name = 'Random AI'
  private isFirstTurn = true

  takeTurn(board: Board): { x: number; y: number } | null {
    // Get all unrevealed opponent tiles
    const opponentTiles = getTilesByOwner(board, TileOwner.Opponent)
    let unrevealedOpponentTiles = opponentTiles.filter(tile => !tile.revealed)
    
    if (unrevealedOpponentTiles.length === 0) {
      return null // No moves available
    }
    
    // On first turn, avoid revealing upgrades and shops to prevent crippling the AI
    if (this.isFirstTurn) {
      const safeOpponentTiles = unrevealedOpponentTiles.filter(tile => 
        tile.content !== TileContent.PermanentUpgrade && 
        tile.content !== TileContent.Item || 
        (tile.content === TileContent.Item && tile.itemData?.id !== 'shop')
      )
      
      // If we have safe tiles, use them; otherwise fall back to any tile
      if (safeOpponentTiles.length > 0) {
        unrevealedOpponentTiles = safeOpponentTiles
        console.log(`AI first turn: avoiding ${opponentTiles.filter(tile => !tile.revealed).length - safeOpponentTiles.length} upgrades/shops`)
      }
      
      this.isFirstTurn = false
    }
    
    // Pick a random unrevealed opponent tile
    const randomIndex = Math.floor(Math.random() * unrevealedOpponentTiles.length)
    const chosenTile = unrevealedOpponentTiles[randomIndex]
    
    console.log(`AI choosing tile at (${chosenTile.x}, ${chosenTile.y})`)
    
    return { x: chosenTile.x, y: chosenTile.y }
  }
  
  resetForNewBoard(): void {
    this.isFirstTurn = true
  }
}