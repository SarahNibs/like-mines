Gotcha — so we need to fold in:



1\. \*\*Permanent “character” upgrades\*\* distinct from one-use items, with acquisition methods and rarity.

2\. \*\*Intent system\*\* that:



&nbsp;  \* Makes certain contents visible before reveal (goodies \& hazards).

&nbsp;  \* Treats monsters/traps/etc. as \*\*tile contents\*\*, not tile types.

&nbsp;  \* Allows some opponent actions to be telegraphed in advance for tactical play.



Here’s the \*\*reworked PRD\*\* with those concepts baked in and the tile model clarified.



---



\# \*\*Product Requirements Document\*\*



\*\*Project:\*\* Roguelike Minesweeper

\*\*Version:\*\* 0.2

\*\*Owner:\*\* \\\[Your Name]

\*\*Last Updated:\*\* \\\[Date]



---



\## \*\*1. Overview\*\*



Roguelike Minesweeper is a web-based, turn-based puzzle/strategy game combining Minesweeper-style adjacency logic with roguelike progression. The player competes against AI opponents in a race to reveal all of their own tiles before the AI reveals theirs. Each board is procedurally generated with hazards, treasures, probabilistic clues, and visible “intents” for some entities. A full run consists of a sequence of increasingly difficult boards. Losing once ends the run with no meta-progression.



---



\## \*\*2. Goals \& Non-Goals\*\*



\*\*Goals\*\*



\* Preserve the deductive gameplay core of Minesweeper while adding roguelike progression and resource management.

\* Introduce tactical decision-making through visible enemy “intents” and known tile contents.

\* Provide escalating challenge through varied board setups, AI speeds, and hazard types.

\* Design flexible board generation that allows procedural variety and hand-crafted “difficulty profiles.”



\*\*Non-Goals\*\*



\* Mobile support (focus is desktop web).

\* Real-time play.

\* Permanent unlocks or meta-progression between runs.

\* Multiplayer.



---



\## \*\*3. Player Experience\*\*



\* \*\*Tone/Theme:\*\* Dungeon delving; each tile reveal represents uncovering part of an underground area.

\* \*\*Primary Emotions:\*\*



&nbsp; \* Tension from time pressure against AI.

&nbsp; \* Satisfaction from logically deducing safe reveals.

&nbsp; \* Tactical trade-offs from choosing between probability and utility.

&nbsp; \* Long-term satisfaction from securing rare permanent upgrades during a run.



---



\## \*\*4. Gameplay\*\*



\### \*\*4.1 Game Modes\*\*



\* \*\*Single-player run:\*\* Sequential boards until the player wins or loses.



---



\### \*\*4.2 Core Loops\*\*



\*\*Outer Loop (Run)\*\*



1\. Start with base HP, no upgrades, basic items.

2\. Complete boards of escalating difficulty.

3\. Between some boards: spend gold at shops for one-use items or permanent character upgrades.

4\. Rarely, find permanent upgrades directly on the board.

5\. Reach 0 HP or lose a board → run ends.

6\. Complete final board → win.



\*\*Mid Loop (Board)\*\*



1\. Carry over HP, items, and permanent upgrades from run state.

2\. AI and player race to reveal all their own tiles first.

3\. Revealing hazard contents damages HP or causes penalties.

4\. Revealing opponent tiles helps them progress; neutral tiles have no direct ownership benefit.

5\. Known contents and opponent intents influence tile choice.

6\. Board ends when any player (human or AI) has revealed all their own tiles.



\*\*Inner Loop (Turn)\*\*



1\. Receive probabilistic clue about own tile positions.

2\. See current visible tile contents and opponent telegraphed moves (“intents”).

3\. Choose one unrevealed tile to reveal:



&nbsp;  \* If it’s yours → keep going.

&nbsp;  \* If not yours → turn ends (may trigger tile content).

4\. Use items before or after reveal.

5\. Opponents take turns after you, following their own intent logic.



---



\### \*\*4.3 Victory \& Failure Conditions\*\*



\*\*Board\*\*



\* Win: Reveal all your tiles before any AI.

\* Loss: An AI reveals all of its tiles first.



\*\*Run\*\*



\* Win: Clear all boards in the sequence.

\* Loss: Lose any single board OR HP reaches zero.



---



\## \*\*5. Difficulty \& Progression\*\*



\* \*\*Run Length Target:\*\* \\~25 boards (\\~2 hours for skilled player).

\* \*\*Board Sizes:\*\* 6×5 min to 9×8 max; non-rectangular shapes possible.

\* \*\*Progression Factors:\*\*



&nbsp; \* Monster/trap count \& damage.

&nbsp; \* Number and type of opponents (0 → 1 → 2–3).

&nbsp; \* AI reveal rates.

&nbsp; \* Tile distribution (unbalanced possible).

&nbsp; \* Clue bias/accuracy changes via upgrades.

&nbsp; \* Visibility rules for intents and contents.

\* \*\*Level Profiles:\*\* Predefined difficulty parameters can override random generation for tuning.



---



\## \*\*6. Opponents (AI)\*\*



\* \*\*Purpose:\*\* Function as clocks to pressure player into efficient reveals.

\* \*\*Turn Sequence (Baseline):\*\*



&nbsp; 1. Reveal all guaranteed-own tiles via constraint satisfaction + hill-climbing.

&nbsp; 2. Reveal 1 own tile at random (“magic reveal”).

&nbsp; 3. Repeat guaranteed-own reveal.

&nbsp; 4. Reveal 1 neutral tile at random (default telegraphed to player as intent).

\* \*\*Variants:\*\* Later opponents may target player tiles in step 4.

\* \*\*Count:\*\* 0 early, scaling to 1–3.

\* \*\*Intent System:\*\*



&nbsp; \* Certain future opponent reveals are shown in advance (default: upcoming neutral reveal target is visible during player’s turn).



---



\## \*\*7. Tile Model\*\*



\### \*\*7.1 Tile Types\*\*



\* \*\*Player-Owned\*\*

\* \*\*Opponent-Owned\*\*

\* \*\*Neutral\*\*

\* \*\*Wall\*\* (blocks board space; may or may not be implemented as a formal tile type)



\### \*\*7.2 Tile Contents\*\*



\* \*\*Empty\*\* (no effect)

\* \*\*Monster\*\* (damages HP on reveal)

\* \*\*Trap\*\* (non-damage penalty)

\* \*\*Gold\*\* (currency for shops)

\* \*\*Item\*\* (one-use benefit)

\* \*\*Permanent Upgrade\*\* (rare; persistent for duration of run)

\* \*\*Shop\*\* (buy items/upgrades)



Contents can be known (visible) or hidden. Known contents are part of the intent/utility decision layer.



---



\## \*\*8. Items \& Permanent Upgrades\*\*



\### \*\*8.1 One-Use Items\*\*



\* \*\*Acquisition:\*\* Reveals, purchases with gold.

\* \*\*Effects Examples:\*\*



&nbsp; \* Reveal an extra tile.

&nbsp; \* Protect from monster damage.

&nbsp; \* Improve clue accuracy for next turn.



\### \*\*8.2 Permanent Upgrades\*\*



\* \*\*Acquisition:\*\* Rare tile contents or shop purchases.

\* \*\*Examples:\*\*



&nbsp; \* Armor: Reduces all monster damage.

&nbsp; \* Clue Amplifier: Improves baseline clue bias.

&nbsp; \* Backpack: Increase item inventory limit.

\* \*\*Persistence:\*\* Lasts entire run; lost when run ends.



---



\## \*\*9. Probabilistic Clue System\*\*



\* \*\*Base Form:\*\*



&nbsp; \* Select biased pool of 6 tiles.

&nbsp; \* Split into 2 hands; one has N–1 player tiles + 1 non-player, the other has the rest.

&nbsp; \* Player sees hands, must deduce which are theirs.

\* \*\*Upgrades Can:\*\*



&nbsp; \* Increase pool size.

&nbsp; \* Reduce/remove non-player tile in main hand.

&nbsp; \* Add secondary hints.



---



\## \*\*10. HP \& Damage\*\*



\* \*\*Run-wide HP:\*\* Starts at base value; reduced on monster hits.

\* \*\*Monster Damage:\*\* Varies per board and per monster type.

\* \*\*Armor Upgrades:\*\* Reduce damage taken.

\* \*\*Healing:\*\* From items or tile effects.



---



\## \*\*11. Board Generation Requirements\*\*



\* \*\*Procedural:\*\* Board shape, tile allocation, hazard/content placement, shop placement.

\* \*\*Configurable:\*\* Supports predefined parameters for difficulty tuning.

\* \*\*Intent Rules:\*\* Some tile contents generated as visible from the start; some revealed via opponent telegraph.



---



\## \*\*12. UI/UX Requirements\*\*



\* \*\*Board Panel:\*\* Tile grid showing revealed state, ownership, and known contents/intents.

\* \*\*Inventory Panel:\*\* Shows items, gold, permanent upgrades.

\* \*\*Clue Panel:\*\* Displays probabilistic clues.

\* \*\*Turn Order Display:\*\* Shows current player and upcoming AI turns/intents.

\* \*\*Run Status:\*\* HP, current board number, boards remaining.



---



\## \*\*13. Technical Requirements\*\*



\* \*\*Platform:\*\* Desktop web.

\* \*\*Input:\*\* Mouse, left/right click.

\* \*\*Framework:\*\* TBD.

\* \*\*Save State:\*\* Only within run; no persistence between runs.



---



\## \*\*14. Open Questions / TBD\*\*



\* Final run length and difficulty curve.

\* Complete list of items/upgrades.

\* Exact visibility rules for tile contents and opponent intents per difficulty tier.

\* Complete set of opponent variants.

\* Algorithm for AI deductive logic reveals.



---



