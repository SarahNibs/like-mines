/**
 * Tests for SpellManager - spell definitions and casting logic
 */

import { SpellManager, ALL_SPELLS, MAGIC_MISSILE, MAGE_HAND, STINKING_CLOUD, GLIMPSE } from '../SpellManager'
import { RunState, SpellData, SpellEffect, GameState, Board } from '../types'
import { createInitialRunState } from '../gameLogic'

describe('SpellManager', () => {
  let spellManager: SpellManager
  let runState: RunState
  let mockGameState: GameState

  beforeEach(() => {
    spellManager = new SpellManager()
    runState = {
      ...createInitialRunState(),
      mana: 5,
      maxMana: 5,
      currentLevel: 3
    }
    
    // Create a mock board for testing
    const mockBoard: Board = {
      width: 8,
      height: 8,
      tiles: Array(8).fill(null).map(() => 
        Array(8).fill(null).map(() => ({
          revealed: false,
          content: 'empty',
          owner: 'player' as const
        }))
      )
    }
    
    mockGameState = {
      board: mockBoard,
      currentTurn: 'player',
      gameStatus: 'playing',
      boardStatus: 'in-progress',
      clues: [],
      run: runState,
      transmuteMode: false,
      detectorMode: false,
      keyMode: false,
      staffMode: false,
      ringMode: false,
      spellTargetMode: false
    }
  })

  describe('spell definitions', () => {
    it('should have all required spells defined', () => {
      expect(ALL_SPELLS).toHaveLength(4)
      expect(ALL_SPELLS).toContain(MAGIC_MISSILE)
      expect(ALL_SPELLS).toContain(MAGE_HAND)
      expect(ALL_SPELLS).toContain(STINKING_CLOUD)
      expect(ALL_SPELLS).toContain(GLIMPSE)
    })

    it('should have valid spell structure', () => {
      ALL_SPELLS.forEach(spell => {
        expect(spell).toHaveProperty('id')
        expect(spell).toHaveProperty('name')
        expect(spell).toHaveProperty('description')
        expect(spell).toHaveProperty('icon')
        expect(spell).toHaveProperty('manaCost')
        expect(spell).toHaveProperty('targetType')
        
        expect(typeof spell.id).toBe('string')
        expect(typeof spell.name).toBe('string')
        expect(typeof spell.description).toBe('string')
        expect(typeof spell.icon).toBe('string')
        expect(typeof spell.manaCost).toBe('number')
        expect(['none', 'tile', 'monster']).toContain(spell.targetType)
        
        expect(spell.manaCost).toBeGreaterThan(0)
        expect(spell.id.length).toBeGreaterThan(0)
        expect(spell.name.length).toBeGreaterThan(0)
      })
    })

    it('should have correct mana costs', () => {
      expect(MAGIC_MISSILE.manaCost).toBe(1)
      expect(MAGE_HAND.manaCost).toBe(2)
      expect(STINKING_CLOUD.manaCost).toBe(2)
      expect(GLIMPSE.manaCost).toBe(2)
    })

    it('should have correct target types', () => {
      expect(MAGIC_MISSILE.targetType).toBe('monster')
      expect(MAGE_HAND.targetType).toBe('tile')
      expect(STINKING_CLOUD.targetType).toBe('tile')
      expect(GLIMPSE.targetType).toBe('none')
    })
  })

  describe('canCastSpell', () => {
    it('should allow casting when mana is sufficient', () => {
      const result = spellManager.canCastSpell(MAGIC_MISSILE, runState)
      expect(result.canCast).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should prevent casting when mana is insufficient', () => {
      runState.mana = 0
      const result = spellManager.canCastSpell(MAGIC_MISSILE, runState)
      expect(result.canCast).toBe(false)
      expect(result.reason).toContain('Not enough mana')
    })

    it('should calculate exact mana requirements', () => {
      runState.mana = 1
      
      // Can cast 1-mana spell
      expect(spellManager.canCastSpell(MAGIC_MISSILE, runState).canCast).toBe(true)
      
      // Cannot cast 2-mana spells
      expect(spellManager.canCastSpell(MAGE_HAND, runState).canCast).toBe(false)
      expect(spellManager.canCastSpell(STINKING_CLOUD, runState).canCast).toBe(false)
      expect(spellManager.canCastSpell(GLIMPSE, runState).canCast).toBe(false)
    })
  })

  describe('castSpell', () => {
    it('should return success when casting spells with valid parameters', () => {
      // Add a monster to the target tile for Magic Missile
      mockGameState.board.tiles[1][1].monsterData = {
        id: 'test-monster-1',
        name: 'Test Monster',
        icon: '👹',
        attack: 1,
        defense: 0,
        hp: 5
      }
      
      const result = spellManager.castSpell(MAGIC_MISSILE, runState, mockGameState, 1, 1)
      expect(result.success).toBe(true)
      // Note: Mana deduction is handled by the store after successful casting
      expect(runState.mana).toBe(5) // Mana should not be deducted by SpellManager
    })

    it('should fail when insufficient mana', () => {
      runState.mana = 0
      const result = spellManager.castSpell(MAGIC_MISSILE, runState)
      expect(result.success).toBe(false)
      expect(result.message).toContain('Not enough mana')
    })

    it('should require targeting for targeted spells', () => {
      const result = spellManager.castSpell(MAGIC_MISSILE, runState)
      expect(result.success).toBe(false)
      expect(result.requiresTargeting).toBe(true)
    })

    it('should work without targeting for non-targeted spells', () => {
      const result = spellManager.castSpell(GLIMPSE, runState, mockGameState)
      expect(result.success).toBe(true)
      expect(result.message).toContain('Glimpse')
    })
  })

  describe('Stinking Cloud spell effect', () => {
    it('should create persistent spell effect', () => {
      const result = spellManager.castSpell(STINKING_CLOUD, runState, mockGameState, 3, 3)
      
      expect(result.success).toBe(true)
      expect(result.effectsAdded).toHaveLength(1)
      expect(runState.spellEffects).toHaveLength(1)
      
      const effect = runState.spellEffects[0]
      expect(effect.spellId).toBe('stinking-cloud')
      expect(effect.tileX).toBe(3)
      expect(effect.tileY).toBe(3)
      expect(effect.damage).toBe(2)
      expect(effect.remainingTurns).toBe(-1) // Permanent
    })
  })

  describe('utility methods', () => {
    it('should get random spell', () => {
      const spell = spellManager.getRandomSpell()
      expect(ALL_SPELLS).toContain(spell)
    })

    it('should get spell by ID', () => {
      expect(spellManager.getSpellById('magic-missile')).toEqual(MAGIC_MISSILE)
      expect(spellManager.getSpellById('mage-hand')).toEqual(MAGE_HAND)
      expect(spellManager.getSpellById('stinking-cloud')).toEqual(STINKING_CLOUD)
      expect(spellManager.getSpellById('glimpse')).toEqual(GLIMPSE)
      expect(spellManager.getSpellById('nonexistent')).toBeUndefined()
    })
  })
})