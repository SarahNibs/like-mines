/**
 * UI button event handlers
 */

// Set up all button event handlers
export function setupButtonHandlers(gameStore: any, clearUpgradeStateCache: () => void) {
  // End Turn button handler
  const endTurnBtn = document.getElementById('end-turn')!
  endTurnBtn.addEventListener('click', () => {
    console.log('Ending turn manually...')
    gameStore.endTurn()
  })

  // Start New Run button handler
  document.getElementById('start-new-run')!.addEventListener('click', () => {
    console.log('Starting new run...')
    clearUpgradeStateCache() // Clear upgrade state cache
    gameStore.resetGame()
  })

  // Shop widget button handlers
  const shopCloseBtn = document.getElementById('shop-close')!
  shopCloseBtn.addEventListener('click', () => {
    console.log('Closing shop')
    gameStore.closeShop()
  })

  // Discard widget button handlers
  const discardConfirmBtn = document.getElementById('discard-confirm')!
  discardConfirmBtn.addEventListener('click', () => {
    console.log('Player confirmed item discard')
    gameStore.confirmDiscard()
  })

  const discardCancelBtn = document.getElementById('discard-cancel')!
  discardCancelBtn.addEventListener('click', () => {
    console.log('Player cancelled item discard')
    gameStore.cancelDiscard()
  })

  // Upgrade choice widget button handlers
  const upgradeChoice0Btn = document.getElementById('upgrade-choice-0')!
  upgradeChoice0Btn.addEventListener('click', () => {
    console.log('Player chose upgrade option 0')
    gameStore.chooseUpgrade(0)
  })

  const upgradeChoice1Btn = document.getElementById('upgrade-choice-1')!
  upgradeChoice1Btn.addEventListener('click', () => {
    console.log('Player chose upgrade option 1')
    gameStore.chooseUpgrade(1)
  })

  const upgradeChoice2Btn = document.getElementById('upgrade-choice-2')!
  upgradeChoice2Btn.addEventListener('click', () => {
    console.log('Player chose upgrade option 2')
    gameStore.chooseUpgrade(2)
  })
}