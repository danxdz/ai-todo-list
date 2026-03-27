/**
 * Merge game — shared architecture (single source of truth for mechanics).
 *
 * All three HTML demos (fruit / numbers / atoms) use the same pipeline:
 *
 * | Layer            | Module(s) |
 * |------------------|-----------|
 * | Physics world    | `physics.js` — Cannon-es World, materials, `applyPhysicsTuning` |
 * | Cup + colliders  | `playfield-cup.js` — static floor/walls, `fitCameraToCup`, visuals |
 * | Merge / jackpot  | `merge-engine.js` — `createTryMerge`, neighbor damping |
 * | Viewport + camera | `viewport-ortho.js` — canvas size; ortho or **Perspective** frustum, `applyCupOrthoFrame` |
 * | Aim ray → world X | `merge-pointer.js` — `worldXFromPointer` (ray/plane for perspective) |
 * | Camera pose       | `playfield-cup.js` — `applyMergeOrthoCameraPose` (tilt + mild side offset in perspective) |
 * | Mass             | `ball-mass.js` — `massForFruitSpec` (atoms use atomic weights) |
 * | Effects          | `effects.js` — particles / danger line helper |
 * | HUD / i18n       | `merge-game-ui.css`, `i18n.js`, `ui-shell.js`, `retention.js` |
 *
 * Theme-specific code stays in each `*-merge-3d-demo.html` (spawn mesh, materials, labels).
 * Differences: fruit = single mesh; numbers/atoms = Group + label; atoms uses billboard symbols.
 *
 * Camera: **PerspectiveCamera** by default (real depth); aim uses ray → drop plane. Roadmap (ads, IAP)
 * hooks in UI/retention without forking physics.
 */

export const MERGE_GAME_ARCHITECTURE_VERSION = 1;
