# Project Refactoring Plan - Emdash Delve

## Current State Analysis

### File Size Issues
- **main.ts**: 1,486 lines - MASSIVE monolith containing UI, event handling, tooltips, inventory management
- **store.ts**: 1,501 lines - Huge state management file with game logic mixed in
- **boardGenerator.ts**: 725 lines - Large but reasonably focused
- **renderer.ts**: 699 lines - Large rendering logic, some mixed concerns

### Core Problems Identified

1. **Massive main.ts file** - Contains everything UI-related in one huge file
2. **Monolithic store.ts** - Game state + business logic + UI coordination all mixed
3. **Mixed concerns** - UI logic, game logic, and presentation mixed throughout
4. **No clear architectural boundaries** - Hard to understand data flow
5. **Difficult testing** - Tightly coupled code makes unit testing nearly impossible
6. **Poor maintainability** - Changes require understanding entire large files

## Refactoring Strategy

### Phase 1: Extract UI Components (Priority: HIGH)

#### 1.1 Extract from main.ts → UI Components
```
src/ui/
├── components/
│   ├── inventory/
│   │   ├── InventorySlot.ts
│   │   ├── InventoryManager.ts
│   │   └── InventoryTooltips.ts
│   ├── shop/
│   │   ├── ShopWidget.ts
│   │   └── ShopManager.ts
│   ├── character/
│   │   ├── CharacterSelection.ts
│   │   └── CharacterDisplay.ts
│   ├── tooltips/
│   │   ├── TooltipManager.ts
│   │   ├── DetectorTooltip.ts
│   │   └── ItemTooltip.ts
│   ├── game/
│   │   ├── GameBoard.ts
│   │   ├── StatusPanel.ts
│   │   └── UpgradeChoice.ts
│   └── clues/
│       ├── ClueDisplay.ts
│       └── ClueHighlighting.ts
└── managers/
    ├── UIManager.ts
    ├── EventManager.ts
    └── InputManager.ts
```

#### 1.2 Benefits
- **main.ts** reduces from 1,486 lines to ~200 lines (just initialization)
- Clear separation of UI concerns
- Reusable UI components
- Easier testing of individual components

### Phase 2: Separate Game Logic from Store (Priority: HIGH)

#### 2.1 Extract from store.ts → Game Services
```
src/game/
├── services/
│   ├── GameStateService.ts        # Pure state management
│   ├── ItemService.ts             # Item usage logic
│   ├── CombatService.ts           # Combat calculations
│   ├── InventoryService.ts        # Inventory operations
│   ├── ShopService.ts             # Shop logic
│   └── BoardService.ts            # Board operations
├── managers/
│   ├── TurnManager.ts             # Turn handling
│   ├── ModeManager.ts             # Game mode switching (transmute, detector, etc.)
│   └── TargetingManager.ts        # Targeting modes (staff, ring, etc.)
└── controllers/
    ├── GameController.ts          # Coordinates services
    └── ActionController.ts        # Handles player actions
```

#### 2.2 Benefits
- **store.ts** reduces from 1,501 lines to ~300 lines (just state + coordination)
- Proper separation of concerns
- Testable business logic
- Clear data flow

### Phase 3: Reorganize Core Systems (Priority: MEDIUM)

#### 3.1 Better File Organization
```
src/
├── core/                          # Core game engine
│   ├── Game.ts                    # Main game class
│   ├── Board.ts                   # Board logic
│   └── Player.ts                  # Player state
├── systems/                       # Game systems
│   ├── TargetingSystem.ts         # All targeting modes
│   ├── InventorySystem.ts         # Inventory management
│   ├── CombatSystem.ts            # Combat resolution
│   └── ProgressionSystem.ts       # Level progression
├── data/                          # Game data
│   ├── items/
│   │   ├── ItemDefinitions.ts
│   │   ├── ItemEffects.ts
│   │   └── ItemCategories.ts
│   ├── characters/
│   │   ├── CharacterDefinitions.ts
│   │   └── CharacterAbilities.ts
│   ├── levels/
│   │   ├── LevelDefinitions.ts
│   │   └── LevelGenerator.ts
│   └── upgrades/
│       ├── UpgradeDefinitions.ts
│       └── UpgradeEffects.ts
├── rendering/                     # Rendering system
│   ├── GameRenderer.ts            # Main renderer
│   ├── TileRenderer.ts            # Tile-specific rendering
│   ├── EffectRenderer.ts          # Visual effects
│   └── UIRenderer.ts              # UI rendering
├── utils/                         # Utilities
│   ├── MathUtils.ts
│   ├── RandomUtils.ts
│   └── ValidationUtils.ts
└── types/                         # Type definitions
    ├── GameTypes.ts
    ├── UITypes.ts
    └── DataTypes.ts
```

### Phase 4: Implement Proper Architecture (Priority: MEDIUM)

#### 4.1 Event-Driven Architecture
```typescript
// Event system for loose coupling
src/events/
├── EventBus.ts
├── GameEvents.ts
└── UIEvents.ts

// Example usage:
eventBus.emit('inventory.itemUsed', { itemId, slotIndex })
eventBus.on('game.boardChanged', (board) => renderer.render(board))
```

#### 4.2 Dependency Injection
```typescript
// Service container for testability
src/container/
├── ServiceContainer.ts
├── GameServices.ts
└── UIServices.ts
```

### Phase 5: Add Testing Infrastructure (Priority: LOW)

#### 5.1 Test Structure
```
tests/
├── unit/
│   ├── services/
│   ├── utils/
│   └── components/
├── integration/
│   ├── game-flow/
│   └── ui-interactions/
└── fixtures/
    ├── boards/
    ├── characters/
    └── game-states/
```

## Implementation Order

### Week 1: UI Component Extraction
1. **Day 1-2**: Extract tooltip system
2. **Day 3-4**: Extract inventory management
3. **Day 5**: Extract shop system
4. **Weekend**: Extract character selection

### Week 2: Game Logic Separation
1. **Day 1-2**: Extract item and combat services
2. **Day 3-4**: Extract targeting and mode management
3. **Day 5**: Create game controller layer
4. **Weekend**: Refactor store to pure state management

### Week 3: Architecture Improvements
1. **Day 1-3**: Reorganize file structure
2. **Day 4-5**: Implement event system
3. **Weekend**: Add dependency injection

### Week 4: Polish and Testing
1. **Day 1-3**: Add unit tests for core services
2. **Day 4-5**: Integration testing
3. **Weekend**: Documentation and cleanup

## Expected Outcomes

### Before Refactoring
- main.ts: 1,486 lines
- store.ts: 1,501 lines  
- Total complexity: Very High
- Testability: Poor
- Maintainability: Poor

### After Refactoring
- main.ts: ~200 lines (initialization only)
- store.ts: ~300 lines (state management only)
- Total files: ~40 focused files
- Average file size: ~100-200 lines
- Complexity: Low-Medium per file
- Testability: Excellent
- Maintainability: Excellent

## Risk Mitigation

1. **Incremental approach** - Each phase can be done separately
2. **Keep old files** - Rename to .old during migration
3. **Frequent testing** - Ensure game still works after each change
4. **Git branches** - Use feature branches for each major extraction

## Success Metrics

- [ ] No file over 500 lines
- [ ] Clear separation of concerns
- [ ] 80%+ test coverage on business logic
- [ ] UI components are reusable
- [ ] Easy to add new features
- [ ] New developers can understand codebase quickly

---

**This refactoring will transform the codebase from a hard-to-maintain monolith into a clean, modular, testable architecture.**