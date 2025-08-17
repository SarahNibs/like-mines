import { Board, Tile, TileOwner, TileContent, GameState, RunState, getTileAt, getTilesByOwner, ItemData, MonsterData } from './types'
import { PROTECTION } from './items'
import { generateClue } from './clues'
import { generateBoard, getBoardConfigForLevel } from './boardGenerator'
import { ALL_CHARACTERS } from './characters'

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

// Create initial run state (placeholder for character selection)
export function createInitialRunState(): RunState {
  return {
    currentLevel: 1,
    maxLevel: 20, // 20-level run
    hp: 75,
    maxHp: 75,
    // Player combat and inventory stats
    gold: 0,
    attack: 5, // Starting attack power
    defense: 0, // Starting defense
    loot: 0, // Starting loot bonus per opponent tile/monster
    inventory: [null, null, null, null, null], // Empty inventory for character selection
    maxInventory: 5, // Starting with 5 inventory slots
    upgrades: [], // No upgrades initially
    trophies: [], // No trophies initially
    temporaryBuffs: {} // No temporary buffs initially
  }
}

// Create character-specific run state
export function createCharacterRunState(characterId: string): RunState {
  // Find character from imported data
  const character = ALL_CHARACTERS.find(c => c.id === characterId)
  
  if (!character) {
    throw new Error(`Unknown character: ${characterId}`)
  }
  
  // Create base run state
  const runState = createInitialRunState()
  
  // Store character ID for display and full character object for behavior access
  runState.characterId = characterId
  runState.character = character
  
  // Apply character-specific upgrades and their effects
  runState.upgrades = [...character.startingUpgrades]
  
  // Apply upgrade effects to stats
  character.startingUpgrades.forEach(upgradeId => {
    switch (upgradeId) {
      case 'attack':
        runState.attack += 2
        break
      case 'defense':
        runState.defense += 1
        break
      case 'healthy':
        runState.maxHp += 25
        runState.hp += 25 // Also increase current HP
        break
      case 'income':
        runState.loot += 1
        break
      case 'bag':
        runState.maxInventory += 1
        runState.inventory.push(null) // Add one more inventory slot
        break
      // QUICK, RICH, WISDOM, TRADERS, LEFT_HAND, RIGHT_HAND, RESTING are passive
      case 'quick':
      case 'rich':
      case 'wisdom':
      case 'traders':
      case 'left-hand':
      case 'right-hand':
      case 'resting':
        // These are handled during board generation or other game events
        break
    }
  })
  
  // Fill inventory with character items plus base Scroll of Protection
  const allStartingItems = [PROTECTION, ...character.startingItems]
  
  for (let i = 0; i < allStartingItems.length && i < runState.maxInventory; i++) {
    runState.inventory[i] = allStartingItems[i]
  }
  
  return runState
}

// Create initial game state
export function createInitialGameState(): GameState {
  const run = createInitialRunState()
  const board = createBoardForLevel(run.currentLevel, run.gold, run.upgrades)
  const initialClue = generateClue(board, run.upgrades)
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
    keyMode: false,
    staffMode: false,
    ringMode: false,
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
  
  const initialClue = generateClue(newBoard, currentState.run.upgrades)
  
  return {
    ...currentState,
    board: newBoard,
    currentTurn: 'player',
    boardStatus: 'in-progress',
    clues: [initialClue], // Reset clues for new board
    transmuteMode: false, // Reset transmute mode for new board
    detectorMode: false, // Reset detector mode for new board
    keyMode: false, // Reset key mode for new board
    shopOpen: false, // Close shop for new board
    shopItems: [], // Clear shop items for new board
    run: {
      ...currentState.run,
      currentLevel: newLevel
    }
  }
}

// Combat system - returns damage taken by player
export function fightMonster(monster: MonsterData, runState: RunState): number {
  let monsterHp = monster.hp
  let totalDamageToPlayer = 0
  let rounds = 0
  const maxRounds = 1000 // Safety check to prevent infinite loops
  
  // Apply temporary buffs
  const effectiveAttack = runState.attack + (runState.temporaryBuffs.blaze || 0)
  const effectiveDefense = runState.defense + (runState.temporaryBuffs.ward || 0)
  
  console.log(`Combat: Player (${effectiveAttack} atk, ${effectiveDefense} def) vs ${monster.name} (${monster.attack} atk, ${monster.defense} def, ${monster.hp} hp)`)
  
  while (monsterHp > 0 && rounds < maxRounds) {
    // Calculate damage without minimums
    const damageToPlayer = Math.max(0, monster.attack - effectiveDefense)
    const damageToMonster = Math.max(0, effectiveAttack - monster.defense)
    
    // Check for infinite loop (both do 0 damage)
    if (damageToPlayer === 0 && damageToMonster === 0) {
      console.log('Combat stalemate detected - player wins but takes damage down to 1 HP')
      // Player wins but goes down to 1 HP
      return Math.max(0, runState.hp - 1)
    }
    
    // Monster attacks first
    totalDamageToPlayer += damageToPlayer
    
    // Player attacks back
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
  
  // Clear temporary buffs after combat and remove from upgrades display
  if (runState.temporaryBuffs.ward) {
    delete runState.temporaryBuffs.ward
    runState.upgrades = runState.upgrades.filter(id => id !== 'ward-temp')
    console.log('Ward effect consumed.')
  }
  if (runState.temporaryBuffs.blaze) {
    delete runState.temporaryBuffs.blaze
    runState.upgrades = runState.upgrades.filter(id => id !== 'blaze-temp')
    console.log('Blaze effect consumed.')
  }
  
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
      
    case 'chest':
      runState.gold += 4
      return 'Gained 4 gold from treasure chest!'
      
    case 'first-aid':
      runState.hp = Math.min(runState.maxHp, runState.hp + 10)
      return 'Used first aid! Gained 10 HP.'
      
    case 'crystal-ball':
      // This shouldn't be called since crystal ball is not immediate anymore
      return 'Crystal ball effect should be handled in store!'
      
    case 'transmute':
      // This shouldn't be called since transmute is not immediate anymore
      return 'Transmute effect should be handled in store!'
      
    // rewind case removed
      
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