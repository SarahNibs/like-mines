import { GameState, getTileAt } from './types'
import { createInitialGameState, revealTile, checkBoardStatus, progressToNextLevel } from './gameLogic'
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