/**
 * Lightweight i18n for static HTML games (en / fr / pt).
 * Persists choice in localStorage; initial language from navigator or stored value.
 */

const STORAGE_KEY = 'mergeGameLocale';

const SUPPORTED = ['en', 'fr', 'pt'];

/** @type {Record<string, Record<string, string>>} flat keys like "common.score" */
const STRINGS = {
  en: {
    'common.score': 'Score',
    'common.level': 'Level',
    'common.combo': 'Combo',
    'common.nextPts': 'Next',
    'common.menu': 'Menu',
    'common.restart': 'Restart',
    'common.gameOver': 'Game over',
    'common.soundOn': 'Sound on',
    'common.soundOff': 'Muted',
    'common.language': 'Language',
    'common.close': 'Close',
    'common.howToPlay': 'How to play',
    'common.controls': 'Controls',
    'common.physics': 'Physics',
    'common.menuTier': 'Tier progress',
    'common.menuTip': 'Tip',
    'common.mainMenu': 'Main menu',
    'common.linkMarbles': 'Marbles',
    'common.linkNumbers': 'Numbers',
    'common.linkAtoms': 'Atoms',
    'common.releaseToDrop': 'Slide to aim, release to drop.',
    'common.overlayHint': 'Press R on keyboard — or tap below.',
    'retention.streakDays': 'Streak · day {n}',
    'retention.share': 'Share',
    'retention.copied': 'Copied!',
    'retention.shareTitle': 'Merge game',
    'retention.welcomeTitle': 'Welcome to the Reactor',
    'retention.welcomeLine1': 'Drop atoms, merge identical elements, and grow your pile.',
    'retention.welcomeLine2': 'Twin the two heaviest nuclei for a fusion jackpot.',
    'retention.welcomeLine3': 'Fill the periodic table — every merge teaches a bit of real science.',
    'retention.welcomeFact': 'Fun fact: stars fuse light elements into heavier ones — your reactor is a tiny cousin.',
    'retention.welcomePlay': "Let's go",
    'retention.firstDiscovery': 'New element: {symbol}! Saved to your collection.',
    'retention.tutorialMergeDone': 'First merge! Keep combining identical atoms to climb the table.',
    'retention.dailyCheckIn': 'Daily check-in · streak {n}',
    'phys.title': 'Physics',
    'phys.fineTune': 'Fine-tune sliders',
    'phys.presetCeramic': 'Ceramic',
    'phys.presetHeavy': 'Very heavy',
    'phys.presetUnderwater': 'Underwater',
    'marble.title': 'Ceramic stack',
    'marble.subtitle': 'Studio glaze',
    'marble.tier1': 'Studio glaze · tier I',
    'marble.tier2': 'Porcelain blue · tier II',
    'marble.tier3': 'Raku crackle · tier III',
    'marble.tier4': 'Obsidian kiln · tier IV',
    'marble.help': 'Touch: slide, release to drop · Mouse: drag, release. Merge identical balls to grow. Twin largest = jackpot.',
    'marble.overlaySub': 'Something crossed the danger line.',
    'marble.controlsLine': '<kbd>R</kbd> restart · <kbd>F</kbd> fullscreen · <kbd>D</kbd> physics',
    'numbers.title': 'Number stack',
    'numbers.help': 'Two identical numbers merge into the next tier (1+1→2, 2+2→3, …). Twin 12s = sparkle jackpot.',
    'numbers.overlaySub': 'The stack reached the top!',
    'numbers.levelTag': "Level {n} — Let's count!",
    'numbers.controlsLine': '<kbd>R</kbd> restart · <kbd>F</kbd> fullscreen · <kbd>D</kbd> physics',
    'atoms.tier1': 'Period 1–3 — Light elements',
    'atoms.tier2': 'Transition block · periods IV–V',
    'atoms.tier3': 'Heavy metals · period VI',
    'atoms.tier4': 'Transuranics lab · period VII+',
    'atoms.title': 'Periodic stack',
    'atoms.help':
      'Release to drop · merge the same element · twin heaviest nuclei = fusion jackpot. Spheres show a Bohr-style shell hint.',
    'atoms.overlaySub': 'The reactor column hit critical fill.',
    'atoms.gameMenuIntro':
      'Merge same element · twin heaviest = fusion jackpot · spheres show a Bohr-style shell hint (educational).',
    'atoms.discoveredTitle': 'Discovered elements',
    'atoms.discoveredSub': 'Unlock by dropping or merging — tap a card to read its fact again.',
    'atoms.discoveredPlaceholder': 'Tap an unlocked element to see its fact.',
    'atoms.discoveredLocked': 'Not discovered yet — merge or drop this element!',
    'atoms.discoveredProgress': '{found} / {total} discovered',
    'atoms.controlsLine': '<kbd>R</kbd> restart · <kbd>F</kbd> fullscreen · <kbd>D</kbd> physics',
  },
  fr: {
    'common.score': 'Score',
    'common.level': 'Niveau',
    'common.combo': 'Combo',
    'common.nextPts': 'Suivant',
    'common.menu': 'Menu',
    'common.restart': 'Rejouer',
    'common.gameOver': 'Partie terminée',
    'common.soundOn': 'Son activé',
    'common.soundOff': 'Muet',
    'common.language': 'Langue',
    'common.close': 'Fermer',
    'common.howToPlay': 'Comment jouer',
    'common.controls': 'Contrôles',
    'common.physics': 'Physique',
    'common.menuTier': 'Palier',
    'common.menuTip': 'Astuce',
    'common.mainMenu': 'Menu principal',
    'common.linkMarbles': 'Billes',
    'common.linkNumbers': 'Nombres',
    'common.linkAtoms': 'Atomes',
    'common.releaseToDrop': 'Glisser pour viser, relâcher pour lâcher.',
    'common.overlayHint': 'Touche R au clavier — ou appuyez ci-dessous.',
    'retention.streakDays': 'Série · jour {n}',
    'retention.share': 'Partager',
    'retention.copied': 'Copié !',
    'retention.shareTitle': 'Jeu de fusion',
    'retention.welcomeTitle': 'Bienvenue dans le réacteur',
    'retention.welcomeLine1': 'Lâchez des atomes, fusionnez les mêmes éléments et faites grandir la pile.',
    'retention.welcomeLine2': 'Réunissez les deux noyaux les plus lourds pour un jackpot de fusion.',
    'retention.welcomeLine3': 'Complétez le tableau — chaque fusion apprend un peu de vraie science.',
    'retention.welcomeFact': 'Les étoiles fusionnent les éléments légers en plus lourds — votre réacteur en est un petit cousin.',
    'retention.welcomePlay': 'C’est parti',
    'retention.firstDiscovery': 'Nouvel élément : {symbol} ! Enregistré dans votre collection.',
    'retention.tutorialMergeDone': 'Première fusion ! Continuez à combiner les mêmes atomes.',
    'retention.dailyCheckIn': 'Connexion du jour · série {n}',
    'phys.title': 'Physique',
    'phys.fineTune': 'Réglages fins',
    'phys.presetCeramic': 'Céramique',
    'phys.presetHeavy': 'Très lourd',
    'phys.presetUnderwater': 'Sous l’eau',
    'marble.title': 'Pile céramique',
    'marble.subtitle': 'Glaçure studio',
    'marble.tier1': 'Glaçure studio · palier I',
    'marble.tier2': 'Porcelaine bleue · palier II',
    'marble.tier3': 'Craquelé raku · palier III',
    'marble.tier4': 'Four obsidienne · palier IV',
    'marble.help':
      'Tactile : glisser, relâcher pour lâcher · Souris : glisser-déposer. Fusionnez les mêmes billes. Paire des plus grosses = jackpot.',
    'marble.overlaySub': 'La ligne de danger a été dépassée.',
    'marble.controlsLine': '<kbd>R</kbd> redémarrer · <kbd>F</kbd> plein écran · <kbd>D</kbd> physique',
    'numbers.title': 'Pile de nombres',
    'numbers.help':
      'Deux nombres identiques fusionnent en suivant (1+1→2, 2+2→3, …). Deux 12 = méga jackpot.',
    'numbers.overlaySub': 'La pile a atteint le haut !',
    'numbers.levelTag': 'Niveau {n} — Comptons !',
    'numbers.controlsLine': '<kbd>R</kbd> redémarrer · <kbd>F</kbd> plein écran · <kbd>D</kbd> physique',
    'atoms.tier1': 'Périodes 1–3 — Éléments légers',
    'atoms.tier2': 'Bloc de transition · périodes IV–V',
    'atoms.tier3': 'Métaux lourds · période VI',
    'atoms.tier4': 'Laboratoire transuranien · période VII+',
    'atoms.title': 'Pile périodique',
    'atoms.help':
      'Relâcher pour lâcher · fusionner le même élément · paire des plus lourds = jackpot de fusion. Coquilles façon Bohr.',
    'atoms.overlaySub': 'La colonne réacteur est trop pleine.',
    'atoms.gameMenuIntro':
      'Fusionnez le même élément · paire des plus lourds = jackpot · coquilles façon Bohr (pédagogique).',
    'atoms.discoveredTitle': 'Éléments découverts',
    'atoms.discoveredSub': 'Débloquez en jouant — touchez une carte pour relire le fait.',
    'atoms.discoveredPlaceholder': 'Touchez un élément débloqué pour voir le fait.',
    'atoms.discoveredLocked': 'Pas encore découvert — fusionnez ou déposez cet élément !',
    'atoms.discoveredProgress': '{found} / {total} découverts',
    'atoms.controlsLine': '<kbd>R</kbd> redémarrer · <kbd>F</kbd> plein écran · <kbd>D</kbd> physique',
  },
  pt: {
    'common.score': 'Pontos',
    'common.level': 'Nível',
    'common.combo': 'Combo',
    'common.nextPts': 'Próximo',
    'common.menu': 'Menu',
    'common.restart': 'Recomeçar',
    'common.gameOver': 'Fim de jogo',
    'common.soundOn': 'Som ligado',
    'common.soundOff': 'Mudo',
    'common.language': 'Idioma',
    'common.close': 'Fechar',
    'common.howToPlay': 'Como jogar',
    'common.controls': 'Controles',
    'common.physics': 'Física',
    'common.menuTier': 'Progresso do nível',
    'common.menuTip': 'Dica',
    'common.mainMenu': 'Menu principal',
    'common.linkMarbles': 'Mármore',
    'common.linkNumbers': 'Números',
    'common.linkAtoms': 'Átomos',
    'common.releaseToDrop': 'Arraste para mirar, solte para largar.',
    'common.overlayHint': 'Tecla R no teclado — ou toque abaixo.',
    'retention.streakDays': 'Sequência · dia {n}',
    'retention.share': 'Compartilhar',
    'retention.copied': 'Copiado!',
    'retention.shareTitle': 'Jogo de fusão',
    'retention.welcomeTitle': 'Bem-vindo ao reator',
    'retention.welcomeLine1': 'Largue átomos, una os mesmos elementos e faça a pilha crescer.',
    'retention.welcomeLine2': 'Junte os dois núcleos mais pesados para um jackpot de fusão.',
    'retention.welcomeLine3': 'Complete a tabela — cada fusão ensina um pouco de ciência de verdade.',
    'retention.welcomeFact': 'Estrelas fundem elementos leves em mais pesados — seu reator é um primo pequeno.',
    'retention.welcomePlay': 'Vamos lá',
    'retention.firstDiscovery': 'Novo elemento: {symbol}! Salvo na sua coleção.',
    'retention.tutorialMergeDone': 'Primeira fusão! Continue unindo os mesmos átomos.',
    'retention.dailyCheckIn': 'Check-in diário · sequência {n}',
    'phys.title': 'Física',
    'phys.fineTune': 'Ajustes finos',
    'phys.presetCeramic': 'Cerâmica',
    'phys.presetHeavy': 'Muito pesado',
    'phys.presetUnderwater': 'Subaquático',
    'marble.title': 'Pilha cerâmica',
    'marble.subtitle': 'Esmalte de estúdio',
    'marble.tier1': 'Esmalte de estúdio · nível I',
    'marble.tier2': 'Porcelana azul · nível II',
    'marble.tier3': 'Craquelê raku · nível III',
    'marble.tier4': 'Forno obsidiana · nível IV',
    'marble.help':
      'Toque: deslize, solte para largar · Mouse: arraste. Una bolas iguais. Par das maiores = jackpot.',
    'marble.overlaySub': 'Algo passou da linha de perigo.',
    'marble.controlsLine': '<kbd>R</kbd> reiniciar · <kbd>F</kbd> tela cheia · <kbd>D</kbd> física',
    'numbers.title': 'Pilha de números',
    'numbers.help':
      'Dois números iguais viram o próximo nível (1+1→2, 2+2→3, …). Dois 12 = jackpot.',
    'numbers.overlaySub': 'A pilha encheu em cima!',
    'numbers.levelTag': 'Nível {n} — Vamos contar!',
    'numbers.controlsLine': '<kbd>R</kbd> reiniciar · <kbd>F</kbd> tela cheia · <kbd>D</kbd> física',
    'atoms.tier1': 'Períodos 1–3 — Elementos leves',
    'atoms.tier2': 'Bloco de transição · períodos IV–V',
    'atoms.tier3': 'Metais pesados · período VI',
    'atoms.tier4': 'Laboratório transurânico · período VII+',
    'atoms.title': 'Pilha periódica',
    'atoms.help':
      'Solte para largar · una o mesmo elemento · par dos mais pesados = jackpot de fusão. Camadas estilo Bohr.',
    'atoms.overlaySub': 'A coluna do reator encheu demais.',
    'atoms.gameMenuIntro':
      'Una o mesmo elemento · par dos mais pesados = jackpot · camadas estilo Bohr (educativo).',
    'atoms.discoveredTitle': 'Elementos descobertos',
    'atoms.discoveredSub': 'Desbloqueie jogando — toque num cartão para reler o fato.',
    'atoms.discoveredPlaceholder': 'Toque num elemento desbloqueado para ver o fato.',
    'atoms.discoveredLocked': 'Ainda não descoberto — una ou solte este elemento!',
    'atoms.discoveredProgress': '{found} / {total} descobertos',
    'atoms.controlsLine': '<kbd>R</kbd> reiniciar · <kbd>F</kbd> tela cheia · <kbd>D</kbd> física',
  },
};

function normalizeLang(raw) {
  if (!raw || typeof raw !== 'string') return 'en';
  const base = raw.split('-')[0].toLowerCase();
  return SUPPORTED.includes(base) ? base : 'en';
}

export function getStoredLocale() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && SUPPORTED.includes(v)) return v;
  } catch (_) {}
  return null;
}

export function detectLocale() {
  const stored = getStoredLocale();
  if (stored) return stored;
  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeLang(navigator.language);
  }
  return 'en';
}

/** @returns {'en'|'fr'|'pt'} */
export function getLocale() {
  return detectLocale();
}

/** @param {'en'|'fr'|'pt'} lang */
export function setLocale(lang) {
  const l = normalizeLang(lang);
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch (_) {}
  if (typeof document !== 'undefined') {
    document.documentElement.lang = l;
  }
  return l;
}

/**
 * @param {string} key dot path e.g. "common.score"
 * @param {Record<string, string>} [vars] e.g. { n: "3" }
 */
export function t(key, vars, lang) {
  const locale = lang ?? getLocale();
  const table = STRINGS[locale] ?? STRINGS.en;
  let s = table[key] ?? STRINGS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

export function applyI18n(root = document.body, lang) {
  const locale = lang ?? getLocale();
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const vars = {};
    if (el.dataset.i18nN != null) vars.n = el.dataset.i18nN;
    if (el.dataset.i18nFound != null) vars.found = el.dataset.i18nFound;
    if (el.dataset.i18nTotal != null) vars.total = el.dataset.i18nTotal;
    el.textContent = t(key, Object.keys(vars).length ? vars : undefined, locale);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key || !('placeholder' in el)) return;
    el.placeholder = t(key, undefined, locale);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (!key || !el.setAttribute) return;
    el.setAttribute('aria-label', t(key, undefined, locale));
  });
}
