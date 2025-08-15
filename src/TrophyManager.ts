/**
 * TrophyManager - Manages trophy awarding, collapsing, and stealing logic
 * Extracted from store.ts to isolate trophy-related concerns
 */

export interface Trophy {
  id: string
  type: 'silver' | 'gold'
  stolen: boolean
  stolenBy?: string
}

export interface TrophyAwardData {
  opponentTilesLeft: number
  opponentTilesRevealed: number
}

export interface TrophyAwardResult {
  trophiesAwarded: number
  perfectBoardBonus: number
  newTrophies: Trophy[]
  shouldCollapse: boolean
}

export interface TrophyCollapseResult {
  changed: boolean
  newTrophies: Trophy[]
  goldTrophiesCreated: number
}

export interface TrophyStealResult {
  success: boolean
  newTrophies?: Trophy[]
  message?: string
}

export class TrophyManager {
  
  // Award trophies for winning a board
  awardTrophies(currentTrophies: Trophy[], awardData: TrophyAwardData): TrophyAwardResult {
    const { opponentTilesLeft, opponentTilesRevealed } = awardData
    let trophiesEarned = Math.max(0, opponentTilesLeft - 1) // N-1 trophies
    
    // Perfect board bonus: +10 trophies if opponent revealed 0 tiles
    const perfectBoardBonus = opponentTilesRevealed === 0 ? 10 : 0
    trophiesEarned += perfectBoardBonus
    
    console.log(`Awarding ${trophiesEarned} trophies (${opponentTilesLeft} opponent tiles left)`)
    if (perfectBoardBonus > 0) {
      console.log(`Perfect board bonus: +${perfectBoardBonus} trophies!`)
    }
    console.log(`Current trophies before awarding:`, currentTrophies.length)
    
    // Create new trophies array with existing trophies plus new ones
    const newTrophies = [...currentTrophies]
    
    // Add silver trophies
    for (let i = 0; i < trophiesEarned; i++) {
      const trophy: Trophy = {
        id: `trophy_${Date.now()}_${i}`,
        type: 'silver',
        stolen: false
      }
      newTrophies.push(trophy)
    }
    
    console.log(`New trophies array length after adding:`, newTrophies.length)
    
    return {
      trophiesAwarded: trophiesEarned,
      perfectBoardBonus,
      newTrophies,
      shouldCollapse: this.shouldCollapseTrophies(newTrophies)
    }
  }
  
  // Check if trophies should be collapsed (10 or more silver)
  shouldCollapseTrophies(trophies: Trophy[]): boolean {
    const silverTrophies = trophies.filter(t => t.type === 'silver' && !t.stolen)
    return silverTrophies.length >= 10
  }
  
  // Collapse 10 silver trophies into 1 gold trophy
  collapseTrophies(inputTrophies: Trophy[]): TrophyCollapseResult {
    let trophies = [...inputTrophies]
    let silverTrophies = trophies.filter(t => t.type === 'silver' && !t.stolen)
    let changed = false
    let goldTrophiesCreated = 0
    
    while (silverTrophies.length >= 10) {
      // Remove 10 silver trophies
      for (let i = 0; i < 10; i++) {
        const silverIndex = trophies.findIndex(t => t.type === 'silver' && !t.stolen)
        if (silverIndex !== -1) {
          trophies.splice(silverIndex, 1)
        }
      }
      
      // Add 1 gold trophy
      const goldTrophy: Trophy = {
        id: `gold_trophy_${Date.now()}`,
        type: 'gold',
        stolen: false
      }
      trophies.push(goldTrophy)
      goldTrophiesCreated++
      
      // Update the silver trophies list for next iteration
      silverTrophies = trophies.filter(t => t.type === 'silver' && !t.stolen)
      changed = true
    }
    
    if (changed) {
      console.log(`Collapsed ${goldTrophiesCreated * 10} silver trophies into ${goldTrophiesCreated} gold trophy(ies)`)
    }
    
    return {
      changed,
      newTrophies: trophies,
      goldTrophiesCreated
    }
  }
  
  // Steal a gold trophy when player would die
  stealGoldTrophy(currentTrophies: Trophy[], monsterName: string): TrophyStealResult {
    const goldTrophyIndex = currentTrophies.findIndex(t => t.type === 'gold' && !t.stolen)
    
    if (goldTrophyIndex !== -1) {
      const newTrophies = [...currentTrophies]
      newTrophies[goldTrophyIndex] = {
        ...newTrophies[goldTrophyIndex],
        stolen: true,
        stolenBy: monsterName
      }
      
      const message = `${monsterName} stole a gold trophy!`
      console.log(message)
      
      return {
        success: true,
        newTrophies,
        message
      }
    }
    
    return {
      success: false
    }
  }
  
  // Get trophy counts for display/analytics
  getTrophyCounts(trophies: Trophy[]): { 
    silver: number 
    gold: number 
    stolenGold: number 
    total: number 
  } {
    const silver = trophies.filter(t => t.type === 'silver' && !t.stolen).length
    const gold = trophies.filter(t => t.type === 'gold' && !t.stolen).length
    const stolenGold = trophies.filter(t => t.type === 'gold' && t.stolen).length
    
    return {
      silver,
      gold,
      stolenGold,
      total: trophies.length // Total should be all trophies, including stolen silver
    }
  }
  
  // Get trophy value for scoring (could be used for final score calculation)
  getTrophyValue(trophies: Trophy[]): number {
    return trophies.reduce((total, trophy) => {
      if (trophy.stolen) return total
      
      switch (trophy.type) {
        case 'silver': return total + 1
        case 'gold': return total + 10
        default: return total
      }
    }, 0)
  }
  
  // Validate trophy data integrity
  validateTrophies(trophies: Trophy[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Check for duplicate IDs
    const ids = trophies.map(t => t.id)
    const uniqueIds = new Set(ids)
    if (ids.length !== uniqueIds.size) {
      errors.push('Duplicate trophy IDs found')
    }
    
    // Check for invalid trophy types
    const invalidTypes = trophies.filter(t => !['silver', 'gold'].includes(t.type))
    if (invalidTypes.length > 0) {
      errors.push(`Invalid trophy types: ${invalidTypes.map(t => t.type).join(', ')}`)
    }
    
    // Check for stolen trophies without stolenBy
    const invalidStolen = trophies.filter(t => t.stolen && !t.stolenBy)
    if (invalidStolen.length > 0) {
      errors.push('Stolen trophies missing stolenBy field')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}