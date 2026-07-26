# game_asset_creator

The asset-creation pipeline of **simple-rts-unity**, extracted from
`web/art/` into a standalone ES-module package. Every visual the game
shows is generated at runtime — no downloaded models, no build step.

## Pipeline overview

```
race + tier + class + weapon
        │
        ▼
  anatomy.js ── makeBody()          base body: primitives + marching-cubes
        │                            blob skin, per-race proportions/palette
        ▼
  sculpt.js ── sculptHumanoid()     high-detail character (~6k tris target):
        │                            torso rings, limbs, head, face
        ▼
  sculpt-gear.js                    gear pass: axes, armor plates, capes,
        │                            body details (per tier)
        ▼
  THREE.Mesh  ◄── game (units.js)
```

Cards go through a parallel path:

```
card definition (lib/cards.js)
        │
        ▼
  card-art.js ── cardArtSvg()       full-card SVG: race palette, scene
        │                            backdrop, glyph from assets/cards/
        ▼
  inline <svg> in the UI
```

## Layout

- `src/anatomy.js` — `makeBody(team, race, armorTier, weaponTier, klass,
  magicType, weaponStyle)` + `buildBlobBody()` (marching-cubes skin)
- `src/sculpt.js` — `sculptHumanoid(opts)` high-fidelity sculpt used by
  the tier demos
- `src/sculpt-gear.js` — vertex-level gear builders (`buildAxe`,
  `buildArmorDetails`, `buildBodyDetails`, `buildExtraDetails`,
  `buildCape`, `addBox`)
- `src/card-art.js` — `cardArtSvg(card, race)`; reads glyph SVGs from
  `assets/cards/` (override the base with `window.CARD_ART_BASE`)
- `src/loader.js` — GLB loader API kept as a procedural-only stub
  (the runtime is 100% generated; the stub preserves the import
  surface for callers)
- `assets/cards/` — 25 glyph SVGs used by card art
- `assets/models/` — reference GLBs (AI-pipeline outputs kept for the
  demo viewers, not used by the game at runtime)

## Usage

```js
import { makeBody, sculptHumanoid, cardArtSvg } from './game_asset_creator/src/index.js';
```

The package is browser-native ESM; `three` resolves through the import
map in `web/index.html` (unpkg CDN). No bundler required — GitHub Pages
serves `web/` as-is.

Consumers inside the repo: `web/units.js` (game units),
`web/lib/cards.js` (card UI), `web/demos/tiers.html` (sculpt showcase),
`web/demos/text2game-real-viewer.html` (reference GLB viewer).
