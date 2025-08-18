/**
 * TurnManager - Handles turn flow, tile reveal processing, and turn transitions
 * Extracted from store.ts to break up the massive revealTileAt method
 */

import { GameState, RunState, Board, Tile, getTileAt, TileContent } from './types'
import { revealTile, checkBoardStatus, fightMonster, applyItemEffect, addItemToInventory } from './gameLogic'

export interface TurnResult {
  success: boolean
  newBoard?: Board
  newRun?: RunState
  newBoardStatus?: 'in-progress' | 'won' | 'lost'
  newTurn?: 'player' | 'opponent'
  gameOver?: boolean
  upgradeChoiceTriggered?: boolean
  shopOpened?: boolean
  richUpgradeTriggered?: { x: number, y: number }
  message?: string
}

export interface TileRevealContext {
  tile: Tile
  board: Board
  run: RunState
  bypassRewind?: boolean
}

export class TurnManager {
  
  /**
   * Process a player tile reveal with all associated effects
   * Replaces the massive revealTileAt method in store.ts
   */
  processPlayerTileReveal(x: number, y: number, gameState: GameState, bypassRewind: boolean = false): TurnResult {
    // Early validation
    if (gameState.gameStatus !== 'playing' || gameState.currentTurn !== 'player') {
      return { success: false, message: 'Not player turn or game not in progress' }
    }
    
    const tile = getTileAt(gameState.board, x, y)
    if (!tile || tile.revealed) {
      return { success: false, message: 'Invalid tile or already revealed' }
    }
    
    // Check chain constraints
    const chainCheckResult = this.checkChainConstraints(tile, gameState.board)
    if (!chainCheckResult.allowed) {
      return { success: false, message: chainCheckResult.message }
    }
    
    // Check protection activation
    const protectionContext = this.analyzeProtection(tile, gameState.run)
    
    // Perform the actual tile reveal
    const success = revealTile(gameState.board, x, y, 'player')
    if (!success) {
      return { success: false, message: 'Failed to reveal tile' }
    }
    
    // Process all the effects in order
    const context: TileRevealContext = { tile, board: gameState.board, run: gameState.run, bypassRewind }
    
    // 1. Check board status first
    const newBoardStatus = checkBoardStatus(gameState.board)
    
    // 2. Apply immediate rewards (loot, trophies)
    const rewardResult = this.processImmediateRewards(context, newBoardStatus)
    
    // 3. Apply upgrade effects (resting, etc.)
    const upgradeResult = this.processUpgradeEffects(context)
    
    // 4. Handle tile content
    const contentResult = this.processTileContent(context)
    
    // Check for game over after content processing
    if (contentResult.gameOver) {
      return {
        success: true,
        newBoard: gameState.board,
        newRun: gameState.run,
        newBoardStatus,
        gameOver: true,
        upgradeChoiceTriggered: contentResult.upgradeChoiceTriggered,
        shopOpened: contentResult.shopOpened,
        richUpgradeTriggered: contentResult.richUpgradeTriggered
      }
    }
    
    // 5. Process protection consumption
    const protectionResult = this.processProtectionConsumption(gameState.run, protectionContext)
    
    // 6. Determine turn transition
    const turnResult = this.determineTurnTransition(
      tile, 
      newBoardStatus, 
      protectionContext.hadProtection,
      contentResult.upgradeChoiceTriggered
    )
    
    return {
      success: true,
      newBoard: gameState.board,
      newRun: gameState.run,
      newBoardStatus,
      newTurn: turnResult.newTurn,
      upgradeChoiceTriggered: contentResult.upgradeChoiceTriggered,
      shopOpened: contentResult.shopOpened,
      richUpgradeTriggered: contentResult.richUpgradeTriggered,
      message: turnResult.message
    }
  }
  
  /**
   * Check if tile is blocked by chain constraints
   */
  private checkChainConstraints(tile: Tile, board: Board): { allowed: boolean, message?: string } {
    if (tile.chainData && tile.chainData.isBlocked) {
      const requiredTile = getTileAt(board, tile.chainData.requiredTileX, tile.chainData.requiredTileY)
      if (requiredTile && !requiredTile.revealed) {
        return {
          allowed: false,
          message: 'Cannot click this tile - it\'s chained! Must reveal the connected tile first.'
        }
      }
    }
    return { allowed: true }
  }
  
  /**
   * Analyze protection status for this tile reveal
   */
  private analyzeProtection(tile: Tile, run: RunState): { hadProtection: boolean, wouldActivate: boolean } {
    const wouldActivate = tile.owner !== 'player' && 
                          run.temporaryBuffs.protection && 
                          run.temporaryBuffs.protection > 0
    
    return {
      hadProtection: run.temporaryBuffs.protection > 0,
      wouldActivate
    }
  }
  
  /**
   * Process immediate rewards (loot, trophies) for revealed tile
   */
  private processImmediateRewards(context: TileRevealContext, boardStatus: 'in-progress' | 'won' | 'lost'): void {
    // Award loot bonus for revealing opponent tiles
    if (context.tile.owner === 'opponent') {
      context.run.gold += context.run.loot
    }
    
    // Note: Trophy awarding is handled separately in the calling store method
    // This keeps the TurnManager focused on turn mechanics rather than meta-progression
  }
  
  /**
   * Apply upgrade effects based on tile reveal
   */
  private processUpgradeEffects(context: TileRevealContext): void {
    // RESTING upgrade: heal when revealing neutral tiles
    if (context.tile.owner === 'neutral') {
      const restingCount = context.run.upgrades.filter(id => id === 'resting').length
      if (restingCount > 0) {
        const healAmount = restingCount * 3
        context.run.hp = Math.min(context.run.maxHp, context.run.hp + healAmount)
        console.log(`Resting: Healed ${healAmount} HP from revealing neutral tile`)
      }
    }
  }
  
  /**
   * Handle tile content (monsters, items, upgrades)
   */
  private processTileContent(context: TileRevealContext): {
    gameOver?: boolean
    upgradeChoiceTriggered?: boolean
    shopOpened?: boolean
    richUpgradeTriggered?: { x: number, y: number }
  } {
    const result = {}
    
    if (context.tile.content === TileContent.PermanentUpgrade && context.tile.upgradeData) {
      result.upgradeChoiceTriggered = true
    } else if (context.tile.content === TileContent.Item && context.tile.itemData) {
      const itemResult = this.processItemContent(context)
      Object.assign(result, itemResult)
    } else if (context.tile.content === TileContent.Monster && context.tile.monsterData) {
      const monsterResult = this.processMonsterContent(context)
      Object.assign(result, monsterResult)
    }
    
    return result
  }
  
  /**
   * Handle item tile content
   */
  private processItemContent(context: TileRevealContext): {
    gameOver?: boolean
    shopOpened?: boolean
  } {
    const item = context.tile.itemData!
    const result = {}
    
    if (item.immediate) {
      // Apply immediate effect
      const message = applyItemEffect(context.run, item)
      console.log(message)
      
      // Check for game over after immediate effects
      if (context.run.hp <= 0) {
        console.log('Player died! Game over.')
        result.gameOver = true
        return result
      }
      
      // Handle shop opening
      if (item.id === 'shop') {
        result.shopOpened = true
      }
    } else {
      // Try to add to inventory
      const success = addItemToInventory(context.run, item)
      if (!success) {
        this.handleInventoryFullItem(context.run, item)
      }
    }
    
    return result
  }
  
  /**
   * Handle monster tile content
   */
  private processMonsterContent(context: TileRevealContext): {
    gameOver?: boolean
    richUpgradeTriggered?: { x: number, y: number }
  } {
    const monster = context.tile.monsterData!
    const damage = fightMonster(monster, context.run)
    const newHp = context.run.hp - damage
    const result = {}
    
    // Check if player would die from this damage
    if (newHp <= 0) {
      // Note: Trophy stealing logic is handled in the calling store method
      // since it requires access to TrophyManager
      context.run.hp = newHp
      console.log('Player died! Game over.')
      result.gameOver = true
    } else {
      // Apply damage normally and award loot
      context.run.hp = newHp
      context.run.gold += context.run.loot
      
      // RICH upgrade: trigger on monster defeat
      if (context.run.upgrades.includes('rich')) {
        result.richUpgradeTriggered = { x: context.tile.x, y: context.tile.y }
      }
      
      console.log(`Fought ${monster.name}! Took ${damage} damage, gained ${context.run.loot} gold. HP: ${context.run.hp}/${context.run.maxHp}`)
    }
    
    return result
  }
  
  /**
   * Handle items when inventory is full
   */
  private handleInventoryFullItem(run: RunState, item: any): void {
    if (item.id === 'ward') {
      // Apply ward effect immediately
      if (!run.temporaryBuffs) run.temporaryBuffs = {}
      run.temporaryBuffs.ward = (run.temporaryBuffs.ward || 0) + 4
      if (!run.upgrades.includes('ward-temp')) {
        run.upgrades.push('ward-temp')
      }
      console.log(`Inventory full! Ward auto-applied: +4 defense (total: +${run.temporaryBuffs.ward}) for your next fight.`)
    } else if (item.id === 'blaze') {
      // Apply blaze effect immediately
      if (!run.temporaryBuffs) run.temporaryBuffs = {}
      run.temporaryBuffs.blaze = (run.temporaryBuffs.blaze || 0) + 5
      if (!run.upgrades.includes('blaze-temp')) {
        run.upgrades.push('blaze-temp')
      }
      console.log(`Inventory full! Blaze auto-applied: +5 attack (total: +${run.temporaryBuffs.blaze}) for your next fight.`)
    } else {
      console.log(`Inventory full! ${item.name} was lost.`)
    }
  }
  
  /**
   * Process protection buff consumption
   */
  private processProtectionConsumption(run: RunState, protectionContext: { hadProtection: boolean }): void {
    if (protectionContext.hadProtection && run.temporaryBuffs.protection) {
      run.temporaryBuffs.protection -= 1
      console.log(`Protection consumed! ${run.temporaryBuffs.protection} charges remaining.`)
    }
  }
  
  /**
   * Determine the next turn and any scheduling needed
   */
  private determineTurnTransition(
    tile: Tile, 
    boardStatus: 'in-progress' | 'won' | 'lost',
    hadProtection: boolean,
    upgradeChoiceTriggered: boolean
  ): { newTurn: 'player' | 'opponent', scheduleAI?: boolean, message?: string } {
    const isPlayerTile = tile.owner === 'player'
    
    // Player continues turn if they revealed their own tile, or if protection was active
    let newTurn: 'player' | 'opponent' = 'player'
    let scheduleAI = false
    
    if (boardStatus === 'in-progress' && !isPlayerTile && !hadProtection) {
      // Player revealed opponent/neutral tile without protection - turn ends
      newTurn = 'opponent'
      // Only schedule AI if no upgrade choice is pending
      if (!upgradeChoiceTriggered) {
        scheduleAI = true
      }
    }
    
    return {
      newTurn,
      scheduleAI,
      message: scheduleAI ? 'Turn ending, AI will move next' : undefined
    }
  }
  
  /**
   * Check if AI turn should be scheduled based on game state
   */
  shouldScheduleAITurn(
    newTurn: 'player' | 'opponent',
    boardStatus: 'in-progress' | 'won' | 'lost',
    upgradeChoiceTriggered: boolean,
    pendingUpgradeChoice: boolean
  ): boolean {
    return newTurn === 'opponent' && 
           boardStatus === 'in-progress' && 
           !upgradeChoiceTriggered && 
           !pendingUpgradeChoice
  }
}