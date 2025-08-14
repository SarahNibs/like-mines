/**
 * Generic StateManager with observer pattern
 * Provides reactive state management for any data type
 */

export type StateChangeCallback<T> = (state: T) => void

export class StateManager<T> {
  private state: T
  private observers: Array<StateChangeCallback<T>> = []

  constructor(initialState: T) {
    this.state = initialState
  }

  // Get current state (read-only copy)
  getState(): T {
    return this.deepClone(this.state)
  }

  // Subscribe to state changes
  subscribe(callback: StateChangeCallback<T>): () => void {
    this.observers.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(callback)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  // Update state and notify observers
  setState(newState: T): void
  setState(updater: (currentState: T) => T): void
  setState(stateOrUpdater: T | ((currentState: T) => T)): void {
    if (typeof stateOrUpdater === 'function') {
      const updater = stateOrUpdater as (currentState: T) => T
      this.state = updater(this.state)
    } else {
      this.state = stateOrUpdater
    }
    this.notify()
  }

  // Update state partially (for object states)
  updateState(partialState: Partial<T>): void {
    if (typeof this.state === 'object' && this.state !== null) {
      this.state = { ...this.state, ...partialState } as T
      this.notify()
    } else {
      throw new Error('updateState can only be used with object states')
    }
  }

  // Notify all observers of state changes
  private notify(): void {
    this.observers.forEach(callback => {
      try {
        callback(this.state)
      } catch (error) {
        console.error('Error in state observer:', error)
      }
    })
  }

  // Get number of observers (for testing/debugging)
  getObserverCount(): number {
    return this.observers.length
  }

  // Clear all observers (for cleanup)
  clearObservers(): void {
    this.observers = []
  }

  // Deep clone utility for immutability
  private deepClone(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as unknown as T
    }
    
    if (typeof obj === 'object') {
      const cloned = {} as T
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key])
        }
      }
      return cloned
    }
    
    return obj
  }
}