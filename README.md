# Plot Twist: Plot Endeavourer

A retro land trading mystery built on the project's Canvas map, with the supplied export terrain, Kenney Tiny Town scenery, a playable coffee counter, and a local team to grow your business.

## Run

From the project folder, start a local static server:

```powershell
python -m http.server 8765
```

Open <http://localhost:8765/game.htm>. `plotholder.htm` redirects to the same game. A local server is needed for JavaScript modules; no install or build step is required.

## Play

1. At the coffee counter, tap ingredients in ticket order, stop the moving brew needle in the gold zone, and tap the right person in the visible line to deliver. Accuracy changes the tip.
2. Two correct deliveries reveal a stamped parcel on the map. Buy it to uncover the town's *plot twist* and earn a turn of the zoning board.
3. Select a parcel and use **Twist the plots** to rotate its four-plot block clockwise. Deeds, ownership, and buildings move together; owned deeds gain a small survey premium. Three perfect coffee orders earn another turn.
4. Buy land, watch the Market, build on owned parcels, and sell when the value suits you. Sales have a visible 5% closing fee.
5. Visit the Office to hire and train an analyst, agent, accountant, or coffee manager. Upgrades are optional and have one-time costs.
6. Keep a reserve for insurance and tax every 30 elapsed game days. The Office and Market show an upcoming estimate; the Office retains the latest bill and transaction ledger.
7. Save $3,900. A one-time notification links to the red roadster on the Goal panel. You choose when to buy it.

Buying the car opens a results screen and pauses the game clock. **Continue** preserves the full run; **Restart** asks for confirmation before clearing it. You can reopen results from the Goal panel after continuing. The game autosaves in browser local storage, and a new run generates a new terrain layout.
Sound is off by default. Use **Sound on/off** in the header to play the music and effects. This preference is saved separately from game progress.

## Project notes

- `game.htm` is the game entry point; `src/plot.js` crops `public/assets/images/export.png` into the existing Canvas grid, layers Kenney props, and manages the interface. The supplied 145×90 image contains painted grass at y=13–43 and water at y=0–12; unused white space is never sampled.
- `src/state.js` holds the shared economy, time, ownership, building, coffee, and goal state. One game day passes every 3.5 seconds.
- Monthly wealth is **cash + current owned property value**, floored at zero. Property values already contain building resale values, so buildings are counted once. The bill is 1% before accountant reductions, rounded to whole dollars (minimum $1 for positive wealth), split 40% insurance / 60% tax. Cash can briefly go negative; coffee work pays down this overdraft and land is never confiscated.
- `src/office.js` renders staff, expense previews and the latest 120 financial entries. Lifetime totals are retained separately. Two employee levels offer 7-day trends / 3-day cycle forecasts, 2% / 4% land discounts, 20% / 40% bill reductions, and 12% / 24% coffee bonuses. The maximum land discount stays below the sale fee to prevent instant trading profits.
- Net run gain includes cash, owned property and the purchased car, minus starting wealth. Bills and staff costs reduce it. Old saves keep their progress and open a new ledger at their current wealth; earnings that were never tracked are not invented.
- `src/effects.js` provides short-lived particles for purchases, sales, construction, twists and the goal. `src/car.js`, `src/results.js`, and `src/progression.css` handle the red roadster, responsive results dialog and office presentation.
- `src/audio.js` controls opt-in music and action sounds. All gameplay audio is bundled locally.
- The original `land.png` sprite is preserved in the project but is no longer drawn. Sunfield, Meadow, Grove, and Waterfront remain the same economic plot types and the map keeps the same parcel coordinates and click behavior.
- `src/main.js`, `src/myclass.js`, `src/keys.js`, and the original sprite assets remain in the project. The old character prototype is no longer the entry page.
- There are no added dependencies.

## Art and audio credits

- Tiny Town tiles by [Kenney](https://kenney.nl/assets/tiny-town), CC0. A copy of the supplied license is in `public/assets/images/tiny-town-license.txt`.
- `export.png` was supplied by the project owner in `export.zip` and is preserved as provided. The roadster is original SVG art; staff portraits are original CSS pixel art.
- “Step dirt (Cozy Game SFX Free)” by [heyheytheree](https://freesound.org/people/heyheytheree/sounds/872597/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Supplied by the project owner; used for a customer leaving the queue.
- “Pouring coffee” by [Maajora](https://freesound.org/people/Maajora/sounds/432775/) and “Tea cup set down.mp3” by [TheHiraHira](https://freesound.org/people/TheHiraHira/sounds/460242/), both CC0. Local MP3 preview copies are bundled for brew and delivery effects.
- “The Morning Air” by Evan King was supplied by the project owner. The included copy is downsampled to 22.05 kHz mono for a smaller game download. The repository does not establish its redistribution license, so check that before publishing the game.
- The coffee queue characters are original CSS pixel art inspired by the supplied reference image. The watermarked image is not included.

## Verify

Run `node tests/engine.mjs` for the economy, coffee, story, twist, persistence, buildings, bills, staff effects, legacy migration, affordability notification and complete reset checks. No test package is needed.
