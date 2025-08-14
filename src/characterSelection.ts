/**
 * Character selection UI functionality
 */

// Update character selection display
export async function updateCharacterSelection(
  state: any, 
  characterSelectOverlay: HTMLElement, 
  characterChoicesEl: HTMLElement,
  onCharacterSelect: (characterId: string) => void
) {
  if (state.gameStatus === 'character-select') {
    characterSelectOverlay.style.display = 'flex'
    
    // Import character data
    const { ALL_CHARACTERS } = await import('./characters')
    
    // Clear existing choices
    characterChoicesEl.innerHTML = ''
    
    // Create character buttons
    ALL_CHARACTERS.forEach((character: any) => {
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
      
      // Hover effects
      characterBtn.addEventListener('mouseenter', () => {
        characterBtn.style.borderColor = '#ffa500'
        characterBtn.style.background = '#555'
        characterBtn.style.transform = 'scale(1.05)'
      })
      
      characterBtn.addEventListener('mouseleave', () => {
        characterBtn.style.borderColor = '#666'
        characterBtn.style.background = '#444'
        characterBtn.style.transform = 'scale(1)'
      })
      
      // Click handler
      characterBtn.addEventListener('click', () => {
        console.log(`Selected character: ${character.id}`)
        onCharacterSelect(character.id)
      })
      
      characterBtn.appendChild(characterIcon)
      characterBtn.appendChild(characterName)
      characterChoicesEl.appendChild(characterBtn)
    })
  } else {
    characterSelectOverlay.style.display = 'none'
  }
}