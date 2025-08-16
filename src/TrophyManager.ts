/**
 * TrophyManager - Handles trophy awarding, collapsing, and stealing
 * Extracted from store.ts for better organization
 */

import { Trophy } from './types'

export interface TrophyResult {
  newTrophies: Trophy[]
  message?: string
}

export interface StealResult {
  wasStolen: boolean
  newTrophies?: Trophy[]
  message?: string
}

export class TrophyManager {
  
  /**
   * Award trophies for winning a board
   * @param currentTrophies Current trophy array
   * @param opponentTilesLeft Number of opponent tiles remaining unrevealed
   * @param opponentTilesRevealed Number of opponent tiles revealed by opponent
   * @returns New trophy array and any messages
   */
  awardTrophies(
    currentTrophies: Trophy[], 
    opponentTilesLeft: number, 
    opponentTilesRevealed: number
  ): TrophyResult {
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
    
    // Auto-collapse if we have 10+ silver trophies
    const collapsedResult = this.collapseTrophies(newTrophies)
    
    return {
      newTrophies: collapsedResult.newTrophies,
      message: trophiesEarned > 0 ? `Earned ${trophiesEarned} trophies!` : undefined
    }
  }

  /**
   * Collapse 10 silver trophies into 1 gold trophy
   * @param inputTrophies Trophy array to process
   * @returns New trophy array after collapsing
   */
  collapseTrophies(inputTrophies: Trophy[]): TrophyResult {
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
        id: `gold_trophy_${Date.now()}_${goldTrophiesCreated}`,
        type: 'gold',
        stolen: false
      }
      trophies.push(goldTrophy)
      goldTrophiesCreated++
      
      // Update the silver trophies list for next iteration
      silverTrophies = trophies.filter(t => t.type === 'silver' && !t.stolen)
      changed = true
    }
    
    const message = goldTrophiesCreated > 0 
      ? `${goldTrophiesCreated} gold troph${goldTrophiesCreated > 1 ? 'ies' : 'y'} created from silver trophies!`
      : undefined
    
    if (changed) {
      console.log(message)
    }
    
    return {
      newTrophies: trophies,
      message
    }
  }

  /**
   * Attempt to steal a gold trophy to save player from death
   * @param currentTrophies Current trophy array
   * @param monsterName Name of monster stealing the trophy
   * @returns Whether trophy was stolen and new trophy array
   */
  stealGoldTrophy(currentTrophies: Trophy[], monsterName: string): StealResult {
    const goldTrophyIndex = currentTrophies.findIndex(t => t.type === 'gold' && !t.stolen)
    
    if (goldTrophyIndex !== -1) {
      const newTrophies = [...currentTrophies]
      newTrophies[goldTrophyIndex] = {
        ...newTrophies[goldTrophyIndex],
        stolen: true,
        stolenBy: monsterName
      }
      
      console.log(`${monsterName} stole a gold trophy!`)
      
      return {
        wasStolen: true,
        newTrophies,
        message: `${monsterName} stole a gold trophy! You survive with 1 HP.`
      }
    }
    
    return {
      wasStolen: false,
      message: 'No gold trophies available to steal!'
    }
  }

  /**
   * Get trophy statistics for display
   * @param trophies Trophy array to analyze
   * @returns Object with trophy counts
   */
  getTrophyStats(trophies: Trophy[]) {
    const gold = trophies.filter(t => t.type === 'gold' && !t.stolen).length
    const goldStolen = trophies.filter(t => t.type === 'gold' && t.stolen).length
    const silver = trophies.filter(t => t.type === 'silver' && !t.stolen).length
    const silverStolen = trophies.filter(t => t.type === 'silver' && t.stolen).length
    
    return {
      gold,
      goldStolen,
      silver,
      silverStolen,
      total: gold + goldStolen + silver + silverStolen
    }
  }
}