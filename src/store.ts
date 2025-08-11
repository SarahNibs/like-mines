import { GameState, getTileAt, TileContent } from './types'
import { createInitialGameState, revealTile, checkBoardStatus, progressToNextLevel, fightMonster, addItemToInventory, removeItemFromInventory, applyItemEffect } from './gameLogic'
import { DumbAI, AIOpponent } from './ai'
import { generateClue } from './clues'

// Simple vanilla TypeScript store with observers
class GameStore {
  private state: GameState
  private observers: Array<() => void> = []
  private ai: AIOpponent
  private aiTurnTimeout: number | null = null

  constructor() {
    this.state = createInitialGameState()
    this.ai = new DumbAI()
  }

  // Get current state
  getState(): GameState {
    return this.state
  }

  // Subscribe to state changes
  subscribe(callback: () => void): () => void {
    this.observers.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(callback)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  // Notify all observers of state changes
  private notify(): void {
    this.observers.forEach(callback => callback())
  }

  // Update state and notify observers
  private setState(newState: Partial<GameState>): void {
    this.state = { ...this.state, ...newState }
    this.notify()
  }

  // Actions
  revealTileAt(x: number, y: number): boolean {
    if (this.state.gameStatus !== 'playing' || this.state.currentTurn !== 'player') {
      return false
    }
    
    const tile = getTileAt(this.state.board, x, y)
    if (!tile || tile.revealed) {
      return false
    }
    
    const success = revealTile(this.state.board, x, y, 'player')
    if (success) {
      const newBoardStatus = checkBoardStatus(this.state.board)
      const isPlayerTile = tile.owner === 'player'
      
      // Handle tile content after checking board status
      this.handleTileContent(tile)
      
      // Check if player died after handling content
      if (this.state.gameStatus === 'player-died') {
        return // Exit early if player died
      }
      
      // Player continues turn if they revealed their own tile, otherwise switch to AI
      const newTurn = (newBoardStatus === 'in-progress' && !isPlayerTile) ? 'opponent' : 'player'
      
      this.setState({
        board: { ...this.state.board },
        boardStatus: newBoardStatus,
        currentTurn: newTurn
      })
      
      // Handle board completion
      if (newBoardStatus === 'won') {
        this.handleBoardWon()
      } else if (newBoardStatus === 'lost') {
        this.handleBoardLost()
      } else if (newTurn === 'opponent') {
        // Trigger AI turn after a short delay (only if turn actually switched)
        this.scheduleAITurn()
      }
    }
    
    return success
  }


  // Schedule AI turn with delay for better UX
  private scheduleAITurn(): void {
    if (this.aiTurnTimeout) {
      clearTimeout(this.aiTurnTimeout)
    }
    
    this.aiTurnTimeout = window.setTimeout(() => {
      this.executeAITurn()
    }, 1000) // 1 second delay
  }

  // Execute AI turn
  private executeAITurn(): void {
    if (this.state.gameStatus !== 'playing' || this.state.currentTurn !== 'opponent') {
      return
    }
    
    const aiMove = this.ai.takeTurn(this.state.board)
    if (aiMove) {
      console.log(`AI reveals tile at (${aiMove.x}, ${aiMove.y})`)
      const success = revealTile(this.state.board, aiMove.x, aiMove.y, 'opponent')
      
      if (success) {
        const newBoardStatus = checkBoardStatus(this.state.board)
        
        // Generate new clue when switching to player turn and add to array
        const newClues = newBoardStatus === 'in-progress' ? 
          [...this.state.clues, generateClue(this.state.board)] : this.state.clues
        
        this.setState({
          board: { ...this.state.board },
          boardStatus: newBoardStatus,
          clues: newClues,
          // Switch back to player turn (if board still in progress)
          currentTurn: newBoardStatus === 'in-progress' ? 'player' : 'opponent'
        })
        
        // Handle board completion
        if (newBoardStatus === 'won') {
          this.handleBoardWon()
        } else if (newBoardStatus === 'lost') {
          this.handleBoardLost()
        }
      }
    }
  }

  // Handle board won (player revealed all their tiles first)
  private handleBoardWon(): void {
    console.log('Board won! Preparing for next level...')
    
    // Schedule transition to next level after delay
    setTimeout(() => {
      this.progressToNextBoard()
    }, 2000) // 2 second delay to show victory
  }

  // Handle board lost (AI revealed all their tiles first)
  private handleBoardLost(): void {
    console.log('Board lost! Run ends.')
    this.setState({
      gameStatus: 'opponent-won'
    })
  }

  // End current player turn manually
  endTurn(): void {
    if (this.state.gameStatus !== 'playing' || this.state.currentTurn !== 'player') {
      return
    }
    
    console.log('Player ending turn manually')
    this.setState({
      currentTurn: 'opponent'
    })
    
    // Trigger AI turn (which will generate clue when switching back to player)
    this.scheduleAITurn()
  }

  // Progress to next board
  progressToNextBoard(): void {
    const newState = progressToNextLevel(this.state)
    console.log(`Progressing to level ${newState.run.currentLevel}`)
    
    this.setState(newState)
  }

  // Toggle tile annotation
  toggleAnnotation(x: number, y: number): boolean {
    const tile = getTileAt(this.state.board, x, y)
    if (!tile || tile.revealed) {
      return false
    }
    
    tile.annotated = !tile.annotated
    this.setState({
      board: { ...this.state.board }
    })
    return true
  }

  // Handle tile content when revealed
  private handleTileContent(tile: any): void {
    const run = this.state.run
    
    if (tile.content === TileContent.Item && tile.itemData) {
      const item = tile.itemData
      
      if (item.immediate) {
        // Apply immediate effect
        const message = applyItemEffect(run, item)
        console.log(message) // For now, just log - we'll add a message system later
        
        // Check for game over after immediate effects (like bear trap)
        if (run.hp <= 0) {
          console.log('Player died! Game over.')
          this.setState({ gameStatus: 'player-died' })
          return
        }
      } else {
        // Add to inventory
        const success = addItemToInventory(run, item)
        if (!success) {
          console.log('Inventory full! Item in overflow slot.')
        }
      }
    } else if (tile.content === TileContent.Monster && tile.monsterData) {
      const monster = tile.monsterData
      const damage = fightMonster(monster, run.attack, run.defense)
      run.hp = run.hp - damage
      console.log(`Fought ${monster.name}! Took ${damage} damage. HP: ${run.hp}/${run.maxHp}`)
      
      // Check for game over
      if (run.hp <= 0) {
        console.log('Player died! Game over.')
        this.setState({ gameStatus: 'player-died' })
        return
      }
    }
  }

  // Use item from inventory
  useInventoryItem(index: number): void {
    const item = this.state.run.inventory[index]
    if (!item) return
    
    // Handle crystal ball specially
    if (item.id === 'crystal-ball') {
      this.useCrystalBall()
    } else {
      const message = applyItemEffect(this.state.run, item)
      console.log(message)
    }
    
    removeItemFromInventory(this.state.run, index)
    this.setState({ run: { ...this.state.run } })
  }

  // Crystal ball functionality - reveal random player tile
  private useCrystalBall(): void {
    const board = this.state.board
    const unrevealedPlayerTiles = []
    
    // Find all unrevealed player tiles
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x]
        if (tile.owner === 'player' && !tile.revealed) {
          unrevealedPlayerTiles.push({ x, y })
        }
      }
    }
    
    if (unrevealedPlayerTiles.length === 0) {
      console.log('Crystal Ball: No unrevealed player tiles to reveal!')
      return
    }
    
    // Pick a random unrevealed player tile
    const randomIndex = Math.floor(Math.random() * unrevealedPlayerTiles.length)
    const tilePos = unrevealedPlayerTiles[randomIndex]
    
    console.log(`Crystal Ball: Revealing player tile at (${tilePos.x}, ${tilePos.y})`)
    
    // Reveal the tile and handle its content
    const tile = getTileAt(board, tilePos.x, tilePos.y)
    if (tile) {
      const success = revealTile(board, tilePos.x, tilePos.y, 'player')
      if (success) {
        // Handle tile content 
        this.handleTileContent(tile)
        
        // Update board status
        const newBoardStatus = checkBoardStatus(board)
        this.setState({
          board: { ...board },
          boardStatus: newBoardStatus
        })
        
        // Handle board completion if needed
        if (newBoardStatus === 'won') {
          this.handleBoardWon()
        } else if (newBoardStatus === 'lost') {
          this.handleBoardLost()
        }
      }
    }
  }

  // Discard item from overflow
  discardOverflowItem(): void {
    this.state.run.overflowItem = null
    this.setState({ run: { ...this.state.run } })
  }

  resetGame(): void {
    // Clear any pending AI turn
    if (this.aiTurnTimeout) {
      clearTimeout(this.aiTurnTimeout)
      this.aiTurnTimeout = null
    }
    
    this.setState(createInitialGameState())
  }

  // Debug helpers for testing win/loss conditions
  revealAllPlayerTiles(): void {
    const board = this.state.board
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x]
        if (tile.owner === 'player' && !tile.revealed) {
          revealTile(board, x, y, 'player')
        }
      }
    }
    
    const newBoardStatus = checkBoardStatus(board)
    this.setState({
      board: { ...board },
      boardStatus: newBoardStatus
    })
    
    // Handle board completion
    if (newBoardStatus === 'won') {
      this.handleBoardWon()
    } else if (newBoardStatus === 'lost') {
      this.handleBoardLost()
    }
  }

  revealAllOpponentTiles(): void {
    const board = this.state.board
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x]
        if (tile.owner === 'opponent' && !tile.revealed) {
          revealTile(board, x, y, 'opponent')
        }
      }
    }
    
    const newBoardStatus = checkBoardStatus(board)
    this.setState({
      board: { ...board },
      boardStatus: newBoardStatus
    })
    
    // Handle board completion
    if (newBoardStatus === 'won') {
      this.handleBoardWon()
    } else if (newBoardStatus === 'lost') {
      this.handleBoardLost()
    }
  }
}

// Export singleton instance
export const gameStore = new GameStore()