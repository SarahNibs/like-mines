import { GameState, getTileAt, TileContent } from './types'
import { createInitialGameState, createCharacterRunState, revealTile, checkBoardStatus, progressToNextLevel, fightMonster, addItemToInventory, removeItemFromInventory, applyItemEffect, defeatMonster } from './gameLogic'
import { DumbAI, AIOpponent } from './ai'
import { generateClue } from './clues'
import { TrophyManager } from './TrophyManager'
import { ShopManager } from './ShopManager'
import { InventoryManager } from './InventoryManager'
import { UpgradeManager } from './UpgradeManager'
import { TurnManager } from './TurnManager'
import { SpellManager } from './SpellManager'
import { CharacterManager } from './CharacterManager'

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
  private upgradeManager: UpgradeManager
  private turnManager: TurnManager
  private spellManager: SpellManager
  private characterManager: CharacterManager

  constructor() {
    this.state = createInitialGameState()
    this.state.gameStatus = 'character-select' // Start in character selection
    this.ai = new DumbAI()
    this.trophyManager = new TrophyManager()
    this.shopManager = new ShopManager()
    this.inventoryManager = new InventoryManager()
    this.upgradeManager = new UpgradeManager()
    this.turnManager = new TurnManager()
    this.spellManager = new SpellManager()
    this.characterManager = new CharacterManager()
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
    // Use TurnManager to process the tile reveal
    const result = this.turnManager.processPlayerTileReveal(x, y, this.state, bypassRewind)
    
    if (!result.success) {
      if (result.message) {
        console.log(result.message)
      }
      return false
    }
    
    // Handle monster death vs trophy stealing (requires TrophyManager access)
    if (result.gameOver && result.newRun.hp <= 0) {
      const tile = getTileAt(this.state.board, x, y)
      if (tile && tile.content === TileContent.Monster && tile.monsterData) {
        // Try to steal a gold trophy to prevent death
        if (this.stealGoldTrophy(tile.monsterData.name)) {
          result.newRun.hp = 1 // Survive with 1 HP instead of dying
          result.gameOver = false
          console.log(`${tile.monsterData.name} stole a gold trophy! You survive with 1 HP.`)
        }
      }
    }
    
    // Handle Rich upgrade trigger (requires UpgradeManager access)
    if (result.richUpgradeTriggered) {
      this.applyRichUpgrade(result.richUpgradeTriggered.x, result.richUpgradeTriggered.y).catch(console.error)
    }
    
    // Handle shop opening
    if (result.shopOpened) {
      this.openShop()
    }
    
    // Handle upgrade choice trigger
    if (result.upgradeChoiceTriggered) {
      this.triggerUpgradeChoice()
      this.pendingUpgradeChoice = true
    }
    
    // Award trophies and get updated run state BEFORE setting state
    let finalRunState = result.newRun ? { ...result.newRun } : { ...this.state.run }
    
    // If trophy was stolen, use current state's trophies (which were updated by stealGoldTrophy)
    finalRunState.trophies = this.state.run.trophies
    if (result.newBoardStatus === 'won') {
      const opponentTilesLeft = this.state.board.opponentTilesTotal - this.state.board.opponentTilesRevealed
      const opponentTilesRevealed = this.state.board.opponentTilesRevealed
      
      const trophyResult = this.trophyManager.awardTrophies(
        finalRunState.trophies, 
        opponentTilesLeft, 
        opponentTilesRevealed
      )
      
      finalRunState = {
        ...finalRunState,
        trophies: trophyResult.newTrophies
      }
    }
    
    // Update game state with trophies included
    this.setState({
      board: result.newBoard ? { ...result.newBoard } : { ...this.state.board },
      run: finalRunState,
      boardStatus: result.newBoardStatus || this.state.boardStatus,
      currentTurn: result.newTurn || this.state.currentTurn,
      gameStatus: result.gameOver ? 'player-died' : this.state.gameStatus
    })
    
    // Handle board completion
    if (result.newBoardStatus === 'won') {
      this.handleBoardWon()
    } else if (result.newBoardStatus === 'lost') {
      this.handleBoardLost()
    } else if (this.turnManager.shouldScheduleAITurn(
      result.newTurn || 'player',
      result.newBoardStatus || 'in-progress',
      result.upgradeChoiceTriggered || false,
      this.pendingUpgradeChoice
    )) {
      this.scheduleAITurn()
    }
    
    return true
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
        // Process ongoing spell effects (like Stinking Cloud) during opponent turn
        const spellResults = this.spellManager.processSpellEffects(this.state.run, this.state.board)
        if (spellResults.messages.length > 0) {
          spellResults.messages.forEach(msg => console.log(msg))
        }
        
        // Handle Rich upgrade triggers from spell effects
        for (const trigger of spellResults.richUpgradeTriggers) {
          this.applyRichUpgrade(trigger.x, trigger.y).catch(console.error)
        }
        
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
    
    // Check if character is Tourist and should auto-open shop
    if (newState.run.character && this.characterManager.shouldForceShopOnEveryLevel(newState.run.character)) {
      console.log('Tourist character: Auto-opening shop for new level')
      // Set state first, then open shop
      this.setState(newState)
      // Open shop immediately for Tourist
      this.openShop()
    } else {
      this.setState(newState)
    }
  }

  // Toggle tile annotation based on current annotation set
  toggleAnnotation(x: number, y: number): boolean {
    const tile = getTileAt(this.state.board, x, y)
    if (!tile || tile.revealed) {
      return false
    }
    
    const currentSet = this.state.annotationSet
    
    // Set 1: none -> slash -> dog-ear -> none
    // Set 2: none -> not-opponent-dog-ear -> opponent-slash -> neutral-slash -> none
    
    if (currentSet === 'set1') {
      // Original annotation set
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
        default:
          // If tile has annotation not in this set, go to blank first
          tile.annotated = 'none'
          break
      }
    } else {
      // Set 2: New annotation set
      switch (tile.annotated) {
        case 'none':
          tile.annotated = 'not-opponent-dog-ear'
          break
        case 'not-opponent-dog-ear':
          tile.annotated = 'opponent-slash'
          break
        case 'opponent-slash':
          tile.annotated = 'neutral-slash'
          break
        case 'neutral-slash':
          tile.annotated = 'none'
          break
        default:
          // If tile has annotation not in this set, go to blank first
          tile.annotated = 'none'
          break
      }
    }
    
    this.setState({
      board: { ...this.state.board }
    })
    return true
  }

  // Toggle between annotation sets
  toggleAnnotationSet(): void {
    const newSet = this.state.annotationSet === 'set1' ? 'set2' : 'set1'
    console.log(`Switching annotation set from ${this.state.annotationSet} to ${newSet}`)
    
    this.setState({
      annotationSet: newSet
    })
  }


  // Use item from inventory
  async useInventoryItem(index: number): Promise<void> {
    const item = this.state.run.inventory[index]
    if (!item) return
    
    // Try to use item through InventoryManager first
    const result = await this.inventoryManager.useInventoryItem(
      this.state.run,
      index,
      (run, item) => applyItemEffect(run, item),
      (run, itemIndex) => removeItemFromInventory(run, itemIndex),
      () => this.grantAdditionalClue(),
      () => this.useCrystalBall(),
      () => this.useWhistle()
    )
    
    if (result.success) {
      // Update run state if it was modified, but skip for Crystal Ball which handles its own state
      if (Object.keys(result.newRun).length > 0 && item.id !== 'crystal-ball') {
        this.setState({ run: result.newRun })
      }
      
      // Handle behavior triggers
      if (result.triggerBehavior) {
        this.handleBehaviorTrigger(result.triggerBehavior)
      }
      return
    }
    
    // Fallback for items that couldn't be handled by InventoryManager
    const message = applyItemEffect(this.state.run, item)
    console.log(message)
    removeItemFromInventory(this.state.run, index)
    this.setState({ run: { ...this.state.run } })
  }

  // Handle behavior triggers from InventoryManager or other sources
  private handleBehaviorTrigger(trigger: { 
    type: string, 
    itemIndex: number, 
    consumeItem: boolean,
    parameters?: { target?: { x: number, y: number }, damage?: number, charges?: number }
  }): void {
    switch (trigger.type) {
      case 'transmute':
        this.startTransmuteMode(trigger.itemIndex)
        break
      case 'detector':
        this.startDetectorMode(trigger.itemIndex)
        break
      case 'key':
        this.startKeyMode(trigger.itemIndex)
        break
      case 'staff':
        if (trigger.parameters?.target) {
          // Direct staff usage with target
          this.executeStaffAt(trigger.parameters.target.x, trigger.parameters.target.y, trigger.parameters.damage || 6)
        } else {
          // Staff mode activation
          this.startStaffMode(trigger.itemIndex)
        }
        break
      case 'ring':
        if (trigger.parameters?.target) {
          // Direct ring usage with target
          this.executeRingAt(trigger.parameters.target.x, trigger.parameters.target.y)
        } else {
          // Ring mode activation
          this.useRing(trigger.itemIndex)
        }
        break
      default:
        console.warn(`Unknown behavior trigger type: ${trigger.type}`)
    }
  }

  // Cast a spell by index
  castSpell(spellIndex: number): void {
    const spell = this.state.run.spells[spellIndex]
    if (!spell) {
      console.error(`No spell found at index ${spellIndex}`)
      return
    }

    // Check mana cost
    if (this.state.run.mana < spell.manaCost) {
      console.log(`Not enough mana to cast ${spell.name}. Need ${spell.manaCost}, have ${this.state.run.mana}`)
      return
    }

    console.log(`Attempting to cast ${spell.name} (${spell.manaCost} mana)`)

    // Handle different spell target types
    if (spell.targetType === 'none') {
      // Cast immediately for spells that don't need targeting
      this.executeSpell(spell, spellIndex)
    } else {
      // Enter targeting mode for spells that need targets
      this.enterSpellTargetingMode(spell, spellIndex)
    }
  }

  private executeSpell(spell: any, spellIndex: number): void {
    const result = this.spellManager.castSpell(
      spell,
      this.state.run,
      this.state
    )

    if (result.success) {
      // Create the new state directly
      const currentState = this.state
      const newRunState = {
        ...currentState.run,
        mana: currentState.run.mana - spell.manaCost
      }
      
      if (result.newClue) {
        const newClues = [...currentState.clues, result.newClue]
        this.setState({
          ...currentState,
          run: newRunState,
          clues: newClues
        })
      } else {
        this.setState({
          ...currentState,
          run: newRunState
        })
      }
    } else {
      console.error(`Failed to cast ${spell.name}: ${result.message}`)
    }
  }

  private enterSpellTargetingMode(spell: any, spellIndex: number): void {
    console.log(`Entering targeting mode for ${spell.name}`)
    this.setState({
      ...this.state,
      spellTargetMode: true,
      spellTargetData: { spell, spellIndex }
    })
  }
  
  // Cast spell at target location
  castSpellAt(x: number, y: number): boolean {
    if (!this.state.spellTargetMode || !this.state.spellTargetData) {
      return false
    }
    
    const { spell, spellIndex } = this.state.spellTargetData
    
    // Cast the spell with target coordinates
    const result = this.spellManager.castSpell(
      spell,
      this.state.run,
      this.state,
      x,
      y
    )
    
    if (result.success) {
      // Exit targeting mode and update state
      const currentState = this.state
      const newRunState = {
        ...currentState.run,
        mana: currentState.run.mana - spell.manaCost
      }
      
      this.setState({
        ...currentState,
        run: newRunState,
        spellTargetMode: false,
        spellTargetData: undefined
      })
      
      // Handle Rich upgrade trigger
      if (result.richUpgradeTriggered) {
        this.applyRichUpgrade(result.richUpgradeTriggered.x, result.richUpgradeTriggered.y).catch(console.error)
      }
      
      // Handle upgrade choice trigger
      if (result.upgradeChoiceTriggered) {
        this.triggerUpgradeChoice()
        this.pendingUpgradeChoice = true
      }
      
      // Handle shop opening
      if (result.shopOpened) {
        this.openShop()
      }
      
      console.log(`Successfully cast ${spell.name} at (${x}, ${y})`)
      if (result.message) {
        console.log(result.message)
      }
      return true
    } else {
      console.error(`Failed to cast ${spell.name}: ${result.message}`)
      return false
    }
  }
  
  // Cancel spell targeting
  cancelSpellTargeting(): void {
    console.log('Spell targeting cancelled.')
    this.setState({
      ...this.state,
      spellTargetMode: false,
      spellTargetData: undefined
    })
  }

  // Trigger a behavior from external sources (spells, upgrades, etc.)
  triggerBehavior(
    behaviorType: 'transmute' | 'detector' | 'key' | 'staff' | 'ring', 
    source: string = 'unknown',
    parameters?: { target?: { x: number, y: number }, damage?: number, charges?: number }
  ): void {
    const result = this.inventoryManager.triggerBehavior(behaviorType, source, parameters)
    
    if (result.triggerBehavior) {
      console.log(result.message)
      this.handleBehaviorTrigger(result.triggerBehavior)
    }
  }

  // Use staff at target from InventoryManager
  useStaffAtTarget(itemIndex: number, x: number, y: number, damage: number = 6): boolean {
    const result = this.inventoryManager.useStaffAt(this.state.run, itemIndex, { x, y }, damage)
    
    if (result.success && result.newRun) {
      this.setState({ run: result.newRun })
      
      if (result.triggerBehavior) {
        // Execute the staff behavior with the target parameters
        this.handleBehaviorTrigger(result.triggerBehavior)
        return true
      }
    }
    
    return false
  }

  // Use ring at target from InventoryManager
  useRingAtTarget(itemIndex: number, x: number, y: number): boolean {
    const result = this.inventoryManager.useRingAt(this.state.run, itemIndex, { x, y })
    
    if (result.success && result.newRun) {
      this.setState({ run: result.newRun })
      
      if (result.triggerBehavior) {
        // Execute the ring behavior with the target parameters
        this.handleBehaviorTrigger(result.triggerBehavior)
        return true
      }
    }
    
    return false
  }

  // Execute staff behavior at specific coordinates
  private executeStaffAt(x: number, y: number, damage: number): void {
    // This would contain the actual game logic for staff effects
    // For now, just log the action - the actual implementation would be
    // extracted from the existing useStaffAt method in the store
    console.log(`Executing staff attack at (${x}, ${y}) for ${damage} damage`)
    // TODO: Extract and implement actual staff combat logic
  }

  // Execute ring behavior at specific coordinates
  private executeRingAt(x: number, y: number): void {
    // This would contain the actual game logic for ring effects
    // For now, just log the action - the actual implementation would be
    // extracted from the existing useRingAt method in the store
    console.log(`Executing ring reveal at (${x}, ${y})`)
    // TODO: Extract and implement actual ring reveal logic
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
    
    // Use TurnManager to process the tile reveal consistently
    const result = this.turnManager.processAutomatedTileReveal(tilePos.x, tilePos.y, this.state, 'player')
    
    if (!result.success) {
      console.log(`Crystal Ball failed: ${result.message}`)
      return
    }
    
    // Handle monster death vs trophy stealing (requires TrophyManager access)
    if (result.gameOver && result.newRun && result.newRun.hp <= 0) {
      const tile = getTileAt(this.state.board, tilePos.x, tilePos.y)
      if (tile && tile.content === TileContent.Monster && tile.monsterData) {
        // Try to steal a gold trophy to prevent death
        if (this.stealGoldTrophy(tile.monsterData.name)) {
          result.newRun.hp = 1 // Survive with 1 HP instead of dying
          result.gameOver = false
          console.log(`${tile.monsterData.name} stole a gold trophy! You survive with 1 HP.`)
        }
      }
    }
    
    // Handle Rich upgrade trigger (requires UpgradeManager access)
    if (result.richUpgradeTriggered) {
      this.applyRichUpgrade(result.richUpgradeTriggered.x, result.richUpgradeTriggered.y).catch(console.error)
    }
    
    // Handle shop opening
    if (result.shopOpened) {
      this.openShop()
    }
    
    // Handle upgrade choice trigger
    if (result.upgradeChoiceTriggered) {
      this.triggerUpgradeChoice()
      this.pendingUpgradeChoice = true
    }
    
    // Award trophies and get updated run state BEFORE setting state
    let finalRunState = result.newRun ? { ...result.newRun } : { ...this.state.run }
    
    // If trophy was stolen, use current state's trophies (which were updated by stealGoldTrophy)
    finalRunState.trophies = this.state.run.trophies
    if (result.newBoardStatus === 'won') {
      const opponentTilesLeft = this.state.board.opponentTilesTotal - this.state.board.opponentTilesRevealed
      const opponentTilesRevealed = this.state.board.opponentTilesRevealed
      
      const trophyResult = this.trophyManager.awardTrophies(
        finalRunState.trophies, 
        opponentTilesLeft, 
        opponentTilesRevealed
      )
      
      finalRunState = {
        ...finalRunState,
        trophies: trophyResult.newTrophies
      }
    }
    
    // Update game state with trophies included
    this.setState({
      board: result.newBoard ? { ...result.newBoard } : { ...this.state.board },
      run: finalRunState,
      boardStatus: result.newBoardStatus || this.state.boardStatus,
      gameStatus: result.gameOver ? 'player-died' : this.state.gameStatus
    })
    
    // Handle board completion
    if (result.newBoardStatus === 'won') {
      this.handleBoardWon()
    } else if (result.newBoardStatus === 'lost') {
      this.handleBoardLost()
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
    // Check if character can use transmute
    if (this.state.run.character?.id === 'below') {
      console.log('Below character cannot use Transmute!')
      return
    }
    
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
    
    // Find and handle the corresponding key tile
    const requiredTileX = tile.chainData.requiredTileX
    const requiredTileY = tile.chainData.requiredTileY
    const keyTile = getTileAt(this.state.board, requiredTileX, requiredTileY)
    
    if (keyTile && keyTile.chainData) {
      // Check if this is part of a 3-tile chain (keyTile has secondary chain properties)
      if (keyTile.chainData.hasSecondaryKey) {
        // This is a 3-tile chain: A -> B (keyTile) -> C (tile)
        // Only remove B's secondary chain properties, keep A -> B relationship intact
        console.log(`Partially unlocking 3-tile chain: keeping A->B, removing B->C`)
        keyTile.chainData = {
          chainId: keyTile.chainData.chainId,
          isBlocked: keyTile.chainData.isBlocked,
          requiredTileX: keyTile.chainData.requiredTileX,
          requiredTileY: keyTile.chainData.requiredTileY
          // Remove hasSecondaryKey and secondary properties
        }
      } else {
        // This is a simple 2-tile chain, remove the key tile's chain data completely
        keyTile.chainData = undefined
      }
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
    
    // Deal 6 damage using centralized monster defeat handling
    const damage = 6
    const defeatResult = defeatMonster(tile, damage, this.state.run)
    
    if (defeatResult.defeated) {
      console.log(`Staff of Fireballs hits ${defeatResult.monsterName} for ${damage} damage! Monster defeated!`)
      console.log(`Staff defeated ${defeatResult.monsterName}! Gained ${defeatResult.goldGained} gold.`)
      
      // Handle Rich upgrade trigger
      if (defeatResult.richTriggered) {
        this.applyRichUpgrade(x, y).catch(console.error)
      }
    } else {
      const monster = tile.monsterData
      console.log(`Staff of Fireballs hits ${monster?.name} for ${damage} damage! (${monster?.hp} HP remaining)`)
    }
    
    // Consume staff charge using InventoryManager to avoid object mutation
    const itemIndex = (this.state as any).staffItemIndex
    const staffResult = this.inventoryManager.useStaffAt(this.state.run, itemIndex, { x, y }, damage)
    
    if (staffResult.success && staffResult.newRun) {
      // Update the run state with properly managed inventory
      this.setState({ run: staffResult.newRun })
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
        // Apply the upgrade to the provided run (which already has gold deducted)
        const upgradeResult = this.upgradeManager.applyUpgrade(run, upgradeId)
        if (upgradeResult.success) {
          console.log(upgradeResult.message)
          return upgradeResult.newRun
        } else {
          console.log(upgradeResult.message)
          return run // Return original run if upgrade failed
        }
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
    const result = this.upgradeManager.applyUpgrade(this.state.run, upgradeId)
    
    if (result.success) {
      this.setState({ run: result.newRun })
      console.log(result.message)
    } else {
      console.log(result.message)
    }
  }

  // Apply RICH upgrade effect: place a single treasure chest on an adjacent tile
  private async applyRichUpgrade(x: number, y: number): Promise<void> {
    const result = await this.upgradeManager.applyRichUpgrade(this.state.board, x, y)
    
    if (result.success) {
      console.log(result.message)
      
      // Update board if chest was placed
      if (result.placementEffect && result.placementEffect.newBoard) {
        this.setState({
          board: result.placementEffect.newBoard
        })
      }
    } else {
      console.log(result.message)
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
    // Use UpgradeManager to generate choices with character filtering
    this.upgradeManager.generateUpgradeChoices(this.state.run.upgrades, this.state.run)
      .then(result => {
        if (result.success && result.upgradeChoice) {
          this.setState({
            upgradeChoice: result.upgradeChoice
          })
        } else {
          console.error('Failed to generate upgrade choices:', result.message)
          // Fallback to no upgrade choice
          this.setState({ upgradeChoice: null })
        }
      })
      .catch(error => {
        console.error('Error generating upgrade choices:', error)
        this.setState({ upgradeChoice: null })
      })
  }

  // Choose one of the upgrade options
  chooseUpgrade(index: number): void {
    if (!this.state.upgradeChoice || index >= this.state.upgradeChoice.choices.length) return
    
    const chosenUpgrade = this.state.upgradeChoice.choices[index]
    
    // Check if upgrade is blocked
    if (chosenUpgrade.blocked) {
      console.log(`Cannot choose blocked upgrade: ${chosenUpgrade.blockReason}`)
      return
    }
    
    this.applyUpgrade(chosenUpgrade.id)
    
    // Clear the upgrade choice widget and pending flag first
    this.pendingUpgradeChoice = false
    this.setState({
      upgradeChoice: null
    })
    
    // Check if board was won and we can now progress to next level
    if (this.state.boardStatus === 'won') {
      console.log('Upgrade choice completed and board was won - triggering progression')
      // Use the flow manager to handle the shop closed after win logic
      const flowResult = this.gameFlowManager.handleShopClosedAfterWin(this.state)
      if (flowResult.nextBoardDelay) {
        setTimeout(() => {
          const progressResult = this.gameFlowManager.progressToNextBoard(this.state)
          this.setState(progressResult.newState)
        }, flowResult.nextBoardDelay)
      }
    } else {
      // Check if we need to trigger AI turn after choosing upgrade
      const shouldTriggerAI = this.state.currentTurn === 'opponent' && 
                             this.state.gameStatus === 'playing' && 
                             this.state.boardStatus === 'in-progress'
      
      // Now trigger AI turn if needed
      if (shouldTriggerAI) {
        this.scheduleAITurn()
      }
    }
    
    console.log(`Chose ${chosenUpgrade.name} upgrade!`)
  }

  // Cancel upgrade choice (shouldn't normally happen, but for safety)
  cancelUpgradeChoice(): void {
    this.setState({ upgradeChoice: null })
    
    // Check if board was won and we can now progress to next level
    if (this.state.boardStatus === 'won') {
      console.log('Upgrade choice cancelled and board was won - triggering progression')
      const flowResult = this.gameFlowManager.handleShopClosedAfterWin(this.state)
      if (flowResult.nextBoardDelay) {
        setTimeout(() => {
          const progressResult = this.gameFlowManager.progressToNextBoard(this.state)
          this.setState(progressResult.newState)
        }, flowResult.nextBoardDelay)
      }
    }
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
        const board = createBoardForLevel(1, characterRun.gold, characterRun.upgrades, characterRun.character)
        
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
          spellTargetMode: false,
          shopOpen: false,
          shopItems: []
        }
        
        console.log(`Selected character: ${characterId}`)
        console.log(`Starting upgrades:`, characterRun.upgrades)
        console.log(`Starting items:`, characterRun.inventory.filter(item => item !== null))
        console.log(`Board generated with character upgrades applied`)
        
        // Set state first
        this.setState(gameState)
        
        // Check if character is Tourist and should auto-open shop on level 1
        if (characterRun.character && this.characterManager.shouldForceShopOnEveryLevel(characterRun.character)) {
          console.log('Tourist character: Auto-opening shop for level 1')
          // Open shop immediately for Tourist on level 1
          this.openShop()
        }
        
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
    
    // Award trophies if board is won
    let updatedRun = { ...this.state.run }
    if (newBoardStatus === 'won') {
      const opponentTilesLeft = board.opponentTilesTotal - board.opponentTilesRevealed
      const opponentTilesRevealed = board.opponentTilesRevealed
      
      const trophyResult = this.trophyManager.awardTrophies(
        updatedRun.trophies, 
        opponentTilesLeft, 
        opponentTilesRevealed
      )
      
      updatedRun = {
        ...updatedRun,
        trophies: trophyResult.newTrophies
      }
    }
    
    this.setState({
      board: { ...board },
      boardStatus: newBoardStatus,
      run: updatedRun
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

  // Debug methods
  debugAddGold(amount: number = 1): void {
    this.setState({
      run: {
        ...this.state.run,
        gold: this.state.run.gold + amount
      }
    })
    console.log(`Debug: Added ${amount} gold (total: ${this.state.run.gold})`)
  }

  debugAddHealth(amount: number = 10): void {
    this.setState({
      run: {
        ...this.state.run,
        hp: Math.min(this.state.run.maxHp, this.state.run.hp + amount)
      }
    })
    console.log(`Debug: Added ${amount} HP (current: ${this.state.run.hp}/${this.state.run.maxHp})`)
  }

  debugRevealAllPlayerTiles(): void {
    const newBoard = { ...this.state.board }
    let playerTilesRevealed = 0
    
    // Reveal all player tiles
    for (let y = 0; y < newBoard.height; y++) {
      for (let x = 0; x < newBoard.width; x++) {
        const tile = newBoard.tiles[y][x]
        if (tile.owner === 'player' && !tile.revealed) {
          revealTile(newBoard, x, y, 'player')
          playerTilesRevealed++
        }
      }
    }
    
    const newBoardStatus = checkBoardStatus(newBoard)
    
    this.setState({
      board: newBoard,
      boardStatus: newBoardStatus
    })
    
    console.log(`Debug: Revealed ${playerTilesRevealed} player tiles, board status: ${newBoardStatus}`)
    
    // Auto-advance to next level if board is won
    if (newBoardStatus === 'won') {
      console.log('Debug: Board won, advancing to next level...')
      setTimeout(() => {
        this.progressToNextBoard()
      }, 100) // Small delay to allow UI to update
    }
  }
}

// Export singleton instance
export const gameStore = new GameStore()