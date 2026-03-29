<script lang="ts">
  import { ELEMENTS, MOLECULE_RECIPES } from '../game/config-atoms.js';
  import {
    loadDiscoveredAtomicNumbers,
    loadDiscoveredMoleculeIds,
  } from '../game/atoms-discovery.js';
  import { mountAtomAlbumPreview } from '../game/atom-album-preview.js';
  import { atomFact, atomName, locale, t } from '../app-i18n';

  type Props = {
    onBack?: () => void;
    onPlayAtoms?: () => void;
  };

  let { onBack = () => {}, onPlayAtoms = () => {} }: Props = $props();
  let albumTab = $state<'elements' | 'molecules'>('elements');

  const currentLocale = $derived($locale);
  const discoveredAtomicNumbers = $derived(loadDiscoveredAtomicNumbers());
  const discoveredMoleculeIds = $derived(loadDiscoveredMoleculeIds());
  const discoveredElements = $derived(discoveredAtomicNumbers.size);
  const discoveredMolecules = $derived(discoveredMoleculeIds.size);
  const progress = $derived(
    albumTab === 'elements'
      ? Math.round((discoveredElements / ELEMENTS.length) * 100)
      : Math.round((discoveredMolecules / MOLECULE_RECIPES.length) * 100),
  );
  const unlockedCount = $derived(albumTab === 'elements' ? discoveredElements : discoveredMolecules);
  const totalCount = $derived(albumTab === 'elements' ? ELEMENTS.length : MOLECULE_RECIPES.length);

  const symbolByAtomic = new Map(ELEMENTS.map((e) => [e.atomicNumber, e.symbol]));
  function moleculeNeeds(recipe: { inputs: number[] }) {
    const counts = new Map<number, number>();
    for (const z of recipe.inputs) counts.set(z, (counts.get(z) ?? 0) + 1);
    return [...counts.entries()]
      .map(([z, n]) => `${symbolByAtomic.get(z) ?? `Z${z}`}x${n}`)
      .join(' + ');
  }

  function isElementUnlocked(atomicNumber: number) {
    return discoveredAtomicNumbers.has(atomicNumber);
  }

  function isMoleculeUnlocked(id: string) {
    return discoveredMoleculeIds.has(id);
  }

  type AlbumPreviewParams = {
    typeIndex?: number;
    recipe?: (typeof MOLECULE_RECIPES)[number];
    locked?: boolean;
  };

  function albumPreview(node: HTMLDivElement, params: AlbumPreviewParams) {
    let currentParams = params;
    let cleanup: (() => void) | null = null;
    let mounted = false;
    let intersectionObserver: IntersectionObserver | null = null;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const doMount = () => {
      if (mounted) return;
      mounted = true;
      cleanup = mountAtomAlbumPreview(node, currentParams);
    };

    const scheduleMount = () => {
      if (typeof window === 'undefined') return;
      if (typeof requestIdleCallback === 'function') {
        idleId = requestIdleCallback(() => doMount(), { timeout: 180 });
      } else {
        timeoutId = setTimeout(() => doMount(), 0);
      }
    };

    const doUnmount = () => {
      cleanup?.();
      cleanup = null;
      mounted = false;
    };

    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.target !== node || !entry.isIntersecting) continue;
            scheduleMount();
            intersectionObserver?.unobserve(node);
            return;
          }
        },
        { rootMargin: '220px 0px' },
      );
      intersectionObserver.observe(node);
    } else {
      scheduleMount();
    }

    return {
      update(nextParams: AlbumPreviewParams) {
        const needsRemount =
          nextParams.typeIndex !== currentParams.typeIndex ||
          (nextParams.recipe?.id ?? null) !== (currentParams.recipe?.id ?? null) ||
          nextParams.locked !== currentParams.locked;

        currentParams = nextParams;
        if (!needsRemount || !mounted) return;
        doUnmount();
        scheduleMount();
      },
      destroy() {
        if (typeof cancelIdleCallback === 'function' && idleId != null) cancelIdleCallback(idleId);
        if (timeoutId != null) clearTimeout(timeoutId);
        intersectionObserver?.disconnect();
        doUnmount();
      },
    };
  }
</script>

<section class="album-shell">
  <div class="album-head">
    <button class="nav-btn" onclick={onBack}>{t('common.back', undefined, currentLocale)}</button>
    <div>
      <p class="eyebrow">{t('album.eyebrow', undefined, currentLocale)}</p>
      <h1>{t('album.title', undefined, currentLocale)}</h1>
      <p class="sub">{t('album.subtitle', undefined, currentLocale)}</p>
    </div>
    <button class="play-btn" onclick={onPlayAtoms}>{t('album.play', undefined, currentLocale)}</button>
  </div>

  <div class="progress-card">
    <div>
      <span>{t('common.unlocked', undefined, currentLocale)}</span>
      <strong>{unlockedCount}/{totalCount}</strong>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style={`width:${progress}%`}></div>
    </div>
    <span>{progress}% {t('common.complete', undefined, currentLocale)}</span>
  </div>

  <div class="album-tabs">
    <button
      class={`tab-btn ${albumTab === 'elements' ? 'active' : ''}`}
      onclick={() => (albumTab = 'elements')}
    >
      {t('common.elements', undefined, currentLocale)}
    </button>
    <button
      class={`tab-btn ${albumTab === 'molecules' ? 'active' : ''}`}
      onclick={() => (albumTab = 'molecules')}
    >
      {t('common.molecules', undefined, currentLocale)}
    </button>
  </div>

  {#if albumTab === 'elements'}
    <div class="album-grid">
      {#each ELEMENTS as element, index (element.atomicNumber)}
        <article class={`element-card ${isElementUnlocked(element.atomicNumber) ? 'open' : 'locked'}`}>
          <div class="element-top">
            <span>#{element.atomicNumber}</span>
            <strong>{element.symbol}</strong>
          </div>
          <div
            class="preview-host"
            use:albumPreview={{ typeIndex: index, locked: !isElementUnlocked(element.atomicNumber) }}
          ></div>
          <h2>{atomName(element, currentLocale)}</h2>
          <p>
            {#if isElementUnlocked(element.atomicNumber)}
              {atomFact(element, currentLocale)}
            {:else}
              {t('album.locked', undefined, currentLocale)}
            {/if}
          </p>
        </article>
      {/each}
    </div>
  {:else}
    <div class="album-grid">
      {#each MOLECULE_RECIPES as molecule (molecule.id)}
        <article class={`element-card molecule-card ${isMoleculeUnlocked(molecule.id) ? 'open' : 'locked'}`}>
          <div class="element-top">
            <span>{t('album.moleculesTitle', undefined, currentLocale)}</span>
            <strong>{molecule.formula}</strong>
          </div>
          <div
            class="preview-host molecule-preview"
            use:albumPreview={{ recipe: molecule, locked: !isMoleculeUnlocked(molecule.id) }}
          ></div>
          <h2>{molecule.name}</h2>
          <p>
            {#if isMoleculeUnlocked(molecule.id)}
              {molecule.fact}
            {:else}
              {t('album.moleculeLocked', undefined, currentLocale)}
            {/if}
          </p>
          <p class="molecule-needs">{moleculeNeeds(molecule)}</p>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .album-shell {
    min-height: 100vh;
    padding:
      calc(18px + env(safe-area-inset-top))
      calc(18px + env(safe-area-inset-right))
      calc(18px + env(safe-area-inset-bottom))
      calc(18px + env(safe-area-inset-left));
    background:
      radial-gradient(circle at top left, rgba(91, 255, 214, 0.14), transparent 24%),
      linear-gradient(180deg, #071312 0%, #08171a 100%);
  }

  .album-head,
  .progress-card {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .album-head {
    margin-bottom: 18px;
  }

  .eyebrow {
    margin: 0 0 8px;
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #91e9d7;
  }

  h1 {
    margin: 0;
    color: #f3fdfb;
  }

  .sub,
  p {
    color: rgba(220, 238, 235, 0.8);
  }

  .nav-btn,
  .play-btn {
    border: 0;
    border-radius: 999px;
    padding: 12px 16px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .nav-btn {
    color: #effafa;
    background: rgba(255, 255, 255, 0.08);
  }

  .play-btn {
    color: #082019;
    background: linear-gradient(135deg, #96ffd6, #6fe8ff);
  }

  .progress-card {
    margin-bottom: 22px;
    padding: 18px 20px;
    border-radius: 22px;
    background: rgba(7, 20, 24, 0.84);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .progress-card span {
    color: rgba(198, 225, 219, 0.74);
  }

  .progress-card strong {
    display: block;
    margin-top: 4px;
    font-size: 1.4rem;
    color: #f4fffb;
  }

  .progress-bar {
    flex: 1;
    height: 12px;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.08);
  }

  .progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #6dffe1, #ffe180);
  }

  .album-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }

  .album-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 14px;
  }

  .tab-btn {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    padding: 9px 12px;
    color: #e8f7f2;
    background: rgba(8, 22, 24, 0.72);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .tab-btn.active {
    color: #0e261f;
    background: linear-gradient(135deg, #95ffd8, #78e5ff);
  }

  .element-card {
    padding: 18px;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(8, 22, 24, 0.88);
  }

  .element-card.open {
    background:
      radial-gradient(circle at top right, rgba(111, 255, 201, 0.14), transparent 30%),
      rgba(8, 22, 24, 0.94);
  }

  .molecule-card.open {
    background:
      radial-gradient(circle at top right, rgba(255, 203, 120, 0.16), transparent 32%),
      rgba(10, 24, 30, 0.94);
  }

  .element-card.locked {
    opacity: 0.72;
  }

  .element-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .element-top span {
    font-size: 0.75rem;
    color: rgba(199, 223, 218, 0.64);
  }

  .element-top strong {
    font-size: 2rem;
    color: #f6fffd;
  }

  h2 {
    margin: 12px 0 8px;
    color: #f3fffc;
  }

  .molecule-needs {
    margin-top: 10px;
    font-size: 0.78rem;
    color: rgba(182, 221, 230, 0.76);
  }

  .preview-host {
    position: relative;
    width: 100%;
    height: 106px;
    margin-top: 10px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.11);
    background: radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.13), rgba(7, 16, 22, 0.78));
    overflow: hidden;
  }

  .molecule-preview {
    height: 118px;
  }

  @media (max-width: 760px) {
    .album-shell {
      padding:
        calc(12px + env(safe-area-inset-top))
        calc(12px + env(safe-area-inset-right))
        calc(14px + env(safe-area-inset-bottom))
        calc(12px + env(safe-area-inset-left));
    }

    .album-head,
    .progress-card {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
