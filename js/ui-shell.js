/**
 * Shared HUD + slide-up menu wiring for merge-game HTML shells.
 */
import { applyI18n, getLocale, setLocale, t } from './i18n.js';

/**
 * @param {object} opts
 * @param {'marble'|'numbers'|'atoms'} opts.themeId
 * @param {ReturnType<import('./sfx.js').createSfx>} [opts.Sfx]
 * @param {boolean} [opts.showMute]
 */
export function initMergeGameShell(opts) {
  const { themeId, Sfx, showMute = false } = opts;
  document.body.classList.add('merge-game', `theme-${themeId}`);

  const howEl = document.getElementById('gameMenuHowTo');
  const ctrlEl = document.getElementById('gameMenuControls');
  if (howEl) howEl.innerHTML = t(`${themeId}.help`);
  if (ctrlEl) ctrlEl.innerHTML = t(`${themeId}.controlsLine`);

  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.value = getLocale();
    langSelect.addEventListener('change', () => {
      setLocale(langSelect.value);
      applyI18n();
      if (howEl) howEl.innerHTML = t(`${themeId}.help`);
      if (ctrlEl) ctrlEl.innerHTML = t(`${themeId}.controlsLine`);
      syncMuteButton();
      window.dispatchEvent(new CustomEvent('mergegame:locale'));
    });
  }

  const sfxMuteBtn = document.getElementById('sfxMuteBtn');

  function syncMuteButton() {
    if (!sfxMuteBtn || !Sfx) return;
    const m = Sfx.getMuted();
    sfxMuteBtn.textContent = m ? t('common.soundOff') : t('common.soundOn');
    sfxMuteBtn.classList.toggle('muted', m);
    sfxMuteBtn.setAttribute('aria-pressed', m ? 'true' : 'false');
  }

  if (showMute && Sfx) {
    syncMuteButton();
    sfxMuteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      Sfx.toggleMuted();
      syncMuteButton();
    });
  }

  const gameMenu = document.getElementById('gameMenu');
  const gameMenuOpenBtn = document.getElementById('gameMenuOpenBtn');
  const gameMenuCloseBtn = document.getElementById('gameMenuCloseBtn');

  function openGameMenu() {
    gameMenu?.classList.add('visible');
    gameMenu?.setAttribute('aria-hidden', 'false');
    gameMenuOpenBtn?.setAttribute('aria-expanded', 'true');
    Sfx?.resume();
    gameMenuCloseBtn?.focus({ preventScroll: true });
  }

  function closeGameMenu() {
    gameMenu?.classList.remove('visible');
    gameMenu?.setAttribute('aria-hidden', 'true');
    gameMenuOpenBtn?.setAttribute('aria-expanded', 'false');
  }

  gameMenuOpenBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    Sfx?.resume();
    openGameMenu();
  });
  gameMenuCloseBtn?.addEventListener('click', () => closeGameMenu());
  gameMenu?.addEventListener('click', (e) => {
    if (e.target === gameMenu) closeGameMenu();
  });

  applyI18n();
  syncMuteButton();

  return { openGameMenu, closeGameMenu, syncMuteButton, getLocale: () => getLocale() };
}
