/**
 * SpellManager - Handles spell definitions, validation, and casting logic
 */

import { SpellData, SpellEffect, RunState, GameState, Board } from './types'

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
    
    // Deduct mana
    run.mana -= spell.manaCost
    
    // Handle each spell type
    switch (spell.id) {
      case 'glimpse':
        return this.castGlimpse(run)
        
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
  private castGlimpse(run: RunState): SpellCastResult {
    // This will need integration with the clue system
    // For now, just return success - actual implementation comes later
    return {
      success: true,
      message: 'Cast Glimpse - new clue generated!'
    }
  }
  
  /**
   * Cast Magic Missile - damage monster on target tile
   */
  private castMagicMissile(run: RunState, gameState: GameState, targetX: number, targetY: number): SpellCastResult {
    const damage = Math.ceil(run.currentLevel / 2)
    // Implementation will need tile interaction - placeholder for now
    return {
      success: true,
      message: `Cast Magic Missile for ${damage} damage!`
    }
  }
  
  /**
   * Cast Mage Hand - interact with target tile
   */
  private castMageHand(run: RunState, gameState: GameState, targetX: number, targetY: number): SpellCastResult {
    // Implementation will need tile interaction - placeholder for now
    return {
      success: true,
      message: 'Cast Mage Hand - interacting with tile!'
    }
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
              tile.content = 'empty' as any
              tile.monsterData = undefined
              messages.push(`Stinking Cloud killed ${tile.monsterData.name}!`)
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