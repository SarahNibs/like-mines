import { Board, Tile, TileOwner, TileContent, GameState, RunState, getTileAt, getTilesByOwner, ItemData, MonsterData } from './types'
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
export function createBoardForLevel(level: number, playerGold: number = 0, ownedUpgrades: string[] = []): Board {
  const config = getBoardConfigForLevel(level)
  return generateBoard(config, playerGold, ownedUpgrades)
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
    maxHp: 100,
    // Player combat and inventory stats
    gold: 0,
    attack: 5, // Starting attack power
    defense: 0, // Starting defense
    loot: 1, // Starting loot bonus per opponent tile/monster
    inventory: [null, null, null, null, null], // 5 empty slots
    upgrades: [] // No upgrades initially
  }
}

// Create initial game state
export function createInitialGameState(): GameState {
  const run = createInitialRunState()
  const board = createBoardForLevel(run.currentLevel, run.gold, run.upgrades)
  const initialClue = generateClue(board)
  const boardStatus = checkBoardStatus(board)
  
  return {
    board,
    currentTurn: 'player',
    gameStatus: 'playing',
    boardStatus,
    clues: [initialClue], // Start with one clue
    run,
    transmuteMode: false,
    detectorMode: false,
    shopOpen: false,
    shopItems: []
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
  
  const newBoard = createBoardForLevel(newLevel, currentState.run.gold, currentState.run.upgrades)
  
  // Apply QUICK upgrade: reveal random player tile
  if (currentState.run.upgrades.includes('quick')) {
    const playerTiles = []
    for (let y = 0; y < newBoard.height; y++) {
      for (let x = 0; x < newBoard.width; x++) {
        const tile = newBoard.tiles[y][x]
        if (tile.owner === 'player' && !tile.revealed) {
          playerTiles.push({x, y})
        }
      }
    }
    
    if (playerTiles.length > 0) {
      const randomTile = playerTiles[Math.floor(Math.random() * playerTiles.length)]
      revealTile(newBoard, randomTile.x, randomTile.y, 'player')
    }
  }
  
  // Apply WISDOM upgrade: add detector scan to random tile
  if (currentState.run.upgrades.includes('wisdom')) {
    const allTiles = []
    for (let y = 0; y < newBoard.height; y++) {
      for (let x = 0; x < newBoard.width; x++) {
        allTiles.push({x, y})
      }
    }
    
    if (allTiles.length > 0) {
      const randomTile = allTiles[Math.floor(Math.random() * allTiles.length)]
      const tile = newBoard.tiles[randomTile.y][randomTile.x]
      
      // Apply detector scan (same logic as detector item)
      let playerAdjacent = 0
      let opponentAdjacent = 0
      let neutralAdjacent = 0
      
      // Check all 9 positions in 3x3 area (including center)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const adjTile = getTileAt(newBoard, randomTile.x + dx, randomTile.y + dy)
          if (adjTile) {
            if (adjTile.owner === 'player') playerAdjacent++
            else if (adjTile.owner === 'opponent') opponentAdjacent++
            else if (adjTile.owner === 'neutral') neutralAdjacent++
          }
        }
      }
      
      tile.detectorScan = {
        playerAdjacent,
        opponentAdjacent,
        neutralAdjacent
      }
    }
  }
  
  const initialClue = generateClue(newBoard)
  
  return {
    ...currentState,
    board: newBoard,
    currentTurn: 'player',
    boardStatus: 'in-progress',
    clues: [initialClue], // Reset clues for new board
    transmuteMode: false, // Reset transmute mode for new board
    detectorMode: false, // Reset detector mode for new board
    shopOpen: false, // Close shop for new board
    shopItems: [], // Clear shop items for new board
    run: {
      ...currentState.run,
      currentLevel: newLevel
    }
  }
}

// Combat system - returns damage taken by player
export function fightMonster(monster: MonsterData, playerAttack: number, playerDefense: number): number {
  let monsterHp = monster.hp
  let totalDamageToPlayer = 0
  let rounds = 0
  const maxRounds = 1000 // Safety check to prevent infinite loops
  
  console.log(`Combat: Player (${playerAttack} atk, ${playerDefense} def) vs ${monster.name} (${monster.attack} atk, ${monster.defense} def, ${monster.hp} hp)`)
  
  while (monsterHp > 0 && rounds < maxRounds) {
    // Monster attacks first
    const damageToPlayer = Math.max(1, monster.attack - playerDefense)
    totalDamageToPlayer += damageToPlayer
    
    // Player attacks back
    const damageToMonster = Math.max(1, playerAttack - monster.defense)
    monsterHp -= damageToMonster
    
    rounds++
    
    if (rounds % 100 === 0) {
      console.log(`Combat round ${rounds}: Monster HP ${monsterHp}, Player damage taken so far: ${totalDamageToPlayer}`)
    }
  }
  
  if (rounds >= maxRounds) {
    console.error(`Combat exceeded max rounds! Monster HP: ${monsterHp}, Total damage: ${totalDamageToPlayer}`)
  }
  
  console.log(`Combat ended after ${rounds} rounds. Total damage to player: ${totalDamageToPlayer}`)
  return totalDamageToPlayer
}

// Add item to inventory, returns true if successful, false if full
export function addItemToInventory(runState: RunState, item: ItemData): boolean {
  // Find first empty slot
  for (let i = 0; i < runState.inventory.length; i++) {
    if (runState.inventory[i] === null) {
      runState.inventory[i] = item
      return true
    }
  }
  
  // No space - item is lost
  return false
}

// Remove item from inventory
export function removeItemFromInventory(runState: RunState, index: number): void {
  if (index >= 0 && index < runState.inventory.length) {
    runState.inventory[index] = null
  }
}

// Handle immediate item effects
export function applyItemEffect(runState: RunState, item: ItemData): string {
  switch (item.id) {
    case 'gold-coin':
      runState.gold += 1
      return 'Gained 1 gold!'
      
    case 'bear-trap':
      runState.hp = runState.hp - 1
      return 'Bear trap! Lost 1 HP.'
      
    case 'first-aid':
      runState.hp = Math.min(runState.maxHp, runState.hp + 10)
      return 'Used first aid! Gained 10 HP.'
      
    case 'crystal-ball':
      // This shouldn't be called since crystal ball is not immediate anymore
      return 'Crystal ball effect should be handled in store!'
      
    case 'transmute':
      // This shouldn't be called since transmute is not immediate anymore
      return 'Transmute effect should be handled in store!'
      
    case 'rewind':
      // This shouldn't be called since rewind is not immediate anymore
      return 'Rewind effect should be handled in store!'
      
    case 'detector':
      // This shouldn't be called since detector is not immediate anymore
      return 'Detector effect should be handled in store!'
      
    case 'shop':
      // Shop opening is handled in store
      return 'Shop opened!'
      
    default:
      return `Unknown item: ${item.name}`
  }
}