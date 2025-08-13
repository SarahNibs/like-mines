import { Board, Tile, TileOwner, TileContent } from './types'
import { countAdjacentTiles } from './gameLogic'

export class GameRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private tileSize: number = 60
  private startX: number = 20 // Board start position X (for centering)
  private startY: number = 20 // Board start position Y (for centering)
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

  // Calculate tile size and centering based on board dimensions and canvas size
  calculateTileSize(board: Board): void {
    const padding = 20
    const availableWidth = this.canvas.width - padding * 2
    const availableHeight = this.canvas.height - padding * 2
    
    // Account for gaps between tiles
    const totalGapWidth = (board.width - 1) * this.gap
    const totalGapHeight = (board.height - 1) * this.gap
    
    const tileWidthMax = Math.floor((availableWidth - totalGapWidth) / board.width)
    const tileHeightMax = Math.floor((availableHeight - totalGapHeight) / board.height)
    
    // Use the limiting dimension to determine tile size
    this.tileSize = Math.min(tileWidthMax, tileHeightMax, 120) // Max 120px tiles
    
    // Calculate the actual board dimensions
    const boardWidth = board.width * this.tileSize + totalGapWidth
    const boardHeight = board.height * this.tileSize + totalGapHeight
    
    // Center the board within the canvas
    this.startX = (this.canvas.width - boardWidth) / 2
    this.startY = (this.canvas.height - boardHeight) / 2
  }

  // Getter methods for renderer properties (for tooltip positioning)
  getTileSize(): number {
    return this.tileSize
  }

  getPadding(): number {
    return this.startX // Return actual start position instead of padding
  }

  getGap(): number {
    return this.gap
  }

  getStartX(): number {
    return this.startX
  }

  getStartY(): number {
    return this.startY
  }

  // Get tile position from mouse coordinates
  getTileFromCoordinates(board: Board, mouseX: number, mouseY: number): { x: number; y: number } | null {
    // Account for gaps when calculating tile position
    for (let x = 0; x < board.width; x++) {
      for (let y = 0; y < board.height; y++) {
        const tileX = this.startX + x * (this.tileSize + this.gap)
        const tileY = this.startY + y * (this.tileSize + this.gap)
        
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
    const x = this.startX + tile.x * (this.tileSize + this.gap)
    const y = this.startY + tile.y * (this.tileSize + this.gap)
    
    const colors = this.getTileColors(tile)
    const isHighlighted = this.highlightedTiles.has(`${tile.x},${tile.y}`) || this.persistentHighlightedTiles.has(`${tile.x},${tile.y}`)
    const isExtraHighlighted = this.extraHighlightedTiles.has(`${tile.x},${tile.y}`) || this.persistentExtraHighlightedTiles.has(`${tile.x},${tile.y}`)
    
    // Check for fog early - if fogged and unrevealed, render minimal fog tile
    if (tile.fogged && !tile.revealed) {
      // Draw basic tile background
      this.ctx.fillStyle = colors.bg
      this.ctx.fillRect(x, y, this.tileSize, this.tileSize)
      
      // Draw tile border
      this.ctx.strokeStyle = colors.border
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(x, y, this.tileSize, this.tileSize)
      
      // Draw fog effect that covers everything
      this.ctx.fillStyle = 'rgba(200, 200, 200, 0.9)'
      this.ctx.fillRect(x, y, this.tileSize, this.tileSize)
      
      // Add cloud texture with semi-transparent white spots
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      const cloudSpots = [
        { x: x + this.tileSize * 0.2, y: y + this.tileSize * 0.3, r: this.tileSize * 0.08 },
        { x: x + this.tileSize * 0.7, y: y + this.tileSize * 0.4, r: this.tileSize * 0.06 },
        { x: x + this.tileSize * 0.4, y: y + this.tileSize * 0.6, r: this.tileSize * 0.07 },
        { x: x + this.tileSize * 0.6, y: y + this.tileSize * 0.7, r: this.tileSize * 0.05 }
      ]
      
      cloudSpots.forEach(spot => {
        this.ctx.beginPath()
        this.ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2)
        this.ctx.fill()
      })
      
      // Only show detector scan results over fog (if present)
      if (tile.detectorScan) {
        const scan = tile.detectorScan
        const scanText = `${scan.playerAdjacent}/${scan.opponentAdjacent}/${scan.neutralAdjacent}`
        
        this.ctx.font = `bold ${Math.floor(this.tileSize * 0.12)}px Courier New`
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        
        const textMetrics = this.ctx.measureText(scanText)
        const textWidth = textMetrics.width
        const textHeight = Math.floor(this.tileSize * 0.12)
        
        const boxPadding = 1
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
      
      return // Skip all other rendering for fogged tiles
    }

    // Normal tile rendering (not fogged or revealed)
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
          icon = '⭐' // All upgrades show as stars on the board
        }
        
        if (icon) {
          this.ctx.textAlign = 'center'
          this.ctx.textBaseline = 'middle'
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
          
          // Position and size icons based on content type
          let iconX: number, iconY: number, fontSize: number
          
          if (tile.content === TileContent.PermanentUpgrade) {
            // Upgrade stars: center position, full size
            iconX = x + this.tileSize * 0.5
            iconY = y + this.tileSize * 0.5
            fontSize = Math.floor(this.tileSize * 0.4)
          } else {
            // All other items: top-left position, smaller size (2/3), moved slightly more to corner
            iconX = x + this.tileSize * 0.2
            iconY = y + this.tileSize * 0.2
            
            if (tile.content === TileContent.Gold) {
              // Gold coins: even smaller
              fontSize = Math.floor(this.tileSize * 0.17) // 2/3 of 0.25
            } else {
              // Regular items: 2/3 of normal size
              fontSize = Math.floor(this.tileSize * 0.27) // 2/3 of 0.4
            }
          }
          
          this.ctx.font = `${fontSize}px serif`
          this.ctx.fillText(icon, iconX, iconY)
        }
      }
      
      // Draw annotation based on state
      if (tile.annotated === 'slash') {
        // Gray slash (bottom-left to top-right)
        this.ctx.strokeStyle = '#999'
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.moveTo(x + 5, y + this.tileSize - 5)
        this.ctx.lineTo(x + this.tileSize - 5, y + 5)
        this.ctx.stroke()
      } else if (tile.annotated === 'dog-ear') {
        // Light green dog-ear (rounded upper right corner)
        this.ctx.fillStyle = '#90ee90'
        this.ctx.beginPath()
        const cornerSize = 20
        this.ctx.moveTo(x + this.tileSize - cornerSize, y)
        this.ctx.lineTo(x + this.tileSize, y)
        this.ctx.lineTo(x + this.tileSize, y + cornerSize)
        this.ctx.quadraticCurveTo(x + this.tileSize - 2, y + 2, x + this.tileSize - cornerSize, y)
        this.ctx.fill()
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
    
    // If the required tile is revealed, check if we should still draw indicators
    if (requiredTile.revealed) {
      // For middle tiles with secondary keys, keep drawing the key but not the door/lock
      if (chainData.hasSecondaryKey) {
        // Only draw the secondary key, not the door
        // Continue to the key drawing logic below, but skip the door logic
      } else {
        // For regular chains, stop drawing indicators entirely
        return
      }
    }
    
    // Calculate direction from this tile to required tile
    const dx = chainData.requiredTileX - tile.x
    const dy = chainData.requiredTileY - tile.y
    
    ctx.save()
    
    // Check if we should draw the door (only if required tile is not revealed)
    const shouldDrawDoor = !requiredTile.revealed
    
    // Handle tiles that have both a door and a key (middle tiles in 3-tile chains)
    if (chainData.isBlocked && chainData.hasSecondaryKey) {
      // Draw large dim door background only if required tile is not revealed
      if (shouldDrawDoor) {
        ctx.fillStyle = 'rgba(139, 69, 19, 0.3)' // Dim brown door color
        ctx.fillRect(x, y, this.tileSize, this.tileSize)
        
        // Draw door frame
        ctx.strokeStyle = 'rgba(101, 67, 33, 0.5)' // Darker brown for frame
        ctx.lineWidth = 2
        ctx.strokeRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4)
        
        // Draw door handle (small circle)
        const handleX = x + this.tileSize * 0.8
        const handleY = y + this.tileSize * 0.5
        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)' // Dim gold handle
        ctx.beginPath()
        ctx.arc(handleX, handleY, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      
      // Position key icon for the secondary key (on opposite edge)
      let keyX: number, keyY: number
      const sdx = chainData.secondaryRequiredTileX! - tile.x
      const sdy = chainData.secondaryRequiredTileY! - tile.y
      
      if (Math.abs(sdx) > Math.abs(sdy)) {
        // Horizontal positioning for key
        if (sdx > 0) {
          keyX = x + this.tileSize * 0.85
          keyY = y + this.tileSize / 2
        } else {
          keyX = x + this.tileSize * 0.15
          keyY = y + this.tileSize / 2
        }
      } else {
        // Vertical positioning for key
        if (sdy > 0) {
          keyX = x + this.tileSize / 2
          keyY = y + this.tileSize * 0.85
        } else {
          keyX = x + this.tileSize / 2
          keyY = y + this.tileSize * 0.15
        }
      }
      
      // Key positioning is now independent since door is a background
      
      // Draw key icon
      ctx.fillStyle = '#66ff66'
      ctx.font = `${Math.floor(this.tileSize * 0.15)}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🔑', keyX, keyY)
      
    } else if (chainData.isBlocked) {
      // Regular locked tile - draw large dim door background
      if (shouldDrawDoor) {
        ctx.fillStyle = 'rgba(139, 69, 19, 0.3)' // Dim brown door color
        ctx.fillRect(x, y, this.tileSize, this.tileSize)
        
        // Draw door frame
        ctx.strokeStyle = 'rgba(101, 67, 33, 0.5)' // Darker brown for frame
        ctx.lineWidth = 2
        ctx.strokeRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4)
        
        // Draw door handle (small circle)
        const handleX = x + this.tileSize * 0.8
        const handleY = y + this.tileSize * 0.5
        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)' // Dim gold handle
        ctx.beginPath()
        ctx.arc(handleX, handleY, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      
    } else {
      // Regular key tile
      let keyX: number, keyY: number
      
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal positioning (left or right edge)
        if (dx > 0) {
          // Blocked tile is to the right, put key on right edge
          keyX = x + this.tileSize * 0.85
          keyY = y + this.tileSize / 2
        } else {
          // Blocked tile is to the left, put key on left edge
          keyX = x + this.tileSize * 0.15
          keyY = y + this.tileSize / 2
        }
      } else {
        // Vertical positioning (top or bottom edge)
        if (dy > 0) {
          // Blocked tile is below, put key on bottom edge
          keyX = x + this.tileSize / 2
          keyY = y + this.tileSize * 0.85
        } else {
          // Blocked tile is above, put key on top edge
          keyX = x + this.tileSize / 2
          keyY = y + this.tileSize * 0.15
        }
      }
      
      // Draw key icon (🔑) without background
      ctx.fillStyle = '#66ff66'
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
    
    // Draw board border (accounting for gaps and centering)
    const boardWidth = board.width * this.tileSize + (board.width - 1) * this.gap
    const boardHeight = board.height * this.tileSize + (board.height - 1) * this.gap
    
    this.ctx.strokeStyle = '#888'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(
      this.startX - 2, 
      this.startY - 2, 
      boardWidth + 4, 
      boardHeight + 4
    )
  }
}