import { GameState, getTileAt, TileContent } from './types'
import { createInitialGameState, createCharacterRunState, revealTile, checkBoardStatus, progressToNextLevel, fightMonster, addItemToInventory, removeItemFromInventory, applyItemEffect } from './gameLogic'
import { DumbAI, AIOpponent } from './ai'
import { generateClue } from './clues'
import { TrophyManager } from './TrophyManager'
import { ShopManager } from './ShopManager'
import { InventoryManager } from './InventoryManager'

// Simple vanilla TypeScript store with observers
class GameStore {
  private state: GameState
  private observers: Array<() => void> = []
  private ai: AIOpponent
  private aiTurnTimeout: number | null = null
  private pendingUpgradeChoice: boolean = false
  private trophyManager: TrophyManager
  private shopManager: ShopManager
  private inventoryManager: InventoryManager

  constructor() {
    this.state = createInitialGameState()
    this.state.gameStatus = 'character-select' // Start in character selection
    this.ai = new DumbAI()
    this.trophyManager = new TrophyManager()
    this.shopManager = new ShopManager()
    this.inventoryManager = new InventoryManager()
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
    if (this.state.gameStatus !== 'playing' || this.state.currentTurn !== 'player') {
      return false
    }
    
    const tile = getTileAt(this.state.board, x, y)
    if (!tile || tile.revealed) {
      return false
    }
    
    // Check if tile is blocked by a chain
    if (tile.chainData && tile.chainData.isBlocked) {
      const requiredTile = getTileAt(this.state.board, tile.chainData.requiredTileX, tile.chainData.requiredTileY)
      if (requiredTile && !requiredTile.revealed) {
        console.log('Cannot click this tile - it\'s chained! Must reveal the connected tile first.')
        return false
      }
    }
    
    // Check for Rewind protection on dangerous tiles (unless bypassed with SHIFT)
    // BUT first check if Protection would handle this - if so, don't trigger Rewind
    const wouldProtectionActivate = tile.owner !== 'player' && 
                                   this.state.run.temporaryBuffs.protection && 
                                   this.state.run.temporaryBuffs.protection > 0
    
    // Rewind logic removed
    
    const success = revealTile(this.state.board, x, y, 'player')
    if (success) {
      const newBoardStatus = checkBoardStatus(this.state.board)
      const isPlayerTile = tile.owner === 'player'
      
      // Award trophies when board is won
      if (newBoardStatus === 'won') {
        this.awardTrophies()
      }
      
      // Award loot bonus for revealing opponent tiles
      if (tile.owner === 'opponent') {
        this.state.run.gold += this.state.run.loot
      }
      
      // RESTING upgrade: heal when revealing neutral tiles
      if (tile.owner === 'neutral') {
        const restingCount = this.state.run.upgrades.filter(id => id === 'resting').length
        if (restingCount > 0) {
          const healAmount = restingCount * 3
          this.state.run.hp = Math.min(this.state.run.maxHp, this.state.run.hp + healAmount)
          console.log(`Resting: Healed ${healAmount} HP from revealing neutral tile`)
        }
      }
      
      // Handle tile content after checking board status
      this.handleTileContent(tile)
      
      // Check if player died after handling content
      if (this.state.gameStatus === 'player-died') {
        return // Exit early if player died
      }
      
      // Check if Protection should activate before consuming it
      const hadProtection = this.state.run.temporaryBuffs.protection && this.state.run.temporaryBuffs.protection > 0
      
      // Consume Protection charge on ANY tile reveal (if active)
      if (hadProtection) {
        this.state.run.temporaryBuffs.protection -= 1
        console.log(`Protection consumed! ${this.state.run.temporaryBuffs.protection} charges remaining.`)
      }
      
      // Player continues turn if they revealed their own tile, or if protection was active
      let newTurn = 'player'
      if (newBoardStatus === 'in-progress' && !isPlayerTile && !hadProtection) {
        // Player revealed opponent/neutral tile without protection - turn ends
        newTurn = 'opponent'
      }
      
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
        // Only trigger AI turn if no upgrade choice is pending
        if (!this.state.upgradeChoice && !this.pendingUpgradeChoice) {
          this.scheduleAITurn()
        }
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
          [...this.state.clues, generateClue(this.state.board, this.state.run.upgrades)] : this.state.clues
        
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
    
    // If shop is open, don't auto-progress - wait for shop to close
    if (this.state.shopOpen) {
      console.log('Shop is open - waiting for player to close shop before progressing')
      return
    }
    
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
    
    // Reset AI for new board
    this.ai.resetForNewBoard()
    
    this.setState(newState)
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

  // Handle tile content when revealed
  private handleTileContent(tile: any): void {
    const run = this.state.run
    
    if (tile.content === TileContent.PermanentUpgrade && tile.upgradeData) {
      // Show upgrade choice widget instead of applying immediately
      this.triggerUpgradeChoice()
      console.log(`Found upgrade! Choose your enhancement.`)
      // Set a flag to prevent AI turn until upgrade is chosen
      this.pendingUpgradeChoice = true
    } else if (tile.content === TileContent.Item && tile.itemData) {
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
          // Inventory full - check if this is an item that can be auto-applied
          if (item.id === 'ward') {
            // Apply ward effect immediately
            run.temporaryBuffs.ward = (run.temporaryBuffs.ward || 0) + 4
            if (!run.upgrades.includes('ward-temp')) {
              run.upgrades.push('ward-temp') // Add to upgrades list for display
            }
            console.log(`Inventory full! Ward auto-applied: +4 defense (total: +${run.temporaryBuffs.ward}) for your next fight.`)
          } else if (item.id === 'blaze') {
            // Apply blaze effect immediately
            run.temporaryBuffs.blaze = (run.temporaryBuffs.blaze || 0) + 5
            if (!run.upgrades.includes('blaze-temp')) {
              run.upgrades.push('blaze-temp') // Add to upgrades list for display
            }
            console.log(`Inventory full! Blaze auto-applied: +5 attack (total: +${run.temporaryBuffs.blaze}) for your next fight.`)
          } else {
            console.log(`Inventory full! ${item.name} was lost.`)
          }
        }
      }
    } else if (tile.content === TileContent.Monster && tile.monsterData) {
      const monster = tile.monsterData
      const damage = fightMonster(monster, run)
      const newHp = run.hp - damage
      
      // Check if player would die from this damage
      if (newHp <= 0) {
        // Try to steal a gold trophy to prevent death
        if (this.stealGoldTrophy(monster.name)) {
          run.hp = 1 // Survive with 1 HP instead of taking full damage
          console.log(`${monster.name} stole a gold trophy! You survive with 1 HP.`)
          // No loot or Rich upgrade when saved by trophy theft
        } else {
          run.hp = newHp // Apply the lethal damage
          console.log('Player died! Game over.')
          this.setState({ gameStatus: 'player-died' })
          return
        }
      } else {
        // Apply damage normally and award loot
        run.hp = newHp
        run.gold += run.loot
        
        // RICH upgrade: add gold items to adjacent tiles when defeating monsters
        if (run.upgrades.includes('rich')) {
          this.applyRichUpgrade(tile.x, tile.y).catch(console.error)
        }
        
        console.log(`Fought ${monster.name}! Took ${damage} damage, gained ${run.loot} gold. HP: ${run.hp}/${run.maxHp}`)
      }
    }
  }

  // Use item from inventory
  useInventoryItem(index: number): void {
    const item = this.state.run.inventory[index]
    if (!item) return
    
    // Try to use item through InventoryManager first
    const result = this.inventoryManager.useInventoryItem(
      this.state.run,
      index,
      (run, item) => applyItemEffect(run, item),
      (run, itemIndex) => removeItemFromInventory(run, itemIndex),
      () => this.grantAdditionalClue(),
      () => this.useCrystalBall(),
      () => this.useWhistle()
    )
    
    if (result.success) {
      // InventoryManager handled the item successfully
      this.setState({ run: result.newRun })
      return
    }
    
    // Handle special items that require store-specific logic
    if (item.id === 'transmute') {
      this.startTransmuteMode(index)
      return // Don't consume the item yet
    } else if (item.id === 'detector') {
      this.startDetectorMode(index)
      return // Don't consume the item yet
    } else if (item.id === 'key') {
      this.startKeyMode(index)
      return // Don't consume the item yet
    } else if (item.id === 'staff-of-fireballs') {
      this.startStaffMode(index)
      return // Don't consume the item yet
    } else if (item.id === 'ring-of-true-seeing') {
      this.useRing(index)
      return // Don't consume the item yet
    } else {
      // Fallback for unknown items
      const message = applyItemEffect(this.state.run, item)
      console.log(message)
      removeItemFromInventory(this.state.run, index)
      this.setState({ run: { ...this.state.run } })
    }
  }

  // Whistle functionality - redistribute all monsters to random unrevealed tiles
  private useWhistle(): void {
    const board = this.state.board
    const monsters = []
    
    // Find all monsters on unrevealed tiles and collect their data
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x]
        if (tile.content === TileContent.Monster && !tile.revealed && tile.monsterData) {
          monsters.push(tile.monsterData)
          // Clear the monster from this tile
          tile.content = TileContent.Empty
          tile.monsterData = undefined
        }
      }
    }
    
    if (monsters.length === 0) {
      console.log('Whistle: No monsters found to redistribute!')
      return
    }
    
    // Find all unrevealed tiles that can hold monsters
    const availableTiles = []
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        const tile = board.tiles[y][x]
        if (!tile.revealed && tile.content === TileContent.Empty) {
          availableTiles.push({ x, y })
        }
      }
    }
    
    if (availableTiles.length === 0) {
      console.log('Whistle: No available tiles to place monsters!')
      return
    }
    
    // Redistribute monsters to random available tiles
    for (const monster of monsters) {
      if (availableTiles.length === 0) break // No more tiles available
      
      const randomIndex = Math.floor(Math.random() * availableTiles.length)
      const tilePos = availableTiles.splice(randomIndex, 1)[0]
      const tile = board.tiles[tilePos.y][tilePos.x]
      
      tile.content = TileContent.Monster
      tile.monsterData = monster
    }
    
    console.log(`Whistle: Redistributed ${monsters.length} monsters to new locations!`)
    
    // Update the board state
    this.setState({
      board: { ...board }
    })
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
          this.awardTrophies()
          this.handleBoardWon()
        } else if (newBoardStatus === 'lost') {
          this.handleBoardLost()
        }
      }
    }
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

  // Start key mode
  private startKeyMode(itemIndex: number): void {
    console.log('Key activated! Click any locked tile to unlock it.')
    this.setState({ 
      keyMode: true,
      keyItemIndex: itemIndex // Store which inventory slot to consume
    })
  }

  // Handle key tile click
  useKeyAt(x: number, y: number): boolean {
    if (!this.state.keyMode) return false
    
    const tile = getTileAt(this.state.board, x, y)
    if (!tile || tile.revealed || !tile.chainData || !tile.chainData.isBlocked) {
      console.log('Can only use keys on locked tiles!')
      // Still consume the key even on invalid attempts
      const itemIndex = (this.state as any).keyItemIndex
      removeItemFromInventory(this.state.run, itemIndex)
      this.setState({
        run: { ...this.state.run },
        keyMode: false,
        keyItemIndex: undefined
      })
      return false
    }
    
    // Always consume the key item
    const itemIndex = (this.state as any).keyItemIndex
    removeItemFromInventory(this.state.run, itemIndex)
    
    // Find and remove the corresponding key tile
    const requiredTileX = tile.chainData.requiredTileX
    const requiredTileY = tile.chainData.requiredTileY
    const keyTile = getTileAt(this.state.board, requiredTileX, requiredTileY)
    
    if (keyTile && keyTile.chainData) {
      // Remove chain data from both tiles
      keyTile.chainData = undefined
    }
    tile.chainData = undefined
    
    console.log(`Key used! Unlocked tile at (${x}, ${y}) and removed corresponding key.`)
    
    // Exit key mode
    this.setState({
      board: { ...this.state.board },
      run: { ...this.state.run },
      keyMode: false,
      keyItemIndex: undefined
    })
    
    return true
  }

  // Cancel key mode
  cancelKey(): void {
    console.log('Key cancelled.')
    this.setState({
      keyMode: false,
      keyItemIndex: undefined
    })
  }

  // Start staff targeting mode
  private startStaffMode(itemIndex: number): void {
    console.log('Staff of Fireballs activated! Click any monster to attack it.')
    this.setState({ 
      staffMode: true,
      staffItemIndex: itemIndex // Store which inventory slot to consume
    })
  }

  // Handle staff monster targeting
  useStaffAt(x: number, y: number): boolean {
    if (!this.state.staffMode) return false
    
    const tile = getTileAt(this.state.board, x, y)
    if (!tile || !tile.monsterData) {
      console.log('Can only target monsters with the Staff of Fireballs!')
      return false
    }
    
    // Deal 6 damage bypassing defense
    const damage = 6
    tile.monsterData.hp -= damage
    console.log(`Staff of Fireballs hits ${tile.monsterData.name} for ${damage} damage! (${tile.monsterData.hp} HP remaining)`)
    
    // Remove monster if killed and award loot/Rich effects
    if (tile.monsterData.hp <= 0) {
      const monsterName = tile.monsterData.name
      console.log(`${monsterName} is defeated!`)
      
      // Award loot bonus for defeating the monster
      this.state.run.gold += this.state.run.loot
      
      // RICH upgrade: add gold items to adjacent tiles when defeating monsters
      if (this.state.run.upgrades.includes('rich')) {
        this.applyRichUpgrade(x, y).catch(console.error)
      }
      
      console.log(`Staff defeated ${monsterName}! Gained ${this.state.run.loot} gold.`)
      
      tile.content = TileContent.Empty
      tile.monsterData = undefined
    }
    
    // Consume staff charge or remove if no charges left
    const itemIndex = (this.state as any).staffItemIndex
    const staff = this.state.run.inventory[itemIndex]
    
    if (staff && staff.multiUse) {
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
    
    return true
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

  // Handle ring fog removal targeting
  useRingAt(x: number, y: number): boolean {
    if (!this.state.ringMode) return false
    
    const tile = getTileAt(this.state.board, x, y)
    if (!tile || !tile.fogged) {
      console.log('Can only target fogged tiles with the Ring of True Seeing!')
      return false
    }
    
    // Remove fog from the tile
    tile.fogged = false
    console.log(`Ring of True Seeing removes fog from tile at (${x}, ${y})`)
    
    // Consume ring charge or remove if no charges left
    const itemIndex = (this.state as any).ringItemIndex
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
    
    return true
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

  // Shop functionality
  openShop(): void {
    this.shopManager.openShop(this.state.run).then(result => {
      if (result.shopOpen) {
        this.setState({
          shopOpen: result.shopOpen,
          shopItems: result.shopItems
        })
      }
    })
  }

  // Buy item from shop
  buyShopItem(index: number): boolean {
    if (!this.state.shopOpen || index >= this.state.shopItems.length) {
      return false
    }
    
    const result = this.shopManager.buyShopItem(
      this.state.run,
      this.state.shopItems,
      index,
      // applyUpgradeCallback - returns updated run
      (upgradeId: string, run: any) => {
        this.applyUpgrade(upgradeId)
        return this.state.run // Return the updated run from state
      },
      // applyItemEffectCallback 
      (run: any, item: any) => applyItemEffect(run, item),
      // addItemToInventoryCallback
      (run: any, item: any) => addItemToInventory(run, item)
    )
    
    if (result.success && result.newRun) {
      this.setState({
        run: result.newRun,
        shopItems: result.shopItems
      })
    } else if (result.success === false) {
      // Handle failure case (not enough gold, etc.)
      console.log(result.message)
    }
    
    return result.success || false
  }

  // Close shop
  closeShop(): void {
    const wasBoardWon = this.state.boardStatus === 'won'
    
    const result = this.shopManager.closeShop()
    this.setState({
      shopOpen: result.shopOpen,
      shopItems: result.shopItems
    })
    
    // If board was won while shop was open, trigger progression now
    if (wasBoardWon) {
      console.log('Shop closed and board was won - triggering progression')
      this.handleBoardWon()
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

  // Apply RICH upgrade effect: place a single treasure chest on an adjacent tile
  private async applyRichUpgrade(x: number, y: number): Promise<void> {
    const board = this.state.board
    
    // Import the CHEST item
    const { CHEST } = await import('./items')
    
    // Collect all valid adjacent positions
    const adjacentTiles = []
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue // Skip center tile
        
        const adjX = x + dx
        const adjY = y + dy
        const adjTile = getTileAt(board, adjX, adjY)
        
        // Only consider unrevealed empty tiles
        if (adjTile && !adjTile.revealed && adjTile.content === TileContent.Empty) {
          adjacentTiles.push({ tile: adjTile, x: adjX, y: adjY })
        }
      }
    }
    
    // Place chest on exactly one random adjacent tile (if any exist)
    if (adjacentTiles.length > 0) {
      const randomIndex = Math.floor(Math.random() * adjacentTiles.length)
      const chosenTile = adjacentTiles[randomIndex]
      
      chosenTile.tile.content = TileContent.Item
      chosenTile.tile.itemData = CHEST
      
      console.log(`Rich upgrade: placed treasure chest at (${chosenTile.x}, ${chosenTile.y})`)
      
      // Force a state update to make the chest visible immediately
      this.setState({
        board: { ...board }
      })
    }
  }

  // Rewind methods removed

  // Show discard confirmation widget
  showDiscardConfirmation(index: number): void {
    const item = this.state.run.inventory[index]
    if (!item) return
    
    this.setState({
      pendingDiscard: {
        itemIndex: index,
        itemName: item.name
      }
    })
  }

  // Confirm discard from widget
  confirmDiscard(): void {
    if (!this.state.pendingDiscard) return
    
    const { itemIndex, itemName } = this.state.pendingDiscard
    console.log(`Discarded ${itemName}`)
    removeItemFromInventory(this.state.run, itemIndex)
    
    this.setState({ 
      run: { ...this.state.run },
      pendingDiscard: null
    })
  }

  // Cancel discard from widget
  cancelDiscard(): void {
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
    if (!this.state.upgradeChoice || index >= this.state.upgradeChoice.choices.length) return
    
    const chosenUpgrade = this.state.upgradeChoice.choices[index]
    this.applyUpgrade(chosenUpgrade.id)
    
    // Check if we need to trigger AI turn after choosing upgrade
    const shouldTriggerAI = this.state.currentTurn === 'opponent' && 
                           this.state.gameStatus === 'playing' && 
                           this.state.boardStatus === 'in-progress'
    
    // Clear the upgrade choice widget and pending flag
    this.pendingUpgradeChoice = false
    this.setState({
      upgradeChoice: null
    })
    
    // Now trigger AI turn if needed
    if (shouldTriggerAI) {
      this.scheduleAITurn()
    }
    
    console.log(`Chose ${chosenUpgrade.name} upgrade!`)
  }

  // Cancel upgrade choice (shouldn't normally happen, but for safety)
  cancelUpgradeChoice(): void {
    this.setState({ upgradeChoice: null })
  }

  // Discard item from inventory (legacy method for direct discard)
  discardInventoryItem(index: number): void {
    const result = this.inventoryManager.discardInventoryItem(
      this.state.run,
      index,
      (run, itemIndex) => removeItemFromInventory(run, itemIndex)
    )
    
    if (result.success) {
      this.setState({ run: result.newRun })
    }
  }


  // Select character and start game
  selectCharacter(characterId: string): void {
    if (this.state.gameStatus !== 'character-select') {
      return
    }
    
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
    // Clear any pending AI turn
    if (this.aiTurnTimeout) {
      clearTimeout(this.aiTurnTimeout)
      this.aiTurnTimeout = null
    }
    
    // Reset AI for new game
    this.ai.resetForNewBoard()
    
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

  // Award trophies for winning a board
  awardTrophies(): void {
    const opponentTilesLeft = this.state.board.opponentTilesTotal - this.state.board.opponentTilesRevealed
    const opponentTilesRevealed = this.state.board.opponentTilesRevealed
    
    const result = this.trophyManager.awardTrophies(
      this.state.run.trophies, 
      opponentTilesLeft, 
      opponentTilesRevealed
    )
    
    this.setState({
      run: {
        ...this.state.run,
        trophies: result.newTrophies
      }
    })
  }
  
  // Collapse 10 silver trophies into 1 gold trophy
  collapseTrophies(inputTrophies?: any[]): void {
    const trophies = inputTrophies ? [...inputTrophies] : [...this.state.run.trophies]
    const result = this.trophyManager.collapseTrophies(trophies)
    
    // Only update state if trophies actually changed
    if (result.newTrophies.length !== trophies.length || 
        JSON.stringify(result.newTrophies) !== JSON.stringify(trophies)) {
      this.setState({
        run: {
          ...this.state.run,
          trophies: result.newTrophies
        }
      })
    }
  }
  
  // Steal a gold trophy when player would die
  stealGoldTrophy(monsterName: string): boolean {
    const result = this.trophyManager.stealGoldTrophy(this.state.run.trophies, monsterName)
    
    if (result.wasStolen && result.newTrophies) {
      this.setState({
        run: {
          ...this.state.run,
          trophies: result.newTrophies
        }
      })
    }
    
    return result.wasStolen
  }
}

// Export singleton instance
export const gameStore = new GameStore()