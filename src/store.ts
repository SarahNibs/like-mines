import { GameState, getTileAt, TileContent } from './types'
import { createInitialGameState, createCharacterRunState, revealTile, checkBoardStatus, progressToNextLevel, fightMonster, addItemToInventory, removeItemFromInventory, applyItemEffect } from './gameLogic'
import { DumbAI, AIOpponent } from './ai'
import { generateClue } from './clues'
import { TileContentManager } from './TileContentManager'
import { InventoryManager, ItemUsageResult } from './InventoryManager'
import { GameFlowManager, TileRevealResult, BoardProgressionResult, TurnEndResult } from './GameFlowManager'
import { ShopManager } from './ShopManager'
import { TrophyManager } from './TrophyManager'
import { ToolModeManager } from './ToolModeManager'
import { UIStateManager } from './UIStateManager'
import { AIManager } from './AIManager'

// Simple vanilla TypeScript store with observers
class GameStore {
  private state: GameState
  private observers: Array<() => void> = []
  private ai: AIOpponent
  private tileContentManager: TileContentManager
  private inventoryManager: InventoryManager
  private gameFlowManager: GameFlowManager
  private shopManager: ShopManager
  private trophyManager: TrophyManager
  private toolModeManager: ToolModeManager
  private uiStateManager: UIStateManager
  private aiManager: AIManager
  private pendingAITurn: boolean = false

  constructor() {
    this.state = createInitialGameState()
    this.state.gameStatus = 'character-select' // Start in character selection
    this.ai = new DumbAI()
    this.tileContentManager = new TileContentManager()
    this.inventoryManager = new InventoryManager()
    this.gameFlowManager = new GameFlowManager()
    this.shopManager = new ShopManager()
    this.trophyManager = new TrophyManager()
    this.toolModeManager = new ToolModeManager()
    this.uiStateManager = new UIStateManager()
    this.aiManager = new AIManager(this.ai)
  }

  // Get current state
  getState(): GameState {
    return this.state
  }

  // Subscribe to state changes
  subscribe(callback: () => void): () => void {
    this.observers.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(callback)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  // Notify all observers of state changes
  private notify(): void {
    this.observers.forEach(callback => callback())
  }

  // Update state and notify observers
  private setState(newState: Partial<GameState>): void {
    this.state = { ...this.state, ...newState }
    this.notify()
  }

  // Actions
  revealTileAt(x: number, y: number, bypassRewind: boolean = false): boolean {
    // Create tile content handler that bridges to existing logic
    const tileContentHandler = (tile: any) => {
      // Get tile content result without executing special actions
      const result = this.handleTileContent(tile)
      
      return {
        updatedRun: result.updatedRun,
        triggerUpgradeChoice: result.triggerUpgradeChoice,
        triggerShop: result.triggerShop,
        playerDied: result.playerDied
      }
    }
    
    // Use GameFlowManager for core tile reveal logic
    const result = this.gameFlowManager.revealTile(this.state, x, y, tileContentHandler, bypassRewind)
    
    if (!result.success) {
      return false
    }
    
    // Apply state changes from GameFlowManager
    this.setState(result.newGameState)
    
    // Force board update to ensure any direct modifications (like RICH effects) are reflected
    this.setState({ board: { ...this.state.board } })
    
    // Handle player death
    if (result.playerDied) {
      return true
    }
    
    // Handle upgrade choice pause
    if (result.shouldPauseForUpgrade) {
      // Remember if AI should turn after upgrade choice
      this.pendingAITurn = result.deferredAITurn
      // Trigger the upgrade choice UI
      this.triggerUpgradeChoice()
      return true
    }
    
    // Handle shop pause
    if (result.shouldPauseForShop) {
      // Remember if AI should turn after shop closes
      this.pendingAITurn = result.deferredAITurn
      // Trigger the shop opening
      this.openShop().catch(console.error)
      return true
    }
    
    // Handle board completion
    if (this.state.boardStatus === 'won') {
      this.handleBoardWon()
    } else if (this.state.boardStatus === 'lost') {
      this.handleBoardLost()
    } else if (result.shouldTriggerAI) {
      this.scheduleAITurn()
    }
    
    return true
  }


  // Schedule AI turn with delay for better UX (delegated to AIManager)
  private scheduleAITurn(): void {
    this.aiManager.scheduleTurn(this.state.board, (result) => {
      if (result.success) {
        this.executeAITurn()
      } else {
        console.log('AI has no valid moves available')
      }
    })
  }

  // Execute AI turn
  private executeAITurn(): void {
    const result = this.gameFlowManager.executeAITurn(this.state)
    
    if (!result.success) {
      return
    }
    
    // Apply state changes from GameFlowManager
    this.setState(result.newGameState)
    
    // Handle board completion
    if (this.state.boardStatus === 'won') {
      this.handleBoardWon()
    } else if (this.state.boardStatus === 'lost') {
      this.handleBoardLost()
    }
  }

  // Handle board won (player revealed all their tiles first)
  private handleBoardWon(): void {
    // If shop is open, don't auto-progress - wait for shop to close
    if (this.state.shopOpen) {
      console.log('Shop is open - waiting for player to close shop before progressing')
      return
    }
    
    // Use GameFlowManager to handle board won
    const result = this.gameFlowManager.handleBoardWon(this.state, () => {
      this.awardTrophies()
    }, () => {
      this.progressToNextBoard()
    })
    
    if (result.success) {
      this.setState(result.newGameState)
    }
  }

  // Handle board lost (AI revealed all their tiles first)
  private handleBoardLost(): void {
    const result = this.gameFlowManager.handleBoardLost(this.state)
    
    if (result.success) {
      this.setState(result.newGameState)
    }
  }

  // End current player turn manually
  endTurn(): void {
    const result = this.gameFlowManager.endTurn(this.state)
    
    if (!result.success) {
      return
    }
    
    this.setState(result.newGameState)
    
    if (result.shouldTriggerAI) {
      this.scheduleAITurn()
    }
  }

  // Progress to next board
  progressToNextBoard(): void {
    const result = this.gameFlowManager.progressToNextBoard(this.state)
    
    if (!result.success) {
      return
    }
    
    // Reset AI for new board (delegated to AIManager)
    this.aiManager.resetForNewBoard()
    
    this.setState(result.newGameState)
  }

  // Toggle tile annotation (3-state cycle: none -> slash -> dog-ear -> none)
  toggleAnnotation(x: number, y: number): boolean {
    const tile = getTileAt(this.state.board, x, y)
    if (!tile || tile.revealed) {
      return false
    }
    
    // Cycle through annotation states
    switch (tile.annotated) {
      case 'none':
        tile.annotated = 'slash'
        break
      case 'slash':
        tile.annotated = 'dog-ear'
        break
      case 'dog-ear':
        tile.annotated = 'none'
        break
    }
    
    this.setState({
      board: { ...this.state.board }
    })
    return true
  }

  // Handle tile content when revealed - returns the result without executing special actions
  private handleTileContent(tile: any): any {
    return this.tileContentManager.handleTileContent(tile, this.state.run, this.state.board)
  }

  // Execute the special actions from tile content handling
  private executeTileContentActions(result: any): void {
    if (result.triggerUpgradeChoice) {
      this.triggerUpgradeChoice()
      console.log(result.message)
      this.setState({ run: result.updatedRun })
    } else if (result.triggerShop) {
      console.log(result.message)
      this.setState({ run: result.updatedRun })
      this.openShop().catch(console.error) // Call after setState to ensure run state is updated first
    } else if (result.playerDied) {
      console.log(result.message)
      this.setState({ 
        run: result.updatedRun,
        gameStatus: 'player-died' 
      })
      return
    } else {
      // Log the result message and update run state
      console.log(result.message)
      this.setState({ run: result.updatedRun })
    }
    
    // Update board if it was modified (e.g., RICH effect)
    if (result.boardModified) {
      this.setState({ 
        board: { ...this.state.board },
        run: result.updatedRun 
      })
    }
  }

  // Use item from inventory
  useInventoryItem(index: number): void {
    const item = this.state.run.inventory[index]
    if (!item) return
    
    const result = this.inventoryManager.useItem(
      item, 
      index, 
      this.state.run, 
      this.state.board
    )
    
    if (!result.success) {
      console.log(result.message)
      return
    }
    
    // Handle special activation modes
    if (result.activatedMode) {
      switch (result.activatedMode) {
        case 'transmute':
          this.startTransmuteMode(result.itemIndex!)
          break
        case 'detector':
          this.startDetectorMode(result.itemIndex!)
          break
        case 'key':
          this.startKeyMode(result.itemIndex!)
          break
        case 'staff':
          this.startStaffMode(result.itemIndex!)
          break
        case 'ring':
          this.useRing(result.itemIndex!)
          break
      }
    }
    
    // Handle crystal ball specific logic
    if (item.id === 'crystal-ball' && result.success) {
      console.log(result.message)
      
      // Extract tile position from message and reveal it
      const match = result.message.match(/\((\d+), (\d+)\)/)
      if (match) {
        const x = parseInt(match[1])
        const y = parseInt(match[2])
        const tile = getTileAt(this.state.board, x, y)
        if (tile && !tile.revealed) {
          tile.revealed = true
          console.log(`Crystal Ball revealed tile at (${x}, ${y})`)
        }
      }
      
      this.setState({ 
        run: result.updatedRun,
        board: { ...this.state.board } // Force re-render since tile was revealed
      })
      return
    }
    
    // Handle clue specific logic
    if (item.id === 'clue' && result.success) {
      this.grantAdditionalClue()
    }
    
    console.log(result.message)
    
    // Update run state
    this.setState({ run: result.updatedRun })
    
    // Update board if modified
    if (result.boardUpdated) {
      this.setState({ board: { ...this.state.board } })
    }
  }
  
  // Handle crystal ball result with tile revelation and content processing
  private handleCrystalBallResult(result: ItemUsageResult): void {
    // The InventoryManager handles revealing the tile, but we need to handle tile content
    // and check for board completion
    const revealPos = (result as any).revealedPosition
    if (revealPos) {
      const tile = getTileAt(this.state.board, revealPos.x, revealPos.y)
      if (tile) {
        // Process tile content through TileContentManager
        this.handleTileContent(tile)
        
        // Check for board completion
        const newBoardStatus = checkBoardStatus(this.state.board)
        if (newBoardStatus === 'won') {
          this.handleBoardWon()
        }
      }
    }
    
    // Update states
    this.setState({ 
      run: result.updatedRun,
      board: { ...this.state.board }
    })
  }



  // Grant additional clue functionality
  private grantAdditionalClue(): void {
    const newClue = generateClue(this.state.board, this.state.run.upgrades)
    this.setState({
      clues: [...this.state.clues, newClue]
    })
  }

  // Start transmute mode
  private startTransmuteMode(itemIndex: number): void {
    console.log('Transmute mode activated.')
    this.setState({ 
      transmuteMode: true,
      transmuteItemIndex: itemIndex
    })
  }

  // Handle transmute tile click (delegated to ToolModeManager)
  transmuteTileAt(x: number, y: number): boolean {
    if (!this.state.transmuteMode) return false
    
    const itemIndex = (this.state as any).transmuteItemIndex
    const result = this.toolModeManager.transmuteTileAt(this.state.board, x, y, this.state.run)
    
    // Always consume the item and exit transmute mode
    removeItemFromInventory(this.state.run, itemIndex)
    
    if (result.success) {
      // Update detector scans since tile ownership may have changed
      this.updateDetectorScans()
      
      this.setState({
        board: { ...this.state.board },
        run: { ...this.state.run },
        transmuteMode: false,
        transmuteItemIndex: undefined
      })
      return true
    } else {
      this.setState({
        run: { ...this.state.run },
        transmuteMode: false,
        transmuteItemIndex: undefined
      })
      return false
    }
  }

  // Cancel transmute mode
  cancelTransmute(): void {
    console.log('Transmute cancelled.')
    this.setState({
      transmuteMode: false,
      transmuteItemIndex: undefined
    })
  }

  // Start detector mode
  private startDetectorMode(itemIndex: number): void {
    console.log('Detector mode activated.')
    this.setState({ 
      detectorMode: true,
      detectorItemIndex: itemIndex
    })
  }

  // Handle detector tile click (delegated to ToolModeManager)
  detectTileAt(x: number, y: number): boolean {
    if (!this.state.detectorMode) return false
    
    const itemIndex = (this.state as any).detectorItemIndex
    const result = this.toolModeManager.detectTileAt(this.state.board, x, y)
    
    // Always consume the item and exit detector mode
    removeItemFromInventory(this.state.run, itemIndex)
    
    if (result.success) {
      // Apply scan results to the tile
      const tile = getTileAt(this.state.board, x, y)
      if (tile && result.scanData) {
        tile.detectorScan = result.scanData
      }
      
      this.setState({
        board: { ...this.state.board },
        run: { ...this.state.run },
        detectorMode: false,
        detectorItemIndex: undefined
      })
      return true
    } else {
      this.setState({
        run: { ...this.state.run },
        detectorMode: false,
        detectorItemIndex: undefined
      })
      return false
    }
  }

  // Cancel detector mode
  cancelDetector(): void {
    console.log('Detector targeting cancelled.')
    this.setState({
      detectorMode: false,
      detectorItemIndex: undefined
    })
  }

  // Start key mode
  private startKeyMode(itemIndex: number): void {
    console.log('Key mode activated.')
    this.setState({ 
      keyMode: true,
      keyItemIndex: itemIndex
    })
  }


  // Handle key tile click (delegated to ToolModeManager)
  useKeyAt(x: number, y: number): boolean {
    if (!this.state.keyMode) return false
    
    const itemIndex = (this.state as any).keyItemIndex
    const result = this.toolModeManager.useKeyAt(this.state.board, x, y)
    
    // Always consume the item and exit key mode
    removeItemFromInventory(this.state.run, itemIndex)
    
    if (result.success) {
      this.setState({
        board: { ...this.state.board },
        run: { ...this.state.run },
        keyMode: false,
        keyItemIndex: undefined
      })
      return true
    } else {
      this.setState({
        run: { ...this.state.run },
        keyMode: false,
        keyItemIndex: undefined
      })
      return false
    }
  }

  // Cancel key mode
  cancelKey(): void {
    console.log('Key targeting cancelled.')
    this.setState({
      keyMode: false,
      keyItemIndex: undefined
    })
  }

  // Start staff targeting mode
  private startStaffMode(itemIndex: number): void {
    console.log('Staff targeting mode activated.')
    this.setState({ 
      staffMode: true,
      staffItemIndex: itemIndex
    })
  }

  // Handle staff monster targeting (delegated to ToolModeManager)
  useStaffAt(x: number, y: number): boolean {
    if (!this.state.staffMode) return false
    
    const itemIndex = (this.state as any).staffItemIndex
    const staff = this.state.run.inventory[itemIndex]
    const result = this.toolModeManager.useStaffAt(this.state.board, x, y, this.state.run)
    
    if (result.success && result.monsterDefeated) {
      // RICH upgrade: add gold items to adjacent tiles when defeating monsters
      if (this.state.run.upgrades.includes('rich')) {
        const richResult = this.tileContentManager.applyRichEffect(this.state.board, x, y, this.state.run)
        if (richResult.success) {
          console.log(richResult.message)
        }
      }
    }
    
    // Handle staff charge management
    if (staff && staff.multiUse && result.success) {
      staff.multiUse.currentUses -= 1
      console.log(`Staff of Fireballs: ${staff.multiUse.currentUses}/${staff.multiUse.maxUses} uses remaining`)
      
      // Remove staff if no charges left
      if (staff.multiUse.currentUses <= 0) {
        removeItemFromInventory(this.state.run, itemIndex)
        console.log('Staff of Fireballs is depleted and removed from inventory')
      }
    }
    
    // Exit staff mode
    this.setState({
      board: { ...this.state.board },
      run: { ...this.state.run },
      staffMode: false,
      staffItemIndex: undefined
    })
    
    return result.success
  }

  // Cancel staff mode
  cancelStaff(): void {
    console.log('Staff targeting cancelled.')
    this.setState({
      staffMode: false,
      staffItemIndex: undefined
    })
  }

  // Start ring targeting mode
  useRing(itemIndex: number): void {
    console.log('Ring targeting mode activated.')
    this.setState({ 
      ringMode: true,
      ringItemIndex: itemIndex // Store which inventory slot to consume
    })
  }

  // Handle ring fog removal targeting (delegated to ToolModeManager)
  useRingAt(x: number, y: number): boolean {
    if (!this.state.ringMode) return false
    
    const itemIndex = (this.state as any).ringItemIndex
    const result = this.toolModeManager.useRingAt(this.state.board, x, y)
    
    console.log(result.message)
    
    if (result.inventoryModified) {
      // Consume ring charge or remove if no charges left
      const ring = this.state.run.inventory[itemIndex]
      
      if (ring && ring.multiUse) {
        ring.multiUse.currentUses--
        console.log(`Ring of True Seeing has ${ring.multiUse.currentUses} charges remaining`)
        
        if (ring.multiUse.currentUses <= 0) {
          // Remove the ring from inventory when no charges left
          this.state.run.inventory[itemIndex] = null
          console.log('Ring of True Seeing is depleted and removed from inventory')
        }
      }
      
      // Exit ring mode
      this.setState({
        board: { ...this.state.board },
        run: { ...this.state.run },
        ringMode: false,
        ringItemIndex: undefined
      })
    }
    
    return result.success
  }

  // Cancel ring mode
  cancelRing(): void {
    console.log('Ring targeting cancelled.')
    this.setState({
      ringMode: false,
      ringItemIndex: undefined
    })
  }

  // Update all existing detector scan results (called when tile ownership changes)
  private updateDetectorScans(): void {
    const board = this.state.board
    
    // Find all tiles with detector scans and update their results
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x]
        
        if (tile.detectorScan) {
          // Recalculate scan for this tile
          let playerAdjacent = 0
          let opponentAdjacent = 0
          let neutralAdjacent = 0
          
          // Check all 9 positions in 3x3 area (including center)
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const adjTile = getTileAt(board, x + dx, y + dy)
              if (adjTile) {
                if (adjTile.owner === 'player') playerAdjacent++
                else if (adjTile.owner === 'opponent') opponentAdjacent++
                else if (adjTile.owner === 'neutral') neutralAdjacent++
              }
            }
          }
          
          // Update the scan results
          tile.detectorScan = {
            playerAdjacent,
            opponentAdjacent,
            neutralAdjacent
          }
        }
      }
    }
  }

  // Shop functionality (delegated to ShopManager and UIStateManager)
  async openShop(): Promise<void> {
    const shopItems = await this.shopManager.openShop(this.state)
    this.uiStateManager.openShop()
    this.setState({
      shopOpen: true,
      shopItems: shopItems
    })
  }

  // Buy item from shop
  buyShopItem(index: number): boolean {
    if (!this.state.shopOpen || index >= this.state.shopItems.length) {
      return false
    }
    
    const shopItem = this.state.shopItems[index]
    const run = this.state.run
    
    // Use ShopManager to validate purchase
    const validation = this.shopManager.canPurchaseItem(run, shopItem, this.state.shopOpen, this.state.shopItems, index)
    if (!validation.canPurchase) {
      console.log(validation.reason)
      return false
    }
    
    // Deduct gold
    run.gold -= shopItem.cost
    
    // Handle upgrades vs items
    if (shopItem.isUpgrade) {
      // Apply upgrade immediately
      this.applyUpgrade(shopItem.item.id)
      console.log(`Bought and applied ${shopItem.item.name} upgrade for ${shopItem.cost} gold`)
      
      // Remove the bought item from shop
      const newShopItems = [...this.state.shopItems]
      newShopItems.splice(index, 1)
      
      this.setState({ 
        run: { ...this.state.run },
        shopItems: newShopItems
      })
    } else if (shopItem.item.immediate) {
      // Use immediate item right away
      const { applyItemEffect } = require('./items')
      const message = applyItemEffect(run, shopItem.item)
      console.log(`Bought and used ${shopItem.item.name} for ${shopItem.cost} gold: ${message}`)
      
      // Remove the bought item from shop
      const newShopItems = [...this.state.shopItems]
      newShopItems.splice(index, 1)
      
      this.setState({ 
        run: { ...run },
        shopItems: newShopItems
      })
    } else {
      // Try to add item to inventory
      const success = addItemToInventory(run, shopItem.item)
      if (!success) {
        console.log(`Bought ${shopItem.item.name} for ${shopItem.cost} gold but inventory full - item lost!`)
      } else {
        console.log(`Bought ${shopItem.item.name} for ${shopItem.cost} gold`)
      }
      
      // Remove the bought item from shop
      const newShopItems = [...this.state.shopItems]
      newShopItems.splice(index, 1)
      
      this.setState({ 
        run: { ...run },
        shopItems: newShopItems
      })
    }
    return true
  }

  // Close shop (delegated to UIStateManager)
  closeShop(): void {
    const wasBoardWon = this.state.boardStatus === 'won'
    const shouldTriggerAI = this.pendingAITurn
    
    this.uiStateManager.closeShop()
    
    this.setState({
      shopOpen: false,
      shopItems: []
    })
    
    // Clear pending AI turn flag
    this.pendingAITurn = false
    
    // If board was won while shop was open, trigger progression now
    if (wasBoardWon) {
      console.log('Shop closed and board was won - triggering progression')
      this.handleBoardWon()
    } else if (shouldTriggerAI && this.state.currentTurn === 'opponent' && this.state.boardStatus === 'in-progress') {
      // Trigger deferred AI turn
      console.log('Shop closed - triggering deferred AI turn')
      this.scheduleAITurn()
    }
  }

  // Apply upgrade effects
  applyUpgrade(upgradeId: string): void {
    const run = { ...this.state.run }
    
    // For repeatable upgrades, add multiple instances; for non-repeatable, only add once
    const isRepeatable = ['attack', 'defense', 'healthy', 'income', 'traders', 'bag', 'left-hand', 'right-hand', 'resting'].includes(upgradeId)
    
    if (isRepeatable || !run.upgrades.includes(upgradeId)) {
      run.upgrades = [...run.upgrades, upgradeId]
    } else {
      // Non-repeatable upgrade already owned, don't add again
      console.log(`Already have ${upgradeId} upgrade (non-repeatable)`)
      return
    }
    
    // Apply upgrade effects
    switch (upgradeId) {
      case 'attack':
        run.attack += 2
        break
      case 'defense':
        run.defense += 1
        break
      case 'healthy':
        run.maxHp += 25
        break
      case 'income':
        run.loot += 1
        break
      case 'bag':
        run.maxInventory += 1
        run.inventory.push(null) // Add one more inventory slot
        break
      // QUICK, RICH, WISDOM, TRADERS, LEFT_HAND, RIGHT_HAND are passive and don't need immediate effects
      case 'quick':
      case 'rich':
      case 'wisdom':
      case 'traders':
      case 'left-hand':
      case 'right-hand':
        // These are handled at clue generation / board generation time
        break
      case 'resting':
        // This is handled at tile reveal time
        break
    }
    
    this.setState({ run })
  }


  // Rewind methods removed

  // Show discard confirmation widget (delegated to UIStateManager)
  showDiscardConfirmation(index: number): void {
    const item = this.state.run.inventory[index]
    if (!item) return
    
    this.uiStateManager.showDiscardConfirmation(index, item.name)
    
    // Update GameState to reflect UIStateManager state
    this.setState({
      pendingDiscard: {
        itemIndex: index,
        itemName: item.name
      }
    })
  }

  // Confirm discard from widget (delegated to UIStateManager)
  confirmDiscard(): void {
    const discardConfirmation = this.uiStateManager.getDiscardConfirmation()
    if (!discardConfirmation) return
    
    const { itemIndex, itemName } = discardConfirmation
    console.log(`Discarded ${itemName}`)
    removeItemFromInventory(this.state.run, itemIndex)
    
    this.uiStateManager.hideDiscardConfirmation()
    
    this.setState({ 
      run: { ...this.state.run },
      pendingDiscard: null
    })
  }

  // Cancel discard from widget (delegated to UIStateManager)
  cancelDiscard(): void {
    this.uiStateManager.hideDiscardConfirmation()
    this.setState({ pendingDiscard: null })
  }

  // Show upgrade choice widget
  triggerUpgradeChoice(): void {
    // Import available upgrades and pick 3 random ones
    import('./upgrades').then(({ getAvailableUpgrades }) => {
      const availableUpgrades = getAvailableUpgrades(this.state.run.upgrades)
      
      // Shuffle and pick 3 random upgrades
      const shuffled = [...availableUpgrades].sort(() => Math.random() - 0.5)
      const choices = shuffled.slice(0, 3)
      
      this.setState({
        upgradeChoice: { choices }
      })
    })
  }

  // Choose one of the upgrade options
  chooseUpgrade(index: number): void {
    if (!this.state.upgradeChoice || index < 0 || index >= this.state.upgradeChoice.choices.length) return
    
    const chosenUpgrade = this.state.upgradeChoice.choices[index]
    if (!chosenUpgrade) return
    
    this.applyUpgrade(chosenUpgrade.id)
    
    // Check if we need to trigger deferred AI turn
    const shouldTriggerAI = this.pendingAITurn && 
                           this.state.currentTurn === 'opponent' && 
                           this.state.gameStatus === 'playing' && 
                           this.state.boardStatus === 'in-progress'
    
    
    // Clear the upgrade choice widget and pending flags
    this.gameFlowManager.clearPendingUpgradeChoice()
    this.pendingAITurn = false
    this.setState({
      upgradeChoice: null
    })
    
    // Now trigger deferred AI turn if needed
    if (shouldTriggerAI) {
      console.log('Upgrade chosen - triggering deferred AI turn')
      this.scheduleAITurn()
    }
    
    console.log(`Chose ${chosenUpgrade.name} upgrade!`)
  }

  // Cancel upgrade choice (shouldn't normally happen, but for safety)
  cancelUpgradeChoice(): void {
    this.setState({ upgradeChoice: null })
  }

  // Discard item from inventory
  discardInventoryItem(index: number): void {
    const result = this.inventoryManager.discardItem(this.state.run, index)
    if (result.success) {
      console.log(result.message)
      this.setState({ run: result.updatedRun })
    }
  }


  // Select character and start game
  selectCharacter(characterId: string): void {
    if (this.state.gameStatus !== 'character-select') {
      return
    }
    
    // Clear any existing timeouts and reset GameFlowManager
    this.gameFlowManager.cleanup()
    this.pendingAITurn = false
    
    // Create character-specific run state
    const characterRun = createCharacterRunState(characterId)
    
    // Import board generation functions to create proper level 1 board with character upgrades
    import('./gameLogic').then(({ createBoardForLevel }) => {
      import('./clues').then(({ generateClue }) => {
        // Create board for level 1 with character upgrades applied
        const board = createBoardForLevel(1, characterRun.gold, characterRun.upgrades)
        
        // Apply WISDOM upgrade: add detector scan to random tile (for level 1)
        if (characterRun.upgrades.includes('wisdom')) {
          const allTiles = []
          for (let y = 0; y < board.height; y++) {
            for (let x = 0; x < board.width; x++) {
              allTiles.push({x, y})
            }
          }
          
          if (allTiles.length > 0) {
            const randomTile = allTiles[Math.floor(Math.random() * allTiles.length)]
            const tile = board.tiles[randomTile.y][randomTile.x]
            
            // Apply detector scan (same logic as detector item)
            let playerAdjacent = 0
            let opponentAdjacent = 0
            let neutralAdjacent = 0
            
            // Check all 9 positions in 3x3 area (including center)
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const adjX = randomTile.x + dx
                const adjY = randomTile.y + dy
                if (adjX >= 0 && adjX < board.width && adjY >= 0 && adjY < board.height) {
                  const adjTile = board.tiles[adjY][adjX]
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
            console.log(`WIZARD: Applied detector scan to tile (${randomTile.x}, ${randomTile.y})`)
          }
        }
        
        // Generate initial clue with character upgrades
        const initialClue = generateClue(board, characterRun.upgrades)
        
        // Create complete game state
        const gameState = {
          board,
          currentTurn: 'player' as const,
          gameStatus: 'playing' as const,
          boardStatus: 'in-progress' as const,
          clues: [initialClue],
          run: characterRun,
          transmuteMode: false,
          detectorMode: false,
          keyMode: false,
          staffMode: false,
          ringMode: false,
          shopOpen: false,
          shopItems: []
        }
        
        console.log(`Selected character: ${characterId}`)
        console.log(`Starting upgrades:`, characterRun.upgrades)
        console.log(`Starting items:`, characterRun.inventory.filter(item => item !== null))
        console.log(`Board generated with character upgrades applied`)
        
        this.setState(gameState)
        
        // Force immediate UI update to show clues with character bonuses
        this.notify()
      })
    })
  }

  resetGame(): void {
    // Clean up GameFlowManager timeouts
    this.gameFlowManager.cleanup()
    
    // Reset flags
    this.pendingAITurn = false
    
    // Reset AI for new game (delegated to AIManager)
    this.aiManager.resetForNewBoard()
    
    const initialState = createInitialGameState()
    initialState.gameStatus = 'character-select' // Start in character selection
    this.setState(initialState)
  }

  // Debug helpers for testing win/loss conditions
  revealAllPlayerTiles(): void {
    const board = this.state.board
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x]
        if (tile.owner === 'player' && !tile.revealed) {
          revealTile(board, x, y, 'player')
        }
      }
    }
    
    const newBoardStatus = checkBoardStatus(board)
    this.setState({
      board: { ...board },
      boardStatus: newBoardStatus
    })
    
    // Handle board completion
    if (newBoardStatus === 'won') {
      this.awardTrophies()
      this.handleBoardWon()
    } else if (newBoardStatus === 'lost') {
      this.handleBoardLost()
    }
  }

  revealAllOpponentTiles(): void {
    const board = this.state.board
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x]
        if (tile.owner === 'opponent' && !tile.revealed) {
          revealTile(board, x, y, 'opponent')
        }
      }
    }
    
    const newBoardStatus = checkBoardStatus(board)
    this.setState({
      board: { ...board },
      boardStatus: newBoardStatus
    })
    
    // Handle board completion
    if (newBoardStatus === 'won') {
      this.handleBoardWon()
    } else if (newBoardStatus === 'lost') {
      this.handleBoardLost()
    }
  }

  // Award trophies for winning a board (delegated to TrophyManager)
  awardTrophies(): void {
    const result = this.trophyManager.processVictoryTrophies(this.state.board, this.state.run.trophies)
    this.setState({
      run: {
        ...this.state.run,
        trophies: result.finalTrophies
      }
    })
  }

  // Collapse trophies (delegated to TrophyManager) 
  collapseTrophies(): void {
    const result = this.trophyManager.collapseTrophies(this.state.run.trophies)
    if (result.collapsed) {
      this.setState({
        run: {
          ...this.state.run,
          trophies: result.finalTrophies
        }
      })
    }
  }
  
}

// Export singleton instance
export const gameStore = new GameStore()