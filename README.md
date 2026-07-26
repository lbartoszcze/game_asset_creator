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

---

# Authoring pipeline (`pipeline/`)

Offline asset *generation* (text→3D) with two hard rules:

1. **Credentials come ONLY from Skarbiec.** Config files carry
   `skarbiec://<item>/<field>` references; `pipeline/config.js` rejects
   inline secrets and credential-shaped env vars. Nothing is read from
   browser profiles, cookie DBs, or key files.
2. **The browser is driven ONLY through the Weles MCP API** (`weles-mcp`
   stdio server). The pipeline never launches its own Chromium and never
   touches a local profile.

## Setup

```sh
# one-time: put the studio account into the vault
skarbiec set TEXT2GAME_ACCOUNT --type login \
  --field login_email=you@example.com --field login_password=...

# configure (all secrets stay as skarbiec:// references)
cp pipeline.config.example.json pipeline.config.json  # edit URLs/selectors
```

## Run

```bash
# validate config + resolve vault refs (no browser)
node pipeline/cli.js check-config

# generate one asset end-to-end
node pipeline/cli.js create "dwarven axe warrior, low-poly" --race dwarves

# inspect what the Weles MCP server exposes
node pipeline/cli.js weles-tools

# tests (fake skarbiec + fake MCP server, no real vault/browser)
npm test
```

## Layout

- `pipeline/skarbiec.js` — `skarbiec://` resolver over the vault CLI
- `pipeline/config.js` — config loader + inline-secret/env guards
- `pipeline/weles.js` — JSON-RPC stdio client + browser session over
  the Weles MCP tools (`weles_browser_start`, `weles_page_*`)
- `pipeline/text2game.js` — login → prompt → poll → download flow
  (selectors/URLs are config-driven)
- `pipeline/cli.js` — `create` / `check-config` / `weles-tools`
- `tests/` — node:test suite with fake vault + fake MCP server

### Blender MCP mode (post-processing)

After a GLB lands on disk, an optional Blender step remeshes / decimates /
rigs / re-exports it. Blender work goes through a **Blender MCP server**
too — the pipeline never drives Blender over hand-rolled sockets.

```bash
# automatic provisioning: Blender + uv + blender-mcp (idempotent)
node pipeline/cli.js setup            # or: npm run setup
node pipeline/cli.js setup --check    # verify only
node pipeline/cli.js setup --dry-run  # print the plan

# health probe against the MCP server
node pipeline/cli.js blender-health

# enable in pipeline.config.json:
#   "blender": { "enabled": true, "processCode": "<bpy python>" }
# processCode sees INPUT_PATH / OUTPUT_PATH globals; default spawn is
# `uvx blender-mcp` (override with blender.mcp.command/args).
```

With `blender.enabled` the `create` flow writes
`<name>.processed.glb` next to the downloaded artifact and reports it as
`processedPath` in the CLI output.

### LLM sculpt mode ("Opus wyklepuje w Blenderze")

An LLM (Claude Opus via the Anthropic API, or any model through Brama's
OpenAI-compatible router) iteratively *writes bpy code* to build a model,
executing each step through the Blender MCP session:

```
prompt → model writes bpy → execute (Blender MCP) → viewport screenshot
       → next round … → done → export GLB → verification gate
```

```bash
# config: models.anthropic.api_key = "skarbiec://ANTHROPIC/api_key"
# (or models.brama.{url,key,model} for the router)
node pipeline/cli.js sculpt "gothic dwarven tower, low-poly" --rounds 12
```

The loop caps at `llm.maxRounds` (default 12), feeds execution errors back
to the model, and fails the job if the model doesn't finish or the final
GLB fails verification. Also exposed as the `gac_sculpt` MCP tool.
