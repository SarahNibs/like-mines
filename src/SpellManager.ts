/**
 * SpellManager - Handles spell definitions, validation, and casting logic
 */

import { SpellData, SpellEffect, RunState, GameState, Board, ProbabilisticClue } from './types'
import { generateClue } from './clues'
import { handleMonsterDefeat } from './gameLogic'

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

export const ALL_SPELLS: SpellData[] = [
  MAGIC_MISSILE,
  MAGE_HAND,
  STINKING_CLOUD,
  GLIMPSE
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
  
  /**
   * Check if a spell can be cast (mana requirements, etc.)
   */
  canCastSpell(spell: SpellData, run: RunState): { canCast: boolean, reason?: string } {
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
        return this.castStinkingCloud(run, targetX, targetY)
        
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
   * Cast Magic Missile - damage monster on target tile
   */
  private castMagicMissile(run: RunState, gameState: GameState, targetX: number, targetY: number): SpellCastResult {
    const damage = Math.ceil(run.currentLevel / 2)
    const tile = gameState.board.tiles[targetY]?.[targetX]
    
    if (!tile) {
      return { success: false, message: 'Invalid target tile' }
    }
    
    if (!tile.monsterData) {
      return { success: false, message: 'No monster on target tile' }
    }
    
    // Deal damage to monster
    const monster = tile.monsterData
    monster.hp -= damage
    
    if (monster.hp <= 0) {
      // Monster defeated - remove it from tile and handle defeat effects
      tile.monsterData = undefined
      const defeatResult = handleMonsterDefeat(run, targetX, targetY)
      
      let message = `Magic Missile deals ${damage} damage! ${monster.name} defeated!`
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
      return {
        success: true,
        message: `Magic Missile deals ${damage} damage! ${monster.name} has ${monster.hp} HP remaining.`
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
    if (tile.content === 'permanentUpgrade' && tile.upgradeData) {
      // Trigger upgrade choice without revealing tile
      result.message = `Mage Hand activates ${tile.upgradeData.name} upgrade!`
      result.upgradeChoiceTriggered = true
      // Clear the upgrade from the tile after interaction
      tile.content = 'empty' as any
      tile.upgradeData = undefined
      
    } else if (tile.content === 'item' && tile.itemData) {
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
        tile.content = 'empty' as any
        tile.itemData = undefined
        
      } else {
        // Try to add non-immediate item to inventory
        const success = this.addItemToInventory(run, item)
        if (success) {
          result.message = `Mage Hand collects ${item.name}!`
          // Clear the item from the tile after collection
          tile.content = 'empty' as any
          tile.itemData = undefined
        } else {
          result.message = `Mage Hand cannot collect ${item.name} - inventory full!`
        }
      }
      
    } else if (tile.content === 'monster' && tile.monsterData) {
      return { success: false, message: 'Mage Hand cannot interact with monsters' }
      
    } else if (tile.content === 'empty') {
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
        run.inventory[i] = item
        return true
      }
    }
    return false
  }
  
  /**
   * Cast Stinking Cloud - create persistent damage effect
   */
  private castStinkingCloud(run: RunState, targetX: number, targetY: number): SpellCastResult {
    const effect: SpellEffect = {
      spellId: 'stinking-cloud',
      remainingTurns: -1, // Permanent until manually removed
      tileX: targetX,
      tileY: targetY,
      damage: 2
    }
    
    if (!run.spellEffects) {
      run.spellEffects = []
    }
    
    run.spellEffects.push(effect)
    
    return {
      success: true,
      message: `Cast Stinking Cloud at (${targetX}, ${targetY})!`,
      effectsAdded: [effect]
    }
  }
  
  /**
   * Process ongoing spell effects (called on opponent turns)
   */
  processSpellEffects(run: RunState, board: Board): string[] {
    const messages: string[] = []
    
    if (!run.spellEffects || run.spellEffects.length === 0) {
      return messages
    }
    
    // Process each active spell effect
    for (const effect of run.spellEffects) {
      if (effect.spellId === 'stinking-cloud') {
        const cloudMessages = this.processStinkingCloudEffect(effect, board)
        messages.push(...cloudMessages)
      }
    }
    
    // Remove expired effects
    run.spellEffects = run.spellEffects.filter(effect => effect.remainingTurns !== 0)
    
    return messages
  }
  
  /**
   * Process Stinking Cloud damage effect
   */
  private processStinkingCloudEffect(effect: SpellEffect, board: Board): string[] {
    const messages: string[] = []
    
    if (!effect.tileX || !effect.tileY || !effect.damage) {
      return messages
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
            tile.monsterData.hp -= effect.damage
            monstersAffected++
            
            // Remove monster if it dies
            if (tile.monsterData.hp <= 0) {
              const killedMonsterName = tile.monsterData.name
              tile.content = 'empty' as any
              tile.monsterData = undefined
              messages.push(`Stinking Cloud killed ${killedMonsterName}!`)
            }
          }
        }
      }
    }
    
    if (monstersAffected > 0) {
      messages.push(`Stinking Cloud dealt ${effect.damage} damage to ${monstersAffected} monster(s)`)
    }
    
    return messages
  }
  
  /**
   * Get a random spell for character creation
   */
  getRandomSpell(): SpellData {
    return ALL_SPELLS[Math.floor(Math.random() * ALL_SPELLS.length)]
  }
  
  /**
   * Get spell by ID
   */
  getSpellById(id: string): SpellData | undefined {
    return ALL_SPELLS.find(spell => spell.id === id)
  }
}