<script lang="ts">
  import { onMount } from 'svelte';
  import { locale, localeOptions, setLocale, t } from '../app-i18n';
  import type { GameMode } from '../types';

  type Props = {
    mode: GameMode;
    worldId?: string;
    onExit?: () => void;
    onOpenCollection?: () => void;
    onOpenDaily?: () => void;
    onOpenShop?: () => void;
    canOpenShop?: boolean;
    onWorldProgress?: () => void;
  };

  let {
    mode,
    worldId = '',
    onExit = () => {},
    onOpenCollection = () => {},
    onOpenDaily = () => {},
    onOpenShop = () => {},
    canOpenShop = false,
    onWorldProgress = () => {},
  }: Props = $props();

  let host: HTMLDivElement;
  let fxLayer: HTMLDivElement;
  let gameInstance: any;
  let menuOpen = $state(false);
  let toast = $state('');
  let toastTone = $state('neutral');
  let moleculeWin = $state({
    open: false,
    formula: '',
    name: '',
    points: 0,
  });
  let infoPanel = $state({
    open: false,
    title: '',
    subtitle: '',
    entries: [] as Array<{
      id: string;
      formula: string;
      name: string;
      combo: string;
      points: number;
    }>,
  });
  let overlay = $state({
    open: false,
    score: 0,
    level: 1,
    title: '',
    summary: '',
  });
  let hud = $state({
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
  });
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let moleculeTimer: ReturnType<typeof setTimeout> | null = null;
  let infoTimer: ReturnType<typeof setTimeout> | null = null;

  const currentLocale = $derived($locale);
  const worldClass = $derived(mode === 'atoms' && worldId ? `world-${worldId}` : '');

  function pushToast(message: string, tone = 'neutral') {
    if (!message) return;
    toast = message;
    toastTone = tone;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast = '';
    }, 1550);
  }

  function showMoleculeWin(payload: any) {
    const recipe = payload?.recipe ?? {};
    moleculeWin = {
      open: true,
      formula: payload?.formula ?? recipe?.formula ?? '',
      name: recipe?.name ?? '',
      points: Number(payload?.points ?? 0),
    };
    if (moleculeTimer) clearTimeout(moleculeTimer);
    moleculeTimer = setTimeout(() => {
      moleculeWin = { ...moleculeWin, open: false };
    }, 2600);
  }

  function showInfo(payload: any) {
    if (!payload || payload.kind !== 'molecule-guide') return;
    infoPanel = {
      open: true,
      title: payload?.title ?? '',
      subtitle: payload?.subtitle ?? '',
      entries: Array.isArray(payload?.entries) ? payload.entries : [],
    };
    if (infoTimer) clearTimeout(infoTimer);
    const duration = Math.max(1800, Number(payload?.durationMs ?? 5200));
    infoTimer = setTimeout(() => {
      infoPanel = { ...infoPanel, open: false };
    }, duration);
  }

  async function mountGame() {
    const { createMergeGame } = await import('../game/create-merge-game.js');
    gameInstance = createMergeGame({
      host,
      mode,
      worldId,
      fxLayer,
      onHud: (nextHud: typeof hud) => {
        hud = nextHud;
      },
      onToast: (message: string, tone = 'neutral') => pushToast(message, tone),
      onInfo: (payload: any) => showInfo(payload),
      onGameOver: (nextOverlay: typeof overlay) => {
        overlay = { ...overlay, ...nextOverlay };
        if (nextOverlay.open) menuOpen = false;
      },
      onMolecule: (payload: any) => {
        showMoleculeWin(payload);
      },
      onWorldProgress,
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

  function openCollection() {
    gameInstance?.commitProgress?.(true);
    menuOpen = false;
    onOpenCollection();
  }

  function openDaily() {
    gameInstance?.commitProgress?.(true);
    menuOpen = false;
    onOpenDaily();
  }

  function openShop() {
    gameInstance?.commitProgress?.(true);
    menuOpen = false;
    onOpenShop();
  }

  function exitRun() {
    gameInstance?.commitProgress?.(true);
    menuOpen = false;
    onExit();
  }

  onMount(() => {
    document.body.classList.add('merge-game', `theme-${mode}`);
    mountGame();
    return () => {
      if (toastTimer) clearTimeout(toastTimer);
      if (moleculeTimer) clearTimeout(moleculeTimer);
      if (infoTimer) clearTimeout(infoTimer);
      gameInstance?.destroy?.();
      document.body.classList.remove('merge-game', `theme-${mode}`);
    };
  });
</script>

<div class={`game-shell ${hud.themeId} ${mode} ${worldClass}`}>
  <div class="game-stage" bind:this={host}></div>
  <div class="float-layer" bind:this={fxLayer}></div>

  <div class="chrome">
    <div class="top-controls">
      <div class="run-pod">
        <div class="run-stat">
          <span>{t('common.score', undefined, currentLocale)}</span>
          <strong>{hud.score}</strong>
        </div>
        <span class="run-sep"></span>
        <div class="run-stat">
          <span>{t('common.level', undefined, currentLocale)}</span>
          <strong>{hud.level}</strong>
        </div>
      </div>
      <div class="top-actions">
        <button class="mini-btn" onclick={toggleMute}>
          {hud.muted
            ? t('common.muted', undefined, currentLocale)
            : t('common.sound', undefined, currentLocale)}
        </button>
        <button class="mini-btn" onclick={() => (menuOpen = !menuOpen)}>
          {menuOpen
            ? t('common.close', undefined, currentLocale)
            : t('common.menu', undefined, currentLocale)}
        </button>
      </div>
    </div>
  </div>

  {#if toast}
    <div class={`toast ${toastTone}`}>{toast}</div>
  {/if}

  {#if moleculeWin.open}
    <div class="molecule-win">
      <strong class="molecule-formula">{moleculeWin.formula}</strong>
      {#if moleculeWin.name}
        <p class="molecule-name">{moleculeWin.name}</p>
      {/if}
      <p class="molecule-points">+{moleculeWin.points}</p>
    </div>
  {/if}

  {#if infoPanel.open && infoPanel.entries.length > 0}
    <div class="chem-guide">
      {#if infoPanel.title}
        <strong class="chem-guide-title">{infoPanel.title}</strong>
      {/if}
      {#if infoPanel.subtitle}
        <p class="chem-guide-subtitle">{infoPanel.subtitle}</p>
      {/if}
      <div class="chem-guide-list">
        {#each infoPanel.entries as entry}
          <div class="chem-guide-row">
            <strong>{entry.formula}</strong>
            <span>{entry.combo}</span>
          </div>
        {/each}
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
            onchange={(event) => setLocale((event.currentTarget as HTMLSelectElement).value)}
          >
            {#each localeOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>
        <div class="menu-actions">
          <button class="primary" onclick={() => (menuOpen = false)}>
            {t('common.resume', undefined, currentLocale)}
          </button>
          <button class="ghost" onclick={restart}>{t('common.restart', undefined, currentLocale)}</button>
          <button class="ghost" onclick={toggleMute}>
            {hud.muted
              ? t('common.soundOff', undefined, currentLocale)
              : t('common.soundOn', undefined, currentLocale)}
          </button>
          <button class="ghost danger" onclick={exitRun}>
            {t('common.exit', undefined, currentLocale)}
          </button>
        </div>
        <div class="menu-nav-links">
          <button class="ghost slim" onclick={openCollection}>
            {t('home.collection', undefined, currentLocale)}
          </button>
          <button class="ghost slim" onclick={openDaily}>
            {t('home.daily', undefined, currentLocale)}
          </button>
          {#if canOpenShop}
            <button class="ghost slim" onclick={openShop}>
              {t('home.shop', undefined, currentLocale)}
            </button>
          {/if}
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
          <button class="primary" onclick={restart}>
            {t('common.playAgain', undefined, currentLocale)}
          </button>
          <button class="ghost" onclick={exitRun}>
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
    --bg-image: url('/background/micro_atoms_1.jpg');
    --bg-image-opacity: 0.48;
    --bg-tint-a: rgba(8, 18, 29, 0.74);
    --bg-tint-b: rgba(6, 14, 24, 0.86);
    background: #08131f;
  }

  .game-shell::before,
  .game-shell::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .game-shell::before {
    z-index: 0;
    background-image: var(--bg-image);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    opacity: var(--bg-image-opacity);
    filter: blur(2.6px) saturate(1.04);
    transform: none;
  }

  .game-shell::after {
    z-index: 0;
    background:
      radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 38%, rgba(0, 0, 0, 0.58) 100%),
      radial-gradient(circle at 18% 8%, rgba(255, 255, 255, 0.08), transparent 26%),
      linear-gradient(180deg, var(--bg-tint-a) 0%, var(--bg-tint-b) 100%);
  }

  .game-shell.numbers {
    --bg-image: url('/background/Lucid_Origin_soft_teal_blue_gradient_background_subtle_lightin_1.jpg');
    --bg-image-opacity: 0.54;
    --bg-tint-a: rgba(22, 22, 30, 0.76);
    --bg-tint-b: rgba(18, 20, 30, 0.88);
  }

  .game-shell.atoms {
    --bg-image: url('/background/micro_atoms_2.jpg');
    --bg-image-opacity: 0.5;
    --bg-tint-a: rgba(9, 30, 27, 0.74);
    --bg-tint-b: rgba(8, 20, 19, 0.88);
  }

  .game-shell.world-basics {
    --bg-image: url('/background/micro_atoms_1.jpg');
    --bg-image-opacity: 0.5;
  }

  .game-shell.world-reactive {
    --bg-image: url('/background/micro_atoms_3.jpg');
    --bg-image-opacity: 0.48;
    --bg-tint-a: rgba(44, 22, 12, 0.74);
    --bg-tint-b: rgba(33, 16, 10, 0.9);
  }

  .game-shell.world-metals {
    --bg-image: url('/background/micro_atoms_4.jpg');
    --bg-image-opacity: 0.5;
    --bg-tint-a: rgba(22, 32, 42, 0.76);
    --bg-tint-b: rgba(14, 24, 34, 0.9);
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
    align-items: center;
    padding:
      calc(8px + env(safe-area-inset-top))
      calc(10px + env(safe-area-inset-right))
      calc(8px + env(safe-area-inset-bottom))
      calc(10px + env(safe-area-inset-left));
  }

  .top-controls {
    display: flex;
    width: min(640px, 100%);
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

  .menu-nav-links {
    margin-top: 10px;
    display: flex;
    gap: 8px;
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

  .ghost.slim {
    padding: 9px 12px;
    font-size: 0.86rem;
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
    top: 50%;
    transform: translate(-50%, -50%);
    max-width: min(340px, calc(100% - 28px));
    padding: 11px 16px;
    border-radius: 16px;
    border: 1px solid rgba(196, 230, 255, 0.26);
    background:
      radial-gradient(circle at 24% 16%, rgba(142, 215, 255, 0.17), transparent 58%),
      linear-gradient(145deg, rgba(7, 17, 30, 0.64), rgba(10, 20, 34, 0.56));
    color: #f8fbff;
    box-shadow: 0 24px 52px rgba(0, 0, 0, 0.34);
    backdrop-filter: blur(12px) saturate(126%);
    text-align: center;
    font-size: 0.96rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    animation: toast-in 180ms ease;
  }

  .toast.accent {
    border-color: rgba(255, 199, 133, 0.34);
    background:
      radial-gradient(circle at 24% 14%, rgba(255, 224, 168, 0.2), transparent 60%),
      linear-gradient(145deg, rgba(43, 23, 6, 0.64), rgba(34, 18, 5, 0.58));
    color: #ffe0b0;
  }

  .toast.success {
    border-color: rgba(148, 255, 221, 0.3);
    background:
      radial-gradient(circle at 26% 14%, rgba(173, 255, 228, 0.22), transparent 60%),
      linear-gradient(145deg, rgba(5, 36, 28, 0.62), rgba(6, 28, 22, 0.56));
    color: #caffee;
  }

  .molecule-win {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 6;
    transform: translate(-50%, -50%);
    width: auto;
    max-width: calc(100% - 20px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 0;
    border: none !important;
    background: none !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    text-align: center;
    pointer-events: none;
    animation: molecule-win-in 180ms ease;
  }

  .chem-guide {
    position: absolute;
    left: 50%;
    top: 28%;
    z-index: 6;
    transform: translate(-50%, -50%);
    width: min(420px, calc(100% - 24px));
    padding: 12px 14px;
    border-radius: 16px;
    border: 1px solid rgba(159, 228, 255, 0.24);
    background:
      radial-gradient(circle at 18% 12%, rgba(111, 220, 255, 0.14), transparent 60%),
      linear-gradient(150deg, rgba(4, 16, 31, 0.64), rgba(7, 20, 35, 0.52));
    backdrop-filter: blur(8px);
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.26);
    pointer-events: none;
    animation: molecule-win-in 180ms ease;
  }

  .chem-guide-title {
    display: block;
    text-align: center;
    color: #ebf8ff;
    font-size: 0.9rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .chem-guide-subtitle {
    margin: 4px 0 8px;
    text-align: center;
    color: rgba(203, 232, 248, 0.86);
    font-size: 0.78rem;
  }

  .chem-guide-list {
    display: grid;
    gap: 5px;
  }

  .chem-guide-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 10px;
    border: 1px solid rgba(165, 219, 255, 0.16);
    background: rgba(10, 26, 39, 0.38);
  }

  .chem-guide-row strong {
    color: #f6fbff;
    font-size: 0.95rem;
    letter-spacing: 0.03em;
  }

  .chem-guide-row span {
    color: rgba(202, 234, 250, 0.92);
    font-size: 0.78rem;
    letter-spacing: 0.03em;
  }

  .molecule-formula {
    font-size: 2rem;
    line-height: 1;
    color: #eaf6ff;
    text-shadow:
      0 12px 30px rgba(4, 16, 26, 0.66),
      0 0 20px rgba(142, 221, 255, 0.42);
  }

  .molecule-name {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: rgba(220, 241, 255, 0.9);
    text-shadow: 0 6px 18px rgba(5, 14, 20, 0.62);
  }

  .molecule-points {
    margin: 0;
    font-size: 1.2rem;
    color: rgba(255, 210, 130, 0.96);
    font-weight: 800;
    text-shadow:
      0 8px 24px rgba(29, 16, 4, 0.64),
      0 0 12px rgba(255, 188, 102, 0.44);
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

  @keyframes molecule-win-in {
    from {
      opacity: 0;
      transform: translate(-50%, -47%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
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
      width: 100%;
    }

    .mini-btn {
      padding: 9px 12px;
    }
  }
</style>
