import { StateManager } from '../StateManager'

describe('StateManager', () => {
  describe('basic functionality', () => {
    it('should initialize with provided state', () => {
      const initialState = { count: 0, name: 'test' }
      const manager = new StateManager(initialState)
      
      expect(manager.getState()).toEqual(initialState)
    })

    it('should handle primitive state types', () => {
      const numberManager = new StateManager(42)
      const stringManager = new StateManager('hello')
      const booleanManager = new StateManager(true)
      
      expect(numberManager.getState()).toBe(42)
      expect(stringManager.getState()).toBe('hello')
      expect(booleanManager.getState()).toBe(true)
    })

    it('should handle complex object state', () => {
      const complexState = {
        user: { id: 1, name: 'John' },
        settings: { theme: 'dark', notifications: true },
        items: [1, 2, 3]
      }
      const manager = new StateManager(complexState)
      
      expect(manager.getState()).toEqual(complexState)
    })
  })

  describe('state updates', () => {
    it('should update state with new value', () => {
      const manager = new StateManager({ count: 0 })
      
      manager.setState({ count: 5 })
      
      expect(manager.getState().count).toBe(5)
    })

    it('should update state with updater function', () => {
      const manager = new StateManager({ count: 0 })
      
      manager.setState(state => ({ count: state.count + 1 }))
      
      expect(manager.getState().count).toBe(1)
    })

    it('should update state partially with updateState', () => {
      const manager = new StateManager({ count: 0, name: 'test', active: true })
      
      manager.updateState({ count: 10 })
      
      expect(manager.getState()).toEqual({ count: 10, name: 'test', active: true })
    })

    it('should throw error when using updateState with non-object state', () => {
      const manager = new StateManager(42)
      
      expect(() => {
        manager.updateState({ count: 5 } as any)
      }).toThrow('updateState can only be used with object states')
    })

    it('should handle null object state in updateState', () => {
      const manager = new StateManager(null)
      
      expect(() => {
        manager.updateState({ count: 5 } as any)
      }).toThrow('updateState can only be used with object states')
    })
  })

  describe('observer pattern', () => {
    it('should notify observers when state changes', () => {
      const manager = new StateManager({ count: 0 })
      const observer = jest.fn()
      
      manager.subscribe(observer)
      manager.setState({ count: 1 })
      
      expect(observer).toHaveBeenCalledWith({ count: 1 })
      expect(observer).toHaveBeenCalledTimes(1)
    })

    it('should notify multiple observers', () => {
      const manager = new StateManager({ count: 0 })
      const observer1 = jest.fn()
      const observer2 = jest.fn()
      
      manager.subscribe(observer1)
      manager.subscribe(observer2)
      manager.setState({ count: 1 })
      
      expect(observer1).toHaveBeenCalledWith({ count: 1 })
      expect(observer2).toHaveBeenCalledWith({ count: 1 })
    })

    it('should allow unsubscribing observers', () => {
      const manager = new StateManager({ count: 0 })
      const observer = jest.fn()
      
      const unsubscribe = manager.subscribe(observer)
      manager.setState({ count: 1 })
      
      unsubscribe()
      manager.setState({ count: 2 })
      
      expect(observer).toHaveBeenCalledTimes(1)
      expect(observer).toHaveBeenCalledWith({ count: 1 })
    })

    it('should handle unsubscribing non-existent observer gracefully', () => {
      const manager = new StateManager({ count: 0 })
      const observer = jest.fn()
      
      const unsubscribe = manager.subscribe(observer)
      unsubscribe()
      unsubscribe() // Calling again should not throw
      
      expect(() => unsubscribe()).not.toThrow()
    })

    it('should notify observers with partial state updates', () => {
      const manager = new StateManager({ count: 0, name: 'test' })
      const observer = jest.fn()
      
      manager.subscribe(observer)
      manager.updateState({ count: 5 })
      
      expect(observer).toHaveBeenCalledWith({ count: 5, name: 'test' })
    })

    it('should notify observers with updater function', () => {
      const manager = new StateManager({ count: 0 })
      const observer = jest.fn()
      
      manager.subscribe(observer)
      manager.setState(state => ({ count: state.count + 10 }))
      
      expect(observer).toHaveBeenCalledWith({ count: 10 })
    })
  })

  describe('error handling', () => {
    it('should catch and log observer errors without affecting other observers', () => {
      const manager = new StateManager({ count: 0 })
      const goodObserver = jest.fn()
      const badObserver = jest.fn(() => {
        throw new Error('Observer error')
      })
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      manager.subscribe(goodObserver)
      manager.subscribe(badObserver)
      manager.setState({ count: 1 })
      
      expect(goodObserver).toHaveBeenCalledWith({ count: 1 })
      expect(badObserver).toHaveBeenCalledWith({ count: 1 })
      expect(consoleSpy).toHaveBeenCalledWith('Error in state observer:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should continue notifying remaining observers after one throws', () => {
      const manager = new StateManager({ count: 0 })
      const observer1 = jest.fn()
      const observer2 = jest.fn(() => { throw new Error('Test error') })
      const observer3 = jest.fn()
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      manager.subscribe(observer1)
      manager.subscribe(observer2)
      manager.subscribe(observer3)
      manager.setState({ count: 1 })
      
      expect(observer1).toHaveBeenCalledWith({ count: 1 })
      expect(observer2).toHaveBeenCalledWith({ count: 1 })
      expect(observer3).toHaveBeenCalledWith({ count: 1 })
      
      consoleSpy.mockRestore()
    })
  })

  describe('utility methods', () => {
    it('should track observer count correctly', () => {
      const manager = new StateManager({ count: 0 })
      
      expect(manager.getObserverCount()).toBe(0)
      
      const unsubscribe1 = manager.subscribe(() => {})
      expect(manager.getObserverCount()).toBe(1)
      
      const unsubscribe2 = manager.subscribe(() => {})
      expect(manager.getObserverCount()).toBe(2)
      
      unsubscribe1()
      expect(manager.getObserverCount()).toBe(1)
      
      unsubscribe2()
      expect(manager.getObserverCount()).toBe(0)
    })

    it('should clear all observers', () => {
      const manager = new StateManager({ count: 0 })
      const observer1 = jest.fn()
      const observer2 = jest.fn()
      
      manager.subscribe(observer1)
      manager.subscribe(observer2)
      expect(manager.getObserverCount()).toBe(2)
      
      manager.clearObservers()
      expect(manager.getObserverCount()).toBe(0)
      
      manager.setState({ count: 1 })
      expect(observer1).not.toHaveBeenCalled()
      expect(observer2).not.toHaveBeenCalled()
    })
  })

  describe('immutability and state isolation', () => {
    it('should not allow external mutation of state', () => {
      const initialState = { count: 0, items: [1, 2, 3] }
      const manager = new StateManager(initialState)
      
      const state = manager.getState()
      state.count = 999
      state.items.push(4)
      
      // State should remain unchanged
      expect(manager.getState().count).toBe(0)
      expect(manager.getState().items).toEqual([1, 2, 3])
    })

    it('should create new state objects on updates', () => {
      const manager = new StateManager({ count: 0 })
      const initialState = manager.getState()
      
      manager.updateState({ count: 1 })
      const updatedState = manager.getState()
      
      expect(updatedState).not.toBe(initialState)
      expect(updatedState.count).toBe(1)
      expect(initialState.count).toBe(0)
    })
  })

  describe('complex state scenarios', () => {
    it('should handle nested object updates correctly', () => {
      interface NestedState {
        user: { id: number; profile: { name: string; age: number } }
        settings: { theme: string }
      }
      
      const manager = new StateManager<NestedState>({
        user: { id: 1, profile: { name: 'John', age: 30 } },
        settings: { theme: 'dark' }
      })
      
      manager.updateState({
        user: { id: 1, profile: { name: 'Jane', age: 25 } }
      })
      
      expect(manager.getState().user.profile.name).toBe('Jane')
      expect(manager.getState().settings.theme).toBe('dark')
    })

    it('should handle array state updates', () => {
      const manager = new StateManager<number[]>([1, 2, 3])
      
      manager.setState([4, 5, 6])
      
      expect(manager.getState()).toEqual([4, 5, 6])
    })

    it('should handle function updates that depend on previous state', () => {
      const manager = new StateManager({ history: [1], current: 1 })
      
      manager.setState(state => ({
        history: [...state.history, state.current + 1],
        current: state.current + 1
      }))
      
      expect(manager.getState()).toEqual({
        history: [1, 2],
        current: 2
      })
    })
  })
})