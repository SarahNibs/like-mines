import { GameState, getTileAt, TileContent } from './types'
import { createInitialGameState, revealTile, checkBoardStatus, progressToNextLevel, fightMonster, addItemToInventory, removeItemFromInventory, applyItemEffect } from './gameLogic'
import { DumbAI, AIOpponent } from './ai'
import { generateClue } from './clues'

// Simple vanilla TypeScript store with observers
class GameStore {
  private state: GameState
  private observers: Array<() => void> = []
  private ai: AIOpponent
  private aiTurnTimeout: number | null = null

  constructor() {
    this.state = createInitialGameState()
    this.ai = new DumbAI()
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
  revealTileAt(x: number, y: number): boolean {
    if (this.state.gameStatus !== 'playing' || this.state.currentTurn !== 'player') {
      return false
    }
    
    const tile = getTileAt(this.state.board, x, y)
    if (!tile || tile.revealed) {
      return false
    }
    
    // Check for Rewind protection on dangerous tiles
    if (this.checkRewindProtection(tile)) {
      return false // Player chose not to reveal
    }
    
    const success = revealTile(this.state.board, x, y, 'player')
    if (success) {
      const newBoardStatus = checkBoardStatus(this.state.board)
      const isPlayerTile = tile.owner === 'player'
      
      // Handle tile content after checking board status
      this.handleTileContent(tile)
      
      // Check if player died after handling content
      if (this.state.gameStatus === 'player-died') {
        return // Exit early if player died
      }
      
      // Player continues turn if they revealed their own tile, otherwise switch to AI
      const newTurn = (newBoardStatus === 'in-progress' && !isPlayerTile) ? 'opponent' : 'player'
      
      this.setState({
        board: { ...this.state.board },
        boardStatus: newBoardStatus,
        currentTurn: newTurn
      })
      
      // Handle board completion
      if (newBoardStatus === 'won') {
        this.handleBoardWon()
      } else if (newBoardStatus === 'lost') {
        this.handleBoardLost()
      } else if (newTurn === 'opponent') {
        // Trigger AI turn after a short delay (only if turn actually switched)
        this.scheduleAITurn()
      }
    }
    
    return success
  }


  // Schedule AI turn with delay for better UX
  private scheduleAITurn(): void {
    if (this.aiTurnTimeout) {
      clearTimeout(this.aiTurnTimeout)
    }
    
    this.aiTurnTimeout = window.setTimeout(() => {
      this.executeAITurn()
    }, 1000) // 1 second delay
  }

  // Execute AI turn
  private executeAITurn(): void {
    if (this.state.gameStatus !== 'playing' || this.state.currentTurn !== 'opponent') {
      return
    }
    
    const aiMove = this.ai.takeTurn(this.state.board)
    if (aiMove) {
      console.log(`AI reveals tile at (${aiMove.x}, ${aiMove.y})`)
      const success = revealTile(this.state.board, aiMove.x, aiMove.y, 'opponent')
      
      if (success) {
        const newBoardStatus = checkBoardStatus(this.state.board)
        
        // Generate new clue when switching to player turn and add to array
        const newClues = newBoardStatus === 'in-progress' ? 
          [...this.state.clues, generateClue(this.state.board)] : this.state.clues
        
        this.setState({
          board: { ...this.state.board },
          boardStatus: newBoardStatus,
          clues: newClues,
          // Switch back to player turn (if board still in progress)
          currentTurn: newBoardStatus === 'in-progress' ? 'player' : 'opponent'
        })
        
        // Handle board completion
        if (newBoardStatus === 'won') {
          this.handleBoardWon()
        } else if (newBoardStatus === 'lost') {
          this.handleBoardLost()
        }
      }
    }
  }

  // Handle board won (player revealed all their tiles first)
  private handleBoardWon(): void {
    console.log('Board won! Preparing for next level...')
    
    // Schedule transition to next level after delay
    setTimeout(() => {
      this.progressToNextBoard()
    }, 2000) // 2 second delay to show victory
  }

  // Handle board lost (AI revealed all their tiles first)
  private handleBoardLost(): void {
    console.log('Board lost! Run ends.')
    this.setState({
      gameStatus: 'opponent-won'
    })
  }

  // End current player turn manually
  endTurn(): void {
    if (this.state.gameStatus !== 'playing' || this.state.currentTurn !== 'player') {
      return
    }
    
    console.log('Player ending turn manually')
    this.setState({
      currentTurn: 'opponent'
    })
    
    // Trigger AI turn (which will generate clue when switching back to player)
    this.scheduleAITurn()
  }

  // Progress to next board
  progressToNextBoard(): void {
    const newState = progressToNextLevel(this.state)
    console.log(`Progressing to level ${newState.run.currentLevel}`)
    
    this.setState(newState)
  }

  // Toggle tile annotation
  toggleAnnotation(x: number, y: number): boolean {
    const tile = getTileAt(this.state.board, x, y)
    if (!tile || tile.revealed) {
      return false
    }
    
    tile.annotated = !tile.annotated
    this.setState({
      board: { ...this.state.board }
    })
    return true
  }

  // Handle tile content when revealed
  private handleTileContent(tile: any): void {
    const run = this.state.run
    
    if (tile.content === TileContent.Item && tile.itemData) {
      const item = tile.itemData
      
      if (item.immediate) {
        // Apply immediate effect
        const message = applyItemEffect(run, item)
        console.log(message) // For now, just log - we'll add a message system later
        
        // Check for game over after immediate effects (like bear trap)
        if (run.hp <= 0) {
          console.log('Player died! Game over.')
          this.setState({ gameStatus: 'player-died' })
          return
        }
        
        // Handle shop opening
        if (item.id === 'shop') {
          this.openShop()
        }
      } else {
        // Try to add to inventory
        const success = addItemToInventory(run, item)
        if (!success) {
          console.log(`Inventory full! ${item.name} was lost.`)
        }
      }
    } else if (tile.content === TileContent.Monster && tile.monsterData) {
      const monster = tile.monsterData
      const damage = fightMonster(monster, run.attack, run.defense)
      run.hp = run.hp - damage
      console.log(`Fought ${monster.name}! Took ${damage} damage. HP: ${run.hp}/${run.maxHp}`)
      
      // Check for game over
      if (run.hp <= 0) {
        console.log('Player died! Game over.')
        this.setState({ gameStatus: 'player-died' })
        return
      }
    }
  }

  // Use item from inventory
  useInventoryItem(index: number): void {
    const item = this.state.run.inventory[index]
    if (!item) return
    
    // Handle special items
    if (item.id === 'rewind') {
      console.log('Rewind is passive - only activates when revealing dangerous tiles')
      return // Do nothing - rewinds are passive items
    } else if (item.id === 'crystal-ball') {
      this.useCrystalBall()
    } else if (item.id === 'transmute') {
      this.startTransmuteMode(index)
      return // Don't consume the item yet
    } else if (item.id === 'detector') {
      this.startDetectorMode(index)
      return // Don't consume the item yet
    } else {
      const message = applyItemEffect(this.state.run, item)
      console.log(message)
    }
    
    removeItemFromInventory(this.state.run, index)
    this.setState({ run: { ...this.state.run } })
  }

  // Crystal ball functionality - reveal random player tile
  private useCrystalBall(): void {
    const board = this.state.board
    const unrevealedPlayerTiles = []
    
    // Find all unrevealed player tiles
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x]
        if (tile.owner === 'player' && !tile.revealed) {
          unrevealedPlayerTiles.push({ x, y })
        }
      }
    }
    
    if (unrevealedPlayerTiles.length === 0) {
      console.log('Crystal Ball: No unrevealed player tiles to reveal!')
      return
    }
    
    // Pick a random unrevealed player tile
    const randomIndex = Math.floor(Math.random() * unrevealedPlayerTiles.length)
    const tilePos = unrevealedPlayerTiles[randomIndex]
    
    console.log(`Crystal Ball: Revealing player tile at (${tilePos.x}, ${tilePos.y})`)
    
    // Reveal the tile and handle its content
    const tile = getTileAt(board, tilePos.x, tilePos.y)
    if (tile) {
      const success = revealTile(board, tilePos.x, tilePos.y, 'player')
      if (success) {
        // Handle tile content 
        this.handleTileContent(tile)
        
        // Update board status
        const newBoardStatus = checkBoardStatus(board)
        this.setState({
          board: { ...board },
          boardStatus: newBoardStatus
        })
        
        // Handle board completion if needed
        if (newBoardStatus === 'won') {
          this.handleBoardWon()
        } else if (newBoardStatus === 'lost') {
          this.handleBoardLost()
        }
      }
    }
  }

  // Start transmute mode
  private startTransmuteMode(itemIndex: number): void {
    console.log('Transmute activated! Click any unrevealed tile to convert it to your tile.')
    this.setState({ 
      transmuteMode: true,
      transmuteItemIndex: itemIndex // Store which inventory slot to consume
    })
  }

  // Handle transmute tile click
  transmuteTileAt(x: number, y: number): boolean {
    if (!this.state.transmuteMode) return false
    
    const tile = getTileAt(this.state.board, x, y)
    if (!tile || tile.revealed) {
      console.log('Can only transmute unrevealed tiles!')
      // Still consume the item even on invalid attempts
      const itemIndex = (this.state as any).transmuteItemIndex
      removeItemFromInventory(this.state.run, itemIndex)
      this.setState({
        run: { ...this.state.run },
        transmuteMode: false,
        transmuteItemIndex: undefined
      })
      return false
    }
    
    // Always consume the transmute item, regardless of success/failure
    const itemIndex = (this.state as any).transmuteItemIndex
    removeItemFromInventory(this.state.run, itemIndex)
    
    if (tile.owner === 'player') {
      console.log('Tile is already yours! Transmute consumed anyway.')
      this.setState({
        run: { ...this.state.run },
        transmuteMode: false,
        transmuteItemIndex: undefined
      })
      return false
    }
    
    // Convert tile to player ownership
    const oldOwner = tile.owner
    tile.owner = 'player'
    
    // Update board tile counts
    if (oldOwner === 'opponent') {
      this.state.board.opponentTilesTotal--
    }
    this.state.board.playerTilesTotal++
    
    console.log(`Transmuted ${oldOwner} tile at (${x}, ${y}) to player tile!`)
    
    // Update any existing detector scans since tile ownership changed
    this.updateDetectorScans()
    
    // Exit transmute mode (item already consumed above)
    this.setState({
      board: { ...this.state.board },
      run: { ...this.state.run },
      transmuteMode: false,
      transmuteItemIndex: undefined
    })
    
    return true
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
    console.log('Detector activated! Click any unrevealed tile to see adjacent tile info.')
    this.setState({ 
      detectorMode: true,
      detectorItemIndex: itemIndex // Store which inventory slot to consume
    })
  }

  // Handle detector tile click
  detectTileAt(x: number, y: number): boolean {
    if (!this.state.detectorMode) return false
    
    const tile = getTileAt(this.state.board, x, y)
    if (!tile) {
      console.log('Invalid tile position!')
      return false
    }
    
    // Count all tiles in 3x3 area including the middle tile
    let playerAdjacent = 0
    let opponentAdjacent = 0
    let neutralAdjacent = 0
    
    // Check all 9 positions in 3x3 area (including center)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const adjTile = getTileAt(this.state.board, x + dx, y + dy)
        if (adjTile) {
          if (adjTile.owner === 'player') playerAdjacent++
          else if (adjTile.owner === 'opponent') opponentAdjacent++
          else if (adjTile.owner === 'neutral') neutralAdjacent++
        }
      }
    }
    
    // Store scan results on the tile
    tile.detectorScan = {
      playerAdjacent,
      opponentAdjacent,
      neutralAdjacent
    }
    
    console.log(`Detector scan at (${x}, ${y}): ${playerAdjacent} player, ${opponentAdjacent} opponent, ${neutralAdjacent} neutral adjacent tiles`)
    
    // Consume the detector item and exit detector mode
    const itemIndex = (this.state as any).detectorItemIndex
    removeItemFromInventory(this.state.run, itemIndex)
    
    this.setState({
      board: { ...this.state.board },
      run: { ...this.state.run },
      detectorMode: false,
      detectorItemIndex: undefined
    })
    
    return true
  }

  // Cancel detector mode
  cancelDetector(): void {
    console.log('Detector cancelled.')
    this.setState({
      detectorMode: false,
      detectorItemIndex: undefined
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

  // Shop functionality
  private openShop(): void {
    // Generate 4 random items with costs 2, 3, 4, 5 gold
    import('./items').then(({ SHOP_ITEMS }) => {
      const costs = [2, 3, 4, 5]
      const shopItems = []
      
      for (let i = 0; i < 4; i++) {
        const randomItem = SHOP_ITEMS[Math.floor(Math.random() * SHOP_ITEMS.length)]
        shopItems.push({
          item: randomItem,
          cost: costs[i]
        })
      }
      
      console.log('Shop opened with items:', shopItems)
      this.setState({
        shopOpen: true,
        shopItems
      })
    })
  }

  // Buy item from shop
  buyShopItem(index: number): boolean {
    if (!this.state.shopOpen || index >= this.state.shopItems.length) {
      return false
    }
    
    const shopItem = this.state.shopItems[index]
    const run = this.state.run
    
    // Check if player has enough gold
    if (run.gold < shopItem.cost) {
      console.log(`Not enough gold! Need ${shopItem.cost}, have ${run.gold}`)
      return false
    }
    
    // Deduct gold
    run.gold -= shopItem.cost
    
    // Handle immediate vs inventory items
    if (shopItem.item.immediate) {
      // Use immediate item right away
      const message = applyItemEffect(run, shopItem.item)
      console.log(`Bought and used ${shopItem.item.name} for ${shopItem.cost} gold: ${message}`)
    } else {
      // Try to add item to inventory
      const success = addItemToInventory(run, shopItem.item)
      if (!success) {
        console.log(`Bought ${shopItem.item.name} for ${shopItem.cost} gold but inventory full - item lost!`)
      } else {
        console.log(`Bought ${shopItem.item.name} for ${shopItem.cost} gold`)
      }
    }
    
    // Remove the bought item from shop
    const newShopItems = [...this.state.shopItems]
    newShopItems.splice(index, 1)
    
    this.setState({ 
      run: { ...run },
      shopItems: newShopItems
    })
    return true
  }

  // Close shop
  closeShop(): void {
    this.setState({
      shopOpen: false,
      shopItems: []
    })
  }

  // Check if Rewind should protect against revealing dangerous tiles
  private checkRewindProtection(tile: any): boolean {
    // Check if player has Rewind in inventory
    const rewindIndex = this.state.run.inventory.findIndex(item => item?.id === 'rewind')
    if (rewindIndex === -1) {
      return false // No Rewind, no protection
    }
    
    // Check if tile is dangerous (not player's tile OR has monster content)
    const isDangerous = tile.owner !== 'player' || tile.content === TileContent.Monster
    
    if (!isDangerous) {
      return false // Not dangerous, no need for protection
    }
    
    // Store pending rewind data and show widget
    const tileDescription = tile.owner !== 'player' 
      ? `${tile.owner} tile` 
      : tile.content === TileContent.Monster && tile.monsterData
        ? `monster (${tile.monsterData.name})`
        : 'dangerous tile'
    
    this.setState({
      pendingRewind: {
        tile,
        rewindIndex,
        description: tileDescription
      }
    })
    
    return true // Always prevent the reveal initially, let widget handle the decision
  }

  // Handle rewind decision from widget
  proceedWithRewind(): void {
    if (!this.state.pendingRewind) return
    
    // Consume the rewind item  
    removeItemFromInventory(this.state.run, this.state.pendingRewind.rewindIndex)
    console.log('Rewind activated! Dangerous reveal prevented.')
    
    this.setState({
      run: { ...this.state.run },
      pendingRewind: null
    })
  }

  proceedWithReveal(): void {
    if (!this.state.pendingRewind) return
    
    const tile = this.state.pendingRewind.tile
    
    // Clear pending rewind and proceed with reveal
    this.setState({ pendingRewind: null })
    
    // Manually trigger the reveal that was blocked
    const success = revealTile(this.state.board, tile.x, tile.y, 'player')
    if (success) {
      const newBoardStatus = checkBoardStatus(this.state.board)
      const isPlayerTile = tile.owner === 'player'
      
      // Handle tile content after checking board status
      this.handleTileContent(tile)
      
      // Check if player died after handling content
      if (this.state.gameStatus === 'player-died') {
        return // Exit early if player died
      }
      
      // Player continues turn if they revealed their own tile, otherwise switch to AI
      const newTurn = (newBoardStatus === 'in-progress' && !isPlayerTile) ? 'opponent' : 'player'
      
      this.setState({
        board: { ...this.state.board },
        boardStatus: newBoardStatus,
        currentTurn: newTurn
      })
      
      // Handle board completion
      if (newBoardStatus === 'won') {
        this.handleBoardWon()
      } else if (newBoardStatus === 'lost') {
        this.handleBoardLost()
      } else if (newTurn === 'opponent') {
        // Trigger AI turn after a short delay (only if turn actually switched)
        this.scheduleAITurn()
      }
    }
  }

  // Discard item from inventory
  discardInventoryItem(index: number): void {
    const item = this.state.run.inventory[index]
    if (!item) return
    
    console.log(`Discarded ${item.name}`)
    removeItemFromInventory(this.state.run, index)
    this.setState({ run: { ...this.state.run } })
  }


  resetGame(): void {
    // Clear any pending AI turn
    if (this.aiTurnTimeout) {
      clearTimeout(this.aiTurnTimeout)
      this.aiTurnTimeout = null
    }
    
    this.setState(createInitialGameState())
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
}

// Export singleton instance
export const gameStore = new GameStore()