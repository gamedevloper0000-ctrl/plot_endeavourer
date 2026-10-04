# Plot Twist: Plot Endeavourer

A retro land trading mystery built on the project's original Canvas grid and `land.png` sprite strip.

## Run

From the project folder, start a local static server:

```powershell
python -m http.server 8765
```

Open <http://localhost:8765/game.htm>. `plotholder.htm` redirects to the same game. A local server is needed for JavaScript modules; no install or build step is required.

## Play

1. At the coffee counter, tap ingredients in ticket order, stop the moving brew needle in the gold zone, and deliver to the correct customer. Accuracy changes the tip.
2. Two correct deliveries reveal a stamped parcel on the map. Buy it to uncover the town's *plot twist* and earn a turn of the zoning board.
3. Select a parcel and use **Twist the plots** to rotate its four-plot block clockwise. Deeds, ownership, and buildings move together; owned deeds gain a small survey premium. Three perfect coffee orders earn another turn.
4. Buy land, watch the Market, build on owned parcels, and sell when the value suits you.
5. Save $3,900 and buy the valley roadster on the Goal panel.

The game autosaves in browser local storage. The Goal panel has a two-click **Start a new run** control. A new run generates a new terrain layout.

## Project notes

- `game.htm` is the game entry point; `src/plot.js` draws the existing terrain sprite on the existing Canvas grid and manages the interface.
- `src/state.js` holds the shared economy, time, ownership, building, coffee, and goal state. One game day passes every 3.5 seconds.
- The original sprite strip has five horizontal tiles: gray is the road; the other four are Sunfield, Meadow, Grove, and Waterfront. The original prototype had no plot type names, so these names are new.
- `src/main.js`, `src/myclass.js`, `src/keys.js`, and the original sprite assets remain in the project. The old character prototype is no longer the entry page.
- There are no added dependencies.

## Verify

Run `node tests/engine.mjs` for the economy, coffee, story, twist, persistence, building, and goal checks. No test package is needed.
