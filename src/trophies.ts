/**
 * Trophy display and management
 */

// Update trophies display
export function updateTrophies(state: any, trophiesContainer: HTMLElement) {
  const stolenCount = state.run.trophies.filter((t: any) => t.stolen).length
  console.log('Updating trophies display. Trophy count:', state.run.trophies.length, 'Stolen:', stolenCount)
  
  if (stolenCount > 0) {
    console.log('Stolen trophies:', state.run.trophies.filter((t: any) => t.stolen))
  }
  
  trophiesContainer.innerHTML = ''
  
  // Sort trophies: gold first, then stolen gold, then silver
  const sortedTrophies = [...state.run.trophies].sort((a: any, b: any) => {
    // Priority order: 1=gold, 2=stolen gold, 3=silver
    const getPriority = (trophy: any) => {
      if (trophy.type === 'gold' && !trophy.stolen) return 1
      if (trophy.type === 'gold' && trophy.stolen) return 2
      return 3 // silver
    }
    
    return getPriority(a) - getPriority(b)
  })
  
  sortedTrophies.forEach((trophy: any, index: number) => {
    const trophyEl = document.createElement('div')
    trophyEl.className = `trophy ${trophy.type}`
    if (trophy.stolen) {
      trophyEl.classList.add('stolen')
    }
    
    // Set trophy icon based on type
    if (trophy.type === 'gold') {
      trophyEl.textContent = '🏆'
    } else {
      trophyEl.textContent = '🥈'  // Silver medal for silver trophies
    }
    
    // Set tooltip - explicitly set it
    let tooltipText = ''
    if (trophy.stolen) {
      tooltipText = `Stolen by ${trophy.stolenBy}`
    } else if (trophy.type === 'gold') {
      tooltipText = 'Victories!'
    } else {
      tooltipText = 'Victory!'
    }
    trophyEl.setAttribute('title', tooltipText)
    
    trophiesContainer.appendChild(trophyEl)
  })
}