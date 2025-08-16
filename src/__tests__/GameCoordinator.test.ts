/**
 * GameCoordinator Tests
 * Tests for the central game orchestration system
 */

import { GameCoordinator } from '../GameCoordinator'
import { GameState } from '../types'
import { createInitialGameState, createCharacterRunState } from '../gameLogic'

describe('GameCoordinator', () => {
  let coordinator: GameCoordinator
  let gameState: GameState

  // Helper to create a complete playing game state
  function createPlayingGameState(): GameState {
    const initialState = createInitialGameState()
    initialState.gameStatus = 'character-select'
    
    // Use coordinator to select character and get complete state
    const result = coordinator.selectCharacter(initialState, 'fighter')
    return result.newState as GameState
  }

  beforeEach(() => {
    coordinator = new GameCoordinator()
    gameState = createInitialGameState()
    gameState.gameStatus = 'character-select' // Override to character selection
  })

  describe('Character Selection', () => {
    it('should select character and start game', () => {
      const result = coordinator.selectCharacter(gameState, 'fighter')
      
      expect(result.newState.gameStatus).toBe('playing')
      expect(result.newState.selectedCharacter).toBe('fighter')
      expect(result.error).toBeUndefined()
    })

    it('should not select character if game already started', () => {
      const playingState = { ...gameState, gameStatus: 'playing' as const }
      const result = coordinator.selectCharacter(playingState, 'test-character')
      
      expect(Object.keys(result.newState)).toHaveLength(0)
    })
  })

  describe('Turn Management', () => {
    let playingState: GameState

    beforeEach(() => {
      playingState = createPlayingGameState()
    })

    it('should end player turn and trigger AI', () => {
      const result = coordinator.endTurn(playingState)
      
      expect(result.newState.currentTurn).toBe('opponent')
      expect(result.shouldTriggerAI).toBe(true)
    })

    it('should not end turn if not player turn', () => {
      const opponentTurnState = { ...playingState, currentTurn: 'opponent' as const }
      const result = coordinator.endTurn(opponentTurnState)
      
      expect(Object.keys(result.newState)).toHaveLength(0)
      expect(result.shouldTriggerAI).toBeUndefined()
    })
  })

  describe('Tile Revelation', () => {
    let playingState: GameState

    beforeEach(() => {
      playingState = createPlayingGameState()
    })

    it('should reveal tile and update board state', () => {
      const result = coordinator.revealTile(playingState, 0, 0)
      
      expect(result.newState.board?.tiles?.[0]?.[0]?.revealed).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should not reveal tile if already revealed', () => {
      // First revelation
      const firstResult = coordinator.revealTile(playingState, 0, 0)
      const updatedState = { ...playingState, ...firstResult.newState }
      
      // Second revelation attempt
      const result = coordinator.revealTile(updatedState, 0, 0)
      
      expect(result.error).toBeDefined()
    })

    it('should not reveal tile during opponent turn', () => {
      const opponentTurnState = { ...playingState, currentTurn: 'opponent' as const }
      const result = coordinator.revealTile(opponentTurnState, 0, 0)
      
      expect(result.error).toBeDefined()
    })

    it('should not reveal tile during upgrade choice', () => {
      const upgradeState = {
        ...playingState,
        upgradeChoice: {
          choices: [],
          source: 'tile' as const
        }
      }
      const result = coordinator.revealTile(upgradeState, 0, 0)
      
      expect(result.error).toBeDefined()
    })

    it('should not reveal tile when shop is open', () => {
      const shopState = { ...playingState, shopOpen: true }
      const result = coordinator.revealTile(shopState, 0, 0)
      
      expect(result.error).toBeDefined()
    })
  })

  describe('Tile Content Handling', () => {
    let playingState: GameState

    beforeEach(() => {
      playingState = createPlayingGameState()
    })

    it('should handle monster tile and reduce HP', () => {
      // Set up a monster tile
      const monsterTile = {
        ...playingState.board.tiles[0][0],
        content: { type: 'monster' as const, damage: 2 }
      }
      const stateWithMonster = {
        ...playingState,
        board: {
          ...playingState.board,
          tiles: playingState.board.tiles.map((row, rowIndex) =>
            row.map((tile, colIndex) => 
              rowIndex === 0 && colIndex === 0 ? monsterTile : tile
            )
          )
        }
      }
      
      const result = coordinator.revealTile(stateWithMonster, 0, 0)
      
      expect(result.newState.run?.hp).toBe(playingState.run.hp - 2)
    })

    it('should handle gold tile and increase gold', () => {
      // Set up a gold tile
      const goldTile = {
        ...playingState.board.tiles[0][0],
        content: { type: 'gold' as const, amount: 5 }
      }
      const stateWithGold = {
        ...playingState,
        board: {
          ...playingState.board,
          tiles: playingState.board.tiles.map((row, rowIndex) =>
            row.map((tile, colIndex) => 
              rowIndex === 0 && colIndex === 0 ? goldTile : tile
            )
          )
        }
      }
      
      const result = coordinator.revealTile(stateWithGold, 0, 0)
      
      expect(result.newState.run?.gold).toBe(playingState.run.gold + 5)
    })

    it('should handle upgrade tile and trigger choice', () => {
      // Set up an upgrade tile
      const upgradeTile = {
        ...playingState.board.tiles[0][0],
        content: { type: 'permanent-upgrade' as const }
      }
      const stateWithUpgrade = {
        ...playingState,
        board: {
          ...playingState.board,
          tiles: playingState.board.tiles.map((row, rowIndex) =>
            row.map((tile, colIndex) => 
              rowIndex === 0 && colIndex === 0 ? upgradeTile : tile
            )
          )
        }
      }
      
      const result = coordinator.revealTile(stateWithUpgrade, 0, 0)
      
      expect(result.newState.upgradeChoice).toBeDefined()
      expect(result.newState.upgradeChoice?.choices.length).toBeGreaterThan(0)
    })

    it('should handle shop tile and open shop', () => {
      // Set up a shop tile
      const shopTile = {
        ...playingState.board.tiles[0][0],
        content: { type: 'shop' as const }
      }
      const stateWithShop = {
        ...playingState,
        board: {
          ...playingState.board,
          tiles: playingState.board.tiles.map((row, rowIndex) =>
            row.map((tile, colIndex) => 
              rowIndex === 0 && colIndex === 0 ? shopTile : tile
            )
          )
        }
      }
      
      const result = coordinator.revealTile(stateWithShop, 0, 0)
      
      expect(result.newState.shopOpen).toBe(true)
    })
  })

  describe('Upgrade Operations', () => {
    let playingState: GameState

    beforeEach(() => {
      playingState = createPlayingGameState()
      playingState.upgradeChoice = {
        choices: [
          { id: 'test1', name: 'Test 1', description: 'Test upgrade 1', type: 'armor', value: 1 },
          { id: 'test2', name: 'Test 2', description: 'Test upgrade 2', type: 'clue', value: 1 }
        ],
        source: 'tile'
      }
    })

    it('should choose upgrade and clear choice', () => {
      const result = coordinator.chooseUpgrade(playingState, 0)
      
      expect(result.newState.run?.upgrades).toContain(playingState.upgradeChoice!.choices[0].id)
      expect(result.newState.upgradeChoice).toBeNull()
      expect(result.shouldTriggerAI).toBe(true)
    })

    it('should not choose invalid upgrade index', () => {
      const result = coordinator.chooseUpgrade(playingState, 5)
      
      expect(result.error).toBeDefined()
      expect(Object.keys(result.newState)).toHaveLength(0)
    })

    it('should not choose upgrade when no choice available', () => {
      const noChoiceState = { ...playingState, upgradeChoice: null }
      const result = coordinator.chooseUpgrade(noChoiceState, 0)
      
      expect(result.error).toBeDefined()
      expect(Object.keys(result.newState)).toHaveLength(0)
    })
  })

  describe('Shop Operations', () => {
    let playingState: GameState

    beforeEach(() => {
      playingState = createPlayingGameState()
    })

    it('should open shop', () => {
      const result = coordinator.openShop(playingState)
      
      expect(result.newState.shopOpen).toBe(true)
    })

    it('should close shop', () => {
      const shopOpenState = { ...playingState, shopOpen: true }
      const result = coordinator.closeShop(shopOpenState)
      
      expect(result.newState.shopOpen).toBe(false)
    })

    it('should trigger board progression when closing shop after win', () => {
      const wonState = { ...playingState, shopOpen: true, boardStatus: 'won' as const }
      const result = coordinator.closeShop(wonState)
      
      expect(result.newState.shopOpen).toBe(false)
      expect(result.nextBoardDelay).toBeDefined()
    })
  })

  describe('Debug Operations', () => {
    let playingState: GameState

    beforeEach(() => {
      playingState = createPlayingGameState()
    })

    it('should add gold through debug command', () => {
      const result = coordinator.debugAddGold(playingState, 5)
      
      expect(result.newState.run?.gold).toBe(playingState.run.gold + 5)
    })

    it('should add health through debug command', () => {
      const result = coordinator.debugAddHealth(playingState, 10)
      
      const expectedHp = Math.min(playingState.run.maxHp, playingState.run.hp + 10)
      expect(result.newState.run?.hp).toBe(expectedHp)
    })

    it('should trigger upgrade choice through debug command', () => {
      const result = coordinator.debugTriggerUpgradeChoice(playingState)
      
      expect(result.newState.upgradeChoice).toBeDefined()
      expect(result.newState.upgradeChoice?.choices.length).toBeGreaterThan(0)
    })
  })

  describe('Query Methods', () => {
    it('should check if game is playable', () => {
      const playableState = createPlayingGameState()
      
      expect(coordinator.isGamePlayable(playableState)).toBe(true)
      
      const nonPlayableState = { ...playableState, gameStatus: 'character-select' as const }
      expect(coordinator.isGamePlayable(nonPlayableState)).toBe(false)
    })

    it('should get current phase description', () => {
      const characterSelectState = { ...gameState, gameStatus: 'character-select' as const }
      expect(coordinator.getCurrentPhase(characterSelectState)).toBe('Character Selection')
      
      const playingState = createPlayingGameState()
      playingState.run.currentLevel = 5
      playingState.currentTurn = 'player'
      expect(coordinator.getCurrentPhase(playingState)).toContain('Level 5')
      expect(coordinator.getCurrentPhase(playingState)).toContain('Your Turn')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid tile coordinates', () => {
      const playingState = createPlayingGameState()
      
      const result = coordinator.revealTile(playingState, -1, -1)
      expect(result.error).toBeDefined()
      
      const result2 = coordinator.revealTile(playingState, 1000, 1000)
      expect(result2.error).toBeDefined()
    })

    it('should handle monster damage leading to death', () => {
      const lowHpState = createPlayingGameState()
      lowHpState.run.hp = 1
      
      // Set up a monster tile with high damage
      const monsterTile = {
        ...lowHpState.board.tiles[0][0],
        content: { type: 'monster' as const, damage: 5 }
      }
      const stateWithMonster = {
        ...lowHpState,
        board: {
          ...lowHpState.board,
          tiles: lowHpState.board.tiles.map((row, rowIndex) =>
            row.map((tile, colIndex) => 
              rowIndex === 0 && colIndex === 0 ? monsterTile : tile
            )
          )
        }
      }
      
      const result = coordinator.revealTile(stateWithMonster, 0, 0)
      
      expect(result.newState.run?.hp).toBe(0)
      expect(result.newState.gameStatus).toBe('opponent-won')
    })
  })
})