import { UIStateManager, ToolMode, UIState } from '../UIStateManager'

describe('UIStateManager', () => {
  let uiManager: UIStateManager

  beforeEach(() => {
    uiManager = new UIStateManager()
  })

  describe('initialization', () => {
    it('should initialize with clean UI state', () => {
      const state = uiManager.getUIState()
      
      expect(state.transmuteMode).toBe(false)
      expect(state.detectorMode).toBe(false)
      expect(state.keyMode).toBe(false)
      expect(state.staffMode).toBe(false)
      expect(state.ringMode).toBe(false)
      expect(state.shopOpen).toBe(false)
      expect(state.discardConfirmation.visible).toBe(false)
    })

    it('should not have any tool modes active initially', () => {
      expect(uiManager.isAnyToolModeActive()).toBe(false)
      expect(uiManager.getActiveToolMode()).toBe(null)
      expect(uiManager.getActiveToolItemIndex()).toBe(undefined)
    })
  })

  describe('tool mode management', () => {
    const toolModes: ToolMode[] = ['transmute', 'detector', 'key', 'staff', 'ring']

    toolModes.forEach(mode => {
      describe(`${mode} mode`, () => {
        it(`should start ${mode} mode correctly`, () => {
          const result = uiManager.startToolMode(mode, 2)
          
          expect(result.newUIState[`${mode}Mode` as keyof UIState]).toBe(true)
          expect(result.newUIState[`${mode}ItemIndex` as keyof UIState]).toBe(2)
          expect(result.message).toBeDefined()
          
          expect(uiManager.isAnyToolModeActive()).toBe(true)
          expect(uiManager.getActiveToolMode()).toBe(mode)
          expect(uiManager.getActiveToolItemIndex()).toBe(2)
        })

        it(`should cancel ${mode} mode correctly`, () => {
          uiManager.startToolMode(mode, 1)
          
          const result = uiManager.cancelToolMode(mode)
          
          expect(result.newUIState[`${mode}Mode` as keyof UIState]).toBe(false)
          expect(result.newUIState[`${mode}ItemIndex` as keyof UIState]).toBe(undefined)
          
          expect(uiManager.isAnyToolModeActive()).toBe(false)
          expect(uiManager.getActiveToolMode()).toBe(null)
        })

        it(`should complete ${mode} tool usage correctly`, () => {
          uiManager.startToolMode(mode, 3)
          
          const result = uiManager.completeToolUsage(mode)
          
          expect(result.consumeItem).toBe(true)
          expect(result.itemIndex).toBe(3)
          expect(uiManager.isAnyToolModeActive()).toBe(false)
        })
      })
    })

    it('should cancel previous tool mode when starting new one', () => {
      uiManager.startToolMode('transmute', 1)
      expect(uiManager.getActiveToolMode()).toBe('transmute')
      
      uiManager.startToolMode('detector', 2)
      expect(uiManager.getActiveToolMode()).toBe('detector')
      expect(uiManager.getActiveToolItemIndex()).toBe(2)
      
      const state = uiManager.getUIState()
      expect(state.transmuteMode).toBe(false)
      expect(state.detectorMode).toBe(true)
    })

    it('should cancel all tool modes', () => {
      uiManager.startToolMode('transmute', 1)
      uiManager.startToolMode('key', 2) // This should cancel transmute and start key
      
      uiManager.cancelAllToolModes()
      
      expect(uiManager.isAnyToolModeActive()).toBe(false)
      const state = uiManager.getUIState()
      expect(state.transmuteMode).toBe(false)
      expect(state.detectorMode).toBe(false)
      expect(state.keyMode).toBe(false)
      expect(state.staffMode).toBe(false)
      expect(state.ringMode).toBe(false)
    })
  })

  describe('discard confirmation', () => {
    it('should show discard confirmation', () => {
      uiManager.showDiscardConfirmation(5)
      
      const confirmation = uiManager.getDiscardConfirmation()
      expect(confirmation.visible).toBe(true)
      expect(confirmation.itemIndex).toBe(5)
    })

    it('should hide discard confirmation', () => {
      uiManager.showDiscardConfirmation(3)
      uiManager.hideDiscardConfirmation()
      
      const confirmation = uiManager.getDiscardConfirmation()
      expect(confirmation.visible).toBe(false)
      expect(confirmation.itemIndex).toBe(undefined)
    })

    it('should return immutable discard confirmation state', () => {
      uiManager.showDiscardConfirmation(2)
      
      const confirmation1 = uiManager.getDiscardConfirmation()
      const confirmation2 = uiManager.getDiscardConfirmation()
      
      expect(confirmation1).not.toBe(confirmation2) // Different objects
      expect(confirmation1).toEqual(confirmation2) // Same content
    })
  })

  describe('shop management', () => {
    it('should open shop', () => {
      uiManager.openShop()
      
      expect(uiManager.isShopOpen()).toBe(true)
      expect(uiManager.getUIState().shopOpen).toBe(true)
    })

    it('should close shop', () => {
      uiManager.openShop()
      uiManager.closeShop()
      
      expect(uiManager.isShopOpen()).toBe(false)
      expect(uiManager.getUIState().shopOpen).toBe(false)
    })
  })

  describe('tool mode validation', () => {
    it('should allow tool mode when no other tool is active', () => {
      const result = uiManager.canUseToolMode('transmute')
      
      expect(result.canUse).toBe(true)
      expect(result.reason).toBe(undefined)
    })

    it('should prevent tool mode when another tool is active', () => {
      uiManager.startToolMode('detector', 1)
      
      const result = uiManager.canUseToolMode('transmute')
      
      expect(result.canUse).toBe(false)
      expect(result.reason).toContain('detector')
    })

    it('should allow same tool mode when already active', () => {
      uiManager.startToolMode('key', 1)
      
      const result = uiManager.canUseToolMode('key')
      
      expect(result.canUse).toBe(true)
    })

    it('should prevent tool mode when shop is open', () => {
      uiManager.openShop()
      
      const result = uiManager.canUseToolMode('staff')
      
      expect(result.canUse).toBe(false)
      expect(result.reason).toContain('shop')
    })
  })

  describe('state management', () => {
    it('should update UI state correctly', () => {
      const updates = {
        transmuteMode: true,
        shopOpen: true
      }
      
      uiManager.updateUIState(updates)
      
      const state = uiManager.getUIState()
      expect(state.transmuteMode).toBe(true)
      expect(state.shopOpen).toBe(true)
      expect(state.detectorMode).toBe(false) // Should remain unchanged
    })

    it('should reset UI state to initial values', () => {
      // Set some non-default values
      uiManager.startToolMode('ring', 2)
      uiManager.openShop()
      uiManager.showDiscardConfirmation(1)
      
      uiManager.resetUIState()
      
      const state = uiManager.getUIState()
      expect(state.ringMode).toBe(false)
      expect(state.shopOpen).toBe(false)
      expect(state.discardConfirmation.visible).toBe(false)
      expect(uiManager.isAnyToolModeActive()).toBe(false)
    })

    it('should return immutable UI state', () => {
      const state1 = uiManager.getUIState()
      const state2 = uiManager.getUIState()
      
      expect(state1).not.toBe(state2) // Different objects
      expect(state1).toEqual(state2) // Same content
      
      // Modifying returned state should not affect internal state
      state1.transmuteMode = true
      const state3 = uiManager.getUIState()
      expect(state3.transmuteMode).toBe(false)
    })
  })

  describe('UI state summary', () => {
    it('should return empty summary when no UI states active', () => {
      const summary = uiManager.getUIStateSummary()
      
      expect(summary).toBe('No active UI states')
    })

    it('should include active tool mode in summary', () => {
      uiManager.startToolMode('transmute', 1)
      
      const summary = uiManager.getUIStateSummary()
      
      expect(summary).toContain('Tool: transmute')
    })

    it('should include shop state in summary', () => {
      uiManager.openShop()
      
      const summary = uiManager.getUIStateSummary()
      
      expect(summary).toContain('Shop: open')
    })

    it('should include discard confirmation in summary', () => {
      uiManager.showDiscardConfirmation(2)
      
      const summary = uiManager.getUIStateSummary()
      
      expect(summary).toContain('Discard confirmation: visible')
    })

    it('should combine multiple active states in summary', () => {
      uiManager.startToolMode('key', 1)
      uiManager.showDiscardConfirmation(2)
      
      const summary = uiManager.getUIStateSummary()
      
      expect(summary).toContain('Tool: key')
      expect(summary).toContain('Discard confirmation: visible')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined tool mode gracefully', () => {
      expect(() => {
        uiManager.cancelToolMode('invalid' as ToolMode)
      }).not.toThrow()
    })

    it('should handle completing tool usage when no tool is active', () => {
      const result = uiManager.completeToolUsage('transmute')
      
      expect(result.consumeItem).toBe(true)
      expect(result.itemIndex).toBe(undefined)
    })

    it('should handle multiple rapid tool mode switches', () => {
      uiManager.startToolMode('transmute', 1)
      uiManager.startToolMode('detector', 2)
      uiManager.startToolMode('key', 3)
      uiManager.startToolMode('staff', 4)
      
      expect(uiManager.getActiveToolMode()).toBe('staff')
      expect(uiManager.getActiveToolItemIndex()).toBe(4)
      
      const state = uiManager.getUIState()
      expect(state.transmuteMode).toBe(false)
      expect(state.detectorMode).toBe(false)
      expect(state.keyMode).toBe(false)
      expect(state.staffMode).toBe(true)
    })

    it('should handle state updates with partial state objects', () => {
      uiManager.updateUIState({ transmuteMode: true })
      uiManager.updateUIState({ detectorMode: true })
      
      const state = uiManager.getUIState()
      expect(state.transmuteMode).toBe(true)
      expect(state.detectorMode).toBe(true)
      expect(state.keyMode).toBe(false)
    })
  })

  describe('tool mode messages', () => {
    it('should provide appropriate messages for each tool mode', () => {
      const expectedMessages = {
        transmute: 'Transmute activated! Click any unrevealed tile to convert it to your tile.',
        detector: 'Detector activated! Click any unrevealed tile to see adjacent tile info.',
        key: 'Key activated! Click any locked tile to unlock it.',
        staff: 'Staff of Fireballs activated! Click any monster to attack it.',
        ring: 'Ring of True Seeing activated! Click any tile to reveal its contents.'
      }
      
      Object.entries(expectedMessages).forEach(([mode, expectedMessage]) => {
        const result = uiManager.startToolMode(mode as ToolMode, 1)
        expect(result.message).toBe(expectedMessage)
      })
    })
  })
})