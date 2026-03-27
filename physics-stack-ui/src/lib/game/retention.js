/**
 * Single source of truth for daily streak, first-run welcome, tutorial merge flag, and share.
 * Used by merge-game demos — keep game-specific hooks in HTML minimal (call these APIs only).
 */
import { t } from './i18n.js';

const LS_LAST = 'mergeGameDailyLast-v1';
const LS_STREAK = 'mergeGameDailyStreak-v1';
const LS_WELCOME_ATOMS = 'mergeGameWelcomeAtomsSeen-v1';
const LS_TUTORIAL_MERGE_ATOMS = 'mergeGameAtomsTutorialMerge-v1';

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function prevUtcDayKey(dayKey) {
  const [y, m, da] = dayKey.split('-').map(Number);
  const t = Date.UTC(y, m - 1, da);
  return new Date(t - 86400000).toISOString().slice(0, 10);
}

/**
 * Call once per session start (e.g. after shell init). Updates streak if calendar day changed.
 * @returns {{ streak: number, isNewDay: boolean }}
 */
export function recordDailyLogin() {
  const today = utcDayKey();
  try {
    const last = localStorage.getItem(LS_LAST);
    const prevSt = parseInt(localStorage.getItem(LS_STREAK) || '1', 10);
    if (last === today) {
      const streak = Number.isFinite(prevSt) && prevSt > 0 ? prevSt : 1;
      return { streak, isNewDay: false };
    }
    let streak = 1;
    if (!last) {
      streak = 1;
    } else if (last === prevUtcDayKey(today)) {
      streak = (Number.isFinite(prevSt) && prevSt > 0 ? prevSt : 0) + 1;
    } else {
      streak = 1;
    }
    localStorage.setItem(LS_LAST, today);
    localStorage.setItem(LS_STREAK, String(streak));
    return { streak, isNewDay: true };
  } catch {
    return { streak: 1, isNewDay: false };
  }
}

export function getDailyStreak() {
  try {
    const s = parseInt(localStorage.getItem(LS_STREAK) || '1', 10);
    return Number.isFinite(s) && s > 0 ? s : 1;
  } catch {
    return 1;
  }
}

export function hasSeenWelcomeAtoms() {
  try {
    return localStorage.getItem(LS_WELCOME_ATOMS) === '1';
  } catch {
    return true;
  }
}

export function setWelcomeAtomsSeen() {
  try {
    localStorage.setItem(LS_WELCOME_ATOMS, '1');
  } catch (_) {}
}

/** First merge ever in Atoms (for onboarding toast). */
export function hasCompletedAtomsTutorialMerge() {
  try {
    return localStorage.getItem(LS_TUTORIAL_MERGE_ATOMS) === '1';
  } catch {
    return true;
  }
}

export function setAtomsTutorialMergeDone() {
  try {
    localStorage.setItem(LS_TUTORIAL_MERGE_ATOMS, '1');
  } catch (_) {}
}

/**
 * @param {object} o
 * @param {'atoms'|'marble'|'numbers'} o.themeId
 * @param {string} [o.extra] e.g. element symbol
 */
export function buildShareText(o) {
  const { themeId, extra = '' } = o;
  if (themeId === 'atoms') {
    const line = extra ? ` — ${extra}` : '';
    return `I’m collecting elements in Periodic Stack${line}! Can you discover all 18?`;
  }
  if (themeId === 'numbers') {
    return 'I’m stacking numbers in Number Stack — merge to climb tiers. Can you beat my score?';
  }
  return 'I’m playing Ceramic Stack — merge marbles and climb tiers. Try it!';
}

/**
 * @param {object} o
 * @param {string} o.text
 * @param {string} [o.title]
 */
export async function shareOrCopy(o) {
  const { text, title = 'Merge game' } = o;
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/**
 * @param {object} opts
 * @param {() => void} [opts.onDismiss]
 * @param {() => void} [opts.onSfxResume]
 */
export function initWelcomeOverlayAtoms(opts = {}) {
  const el = document.getElementById('welcomeAtoms');
  const btn = document.getElementById('welcomeAtomsPlay');
  const titleEl = document.getElementById('welcomeAtomsTitle');
  const linesEl = document.getElementById('welcomeAtomsLines');
  const factEl = document.getElementById('welcomeAtomsFact');
  if (!el || !btn) return { show: () => {}, hide: () => {} };

  function fillCopy() {
    if (titleEl) titleEl.textContent = t('retention.welcomeTitle');
    if (linesEl) {
      linesEl.innerHTML = [
        t('retention.welcomeLine1'),
        t('retention.welcomeLine2'),
        t('retention.welcomeLine3'),
      ]
        .map((line) => `<p class="welcome-atoms-line">${line}</p>`)
        .join('');
    }
    if (factEl) factEl.textContent = t('retention.welcomeFact');
    btn.textContent = t('retention.welcomePlay');
  }
  fillCopy();

  function hide() {
    el.classList.remove('visible');
    el.setAttribute('aria-hidden', 'true');
    opts.onDismiss?.();
  }

  function show() {
    fillCopy();
    el.classList.add('visible');
    el.setAttribute('aria-hidden', 'false');
    btn.focus({ preventScroll: true });
  }

  if (!hasSeenWelcomeAtoms()) {
    show();
  }

  btn.addEventListener('click', () => {
    opts.onSfxResume?.();
    setWelcomeAtomsSeen();
    hide();
  });

  window.addEventListener('mergegame:locale', () => fillCopy());

  return { show, hide };
}

/**
 * @param {object} opts
 * @param {(n: number) => string} opts.formatStreak — from i18n t('retention.streakDays', { n })
 * @param {boolean} [opts.showDailyToast] — toast once per calendar day on first load
 */
export function updateStreakDisplay(opts) {
  const { formatStreak, showDailyToast = false } = opts;
  const { streak, isNewDay } = recordDailyLogin();
  const line = formatStreak(streak);
  document.querySelectorAll('[data-retention-streak]').forEach((el) => {
    el.textContent = line;
  });
  if (showDailyToast && isNewDay) {
    showRetentionToast({ message: t('retention.dailyCheckIn', { n: String(streak) }) });
  }
  window.dispatchEvent(new CustomEvent('mergegame:streak', { detail: { streak, isNewDay } }));
}

/**
 * @param {object} opts
 * @param {import('./i18n.js').t} opts.t
 * @param {'atoms'|'marble'|'numbers'} opts.themeId
 */
export function initMenuShareButton(opts) {
  const { t, themeId } = opts;
  const btn = document.getElementById('shareGameBtn');
  if (!btn) return;

  async function doShare() {
    const text = buildShareText({ themeId });
    const r = await shareOrCopy({ text, title: t('retention.shareTitle') });
    if (r === 'copied' && typeof window !== 'undefined') {
      const prev = btn.textContent;
      btn.textContent = t('retention.copied');
      window.setTimeout(() => {
        btn.textContent = prev;
      }, 1600);
    }
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    doShare();
  });
}

/**
 * @param {object} opts
 * @param {string} opts.message
 * @param {number} [opts.ms]
 */
export function showRetentionToast(opts) {
  const host = document.getElementById('retentionToastHost');
  if (!host) return;
  const { message, ms = 3200 } = opts;
  const el = document.createElement('div');
  el.className = 'retention-toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  host.appendChild(el);
  window.requestAnimationFrame(() => el.classList.add('retention-toast--in'));
  window.setTimeout(() => {
    el.classList.remove('retention-toast--in');
    window.setTimeout(() => el.remove(), 280);
  }, ms);
}
