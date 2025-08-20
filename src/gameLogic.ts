import { Board, Tile, TileOwner, TileContent, GameState, RunState, getTileAt, getTilesByOwner, ItemData, MonsterData } from './types'
import { PROTECTION } from './items'
import { generateClue } from './clues'
import { generateBoard, getBoardConfigForLevel } from './boardGenerator'
import { ALL_CHARACTERS, Character } from './characters'
import { ALL_SPELLS, SpellManager } from './SpellManager'
import { CharacterTraitManager } from './CharacterTraits'
import { UpgradeManager } from './UpgradeManager'

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
export function createBoardForLevel(level: number, playerGold: number = 0, ownedUpgrades: string[] = [], character?: Character): Board {
  const config = getBoardConfigForLevel(level)
  return generateBoard(config, playerGold, ownedUpgrades, character)
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
    inventory: [null, null, null, null], // Empty inventory for character selection
    maxInventory: 4, // Starting with 4 inventory slots
    upgrades: [], // No upgrades initially
    trophies: [], // No trophies initially
    // Spell system (initialized by character creation)
    mana: 0,
    maxMana: 0,
    spells: [],
    spellEffects: [],
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
  
  // Initialize spell system
  runState.mana = character.startingMana
  runState.maxMana = character.startingMana
  runState.spells = []
  runState.spellEffects = []
  
  // Add starting spell for non-Fighter characters
  // NOTE: Never use require() in browser ES modules - always use import at top level
  if (character.startingMana > 0) {
    const spellManager = new SpellManager()
    const startingSpell = character.startingSpell || spellManager.getRandomSpell(character.id)
    runState.spells.push(startingSpell)
    // Note: Spells are displayed separately from regular inventory in UI
  }
  
  // Apply character-specific upgrades and their effects using centralized system
  // Start with empty upgrades array - UpgradeManager will add them
  const upgradeManager = new UpgradeManager()
  
  // Apply each starting upgrade using the centralized system
  character.startingUpgrades.forEach(upgradeId => {
    const result = upgradeManager.applyUpgrade(runState, upgradeId)
    if (result.success) {
      // Update runState with the upgraded values, but preserve character reference
      const characterRef = runState.character
      Object.assign(runState, result.newRun)
      runState.character = characterRef
    } else {
      console.warn(`Failed to apply starting upgrade ${upgradeId}: ${result.message}`)
    }
  })
  
  // Fill inventory with character items plus base Scroll of Protection (except for Wizard)
  const allStartingItems = character.id === 'wizard' 
    ? character.startingItems  // Wizard gets no base protection
    : [PROTECTION, ...character.startingItems]
  
  for (let i = 0; i < allStartingItems.length && i < runState.maxInventory; i++) {
    runState.inventory[i] = createItemCopy(allStartingItems[i])
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
    spellTargetMode: false,
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
  
  const newBoard = createBoardForLevel(newLevel, currentState.run.gold, currentState.run.upgrades, currentState.run.character)
  
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
  
  // Check if character should gain new spell at this level (Wizard trait)
  // Calculate mana gain per level (base 1 + Wellspring upgrades)
  const baseManaGain = 1
  const wellspringCount = currentState.run.upgrades.filter(id => id === 'wellspring').length
  const totalManaGain = baseManaGain + wellspringCount
  
  let updatedRun = {
    ...currentState.run,
    currentLevel: newLevel,
    // Mana regeneration: +1 mana per level (up to max) + Wellspring bonus
    mana: Math.min(currentState.run.maxMana, currentState.run.mana + totalManaGain)
  }
  
  if (updatedRun.character) {
    const traitManager = new CharacterTraitManager()
    if (traitManager.shouldGainSpellAtLevel(updatedRun.character, newLevel)) {
      // Gain a random spell (excluding Windstorm for non-Wizards)
      let availableSpells = ALL_SPELLS.filter(spell => 
        !updatedRun.spells.some(ownedSpell => ownedSpell.id === spell.id)
      )
      
      // Filter out Windstorm for non-Wizard characters
      if (updatedRun.character.id !== 'wizard') {
        availableSpells = availableSpells.filter(spell => spell.id !== 'windstorm')
      }
      
      if (availableSpells.length > 0) {
        const randomSpell = availableSpells[Math.floor(Math.random() * availableSpells.length)]
        updatedRun.spells = [...updatedRun.spells, randomSpell]
        console.log(`${updatedRun.character.name} gained new spell at level ${newLevel}: ${randomSpell.name}`)
      }
    }
  }
  
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
    run: updatedRun
  }
}

// Combat system - returns damage taken by player
export function fightMonster(monster: MonsterData, runState: RunState): number {
  let monsterHp = monster.hp
  let totalDamageToPlayer = 0
  let rounds = 0
  const maxRounds = 1000 // Safety check to prevent infinite loops
  
  // Apply temporary buffs (these already include character trait bonuses when applied)
  let blazeBonus = runState.temporaryBuffs.blaze || 0
  let wardBonus = runState.temporaryBuffs.ward || 0
  
  const effectiveAttack = runState.attack + blazeBonus
  const effectiveDefense = runState.defense + wardBonus
  
  console.log(`Combat: Player (${effectiveAttack} atk, ${effectiveDefense} def) vs ${monster.name} (${monster.attack} atk, ${monster.defense} def, ${monster.hp} hp)`)
  
  // Check if character attacks first (Ranger trait)
  const traitManager = new CharacterTraitManager()
  const attacksFirst = runState.character && traitManager.doesCharacterAttackFirst(runState.character)
  const preventDamageOnKill = runState.character && traitManager.doesCharacterPreventDamageOnKill(runState.character)
  
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
    
    if (attacksFirst) {
      // Ranger attacks first
      monsterHp -= damageToMonster
      
      // If monster dies and Ranger has damage prevention, take no damage this round
      if (monsterHp <= 0 && preventDamageOnKill) {
        console.log('Ranger killed monster before taking damage!')
        break // Exit without taking damage
      }
      
      // Monster attacks back if still alive
      if (monsterHp > 0) {
        totalDamageToPlayer += damageToPlayer
      }
    } else {
      // Standard combat: Monster attacks first
      totalDamageToPlayer += damageToPlayer
      
      // Player attacks back
      monsterHp -= damageToMonster
    }
    
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

// Handle monster defeat effects (gold gain, Rich upgrade, Greed upgrade)
export function handleMonsterDefeat(runState: RunState, tileX: number, tileY: number): { goldGained: number, richTriggered: boolean, greedTriggered: boolean } {
  // Gain gold based on loot stat
  runState.gold += runState.loot
  
  // Check for Rich upgrade trigger
  const richTriggered = runState.upgrades.includes('rich')
  
  // Check for Greed upgrade trigger (similar to Rich but spawns different items)
  const greedTriggered = runState.upgrades.includes('greed')
  
  return {
    goldGained: runState.loot,
    richTriggered,
    greedTriggered
  }
}

// Complete monster defeat handling - damages monster and handles death
export function defeatMonster(tile: Tile, damage: number, runState: RunState): { 
  defeated: boolean, 
  goldGained: number, 
  richTriggered: boolean,
  greedTriggered: boolean,
  monsterName?: string
} {
  if (!tile.monsterData) {
    return { defeated: false, goldGained: 0, richTriggered: false, greedTriggered: false }
  }
  
  // Deal damage to monster
  const monster = tile.monsterData
  const originalName = monster.name
  monster.hp -= damage
  
  if (monster.hp <= 0) {
    // Monster defeated - remove it from tile and handle defeat effects
    tile.monsterData = undefined
    tile.content = TileContent.Empty
    
    const defeatResult = handleMonsterDefeat(runState, tile.x, tile.y)
    
    return {
      defeated: true,
      goldGained: defeatResult.goldGained,
      richTriggered: defeatResult.richTriggered,
      greedTriggered: defeatResult.greedTriggered,
      monsterName: originalName
    }
  }
  
  return { defeated: false, goldGained: 0, richTriggered: false, greedTriggered: false }
}

// Add item to inventory, returns true if successful, false if full
export function addItemToInventory(runState: RunState, item: ItemData): boolean {
  // Find first empty slot
  for (let i = 0; i < runState.inventory.length; i++) {
    if (runState.inventory[i] === null) {
      // Create a deep copy of the item to prevent object sharing
      runState.inventory[i] = createItemCopy(item)
      return true
    }
  }
  
  // No space - item is lost
  return false
}

// Create a deep copy of an item to prevent object sharing
function createItemCopy(item: ItemData): ItemData {
  const copy = { ...item }
  
  // Deep copy multiUse object if it exists
  if (item.multiUse) {
    copy.multiUse = { ...item.multiUse }
  }
  
  return copy
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
      
    case 'health-potion':
      let hpGain = 8
      // Apply Cleric HP gain bonus
      if (runState.character) {
        const traitManager = new CharacterTraitManager()
        hpGain += traitManager.getHpGainBonus(runState.character, 'healthPotion')
      }
      runState.hp = Math.min(runState.maxHp, runState.hp + hpGain)
      return `Used Health Potion! Gained ${hpGain} HP.`
      
    case 'mana-potion':
      runState.mana = Math.min(runState.maxMana, runState.mana + 3)
      return 'Used Mana Potion! Gained 3 mana.'
      
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