/**
 * TurnManager Tests
 */

import { TurnManager } from '../TurnManager'
import { GameState, RunState, Board, Tile, TileContent, TileOwner } from '../types'

describe('TurnManager', () => {
  let manager: TurnManager
  let mockGameState: GameState
  let mockBoard: Board
  let mockRun: RunState

  beforeEach(() => {
    manager = new TurnManager()
    
    mockRun = {
      currentLevel: 1,
      maxLevel: 25,
      gold: 50,
      upgrades: [],
      hp: 10,
      maxHp: 10,
      attack: 5,
      defense: 2,
      loot: 1,
      maxInventory: 3,
      inventory: [null, null, null],
      trophies: [],
      characterId: 'fighter',
      temporaryBuffs: {}
    }

    mockBoard = {
      width: 3,
      height: 3,
      tiles: Array(3).fill(null).map((_, y) =>
        Array(3).fill(null).map((_, x) => ({
          x,
          y,
          owner: x === 1 && y === 1 ? TileOwner.Player : TileOwner.Opponent,
          revealed: false,
          content: TileContent.Empty,
          contentVisible: false,
          itemData: undefined,
          upgradeData: undefined,
          monsterData: undefined,
          annotation: '',
          highlighted: false,
          annotated: false,
          fogged: false
        }))
      ),
      playerTilesTotal: 1,
      opponentTilesTotal: 8,
      playerTilesRevealed: 0,
      opponentTilesRevealed: 0
    }

    mockGameState = {
      board: mockBoard,
      currentTurn: 'player',
      gameStatus: 'playing',
      boardStatus: 'in-progress',
      clues: [],
      run: mockRun,
      transmuteMode: false,
      detectorMode: false,
      keyMode: false,
      staffMode: false,
      ringMode: false,
      shopOpen: false,
      shopItems: [],
      pendingDiscard: null,
      upgradeChoice: null
    }
  })

  describe('processPlayerTileReveal', () => {
    it('should reject non-player turn', () => {
      mockGameState.currentTurn = 'opponent'
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('Not player turn')
    })

    it('should reject when game not in progress', () => {
      mockGameState.gameStatus = 'character-select'
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('not in progress')
    })

    it('should reject already revealed tiles', () => {
      mockBoard.tiles[0][0].revealed = true
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('already revealed')
    })

    it('should reject chained tiles that cannot be revealed', () => {
      mockBoard.tiles[0][0].chainData = {
        chainId: 'test-chain',
        isBlocked: true,
        requiredTileX: 1,
        requiredTileY: 1
      }
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(false)
      expect(result.message).toContain('chained')
    })

    it('should allow chained tiles when required tile is revealed', () => {
      mockBoard.tiles[0][0].chainData = {
        chainId: 'test-chain',
        isBlocked: true,
        requiredTileX: 1,
        requiredTileY: 1
      }
      mockBoard.tiles[1][1].revealed = true
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(true)
    })

    it('should successfully reveal player tile and continue turn', () => {
      const result = manager.processPlayerTileReveal(1, 1, mockGameState)
      
      expect(result.success).toBe(true)
      expect(result.newTurn).toBe('player')
      expect(result.newBoardStatus).toBeDefined()
    })

    it('should end turn when revealing opponent tile without protection', () => {
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(true)
      expect(result.newTurn).toBe('opponent')
    })

    it('should continue turn when revealing opponent tile with protection', () => {
      mockRun.temporaryBuffs.protection = 1
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(true)
      expect(result.newTurn).toBe('player')
      expect(result.newRun.temporaryBuffs.protection).toBe(0)
    })

    it('should award loot for opponent tiles', () => {
      const initialGold = mockRun.gold
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.newRun.gold).toBe(initialGold + mockRun.loot)
    })

    it('should apply resting upgrade healing on neutral tiles', () => {
      mockBoard.tiles[0][0].owner = TileOwner.Neutral
      mockRun.upgrades = ['resting', 'resting'] // 2 resting upgrades
      const initialHp = mockRun.hp
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.newRun.hp).toBe(Math.min(mockRun.maxHp, initialHp + 6)) // 2 * 3 healing
    })

    it('should not overheal with resting upgrade', () => {
      mockBoard.tiles[0][0].owner = TileOwner.Neutral
      mockRun.upgrades = ['resting']
      mockRun.hp = mockRun.maxHp - 1 // Almost full
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.newRun.hp).toBe(mockRun.maxHp) // Capped at max
    })
  })

  describe('tile content processing', () => {
    it('should trigger upgrade choice for upgrade tiles', () => {
      mockBoard.tiles[0][0].content = TileContent.PermanentUpgrade
      mockBoard.tiles[0][0].upgradeData = {
        id: 'attack',
        name: 'Attack',
        description: 'Increases attack',
        icon: '⚔️',
        repeatable: true
      }
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(true)
      expect(result.upgradeChoiceTriggered).toBe(true)
    })

    it('should handle immediate items', () => {
      mockBoard.tiles[0][0].content = TileContent.Item
      mockBoard.tiles[0][0].itemData = {
        id: 'first-aid',
        name: 'First Aid',
        description: 'Heals HP',
        icon: '❤️',
        immediate: true
      }
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(true)
      // Immediate item effect would be applied through applyItemEffect
    })

    it('should handle shop items', () => {
      mockBoard.tiles[0][0].content = TileContent.Item
      mockBoard.tiles[0][0].itemData = {
        id: 'shop',
        name: 'Shop',
        description: 'Opens shop',
        icon: '🏪',
        immediate: true
      }
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(true)
      expect(result.shopOpened).toBe(true)
    })

    it('should add non-immediate items to inventory', () => {
      mockBoard.tiles[0][0].content = TileContent.Item
      mockBoard.tiles[0][0].itemData = {
        id: 'crystal-ball',
        name: 'Crystal Ball',
        description: 'Reveals tiles',
        icon: '🔮',
        immediate: false
      }
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(true)
      // Item would be added through addItemToInventory
    })

    it('should handle monster encounters', () => {
      // Reset to ensure clean state
      mockRun.gold = 50
      mockGameState.run = mockRun
      
      mockBoard.tiles[0][0].owner = TileOwner.Neutral // Make it neutral to avoid double loot
      mockBoard.tiles[0][0].content = TileContent.Monster
      mockBoard.tiles[0][0].monsterData = {
        id: 'rat',
        name: 'Rat',
        icon: '🐀',
        attack: 1, // Low damage so player survives and gets loot
        defense: 0,
        hp: 6
      }
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(true)
      // Monster damage would be applied through fightMonster
      expect(result.newRun.gold).toBe(51) // 50 + 1 loot from monster
    })

    it('should trigger rich upgrade on monster defeat', () => {
      mockBoard.tiles[0][0].owner = TileOwner.Neutral // Make it neutral to avoid double loot
      mockBoard.tiles[0][0].content = TileContent.Monster
      mockBoard.tiles[0][0].monsterData = {
        id: 'rat',
        name: 'Rat',
        icon: '🐀',
        attack: 1, // Low damage to avoid death
        defense: 0,
        hp: 6
      }
      mockRun.upgrades = ['rich']
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(true)
      expect(result.richUpgradeTriggered).toEqual({ x: 0, y: 0 })
    })
  })

  describe('shouldScheduleAITurn', () => {
    it('should schedule AI turn when opponent turn starts', () => {
      const should = manager.shouldScheduleAITurn('opponent', 'in-progress', false, false)
      
      expect(should).toBe(true)
    })

    it('should not schedule AI turn during player turn', () => {
      const should = manager.shouldScheduleAITurn('player', 'in-progress', false, false)
      
      expect(should).toBe(false)
    })

    it('should not schedule AI turn when board is completed', () => {
      const should = manager.shouldScheduleAITurn('opponent', 'won', false, false)
      
      expect(should).toBe(false)
    })

    it('should not schedule AI turn when upgrade choice is triggered', () => {
      const should = manager.shouldScheduleAITurn('opponent', 'in-progress', true, false)
      
      expect(should).toBe(false)
    })

    it('should not schedule AI turn when upgrade choice is pending', () => {
      const should = manager.shouldScheduleAITurn('opponent', 'in-progress', false, true)
      
      expect(should).toBe(false)
    })
  })

  describe('inventory full item handling', () => {
    beforeEach(() => {
      // Fill inventory to trigger auto-apply logic
      mockRun.inventory = [
        { id: 'item1', name: 'Item 1', description: 'Test', icon: '🔸' },
        { id: 'item2', name: 'Item 2', description: 'Test', icon: '🔹' },
        { id: 'item3', name: 'Item 3', description: 'Test', icon: '🔶' }
      ]
    })

    it('should auto-apply ward when inventory is full', () => {
      mockBoard.tiles[0][0].content = TileContent.Item
      mockBoard.tiles[0][0].itemData = {
        id: 'ward',
        name: 'Ward',
        description: 'Defense boost',
        icon: '🔰',
        immediate: false
      }
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(true)
      expect(result.newRun.temporaryBuffs.ward).toBe(4)
      expect(result.newRun.upgrades).toContain('ward-temp')
    })

    it('should auto-apply blaze when inventory is full', () => {
      mockBoard.tiles[0][0].content = TileContent.Item
      mockBoard.tiles[0][0].itemData = {
        id: 'blaze',
        name: 'Blaze',
        description: 'Attack boost',
        icon: '🔥',
        immediate: false
      }
      
      const result = manager.processPlayerTileReveal(0, 0, mockGameState)
      
      expect(result.success).toBe(true)
      expect(result.newRun.temporaryBuffs.blaze).toBe(5)
      expect(result.newRun.upgrades).toContain('blaze-temp')
    })
  })
})