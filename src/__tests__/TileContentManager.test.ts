/**
 * Tests for TileContentManager
 */

import { TileContentManager } from '../TileContentManager'
import { RunState, Board, Tile, TileContent } from '../types'

// Mock the gameLogic module
jest.mock('../gameLogic', () => ({
  addItemToInventory: jest.fn((run, item) => {
    run.inventory.push(item)
  }),
  applyItemEffect: jest.fn((run, item) => {
    if (item.id === 'healing-potion') {
      run.hp += 20
      return 'Healing potion restores 20 HP!'
    } else if (item.id === 'bear-trap') {
      run.hp -= 10
      return 'Bear trap triggers for 10 damage!'
    }
    return `${item.name} effect applied`
  }),
  fightMonster: jest.fn((run, monster) => {
    // Simple fight logic for testing
    const damage = Math.max(0, monster.attack - run.defense)
    return {
      damage,
      monsterDefeated: monster.hp <= run.attack
    }
  })
}))

// Mock the items module
jest.mock('../items', () => ({
  CHEST: {
    id: 'chest',
    name: 'Treasure Chest',
    description: 'Contains gold',
    icon: '📦'
  }
}))

describe('TileContentManager', () => {
  let manager: TileContentManager
  let mockRun: RunState
  let mockBoard: Board
  let mockTile: Tile

  beforeEach(() => {
    manager = new TileContentManager()
    
    mockRun = {
      inventory: [],
      temporaryBuffs: {},
      upgrades: [],
      hp: 50,
      maxHp: 100,
      gold: 100,
      attack: 10,
      defense: 5,
      loot: 2,
      trophies: []
    } as RunState

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
          contentVisible: false
        }
      }
    }

    mockBoard = {
      width: 5,
      height: 5,
      tiles
    } as Board

    mockTile = {
      x: 2,
      y: 2,
      revealed: false,
      owner: 'player',
      content: TileContent.Empty,
      contentVisible: false
    } as Tile
  })

  describe('upgrade tile handling', () => {
    it('should trigger upgrade choice for upgrade tiles', () => {
      mockTile.content = TileContent.PermanentUpgrade
      mockTile.upgradeData = {
        id: 'attack',
        name: 'Attack Boost',
        description: '+1 attack',
        icon: '⚔️',
        repeatable: true
      }
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.triggerUpgradeChoice).toBe(true)
      expect(result.preventAI).toBe(true)
      expect(result.message).toBe('Found upgrade! Choose your enhancement.')
    })
  })

  describe('item tile handling', () => {
    it('should handle immediate effect items', () => {
      mockTile.content = TileContent.Item
      mockTile.itemData = {
        id: 'healing-potion',
        name: 'Healing Potion',
        description: 'Restores HP',
        icon: '🧪',
        immediate: true
      }
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('Healing potion restores 20 HP!')
      expect(result.updatedRun.hp).toBe(70) // 50 + 20
    })

    it('should handle immediate items that cause death', () => {
      mockTile.content = TileContent.Item
      mockTile.itemData = {
        id: 'bear-trap',
        name: 'Bear Trap',
        description: 'Deals damage',
        icon: '🪤',
        immediate: true
      }
      mockRun.hp = 5 // Low HP so trap kills player
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.playerDied).toBe(true)
      expect(result.updatedRun.hp).toBeLessThanOrEqual(0)
    })

    it('should add non-immediate items to inventory', () => {
      mockTile.content = TileContent.Item
      mockTile.itemData = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A sharp blade',
        icon: '⚔️',
        immediate: false
      }
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('Picked up Iron Sword!')
      expect(result.updatedRun.inventory).toHaveLength(1)
    })

    it('should auto-apply ward when inventory is full', () => {
      mockTile.content = TileContent.Item
      mockTile.itemData = {
        id: 'ward',
        name: 'Ward',
        description: 'Defense boost',
        icon: '🛡️'
      }
      // Fill inventory
      mockRun.inventory = [null, null, null] as any
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.message).toContain('Ward auto-applied')
      expect(result.updatedRun.temporaryBuffs.ward).toBe(4)
      expect(result.updatedRun.upgrades).toContain('ward-temp')
    })

    it('should auto-apply blaze when inventory is full', () => {
      mockTile.content = TileContent.Item
      mockTile.itemData = {
        id: 'blaze',
        name: 'Blaze',
        description: 'Attack boost',
        icon: '🔥'
      }
      // Fill inventory
      mockRun.inventory = [null, null, null] as any
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.message).toContain('Blaze auto-applied')
      expect(result.updatedRun.temporaryBuffs.blaze).toBe(5)
      expect(result.updatedRun.upgrades).toContain('blaze-temp')
    })

    it('should handle inventory full for other items', () => {
      mockTile.content = TileContent.Item
      mockTile.itemData = {
        id: 'sword',
        name: 'Iron Sword',
        description: 'A sharp blade',
        icon: '⚔️'
      }
      // Fill inventory
      mockRun.inventory = [null, null, null] as any
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('Inventory full! Could not pick up Iron Sword.')
    })
  })

  describe('monster tile handling', () => {
    it('should handle monster fights with player victory', () => {
      mockTile.content = TileContent.Monster
      mockTile.monsterData = {
        id: 'rat',
        name: 'Rat',
        icon: '🐀',
        attack: 3,
        defense: 0,
        hp: 5
      }
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.message).toContain('Monster defeated!')
      expect(result.updatedRun.gold).toBe(102) // 100 + 2 loot
    })

    it('should handle monster fights with player death', () => {
      mockTile.content = TileContent.Monster
      mockTile.monsterData = {
        id: 'dragon',
        name: 'Dragon',
        icon: '🐉',
        attack: 60, // High damage to kill player
        defense: 0,
        hp: 100
      }
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.playerDied).toBe(true)
      expect(result.message).toContain('Monster defeated you!')
    })

    it('should handle trophy theft to prevent death', () => {
      mockTile.content = TileContent.Monster
      mockTile.monsterData = {
        id: 'orc',
        name: 'Orc',
        icon: '👹',
        attack: 60, // High damage to kill player
        defense: 0,
        hp: 100
      }
      // Give player a gold trophy to steal
      mockRun.trophies = [{
        id: 'gold1',
        type: 'gold',
        stolen: false
      }] as any
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.message).toContain('Orc stole a gold trophy! You survive with 1 HP.')
      expect(result.updatedRun.hp).toBe(1)
      expect(result.updatedRun.trophies[0].stolen).toBe(true)
      expect(result.updatedRun.trophies[0].stolenBy).toBe('Orc')
    })

    it('should trigger RICH effect when monster is defeated', () => {
      mockTile.content = TileContent.Monster
      mockTile.monsterData = {
        id: 'goblin',
        name: 'Goblin',
        icon: '👺',
        attack: 3,
        defense: 0,
        hp: 5
      }
      mockRun.upgrades = ['rich']
      
      // Set up adjacent empty tile for chest placement
      mockBoard.tiles[1][2].content = TileContent.Empty
      mockBoard.tiles[1][2].revealed = false
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.boardModified).toBe(true)
      expect(result.message).toContain('RICH upgrade triggered!')
    })
  })

  describe('shop tile handling', () => {
    it('should trigger shop opening', () => {
      mockTile.content = TileContent.Shop
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.triggerShop).toBe(true)
      expect(result.message).toBe('Shop discovered! Browse items and upgrades.')
    })
  })

  describe('gold tile handling', () => {
    it('should award gold', () => {
      mockTile.content = TileContent.Gold
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('Found 3 gold!')
      expect(result.updatedRun.gold).toBe(103) // 100 + 3
    })
  })

  describe('trap tile handling', () => {
    it('should apply trap damage normally', () => {
      mockTile.content = TileContent.Trap
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('Bear Trap triggered! You take 10 damage.')
      expect(result.updatedRun.hp).toBe(40) // 50 - 10
    })

    it('should use trophy to prevent death from trap', () => {
      mockTile.content = TileContent.Trap
      mockRun.hp = 5 // Low HP so trap would kill
      mockRun.trophies = [{
        id: 'gold1',
        type: 'gold',
        stolen: false
      }] as any
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.message).toContain('A gold trophy was stolen but you survive with 1 HP.')
      expect(result.updatedRun.hp).toBe(1)
      expect(result.updatedRun.trophies[0].stolen).toBe(true)
      expect(result.updatedRun.trophies[0].stolenBy).toBe('Bear Trap')
    })

    it('should cause death when no trophy available', () => {
      mockTile.content = TileContent.Trap
      mockRun.hp = 5 // Low HP so trap kills
      // No trophies available
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.playerDied).toBe(true)
      expect(result.message).toBe('Bear Trap triggered! You take 10 damage and die.')
      expect(result.updatedRun.hp).toBe(0)
    })
  })

  describe('empty tile handling', () => {
    it('should handle empty tiles', () => {
      mockTile.content = TileContent.Empty
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(true)
      expect(result.message).toBe('Empty tile revealed')
    })
  })

  describe('RICH effect functionality', () => {
    it('should place chest on adjacent tile when RICH upgrade present', () => {
      mockRun.upgrades = ['rich']
      
      // Set up adjacent empty tiles
      mockBoard.tiles[1][2].content = TileContent.Empty
      mockBoard.tiles[1][2].revealed = false
      mockBoard.tiles[3][2].content = TileContent.Empty
      mockBoard.tiles[3][2].revealed = false
      
      const result = manager.applyRichEffect(mockBoard, 2, 2, mockRun)
      
      expect(result.success).toBe(true)
      expect(result.chestPlaced).toBe(true)
      expect(result.placementPosition).toBeDefined()
      expect(result.message).toContain('Treasure chest placed')
      
      // Check that a chest was actually placed
      const chestTile = mockBoard.tiles[result.placementPosition!.y][result.placementPosition!.x]
      expect(chestTile.content).toBe(TileContent.Item)
      expect(chestTile.contentVisible).toBe(true)
    })

    it('should fail when no RICH upgrade', () => {
      const result = manager.applyRichEffect(mockBoard, 2, 2, mockRun)
      
      expect(result.success).toBe(false)
      expect(result.chestPlaced).toBe(false)
      expect(result.message).toBe('No RICH upgrade to apply')
    })

    it('should fail when no adjacent tiles available', () => {
      mockRun.upgrades = ['rich']
      
      // Make all adjacent tiles revealed or non-empty
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const adjTile = mockBoard.tiles[2 + dy][2 + dx]
          adjTile.revealed = true // Make revealed so not available
        }
      }
      
      const result = manager.applyRichEffect(mockBoard, 2, 2, mockRun)
      
      expect(result.success).toBe(false)
      expect(result.chestPlaced).toBe(false)
      expect(result.message).toBe('No adjacent tiles available for RICH chest placement')
    })
  })

  describe('trophy theft functionality', () => {
    it('should steal gold trophy when available', () => {
      mockRun.trophies = [
        { id: 'silver1', type: 'silver', stolen: false },
        { id: 'gold1', type: 'gold', stolen: false },
        { id: 'gold2', type: 'gold', stolen: true, stolenBy: 'Other Monster' }
      ] as any
      
      const result = manager.stealGoldTrophy(mockRun, 'Dragon')
      
      expect(result.success).toBe(true)
      expect(result.updatedRun.trophies[1].stolen).toBe(true)
      expect(result.updatedRun.trophies[1].stolenBy).toBe('Dragon')
    })

    it('should fail when no gold trophies available', () => {
      mockRun.trophies = [
        { id: 'silver1', type: 'silver', stolen: false },
        { id: 'gold1', type: 'gold', stolen: true, stolenBy: 'Other Monster' }
      ] as any
      
      const result = manager.stealGoldTrophy(mockRun, 'Dragon')
      
      expect(result.success).toBe(false)
      expect(result.updatedRun).toBe(mockRun)
    })

    it('should fail when no trophies at all', () => {
      mockRun.trophies = []
      
      const result = manager.stealGoldTrophy(mockRun, 'Dragon')
      
      expect(result.success).toBe(false)
      expect(result.updatedRun).toBe(mockRun)
    })
  })

  describe('validation and utility functions', () => {
    it('should validate tile content correctly', () => {
      // Valid monster tile
      const monsterTile = {
        content: TileContent.Monster,
        monsterData: { name: 'Rat', hp: 5 }
      } as Tile
      expect(manager.validateTileContent(monsterTile)).toEqual({ valid: true })

      // Invalid monster tile
      const invalidMonsterTile = {
        content: TileContent.Monster
      } as Tile
      expect(manager.validateTileContent(invalidMonsterTile)).toEqual({
        valid: false,
        reason: 'Monster tile missing monster data'
      })

      // Valid item tile
      const itemTile = {
        content: TileContent.Item,
        itemData: { name: 'Sword' }
      } as Tile
      expect(manager.validateTileContent(itemTile)).toEqual({ valid: true })

      // Empty tile
      const emptyTile = {
        content: TileContent.Empty
      } as Tile
      expect(manager.validateTileContent(emptyTile)).toEqual({ valid: true })
    })

    it('should generate tile content summaries', () => {
      expect(manager.getTileContentSummary({
        content: TileContent.Monster,
        monsterData: { name: 'Orc', hp: 10 }
      } as Tile)).toBe('Monster: Orc (10 HP)')

      expect(manager.getTileContentSummary({
        content: TileContent.Item,
        itemData: { name: 'Sword' }
      } as Tile)).toBe('Item: Sword')

      expect(manager.getTileContentSummary({
        content: TileContent.Shop
      } as Tile)).toBe('Shop')

      expect(manager.getTileContentSummary({
        content: TileContent.Gold
      } as Tile)).toBe('Gold (3)')

      expect(manager.getTileContentSummary({
        content: TileContent.Trap
      } as Tile)).toBe('Bear Trap (10 damage)')

      expect(manager.getTileContentSummary({
        content: TileContent.Empty
      } as Tile)).toBe('Empty')
    })
  })

  describe('error handling', () => {
    it('should handle invalid monster data', () => {
      mockTile.content = TileContent.Monster
      mockTile.monsterData = undefined
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid monster data')
    })

    it('should handle invalid item data', () => {
      mockTile.content = TileContent.Item
      mockTile.itemData = undefined
      
      const result = manager.handleTileContent(mockTile, mockRun, mockBoard)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid item data')
    })

    it('should handle missing content data gracefully', () => {
      const monsterTile = {
        content: TileContent.Monster
      } as Tile
      expect(manager.getTileContentSummary(monsterTile)).toBe('Unknown Monster')

      const itemTile = {
        content: TileContent.Item
      } as Tile
      expect(manager.getTileContentSummary(itemTile)).toBe('Unknown Item')

      const upgradeTile = {
        content: TileContent.PermanentUpgrade
      } as Tile
      expect(manager.getTileContentSummary(upgradeTile)).toBe('Unknown Upgrade')
    })
  })
})