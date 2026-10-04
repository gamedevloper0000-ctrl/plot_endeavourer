# Plot Twist: Plot Endeavourer

A retro land trading mystery built on the project's Canvas map, with Kenney Tiny Town scenery and a playable coffee counter.

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
4. Buy land, watch the Market, build on owned parcels, and sell when the value suits you.
5. Save $3,900 and buy the valley roadster on the Goal panel.

The game autosaves in browser local storage. The Goal panel has a two-click **Start a new run** control. A new run generates a new terrain layout.
Sound is off by default. Use **Sound on/off** in the header to play the music and effects. This preference is saved separately from game progress.

## Project notes

- `game.htm` is the game entry point; `src/plot.js` draws Kenney tiles on the existing Canvas map and manages the interface.
- `src/state.js` holds the shared economy, time, ownership, building, coffee, and goal state. One game day passes every 3.5 seconds.
- `src/audio.js` controls opt-in music and action sounds. All gameplay audio is bundled locally.
- The original `land.png` sprite is preserved in the project but is no longer drawn. Sunfield, Meadow, Grove, and Waterfront remain the same economic plot types and the map keeps the same parcel coordinates and click behavior.
- `src/main.js`, `src/myclass.js`, `src/keys.js`, and the original sprite assets remain in the project. The old character prototype is no longer the entry page.
- There are no added dependencies.

## Art and audio credits

- Tiny Town tiles by [Kenney](https://kenney.nl/assets/tiny-town), CC0. A copy of the supplied license is in `public/assets/images/tiny-town-license.txt`.
- “Step dirt (Cozy Game SFX Free)” by [heyheytheree](https://freesound.org/people/heyheytheree/sounds/872597/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Supplied by the project owner; used for a customer leaving the queue.
- “Pouring coffee” by [Maajora](https://freesound.org/people/Maajora/sounds/432775/) and “Tea cup set down.mp3” by [TheHiraHira](https://freesound.org/people/TheHiraHira/sounds/460242/), both CC0. Local MP3 preview copies are bundled for brew and delivery effects.
- “The Morning Air” by Evan King was supplied by the project owner. The included copy is downsampled to 22.05 kHz mono for a smaller game download. The repository does not establish its redistribution license, so check that before publishing the game.
- The coffee queue characters are original CSS pixel art inspired by the supplied reference image. The watermarked image is not included.

## Verify

Run `node tests/engine.mjs` for the economy, coffee, story, twist, persistence, building, and goal checks. No test package is needed.
