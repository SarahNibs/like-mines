/**
 * Tests for TileContentHandler
 */

import { TileContentHandler, TileContentContext } from '../TileContentHandler'
import { TileContent } from '../types'

describe('TileContentHandler', () => {
  let handler: TileContentHandler
  let mockContext: TileContentContext
  
  beforeEach(() => {
    handler = new TileContentHandler()
    mockContext = {
      run: {
        hp: 50,
        maxHp: 100,
        gold: 10,
        loot: 3,
        attack: 10,
        defense: 2,
        upgrades: [],
        temporaryBuffs: {},
        inventory: [null, null, null]
      },
      stealGoldTrophy: jest.fn().mockReturnValue(false),
      applyRichUpgrade: jest.fn().mockResolvedValue(undefined)
    }
  })
  
  describe('handleTileContent', () => {
    describe('permanent upgrade content', () => {
      it('should trigger upgrade choice for permanent upgrades', () => {
        const tile = {
          content: TileContent.PermanentUpgrade,
          upgradeData: { id: 'attack', name: 'Attack Boost' }
        }
        
        const result = handler.handleTileContent(tile, mockContext)
        
        expect(result.shouldTriggerUpgradeChoice).toBe(true)
        expect(result.message).toBe('Found upgrade! Choose your enhancement.')
      })
    })
    
    describe('item content', () => {
      describe('immediate items', () => {
        it('should handle immediate item effects', () => {
          const tile = {
            content: TileContent.Item,
            itemData: {
              id: 'healing-potion',
              name: 'Healing Potion',
              immediate: true
            }
          }
          
          const result = handler.handleTileContent(tile, mockContext)
          
          expect(result.shouldUpdateRunState).toBe(true)
          expect(result.message).toBeDefined()
        })
        
        it('should handle shop item opening', () => {
          const tile = {
            content: TileContent.Item,
            itemData: {
              id: 'shop',
              name: 'Shop',
              immediate: true
            }
          }
          
          const result = handler.handleTileContent(tile, mockContext)
          
          expect(result.shouldOpenShop).toBe(true)
        })
        
        it('should handle immediate death from items', () => {
          // Set up context where player will die from item effect
          // Since no immediate items actually cause damage, we'll mock the hp to 0 to test the death logic
          mockContext.run.hp = 0
          
          const tile = {
            content: TileContent.Item,
            itemData: {
              id: 'gold-coin',
              name: 'Gold Coin',
              immediate: true
            }
          }
          
          const result = handler.handleTileContent(tile, mockContext)
          
          expect(result.shouldDie).toBe(true)
          expect(result.message).toBe('Player died! Game over.')
        })
      })
      
      describe('inventory items', () => {
        it('should handle successful inventory addition', () => {
          const tile = {
            content: TileContent.Item,
            itemData: {
              id: 'sword',
              name: 'Sword',
              immediate: false
            }
          }
          
          const result = handler.handleTileContent(tile, mockContext)
          
          expect(result.shouldUpdateRunState).toBe(true)
        })
        
        it('should handle ward auto-apply when inventory full', () => {
          // Fill inventory
          mockContext.run.inventory = [{}, {}, {}]
          
          const tile = {
            content: TileContent.Item,
            itemData: {
              id: 'ward',
              name: 'Ward',
              immediate: false
            }
          }
          
          const result = handler.handleTileContent(tile, mockContext)
          
          expect(result.shouldUpdateRunState).toBe(true)
          expect(result.message).toContain('Ward auto-applied')
          expect(mockContext.run.temporaryBuffs.ward).toBe(4)
          expect(mockContext.run.upgrades).toContain('ward-temp')
        })
        
        it('should handle blaze auto-apply when inventory full', () => {
          // Fill inventory
          mockContext.run.inventory = [{}, {}, {}]
          
          const tile = {
            content: TileContent.Item,
            itemData: {
              id: 'blaze',
              name: 'Blaze',
              immediate: false
            }
          }
          
          const result = handler.handleTileContent(tile, mockContext)
          
          expect(result.shouldUpdateRunState).toBe(true)
          expect(result.message).toContain('Blaze auto-applied')
          expect(mockContext.run.temporaryBuffs.blaze).toBe(5)
          expect(mockContext.run.upgrades).toContain('blaze-temp')
        })
        
        it('should handle item loss when inventory full and not auto-applicable', () => {
          // Fill inventory
          mockContext.run.inventory = [{}, {}, {}]
          
          const tile = {
            content: TileContent.Item,
            itemData: {
              id: 'sword',
              name: 'Sword',
              immediate: false
            }
          }
          
          const result = handler.handleTileContent(tile, mockContext)
          
          expect(result.message).toContain('Sword was lost')
        })
      })
    })
    
    describe('monster content', () => {
      it('should handle normal monster combat', () => {
        const tile = {
          x: 1,
          y: 1,
          content: TileContent.Monster,
          monsterData: {
            name: 'Rat',
            attack: 5,
            defense: 0,
            hp: 10
          }
        }
        
        const result = handler.handleTileContent(tile, mockContext)
        
        expect(result.shouldUpdateRunState).toBe(true)
        expect(result.message).toContain('Fought Rat')
        expect(mockContext.run.hp).toBeLessThan(50) // Should take damage
        expect(mockContext.run.gold).toBe(13) // Should gain loot
      })
      
      it('should handle monster combat with Rich upgrade', () => {
        mockContext.run.upgrades = ['rich']
        
        const tile = {
          x: 1,
          y: 1,
          content: TileContent.Monster,
          monsterData: {
            name: 'Rat',
            attack: 5,
            defense: 0,
            hp: 10
          }
        }
        
        const result = handler.handleTileContent(tile, mockContext)
        
        expect(result.shouldUpdateRunState).toBe(true)
        expect(mockContext.applyRichUpgrade).toHaveBeenCalledWith(1, 1)
      })
      
      it('should handle monster death with trophy steal', () => {
        // Set up lethal damage scenario
        mockContext.run.hp = 1
        mockContext.stealGoldTrophy = jest.fn().mockReturnValue(true)
        
        const tile = {
          x: 1,
          y: 1,
          content: TileContent.Monster,
          monsterData: {
            name: 'Dragon',
            attack: 50,
            defense: 0,
            hp: 100
          }
        }
        
        const result = handler.handleTileContent(tile, mockContext)
        
        expect(result.shouldUpdateRunState).toBe(true)
        expect(result.message).toContain('Dragon stole a gold trophy')
        expect(mockContext.run.hp).toBe(1) // Should survive with 1 HP
        expect(mockContext.stealGoldTrophy).toHaveBeenCalledWith('Dragon')
      })
      
      it('should handle monster death without trophy steal', () => {
        // Set up lethal damage scenario with no trophy to steal
        mockContext.run.hp = 1
        mockContext.stealGoldTrophy = jest.fn().mockReturnValue(false)
        
        const tile = {
          x: 1,
          y: 1,
          content: TileContent.Monster,
          monsterData: {
            name: 'Dragon',
            attack: 50,
            defense: 0,
            hp: 100
          }
        }
        
        const result = handler.handleTileContent(tile, mockContext)
        
        expect(result.shouldDie).toBe(true)
        expect(result.message).toBe('Player died! Game over.')
        expect(mockContext.stealGoldTrophy).toHaveBeenCalledWith('Dragon')
      })
    })
    
    describe('empty content', () => {
      it('should handle tiles with no special content', () => {
        const tile = {
          content: TileContent.Empty
        }
        
        const result = handler.handleTileContent(tile, mockContext)
        
        expect(result).toEqual({})
      })
    })
  })
  
  describe('auto-apply logic', () => {
    it('should stack ward bonuses', () => {
      mockContext.run.temporaryBuffs.ward = 2
      mockContext.run.upgrades = ['ward-temp']
      
      // Fill inventory
      mockContext.run.inventory = [{}, {}, {}]
      
      const tile = {
        content: TileContent.Item,
        itemData: {
          id: 'ward',
          name: 'Ward',
          immediate: false
        }
      }
      
      const result = handler.handleTileContent(tile, mockContext)
      
      expect(mockContext.run.temporaryBuffs.ward).toBe(6) // 2 + 4
      expect(result.message).toContain('total: +6')
    })
    
    it('should stack blaze bonuses', () => {
      mockContext.run.temporaryBuffs.blaze = 3
      mockContext.run.upgrades = ['blaze-temp']
      
      // Fill inventory
      mockContext.run.inventory = [{}, {}, {}]
      
      const tile = {
        content: TileContent.Item,
        itemData: {
          id: 'blaze',
          name: 'Blaze',
          immediate: false
        }
      }
      
      const result = handler.handleTileContent(tile, mockContext)
      
      expect(mockContext.run.temporaryBuffs.blaze).toBe(8) // 3 + 5
      expect(result.message).toContain('total: +8')
    })
  })
})