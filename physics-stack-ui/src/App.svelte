<script lang="ts">
  import GameCanvas from './lib/ui/GameCanvas.svelte';
  import CollectionAlbum from './lib/ui/CollectionAlbum.svelte';
  import DailyRewards from './lib/ui/DailyRewards.svelte';
  import Shop from './lib/ui/Shop.svelte';
  import { RELEASE_FLAGS } from './lib/release-flags.js';
  import { locale, localeOptions, setLocale, t } from './lib/app-i18n';
  import type { GameMode } from './lib/types';

  type Screen = 'home' | 'game' | 'collection' | 'daily' | 'shop';

  const allModes: GameMode[] = ['atoms', 'numbers', 'fruit'];
  const releaseModes: GameMode[] = RELEASE_FLAGS.atomsFocus ? ['atoms'] : allModes;
  const modeKeys: GameMode[] = RELEASE_FLAGS.showExperimentalModes ? allModes : releaseModes;

  let screen: Screen = 'home';
  let activeMode: GameMode = modeKeys[0] ?? 'atoms';

  function openMode(mode: GameMode) {
    activeMode = mode;
    screen = 'game';
  }

  function goHome() {
    screen = 'home';
  }

  $: currentLocale = $locale;
  $: modeCards = modeKeys.map((mode) => ({
    mode,
    title: t(`mode.${mode}.title`, undefined, currentLocale),
    tag: t(`mode.${mode}.tag`, undefined, currentLocale),
  }));
  $: singleModeFlow = modeCards.length <= 1;

  $: activeModeTitle = t(`mode.${activeMode}.title`, undefined, currentLocale);
</script>

{#if screen === 'game'}
  <GameCanvas mode={activeMode} onExit={goHome} />
{:else if screen === 'collection'}
  <CollectionAlbum onBack={goHome} onPlayAtoms={() => openMode('atoms')} />
{:else if screen === 'daily'}
  <DailyRewards onBack={goHome} onPlay={() => openMode(activeMode)} />
{:else if screen === 'shop' && RELEASE_FLAGS.enableShopEntry}
  <Shop onBack={goHome} onPlay={() => openMode(activeMode)} />
{:else}
  <main class="menu-shell">
    <section class="entry-card">
      <header class="entry-top">
        <div class="entry-title">
          <h1>{t('home.title', undefined, currentLocale)}</h1>
          <span class="entry-badge">{activeModeTitle}</span>
        </div>
        <label class="locale-picker" for="home-locale">
          <span>{t('common.language', undefined, currentLocale)}</span>
          <select
            id="home-locale"
            value={$locale}
            on:change={(event) => setLocale((event.currentTarget as HTMLSelectElement).value)}
          >
            {#each localeOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>
      </header>

      <div class="hero-orb" aria-hidden="true">
        <span class="ring"></span>
        <span class="core"></span>
      </div>

      {#if !singleModeFlow}
        <section class="mode-grid" aria-label={t('home.modesTitle', undefined, currentLocale)}>
          {#each modeCards as card}
            <button
              class={`mode-card ${card.mode} ${activeMode === card.mode ? 'selected' : ''}`}
              on:click={() => (activeMode = card.mode)}
            >
              <span class="mode-tag">{card.tag}</span>
              <strong>{card.title}</strong>
            </button>
          {/each}
        </section>
      {/if}

      <button class="play-btn" on:click={() => openMode(activeMode)}>
        {t('common.playNow', undefined, currentLocale)}
      </button>

      <div class="quick-links">
        <button class="ghost-btn" on:click={() => (screen = 'collection')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7.3A2.3 2.3 0 0 1 6.3 5h4.2A2.3 2.3 0 0 1 12.8 7.3v9.4a2.3 2.3 0 0 1-2.3 2.3H6.3A2.3 2.3 0 0 1 4 16.7zM14.2 7.3A2.3 2.3 0 0 1 16.5 5h1.2A2.3 2.3 0 0 1 20 7.3v9.4a2.3 2.3 0 0 1-2.3 2.3h-1.2a2.3 2.3 0 0 1-2.3-2.3z" />
          </svg>
          {t('home.collection', undefined, currentLocale)}
        </button>
        <button class="ghost-btn" on:click={() => (screen = 'daily')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 4v2M17 4v2M5.5 7h13A1.5 1.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-9A1.5 1.5 0 0 1 5.5 7M4 10h16" />
          </svg>
          {t('home.daily', undefined, currentLocale)}
        </button>
        {#if RELEASE_FLAGS.enableShopEntry}
          <button class="ghost-btn" on:click={() => (screen = 'shop')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 8h12l-1 11H7zm2-2a4 4 0 0 1 8 0" />
            </svg>
            {t('home.shop', undefined, currentLocale)}
          </button>
        {/if}
      </div>
    </section>
  </main>
{/if}

<style>
  .menu-shell {
    font-family: 'Sora', 'Avenir Next', 'Trebuchet MS', sans-serif;
    min-height: 100vh;
    padding:
      calc(14px + env(safe-area-inset-top))
      calc(14px + env(safe-area-inset-right))
      calc(16px + env(safe-area-inset-bottom))
      calc(14px + env(safe-area-inset-left));
    display: grid;
    place-items: center;
    background:
      radial-gradient(120% 80% at 16% 0%, rgba(255, 130, 86, 0.24), transparent 55%),
      radial-gradient(120% 70% at 84% 100%, rgba(47, 195, 255, 0.22), transparent 60%),
      linear-gradient(180deg, #050b15 0%, #071524 100%);
  }

  .entry-card {
    width: min(620px, 100%);
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background:
      radial-gradient(120% 90% at 16% 12%, rgba(70, 255, 205, 0.16), transparent 54%),
      radial-gradient(120% 90% at 84% 88%, rgba(125, 140, 255, 0.18), transparent 56%),
      linear-gradient(180deg, rgba(15, 31, 53, 0.9), rgba(7, 17, 33, 0.95));
    box-shadow:
      0 34px 70px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(12px);
    padding: 18px;
    display: grid;
    gap: 16px;
  }

  .entry-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.5rem, 4vw, 2rem);
    line-height: 1;
    color: #f8fcff;
    letter-spacing: 0.01em;
  }

  .entry-title {
    display: grid;
    gap: 8px;
  }

  .entry-badge {
    display: inline-flex;
    width: fit-content;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 0.72rem;
    font-weight: 700;
    color: rgba(227, 246, 255, 0.9);
    background: rgba(10, 28, 45, 0.68);
    border: 1px solid rgba(255, 255, 255, 0.14);
  }

  .locale-picker {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ecf6ff;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .locale-picker select {
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    padding: 8px 12px;
    color: #f8fbff;
    background: rgba(9, 21, 36, 0.76);
  }

  .hero-orb {
    position: relative;
    height: 96px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: linear-gradient(135deg, rgba(6, 16, 30, 0.84), rgba(14, 38, 50, 0.76));
    overflow: hidden;
  }

  .hero-orb .ring,
  .hero-orb .core {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-radius: 999px;
    pointer-events: none;
  }

  .hero-orb .core {
    width: 58px;
    height: 58px;
    background: radial-gradient(circle at 32% 26%, #c6f7ff 0, #42b8ff 42%, #4b66f8 100%);
    box-shadow: 0 10px 24px rgba(42, 128, 255, 0.45);
    animation: pulse-core 2.8s ease-in-out infinite;
  }

  .hero-orb .ring {
    width: 122px;
    height: 122px;
    border: 2px solid rgba(176, 232, 255, 0.32);
    animation: spin-ring 11s linear infinite;
  }

  .mode-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
  }

  .mode-card {
    cursor: pointer;
    padding: 14px;
    text-align: left;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease;
  }

  .mode-card.selected {
    transform: translateY(-3px);
    border-color: rgba(255, 255, 255, 0.35);
    box-shadow: 0 14px 26px rgba(0, 0, 0, 0.28);
  }

  .mode-card.fruit {
    background:
      radial-gradient(circle at top right, rgba(255, 162, 103, 0.34), transparent 42%),
      rgba(19, 24, 36, 0.92);
  }

  .mode-card.numbers {
    background:
      radial-gradient(circle at top right, rgba(250, 220, 110, 0.32), transparent 42%),
      rgba(15, 21, 33, 0.92);
  }

  .mode-card.atoms {
    background:
      radial-gradient(circle at top right, rgba(108, 255, 220, 0.3), transparent 42%),
      rgba(12, 23, 25, 0.92);
  }

  .mode-tag {
    display: block;
    margin: 0;
    font-size: 0.68rem;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: rgba(195, 225, 246, 0.75);
  }

  .mode-card strong {
    display: block;
    margin-top: 6px;
    color: #f8fcff;
    font-size: 1.06rem;
  }

  .play-btn {
    cursor: pointer;
    border: 0;
    border-radius: 16px;
    padding: 14px 16px;
    font: inherit;
    font-weight: 800;
    font-size: 1.03rem;
    letter-spacing: 0.01em;
    color: #101a28;
    background: linear-gradient(135deg, #ffe480, #ff9f67);
    box-shadow: 0 18px 32px rgba(255, 175, 95, 0.32);
  }

  .quick-links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .ghost-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    padding: 10px 12px;
    font: inherit;
    font-weight: 700;
    color: #eff8ff;
    background: rgba(6, 17, 31, 0.56);
  }

  .ghost-btn svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: rgba(194, 225, 245, 0.92);
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  @keyframes spin-ring {
    from {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }

  @keyframes pulse-core {
    0%,
    100% {
      transform: translate(-50%, -50%) scale(0.96);
    }
    50% {
      transform: translate(-50%, -50%) scale(1.03);
    }
  }

  @media (max-width: 760px) {
    .entry-top {
      align-items: center;
      flex-wrap: wrap;
    }

    .quick-links {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .menu-shell {
      padding:
        calc(10px + env(safe-area-inset-top))
        calc(10px + env(safe-area-inset-right))
        calc(12px + env(safe-area-inset-bottom))
        calc(10px + env(safe-area-inset-left));
    }

    .entry-card {
      border-radius: 22px;
      padding: 13px;
    }
  }
</style>
