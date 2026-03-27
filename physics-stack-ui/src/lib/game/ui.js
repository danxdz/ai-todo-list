export function formatPhysLabel(key, v) {
  if (key === 'solverIterations') return String(Math.round(v));
  if (key === 'gravity' || key === 'contactStiffness6') return String(Math.round(v));
  if (key === 'linearDamping') return Number(v).toFixed(3);
  return Number(v).toFixed(2);
}

export function togglePhysDebugPanel() {
  const panel = document.getElementById('physDbgPanel');
  const tab = document.getElementById('physDbgTab');
  if (!panel || !tab) return;
  const open = panel.hidden;
  panel.hidden = !open;
  tab.setAttribute('aria-expanded', String(open));
  tab.textContent = open ? 'Physics debug ▼' : 'Physics debug ▲';
}

/** Expand the physics panel (used when opening the menu via keyboard). */
export function ensurePhysDebugPanelOpen() {
  const panel = document.getElementById('physDbgPanel');
  const tab = document.getElementById('physDbgTab');
  if (!panel || !tab) return;
  if (panel.hidden) {
    panel.hidden = false;
    tab.setAttribute('aria-expanded', 'true');
    tab.textContent = 'Physics debug ▼';
  }
}

export function syncPhysicsSliders(physicsTuning) {
  document.querySelectorAll('#physDbgPanel input[data-key]').forEach((el) => {
    const key = el.dataset.key;
    if (physicsTuning[key] === undefined) return;
    el.value = String(physicsTuning[key]);
    const span = document.getElementById(`ptv-${key}`);
    if (span) span.textContent = formatPhysLabel(key, physicsTuning[key]);
  });
}

export function initPhysicsDebugUI(physicsTuning, applyPhysicsTuning, applyPhysicsPreset) {
  const panel = document.getElementById('physDbgPanel');
  const tab = document.getElementById('physDbgTab');
  if (!panel || !tab) return;

  tab.addEventListener('click', togglePhysDebugPanel);

  const presetBar = document.getElementById('phys-preset-bar');
  if (presetBar && applyPhysicsPreset) {
    presetBar.querySelectorAll('button[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyPhysicsPreset(physicsTuning, btn.dataset.preset);
        syncPhysicsSliders(physicsTuning);
        applyPhysicsTuning();
      });
    });
  }

  panel.querySelectorAll('input[data-key]').forEach((el) => {
    const key = el.dataset.key;
    el.value = String(physicsTuning[key]);
    const span = document.getElementById(`ptv-${key}`);
    if (span) span.textContent = formatPhysLabel(key, physicsTuning[key]);
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      physicsTuning[key] = v;
      if (span) span.textContent = formatPhysLabel(key, v);
      applyPhysicsTuning();
    });
  });
}
