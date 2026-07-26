---
name: game_asset_creator
description: Generate, post-process, and verify game assets for simple-rts-unity — procedural runtime art (anatomy/sculpt/card art), AI text-to-3D pipeline, Blender MCP post-processing, and a GLB quality gate. Credentials come only from Skarbiec (skarbiec:// refs); browser work only via the Weles MCP server; Blender work only via the Blender MCP server. Use when creating, processing, or verifying models/card art for the game.
---

# game_asset_creator

Asset pipeline for the RTS game (races: humans / dwarves / elves / skeletons).
Two halves:

- **Runtime art** (`src/`) — procedural THREE.js generation imported by the
  game: `makeBody` / `sculptHumanoid` / `cardArtSvg`. No credentials, no
  network.
- **Authoring pipeline** (`pipeline/`) — AI text→3D generation with strict
  integration rules (below).

## Hard rules (never bypass)

1. **Secrets**: only via Skarbiec. Config holds `skarbiec://<item>/<field>`
   refs; the loader rejects inline secrets and credential-shaped env vars.
2. **Browser**: only via the Weles MCP stdio server (`weles-mcp`), never a
   local Chromium/profile.
3. **Blender**: only via a Blender MCP server (`uvx blender-mcp` default),
   never hand-rolled sockets.

## Setup (once per machine)

```bash
skarbiec set TEXT2GAME_ACCOUNT --type login \
  --field login_email=you@example.com --field login_password=...
cp pipeline.config.example.json pipeline.config.json   # edit URLs/selectors
node pipeline/cli.js setup                              # installs Blender + uv + blender-mcp
node pipeline/cli.js blender-health
```

## CLI

```bash
node pipeline/cli.js check-config          # validate config + vault refs
node pipeline/cli.js create "dwarven axe warrior, low-poly" --race dwarves
node pipeline/cli.js verify assets/models/warrior.glb
node pipeline/cli.js weles-tools
node pipeline/cli.js setup [--check|--dry-run]
```

`create` flow: login → prompt → poll → download `.glb` → optional Blender
postprocess (`blender.enabled`, `blender.processCode` sees
`INPUT_PATH`/`OUTPUT_PATH`) → **verification gate** (fails the job on
broken/off-budget assets). Outputs `<name>.glb` (+ `<name>.processed.glb`).

## MCP server (for agents)

```bash
node pipeline/mcp.js        # stdio JSON-RPC MCP, package bin: game-asset-mcp
```

Tools: `gac_create_asset` (prompt/race/out_dir/filename/config),
`gac_verify_asset` (path/config), `gac_check_config`, `gac_blender_health`,
`gac_weles_tools`.

## Verification gate (`verify` in config)

- Structural GLB checks: valid glTF container, meshes/primitives,
  **triangle budget** (`triTarget` 6000, `triTolerancePct` 100),
  materials/skins/animation clips, file size bounds.
- Optional render smoke through Blender MCP (`verify.render: true`).
- `verify.enabled: false` opts out (not recommended).

## Layout

- `src/` — runtime procedural art (ESM, `three` via import map)
- `assets/cards/` — card glyph SVGs; `assets/models/` — reference GLBs
- `pipeline/` — skarbiec.js, config.js, weles.js, blender.js, setup.js,
  text2game.js, verify.js, cli.js, mcp.js
- `tests/` — node:test (fake vault, fake MCP servers, synthetic GLBs)

Run tests: `npm test` (15+ tests, no real vault/browser/Blender needed).
