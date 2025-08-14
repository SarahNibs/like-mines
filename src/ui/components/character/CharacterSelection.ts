/**
 * CharacterSelection - Handles character selection UI and interactions
 * Extracted from main.ts to improve code organization
 */

export class CharacterSelection {
  private characterSelectOverlay: HTMLElement
  private characterChoicesEl: HTMLElement
  private onCharacterSelect: (characterId: string) => void

  constructor(
    overlayId: string,
    choicesId: string,
    onCharacterSelect: (characterId: string) => void
  ) {
    this.characterSelectOverlay = this.getElement(overlayId)
    this.characterChoicesEl = this.getElement(choicesId)
    this.onCharacterSelect = onCharacterSelect
  }

  private getElement(id: string): HTMLElement {
    const element = document.getElementById(id)
    if (!element) {
      throw new Error(`Element with id '${id}' not found`)
    }
    return element
  }

  /**
   * Update character selection display based on game state
   */
  async updateCharacterSelection(gameState: any): Promise<void> {
    if (gameState.gameStatus === 'character-select') {
      await this.showCharacterSelection()
    } else {
      this.hideCharacterSelection()
    }
  }

  /**
   * Show character selection overlay
   */
  private async showCharacterSelection(): Promise<void> {
    this.characterSelectOverlay.style.display = 'flex'
    
    // Import character data dynamically
    const { ALL_CHARACTERS } = await import('../../characters')
    
    // Clear existing choices
    this.characterChoicesEl.innerHTML = ''
    
    // Create character buttons
    ALL_CHARACTERS.forEach((character: any) => {
      const characterBtn = this.createCharacterButton(character)
      this.characterChoicesEl.appendChild(characterBtn)
    })
  }

  /**
   * Hide character selection overlay
   */
  private hideCharacterSelection(): void {
    this.characterSelectOverlay.style.display = 'none'
  }

  /**
   * Create a character selection button
   */
  private createCharacterButton(character: any): HTMLElement {
    const characterBtn = document.createElement('button')
    characterBtn.style.cssText = `
      width: 120px;
      height: 120px;
      background: #444;
      border: 2px solid #666;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: white;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      transition: all 0.2s ease;
      position: relative;
    `
    
    const characterIcon = document.createElement('div')
    characterIcon.textContent = character.icon
    characterIcon.style.fontSize = '32px'
    
    const characterName = document.createElement('div')
    characterName.textContent = character.name
    characterName.style.fontWeight = 'bold'
    characterName.style.fontSize = '14px'
    
    // Hover tooltip
    characterBtn.title = character.description
    
    // Add hover effects
    this.addButtonHoverEffects(characterBtn)
    
    // Click handler
    characterBtn.addEventListener('click', () => {
      console.log(`Selected character: ${character.id}`)
      this.onCharacterSelect(character.id)
    })
    
    characterBtn.appendChild(characterIcon)
    characterBtn.appendChild(characterName)
    
    return characterBtn
  }

  /**
   * Add hover effects to character button
   */
  private addButtonHoverEffects(button: HTMLElement): void {
    button.addEventListener('mouseenter', () => {
      button.style.borderColor = '#ffa500'
      button.style.background = '#555'
      button.style.transform = 'scale(1.05)'
    })
    
    button.addEventListener('mouseleave', () => {
      button.style.borderColor = '#666'
      button.style.background = '#444'
      button.style.transform = 'scale(1)'
    })
  }

  /**
   * Get the overlay element
   */
  getOverlayElement(): HTMLElement {
    return this.characterSelectOverlay
  }

  /**
   * Get the choices container element
   */
  getChoicesElement(): HTMLElement {
    return this.characterChoicesEl
  }

  /**
   * Check if character selection is currently visible
   */
  isVisible(): boolean {
    return this.characterSelectOverlay.style.display === 'flex'
  }
}