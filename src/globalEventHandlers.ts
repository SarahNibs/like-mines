/**
 * Global document-level event handlers
 */

// Set up global document event handlers
export function setupGlobalEventHandlers(
  gameStore: any,
  clearUpgradeStateCache: () => void,
  setHoverTiles: (current: any, persistent: any) => void,
  renderer: any,
  renderFunction: () => void
) {
  // General click handler to clear highlights when clicking outside clue areas
  document.addEventListener('click', (event) => {
    const target = event.target as Element
    // Don't clear if clicking on clue tiles or the canvas (canvas has its own handler)
    if (!target.closest('.clue-tile') && !target.closest('#game-board')) {
      setHoverTiles(null, null)
      renderer.clearAllHighlights()
      renderFunction()
    }
  })

  // Debug controls and keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase()
    
    // Toggle debug info panel with 'd'
    if (key === 'd') {
      const debugControls = document.getElementById('debug-controls')
      if (debugControls) {
        const isVisible = debugControls.style.display !== 'none'
        debugControls.style.display = isVisible ? 'none' : 'block'
        console.log(`Debug controls ${isVisible ? 'hidden' : 'shown'}`)
      }
    }
    
    // Debug shortcuts
    if (key === 'g') {
      // Gain +1 gold
      const state = gameStore.getState()
      gameStore.setState({ 
        run: { 
          ...state.run, 
          gold: state.run.gold + 1 
        } 
      })
      console.log('Debug: +1 gold')
    }
    
    if (key === 'h') {
      // Gain +10 health (not above max)
      const state = gameStore.getState()
      const newHp = Math.min(state.run.maxHp, state.run.hp + 10)
      gameStore.setState({ 
        run: { 
          ...state.run, 
          hp: newHp 
        } 
      })
      console.log(`Debug: +${newHp - state.run.hp} health`)
    }
    
    if (key === 'u') {
      // Trigger upgrade choice
      console.log('Debug: Triggering upgrade choice')
      gameStore.triggerUpgradeChoice()
    }
    
    if (key === 's') {
      // Open shop
      console.log('Debug: Opening shop')
      gameStore.openShop()
    }
    
    if (key === 'w') {
      // Win board
      console.log('Debug: Winning board')
      gameStore.revealAllPlayerTiles()
    }
  })
}

// Set up store subscription handlers
export function setupStoreSubscription(
  gameStore: any,
  clearUpgradeStateCache: () => void,
  setHoverTiles: (current: any, persistent: any) => void,
  renderer: any,
  renderFunction: () => void
) {
  // Subscribe to store changes
  gameStore.subscribe(() => {
    // Clear highlights when board changes (new level)
    const state = gameStore.getState()
    if (state.run.currentLevel !== (window as any).lastLevel) {
      setHoverTiles(null, null)
      renderer.clearAllHighlights()
      ;(window as any).lastLevel = state.run.currentLevel
    }
    
    // Force upgrade refresh on game status changes (like run reset)
    if (state.gameStatus !== (window as any).lastGameStatus) {
      clearUpgradeStateCache() // Clear upgrade cache to force refresh
      ;(window as any).lastGameStatus = state.gameStatus
    }
    
    renderFunction()
  })
}