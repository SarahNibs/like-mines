/**
 * SpellManager - Handles spell definitions, validation, and casting logic
 */

import { SpellData, SpellEffect, RunState, GameState, Board, ProbabilisticClue, TileContent } from './types'
import { generateClue } from './clues'
import { defeatMonster } from './gameLogic'
import { CharacterTraitManager } from './CharacterTraits'

// Spell Definitions
export const MAGIC_MISSILE: SpellData = {
  id: 'magic-missile',
  name: 'Magic Missile',
  description: 'Deal damage to a monster based on current level',
  icon: '🚀',
  manaCost: 1,
  targetType: 'monster'
}

export const MAGE_HAND: SpellData = {
  id: 'mage-hand',
  name: 'Mage Hand',
  description: 'Interact with any tile as if you revealed it',
  icon: '✋',
  manaCost: 2,
  targetType: 'tile'
}

export const STINKING_CLOUD: SpellData = {
  id: 'stinking-cloud',
  name: 'Stinking Cloud',
  description: 'Deal 2 damage to monsters on/adjacent to chosen tile each turn',
  icon: '☁️',
  manaCost: 2,
  targetType: 'tile'
}

export const GLIMPSE: SpellData = {
  id: 'glimpse',
  name: 'Glimpse',
  description: 'Get a new clue with 2 tiles in each hand',
  icon: '👁️',
  manaCost: 2,
  targetType: 'none'
}

export const UNLOCK: SpellData = {
  id: 'unlock',
  name: 'Unlock',
  description: 'Unlocks a random locked door',
  icon: '🗝️',
  manaCost: 1,
  targetType: 'none'
}

export const WINDSTORM: SpellData = {
  id: 'windstorm',
  name: 'Windstorm',
  description: 'Shuffles all items and fog on the board',
  icon: '🌪️',
  manaCost: 4,
  targetType: 'none'
}

export const ALL_SPELLS: SpellData[] = [
  MAGIC_MISSILE,
  MAGE_HAND,
  STINKING_CLOUD,
  GLIMPSE,
  UNLOCK,
  WINDSTORM
]

export interface SpellCastResult {
  success: boolean
  message?: string
  requiresTargeting?: boolean
  effectsAdded?: SpellEffect[]
  newClue?: ProbabilisticClue
  richUpgradeTriggered?: { x: number, y: number }
  upgradeChoiceTriggered?: boolean
  shopOpened?: boolean
}

export class SpellManager {
  private traitManager: CharacterTraitManager

  constructor() {
    this.traitManager = new CharacterTraitManager()
  }
  
  /**
   * Check if a spell can be cast (mana requirements, etc.)
   */
  canCastSpell(spell: SpellData, run: RunState): { canCast: boolean, reason?: string } {
    // Check if character can cast spells at all
    if (run.character && !this.traitManager.canCharacterCastSpells(run.character)) {
      return {
        canCast: false,
        reason: `${run.character.name} cannot cast spells`
      }
    }
    
    if (run.mana < spell.manaCost) {
      return { 
        canCast: false, 
        reason: `Not enough mana! Need ${spell.manaCost}, have ${run.mana}` 
      }
    }
    
    return { canCast: true }
  }
  
  /**
   * Cast a spell (without targeting - for spells that don't need targets)
   */
  castSpell(
    spell: SpellData, 
    run: RunState, 
    gameState?: GameState,
    targetX?: number, 
    targetY?: number
  ): SpellCastResult {
    // Validate mana cost
    const canCast = this.canCastSpell(spell, run)
    if (!canCast.canCast) {
      return { success: false, message: canCast.reason }
    }
    
    // Note: Mana deduction is handled by the store after successful casting
    
    // Handle each spell type
    switch (spell.id) {
      case 'glimpse':
        if (!gameState) {
          return { success: false, message: 'Glimpse spell requires game state' }
        }
        return this.castGlimpse(run, gameState)
        
      case 'unlock':
        if (!gameState) {
          return { success: false, message: 'Unlock spell requires game state' }
        }
        return this.castUnlock(run, gameState)
        
      case 'windstorm':
        if (!gameState) {
          return { success: false, message: 'Windstorm spell requires game state' }
        }
        return this.castWindstorm(run, gameState)
        
      case 'magic-missile':
        if (targetX === undefined || targetY === undefined) {
          return { success: false, requiresTargeting: true }
        }
        return this.castMagicMissile(run, gameState!, targetX, targetY)
        
      case 'mage-hand':
        if (targetX === undefined || targetY === undefined) {
          return { success: false, requiresTargeting: true }
        }
        return this.castMageHand(run, gameState!, targetX, targetY)
        
      case 'stinking-cloud':
        if (targetX === undefined || targetY === undefined) {
          return { success: false, requiresTargeting: true }
        }
        return this.castStinkingCloud(run, gameState!.board, targetX, targetY)
        
      default:
        return { success: false, message: `Unknown spell: ${spell.id}` }
    }
  }
  
  /**
   * Cast Glimpse spell - generate new clue
   */
  private castGlimpse(run: RunState, gameState: GameState): SpellCastResult {
    // Generate a clue with exactly 2 left hand and 2 right hand tiles (no upgrades)
    const glimpseClue = generateClue(gameState.board, [])
    
    // Override the clue to ensure it has exactly 2 tiles in each hand
    const fixedClue: ProbabilisticClue = {
      handA: {
        tiles: glimpseClue.handA.tiles.slice(0, 2),
        label: glimpseClue.handA.label
      },
      handB: {
        tiles: glimpseClue.handB.tiles.slice(0, 2),
        label: glimpseClue.handB.label
      },
      hint: 'Glimpse reveals magical insights!'
    }
    
    return {
      success: true,
      message: 'Cast Glimpse - new magical insight revealed!',
      newClue: fixedClue
    }
  }
  
  /**
   * Cast Unlock spell - unlocks a random locked door
   */
  private castUnlock(run: RunState, gameState: GameState): SpellCastResult {
    // Find all locked doors (tiles with chainData.isBlocked = true and requiredTile not revealed)
    const lockedDoors = []
    
    for (let y = 0; y < gameState.board.height; y++) {
      for (let x = 0; x < gameState.board.width; x++) {
        const tile = gameState.board.tiles[y][x]
        
        if (tile.chainData && tile.chainData.isBlocked && !tile.revealed) {
          // Check if the required tile is not revealed (door is still locked)
          const requiredTile = gameState.board.tiles[tile.chainData.requiredTileY][tile.chainData.requiredTileX]
          if (!requiredTile.revealed) {
            lockedDoors.push({ x, y, tile, requiredTile })
          }
        }
      }
    }
    
    if (lockedDoors.length === 0) {
      return {
        success: false,
        message: 'Unlock spell failed - no locked doors found!'
      }
    }
    
    // Pick a random locked door
    const randomDoor = lockedDoors[Math.floor(Math.random() * lockedDoors.length)]
    
    // Unlock the door by removing the chain relationship completely (like Key item)
    // Remove chain data from both the door tile and the key tile
    randomDoor.tile.chainData = undefined
    if (randomDoor.requiredTile.chainData) {
      randomDoor.requiredTile.chainData = undefined
    }
    
    return {
      success: true,
      message: `Unlock spell removed the chain between (${randomDoor.x}, ${randomDoor.y}) and (${randomDoor.requiredTile.x}, ${randomDoor.requiredTile.y})!`
    }
  }
  
  /**
   * Cast Windstorm spell - shuffles all items and fog on the board
   */
  private castWindstorm(run: RunState, gameState: GameState): SpellCastResult {
    // Collect all items and fogged tiles from the board
    const items: Array<{ item: any, positions: Array<{ x: number, y: number }> }> = []
    const foggedPositions: Array<{ x: number, y: number }> = []
    
    // First pass: collect all items and fogged positions
    for (let y = 0; y < gameState.board.height; y++) {
      for (let x = 0; x < gameState.board.width; x++) {
        const tile = gameState.board.tiles[y][x]
        
        // Collect items (but not monsters or upgrades)
        if (tile.content === 'item' && tile.itemData && !tile.revealed) {
          let existingItem = items.find(i => i.item.id === tile.itemData!.id)
          if (existingItem) {
            existingItem.positions.push({ x, y })
          } else {
            items.push({ item: tile.itemData, positions: [{ x, y }] })
          }
        }
        
        // Collect fogged positions
        if (tile.fogged && !tile.revealed) {
          foggedPositions.push({ x, y })
        }
      }
    }
    
    // Second pass: clear items and fog from their current positions
    for (let y = 0; y < gameState.board.height; y++) {
      for (let x = 0; x < gameState.board.width; x++) {
        const tile = gameState.board.tiles[y][x]
        
        // Clear items
        if (tile.content === 'item' && tile.itemData && !tile.revealed) {
          tile.content = 'empty'
          tile.itemData = undefined
        }
        
        // Clear fog
        if (tile.fogged && !tile.revealed) {
          tile.fogged = false
        }
      }
    }
    
    // Collect all empty, unrevealed tile positions for reshuffling
    const emptyPositions: Array<{ x: number, y: number }> = []
    for (let y = 0; y < gameState.board.height; y++) {
      for (let x = 0; x < gameState.board.width; x++) {
        const tile = gameState.board.tiles[y][x]
        if (tile.content === 'empty' && !tile.revealed) {
          emptyPositions.push({ x, y })
        }
      }
    }
    
    // Shuffle the empty positions array
    for (let i = emptyPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [emptyPositions[i], emptyPositions[j]] = [emptyPositions[j], emptyPositions[i]]
    }
    
    let positionIndex = 0
    
    // Place items back at random positions
    for (const itemGroup of items) {
      for (let i = 0; i < itemGroup.positions.length && positionIndex < emptyPositions.length; i++) {
        const newPos = emptyPositions[positionIndex++]
        const tile = gameState.board.tiles[newPos.y][newPos.x]
        tile.content = 'item'
        tile.itemData = itemGroup.item
      }
    }
    
    // Place fog back at random positions
    for (let i = 0; i < foggedPositions.length && positionIndex < emptyPositions.length; i++) {
      const newPos = emptyPositions[positionIndex++]
      const tile = gameState.board.tiles[newPos.y][newPos.x]
      tile.fogged = true
    }
    
    const itemsShuffled = items.reduce((sum, group) => sum + group.positions.length, 0)
    const fogShuffled = foggedPositions.length
    
    return {
      success: true,
      message: `Windstorm shuffled ${itemsShuffled} items and ${fogShuffled} fog clouds!`
    }
  }
  
  /**
   * Cast Magic Missile - damage monster on target tile
   */
  private castMagicMissile(run: RunState, gameState: GameState, targetX: number, targetY: number): SpellCastResult {
    let damage = Math.ceil(run.currentLevel / 2)
    
    // Apply character trait damage bonus
    if (run.character) {
      const damageBonus = this.traitManager.getSpellDamageBonus(run.character)
      damage += damageBonus
    }
    
    const tile = gameState.board.tiles[targetY]?.[targetX]
    
    if (!tile) {
      return { success: false, message: 'Invalid target tile' }
    }
    
    if (!tile.monsterData) {
      return { success: false, message: 'No monster on target tile' }
    }
    
    // Use centralized monster defeat handling
    const defeatResult = defeatMonster(tile, damage, run)
    
    if (defeatResult.defeated) {
      let message = `Magic Missile deals ${damage} damage! ${defeatResult.monsterName} defeated!`
      if (defeatResult.goldGained > 0) {
        message += ` Gained ${defeatResult.goldGained} gold.`
      }
      
      const result: SpellCastResult = {
        success: true,
        message
      }
      
      if (defeatResult.richTriggered) {
        result.richUpgradeTriggered = { x: targetX, y: targetY }
      }
      
      return result
    } else {
      const monster = tile.monsterData
      return {
        success: true,
        message: `Magic Missile deals ${damage} damage! ${monster?.name} has ${monster?.hp} HP remaining.`
      }
    }
  }
  
  /**
   * Cast Mage Hand - interact with target tile
   */
  private castMageHand(run: RunState, gameState: GameState, targetX: number, targetY: number): SpellCastResult {
    const tile = gameState.board.tiles[targetY]?.[targetX]
    
    if (!tile) {
      return { success: false, message: 'Invalid target tile' }
    }
    
    if (tile.revealed) {
      return { success: false, message: 'Tile already revealed' }
    }
    
    const result: SpellCastResult = {
      success: true,
      message: 'Cast Mage Hand!'
    }
    
    // Handle different tile content types
    if (tile.content === TileContent.PermanentUpgrade && tile.upgradeData) {
      // Trigger upgrade choice without revealing tile
      result.message = `Mage Hand activates ${tile.upgradeData.name} upgrade!`
      result.upgradeChoiceTriggered = true
      // Clear the upgrade from the tile after interaction
      tile.content = TileContent.Empty
      tile.upgradeData = undefined
      
    } else if (tile.content === TileContent.Item && tile.itemData) {
      const item = tile.itemData
      
      if (item.immediate) {
        // Apply immediate effect
        if (item.id === 'gold-coin') {
          run.gold += 1
          result.message = 'Mage Hand collects gold coin! +1 gold.'
        } else if (item.id === 'chest') {
          run.gold += 4
          result.message = 'Mage Hand opens treasure chest! +4 gold.'
        } else if (item.id === 'health-potion') {
          run.hp = Math.min(run.maxHp, run.hp + 8)
          result.message = `Mage Hand uses Health Potion! +8 HP (${run.hp}/${run.maxHp}).`
        } else if (item.id === 'mana-potion') {
          run.mana = Math.min(run.maxMana, run.mana + 3)
          result.message = `Mage Hand uses Mana Potion! +3 mana (${run.mana}/${run.maxMana}).`
        } else if (item.id === 'shop') {
          result.message = 'Mage Hand activates the shop!'
          result.shopOpened = true
        } else {
          result.message = `Mage Hand activates ${item.name}!`
        }
        
        // Clear the item from the tile after interaction
        tile.content = TileContent.Empty
        tile.itemData = undefined
        
      } else {
        // Try to add non-immediate item to inventory
        const success = this.addItemToInventory(run, item)
        if (success) {
          result.message = `Mage Hand collects ${item.name}!`
          // Clear the item from the tile after collection
          tile.content = TileContent.Empty
          tile.itemData = undefined
        } else {
          result.message = `Mage Hand cannot collect ${item.name} - inventory full!`
        }
      }
      
    } else if (tile.content === TileContent.Monster && tile.monsterData) {
      return { success: false, message: 'Mage Hand cannot interact with monsters' }
      
    } else if (tile.content === TileContent.Empty) {
      result.message = 'Mage Hand finds nothing on this tile.'
      
    } else {
      result.message = 'Mage Hand cannot interact with this tile type.'
    }
    
    return result
  }
  
  /**
   * Helper method to add item to inventory
   */
  private addItemToInventory(run: RunState, item: any): boolean {
    // Find first empty slot
    for (let i = 0; i < run.inventory.length; i++) {
      if (run.inventory[i] === null) {
        // Create a deep copy of the item to prevent object sharing
        run.inventory[i] = this.createItemCopy(item)
        return true
      }
    }
    return false
  }

  // Create a deep copy of an item to prevent object sharing
  private createItemCopy(item: any): any {
    const copy = { ...item }
    
    // Deep copy multiUse object if it exists
    if (item.multiUse) {
      copy.multiUse = { ...item.multiUse }
    }
    
    return copy
  }
  
  /**
   * Cast Stinking Cloud - create persistent damage effect
   */
  private castStinkingCloud(run: RunState, board: Board, targetX: number, targetY: number): SpellCastResult {
    // Check if there's already a Stinking Cloud effect at this location
    if (!run.spellEffects) {
      run.spellEffects = []
    }
    
    const existingEffect = run.spellEffects.find(effect => 
      effect.spellId === 'stinking-cloud' && 
      effect.tileX === targetX && 
      effect.tileY === targetY
    )
    
    if (existingEffect) {
      return {
        success: false,
        message: `There is already a Stinking Cloud at (${targetX}, ${targetY})!`
      }
    }
    
    const effect: SpellEffect = {
      spellId: 'stinking-cloud',
      remainingTurns: -1, // Permanent until manually removed
      tileX: targetX,
      tileY: targetY,
      damage: 2
    }
    
    run.spellEffects.push(effect)
    
    // Deal initial damage immediately when cast
    const initialResult = this.processStinkingCloudEffect(effect, board, run)
    let resultMessage = `Cast Stinking Cloud at (${targetX}, ${targetY})!`
    if (initialResult.messages.length > 0) {
      resultMessage += ` ${initialResult.messages.join(' ')}`
    }
    
    // Create the spell cast result
    const result: SpellCastResult = {
      success: true,
      message: resultMessage,
      effectsAdded: [effect]
    }
    
    // Handle initial Rich upgrade triggers from immediate damage
    if (initialResult.richUpgradeTriggers.length > 0) {
      // For initial cast, use the center position for Rich upgrade trigger
      result.richUpgradeTriggered = { x: targetX, y: targetY }
    }
    
    return result
  }
  
  /**
   * Process ongoing spell effects (called on opponent turns)
   */
  processSpellEffects(run: RunState, board: Board): { messages: string[], richUpgradeTriggers: Array<{ x: number, y: number }> } {
    const messages: string[] = []
    const richUpgradeTriggers: Array<{ x: number, y: number }> = []
    
    if (!run.spellEffects || run.spellEffects.length === 0) {
      return { messages, richUpgradeTriggers }
    }
    
    // Debug: Log active spell effects
    console.log(`Processing ${run.spellEffects.length} spell effects:`, 
      run.spellEffects.map(e => `${e.spellId} at (${e.tileX}, ${e.tileY})`))
    
    // Process each active spell effect
    for (const effect of run.spellEffects) {
      if (effect.spellId === 'stinking-cloud') {
        const cloudResult = this.processStinkingCloudEffect(effect, board, run)
        messages.push(...cloudResult.messages)
        richUpgradeTriggers.push(...cloudResult.richUpgradeTriggers)
      }
    }
    
    // Remove expired effects
    run.spellEffects = run.spellEffects.filter(effect => effect.remainingTurns !== 0)
    
    return { messages, richUpgradeTriggers }
  }
  
  /**
   * Process Stinking Cloud damage effect
   */
  private processStinkingCloudEffect(effect: SpellEffect, board: Board, runState?: RunState): { messages: string[], richUpgradeTriggers: Array<{ x: number, y: number }> } {
    const messages: string[] = []
    const richUpgradeTriggers: Array<{ x: number, y: number }> = []
    
    if (effect.tileX === undefined || effect.tileY === undefined || !effect.damage) {
      return { messages, richUpgradeTriggers }
    }
    
    // Apply character trait damage bonus to Stinking Cloud
    let damage = effect.damage
    if (runState?.character) {
      const damageBonus = this.traitManager.getSpellDamageBonus(runState.character)
      damage += damageBonus
    }
    
    // Apply damage to monsters on target tile and adjacent tiles
    const centerX = effect.tileX
    const centerY = effect.tileY
    let monstersAffected = 0
    
    // Check 3x3 area centered on target tile
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = centerX + dx
        const y = centerY + dy
        
        // Check bounds
        if (x >= 0 && x < board.width && y >= 0 && y < board.height) {
          const tile = board.tiles[y][x]
          
          // Apply damage to monsters
          if (tile.monsterData && !tile.revealed) {
            if (runState) {
              // Use centralized defeat handling when runState is available
              const defeatResult = defeatMonster(tile, damage, runState)
              if (defeatResult.defeated) {
                messages.push(`Stinking Cloud killed ${defeatResult.monsterName}!`)
                if (defeatResult.goldGained > 0) {
                  messages.push(`Gained ${defeatResult.goldGained} gold.`)
                }
                // Collect Rich upgrade triggers
                if (defeatResult.richTriggered) {
                  richUpgradeTriggers.push({ x, y })
                }
              }
              monstersAffected++
            } else {
              // Fallback for cases without runState (shouldn't happen in normal gameplay)
              tile.monsterData.hp -= damage
              monstersAffected++
              
              if (tile.monsterData.hp <= 0) {
                const killedMonsterName = tile.monsterData.name
                tile.content = TileContent.Empty
                tile.monsterData = undefined
                messages.push(`Stinking Cloud killed ${killedMonsterName}!`)
              }
            }
          }
        }
      }
    }
    
    if (monstersAffected > 0) {
      messages.push(`Stinking Cloud dealt ${damage} damage to ${monstersAffected} monster(s)`)
    }
    
    return { messages, richUpgradeTriggers }
  }
  
  /**
   * Get a random spell for character creation
   * @param characterId Optional character ID to filter appropriate spells
   */
  getRandomSpell(characterId?: string): SpellData {
    let availableSpells = ALL_SPELLS
    
    // Windstorm should only be given as starting spell to Wizard
    if (characterId !== 'wizard') {
      availableSpells = ALL_SPELLS.filter(spell => spell.id !== 'windstorm')
    }
    
    return availableSpells[Math.floor(Math.random() * availableSpells.length)]
  }
  
  /**
   * Get spell by ID
   */
  getSpellById(id: string): SpellData | undefined {
    return ALL_SPELLS.find(spell => spell.id === id)
  }
}