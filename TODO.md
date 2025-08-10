# Development Roadmap

## **Milestone 1: Basic Playable Minesweeper** 
*Goal: Click tiles to reveal them, win when you reveal all your tiles*

- [ ] Project setup (Vite + TypeScript + basic HTML structure)
- [ ] Core tile types and board state structure
- [ ] Canvas rendering system for tile grid
- [ ] Click handling to reveal tiles
- [ ] Win/loss detection (player reveals all their tiles first)

## **Milestone 2: Add Simple AI Opponent**
*Goal: Race against a dumb AI that reveals random tiles*

- [ ] Dumb AI that reveals random own tiles each turn
- [ ] Turn system (player → AI → repeat)
- [ ] Race condition win/loss against AI

## **Milestone 3: Probabilistic Clues**
*Goal: Player gets hints about which tiles are theirs*

- [ ] Basic 6-tile clue system with 2 hands
- [ ] UI panel to display clues

## **Milestone 4: Multiple Boards**
*Goal: Progress through a sequence of boards*

- [ ] Board generation with rot.js
- [ ] Run state management (HP, board progression)
- [ ] Transition between boards

## **Future Milestones (Lower Priority):**

### **Milestone 5: Smart AI**
- [ ] AI constraint satisfaction logic for guaranteed-own reveals
- [ ] AI hill-climbing for optimal tile selection
- [ ] Intent telegraphing system (show AI's next neutral target)

### **Milestone 6: Tile Contents & HP**
- [ ] Monster tiles (damage HP on reveal)
- [ ] Trap tiles (non-damage penalties)
- [ ] Gold tiles (currency system)
- [ ] HP system with damage and healing

### **Milestone 7: Items & Shops**
- [ ] One-use items (extra reveals, damage protection, clue improvements)
- [ ] Shop tiles for purchasing items
- [ ] Inventory management UI

### **Milestone 8: Permanent Upgrades**
- [ ] Rare permanent upgrade tiles
- [ ] Upgrade effects (armor, clue amplifiers, backpack)
- [ ] Upgrade persistence within runs

### **Milestone 9: Advanced Systems**
- [ ] Multiple AI opponent types with different behaviors
- [ ] Advanced intent system (telegraphed monster/trap activations)
- [ ] Difficulty scaling and level profiles
- [ ] Polish and balancing

## **Completed Milestones:**
*None yet - ready to start development!*