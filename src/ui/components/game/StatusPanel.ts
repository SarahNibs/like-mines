/**
 * StatusPanel - Handles game status display (HP, gold, level, etc.)
 * Extracted from main.ts to improve code organization
 */

export class StatusPanel {
  private levelInfoEl: HTMLElement
  private hpInfoEl: HTMLElement
  private goldInfoEl: HTMLElement
  private statsInfoEl: HTMLElement
  private playerTilesEl: HTMLElement
  private opponentTilesEl: HTMLElement
  private turnInfoEl: HTMLElement
  private winStatusEl: HTMLElement

  constructor() {
    this.levelInfoEl = this.getElement('level-info')
    this.hpInfoEl = this.getElement('hp-info')
    this.goldInfoEl = this.getElement('gold-info')
    this.statsInfoEl = this.getElement('stats-info')
    this.playerTilesEl = this.getElement('player-tiles')
    this.opponentTilesEl = this.getElement('opponent-tiles')
    this.turnInfoEl = this.getElement('turn-info')
    this.winStatusEl = this.getElement('win-status')
  }

  private getElement(id: string): HTMLElement {
    const element = document.getElementById(id)
    if (!element) {
      throw new Error(`Status panel element with id '${id}' not found`)
    }
    return element
  }

  /**
   * Update all status information
   */
  updateStatus(gameState: any): void {
    this.updateBasicInfo(gameState)
    this.updateTileInfo(gameState)
    this.updateTurnInfo(gameState)
  }

  /**
   * Update basic player information (level, HP, gold, stats)
   */
  private updateBasicInfo(gameState: any): void {
    const run = gameState.run
    
    this.levelInfoEl.textContent = `Level ${run.currentLevel} / ${run.maxLevel}`
    this.hpInfoEl.textContent = `HP: ${run.hp} / ${run.maxHp}`
    this.goldInfoEl.textContent = `Gold: ${run.gold}`
    this.statsInfoEl.textContent = `Attack: ${run.attack} | Defense: ${run.defense}`
  }

  /**
   * Update tile count information with character info
   */
  private updateTileInfo(gameState: any): void {
    const board = gameState.board
    
    // Update tile counts with character info
    if (gameState.run.characterId) {
      // Import character data to get icon and name
      import('../../characters').then(({ ALL_CHARACTERS }) => {
        const character = ALL_CHARACTERS.find((c: any) => c.id === gameState.run.characterId)
        if (character) {
          this.playerTilesEl.textContent = `${character.icon} ${character.name}: ${board.playerTilesRevealed}/${board.playerTilesTotal}`
        } else {
          this.playerTilesEl.textContent = `Player tiles: ${board.playerTilesRevealed}/${board.playerTilesTotal}`
        }
      })
    } else {
      this.playerTilesEl.textContent = `Player tiles: ${board.playerTilesRevealed}/${board.playerTilesTotal}`
    }
    
    this.opponentTilesEl.textContent = `AI tiles: ${board.opponentTilesRevealed}/${board.opponentTilesTotal}`
  }

  /**
   * Update turn and game status information
   */
  private updateTurnInfo(gameState: any): void {
    // Update turn indicator
    if (gameState.currentTurn === 'player') {
      this.turnInfoEl.textContent = 'Player\'s Turn'
      this.turnInfoEl.style.color = '#4CAF50'
    } else {
      this.turnInfoEl.textContent = 'AI\'s Turn'
      this.turnInfoEl.style.color = '#F44336'
    }
    
    // Update win status
    if (gameState.boardStatus === 'won') {
      this.winStatusEl.textContent = '🎉 Board Cleared!'
      this.winStatusEl.style.color = '#4CAF50'
    } else if (gameState.boardStatus === 'lost') {
      this.winStatusEl.textContent = '💀 Board Lost!'
      this.winStatusEl.style.color = '#F44336'
    } else {
      this.winStatusEl.textContent = ''
    }
  }

  /**
   * Get all status panel elements for external access
   */
  getElements() {
    return {
      levelInfo: this.levelInfoEl,
      hpInfo: this.hpInfoEl,
      goldInfo: this.goldInfoEl,
      statsInfo: this.statsInfoEl,
      playerTiles: this.playerTilesEl,
      opponentTiles: this.opponentTilesEl,
      turnInfo: this.turnInfoEl,
      winStatus: this.winStatusEl
    }
  }
}