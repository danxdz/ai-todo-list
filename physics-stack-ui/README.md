# Periodic Stack (Atoms Focus)

Shared 3D merge runtime built with Svelte + Three.js + Cannon-es.
One gameplay core is reused across web, Android, and iOS.

## Development

```bash
npm install
npm run dev
```

## Quality Gates

```bash
npm run check
npm run build
```

Render static deploy build:

```bash
npm run render:check
```

This writes the Render-ready output to:

- `render-deploy/`

## Release Flags

Main switches live in:

- `src/lib/release-flags.js`

Current public build is atoms-first:

- `atomsFocus: true`
- `showExperimentalModes: false`
- `enableShopEntry: false`
- `enableSkinsLab: false`

This keeps fruit/numbers/shop/extra skins in source but out of the release UI.

## Capacitor (Android/iOS)

```bash
npm run release:android
npm run cap:android
```

```bash
npm run release:ios
npm run cap:ios
```

Helpful:

```bash
npm run cap:doctor
```

Quick update while developing (rebuild + sync + open):

```bash
npm run cap:android:update
```

## Play Store Readiness

Checklist is in:

- `docs/play-store-readiness.md`

## Render Deploy

Repo root includes a Render blueprint:

- [render.yaml](/c:/works/git_clone/ai-todo-list/render.yaml)

Render setup used here:

- monorepo root: `physics-stack-ui`
- build command: `npm ci && npm run build:render`
- publish folder: `render-deploy`

Notes:

- `android/` and `ios/` are treated as generated native shells and ignored for git in this web-first flow
- `static/` is ignored because runtime assets are sourced from `public/`
