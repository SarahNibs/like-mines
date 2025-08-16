/**
 * GameCoordinator - Central orchestrator for all game operations
 * Uses complete delegation pattern: store never touches managers directly
 */

import { GameState, Tile, TileContent, Item, PermanentUpgrade } from './types'
import { GameFlowManager, GameFlowResult } from './GameFlowManager'
import { createCharacterRunState, createBoardForLevel } from './gameLogic'
import { generateClue } from './clues'

export interface CoordinatorResult {
  newState: Partial<GameState> | GameState
  shouldTriggerAI?: boolean
  shouldShowShop?: boolean
  nextBoardDelay?: number
  error?: string
}

export class GameCoordinator {
  private gameFlowManager: GameFlowManager

  constructor() {
    this.gameFlowManager = new GameFlowManager()
  }

  // === GAME FLOW OPERATIONS ===
  
  selectCharacter(currentState: GameState, characterId: string): CoordinatorResult {
    if (currentState.gameStatus !== 'character-select') {
      return { newState: {}, error: 'Character already selected' }
    }

    try {
      // Create character-specific run state
      const characterRun = createCharacterRunState(characterId)
      
      // Create board for level 1 with character upgrades applied
      const board = createBoardForLevel(1, characterRun.gold, characterRun.upgrades)
      
      // Apply WISDOM upgrade: add detector scan to random tile (for level 1)
      if (characterRun.upgrades.includes('wisdom')) {
        const allTiles = []
        for (let y = 0; y < board.height; y++) {
          for (let x = 0; x < board.width; x++) {
            allTiles.push({x, y})
          }
        }
        
        if (allTiles.length > 0) {
          const randomTile = allTiles[Math.floor(Math.random() * allTiles.length)]
          const tile = board.tiles[randomTile.y][randomTile.x]
          
          // Apply detector scan (same logic as detector item)
          let playerAdjacent = 0
          let opponentAdjacent = 0
          let neutralAdjacent = 0
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue
              const adjY = randomTile.y + dy
              const adjX = randomTile.x + dx
              if (adjY >= 0 && adjY < board.height && adjX >= 0 && adjX < board.width) {
                const adjTile = board.tiles[adjY][adjX]
                if (adjTile.type === 'player') playerAdjacent++
                else if (adjTile.type === 'opponent') opponentAdjacent++
                else if (adjTile.type === 'neutral') neutralAdjacent++
              }
            }
          }
          
          // Set detector scan results
          tile.detectorResult = {
            player: playerAdjacent,
            opponent: opponentAdjacent,  
            neutral: neutralAdjacent
          }
        }
      }
      
      // Generate initial clue with character upgrades
      const initialClue = generateClue(board, characterRun.upgrades)
      
      // Create complete game state
      const newGameState: GameState = {
        board,
        currentTurn: 'player',
        gameStatus: 'playing',
        boardStatus: 'in-progress',
        clues: [initialClue],
        run: characterRun,
        transmuteMode: false,
        detectorMode: false,
        keyMode: false,
        staffMode: false,
        ringMode: false,
        shopOpen: false,
        shopItems: [],
        selectedCharacter: characterId,
        upgradeChoice: null
      }
      
      return { newState: newGameState }
    } catch (error) {
      return { newState: {}, error: `Error creating character run state: ${error}` }
    }
  }

  endTurn(currentState: GameState): CoordinatorResult {
    const result = this.gameFlowManager.endTurn(currentState)
    return this.convertFlowResult(result)
  }

  handleBoardWon(currentState: GameState): CoordinatorResult {
    const result = this.gameFlowManager.handleBoardWon(currentState)
    return this.convertFlowResult(result)
  }

  handleBoardLost(currentState: GameState): CoordinatorResult {
    const result = this.gameFlowManager.handleBoardLost(currentState)
    return this.convertFlowResult(result)
  }

  progressToNextBoard(currentState: GameState): CoordinatorResult {
    const result = this.gameFlowManager.progressToNextBoard(currentState)
    return this.convertFlowResult(result)
  }

  resetGame(): CoordinatorResult {
    const result = this.gameFlowManager.resetGame()
    return this.convertFlowResult(result)
  }

  // === TILE OPERATIONS ===

  revealTile(currentState: GameState, x: number, y: number): CoordinatorResult {
    // Validate tile reveal
    if (!this.canRevealTile(currentState, x, y)) {
      return { newState: {}, error: 'Cannot reveal tile' }
    }

    const tile = currentState.board.tiles[y][x]
    if (tile.revealed) {
      return { newState: {}, error: 'Tile already revealed' }
    }

    // Create new board state with revealed tile
    const newTiles = currentState.board.tiles.map((row, rowIndex) =>
      row.map((t, colIndex) => {
        if (rowIndex === y && colIndex === x) {
          return { ...t, revealed: true }
        }
        return t
      })
    )

    let updatedState: Partial<GameState> = {
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    }

    // Handle tile content effects
    const contentResult = this.handleTileContent(currentState, tile)
    if (contentResult.newState && Object.keys(contentResult.newState).length > 0) {
      updatedState = { ...updatedState, ...contentResult.newState }
    }

    // Check if this ends the turn
    if (tile.type === 'player') {
      // Player tile - check for win condition
      const hasUnrevealedPlayerTiles = newTiles.some(row =>
        row.some(t => t.type === 'player' && !t.revealed)
      )
      
      if (!hasUnrevealedPlayerTiles) {
        // Player won the board
        const winResult = this.handleBoardWon({ ...currentState, ...updatedState })
        return {
          ...winResult,
          newState: { ...updatedState, ...winResult.newState }
        }
      }
      
      // Continue player turn for player tiles
      return { newState: updatedState }
    } else {
      // Non-player tile - end turn
      const endTurnResult = this.endTurn({ ...currentState, ...updatedState })
      return {
        ...endTurnResult,
        newState: { ...updatedState, ...endTurnResult.newState }
      }
    }
  }

  private canRevealTile(currentState: GameState, x: number, y: number): boolean {
    return (
      currentState.gameStatus === 'playing' &&
      currentState.boardStatus === 'in-progress' &&
      currentState.currentTurn === 'player' &&
      !currentState.upgradeChoice &&
      !currentState.shopOpen &&
      y >= 0 && y < currentState.board.tiles.length &&
      x >= 0 && x < currentState.board.tiles[0].length
    )
  }

  private handleTileContent(currentState: GameState, tile: Tile): CoordinatorResult {
    if (!tile.content) {
      return { newState: {} }
    }

    switch (tile.content.type) {
      case 'monster':
        return this.handleMonsterTile(currentState, tile.content)
      case 'gold':
        return this.handleGoldTile(currentState, tile.content.amount || 1)
      case 'item':
        return this.handleItemTile(currentState, tile.content.item!)
      case 'permanent-upgrade':
        return this.handleUpgradeTile(currentState)
      case 'shop':
        return this.handleShopTile(currentState)
      default:
        return { newState: {} }
    }
  }

  private handleMonsterTile(currentState: GameState, content: TileContent): CoordinatorResult {
    const damage = content.damage || 1
    const newHp = Math.max(0, currentState.run.hp - damage)
    
    if (newHp <= 0) {
      // Player died - game over
      return {
        newState: {
          run: { ...currentState.run, hp: 0 },
          gameStatus: 'opponent-won'
        }
      }
    }

    return {
      newState: {
        run: { ...currentState.run, hp: newHp }
      }
    }
  }

  private handleGoldTile(currentState: GameState, amount: number): CoordinatorResult {
    return {
      newState: {
        run: {
          ...currentState.run,
          gold: currentState.run.gold + amount
        }
      }
    }
  }

  private handleItemTile(currentState: GameState, item: Item): CoordinatorResult {
    const newInventory = [...currentState.run.inventory, item]
    return {
      newState: {
        run: {
          ...currentState.run,
          inventory: newInventory
        }
      }
    }
  }

  private handleUpgradeTile(currentState: GameState): CoordinatorResult {
    // Generate upgrade choices and trigger selection UI
    const upgradeChoices = this.generateUpgradeChoices()
    return {
      newState: {
        upgradeChoice: {
          choices: upgradeChoices,
          source: 'tile'
        }
      }
    }
  }

  private handleShopTile(currentState: GameState): CoordinatorResult {
    return {
      newState: {
        shopOpen: true
      }
    }
  }

  // === UPGRADE OPERATIONS ===

  chooseUpgrade(currentState: GameState, upgradeIndex: number): CoordinatorResult {
    if (!currentState.upgradeChoice || upgradeIndex < 0 || upgradeIndex >= currentState.upgradeChoice.choices.length) {
      return { newState: {}, error: 'Invalid upgrade choice' }
    }

    const selectedUpgrade = currentState.upgradeChoice.choices[upgradeIndex]
    const newUpgrades = [...currentState.run.upgrades, selectedUpgrade.id]

    return {
      newState: {
        run: {
          ...currentState.run,
          upgrades: newUpgrades
        },
        upgradeChoice: null // Clear the choice
      },
      shouldTriggerAI: true // AI takes turn after upgrade choice
    }
  }

  private generateUpgradeChoices(): PermanentUpgrade[] {
    // TODO: Implement proper upgrade generation logic
    // For now, return dummy upgrades
    return [
      { id: 'armor1', name: 'Basic Armor', description: '+1 armor', type: 'armor', value: 1 },
      { id: 'clue1', name: 'Better Clues', description: '+1 clue pool size', type: 'clue', value: 1 },
      { id: 'inventory1', name: 'Bigger Pack', description: '+2 inventory slots', type: 'inventory', value: 2 }
    ]
  }

  // === SHOP OPERATIONS ===

  openShop(currentState: GameState): CoordinatorResult {
    return {
      newState: {
        shopOpen: true
      }
    }
  }

  closeShop(currentState: GameState): CoordinatorResult {
    const result: CoordinatorResult = {
      newState: {
        shopOpen: false
      }
    }

    // If board was won while shop was open, trigger progression
    if (currentState.boardStatus === 'won') {
      const progressResult = this.handleBoardWon({ ...currentState, shopOpen: false })
      return {
        ...result,
        newState: { ...result.newState, ...progressResult.newState },
        shouldTriggerAI: progressResult.shouldTriggerAI,
        nextBoardDelay: progressResult.nextBoardDelay
      }
    }

    return result
  }

  purchaseShopItem(currentState: GameState, itemId: string): CoordinatorResult {
    // TODO: Implement shop purchase logic
    return { newState: {}, error: 'Shop purchase not implemented' }
  }

  // === ITEM OPERATIONS ===

  useItem(currentState: GameState, itemId: string): CoordinatorResult {
    const itemIndex = currentState.run.inventory.findIndex(item => item.id === itemId)
    if (itemIndex === -1) {
      return { newState: {}, error: 'Item not found in inventory' }
    }

    const item = currentState.run.inventory[itemIndex]
    
    // TODO: Implement item effects
    // For now, just remove the item from inventory
    const newInventory = [...currentState.run.inventory]
    newInventory.splice(itemIndex, 1)

    return {
      newState: {
        run: {
          ...currentState.run,
          inventory: newInventory
        }
      }
    }
  }

  // === AI OPERATIONS ===

  performAITurn(currentState: GameState): CoordinatorResult {
    if (!this.gameFlowManager.shouldTriggerAITurn(currentState, false)) {
      return { newState: {} }
    }

    // TODO: Implement AI turn logic
    // For now, just end AI turn
    return {
      newState: {
        currentTurn: 'player'
      }
    }
  }

  // === DEBUG OPERATIONS ===

  debugAddGold(currentState: GameState, amount: number = 1): CoordinatorResult {
    return {
      newState: {
        run: {
          ...currentState.run,
          gold: currentState.run.gold + amount
        }
      }
    }
  }

  debugAddHealth(currentState: GameState, amount: number = 10): CoordinatorResult {
    const newHp = Math.min(currentState.run.maxHp, currentState.run.hp + amount)
    return {
      newState: {
        run: {
          ...currentState.run,
          hp: newHp
        }
      }
    }
  }

  debugTriggerUpgradeChoice(currentState: GameState): CoordinatorResult {
    return this.handleUpgradeTile(currentState)
  }

  debugRevealAllPlayerTiles(currentState: GameState): CoordinatorResult {
    const newTiles = currentState.board.tiles.map(row =>
      row.map(tile => {
        if (tile.type === 'player') {
          return { ...tile, revealed: true }
        }
        return tile
      })
    )

    const updatedState = {
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    }

    // Check for win condition
    const hasUnrevealedPlayerTiles = newTiles.some(row =>
      row.some(t => t.type === 'player' && !t.revealed)
    )

    if (!hasUnrevealedPlayerTiles) {
      const winResult = this.handleBoardWon({ ...currentState, ...updatedState })
      return {
        ...winResult,
        newState: { ...updatedState, ...winResult.newState }
      }
    }

    return { newState: updatedState }
  }

  // === UTILITY METHODS ===

  private convertFlowResult(flowResult: GameFlowResult): CoordinatorResult {
    return {
      newState: flowResult.newState,
      shouldTriggerAI: flowResult.shouldTriggerAI,
      shouldShowShop: flowResult.shouldShowShop,
      nextBoardDelay: flowResult.nextBoardDelay
    }
  }

  // === QUERY METHODS ===

  isGamePlayable(currentState: GameState): boolean {
    return this.gameFlowManager.isGamePlayable(currentState)
  }

  getCurrentPhase(currentState: GameState): string {
    return this.gameFlowManager.getCurrentPhase(currentState)
  }

  canTransitionTo(currentState: GameState, newStatus: any): boolean {
    return this.gameFlowManager.canTransitionTo(currentState, newStatus)
  }
}