/**
 * InventoryManager - Handles inventory operations including item usage and discarding
 * Extracted from store.ts for better organization
 */

import { RunState, ItemData } from './types'

export interface InventoryResult {
  newRun: RunState
  success: boolean
  message?: string
  shouldRevealTile?: boolean
  tileToReveal?: { x: number, y: number }
  triggerBehavior?: {
    type: 'transmute' | 'detector' | 'key' | 'staff' | 'ring'
    itemIndex: number
    consumeItem: boolean
    parameters?: {
      target?: { x: number, y: number }
      damage?: number
      charges?: number
    }
  }
}

export class InventoryManager {
  
  /**
   * Use an item from inventory
   * @param currentRun Current run state
   * @param itemIndex Index of item to use
   * @param applyItemEffectCallback Callback to apply item effects
   * @param removeItemFromInventoryCallback Callback to remove items from inventory
   * @param generateClueCallback Callback to generate new clues
   * @param useCrystalBallCallback Callback to use crystal ball
   * @param useWhistleCallback Callback to use whistle
   * @returns Result of item usage
   */
  useInventoryItem(
    currentRun: RunState,
    itemIndex: number,
    applyItemEffectCallback: (run: RunState, item: ItemData) => string,
    removeItemFromInventoryCallback: (run: RunState, index: number) => void,
    generateClueCallback?: () => void,
    useCrystalBallCallback?: () => void,
    useWhistleCallback?: () => void
  ): InventoryResult {
    const item = currentRun.inventory[itemIndex]
    
    if (!item) {
      return {
        newRun: currentRun,
        success: false,
        message: 'No item in that slot'
      }
    }

    const run = { ...currentRun }
    
    // Handle different item types
    switch (item.id) {
      case 'crystal-ball': {
        // Crystal Ball reveals a random unrevealed player tile
        // Remove the item BEFORE revealing to free up inventory space
        removeItemFromInventoryCallback(run, itemIndex)
        if (useCrystalBallCallback) {
          useCrystalBallCallback()
        }
        
        return {
          newRun: run,
          success: true,
          shouldRevealTile: true,
          message: 'Crystal Ball used - revealing a random tile'
        }
      }
      
      case 'clue': {
        // Generate a new clue
        removeItemFromInventoryCallback(run, itemIndex)
        if (generateClueCallback) {
          generateClueCallback()
        }
        
        return {
          newRun: run,
          success: true,
          message: 'Clue used! You have gained an additional clue.'
        }
      }
      
      case 'ward': {
        // Stack ward bonuses
        if (!run.temporaryBuffs) run.temporaryBuffs = {}
        run.temporaryBuffs.ward = (run.temporaryBuffs.ward || 0) + 4
        if (!run.upgrades.includes('ward-temp')) {
          run.upgrades = [...run.upgrades, 'ward-temp'] // Add to upgrades list for display
        }
        removeItemFromInventoryCallback(run, itemIndex)
        
        const message = `Ward activated! +4 defense (total: +${run.temporaryBuffs.ward}) for your next fight.`
        console.log(message)
        
        return {
          newRun: run,
          success: true,
          message
        }
      }
      
      case 'blaze': {
        // Stack blaze bonuses
        if (!run.temporaryBuffs) run.temporaryBuffs = {}
        run.temporaryBuffs.blaze = (run.temporaryBuffs.blaze || 0) + 5
        if (!run.upgrades.includes('blaze-temp')) {
          run.upgrades = [...run.upgrades, 'blaze-temp'] // Add to upgrades list for display
        }
        removeItemFromInventoryCallback(run, itemIndex)
        
        const message = `Blaze activated! +5 attack (total: +${run.temporaryBuffs.blaze}) for your next fight.`
        console.log(message)
        
        return {
          newRun: run,
          success: true,
          message
        }
      }
      
      case 'protection': {
        // Stack protection charges
        if (!run.temporaryBuffs) run.temporaryBuffs = {}
        run.temporaryBuffs.protection = (run.temporaryBuffs.protection || 0) + 1
        removeItemFromInventoryCallback(run, itemIndex)
        
        const message = `Protection activated! Next ${run.temporaryBuffs.protection} opponent/neutral reveal(s) won't end your turn.`
        console.log(message)
        
        return {
          newRun: run,
          success: true,
          message
        }
      }
      
      case 'whistle': {
        removeItemFromInventoryCallback(run, itemIndex)
        if (useWhistleCallback) {
          useWhistleCallback()
        }
        
        return {
          newRun: run,
          success: true,
          message: 'Whistle used - redistributing monsters'
        }
      }
      
      // Items that trigger special behaviors
      case 'transmute': {
        return {
          newRun: currentRun,
          success: true,
          message: 'Transmute mode activated',
          triggerBehavior: {
            type: 'transmute',
            itemIndex,
            consumeItem: false // Don't consume until transmute is actually used
          }
        }
      }
      
      case 'detector': {
        return {
          newRun: currentRun,
          success: true,
          message: 'Detector mode activated',
          triggerBehavior: {
            type: 'detector',
            itemIndex,
            consumeItem: false // Don't consume until detector is actually used
          }
        }
      }
      
      case 'key': {
        return {
          newRun: currentRun,
          success: true,
          message: 'Key mode activated',
          triggerBehavior: {
            type: 'key',
            itemIndex,
            consumeItem: false // Don't consume until key is actually used
          }
        }
      }
      
      case 'staff-of-fireballs': {
        return {
          newRun: currentRun,
          success: true,
          message: 'Staff of Fireballs ready to use',
          triggerBehavior: {
            type: 'staff',
            itemIndex,
            consumeItem: false // Multi-use item, handle consumption in behavior
          }
        }
      }
      
      case 'ring-of-true-seeing': {
        return {
          newRun: currentRun,
          success: true,
          message: 'Ring of True Seeing ready to use',
          triggerBehavior: {
            type: 'ring',
            itemIndex,
            consumeItem: false // Multi-use item, handle consumption in behavior
          }
        }
      }
      
      default: {
        // Handle other items through the generic effect system
        const message = applyItemEffectCallback(run, item)
        removeItemFromInventoryCallback(run, itemIndex)
        
        return {
          newRun: run,
          success: true,
          message
        }
      }
    }
  }

  /**
   * Discard an item from inventory
   * @param currentRun Current run state
   * @param itemIndex Index of item to discard
   * @param removeItemFromInventoryCallback Callback to remove items from inventory
   * @returns Result of discard operation
   */
  discardInventoryItem(
    currentRun: RunState,
    itemIndex: number,
    removeItemFromInventoryCallback: (run: RunState, index: number) => void
  ): InventoryResult {
    const item = currentRun.inventory[itemIndex]
    
    if (!item) {
      return {
        newRun: currentRun,
        success: false,
        message: 'No item to discard in that slot'
      }
    }

    const run = { ...currentRun }
    removeItemFromInventoryCallback(run, itemIndex)
    
    console.log(`Discarded ${item.name}`)
    
    return {
      newRun: run,
      success: true,
      message: `Discarded ${item.name}`
    }
  }

  /**
   * Use a multi-use item like Staff of Fireballs
   * @param currentRun Current run state
   * @param itemIndex Index of multi-use item
   * @param damage Damage to deal (for staff)
   * @returns Updated run state and usage result
   */
  useMultiUseItem(
    currentRun: RunState,
    itemIndex: number,
    damage?: number
  ): InventoryResult {
    const item = currentRun.inventory[itemIndex]
    
    if (!item || !item.multiUse) {
      return {
        newRun: currentRun,
        success: false,
        message: 'Item is not a multi-use item'
      }
    }

    const run = { ...currentRun }
    
    // Handle different multi-use items
    switch (item.id) {
      case 'staff-of-fireballs': {
        if (damage === undefined) {
          return {
            newRun: currentRun,
            success: false,
            message: 'Staff requires damage amount'
          }
        }
        
        // Use one charge
        const updatedItem = {
          ...item,
          multiUse: {
            ...item.multiUse,
            currentUses: item.multiUse.currentUses - 1
          }
        }
        
        run.inventory[itemIndex] = updatedItem
        
        // Remove if depleted
        if (updatedItem.multiUse.currentUses <= 0) {
          run.inventory[itemIndex] = null
          console.log('Staff of Fireballs is depleted and removed from inventory')
        }
        
        return {
          newRun: run,
          success: true,
          message: `Staff deals ${damage} damage! ${updatedItem.multiUse.currentUses} uses remaining.`
        }
      }
      
      case 'ring-of-true-seeing': {
        // Use one charge
        const updatedItem = {
          ...item,
          multiUse: {
            ...item.multiUse,
            currentUses: item.multiUse.currentUses - 1
          }
        }
        
        run.inventory[itemIndex] = updatedItem
        
        // Remove if depleted
        if (updatedItem.multiUse.currentUses <= 0) {
          run.inventory[itemIndex] = null
          console.log('Ring of True Seeing is depleted and removed from inventory')
        }
        
        return {
          newRun: run,
          success: true,
          message: `Ring reveals tile contents! ${updatedItem.multiUse.currentUses} uses remaining.`
        }
      }
      
      default: {
        return {
          newRun: currentRun,
          success: false,
          message: `Unknown multi-use item: ${item.id}`
        }
      }
    }
  }

  /**
   * Check if an item is usable in the current context
   * @param item Item to check
   * @param context Current game context
   * @returns Whether item can be used
   */
  canUseItem(item: ItemData, context: 'normal' | 'combat' | 'shop'): boolean {
    // Items that can only be used in specific contexts
    switch (item.id) {
      case 'staff-of-fireballs':
        return context === 'combat'
      case 'ward':
      case 'blaze':
        return context === 'combat' || context === 'normal'
      default:
        return true
    }
  }

  /**
   * Trigger a behavior without using an inventory item (for spells, upgrades, etc.)
   * @param behaviorType Type of behavior to trigger
   * @param source Description of what triggered this behavior
   * @param parameters Optional parameters for the behavior
   * @returns Behavior result
   */
  triggerBehavior(
    behaviorType: 'transmute' | 'detector' | 'key' | 'staff' | 'ring',
    source: string = 'unknown',
    parameters?: { target?: { x: number, y: number }, damage?: number, charges?: number }
  ): InventoryResult {
    return {
      newRun: {} as RunState, // Will be ignored when triggerBehavior is present
      success: true,
      message: `${behaviorType} activated by ${source}`,
      triggerBehavior: {
        type: behaviorType,
        itemIndex: -1, // -1 indicates not from inventory
        consumeItem: false,
        parameters
      }
    }
  }

  /**
   * Use staff of fireballs at a specific target
   * @param currentRun Current run state
   * @param itemIndex Index of staff item
   * @param target Target coordinates
   * @param damage Damage to deal
   * @returns Result of staff usage
   */
  useStaffAt(
    currentRun: RunState,
    itemIndex: number,
    target: { x: number, y: number },
    damage: number = 6
  ): InventoryResult {
    const item = currentRun.inventory[itemIndex]
    
    if (!item || item.id !== 'staff-of-fireballs' || !item.multiUse) {
      return {
        newRun: currentRun,
        success: false,
        message: 'Invalid staff item'
      }
    }

    const run = { ...currentRun }
    
    // Use one charge
    const updatedItem = {
      ...item,
      multiUse: {
        ...item.multiUse,
        currentUses: item.multiUse.currentUses - 1
      }
    }
    
    run.inventory[itemIndex] = updatedItem
    
    // Remove if depleted
    if (updatedItem.multiUse.currentUses <= 0) {
      run.inventory[itemIndex] = null
      console.log('Staff of Fireballs is depleted and removed from inventory')
    }
    
    return {
      newRun: run,
      success: true,
      message: `Staff deals ${damage} damage at (${target.x}, ${target.y})! ${Math.max(0, updatedItem.multiUse.currentUses)} uses remaining.`,
      triggerBehavior: {
        type: 'staff',
        itemIndex,
        consumeItem: updatedItem.multiUse.currentUses <= 0,
        parameters: { target, damage }
      }
    }
  }

  /**
   * Use ring of true seeing at a specific target
   * @param currentRun Current run state
   * @param itemIndex Index of ring item
   * @param target Target coordinates
   * @returns Result of ring usage
   */
  useRingAt(
    currentRun: RunState,
    itemIndex: number,
    target: { x: number, y: number }
  ): InventoryResult {
    const item = currentRun.inventory[itemIndex]
    
    if (!item || item.id !== 'ring-of-true-seeing' || !item.multiUse) {
      return {
        newRun: currentRun,
        success: false,
        message: 'Invalid ring item'
      }
    }

    const run = { ...currentRun }
    
    // Use one charge
    const updatedItem = {
      ...item,
      multiUse: {
        ...item.multiUse,
        currentUses: item.multiUse.currentUses - 1
      }
    }
    
    run.inventory[itemIndex] = updatedItem
    
    // Remove if depleted
    if (updatedItem.multiUse.currentUses <= 0) {
      run.inventory[itemIndex] = null
      console.log('Ring of True Seeing is depleted and removed from inventory')
    }
    
    return {
      newRun: run,
      success: true,
      message: `Ring reveals tile at (${target.x}, ${target.y})! ${Math.max(0, updatedItem.multiUse.currentUses)} uses remaining.`,
      triggerBehavior: {
        type: 'ring',
        itemIndex,
        consumeItem: updatedItem.multiUse.currentUses <= 0,
        parameters: { target }
      }
    }
  }

  /**
   * Get information about an item's usage
   * @param item Item to get info for
   * @returns Usage information
   */
  getItemUsageInfo(item: ItemData): string {
    switch (item.id) {
      case 'crystal-ball':
        return 'Reveals a random unrevealed player tile'
      case 'clue':
        return 'Generates an additional clue about the board'
      case 'transmute':
        return 'Turn any unrevealed tile into your own tile'
      case 'detector':
        return 'Click any unrevealed tile to see how many adjacent tiles belong to each player'
      case 'key':
        return 'Unlocks any locked tile, removing both the lock and the corresponding key'
      case 'staff-of-fireballs':
        return item.multiUse 
          ? `Deals 6 damage to any monster (${item.multiUse.currentUses} uses remaining)`
          : 'Deals 6 damage to any monster'
      case 'ring-of-true-seeing':
        return item.multiUse
          ? `Reveals tile contents without triggering effects (${item.multiUse.currentUses} uses remaining)`
          : 'Reveals tile contents without triggering effects'
      case 'ward':
        return 'Grants +4 defense for your next fight only'
      case 'blaze':
        return 'Grants +5 attack for your next fight only'
      case 'protection':
        return 'The next tile you reveal never ends your turn'
      default:
        return item.description || 'Use this item'
    }
  }
}