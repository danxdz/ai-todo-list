<script lang="ts">
  import { onMount } from 'svelte';
  import { locale, localeOptions, setLocale, t } from '../app-i18n';
  import type { GameMode } from '../types';

  export let mode: GameMode;
  export let onExit: () => void = () => {};

  let host: HTMLDivElement;
  let fxLayer: HTMLDivElement;
  let gameInstance: any;
  let menuOpen = false;
  let hintVisible = false;
  let toast = '';
  let toastTone = 'neutral';
  let toastPlacement: 'bottom' | 'center' = 'bottom';
  let moleculeWin = {
    open: false,
    firstEver: false,
    formula: '',
    name: '',
    points: 0,
    color: 0x88bbff,
    atoms: [] as Array<{ symbol: string; color: number; count: number }>,
  };
  let overlay = {
    open: false,
    score: 0,
    level: 1,
    title: '',
    summary: '',
  };
  let hud = {
    score: 0,
    level: 1,
    levelGoal: 0,
    combo: '',
    nextLabel: '',
    nextQueue: [] as Array<{ label: string; color: number }>,
    tierLabel: '',
    panic: 0,
    muted: false,
    title: '',
    themeId: 'marble',
  };
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let moleculeTimer: ReturnType<typeof setTimeout> | null = null;

  $: currentLocale = $locale;

  function pushToast(message: string, tone = 'neutral', placement: 'bottom' | 'center' = 'bottom') {
    if (!message) return;
    toast = message;
    toastTone = tone;
    toastPlacement = placement;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast = '';
    }, 1700);
  }

  function showMoleculeWin(payload: any) {
    const recipe = payload?.recipe ?? {};
    moleculeWin = {
      open: true,
      firstEver: !!payload?.firstEver,
      formula: recipe?.formula ?? '',
      name: recipe?.name ?? '',
      points: Number(payload?.points ?? 0),
      color: Number(recipe?.color ?? 0x88bbff),
      atoms: Array.isArray(payload?.atoms) ? payload.atoms : [],
    };
    if (moleculeTimer) clearTimeout(moleculeTimer);
    moleculeTimer = setTimeout(() => {
      moleculeWin = { ...moleculeWin, open: false };
    }, 2600);
  }

  function moleculePreview(node: HTMLDivElement, payload: typeof moleculeWin) {
    let mounted = true;
    let cleanup: null | (() => void) = null;
    let seq = 0;

    async function render(nextPayload: typeof moleculeWin) {
      const token = ++seq;
      cleanup?.();
      cleanup = null;
      if (!nextPayload?.open) return;
      const { mountMoleculeMiniPreview } = await import('../game/molecule-mini-preview.js');
      if (!mounted || token !== seq || !nextPayload?.open) return;
      cleanup = mountMoleculeMiniPreview(node, nextPayload);
    }

    render(payload);
    return {
      update(nextPayload: typeof moleculeWin) {
        render(nextPayload);
      },
      destroy() {
        mounted = false;
        cleanup?.();
      },
    };
  }

  async function mountGame() {
    const { createMergeGame } = await import('../game/create-merge-game.js');
    gameInstance = createMergeGame({
      host,
      mode,
      fxLayer,
      onHud: (nextHud: typeof hud) => {
        hud = nextHud;
      },
      onToast: (message: string, tone = 'neutral', placement: 'bottom' | 'center' = 'bottom') =>
        pushToast(message, tone, placement),
      onInfo: (message: string) => pushToast(message, 'neutral'),
      onGameOver: (nextOverlay: typeof overlay) => {
        overlay = { ...overlay, ...nextOverlay };
        if (nextOverlay.open) menuOpen = false;
      },
      onMolecule: (payload: any) => {
        showMoleculeWin(payload);
      },
    });
  }

  function restart() {
    overlay = { ...overlay, open: false };
    gameInstance?.restart?.();
  }

  function toggleMute() {
    const muted = gameInstance?.toggleMuted?.();
    hud = { ...hud, muted };
  }

  onMount(() => {
    document.body.classList.add('merge-game', `theme-${mode}`);
    mountGame();
    return () => {
      if (toastTimer) clearTimeout(toastTimer);
      if (moleculeTimer) clearTimeout(moleculeTimer);
      gameInstance?.destroy?.();
      document.body.classList.remove('merge-game', `theme-${mode}`);
    };
  });
</script>

<div class={`game-shell ${hud.themeId}`}>
  <div class="game-stage" bind:this={host}></div>
  <div class="float-layer" bind:this={fxLayer}></div>

  <div class="chrome">
    <div class="top-controls">
      <div class="run-pod">
        <div class="run-stat">
          <span>Score</span>
          <strong>{hud.score}</strong>
        </div>
        <span class="run-sep"></span>
        <div class="run-stat">
          <span>Lvl</span>
          <strong>{hud.level}</strong>
        </div>
      </div>
      <div class="top-actions">
        <button class="mini-btn" on:click={toggleMute}>
          {hud.muted
            ? t('common.muted', undefined, currentLocale)
            : t('common.sound', undefined, currentLocale)}
        </button>
        <button class="mini-btn" on:click={() => (menuOpen = !menuOpen)}>
          {menuOpen
            ? t('common.close', undefined, currentLocale)
            : t('common.menu', undefined, currentLocale)}
        </button>
      </div>
    </div>
  </div>

  {#if hintVisible && !menuOpen && !overlay.open}
    <div class="start-hint">{t('game.startHint', undefined, currentLocale)}</div>
  {/if}

  {#if toast}
    <div class={`toast ${toastTone} ${toastPlacement}`}>{toast}</div>
  {/if}

  {#if moleculeWin.open}
    <div class="molecule-win">
      <div class="molecule-preview" use:moleculePreview={moleculeWin}></div>
      <div class="molecule-copy">
        <span class="molecule-kicker">{moleculeWin.firstEver ? 'New Molecule' : 'Molecule Bonus'}</span>
        <strong>{moleculeWin.formula}</strong>
        <small>{moleculeWin.name}</small>
        <p>+{moleculeWin.points}</p>
      </div>
    </div>
  {/if}

  {#if menuOpen && !overlay.open}
    <div class="menu-overlay">
      <div class="menu-card compact">
        <span class="menu-kicker">{t('game.paused', undefined, currentLocale)}</span>
        <h2>{hud.title}</h2>
        <p>
          {t('game.menuSummary', { score: hud.score, level: hud.level, combo: hud.combo }, currentLocale)}
        </p>
        <label class="locale-picker" for="pause-locale">
          <span>{t('common.language', undefined, currentLocale)}</span>
          <select
            id="pause-locale"
            value={$locale}
            on:change={(event) => setLocale((event.currentTarget as HTMLSelectElement).value)}
          >
            {#each localeOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>
        <div class="menu-actions">
          <button class="primary" on:click={() => (menuOpen = false)}>
            {t('common.resume', undefined, currentLocale)}
          </button>
          <button class="ghost" on:click={restart}>{t('common.restart', undefined, currentLocale)}</button>
          <button class="ghost" on:click={toggleMute}>
            {hud.muted
              ? t('common.soundOff', undefined, currentLocale)
              : t('common.soundOn', undefined, currentLocale)}
          </button>
          <button class="ghost danger" on:click={onExit}>
            {t('common.exit', undefined, currentLocale)}
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if overlay.open}
    <div class="menu-overlay game-over">
      <div class="menu-card">
        <span class="menu-kicker">{t('game.ended', undefined, currentLocale)}</span>
        <h2>{overlay.title}</h2>
        <p>
          {t(
            'game.endedSummary',
            { score: overlay.score, level: overlay.level, summary: overlay.summary },
            currentLocale,
          )}
        </p>
        <div class="menu-actions">
          <button class="primary" on:click={restart}>
            {t('common.playAgain', undefined, currentLocale)}
          </button>
          <button class="ghost" on:click={onExit}>
            {t('common.returnHome', undefined, currentLocale)}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .game-shell {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    background:
      radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 24%),
      linear-gradient(180deg, #08121d 0%, #0c1621 100%);
  }

  .game-shell.numbers {
    background:
      radial-gradient(circle at top left, rgba(255, 222, 89, 0.12), transparent 24%),
      linear-gradient(180deg, #08121d 0%, #0d1626 100%);
  }

  .game-shell.atoms {
    background:
      radial-gradient(circle at top left, rgba(97, 255, 214, 0.12), transparent 24%),
      linear-gradient(180deg, #071513 0%, #0b1719 100%);
  }

  .game-stage,
  .float-layer,
  .chrome,
  .menu-overlay {
    position: absolute;
    inset: 0;
  }

  .float-layer,
  .chrome {
    pointer-events: none;
  }

  .game-stage {
    z-index: 1;
  }

  .float-layer {
    z-index: 3;
  }

  .chrome {
    z-index: 4;
    display: flex;
    flex-direction: column;
    padding:
      calc(8px + env(safe-area-inset-top))
      calc(10px + env(safe-area-inset-right))
      calc(8px + env(safe-area-inset-bottom))
      calc(10px + env(safe-area-inset-left));
  }

  .top-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .top-actions {
    display: flex;
    gap: 8px;
  }

  .run-pod {
    pointer-events: none;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(5, 17, 31, 0.5);
    backdrop-filter: blur(10px);
  }

  .run-stat {
    display: grid;
    gap: 1px;
    min-width: 62px;
  }

  .run-stat span {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(205, 224, 236, 0.68);
  }

  .run-stat strong {
    font-size: 1rem;
    line-height: 1;
    color: #f6fbff;
  }

  .run-sep {
    width: 1px;
    height: 26px;
    background: rgba(255, 255, 255, 0.12);
  }

  .mini-btn {
    pointer-events: auto;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    padding: 10px 14px;
    font: inherit;
    font-weight: 700;
    color: #edf7ff;
    background: rgba(5, 17, 31, 0.62);
    backdrop-filter: blur(10px);
    cursor: pointer;
  }

  .menu-overlay {
    z-index: 7;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(1, 7, 12, 0.56);
    backdrop-filter: blur(22px);
  }

  .menu-card {
    width: min(460px, 100%);
    padding: 24px;
    border-radius: 24px;
    background: linear-gradient(180deg, rgba(11, 24, 36, 0.95), rgba(7, 16, 24, 0.96));
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 28px 70px rgba(0, 0, 0, 0.34);
    backdrop-filter: blur(20px);
  }

  .menu-card h2 {
    margin: 10px 0 0;
    font-size: 1.7rem;
    color: #f8fcff;
  }

  .menu-card p {
    margin: 10px 0 0;
    line-height: 1.45;
    color: rgba(226, 236, 242, 0.84);
  }

  .menu-kicker {
    display: block;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: rgba(205, 224, 236, 0.66);
  }

  .menu-actions {
    margin-top: 16px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .primary,
  .ghost {
    pointer-events: auto;
    border: 0;
    border-radius: 999px;
    padding: 11px 14px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .primary {
    background: linear-gradient(135deg, #ffe082, #ff9b59);
    color: #1d1200;
  }

  .ghost {
    background: rgba(255, 255, 255, 0.08);
    color: #eef8ff;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .ghost.danger {
    color: #ffcfcb;
    border-color: rgba(255, 120, 110, 0.2);
  }

  .locale-picker {
    display: grid;
    gap: 8px;
    margin-top: 12px;
  }

  .locale-picker span {
    font-size: 0.82rem;
    color: rgba(210, 226, 237, 0.72);
  }

  .locale-picker select {
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    padding: 10px 12px;
    color: #f6fbff;
    background: rgba(255, 255, 255, 0.08);
  }

  .toast {
    position: absolute;
    left: 50%;
    z-index: 6;
    transform: translateX(-50%);
    max-width: min(300px, calc(100% - 26px));
    padding: 10px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(8, 18, 28, 0.86);
    color: #f8fbff;
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
    text-align: center;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    animation: toast-in 180ms ease;
  }

  .toast.bottom {
    bottom: calc(18px + env(safe-area-inset-bottom));
  }

  .toast.center {
    bottom: auto;
    top: 45%;
    transform: translate(-50%, -50%);
    font-size: 0.98rem;
    padding: 11px 16px;
    border-color: rgba(255, 203, 136, 0.34);
    box-shadow: 0 24px 54px rgba(0, 0, 0, 0.36);
  }

  .start-hint {
    position: absolute;
    left: 50%;
    top: calc(58px + env(safe-area-inset-top));
    z-index: 5;
    transform: translateX(-50%);
    max-width: min(320px, calc(100% - 24px));
    padding: 9px 12px;
    border-radius: 999px;
    background: rgba(5, 16, 28, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #edf6fb;
    font-size: 0.84rem;
    text-align: center;
    backdrop-filter: blur(16px);
    animation: toast-in 180ms ease;
  }

  .toast.accent {
    background: rgba(255, 171, 88, 0.88);
    color: #1f1100;
  }

  .toast.success {
    background: rgba(110, 255, 207, 0.9);
    color: #062018;
  }

  .molecule-win {
    position: absolute;
    left: 50%;
    top: calc(56px + env(safe-area-inset-top));
    z-index: 6;
    transform: translateX(-50%);
    width: min(320px, calc(100% - 20px));
    display: grid;
    grid-template-columns: 88px 1fr;
    gap: 10px;
    align-items: center;
    padding: 10px;
    border-radius: 16px;
    border: 1px solid rgba(145, 228, 255, 0.35);
    background:
      radial-gradient(circle at 18% 22%, rgba(94, 210, 255, 0.2), transparent 52%),
      linear-gradient(140deg, rgba(8, 24, 36, 0.9), rgba(8, 18, 28, 0.92));
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34);
    backdrop-filter: blur(12px);
    animation: toast-in 190ms ease;
  }

  .molecule-preview {
    height: 78px;
    border-radius: 12px;
    border: 1px solid rgba(145, 228, 255, 0.2);
    background: rgba(8, 18, 30, 0.68);
    overflow: hidden;
  }

  .molecule-copy {
    display: grid;
    gap: 2px;
  }

  .molecule-kicker {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(186, 228, 248, 0.78);
  }

  .molecule-copy strong {
    font-size: 1.18rem;
    line-height: 1.1;
    color: #e9fbff;
  }

  .molecule-copy p {
    margin: 0;
    color: rgba(255, 210, 130, 0.96);
    font-weight: 700;
  }

  .molecule-copy small {
    color: rgba(201, 229, 244, 0.84);
    font-size: 0.77rem;
  }

  .float-layer :global(.float-pop) {
    position: absolute;
    transform: translate(-50%, -50%);
    font-weight: 800;
    letter-spacing: 0.02em;
    text-shadow:
      0 10px 25px rgba(0, 0, 0, 0.46),
      0 0 14px rgba(255, 255, 255, 0.2);
    animation: float-pop 860ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
  }

  .float-layer :global(.float-pop.atom) {
    font-size: 1.02rem;
    text-shadow:
      0 10px 25px rgba(0, 0, 0, 0.46),
      0 0 16px rgba(152, 255, 224, 0.62);
  }

  .float-layer :global(.float-pop.number) {
    font-size: 1rem;
    text-shadow:
      0 10px 25px rgba(0, 0, 0, 0.46),
      0 0 14px rgba(255, 228, 145, 0.56);
  }

  .float-layer :global(.float-pop.jackpot) {
    font-size: 1.05rem;
  }

  @keyframes float-pop {
    from {
      opacity: 0;
      transform: translate(-50%, -18%) scale(0.86);
    }
    18% {
      opacity: 1;
      transform: translate(-50%, -42%) scale(1.08);
    }
    to {
      opacity: 0;
      transform: translate(-50%, -126%) scale(0.94);
    }
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translate(-50%, 10px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  @media (max-width: 760px) {
    .run-pod {
      gap: 8px;
      padding: 5px 8px;
      border-radius: 11px;
    }

    .run-stat {
      min-width: 50px;
    }

    .run-stat strong {
      font-size: 0.9rem;
    }

    .top-controls {
      gap: 8px;
    }

    .mini-btn {
      padding: 9px 12px;
    }
  }
</style>
