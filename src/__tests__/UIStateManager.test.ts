/**
 * Tests for UIStateManager
 */

import { UIStateManager } from '../UIStateManager'

describe('UIStateManager', () => {
  let manager: UIStateManager
  
  beforeEach(() => {
    manager = new UIStateManager()
  })

  describe('initialization', () => {
    it('should initialize with clean UI state', () => {
      const state = manager.getState()
      
      expect(state.pendingDiscard).toBeNull()
      expect(state.shopOpen).toBe(false)
      expect(state.toolModes).toEqual({})
    })

    it('should not have any tool modes active initially', () => {
      expect(manager.getActiveToolMode()).toBeNull()
      expect(manager.isTransmuteModeActive()).toBe(false)
      expect(manager.isDetectorModeActive()).toBe(false)
      expect(manager.isKeyModeActive()).toBe(false)
      expect(manager.isStaffModeActive()).toBe(false)
      expect(manager.isRingModeActive()).toBe(false)
    })
  })

  describe('tool mode management', () => {
    it('should cancel previous tool mode when starting new one', () => {
      manager.startTransmuteMode(0)
      expect(manager.isTransmuteModeActive()).toBe(true)
      
      manager.startDetectorMode(1)
      expect(manager.isTransmuteModeActive()).toBe(false)
      expect(manager.isDetectorModeActive()).toBe(true)
    })

    it('should cancel all tool modes', () => {
      manager.startTransmuteMode(0)
      manager.cancelAllToolModes()
      
      expect(manager.getActiveToolMode()).toBeNull()
      expect(manager.isTransmuteModeActive()).toBe(false)
    })

    describe('transmute mode', () => {
      it('should start transmute mode correctly', () => {
        manager.startTransmuteMode(2)
        
        expect(manager.isTransmuteModeActive()).toBe(true)
        expect(manager.getActiveToolMode()).toBe('transmute')
        expect(manager.getToolModeItemIndex('transmute')).toBe(2)
      })

      it('should cancel transmute mode correctly', () => {
        manager.startTransmuteMode(2)
        manager.cancelTransmuteMode()
        
        expect(manager.isTransmuteModeActive()).toBe(false)
        expect(manager.getActiveToolMode()).toBeNull()
      })

      it('should complete transmute tool usage correctly', () => {
        manager.startTransmuteMode(2)
        manager.completeTransmuteMode()
        
        expect(manager.isTransmuteModeActive()).toBe(false)
        expect(manager.getActiveToolMode()).toBeNull()
      })
    })

    describe('detector mode', () => {
      it('should start detector mode correctly', () => {
        manager.startDetectorMode(1)
        
        expect(manager.isDetectorModeActive()).toBe(true)
        expect(manager.getActiveToolMode()).toBe('detector')
        expect(manager.getToolModeItemIndex('detector')).toBe(1)
      })

      it('should cancel detector mode correctly', () => {
        manager.startDetectorMode(1)
        manager.cancelDetectorMode()
        
        expect(manager.isDetectorModeActive()).toBe(false)
        expect(manager.getActiveToolMode()).toBeNull()
      })

      it('should complete detector tool usage correctly', () => {
        manager.startDetectorMode(1)
        manager.completeDetectorMode()
        
        expect(manager.isDetectorModeActive()).toBe(false)
        expect(manager.getActiveToolMode()).toBeNull()
      })
    })

    describe('key mode', () => {
      it('should start key mode correctly', () => {
        manager.startKeyMode(0)
        
        expect(manager.isKeyModeActive()).toBe(true)
        expect(manager.getActiveToolMode()).toBe('key')
        expect(manager.getToolModeItemIndex('key')).toBe(0)
      })

      it('should cancel key mode correctly', () => {
        manager.startKeyMode(0)
        manager.cancelKeyMode()
        
        expect(manager.isKeyModeActive()).toBe(false)
        expect(manager.getActiveToolMode()).toBeNull()
      })

      it('should complete key tool usage correctly', () => {
        manager.startKeyMode(0)
        manager.completeKeyMode()
        
        expect(manager.isKeyModeActive()).toBe(false)
        expect(manager.getActiveToolMode()).toBeNull()
      })
    })

    describe('staff mode', () => {
      it('should start staff mode correctly', () => {
        manager.startStaffMode(1)
        
        expect(manager.isStaffModeActive()).toBe(true)
        expect(manager.getActiveToolMode()).toBe('staff')
        expect(manager.getToolModeItemIndex('staff')).toBe(1)
      })

      it('should cancel staff mode correctly', () => {
        manager.cancelStaffMode()
        
        expect(manager.isStaffModeActive()).toBe(false)
        expect(manager.getActiveToolMode()).toBeNull()
      })

      it('should complete staff tool usage correctly', () => {
        manager.startStaffMode(1)
        manager.completeStaffMode()
        
        expect(manager.isStaffModeActive()).toBe(false)
        expect(manager.getActiveToolMode()).toBeNull()
      })
    })

    describe('ring mode', () => {
      it('should start ring mode correctly', () => {
        manager.startRingMode(2)
        
        expect(manager.isRingModeActive()).toBe(true)
        expect(manager.getActiveToolMode()).toBe('ring')
        expect(manager.getToolModeItemIndex('ring')).toBe(2)
      })

      it('should cancel ring mode correctly', () => {
        manager.startRingMode(2)
        manager.cancelRingMode()
        
        expect(manager.isRingModeActive()).toBe(false)
        expect(manager.getActiveToolMode()).toBeNull()
      })

      it('should complete ring tool usage correctly', () => {
        manager.startRingMode(2)
        manager.completeRingMode()
        
        expect(manager.isRingModeActive()).toBe(false)
        expect(manager.getActiveToolMode()).toBeNull()
      })
    })
  })

  describe('discard confirmation', () => {
    it('should show discard confirmation', () => {
      manager.showDiscardConfirmation(1, 'Test Item')
      
      const confirmation = manager.getDiscardConfirmation()
      expect(confirmation).toEqual({
        itemIndex: 1,
        itemName: 'Test Item'
      })
    })

    it('should hide discard confirmation', () => {
      manager.showDiscardConfirmation(1, 'Test Item')
      manager.hideDiscardConfirmation()
      
      expect(manager.getDiscardConfirmation()).toBeNull()
    })

    it('should return immutable discard confirmation state', () => {
      manager.showDiscardConfirmation(1, 'Test Item')
      
      const confirmation1 = manager.getDiscardConfirmation()
      const confirmation2 = manager.getDiscardConfirmation()
      
      expect(confirmation1).toEqual(confirmation2)
      expect(confirmation1).not.toBe(confirmation2) // Different objects
    })
  })

  describe('shop management', () => {
    it('should open shop', () => {
      manager.openShop()
      
      expect(manager.isShopOpen()).toBe(true)
      expect(manager.getState().shopOpen).toBe(true)
    })

    it('should close shop', () => {
      manager.openShop()
      manager.closeShop()
      
      expect(manager.isShopOpen()).toBe(false)
      expect(manager.getState().shopOpen).toBe(false)
    })
  })

  describe('tool mode validation', () => {
    it('should allow tool mode when no other tool is active', () => {
      expect(manager.canActivateToolMode('transmute')).toBe(true)
      expect(manager.canActivateToolMode('detector')).toBe(true)
    })

    it('should prevent tool mode when another tool is active', () => {
      manager.startTransmuteMode(0)
      
      expect(manager.canActivateToolMode('detector')).toBe(false)
      expect(manager.canActivateToolMode('key')).toBe(false)
    })

    it('should allow same tool mode when already active', () => {
      manager.startTransmuteMode(0)
      
      expect(manager.canActivateToolMode('transmute')).toBe(true)
    })

    it('should prevent tool mode when shop is open', () => {
      manager.openShop()
      
      expect(manager.canOpenShop()).toBe(true) // Shop is already open
    })
  })

  describe('state management', () => {
    it('should update UI state correctly', () => {
      manager.updateState({
        shopOpen: true,
        pendingDiscard: { itemIndex: 1, itemName: 'Test' }
      })
      
      const state = manager.getState()
      expect(state.shopOpen).toBe(true)
      expect(state.pendingDiscard).toEqual({ itemIndex: 1, itemName: 'Test' })
    })

    it('should reset UI state to initial values', () => {
      manager.startTransmuteMode(0)
      manager.openShop()
      manager.showDiscardConfirmation(1, 'Test')
      
      manager.resetState()
      
      const state = manager.getState()
      expect(state.shopOpen).toBe(false)
      expect(state.pendingDiscard).toBeNull()
      expect(state.toolModes).toEqual({})
    })

    it('should return immutable UI state', () => {
      const state1 = manager.getState()
      const state2 = manager.getState()
      
      expect(state1).toEqual(state2)
      expect(state1).not.toBe(state2) // Different objects
      expect(state1.toolModes).not.toBe(state2.toolModes) // Different tool mode objects
    })
  })

  describe('UI state summary', () => {
    it('should return empty summary when no UI states active', () => {
      const summary = manager.getActiveStatesSummary()
      expect(summary).toEqual([])
    })

    it('should include active tool mode in summary', () => {
      manager.startTransmuteMode(0)
      
      const summary = manager.getActiveStatesSummary()
      expect(summary).toContain('transmute mode active')
    })

    it('should include shop state in summary', () => {
      manager.openShop()
      
      const summary = manager.getActiveStatesSummary()
      expect(summary).toContain('Shop open')
    })

    it('should include discard confirmation in summary', () => {
      manager.showDiscardConfirmation(1, 'Test Item')
      
      const summary = manager.getActiveStatesSummary()
      expect(summary).toContain('Discard confirmation for Test Item')
    })

    it('should combine multiple active states in summary', () => {
      manager.startDetectorMode(1)
      manager.openShop()
      manager.showDiscardConfirmation(2, 'Another Item')
      
      const summary = manager.getActiveStatesSummary()
      expect(summary).toHaveLength(3)
      expect(summary).toContain('detector mode active')
      expect(summary).toContain('Shop open')
      expect(summary).toContain('Discard confirmation for Another Item')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined tool mode gracefully', () => {
      expect(manager.getToolModeItemIndex('invalid')).toBeNull()
    })

    it('should handle completing tool usage when no tool is active', () => {
      expect(() => manager.completeTransmuteMode()).not.toThrow()
      expect(() => manager.completeDetectorMode()).not.toThrow()
    })

    it('should handle multiple rapid tool mode switches', () => {
      manager.startTransmuteMode(0)
      manager.startDetectorMode(1)
      manager.startKeyMode(2)
      
      expect(manager.getActiveToolMode()).toBe('key')
      expect(manager.getToolModeItemIndex('key')).toBe(2)
    })

    it('should handle state updates with partial state objects', () => {
      manager.updateState({ shopOpen: true })
      
      const state = manager.getState()
      expect(state.shopOpen).toBe(true)
      expect(state.pendingDiscard).toBeNull() // Should remain unchanged
      expect(state.toolModes).toEqual({}) // Should remain unchanged
    })
  })

  describe('tool mode messages', () => {
    it('should provide appropriate messages for each tool mode', () => {
      const modes = ['transmute', 'detector', 'key', 'staff', 'ring']
      
      modes.forEach(mode => {
        // Start the mode
        switch (mode) {
          case 'transmute': manager.startTransmuteMode(0); break
          case 'detector': manager.startDetectorMode(0); break
          case 'key': manager.startKeyMode(0); break
          case 'staff': manager.startStaffMode(0); break
          case 'ring': manager.startRingMode(0); break
        }
        
        expect(manager.getActiveToolMode()).toBe(mode)
        
        manager.cancelAllToolModes()
      })
    })
  })
})