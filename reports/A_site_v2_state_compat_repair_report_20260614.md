# A Site V2 State Compatibility Repair Report - 2026-06-14

## Scope

This pass repairs V2 state-diff compatibility for the existing A-site accept flow. It does not add event-chain, lens, debug-panel, or UI features.

Target modules:

- `attributes`
- `tags`
- `npcs`
- `goals`

## Baseline Constraint

The old A-site accept path wrote legacy state fields directly through the accepted event payload:

- `statChanges`
- `newTags`
- `removedTags`
- `newNPCs`
- `updatedNPCs`
- `modifyGoals`
- `achievedGoals`

The V2 path wraps those fields as `StateDiff.proposedPatches`. This repair keeps that wrapper, but makes the patch application layer accept common legacy and V2 output shapes instead of silently dropping them.

## Code Changes

File: `assets/a-site-v2-runtime.js`

- `normalizeLegacyStatChanges()` now accepts:
  - legacy map shape, such as `{ Body: 1 }`
  - single item shape, such as `{ name: "Body", delta: 1 }`
  - array item shape, such as `[{ attribute: "Intellect", change: 1 }]`
  - nested `statChanges` / `changes`
  - patch metadata is ignored while normalizing stat changes
- `attributes` patch application now uses normalized legacy deltas and supports attribute aliases.
- `npcs` patch application now accepts string or numeric NPC names, not only object payloads.
- `goals.modifyGoals` now accepts single-object `add/remove/achieve` shapes in addition to legacy arrays.

File: `index.html`

- Runtime cache-bust updated to `20260614-v2-state-compat-a`.

## Validation

Commands run:

- `node --check assets/a-site-v2-runtime.js`
- VM direct patch test for:
  - attributes array delta
  - attributes single object delta
  - Chinese/alias attribute names
  - NPC string add
  - `newNPCs` string add
  - goals object add/remove/achieve
- VM full `applyConfirmedStateDiff()` test:
  - writes `history`
  - writes `canonHistory`
  - writes `stateDiffHistory`
  - writes patch history for `attributes/tags/npcs/goals`
  - clears pending accepted event
- Local mobile page screenshot with Chrome channel:
  - `output/playwright/a_site_v2_state_compat_local_pixel5_20260614.png`

## Result

Local validation passes for the first V2 state compatibility repair slice.

Remaining required check before calling this published:

- push to GitHub Pages
- verify the Pages URL loads `a-site-v2-runtime.js?v=20260614-v2-state-compat-a`
