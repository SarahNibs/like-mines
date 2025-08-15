/**
 * TrophyManager - Manages trophy system including awarding, collapsing, and stealing
 * This is a focused extraction for all trophy-related operations
 */

import { Board, RunState } from './types'

export interface Trophy {
  id: string
  type: 'silver' | 'gold'
  stolen: boolean
  stolenBy?: string
}

export interface TrophyAwardResult {
  trophiesEarned: number
  perfectBoardBonus: number
  updatedTrophies: Trophy[]
  shouldCollapse: boolean
}

export interface TrophyCollapseResult {
  collapsed: boolean
  goldTrophiesCreated: number
  finalTrophies: Trophy[]
}

export interface TrophyStealResult {
  stolen: boolean
  updatedTrophies: Trophy[]
  stolenTrophyId?: string
}

export class TrophyManager {
  
  // Calculate how many trophies should be awarded for winning a board
  calculateTrophyAward(board: Board): { trophiesEarned: number; perfectBoardBonus: number } {
    const opponentTilesLeft = board.opponentTilesTotal - board.opponentTilesRevealed
    const opponentTilesRevealed = board.opponentTilesRevealed
    
    let trophiesEarned = Math.max(0, opponentTilesLeft - 1) // N-1 trophies
    
    // Perfect board bonus: +10 trophies if opponent revealed 0 tiles
    const perfectBoardBonus = opponentTilesRevealed === 0 ? 10 : 0
    trophiesEarned += perfectBoardBonus
    
    return { trophiesEarned, perfectBoardBonus }
  }
  
  // Award trophies for winning a board
  awardTrophies(board: Board, currentTrophies: Trophy[]): TrophyAwardResult {
    const { trophiesEarned, perfectBoardBonus } = this.calculateTrophyAward(board)
    
    console.log(`Awarding ${trophiesEarned} trophies (${board.opponentTilesTotal - board.opponentTilesRevealed} opponent tiles left)`)
    if (perfectBoardBonus > 0) {
      console.log(`Perfect board bonus: +${perfectBoardBonus} trophies!`)
    }
    console.log(`Current trophies before awarding:`, currentTrophies.length)
    
    // Create new trophies array with existing trophies plus new ones
    const updatedTrophies = [...currentTrophies]
    
    // Add silver trophies
    for (let i = 0; i < trophiesEarned; i++) {
      const trophy: Trophy = {
        id: `trophy_${Date.now()}_${i}`,
        type: 'silver',
        stolen: false
      }
      updatedTrophies.push(trophy)
    }
    
    console.log(`New trophies array length after adding:`, updatedTrophies.length)
    
    return {
      trophiesEarned,
      perfectBoardBonus,
      updatedTrophies,
      shouldCollapse: this.shouldCollapseTrophies(updatedTrophies)
    }
  }
  
  // Check if trophies should be collapsed (10+ silver trophies)
  shouldCollapseTrophies(trophies: Trophy[]): boolean {
    const silverTrophies = trophies.filter(t => t.type === 'silver' && !t.stolen)
    return silverTrophies.length >= 10
  }
  
  // Collapse 10 silver trophies into 1 gold trophy
  collapseTrophies(inputTrophies: Trophy[]): TrophyCollapseResult {
    let trophies = [...inputTrophies]
    let silverTrophies = trophies.filter(t => t.type === 'silver' && !t.stolen)
    let goldTrophiesCreated = 0
    let changed = false
    
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
    
    return {
      collapsed: changed,
      goldTrophiesCreated,
      finalTrophies: trophies
    }
  }
  
  // Steal a gold trophy when player would die
  stealGoldTrophy(trophies: Trophy[], monsterName: string): TrophyStealResult {
    const goldTrophyIndex = trophies.findIndex(t => t.type === 'gold' && !t.stolen)
    
    if (goldTrophyIndex !== -1) {
      const updatedTrophies = [...trophies]
      const stolenTrophyId = updatedTrophies[goldTrophyIndex].id
      
      updatedTrophies[goldTrophyIndex] = {
        ...updatedTrophies[goldTrophyIndex],
        stolen: true,
        stolenBy: monsterName
      }
      
      console.log(`${monsterName} stole a gold trophy!`)
      
      return {
        stolen: true,
        updatedTrophies,
        stolenTrophyId
      }
    }
    
    return {
      stolen: false,
      updatedTrophies: trophies
    }
  }
  
  // Get trophy statistics
  getTrophyStatistics(trophies: Trophy[]): {
    total: number
    silver: number
    gold: number
    stolen: number
    available: number
  } {
    const silverCount = trophies.filter(t => t.type === 'silver' && !t.stolen).length
    const goldCount = trophies.filter(t => t.type === 'gold' && !t.stolen).length
    const stolenCount = trophies.filter(t => t.stolen).length
    
    return {
      total: trophies.length,
      silver: silverCount,
      gold: goldCount,
      stolen: stolenCount,
      available: silverCount + goldCount
    }
  }
  
  // Get trophy value (for scoring purposes)
  getTrophyValue(trophies: Trophy[]): number {
    const stats = this.getTrophyStatistics(trophies)
    return stats.silver * 1 + stats.gold * 10 // Silver = 1 point, Gold = 10 points
  }
  
  // Check if player has enough gold trophies for death protection
  canPreventDeath(trophies: Trophy[]): boolean {
    return trophies.some(t => t.type === 'gold' && !t.stolen)
  }
  
  // Get trophies by type
  getTrophiesByType(trophies: Trophy[], type: 'silver' | 'gold', includeStolen: boolean = false): Trophy[] {
    return trophies.filter(t => t.type === type && (includeStolen || !t.stolen))
  }
  
  // Get stolen trophies with thief information
  getStolenTrophies(trophies: Trophy[]): Array<Trophy & { stolenBy: string }> {
    return trophies
      .filter(t => t.stolen && t.stolenBy)
      .map(t => ({ ...t, stolenBy: t.stolenBy! }))
  }
  
  // Reset trophies to empty state
  resetTrophies(): Trophy[] {
    return []
  }
  
  // Validate trophy array integrity
  validateTrophies(trophies: Trophy[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Check for duplicate IDs
    const ids = trophies.map(t => t.id)
    const uniqueIds = new Set(ids)
    if (ids.length !== uniqueIds.size) {
      errors.push('Duplicate trophy IDs found')
    }
    
    // Check for invalid trophy types
    const invalidTypes = trophies.filter(t => t.type !== 'silver' && t.type !== 'gold')
    if (invalidTypes.length > 0) {
      errors.push(`Invalid trophy types found: ${invalidTypes.map(t => t.type).join(', ')}`)
    }
    
    // Check for stolen trophies without thief
    const invalidStolen = trophies.filter(t => t.stolen && !t.stolenBy)
    if (invalidStolen.length > 0) {
      errors.push('Stolen trophies found without thief information')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  // Create a specific trophy (for testing/debugging)
  createTrophy(type: 'silver' | 'gold', stolen: boolean = false, stolenBy?: string): Trophy {
    return {
      id: `${type}_trophy_${Date.now()}_${Math.random()}`,
      type,
      stolen,
      stolenBy
    }
  }
  
  // Process complete trophy flow for board win
  processVictoryTrophies(board: Board, currentTrophies: Trophy[]): {
    awardResult: TrophyAwardResult
    collapseResult?: TrophyCollapseResult
    finalTrophies: Trophy[]
  } {
    const awardResult = this.awardTrophies(board, currentTrophies)
    
    if (awardResult.shouldCollapse) {
      const collapseResult = this.collapseTrophies(awardResult.updatedTrophies)
      return {
        awardResult,
        collapseResult,
        finalTrophies: collapseResult.finalTrophies
      }
    }
    
    return {
      awardResult,
      finalTrophies: awardResult.updatedTrophies
    }
  }
}