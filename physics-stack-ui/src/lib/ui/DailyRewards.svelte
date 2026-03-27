<script lang="ts">
  import { locale, t } from '../app-i18n';

  export let onBack: () => void = () => {};
  export let onPlay: () => void = () => {};

  const STORAGE_KEY = 'physics-stack-daily-v1';

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { day: 1, streak: 0, lastClaim: '' };
      return JSON.parse(raw);
    } catch {
      return { day: 1, streak: 0, lastClaim: '' };
    }
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  let state = loadState();
  let claimedToday = state.lastClaim === todayKey();

  function claimToday() {
    if (claimedToday) return;
    state = {
      day: state.day >= 7 ? 1 : state.day + 1,
      streak: state.streak + 1,
      lastClaim: todayKey(),
    };
    claimedToday = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  $: currentLocale = $locale;
  $: rewards = [
    t('daily.reward1', undefined, currentLocale),
    t('daily.reward2', undefined, currentLocale),
    t('daily.reward3', undefined, currentLocale),
    t('daily.reward4', undefined, currentLocale),
    t('daily.reward5', undefined, currentLocale),
    t('daily.reward6', undefined, currentLocale),
    t('daily.reward7', undefined, currentLocale),
  ];
</script>

<section class="daily-shell">
  <div class="daily-head">
    <button class="back-btn" on:click={onBack}>{t('common.back', undefined, currentLocale)}</button>
    <div>
      <p class="eyebrow">{t('daily.eyebrow', undefined, currentLocale)}</p>
      <h1>{t('daily.title', undefined, currentLocale)}</h1>
      <p>{t('daily.subtitle', undefined, currentLocale)}</p>
    </div>
    <button class="play-btn" on:click={onPlay}>{t('common.playNow', undefined, currentLocale)}</button>
  </div>

  <div class="streak-card">
    <span>{t('daily.currentStreak', undefined, currentLocale)}</span>
    <strong>{t('daily.days', { count: state.streak }, currentLocale)}</strong>
    <p>
      {claimedToday
        ? t('daily.claimedToday', undefined, currentLocale)
        : t('daily.claimPrompt', undefined, currentLocale)}
    </p>
    <button class="claim-btn" disabled={claimedToday} on:click={claimToday}>
      {claimedToday
        ? t('daily.claimedButton', undefined, currentLocale)
        : t('daily.claimToday', { day: state.day }, currentLocale)}
    </button>
  </div>

  <div class="reward-grid">
    {#each rewards as reward, index}
      <article class={`reward-card ${index + 1 === state.day && !claimedToday ? 'featured' : ''}`}>
        <span>{t('common.day', { day: index + 1 }, currentLocale)}</span>
        <strong>{reward}</strong>
        <p>
          {index + 1 < state.day
            ? t('common.claimed', undefined, currentLocale)
            : t('daily.availableLoop', undefined, currentLocale)}
        </p>
      </article>
    {/each}
  </div>
</section>

<style>
  .daily-shell {
    min-height: 100vh;
    padding:
      calc(18px + env(safe-area-inset-top))
      calc(18px + env(safe-area-inset-right))
      calc(18px + env(safe-area-inset-bottom))
      calc(18px + env(safe-area-inset-left));
    background:
      radial-gradient(circle at top left, rgba(255, 196, 104, 0.18), transparent 24%),
      linear-gradient(180deg, #161021 0%, #0d1220 100%);
  }

  .daily-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    margin-bottom: 22px;
  }

  .back-btn,
  .play-btn,
  .claim-btn {
    border: 0;
    border-radius: 999px;
    padding: 12px 16px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .back-btn {
    color: #f0ecff;
    background: rgba(255, 255, 255, 0.08);
  }

  .play-btn,
  .claim-btn {
    color: #1c1100;
    background: linear-gradient(135deg, #ffe082, #ff9f68);
  }

  .claim-btn:disabled {
    cursor: default;
    opacity: 0.7;
  }

  .eyebrow {
    margin: 0 0 8px;
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #ffd17d;
  }

  h1 {
    margin: 0;
    color: #fcf8ff;
  }

  p,
  span {
    color: rgba(231, 225, 242, 0.8);
  }

  .streak-card {
    padding: 24px;
    border-radius: 24px;
    background: rgba(17, 18, 35, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 18px;
  }

  .streak-card strong {
    display: block;
    margin-top: 6px;
    font-size: 2rem;
    color: #fff7e5;
  }

  .reward-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
  }

  .reward-card {
    padding: 18px;
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(15, 18, 32, 0.92);
  }

  .reward-card.featured {
    background:
      radial-gradient(circle at top right, rgba(255, 210, 122, 0.18), transparent 34%),
      rgba(15, 18, 32, 0.94);
    box-shadow: 0 18px 36px rgba(255, 170, 82, 0.15);
  }

  .reward-card strong {
    display: block;
    margin: 8px 0;
    color: #fff9ed;
  }

  @media (max-width: 760px) {
    .daily-shell {
      padding:
        calc(12px + env(safe-area-inset-top))
        calc(12px + env(safe-area-inset-right))
        calc(14px + env(safe-area-inset-bottom))
        calc(12px + env(safe-area-inset-left));
    }

    .daily-head {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
