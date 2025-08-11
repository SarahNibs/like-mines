import { Board, Tile, TileOwner, TileContent } from './types'
import { countAdjacentTiles } from './gameLogic'

export class GameRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private tileSize: number = 60
  private padding: number = 20
  private gap: number = 2 // Gap between tiles
  private highlightedTiles: Set<string> = new Set() // x,y coordinates
  private extraHighlightedTiles: Set<string> = new Set() // x,y coordinates for extra highlighting
  private persistentHighlightedTiles: Set<string> = new Set() // Persistent click highlights
  private persistentExtraHighlightedTiles: Set<string> = new Set() // Persistent extra highlights
  private dimmedHighlights: boolean = false // Whether to use dimmed highlighting

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  // Highlight tiles (for clue hover effects)
  setHighlightedTiles(tiles: Tile[]): void {
    this.highlightedTiles.clear()
    tiles.forEach(tile => {
      this.highlightedTiles.add(`${tile.x},${tile.y}`)
    })
    this.dimmedHighlights = false // Normal bright highlights
  }

  // Set extra highlighted tiles (brighter highlight)
  setExtraHighlighted(tiles: Tile[]): void {
    this.extraHighlightedTiles.clear()
    tiles.forEach(tile => {
      this.extraHighlightedTiles.add(`${tile.x},${tile.y}`)
    })
    this.dimmedHighlights = false // Normal bright highlights
  }

  // Set persistent highlights (from clicking)
  setPersistentHighlights(tiles: Tile[], extraTiles: Tile[] = []): void {
    this.persistentHighlightedTiles.clear()
    this.persistentExtraHighlightedTiles.clear()
    
    tiles.forEach(tile => {
      this.persistentHighlightedTiles.add(`${tile.x},${tile.y}`)
    })
    
    extraTiles.forEach(tile => {
      this.persistentExtraHighlightedTiles.add(`${tile.x},${tile.y}`)
    })
  }

  clearHighlights(): void {
    this.highlightedTiles.clear()
    this.extraHighlightedTiles.clear()
    this.dimmedHighlights = false
  }

  clearAllHighlights(): void {
    this.highlightedTiles.clear()
    this.extraHighlightedTiles.clear()
    this.persistentHighlightedTiles.clear()
    this.persistentExtraHighlightedTiles.clear()
    this.dimmedHighlights = false
  }

  // Set dimmed highlighting (for persistent hover)
  setDimmedHighlights(tiles: Tile[], extraTiles: Tile[] = []): void {
    this.highlightedTiles.clear()
    this.extraHighlightedTiles.clear()
    
    tiles.forEach(tile => {
      this.highlightedTiles.add(`${tile.x},${tile.y}`)
    })
    
    extraTiles.forEach(tile => {
      this.extraHighlightedTiles.add(`${tile.x},${tile.y}`)
    })
    
    this.dimmedHighlights = true
  }

  // Draw texture pattern for tile type differentiation
  private drawTileTexture(x: number, y: number, tileType: TileOwner): void {
    const ctx = this.ctx
    ctx.save()
    
    // Clip to tile boundaries to prevent texture from going outside
    ctx.beginPath()
    ctx.rect(x, y, this.tileSize, this.tileSize)
    ctx.clip()
    
    // Set up pattern styles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    
    switch (tileType) {
      case TileOwner.Player:
        // Diagonal lines pattern (bottom-left to top-right)
        for (let i = -this.tileSize; i < this.tileSize * 2; i += 8) {
          ctx.beginPath()
          ctx.moveTo(x + i, y + this.tileSize)
          ctx.lineTo(x + i + this.tileSize, y)
          ctx.stroke()
        }
        break
        
      case TileOwner.Opponent:
        // Cross-hatch pattern
        for (let i = 0; i < this.tileSize; i += 6) {
          ctx.beginPath()
          ctx.moveTo(x + i, y)
          ctx.lineTo(x + i, y + this.tileSize)
          ctx.stroke()
          
          ctx.beginPath()
          ctx.moveTo(x, y + i)
          ctx.lineTo(x + this.tileSize, y + i)
          ctx.stroke()
        }
        break
        
      case TileOwner.Neutral:
        // Dots pattern
        for (let i = 4; i < this.tileSize; i += 8) {
          for (let j = 4; j < this.tileSize; j += 8) {
            ctx.beginPath()
            ctx.arc(x + i, y + j, 1, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        break
    }
    
    ctx.restore()
  }

  // Calculate tile size based on board dimensions and canvas size
  calculateTileSize(board: Board): void {
    const availableWidth = this.canvas.width - this.padding * 2
    const availableHeight = this.canvas.height - this.padding * 2
    
    // Account for gaps between tiles
    const totalGapWidth = (board.width - 1) * this.gap
    const totalGapHeight = (board.height - 1) * this.gap
    
    const tileWidthMax = Math.floor((availableWidth - totalGapWidth) / board.width)
    const tileHeightMax = Math.floor((availableHeight - totalGapHeight) / board.height)
    
    this.tileSize = Math.min(tileWidthMax, tileHeightMax, 70) // Max 70px tiles
  }

  // Getter methods for renderer properties (for tooltip positioning)
  getTileSize(): number {
    return this.tileSize
  }

  getPadding(): number {
    return this.padding
  }

  getGap(): number {
    return this.gap
  }

  // Get tile position from mouse coordinates
  getTileFromCoordinates(board: Board, mouseX: number, mouseY: number): { x: number; y: number } | null {
    const startX = this.padding
    const startY = this.padding
    
    // Account for gaps when calculating tile position
    for (let x = 0; x < board.width; x++) {
      for (let y = 0; y < board.height; y++) {
        const tileX = startX + x * (this.tileSize + this.gap)
        const tileY = startY + y * (this.tileSize + this.gap)
        
        if (mouseX >= tileX && mouseX < tileX + this.tileSize &&
            mouseY >= tileY && mouseY < tileY + this.tileSize) {
          return { x, y }
        }
      }
    }
    
    return null
  }

  // Get colors for different tile states
  private getTileColors(tile: Tile): { bg: string; border: string; text: string } {
    if (!tile.revealed) {
      // Unrevealed tiles
      return {
        bg: '#555',
        border: '#777',
        text: '#ccc'
      }
    }

    // Revealed tiles - color by owner (more vibrant colors)
    switch (tile.owner) {
      case TileOwner.Player:
        return {
          bg: '#4CAF50', // More vibrant green for player
          border: '#66BB6A',
          text: '#fff'
        }
      case TileOwner.Opponent:
        return {
          bg: '#F44336', // More vibrant red for opponent
          border: '#EF5350', 
          text: '#fff'
        }
      case TileOwner.Neutral:
        return {
          bg: '#9E9E9E', // Lighter gray for neutral
          border: '#BDBDBD',
          text: '#000'
        }
      case TileOwner.Wall:
        return {
          bg: '#333',
          border: '#111',
          text: '#666'
        }
    }
  }

  // Render a single tile
  private renderTile(tile: Tile, board: Board): void {
    const x = this.padding + tile.x * (this.tileSize + this.gap)
    const y = this.padding + tile.y * (this.tileSize + this.gap)
    
    const colors = this.getTileColors(tile)
    const isHighlighted = this.highlightedTiles.has(`${tile.x},${tile.y}`) || this.persistentHighlightedTiles.has(`${tile.x},${tile.y}`)
    const isExtraHighlighted = this.extraHighlightedTiles.has(`${tile.x},${tile.y}`) || this.persistentExtraHighlightedTiles.has(`${tile.x},${tile.y}`)
    
    // Draw tile background
    this.ctx.fillStyle = colors.bg
    this.ctx.fillRect(x, y, this.tileSize, this.tileSize)
    
    // Draw texture pattern for revealed tiles
    if (tile.revealed) {
      this.drawTileTexture(x, y, tile.owner)
    }
    
    // Draw highlights as overlay (preserving background color)
    if (isHighlighted) {
      const opacity = this.dimmedHighlights ? 0.1 : 0.2 // Dimmer for persistent
      this.ctx.fillStyle = `rgba(255, 165, 0, ${opacity})`
      this.ctx.fillRect(x, y, this.tileSize, this.tileSize)
    }
    
    if (isExtraHighlighted) {
      const opacity = this.dimmedHighlights ? 0.2 : 0.4 // Dimmer for persistent
      this.ctx.fillStyle = `rgba(255, 165, 0, ${opacity})`
      this.ctx.fillRect(x, y, this.tileSize, this.tileSize)
    }
    
    // Draw tile border
    let borderColor = colors.border
    let borderWidth = 2
    
    if (isExtraHighlighted) {
      borderColor = this.dimmedHighlights ? '#cc8400' : '#ffa500'
      borderWidth = this.dimmedHighlights ? 3 : 4
    } else if (isHighlighted) {
      borderColor = this.dimmedHighlights ? '#cc8400' : '#ffa500'
      borderWidth = this.dimmedHighlights ? 2 : 3
    }
    
    this.ctx.strokeStyle = borderColor
    this.ctx.lineWidth = borderWidth
    this.ctx.strokeRect(x, y, this.tileSize, this.tileSize)
    
    // Draw tile content/label
    this.ctx.fillStyle = colors.text
    this.ctx.font = `${Math.floor(this.tileSize * 0.25)}px Courier New`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    
    const centerX = x + this.tileSize / 2
    const centerY = y + this.tileSize / 2
    
    if (tile.revealed) {
      // Show adjacency count based on who revealed the tile
      const revealerType = tile.revealedBy || TileOwner.Player
      const adjacentCount = countAdjacentTiles(board, tile.x, tile.y, revealerType)
      
      // Draw colored box for the count
      const boxSize = Math.floor(this.tileSize * 0.45)
      const boxX = centerX - boxSize / 2
      const boxY = centerY - boxSize / 2
      
      // Box color matches who revealed the tile
      let boxColor: string
      let borderColor: string
      switch (revealerType) {
        case TileOwner.Player:
          boxColor = '#4CAF50' // Green for player
          borderColor = '#2E7D2E'
          break
        case TileOwner.Opponent:
          boxColor = '#F44336' // Red for opponent
          borderColor = '#C62828'
          break
        default:
          boxColor = '#9E9E9E' // Gray for neutral
          borderColor = '#616161'
      }
      
      this.ctx.fillStyle = boxColor
      this.ctx.fillRect(boxX, boxY, boxSize, boxSize)
      
      // Add contrasting border around the box
      this.ctx.strokeStyle = borderColor
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(boxX, boxY, boxSize, boxSize)
      
      // Draw the count number
      this.ctx.fillStyle = '#fff'
      this.ctx.font = `bold ${Math.floor(this.tileSize * 0.3)}px Courier New`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(adjacentCount.toString(), centerX, centerY)
      
    } else {
      // Show content icons on unrevealed tiles
      if (tile.content !== TileContent.Empty) {
        let icon = ''
        if (tile.content === TileContent.Gold) {
          icon = '💰'
        } else if (tile.content === TileContent.Item && tile.itemData) {
          icon = tile.itemData.icon
        } else if (tile.content === TileContent.Monster && tile.monsterData) {
          icon = tile.monsterData.icon
        } else if (tile.content === TileContent.PermanentUpgrade && tile.upgradeData) {
          icon = tile.upgradeData.icon
        }
        
        if (icon) {
          this.ctx.font = `${Math.floor(this.tileSize * 0.4)}px serif`
          this.ctx.textAlign = 'center'
          this.ctx.textBaseline = 'middle'
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
          // Draw icon in top-left corner
          this.ctx.fillText(icon, x + this.tileSize * 0.25, y + this.tileSize * 0.25)
        }
      }
      
      // Draw annotation slash if annotated (bottom-left to top-right)
      if (tile.annotated) {
        this.ctx.strokeStyle = '#999'
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.moveTo(x + 5, y + this.tileSize - 5)
        this.ctx.lineTo(x + this.tileSize - 5, y + 5)
        this.ctx.stroke()
      }
      
      // Draw chain indicators if tile has chain data
      if (tile.chainData) {
        this.drawChainIndicator(tile, x, y, board)
      }
    }
    
    // Draw detector scan results if present (overlay that works on both revealed and unrevealed tiles)
    if (tile.detectorScan) {
      const scan = tile.detectorScan
      
      // Create scan text in bottom right corner
      const scanText = `${scan.playerAdjacent}/${scan.opponentAdjacent}/${scan.neutralAdjacent}`
      
      // Calculate text size and position
      this.ctx.font = `bold ${Math.floor(this.tileSize * 0.12)}px Courier New`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      
      const textMetrics = this.ctx.measureText(scanText)
      const textWidth = textMetrics.width
      const textHeight = Math.floor(this.tileSize * 0.12)
      
      // Position box in bottom right corner with padding
      const boxPadding = 2
      const boxWidth = textWidth + boxPadding * 2
      const boxHeight = textHeight + boxPadding * 2
      const boxX = x + this.tileSize - boxWidth - 2
      const boxY = y + this.tileSize - boxHeight - 2
      
      // Draw background box
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight)
      
      // Draw border around the box
      this.ctx.strokeStyle = '#ffffff'
      this.ctx.lineWidth = 1
      this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)
      
      // Draw the text
      this.ctx.fillStyle = '#ffffff'
      this.ctx.fillText(scanText, boxX + boxWidth / 2, boxY + boxHeight / 2)
      
      // Reset text alignment
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
    }
  }

  // Draw chain indicator for chained tiles
  private drawChainIndicator(tile: Tile, x: number, y: number, board: Board): void {
    const ctx = this.ctx
    const chainData = tile.chainData!
    
    // Find the required tile to determine chain direction
    const requiredTile = board.tiles[chainData.requiredTileY][chainData.requiredTileX]
    
    // Calculate direction from this tile to required tile
    const dx = chainData.requiredTileX - tile.x
    const dy = chainData.requiredTileY - tile.y
    
    // Chain visual style
    ctx.save()
    
    if (chainData.isBlocked) {
      // Draw lock icon for blocked tiles
      ctx.fillStyle = 'rgba(255, 100, 100, 0.9)' // Red background
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      
      // Draw lock background circle in center
      const centerX = x + this.tileSize / 2
      const centerY = y + this.tileSize / 2
      const radius = this.tileSize * 0.15
      
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      
      // Draw lock icon (🔒)
      ctx.fillStyle = '#ffffff'
      ctx.font = `${Math.floor(this.tileSize * 0.2)}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🔒', centerX, centerY)
      
      // Calculate the exact position where the key will be on the required tile
      const requiredTileX = this.padding + chainData.requiredTileX * (this.tileSize + this.gap)
      const requiredTileY = this.padding + chainData.requiredTileY * (this.tileSize + this.gap)
      const keyRadius = this.tileSize * 0.12
      
      let keyPositionX: number, keyPositionY: number
      
      // Calculate where the key will be positioned on the required tile
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal positioning
        if (dx > 0) {
          // This tile is to the left of required tile, key is on left edge of required tile
          keyPositionX = requiredTileX + keyRadius * 1.2
          keyPositionY = requiredTileY + this.tileSize / 2
        } else {
          // This tile is to the right of required tile, key is on right edge of required tile  
          keyPositionX = requiredTileX + this.tileSize - keyRadius * 1.2
          keyPositionY = requiredTileY + this.tileSize / 2
        }
      } else {
        // Vertical positioning
        if (dy > 0) {
          // This tile is above required tile, key is on top edge of required tile
          keyPositionX = requiredTileX + this.tileSize / 2
          keyPositionY = requiredTileY + keyRadius * 1.2
        } else {
          // This tile is below required tile, key is on bottom edge of required tile
          keyPositionX = requiredTileX + this.tileSize / 2
          keyPositionY = requiredTileY + this.tileSize - keyRadius * 1.2
        }
      }
      
      // Draw arrow pointing to the key position
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)' // Orange arrow
      ctx.lineWidth = 3
      
      // Arrow start position (edge of lock)
      const arrowStartX = centerX + dx * radius * 1.5
      const arrowStartY = centerY + dy * radius * 1.5
      
      // Arrow end position (towards the key position on required tile)
      const arrowDirectionX = keyPositionX - arrowStartX
      const arrowDirectionY = keyPositionY - arrowStartY
      const arrowDistance = Math.sqrt(arrowDirectionX * arrowDirectionX + arrowDirectionY * arrowDirectionY)
      const arrowLength = Math.min(this.tileSize * 0.3, arrowDistance * 0.4)
      
      const arrowEndX = arrowStartX + (arrowDirectionX / arrowDistance) * arrowLength
      const arrowEndY = arrowStartY + (arrowDirectionY / arrowDistance) * arrowLength
      
      // Draw arrow line
      ctx.beginPath()
      ctx.moveTo(arrowStartX, arrowStartY)
      ctx.lineTo(arrowEndX, arrowEndY)
      ctx.stroke()
      
      // Draw arrow head
      const arrowHeadSize = 6
      const angle = Math.atan2(arrowDirectionY, arrowDirectionX)
      
      ctx.beginPath()
      ctx.moveTo(arrowEndX, arrowEndY)
      ctx.lineTo(
        arrowEndX - arrowHeadSize * Math.cos(angle - Math.PI / 6),
        arrowEndY - arrowHeadSize * Math.sin(angle - Math.PI / 6)
      )
      ctx.moveTo(arrowEndX, arrowEndY)
      ctx.lineTo(
        arrowEndX - arrowHeadSize * Math.cos(angle + Math.PI / 6),
        arrowEndY - arrowHeadSize * Math.sin(angle + Math.PI / 6)
      )
      ctx.stroke()
      
    } else {
      // Draw key icon for unblocked tiles (tiles that can unlock others)
      ctx.fillStyle = 'rgba(100, 255, 100, 0.9)' // Green background
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      
      // Position key on the side closest to the blocked tile
      const keyRadius = this.tileSize * 0.12
      const centerX = x + this.tileSize / 2
      const centerY = y + this.tileSize / 2
      
      // Calculate key position on the edge closest to the blocked tile
      let keyX: number, keyY: number
      
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal positioning (left or right side)
        if (dx > 0) {
          // Blocked tile is to the right, put key on right edge
          keyX = x + this.tileSize - keyRadius * 1.2
          keyY = centerY
        } else {
          // Blocked tile is to the left, put key on left edge
          keyX = x + keyRadius * 1.2
          keyY = centerY
        }
      } else {
        // Vertical positioning (top or bottom side)
        if (dy > 0) {
          // Blocked tile is below, put key on bottom edge
          keyX = centerX
          keyY = y + this.tileSize - keyRadius * 1.2
        } else {
          // Blocked tile is above, put key on top edge
          keyX = centerX
          keyY = y + keyRadius * 1.2
        }
      }
      
      ctx.beginPath()
      ctx.arc(keyX, keyY, keyRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      
      // Draw key icon (🔑)
      ctx.fillStyle = '#ffffff'
      ctx.font = `${Math.floor(this.tileSize * 0.15)}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🔑', keyX, keyY)
    }
    
    ctx.restore()
  }

  // Render the entire board
  renderBoard(board: Board): void {
    // Clear canvas
    this.ctx.fillStyle = '#222'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    // Calculate tile size
    this.calculateTileSize(board)
    
    // Render all tiles
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        this.renderTile(board.tiles[y][x], board)
      }
    }
    
    // Draw board border (accounting for gaps)
    const boardWidth = board.width * this.tileSize + (board.width - 1) * this.gap
    const boardHeight = board.height * this.tileSize + (board.height - 1) * this.gap
    
    this.ctx.strokeStyle = '#888'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(
      this.padding - 2, 
      this.padding - 2, 
      boardWidth + 4, 
      boardHeight + 4
    )
  }
}