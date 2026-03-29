<script lang="ts">
  import { locale, t } from '../app-i18n';
  import {
    ATOM_SKINS,
    getEnabledAtomSkins,
    getAtomSkinStats,
    getAtomSkinUnlockState,
    getEquippedAtomSkinId,
    setEquippedAtomSkinId,
    unlockAtomSkinByAd,
  } from '../game/atom-skins.js';
  import { RELEASE_FLAGS } from '../release-flags.js';
  import { mountAtomSkinPreview } from '../game/atom-skin-preview.js';

  type Props = {
    onBack?: () => void;
    onPlay?: () => void;
  };

  let { onBack = () => {}, onPlay = () => {} }: Props = $props();

  let stats = $state(getAtomSkinStats());
  let equippedId = $state(getEquippedAtomSkinId());
  const currentLocale = $derived($locale);

  function refresh() {
    stats = getAtomSkinStats();
    equippedId = getEquippedAtomSkinId();
  }

  function tryUnlockByAd(id: string) {
    unlockAtomSkinByAd(id);
    refresh();
  }

  function equip(id: string) {
    setEquippedAtomSkinId(id);
    refresh();
  }

  function requirementLabel(skin: (typeof ATOM_SKINS)[number], unlockState: any) {
    const unlock = skin.unlock ?? { type: 'free' };
    if (unlock.type === 'free') return t('shop.requirementFree', undefined, currentLocale);
    if (unlock.type === 'ad_optional') return t('shop.requirementAd', undefined, currentLocale);
    if (unlock.type === 'discover_elements') {
      return t(
        'shop.requirementDiscoverElements',
        { progress: unlockState.progress ?? `0/${unlock.value}` },
        currentLocale,
      );
    }
    if (unlock.type === 'discover_molecules') {
      return t(
        'shop.requirementDiscoverMolecules',
        { progress: unlockState.progress ?? `0/${unlock.value}` },
        currentLocale,
      );
    }
    if (unlock.type === 'play_minutes') {
      return t(
        'shop.requirementPlayTime',
        { progress: unlockState.progress ?? `0/${unlock.value}m` },
        currentLocale,
      );
    }
    return t('shop.requirementLocked', undefined, currentLocale);
  }

  function skinHex(accent: number) {
    return `#${Math.max(0, accent).toString(16).padStart(6, '0')}`;
  }

  function skinPreview(node: HTMLDivElement, skinId: string) {
    let cleanup = mountAtomSkinPreview(node, skinId);
    return {
      update(nextId: string) {
        if (nextId === skinId) return;
        cleanup?.();
        skinId = nextId;
        cleanup = mountAtomSkinPreview(node, skinId);
      },
      destroy() {
        cleanup?.();
      },
    };
  }

  const cards = $derived(
    getEnabledAtomSkins().map((skin) => {
      const unlockState = getAtomSkinUnlockState(skin, stats);
      return {
        ...skin,
        unlockState,
        equipped: skin.id === equippedId,
        unlocked: !!unlockState.unlocked,
      };
    }),
  );
  const basicCards = $derived(cards.filter((c) => c.tier === 'basic'));
  const premiumCards = $derived(cards.filter((c) => c.tier === 'premium'));
  const rareCards = $derived(cards.filter((c) => c.tier === 'rare'));
</script>

<section class="shop-shell">
  <div class="shop-head">
    <button class="back-btn" onclick={onBack}>{t('common.back', undefined, currentLocale)}</button>
    <div>
      <p class="eyebrow">{t('shop.labEyebrow', undefined, currentLocale)}</p>
      <h1>{t('shop.labTitle', undefined, currentLocale)}</h1>
      <p>
        {#if RELEASE_FLAGS.enableSkinsLab}
          {t('shop.labNoPaywall', undefined, currentLocale)}
        {:else}
          {t('shop.labCurated', undefined, currentLocale)}
        {/if}
      </p>
    </div>
    <button class="play-btn" onclick={onPlay}>{t('common.playNow', undefined, currentLocale)}</button>
  </div>

  <div class="stats-row">
    <span>{t('shop.statElements', { count: stats.discoveredElements }, currentLocale)}</span>
    <span>{t('shop.statMolecules', { count: stats.discoveredMolecules }, currentLocale)}</span>
    <span>{t('shop.statPlay', { count: stats.playMinutes }, currentLocale)}</span>
  </div>

  <div class="section-title">{t('shop.sectionBasic', undefined, currentLocale)}</div>
  <div class="shop-grid">
    {#each basicCards as card}
      <article class={`shop-card basic ${card.equipped ? 'equipped' : ''}`}>
        <span class="accent" style={`--skin:${skinHex(card.accent)}`}></span>
        <div class="preview-host" use:skinPreview={card.id}></div>
        <h2>{card.name}</h2>
        <p>{card.flavor}</p>
        <div class="card-foot">
          <small>{requirementLabel(card, card.unlockState)}</small>
          {#if card.equipped}
            <button class="equipped-btn" disabled>{t('shop.actionEquipped', undefined, currentLocale)}</button>
          {:else if card.unlocked}
            <button onclick={() => equip(card.id)}>{t('shop.actionEquip', undefined, currentLocale)}</button>
          {:else}
            <button class="locked-btn" disabled>{t('shop.actionLocked', undefined, currentLocale)}</button>
          {/if}
        </div>
      </article>
    {/each}
  </div>

  {#if RELEASE_FLAGS.enableSkinsLab}
    <div class="section-title">{t('shop.sectionPremium', undefined, currentLocale)}</div>
    <div class="shop-grid">
      {#each premiumCards as card}
        <article class={`shop-card premium ${card.equipped ? 'equipped' : ''}`}>
          <span class="accent" style={`--skin:${skinHex(card.accent)}`}></span>
          <div class="preview-host" use:skinPreview={card.id}></div>
          <h2>{card.name}</h2>
          <p>{card.flavor}</p>
          <div class="card-foot">
            <small>{requirementLabel(card, card.unlockState)}</small>
            {#if card.equipped}
              <button class="equipped-btn" disabled>{t('shop.actionEquipped', undefined, currentLocale)}</button>
            {:else if card.unlocked}
              <button onclick={() => equip(card.id)}>{t('shop.actionEquip', undefined, currentLocale)}</button>
            {:else}
              <button onclick={() => tryUnlockByAd(card.id)}>
                {t('shop.actionHelpAd', undefined, currentLocale)}
              </button>
            {/if}
          </div>
        </article>
      {/each}
    </div>

    <div class="section-title">{t('shop.sectionRare', undefined, currentLocale)}</div>
    <div class="shop-grid">
      {#each rareCards as card}
        <article class={`shop-card rare ${card.equipped ? 'equipped' : ''}`}>
          <span class="accent" style={`--skin:${skinHex(card.accent)}`}></span>
          <div class="preview-host" use:skinPreview={card.id}></div>
          <h2>{card.name}</h2>
          <p>{card.flavor}</p>
          <div class="card-foot">
            <small>{requirementLabel(card, card.unlockState)}</small>
            {#if card.equipped}
              <button class="equipped-btn" disabled>{t('shop.actionEquipped', undefined, currentLocale)}</button>
            {:else if card.unlocked}
              <button onclick={() => equip(card.id)}>{t('shop.actionEquip', undefined, currentLocale)}</button>
            {:else}
              <button class="locked-btn" disabled>{t('shop.actionLocked', undefined, currentLocale)}</button>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .shop-shell {
    min-height: 100vh;
    padding:
      calc(18px + env(safe-area-inset-top))
      calc(18px + env(safe-area-inset-right))
      calc(18px + env(safe-area-inset-bottom))
      calc(18px + env(safe-area-inset-left));
    background:
      radial-gradient(circle at top left, rgba(111, 183, 255, 0.16), transparent 24%),
      linear-gradient(180deg, #08131f 0%, #09141a 100%);
  }

  .shop-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    margin-bottom: 12px;
  }

  .eyebrow {
    margin: 0 0 8px;
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #9fd5ff;
  }

  h1 {
    margin: 0;
    color: #f4fbff;
  }

  p,
  span {
    color: rgba(219, 231, 238, 0.8);
  }

  .back-btn,
  .play-btn,
  .shop-card button {
    border: 0;
    border-radius: 999px;
    padding: 11px 15px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .back-btn {
    color: #eff7ff;
    background: rgba(255, 255, 255, 0.08);
  }

  .play-btn,
  .shop-card button {
    color: #051a25;
    background: linear-gradient(135deg, #95dcff, #77ffcb);
  }

  .shop-card .locked-btn {
    color: #d7e0e7;
    background: rgba(255, 255, 255, 0.09);
    cursor: default;
  }

  .shop-card .equipped-btn {
    color: #0d2419;
    background: linear-gradient(135deg, #9fffd0, #9df7ff);
    cursor: default;
  }

  .stats-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .stats-row span {
    padding: 7px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(9, 20, 31, 0.7);
    font-size: 0.86rem;
  }

  .section-title {
    margin: 16px 0 10px;
    color: #d6ebf8;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.75rem;
  }

  .shop-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
  }

  .shop-card {
    position: relative;
    padding: 18px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(10, 22, 31, 0.92);
    overflow: hidden;
  }

  .shop-card.equipped {
    border-color: rgba(145, 239, 255, 0.42);
    box-shadow: 0 16px 28px rgba(60, 200, 255, 0.14);
  }

  .shop-card .accent {
    position: absolute;
    inset: -1px auto auto -1px;
    width: 54%;
    height: 38%;
    background: radial-gradient(circle at top left, var(--skin), transparent 64%);
    opacity: 0.32;
    pointer-events: none;
  }

  .shop-card h2 {
    margin: 8px 0 8px;
    color: #f7fcff;
    position: relative;
  }

  .shop-card p {
    margin: 0;
    position: relative;
  }

  .card-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
  }

  .card-foot small {
    color: rgba(201, 220, 232, 0.78);
    font-size: 0.75rem;
  }

  .preview-host {
    position: relative;
    width: 100%;
    height: 96px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: radial-gradient(circle at 38% 28%, rgba(255, 255, 255, 0.1), rgba(8, 18, 28, 0.72));
    overflow: hidden;
  }

  @media (max-width: 760px) {
    .shop-shell {
      padding:
        calc(12px + env(safe-area-inset-top))
        calc(12px + env(safe-area-inset-right))
        calc(14px + env(safe-area-inset-bottom))
        calc(12px + env(safe-area-inset-left));
    }

    .shop-head {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
