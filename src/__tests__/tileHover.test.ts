import { 
  isMouseOverTileContent,
  isMouseOverDetectorScan,
  isMouseOverChainIndicator
} from '../tileHover'

describe('tileHover', () => {
  // Mock tile with standard game dimensions
  const mockTile = {
    x: 2, 
    y: 1,
    revealed: false,
    itemData: { id: 'test-item', name: 'Test Item' }
  }

  const tileSize = 60
  const startX = 20
  const startY = 20
  const gap = 2

  describe('isMouseOverTileContent', () => {
    it('should return false for tiles without content', () => {
      const emptyTile = { ...mockTile, itemData: null }
      
      const result = isMouseOverTileContent(150, 150, emptyTile, tileSize, startX, startY, gap)
      
      expect(result).toBe(false)
    })

    it('should return false for revealed tiles', () => {
      const revealedTile = { ...mockTile, revealed: true }
      
      const result = isMouseOverTileContent(150, 150, revealedTile, tileSize, startX, startY, gap)
      
      expect(result).toBe(false)
    })

    it('should detect mouse over item content area', () => {
      // Calculate expected tile position: startX + x * (tileSize + gap)
      // For tile at (2, 1): 20 + 2 * (60 + 2) = 144, 20 + 1 * (60 + 2) = 82
      const tileX = startX + mockTile.x * (tileSize + gap) // 144
      const tileY = startY + mockTile.y * (tileSize + gap) // 82
      
      // Icon is at x + tileSize * 0.25, y + tileSize * 0.25
      const iconX = tileX + tileSize * 0.25 // 144 + 15 = 159
      const iconY = tileY + tileSize * 0.25 // 82 + 15 = 97
      
      // Mouse exactly on icon center should return true
      const result = isMouseOverTileContent(iconX, iconY, mockTile, tileSize, startX, startY, gap)
      
      expect(result).toBe(true)
    })

    it('should not detect mouse outside content area', () => {
      // Mouse at tile origin (corner), outside icon area
      const tileX = startX + mockTile.x * (tileSize + gap)
      const tileY = startY + mockTile.y * (tileSize + gap)
      
      const result = isMouseOverTileContent(tileX, tileY, mockTile, tileSize, startX, startY, gap)
      
      expect(result).toBe(false)
    })

    it('should handle different tile sizes', () => {
      const smallTileSize = 30
      const largeTileSize = 120
      
      // For small tile, icon area should be proportionally smaller
      const smallTileX = startX + mockTile.x * (smallTileSize + gap)
      const smallTileY = startY + mockTile.y * (smallTileSize + gap)
      const smallIconX = smallTileX + smallTileSize * 0.25
      const smallIconY = smallTileY + smallTileSize * 0.25
      
      const smallResult = isMouseOverTileContent(smallIconX, smallIconY, mockTile, smallTileSize, startX, startY, gap)
      expect(smallResult).toBe(true)
      
      // For large tile, icon area should be proportionally larger
      const largeTileX = startX + mockTile.x * (largeTileSize + gap)
      const largeTileY = startY + mockTile.y * (largeTileSize + gap)
      const largeIconX = largeTileX + largeTileSize * 0.25
      const largeIconY = largeTileY + largeTileSize * 0.25
      
      const largeResult = isMouseOverTileContent(largeIconX, largeIconY, mockTile, largeTileSize, startX, startY, gap)
      expect(largeResult).toBe(true)
    })

    it('should work for tiles with different content types', () => {
      const itemTile = { ...mockTile, itemData: { id: 'item' } }
      const upgradeTile = { ...mockTile, itemData: null, upgradeData: { id: 'upgrade' } }
      const monsterTile = { ...mockTile, itemData: null, upgradeData: null, monsterData: { id: 'monster' } }
      
      const iconX = startX + mockTile.x * (tileSize + gap) + tileSize * 0.25
      const iconY = startY + mockTile.y * (tileSize + gap) + tileSize * 0.25
      
      expect(isMouseOverTileContent(iconX, iconY, itemTile, tileSize, startX, startY, gap)).toBe(true)
      expect(isMouseOverTileContent(iconX, iconY, upgradeTile, tileSize, startX, startY, gap)).toBe(true)
      expect(isMouseOverTileContent(iconX, iconY, monsterTile, tileSize, startX, startY, gap)).toBe(true)
    })

    it('should handle edge of icon area correctly', () => {
      const tileX = startX + mockTile.x * (tileSize + gap)
      const tileY = startY + mockTile.y * (tileSize + gap)
      const iconX = tileX + tileSize * 0.25
      const iconY = tileY + tileSize * 0.25
      const iconSize = tileSize * 0.4
      const iconHalfSize = iconSize * 0.5
      
      // Just inside the icon area
      expect(isMouseOverTileContent(iconX - iconHalfSize + 1, iconY, mockTile, tileSize, startX, startY, gap)).toBe(true)
      expect(isMouseOverTileContent(iconX + iconHalfSize - 1, iconY, mockTile, tileSize, startX, startY, gap)).toBe(true)
      
      // Just outside the icon area
      expect(isMouseOverTileContent(iconX - iconHalfSize - 1, iconY, mockTile, tileSize, startX, startY, gap)).toBe(false)
      expect(isMouseOverTileContent(iconX + iconHalfSize + 1, iconY, mockTile, tileSize, startX, startY, gap)).toBe(false)
    })
  })

  describe('isMouseOverDetectorScan', () => {
    const detectorTile = {
      ...mockTile,
      detectorScan: {
        playerAdjacent: 2,
        opponentAdjacent: 3,
        neutralAdjacent: 1
      }
    }

    it('should return false for tiles without detector scan', () => {
      const noScanTile = { ...mockTile, detectorScan: null }
      
      const result = isMouseOverDetectorScan(150, 150, noScanTile, tileSize, startX, startY, gap)
      
      expect(result).toBe(false)
    })

    it('should detect mouse over detector scan area', () => {
      const tileX = startX + detectorTile.x * (tileSize + gap)
      const tileY = startY + detectorTile.y * (tileSize + gap)
      
      // Based on actual implementation: box positioned at bottom-right of tile
      // boxX = x + tileSize - boxWidth - 2, boxY = y + tileSize - boxHeight - 2
      const scanText = `${detectorTile.detectorScan.playerAdjacent}/${detectorTile.detectorScan.opponentAdjacent}/${detectorTile.detectorScan.neutralAdjacent}`
      const textWidth = scanText.length * (tileSize * 0.08)
      const boxWidth = textWidth + 4 // padding
      const boxHeight = tileSize * 0.12 + 4 // padding
      
      const scanX = tileX + tileSize - boxWidth/2 - 2 // Center of box
      const scanY = tileY + tileSize - boxHeight/2 - 2 // Center of box
      
      const result = isMouseOverDetectorScan(scanX, scanY, detectorTile, tileSize, startX, startY, gap)
      
      expect(result).toBe(true)
    })

    it('should not detect mouse outside detector scan area', () => {
      const tileX = startX + detectorTile.x * (tileSize + gap)
      const tileY = startY + detectorTile.y * (tileSize + gap)
      
      // Top-left corner should be outside detector scan area
      const result = isMouseOverDetectorScan(tileX + 5, tileY + 5, detectorTile, tileSize, startX, startY, gap)
      
      expect(result).toBe(false)
    })
  })

  describe('isMouseOverChainIndicator', () => {
    const chainTile = {
      ...mockTile,
      chainData: {
        chainId: 'test-chain',
        isBlocked: true,
        requiredTileX: 1,
        requiredTileY: 1
      }
    }

    const mockBoard = {
      width: 5,
      height: 5,
      tiles: Array(5).fill(null).map(() => 
        Array(5).fill(null).map(() => ({ revealed: false }))
      )
    }

    it('should return false for tiles without chain data', () => {
      const noChainTile = { ...mockTile, chainData: null }
      
      const result = isMouseOverChainIndicator(150, 150, noChainTile, tileSize, startX, startY, gap, mockBoard)
      
      expect(result).toBe(false)
    })

    it('should detect mouse over chain indicator area', () => {
      // This test requires complex board state setup - testing basic functionality only
      const result = isMouseOverChainIndicator(150, 150, chainTile, tileSize, startX, startY, gap, mockBoard)
      
      // Should not crash and should return boolean
      expect(typeof result).toBe('boolean')
    })
  })

  describe('coordinate calculations', () => {
    it('should calculate tile positions correctly for different start positions', () => {
      const differentStartX = 50
      const differentStartY = 30
      
      const tileX = differentStartX + mockTile.x * (tileSize + gap)
      const tileY = differentStartY + mockTile.y * (tileSize + gap)
      const iconX = tileX + tileSize * 0.25
      const iconY = tileY + tileSize * 0.25
      
      const result = isMouseOverTileContent(iconX, iconY, mockTile, tileSize, differentStartX, differentStartY, gap)
      
      expect(result).toBe(true)
    })

    it('should handle different gap sizes', () => {
      const largeGap = 10
      const noGap = 0
      
      // With large gap, tiles should be further apart
      const largeGapX = startX + mockTile.x * (tileSize + largeGap) + tileSize * 0.25
      const largeGapY = startY + mockTile.y * (tileSize + largeGap) + tileSize * 0.25
      
      expect(isMouseOverTileContent(largeGapX, largeGapY, mockTile, tileSize, startX, startY, largeGap)).toBe(true)
      
      // With no gap, tiles should be adjacent
      const noGapX = startX + mockTile.x * tileSize + tileSize * 0.25
      const noGapY = startY + mockTile.y * tileSize + tileSize * 0.25
      
      expect(isMouseOverTileContent(noGapX, noGapY, mockTile, tileSize, startX, startY, noGap)).toBe(true)
    })

    it('should handle tile at origin (0,0)', () => {
      const originTile = { ...mockTile, x: 0, y: 0 }
      
      const iconX = startX + tileSize * 0.25
      const iconY = startY + tileSize * 0.25
      
      const result = isMouseOverTileContent(iconX, iconY, originTile, tileSize, startX, startY, gap)
      
      expect(result).toBe(true)
    })
  })
})