import { Board, Tile, TileOwner, TileContent, GameState, RunState, getTileAt, getTilesByOwner } from './types'
import { generateClue } from './clues'
import { generateBoard, getBoardConfigForLevel } from './boardGenerator'

// Get adjacent tile positions (8-directional)
function getAdjacentPositions(x: number, y: number): Array<{x: number, y: number}> {
  return [
    {x: x-1, y: y-1}, {x: x, y: y-1}, {x: x+1, y: y-1},
    {x: x-1, y: y},                     {x: x+1, y: y},
    {x: x-1, y: y+1}, {x: x, y: y+1}, {x: x+1, y: y+1}
  ]
}

// Count adjacent tiles of a specific owner type
export function countAdjacentTiles(board: Board, x: number, y: number, ownerType: TileOwner): number {
  const adjacent = getAdjacentPositions(x, y)
  let count = 0
  
  for (const pos of adjacent) {
    const tile = getTileAt(board, pos.x, pos.y)
    if (tile && tile.owner === ownerType) {
      count++
    }
  }
  
  return count
}

// Create board for current level
export function createBoardForLevel(level: number): Board {
  const config = getBoardConfigForLevel(level)
  return generateBoard(config)
}

// Reveal a tile and update board state
export function revealTile(board: Board, x: number, y: number, revealedBy: TileOwner = TileOwner.Player): boolean {
  const tile = getTileAt(board, x, y)
  if (!tile || tile.revealed) {
    return false
  }
  
  tile.revealed = true
  tile.revealedBy = revealedBy
  
  // Update counters
  if (tile.owner === TileOwner.Player) {
    board.playerTilesRevealed++
  } else if (tile.owner === TileOwner.Opponent) {
    board.opponentTilesRevealed++
  }
  
  return true
}

// Check win/loss conditions for current board
export function checkBoardStatus(board: Board): 'in-progress' | 'won' | 'lost' {
  if (board.playerTilesRevealed >= board.playerTilesTotal) {
    return 'won'
  }
  if (board.opponentTilesRevealed >= board.opponentTilesTotal) {
    return 'lost'
  }
  return 'in-progress'
}

// Create initial run state
export function createInitialRunState(): RunState {
  return {
    currentLevel: 1,
    maxLevel: 10, // 10-level run for testing
    hp: 100,
    maxHp: 100
  }
}

// Create initial game state
export function createInitialGameState(): GameState {
  const run = createInitialRunState()
  const board = createBoardForLevel(run.currentLevel)
  const initialClue = generateClue(board)
  const boardStatus = checkBoardStatus(board)
  
  return {
    board,
    currentTurn: 'player',
    gameStatus: 'playing',
    boardStatus,
    clues: [initialClue], // Start with one clue
    run
  }
}

// Progress to next level
export function progressToNextLevel(currentState: GameState): GameState {
  const newLevel = currentState.run.currentLevel + 1
  
  if (newLevel > currentState.run.maxLevel) {
    // Run complete!
    return {
      ...currentState,
      gameStatus: 'run-complete'
    }
  }
  
  const newBoard = createBoardForLevel(newLevel)
  const initialClue = generateClue(newBoard)
  
  return {
    ...currentState,
    board: newBoard,
    currentTurn: 'player',
    boardStatus: 'in-progress',
    clues: [initialClue], // Reset clues for new board
    run: {
      ...currentState.run,
      currentLevel: newLevel
    }
  }
}