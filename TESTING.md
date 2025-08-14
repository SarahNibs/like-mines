# Testing Documentation

## Overview

This project uses Jest for unit testing with TypeScript support via ts-jest.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Current Coverage

- **gameLogic.ts**: Tests for pure functions like `countAdjacentTiles`, `checkBoardStatus`, inventory management, and state creation
- **items.ts**: Tests for item definitions, monster creation functions, and data integrity 
- **characters.ts**: Tests for character definitions, balance validation, and data consistency

### Test Organization

Tests are located in `src/__tests__/` and follow the naming convention `*.test.ts`.

Each test file covers:
- **Data validation**: Ensuring consistent structure and types
- **Pure function behavior**: Testing logic without side effects  
- **Edge cases**: Boundary conditions and error scenarios
- **Balance checks**: Game design constraints and validations

## Testing Philosophy

1. **Start with pure functions**: Functions with no side effects are easiest to test
2. **Test behavior, not implementation**: Focus on what functions do, not how
3. **Cover edge cases**: Test boundary conditions and error scenarios
4. **Validate data integrity**: Ensure game data is consistent and well-formed

## Future Testing Plans

As the codebase evolves, we plan to add:

1. **Store testing**: Once the monolithic store is decomposed
2. **Integration tests**: Testing component interactions
3. **UI testing**: Testing user interface behavior
4. **Game flow tests**: End-to-end gameplay scenarios

## Coverage Goals

- **Current**: ~5% overall, 100% on tested modules
- **Near-term**: 30-40% with store decomposition testing
- **Long-term**: 70%+ with comprehensive integration tests

## Key Testing Insights

- The monster creation function has edge case behavior at level 0 (empty available monsters array)
- Character balance is validated to ensure no character has excessive starting resources
- Item data is validated for consistency and proper typing
- Game logic functions handle boundary conditions appropriately

## Notes for Future Developers

- Tests have revealed some edge case bugs (e.g., level 0 monster creation)
- The current tests focus on the most isolated, pure parts of the codebase
- Store.ts (1,510 lines) remains untested but is the next priority for decomposition and testing
- All tests pass and provide a safety net for refactoring