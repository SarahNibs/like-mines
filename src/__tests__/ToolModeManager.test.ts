/**
 * Tests for ToolModeManager
 */

import { ToolModeManager } from '../ToolModeManager'
import { Board, RunState, TileContent } from '../types'

describe('ToolModeManager', () => {
  let manager: ToolModeManager
  let mockBoard: Board
  let mockRun: RunState

  beforeEach(() => {
    manager = new ToolModeManager()
    
    // Create 2D array for tiles as expected by getTileAt
    const tiles = []
    for (let y = 0; y < 5; y++) {
      tiles[y] = []
      for (let x = 0; x < 5; x++) {
        tiles[y][x] = {
          x,
          y,
          revealed: false,
          owner: 'neutral',
          content: TileContent.Empty,
          fogged: false
        }
      }
    }

    mockBoard = {
      width: 5,
      height: 5,
      tiles,
      playerTilesTotal: 8,
      opponentTilesTotal: 8,
      neutralTilesTotal: 9
    } as Board

    mockRun = {
      upgrades: ['attack'],
      gold: 50,
      loot: 0
    } as RunState
  })

  describe('transmute functionality', () => {
    it('should successfully transmute opponent tile to player', () => {
      mockBoard.tiles[1][1].owner = 'opponent'
      
      const result = manager.transmuteTileAt(mockBoard, 1, 1, mockRun)
      
      expect(result.success).toBe(true)
      expect(result.shouldEndMode).toBe(true)
      expect(result.inventoryModified).toBe(true)
      expect(result.boardModified).toBe(true)
      expect(result.oldOwner).toBe('opponent')
      expect(result.newOwner).toBe('player')
      expect(result.message).toContain('Transmuted opponent tile at (1, 1) to player tile!')
      
      // Check tile ownership changed
      expect(mockBoard.tiles[1][1].owner).toBe('player')
      
      // Check tile counts updated
      expect(mockBoard.opponentTilesTotal).toBe(7)
      expect(mockBoard.playerTilesTotal).toBe(9)
    })

    it('should successfully transmute neutral tile to player', () => {
      mockBoard.tiles[2][2].owner = 'neutral'
      
      const result = manager.transmuteTileAt(mockBoard, 2, 2, mockRun)
      
      expect(result.success).toBe(true)
      expect(result.oldOwner).toBe('neutral')
      expect(result.newOwner).toBe('player')
      expect(mockBoard.tiles[2][2].owner).toBe('player')
      expect(mockBoard.neutralTilesTotal).toBe(8)
      expect(mockBoard.playerTilesTotal).toBe(9)
    })

    it('should handle transmuting already player-owned tile', () => {
      mockBoard.tiles[0][0].owner = 'player'
      
      const result = manager.transmuteTileAt(mockBoard, 0, 0, mockRun)
      
      expect(result.success).toBe(false)
      expect(result.shouldEndMode).toBe(true)
      expect(result.inventoryModified).toBe(true)
      expect(result.message).toBe('Tile is already yours! Transmute consumed anyway.')
      expect(result.oldOwner).toBe('player')
    })

    it('should reject transmuting revealed tiles', () => {
      mockBoard.tiles[1][1].revealed = true
      
      const result = manager.transmuteTileAt(mockBoard, 1, 1, mockRun)
      
      expect(result.success).toBe(false)
      expect(result.shouldEndMode).toBe(true)
      expect(result.inventoryModified).toBe(true)
      expect(result.message).toBe('Can only transmute unrevealed tiles!')
    })

    it('should reject invalid tile positions', () => {
      const result = manager.transmuteTileAt(mockBoard, 10, 10, mockRun)
      
      expect(result.success).toBe(false)
      expect(result.shouldEndMode).toBe(true)
      expect(result.message).toBe('Can only transmute unrevealed tiles!')
    })
  })

  describe('detector functionality', () => {
    it('should scan adjacent tiles correctly', () => {
      // Set up adjacent tiles with different owners
      // The 9 tiles around (1,1) including itself:
      // [0,0] [0,1] [0,2]
      // [1,0] [1,1] [1,2] 
      // [2,0] [2,1] [2,2]
      
      mockBoard.tiles[1][1].owner = 'player'  // center - should be counted
      mockBoard.tiles[0][1].owner = 'player'  // above
      mockBoard.tiles[1][2].owner = 'opponent' // right
      mockBoard.tiles[2][1].owner = 'opponent' // below
      // Remaining tiles stay neutral: [0,0], [0,2], [1,0], [2,0], [2,2] = 5 neutral
      
      const result = manager.detectTileAt(mockBoard, 1, 1)
      
      expect(result.success).toBe(true)
      expect(result.shouldEndMode).toBe(true)
      expect(result.inventoryModified).toBe(true)
      expect(result.boardModified).toBe(true)
      expect(result.scanData).toEqual({
        playerAdjacent: 2,    // [1,1] and [0,1]
        opponentAdjacent: 2,  // [1,2] and [2,1]
        neutralAdjacent: 5    // [0,0], [0,2], [1,0], [2,0], [2,2]
      })
      expect(result.message).toContain('Detector scan at (1, 1): 2 player, 2 opponent, 5 neutral adjacent tiles')
      
      // Check scan data was added to tile
      expect(mockBoard.tiles[1][1].detectorScan).toEqual({
        playerAdjacent: 2,
        opponentAdjacent: 2,
        neutralAdjacent: 5
      })
    })

    it('should handle scanning tile at board edge', () => {
      // Corner tile has fewer adjacent tiles
      const result = manager.detectTileAt(mockBoard, 0, 0)
      
      expect(result.success).toBe(true)
      expect(result.scanData).toEqual({
        playerAdjacent: 0,
        opponentAdjacent: 0,
        neutralAdjacent: 4 // 4 adjacent neutral tiles in corner
      })
    })

    it('should reject invalid tile positions', () => {
      const result = manager.detectTileAt(mockBoard, -1, -1)
      
      expect(result.success).toBe(false)
      expect(result.shouldEndMode).toBe(true)
      expect(result.message).toBe('Invalid tile position!')
    })
  })

  describe('key functionality', () => {
    it('should unlock chained tiles successfully', () => {
      // Set up a chained tile
      mockBoard.tiles[2][2].chainData = {
        isBlocked: true,
        requiredTileX: 3,
        requiredTileY: 3
      }
      mockBoard.tiles[3][3].chainData = { isBlocked: false }
      mockBoard.tiles[3][3].content = TileContent.Item
      
      const result = manager.useKeyAt(mockBoard, 2, 2)
      
      expect(result.success).toBe(true)
      expect(result.shouldEndMode).toBe(true)
      expect(result.inventoryModified).toBe(true)
      expect(result.boardModified).toBe(true)
      expect(result.message).toBe('Key used! Unlocked tile at (2, 2) and removed corresponding key.')
      expect(result.unlockedPosition).toEqual({ x: 2, y: 2 })
      expect(result.keyPosition).toEqual({ x: 3, y: 3 })
      
      // Check chain was removed
      expect(mockBoard.tiles[2][2].chainData).toBeUndefined()
      expect(mockBoard.tiles[3][3].content).toBe(TileContent.Empty)
      expect(mockBoard.tiles[3][3].chainData).toBeUndefined()
    })

    it('should reject using key on non-chained tiles', () => {
      const result = manager.useKeyAt(mockBoard, 1, 1)
      
      expect(result.success).toBe(false)
      expect(result.shouldEndMode).toBe(true)
      expect(result.inventoryModified).toBe(true)
      expect(result.message).toBe('Can only use keys on locked tiles!')
    })

    it('should reject using key on revealed tiles', () => {
      mockBoard.tiles[2][2].revealed = true
      mockBoard.tiles[2][2].chainData = { isBlocked: true, requiredTileX: 3, requiredTileY: 3 }
      
      const result = manager.useKeyAt(mockBoard, 2, 2)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('Can only use keys on locked tiles!')
    })
  })

  describe('staff functionality', () => {
    it('should attack monsters successfully', () => {
      mockBoard.tiles[1][1].content = TileContent.Monster
      mockBoard.tiles[1][1].monsterData = { name: 'Orc', hp: 10, attack: 5, defense: 2 }
      mockRun.upgrades = ['attack', 'attack'] // 2 attack upgrades
      
      const result = manager.useStaffAt(mockBoard, 1, 1, mockRun)
      
      expect(result.success).toBe(true)
      expect(result.shouldEndMode).toBe(false) // Staff can be used multiple times
      expect(result.inventoryModified).toBe(true)
      expect(result.boardModified).toBe(false) // Monster not defeated yet
      expect(result.damage).toBe(7) // 5 base + 2 attack upgrades
      expect(result.monsterDefeated).toBe(false)
      expect(result.monsterName).toBe('Orc')
      expect(result.message).toContain('Staff of Fireballs hits Orc for 7 damage! (3 HP remaining)')
      
      // Check monster HP reduced
      expect(mockBoard.tiles[1][1].monsterData.hp).toBe(3)
    })

    it('should defeat monsters and award gold', () => {
      mockBoard.tiles[1][1].content = TileContent.Monster
      mockBoard.tiles[1][1].monsterData = { name: 'Rat', hp: 5, attack: 3, defense: 0 }
      mockRun.upgrades = ['attack', 'income'] // 1 attack, 1 income
      mockRun.gold = 10
      mockRun.loot = 2 // 1 base + 1 income upgrade
      
      const result = manager.useStaffAt(mockBoard, 1, 1, mockRun)
      
      expect(result.success).toBe(true)
      expect(result.boardModified).toBe(true)
      expect(result.damage).toBe(6) // 5 base + 1 attack
      expect(result.monsterDefeated).toBe(true)
      expect(result.monsterName).toBe('Rat')
      expect(result.message).toContain('Staff defeated Rat! Gained 2 gold.')
      
      // Check monster removed
      expect(mockBoard.tiles[1][1].content).toBe(TileContent.Empty)
      expect(mockBoard.tiles[1][1].monsterData).toBeUndefined()
      
      // Check gold awarded
      expect(result.updatedRun.gold).toBe(12) // 10 + 2 (1 base + 1 income)
      expect(result.updatedRun.loot).toBe(2)
    })

    it('should reject targeting non-monster tiles', () => {
      const result = manager.useStaffAt(mockBoard, 1, 1, mockRun)
      
      expect(result.success).toBe(false)
      expect(result.shouldEndMode).toBe(false)
      expect(result.inventoryModified).toBe(false)
      expect(result.message).toBe('Can only target monsters with the Staff of Fireballs!')
    })
  })

  describe('ring functionality', () => {
    it('should remove fog from fogged tiles', () => {
      mockBoard.tiles[2][2].fogged = true
      
      const result = manager.useRingAt(mockBoard, 2, 2)
      
      expect(result.success).toBe(true)
      expect(result.shouldEndMode).toBe(false) // Ring can be used multiple times
      expect(result.inventoryModified).toBe(true)
      expect(result.boardModified).toBe(true)
      expect(result.message).toBe('Ring of True Seeing removes fog from tile at (2, 2)')
      expect(result.defoggedPosition).toEqual({ x: 2, y: 2 })
      
      // Check fog removed
      expect(mockBoard.tiles[2][2].fogged).toBe(false)
    })

    it('should allow targeting non-fogged tiles but with no effect', () => {
      const result = manager.useRingAt(mockBoard, 1, 1)
      
      expect(result.success).toBe(true)
      expect(result.shouldEndMode).toBe(false)
      expect(result.inventoryModified).toBe(true) // Should consume charge
      expect(result.boardModified).toBe(false) // No fog to remove
      expect(result.message).toBe('Ring of True Seeing used on tile at (1, 1) but there was no fog to remove')
    })
  })

  describe('detector scan updates', () => {
    it('should update all detector scans when board changes', () => {
      // Set up initial scan
      mockBoard.tiles[1][1].owner = 'player'
      mockBoard.tiles[1][2].owner = 'opponent'
      manager.detectTileAt(mockBoard, 1, 1)
      
      const initialScan = mockBoard.tiles[1][1].detectorScan
      expect(initialScan.playerAdjacent).toBe(1)
      expect(initialScan.opponentAdjacent).toBe(1)
      
      // Change adjacent tile ownership
      mockBoard.tiles[1][2].owner = 'player'
      
      // Update scans
      manager.updateDetectorScans(mockBoard)
      
      const updatedScan = mockBoard.tiles[1][1].detectorScan
      expect(updatedScan.playerAdjacent).toBe(2)
      expect(updatedScan.opponentAdjacent).toBe(0)
    })

    it('should handle board with no detector scans', () => {
      expect(() => manager.updateDetectorScans(mockBoard)).not.toThrow()
    })
  })

  describe('tool validation', () => {
    it('should validate transmute usage correctly', () => {
      mockBoard.tiles[1][1].revealed = false
      mockBoard.tiles[2][2].revealed = true
      
      expect(manager.canUseToolAt('transmute', mockBoard, 1, 1)).toEqual({ canUse: true })
      expect(manager.canUseToolAt('transmute', mockBoard, 2, 2)).toEqual({ 
        canUse: false, 
        reason: 'Can only transmute unrevealed tiles' 
      })
    })

    it('should validate detector usage correctly', () => {
      expect(manager.canUseToolAt('detector', mockBoard, 1, 1)).toEqual({ canUse: true })
      expect(manager.canUseToolAt('detector', mockBoard, 2, 2)).toEqual({ canUse: true })
    })

    it('should validate key usage correctly', () => {
      mockBoard.tiles[1][1].chainData = { isBlocked: true, requiredTileX: 2, requiredTileY: 2 }
      mockBoard.tiles[2][2].chainData = { isBlocked: true, requiredTileX: 1, requiredTileY: 1 }
      mockBoard.tiles[2][2].revealed = true
      
      expect(manager.canUseToolAt('key', mockBoard, 1, 1)).toEqual({ canUse: true })
      expect(manager.canUseToolAt('key', mockBoard, 2, 2)).toEqual({ 
        canUse: false, 
        reason: 'Cannot use key on revealed tiles' 
      })
      expect(manager.canUseToolAt('key', mockBoard, 3, 3)).toEqual({ 
        canUse: false, 
        reason: 'Can only use keys on locked tiles' 
      })
    })

    it('should validate staff usage correctly', () => {
      mockBoard.tiles[1][1].content = TileContent.Monster
      mockBoard.tiles[1][1].monsterData = { name: 'Orc', hp: 10 }
      
      expect(manager.canUseToolAt('staff', mockBoard, 1, 1)).toEqual({ canUse: true })
      expect(manager.canUseToolAt('staff', mockBoard, 2, 2)).toEqual({ 
        canUse: false, 
        reason: 'Can only target monsters with staff' 
      })
    })

    it('should validate ring usage correctly', () => {
      mockBoard.tiles[1][1].fogged = true
      
      expect(manager.canUseToolAt('ring', mockBoard, 1, 1)).toEqual({ canUse: true })
      expect(manager.canUseToolAt('ring', mockBoard, 2, 2)).toEqual({ 
        canUse: false, 
        reason: 'Can only target fogged tiles with ring' 
      })
    })

    it('should handle unknown tool modes', () => {
      expect(manager.canUseToolAt('unknown', mockBoard, 1, 1)).toEqual({ 
        canUse: false, 
        reason: 'Unknown tool mode' 
      })
    })

    it('should handle invalid tile positions', () => {
      expect(manager.canUseToolAt('transmute', mockBoard, 10, 10)).toEqual({ 
        canUse: false, 
        reason: 'Invalid tile position' 
      })
    })
  })

  describe('tool statistics', () => {
    it('should calculate valid targets for transmute', () => {
      // 5x5 = 25 total tiles, all unrevealed = 25 valid targets
      const stats = manager.getToolModeStats('transmute', mockBoard)
      
      expect(stats.totalTiles).toBe(25)
      expect(stats.validTargets).toBe(25)
    })

    it('should calculate valid targets for key', () => {
      // Add 2 chained tiles
      mockBoard.tiles[1][1].chainData = { isBlocked: true, requiredTileX: 2, requiredTileY: 2 }
      mockBoard.tiles[3][3].chainData = { isBlocked: true, requiredTileX: 4, requiredTileY: 4 }
      
      const stats = manager.getToolModeStats('key', mockBoard)
      
      expect(stats.totalTiles).toBe(25)
      expect(stats.validTargets).toBe(2)
    })

    it('should calculate valid targets for staff', () => {
      // Add 3 monsters
      mockBoard.tiles[1][1].content = TileContent.Monster
      mockBoard.tiles[1][1].monsterData = { name: 'Orc', hp: 10 }
      mockBoard.tiles[2][2].content = TileContent.Monster  
      mockBoard.tiles[2][2].monsterData = { name: 'Rat', hp: 5 }
      mockBoard.tiles[3][3].content = TileContent.Monster
      mockBoard.tiles[3][3].monsterData = { name: 'Goblin', hp: 8 }
      
      const stats = manager.getToolModeStats('staff', mockBoard)
      
      expect(stats.totalTiles).toBe(25)
      expect(stats.validTargets).toBe(3)
    })

    it('should check if tool has valid targets', () => {
      expect(manager.hasValidTargets('transmute', mockBoard)).toBe(true)
      expect(manager.hasValidTargets('key', mockBoard)).toBe(false)
      
      mockBoard.tiles[1][1].chainData = { isBlocked: true, requiredTileX: 2, requiredTileY: 2 }
      expect(manager.hasValidTargets('key', mockBoard)).toBe(true)
    })

    it('should get all valid target positions', () => {
      // Add 2 monsters
      mockBoard.tiles[1][1].content = TileContent.Monster
      mockBoard.tiles[1][1].monsterData = { name: 'Orc', hp: 10 }
      mockBoard.tiles[3][3].content = TileContent.Monster
      mockBoard.tiles[3][3].monsterData = { name: 'Rat', hp: 5 }
      
      const targets = manager.getValidTargets('staff', mockBoard)
      
      expect(targets).toHaveLength(2)
      expect(targets).toContainEqual({ x: 1, y: 1 })
      expect(targets).toContainEqual({ x: 3, y: 3 })
    })
  })

  describe('edge cases', () => {
    it('should handle empty board gracefully', () => {
      const emptyBoard = { ...mockBoard, width: 0, height: 0, tiles: [] }
      
      const stats = manager.getToolModeStats('transmute', emptyBoard)
      expect(stats.totalTiles).toBe(0)
      expect(stats.validTargets).toBe(0)
      
      expect(manager.hasValidTargets('transmute', emptyBoard)).toBe(false)
      expect(manager.getValidTargets('transmute', emptyBoard)).toEqual([])
    })

    it('should handle monster with zero HP correctly', () => {
      mockBoard.tiles[1][1].content = TileContent.Monster
      mockBoard.tiles[1][1].monsterData = { name: 'Weak Monster', hp: 1 }
      
      const result = manager.useStaffAt(mockBoard, 1, 1, mockRun)
      
      expect(result.monsterDefeated).toBe(true)
      expect(result.damage).toBe(6) // 5 base + 1 attack upgrade
    })

    it('should handle transmute on board edge tiles', () => {
      const result = manager.transmuteTileAt(mockBoard, 0, 0, mockRun)
      
      expect(result.success).toBe(true)
      expect(mockBoard.tiles[0][0].owner).toBe('player')
    })
  })
})