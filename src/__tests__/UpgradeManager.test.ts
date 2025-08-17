/**
 * UpgradeManager Tests
 */

import { UpgradeManager } from '../UpgradeManager'
import { RunState, Board, TileContent, TileOwner } from '../types'

describe('UpgradeManager', () => {
  let manager: UpgradeManager
  let mockRun: RunState
  let mockBoard: Board

  beforeEach(() => {
    manager = new UpgradeManager()
    mockRun = {
      currentLevel: 1,
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
      character: {
        id: 'fighter',
        name: 'Fighter',
        description: 'A brave warrior',
        startingHp: 10,
        startingItems: [],
        startingUpgrades: []
      }
    }

    mockBoard = {
      width: 5,
      height: 5,
      tiles: Array(5).fill(null).map((_, y) =>
        Array(5).fill(null).map((_, x) => ({
          x,
          y,
          owner: TileOwner.Neutral,
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
      playerTilesTotal: 0,
      opponentTilesTotal: 0,
      playerTilesRevealed: 0,
      opponentTilesRevealed: 0
    }
  })

  describe('applyUpgrade', () => {
    it('should apply attack upgrade and increase attack stat', () => {
      const result = manager.applyUpgrade(mockRun, 'attack')

      expect(result.success).toBe(true)
      expect(result.newRun.attack).toBe(7) // 5 + 2
      expect(result.newRun.upgrades).toContain('attack')
      expect(result.message).toContain('Applied attack upgrade')
    })

    it('should apply defense upgrade and increase defense stat', () => {
      const result = manager.applyUpgrade(mockRun, 'defense')

      expect(result.success).toBe(true)
      expect(result.newRun.defense).toBe(3) // 2 + 1
      expect(result.newRun.upgrades).toContain('defense')
    })

    it('should apply healthy upgrade and increase max HP', () => {
      const result = manager.applyUpgrade(mockRun, 'healthy')

      expect(result.success).toBe(true)
      expect(result.newRun.maxHp).toBe(35) // 10 + 25
      expect(result.newRun.upgrades).toContain('healthy')
    })

    it('should apply income upgrade and increase loot', () => {
      const result = manager.applyUpgrade(mockRun, 'income')

      expect(result.success).toBe(true)
      expect(result.newRun.loot).toBe(2) // 1 + 1
      expect(result.newRun.upgrades).toContain('income')
    })

    it('should apply bag upgrade and add inventory slot', () => {
      const result = manager.applyUpgrade(mockRun, 'bag')

      expect(result.success).toBe(true)
      expect(result.newRun.maxInventory).toBe(4) // 3 + 1
      expect(result.newRun.inventory.length).toBe(4)
      expect(result.newRun.inventory[3]).toBe(null)
      expect(result.newRun.upgrades).toContain('bag')
    })

    it('should apply passive upgrades without immediate effects', () => {
      const passiveUpgrades = ['quick', 'rich', 'wisdom', 'traders', 'left-hand', 'right-hand', 'resting']
      
      passiveUpgrades.forEach(upgradeId => {
        const result = manager.applyUpgrade(mockRun, upgradeId)
        
        expect(result.success).toBe(true)
        expect(result.newRun.upgrades).toContain(upgradeId)
        expect(result.message).toContain(`Applied ${upgradeId} upgrade`)
      })
    })

    it('should allow multiple instances of repeatable upgrades', () => {
      const runWithAttack = manager.applyUpgrade(mockRun, 'attack').newRun
      const result = manager.applyUpgrade(runWithAttack, 'attack')

      expect(result.success).toBe(true)
      expect(result.newRun.attack).toBe(9) // 5 + 2 + 2
      expect(result.newRun.upgrades.filter(id => id === 'attack').length).toBe(2)
    })

    it('should reject non-repeatable upgrades if already owned', () => {
      // Add a non-repeatable upgrade (assuming 'quick' is non-repeatable)
      const runWithQuick = manager.applyUpgrade(mockRun, 'quick').newRun
      const result = manager.applyUpgrade(runWithQuick, 'quick')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Already have quick upgrade')
      expect(result.newRun.upgrades.filter(id => id === 'quick').length).toBe(1)
    })

    it('should handle unknown upgrade IDs', () => {
      const result = manager.applyUpgrade(mockRun, 'unknown-upgrade')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Unknown upgrade')
      expect(result.newRun.upgrades.length).toBe(0)
    })

    it('should not modify original run state', () => {
      const originalUpgrades = [...mockRun.upgrades]
      const originalAttack = mockRun.attack

      manager.applyUpgrade(mockRun, 'attack')

      expect(mockRun.upgrades).toEqual(originalUpgrades)
      expect(mockRun.attack).toBe(originalAttack)
    })
  })

  describe('applyRichUpgrade', () => {
    it('should place treasure chest on adjacent empty tile', async () => {
      const result = await manager.applyRichUpgrade(mockBoard, 2, 2)

      expect(result.success).toBe(true)
      expect(result.placementEffect).toBeDefined()
      expect(result.placementEffect?.type).toBe('rich')
      expect(result.placementEffect?.coordinates).toBeDefined()
      expect(result.message).toContain('placed treasure chest')

      // Check that a tile was modified
      const coords = result.placementEffect!.coordinates
      const newBoard = result.placementEffect!.newBoard!
      const modifiedTile = newBoard.tiles[coords.y][coords.x]
      expect(modifiedTile.content).toBe(TileContent.Item)
      expect(modifiedTile.itemData).toBeDefined()
    })

    it('should handle case with no valid adjacent tiles', async () => {
      // Create a board where all adjacent tiles are revealed or non-empty
      const boardWithNoEmpty = { ...mockBoard }
      for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
          if (x === 2 && y === 2) continue // Skip center
          boardWithNoEmpty.tiles[y][x].revealed = true
        }
      }

      const result = await manager.applyRichUpgrade(boardWithNoEmpty, 2, 2)

      expect(result.success).toBe(true)
      expect(result.message).toContain('no valid adjacent tiles')
      expect(result.placementEffect).toBeUndefined()
    })

    it('should handle edge coordinates gracefully', async () => {
      const result = await manager.applyRichUpgrade(mockBoard, 0, 0)

      expect(result.success).toBe(true)
      // Should work even at board edge, just with fewer adjacent options
    })
  })

  describe('generateUpgradeChoices', () => {
    it('should generate upgrade choices when upgrades are available', async () => {
      const result = await manager.generateUpgradeChoices([])

      expect(result.success).toBe(true)
      expect(result.upgradeChoice).toBeDefined()
      expect(result.upgradeChoice!.choices.length).toBeGreaterThan(0)
      expect(result.upgradeChoice!.choices.length).toBeLessThanOrEqual(3)
      expect(result.message).toContain('Generated')
    })

    it('should limit choices to maximum of 3', async () => {
      const result = await manager.generateUpgradeChoices([])

      expect(result.upgradeChoice!.choices.length).toBeLessThanOrEqual(3)
    })

    it('should handle scenario with limited upgrades available', async () => {
      // Test with some upgrades already owned (repeatable ones may still be available)
      const someUpgrades = ['quick', 'rich', 'wisdom', 'traders']
      
      const result = await manager.generateUpgradeChoices(someUpgrades)

      expect(result.success).toBe(true)
      expect(result.upgradeChoice).toBeDefined()
      // Should still have repeatable upgrades available like attack, defense, etc.
      expect(result.upgradeChoice!.choices.length).toBeGreaterThan(0)
    })
  })

  describe('getUpgradeInfo', () => {
    it('should return correct info for immediate upgrades', () => {
      const attackInfo = manager.getUpgradeInfo('attack')
      expect(attackInfo.isPassive).toBe(false)
      expect(attackInfo.triggeredBy).toEqual([])
      expect(attackInfo.description).toContain('attack by +2')

      const defenseInfo = manager.getUpgradeInfo('defense')
      expect(defenseInfo.isPassive).toBe(false)
      expect(defenseInfo.description).toContain('defense by +1')
    })

    it('should return correct info for passive upgrades', () => {
      const richInfo = manager.getUpgradeInfo('rich')
      expect(richInfo.isPassive).toBe(true)
      expect(richInfo.triggeredBy).toContain('monster defeat')
      expect(richInfo.description).toContain('treasure chest')

      const quickInfo = manager.getUpgradeInfo('quick')
      expect(quickInfo.isPassive).toBe(true)
      expect(quickInfo.triggeredBy).toContain('board generation')
    })

    it('should handle unknown upgrade IDs', () => {
      const unknownInfo = manager.getUpgradeInfo('unknown')
      expect(unknownInfo.isPassive).toBe(false)
      expect(unknownInfo.description).toBe('Unknown upgrade')
    })
  })

  describe('getUpgradeCount', () => {
    it('should count upgrade instances correctly', () => {
      const runWithUpgrades = {
        ...mockRun,
        upgrades: ['attack', 'defense', 'attack', 'income']
      }

      expect(manager.getUpgradeCount(runWithUpgrades, 'attack')).toBe(2)
      expect(manager.getUpgradeCount(runWithUpgrades, 'defense')).toBe(1)
      expect(manager.getUpgradeCount(runWithUpgrades, 'healthy')).toBe(0)
    })
  })

  describe('shouldTriggerRichUpgrade', () => {
    it('should return true when rich upgrade is owned', () => {
      const runWithRich = {
        ...mockRun,
        upgrades: ['rich', 'attack']
      }

      expect(manager.shouldTriggerRichUpgrade(runWithRich)).toBe(true)
    })

    it('should return false when rich upgrade is not owned', () => {
      const runWithoutRich = {
        ...mockRun,
        upgrades: ['attack', 'defense']
      }

      expect(manager.shouldTriggerRichUpgrade(runWithoutRich)).toBe(false)
    })
  })
})