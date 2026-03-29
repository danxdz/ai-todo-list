<script lang="ts">
  import { onMount } from 'svelte';
  import { ELEMENTS as ATOM_ELEMENTS, MOLECULE_RECIPES, setActiveAtomElements } from '../game/config-atoms.js';
  import { formatChemicalFormula } from '../game/chem-format.js';
  import {
    ATOM_PHYSICS_DEFAULT_PRESET,
    ATOM_PHYSICS_PRESETS,
    ATOM_PHYSICS_FIELDS,
    ATOM_PHYSICS_LS_KEY,
    ATOM_PHYSICS_BROADCAST_CHANNEL,
    cloneAtomPreset,
    sanitizeAtomPhysicsLabPayload,
    formatPhysicsFieldValue,
    isAtomPresetName,
  } from '../game/atom-physics-lab.js';
  import {
    ATOM_COLLISION_REACTIONS,
    ATOM_FX_DEFAULTS,
    ATOM_FX_PRIMITIVE_DEFAULTS,
    ATOM_FX_PRIMITIVE_STYLES,
    ATOM_FX_PRIMITIVE_TYPES,
    ATOM_FX_PREVIEW_BROADCAST_CHANNEL,
    ATOM_FX_PROFILE_DEFAULTS,
    ATOM_FX_PROFILE_SCOPES,
    ATOM_VISUAL_GLOBAL_DEFAULTS,
    ATOM_VISUAL_LAYER_TYPES,
    ATOM_VISUAL_LAB_BROADCAST_CHANNEL,
    applyAtomVisualOverrides,
    loadAtomVisualLabState,
    saveAtomVisualLabState,
    sanitizeAtomVisualLabState,
  } from '../game/atom-visual-lab.js';

  type Props = { onBack?: () => void };
  type VisualLabState = {
    atoms: Record<string, any>;
    molecules: Record<string, any>;
    fx: Record<string, number>;
    fxPrimitives: Record<string, any>;
    fxProfiles: Record<string, any>;
    globals: Record<string, any>;
  };
  type FxPanelId = 'physics' | 'atom' | 'molecule' | 'globals' | 'effects' | 'json';
  type AtomEditorSection = 'basics' | 'layers' | 'composition' | 'material' | 'fx';
  type FxEditorSection = 'overview' | 'primitives' | 'profiles';
  type FxPreviewSource = 'primitive' | 'stackItem' | 'profile';
  const FX_PRIMITIVE_TYPE_LABELS: Record<string, string> = {
    attractor: 'Bond Orbit',
    bond: 'Bond Link',
    burst: 'Burst',
    explosion: 'Explosion',
    fire: 'Fire Burst',
    orbit: 'Electron Orbit',
    sparkStorm: 'Spark Storm',
    smoke: 'Smoke',
    sparks: 'Sparks',
    trails: 'Trails',
    waterSplash: 'Water Splash',
    waterDroplets: 'Wet Droplets',
  };
  const FX_PREVIEW_KIND_LABELS: Record<string, string> = {
    merge: 'Atom Merge',
    molecule: 'Molecule',
    water: 'Water',
    fire: 'Fire',
    explosion: 'Explosion',
  };
  const LAB_PANELS: Array<{ id: FxPanelId; label: string }> = [
    { id: 'physics', label: 'Physics' },
    { id: 'atom', label: 'Atom' },
    { id: 'molecule', label: 'Molecule' },
    { id: 'globals', label: 'Global Atom' },
    { id: 'effects', label: 'Effects' },
    { id: 'json', label: 'JSON' },
  ];
  let { onBack = () => {} }: Props = $props();

  let preset = $state(ATOM_PHYSICS_DEFAULT_PRESET);
  let enabled = $state(true);
  let values = $state<Record<string, number>>(cloneAtomPreset(ATOM_PHYSICS_DEFAULT_PRESET));
  let jsonInput = $state('');
  let visualJsonInput = $state('');
  let status = $state('');

  let visualState = $state<VisualLabState>(loadAtomVisualLabState() as VisualLabState);
  const atomOptions = ATOM_ELEMENTS.map((spec) => ({
    z: spec.atomicNumber,
    label: `${spec.symbol} · ${spec.name} (Z${spec.atomicNumber})`,
  }));
  const moleculeOptions = MOLECULE_RECIPES.map((recipe) => ({
    id: recipe.id,
    label: `${formatChemicalFormula(recipe.formula)} · ${recipe.name}`,
  }));
  const atomByZ = new Map(ATOM_ELEMENTS.map((spec) => [spec.atomicNumber, spec]));
  const moleculeById = new Map(MOLECULE_RECIPES.map((recipe) => [recipe.id, recipe]));
  let selectedAtomZ = $state(atomOptions[0]?.z ?? 1);
  let selectedMoleculeId = $state(moleculeOptions[0]?.id ?? '');
  let activePanel = $state<FxPanelId>('physics');
  let panelMenuOpen = $state(false);
  let atomEditorSection = $state<AtomEditorSection>('basics');
  let fxEditorSection = $state<FxEditorSection>('overview');
  let selectedFxPrimitiveId = $state('pair_attractor_soft');
  let selectedFxProfileId = $state('merge_default');
  let selectedAtomLayerIndex = $state(0);
  let selectedGlobalLayerIndex = $state(0);
  let selectedAtomCollisionRuleIndex = $state(0);
  let selectedFxStackIndex = $state(0);
  let fxPreviewSource = $state<FxPreviewSource>('primitive');
  let fxProfileAdvanced = $state(false);

  let physicsChannel: BroadcastChannel | null = null;
  let visualChannel: BroadcastChannel | null = null;
  let fxPreviewChannel: BroadcastChannel | null = null;
  let applyTimer: ReturnType<typeof setTimeout> | null = null;
  let visualApplyTimer: ReturnType<typeof setTimeout> | null = null;
  let fxPreviewTimer: ReturnType<typeof setTimeout> | null = null;
  let fxPreviewController: null | { update: (nextPayload: any) => void; trigger: (nextPayload?: any) => void; destroy: () => void } = null;
  let visualDirty = $state(false);
  let visualLivePreview = $state(true);
  let fxLivePreview = $state(true);
  let fxPreviewKind = $state<'merge' | 'molecule' | 'water' | 'fire' | 'explosion'>('merge');
  let fxPreviewIntensity = $state(1);

  const fieldList = ATOM_PHYSICS_FIELDS;
  const presetNames = Object.keys(ATOM_PHYSICS_PRESETS);
  const selectedAtomBase = $derived((atomByZ.get(selectedAtomZ) ?? ATOM_ELEMENTS[0]) as any);
  const selectedAtomOverride = $derived(visualState?.atoms?.[String(selectedAtomZ)] ?? {});
  const selectedAtomSpec = $derived({
    ...selectedAtomBase,
    ...(selectedAtomOverride ?? {}),
    visual: {
      ...((selectedAtomBase?.visual && typeof selectedAtomBase.visual === 'object'
        ? selectedAtomBase.visual
        : {}) as Record<string, number>),
      ...((selectedAtomOverride?.visual && typeof selectedAtomOverride.visual === 'object'
        ? selectedAtomOverride.visual
        : {}) as Record<string, number>),
    },
  });
  const atomRadiusMax = Math.max(...ATOM_ELEMENTS.map((spec) => Number(spec.radius) || 0.4), 0.4);
  const selectedAtomRadiusPercent = $derived.by(() => {
    const r = Number(selectedAtomSpec?.radius ?? selectedAtomBase?.radius ?? 0.9);
    return clamp((r / atomRadiusMax) * 100, 0, 100);
  });
  const selectedMoleculeBase = $derived(moleculeById.get(selectedMoleculeId) ?? MOLECULE_RECIPES[0]);
  const selectedMoleculeOverride = $derived(visualState?.molecules?.[selectedMoleculeId] ?? {});
  const selectedMolecule = $derived({
    ...selectedMoleculeBase,
    ...(selectedMoleculeOverride ?? {}),
    inputs: [...(selectedMoleculeBase?.inputs ?? [])],
  });
  const selectedMoleculePresentation = $derived({
    ...((((selectedMoleculeBase as any)?.presentation &&
      typeof (selectedMoleculeBase as any).presentation === 'object'
      ? (selectedMoleculeBase as any).presentation
      : {}) as Record<string, number>)),
    ...((selectedMoleculeOverride?.presentation &&
    typeof selectedMoleculeOverride.presentation === 'object'
      ? selectedMoleculeOverride.presentation
      : {}) as Record<string, number>),
  });
  const selectedAtomLayers = $derived.by(() => {
    const atomLayers = Array.isArray(selectedAtomOverride?.layers) ? selectedAtomOverride.layers : [];
    if (atomLayers.length > 0) return atomLayers;
    const globalLayers = Array.isArray(visualState?.globals?.layerTemplate)
      ? visualState.globals.layerTemplate
      : [];
    return globalLayers;
  });
  const globalLayerTemplate = $derived.by(() =>
    Array.isArray(visualState?.globals?.layerTemplate) ? visualState.globals.layerTemplate : [],
  );
  const selectedAtomLayer = $derived.by(() => selectedAtomLayers[selectedAtomLayerIndex] ?? selectedAtomLayers[0] ?? null);
  const selectedGlobalLayer = $derived.by(() => globalLayerTemplate[selectedGlobalLayerIndex] ?? globalLayerTemplate[0] ?? null);
  const selectedAtomCollisionRules = $derived.by(() => {
    const rules = Array.isArray(selectedAtomOverride?.collisionRules) ? selectedAtomOverride.collisionRules : [];
    return rules;
  });
  const selectedAtomCollisionRule = $derived.by(
    () => selectedAtomCollisionRules[selectedAtomCollisionRuleIndex] ?? selectedAtomCollisionRules[0] ?? null,
  );
  const fxPrimitives = $derived.by(() => {
    const map =
      visualState?.fxPrimitives && typeof visualState.fxPrimitives === 'object'
        ? visualState.fxPrimitives
        : {};
    return Object.values(map).sort((a: any, b: any) =>
      String(a?.name ?? a?.id ?? '').localeCompare(String(b?.name ?? b?.id ?? '')),
    ) as any[];
  });
  const selectedFxPrimitive = $derived.by(() => {
    const map =
      visualState?.fxPrimitives && typeof visualState.fxPrimitives === 'object'
        ? visualState.fxPrimitives
        : {};
    return map[selectedFxPrimitiveId] ?? fxPrimitives[0] ?? null;
  });
  const fxProfiles = $derived.by(() => {
    const map = visualState?.fxProfiles && typeof visualState.fxProfiles === 'object' ? visualState.fxProfiles : {};
    return Object.values(map).sort((a: any, b: any) =>
      String(a?.name ?? a?.id ?? '').localeCompare(String(b?.name ?? b?.id ?? '')),
    ) as any[];
  });
  const selectedFxProfile = $derived.by(() => {
    const map = visualState?.fxProfiles && typeof visualState.fxProfiles === 'object' ? visualState.fxProfiles : {};
    const profile = map[selectedFxProfileId] ?? fxProfiles[0] ?? null;
    if (!profile) return null;
    const primitivesMap =
      visualState?.fxPrimitives && typeof visualState.fxPrimitives === 'object'
        ? visualState.fxPrimitives
        : {};
    return {
      ...profile,
      stackEntries: (Array.isArray(profile.stack) ? profile.stack : [])
        .map((primitiveId: string) => primitivesMap[primitiveId])
        .filter(Boolean),
    };
  });
  const selectedFxStackPrimitive = $derived.by(() => {
    const stackEntries = Array.isArray(selectedFxProfile?.stackEntries) ? selectedFxProfile.stackEntries : [];
    return stackEntries[selectedFxStackIndex] ?? stackEntries[0] ?? null;
  });
  const activeFxPreviewProfile = $derived.by(() => {
    if (fxPreviewSource === 'primitive' && selectedFxPrimitive) {
      return {
        id: `preview_${selectedFxPrimitive.id}`,
        name: selectedFxPrimitive.name ?? 'Primitive Preview',
        scope: 'both',
        enabled: true,
        burstScale: 1,
        sparkScale: 1,
        dropletScale: 1,
        bondScale: 1,
        smokeScale: 1,
        shatterScale: 1,
        trailScale: 1,
        explosionScale: 1,
        hitPauseScale: 1,
        vibrateScale: 1,
        trailStyle: selectedFxPrimitive.style ?? 'auto',
        elementalMode: 'auto',
        stack: [selectedFxPrimitive.id],
        stackEntries: [selectedFxPrimitive],
      };
    }
    if (fxPreviewSource === 'stackItem' && selectedFxStackPrimitive) {
      return {
        id: `preview_stack_${selectedFxStackPrimitive.id}`,
        name: selectedFxStackPrimitive.name ?? 'Stack Primitive Preview',
        scope: 'both',
        enabled: true,
        burstScale: 1,
        sparkScale: 1,
        dropletScale: 1,
        bondScale: 1,
        smokeScale: 1,
        shatterScale: 1,
        trailScale: 1,
        explosionScale: 1,
        hitPauseScale: 1,
        vibrateScale: 1,
        trailStyle: selectedFxStackPrimitive.style ?? 'auto',
        elementalMode: 'auto',
        stack: [selectedFxStackPrimitive.id],
        stackEntries: [selectedFxStackPrimitive],
      };
    }
    return selectedFxProfile;
  });

  function percentToScale(percent: number, max = 3) {
    return clamp((Number(percent) || 0) / 100 * max, 0, max);
  }

  function scaleToPercent(value: number, max = 3) {
    return clamp(((Number(value) || 0) / max) * 100, 0, 100);
  }

  function percentToOpacity(percent: number) {
    return clamp((Number(percent) || 0) / 100, 0, 1);
  }

  function opacityToPercent(value: number) {
    return clamp((Number(value) || 0) * 100, 0, 100);
  }

  function colorNumberToHex(color: unknown, fallback = '#88bbff') {
    const n = Number(color);
    if (!Number.isFinite(n)) return fallback;
    return `#${Math.max(0, Math.min(0xffffff, Math.floor(n))).toString(16).padStart(6, '0')}`;
  }

  function colorHexToNumber(hex: string, fallback = 0x88bbff) {
    if (typeof hex !== 'string') return fallback;
    const cleaned = hex.trim();
    if (!/^#[0-9a-f]{6}$/i.test(cleaned)) return fallback;
    return Number.parseInt(cleaned.slice(1), 16);
  }

  function mixColor(a: number, b: number, t = 0.5) {
    const p = clamp(Number(t) || 0, 0, 1);
    const ar = (a >> 16) & 255;
    const ag = (a >> 8) & 255;
    const ab = a & 255;
    const br = (b >> 16) & 255;
    const bg = (b >> 8) & 255;
    const bb = b & 255;
    const r = Math.round(ar + (br - ar) * p);
    const g = Math.round(ag + (bg - ag) * p);
    const bch = Math.round(ab + (bb - ab) * p);
    return (r << 16) | (g << 8) | bch;
  }

  function compositionFallbackColor(kind: 'nucleusColor' | 'electronColor' | 'protonColor' | 'neutronColor') {
    const base = Number(selectedAtomSpec?.color ?? selectedAtomBase?.color ?? 0x88bbff) || 0x88bbff;
    if (kind === 'nucleusColor') return mixColor(base, 0x121a25, 0.45);
    if (kind === 'electronColor') return mixColor(base, 0xffffff, 0.2);
    if (kind === 'protonColor') return mixColor(base, 0xff5f5f, 0.34);
    return mixColor(base, 0x95b6d6, 0.42);
  }

  function makeLayer(type = 'cloud', base: Record<string, any> = {}) {
    return {
      id: `${type}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      enabled: base.enabled !== false,
      color: Number.isFinite(Number(base.color)) ? Number(base.color) : undefined,
      sizePct: clamp(Number(base.sizePct ?? 100) || 0, 0, 100),
      opacityPct: clamp(Number(base.opacityPct ?? 100) || 0, 0, 100),
      glowPct: clamp(Number(base.glowPct ?? 0) || 0, 0, 100),
      spinPct: clamp(Number(base.spinPct ?? 0) || 0, 0, 100),
      thicknessPct: clamp(Number(base.thicknessPct ?? 0) || 0, 0, 100),
      count: Math.round(clamp(Number(base.count ?? 1) || 1, 0, 8)),
      orbitRadiusPct: clamp(Number(base.orbitRadiusPct ?? 100) || 0, 0, 180),
      spreadPct: clamp(Number(base.spreadPct ?? 0) || 0, 0, 100),
      tiltPct: clamp(Number(base.tiltPct ?? 50) || 0, 0, 100),
    };
  }

  function normalizeLayerStack(layers: any[] = []) {
    return (Array.isArray(layers) ? layers : [])
      .map((layer) => makeLayer(String(layer?.type ?? 'cloud'), layer))
      .filter((layer) => ATOM_VISUAL_LAYER_TYPES.includes(layer.type));
  }

  function normalizeFxProfileId(raw: unknown, fallback = 'fx_custom') {
    const text = String(raw ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 40);
    return text || fallback;
  }

  function profileMatchesScope(profile: any, scope: 'merge' | 'molecule') {
    const s = String(profile?.scope ?? 'both').toLowerCase();
    return s === 'both' || s === scope;
  }

  function buildFxProfileName(scope: string, idx: number) {
    const root =
      scope === 'merge' ? 'Atom Merge FX' : scope === 'molecule' ? 'Molecule FX' : 'Shared FX';
    return `${root} ${idx}`;
  }

  function fxTypeLabel(type: string | null | undefined) {
    return FX_PRIMITIVE_TYPE_LABELS[String(type ?? '')] ?? String(type ?? 'FX');
  }

  function fxPreviewSourceLabel(source: FxPreviewSource) {
    if (source === 'primitive') return 'Selected FX Block';
    if (source === 'stackItem') return 'Selected Stack Item';
    return 'Full FX Recipe';
  }

  function buildPayload() {
    return sanitizeAtomPhysicsLabPayload({
      preset,
      enabled,
      values,
    });
  }

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  function fieldPercent(field: { min: number; max: number }, value: number) {
    const span = Math.max(0.0000001, field.max - field.min);
    return clamp(((value - field.min) / span) * 100, 0, 100);
  }

  function fieldValueFromPercent(field: { min: number; max: number; step: number }, percent: number) {
    const p = clamp(percent, 0, 100);
    const raw = field.min + (field.max - field.min) * (p / 100);
    const step = Math.max(0.0000001, Number(field.step) || 0.001);
    return Math.round(raw / step) * step;
  }

  function payloadJson() {
    return JSON.stringify(buildPayload(), null, 2);
  }

  function saveAndBroadcastPhysics() {
    const payload = buildPayload();
    if (!payload) return;
    localStorage.setItem(ATOM_PHYSICS_LS_KEY, JSON.stringify(payload));
    physicsChannel?.postMessage(payload);
    jsonInput = JSON.stringify(payload, null, 2);
    status = 'Physics applied to other tabs';
  }

  function scheduleApplyPhysics() {
    if (applyTimer) clearTimeout(applyTimer);
    applyTimer = setTimeout(() => {
      saveAndBroadcastPhysics();
    }, 44);
  }

  function sanitizeAndSaveVisual(nextState: any) {
    const clean = saveAtomVisualLabState(nextState);
    visualState = clean as VisualLabState;
    visualJsonInput = JSON.stringify(clean, null, 2);
    setActiveAtomElements(applyAtomVisualOverrides(ATOM_ELEMENTS, clean));
    visualChannel?.postMessage(clean);
    status = 'Visual overrides saved';
    visualDirty = false;
  }

  function previewVisualToGame() {
    const clean = sanitizeAtomVisualLabState(visualState);
    visualState = clean as VisualLabState;
    visualJsonInput = JSON.stringify(clean, null, 2);
    setActiveAtomElements(applyAtomVisualOverrides(ATOM_ELEMENTS, clean));
    visualChannel?.postMessage(clean);
  }

  function scheduleVisualPreview() {
    if (!visualLivePreview) return;
    if (visualApplyTimer) clearTimeout(visualApplyTimer);
    visualApplyTimer = setTimeout(() => {
      previewVisualToGame();
    }, 120);
  }

  function markVisualDirty(message = 'Visual changes pending. Click Save + Apply.') {
    visualState = sanitizeAtomVisualLabState(visualState) as VisualLabState;
    visualJsonInput = JSON.stringify(visualState, null, 2);
    visualDirty = true;
    status = message;
    scheduleVisualPreview();
  }

  function applyVisualToGame() {
    sanitizeAndSaveVisual(visualState);
  }

  function patchAtom(patch: Record<string, unknown>) {
    const key = String(selectedAtomZ);
    const current = visualState?.atoms?.[key] ?? {};
    visualState = sanitizeAtomVisualLabState({
      ...visualState,
      atoms: {
        ...(visualState?.atoms ?? {}),
        [key]: { ...current, ...patch },
      },
    }) as VisualLabState;
    markVisualDirty();
  }

  function patchAtomVisual(patch: Record<string, unknown>) {
    const current = visualState?.atoms?.[String(selectedAtomZ)] ?? {};
    const currentVisual =
      current?.visual && typeof current.visual === 'object' ? current.visual : {};
    patchAtom({
      visual: { ...currentVisual, ...patch },
    });
  }

  function normalizeCollisionRule(rule: Record<string, any> = {}) {
    return {
      id: String(rule.id ?? `collision_rule_${Math.random().toString(36).slice(2, 8)}`),
      targetAtomicNumber: Math.max(1, Math.round(Number(rule.targetAtomicNumber) || 1)),
      reaction: ATOM_COLLISION_REACTIONS.includes(String(rule.reaction ?? 'none'))
        ? String(rule.reaction ?? 'none')
        : 'none',
      fxId: typeof rule.fxId === 'string' ? rule.fxId : '',
      intensity: clamp(Number(rule.intensity ?? 1) || 1, 0.2, 3),
    };
  }

  function updateAtomCollisionRule(index: number, patch: Record<string, any>) {
    const current = visualState?.atoms?.[String(selectedAtomZ)] ?? {};
    const rules = Array.isArray(current?.collisionRules) ? current.collisionRules.map((rule: any) => normalizeCollisionRule(rule)) : [];
    if (!rules[index]) return;
    rules[index] = normalizeCollisionRule({ ...rules[index], ...patch });
    patchAtom({ collisionRules: rules });
  }

  function addAtomCollisionRule() {
    const current = visualState?.atoms?.[String(selectedAtomZ)] ?? {};
    const rules = Array.isArray(current?.collisionRules) ? current.collisionRules.map((rule: any) => normalizeCollisionRule(rule)) : [];
    rules.push(normalizeCollisionRule({ targetAtomicNumber: 1, reaction: 'storm', fxId: 'collision_special_storm', intensity: 1 }));
    patchAtom({ collisionRules: rules });
    selectedAtomCollisionRuleIndex = rules.length - 1;
  }

  function removeAtomCollisionRule(index: number) {
    const current = visualState?.atoms?.[String(selectedAtomZ)] ?? {};
    const rules = Array.isArray(current?.collisionRules) ? current.collisionRules.map((rule: any) => normalizeCollisionRule(rule)) : [];
    if (!rules[index]) return;
    rules.splice(index, 1);
    patchAtom({ collisionRules: rules });
    selectedAtomCollisionRuleIndex = Math.max(0, Math.min(index, rules.length - 1));
  }

  function patchMolecule(patch: Record<string, unknown>) {
    const id = selectedMoleculeId;
    const current = visualState?.molecules?.[id] ?? {};
    visualState = sanitizeAtomVisualLabState({
      ...visualState,
      molecules: {
        ...(visualState?.molecules ?? {}),
        [id]: { ...current, ...patch },
      },
    }) as VisualLabState;
    markVisualDirty();
  }

  function patchMoleculePresentation(patch: Record<string, unknown>) {
    const id = selectedMoleculeId;
    const current = visualState?.molecules?.[id] ?? {};
    const presentation =
      current?.presentation && typeof current.presentation === 'object' ? current.presentation : {};
    patchMolecule({ presentation: { ...presentation, ...patch } });
  }

  function patchFx(patch: Record<string, number>) {
    visualState = sanitizeAtomVisualLabState({
      ...visualState,
      fx: {
        ...(visualState?.fx ?? ATOM_FX_DEFAULTS),
        ...patch,
      },
    }) as VisualLabState;
    markVisualDirty();
  }

  function patchFxPrimitives(nextPrimitives: Record<string, any>) {
    visualState = sanitizeAtomVisualLabState({
      ...visualState,
      fxPrimitives: nextPrimitives,
    }) as VisualLabState;
    markVisualDirty();
  }

  function patchFxPrimitive(primitiveId: string, patch: Record<string, any>) {
    const id = normalizeFxProfileId(primitiveId, 'fx_primitive');
    const currentPrimitives =
      visualState?.fxPrimitives && typeof visualState.fxPrimitives === 'object' ? visualState.fxPrimitives : {};
    const current = currentPrimitives[id] ?? { ...(ATOM_FX_PRIMITIVE_DEFAULTS.burst_clean ?? {}), id };
    patchFxPrimitives({
      ...currentPrimitives,
      [id]: { ...current, ...patch, id },
    });
  }

  function patchFxProfiles(nextProfiles: Record<string, any>) {
    visualState = sanitizeAtomVisualLabState({
      ...visualState,
      fxProfiles: nextProfiles,
    }) as VisualLabState;
    markVisualDirty();
  }

  function patchFxProfile(profileId: string, patch: Record<string, any>) {
    const id = normalizeFxProfileId(profileId);
    const currentProfiles =
      visualState?.fxProfiles && typeof visualState.fxProfiles === 'object' ? visualState.fxProfiles : {};
    const current = currentProfiles[id] ?? { ...(ATOM_FX_PROFILE_DEFAULTS.merge_default ?? {}), id };
    patchFxProfiles({
      ...currentProfiles,
      [id]: { ...current, ...patch, id },
    });
  }

  function addFxPrimitive(type = 'burst') {
    const currentPrimitives =
      visualState?.fxPrimitives && typeof visualState.fxPrimitives === 'object' ? visualState.fxPrimitives : {};
    const prefix = 'fx_primitive_';
    let id = normalizeFxProfileId(`${prefix}${Object.keys(currentPrimitives).length + 1}`, `${prefix}1`);
    let iter = 2;
    while (currentPrimitives[id]) {
      id = normalizeFxProfileId(`${prefix}${iter}`, `${prefix}${iter}`);
      iter += 1;
    }
    const next = {
      ...currentPrimitives,
      [id]: {
        ...(ATOM_FX_PRIMITIVE_DEFAULTS.burst_clean ?? {}),
        id,
        type,
        name: `FX ${Object.keys(currentPrimitives).length + 1}`,
      },
    };
    patchFxPrimitives(next);
    selectedFxPrimitiveId = id;
  }

  function duplicateFxPrimitive(primitiveId: string) {
    const currentPrimitives =
      visualState?.fxPrimitives && typeof visualState.fxPrimitives === 'object' ? visualState.fxPrimitives : {};
    const source = currentPrimitives[primitiveId];
    if (!source) return;
    let id = normalizeFxProfileId(`${primitiveId}_copy`, `${primitiveId}_copy`);
    let iter = 2;
    while (currentPrimitives[id]) {
      id = normalizeFxProfileId(`${primitiveId}_copy_${iter}`, `${primitiveId}_copy_${iter}`);
      iter += 1;
    }
    patchFxPrimitives({
      ...currentPrimitives,
      [id]: {
        ...source,
        id,
        name: `${source.name ?? source.id} Copy`,
      },
    });
    selectedFxPrimitiveId = id;
  }

  function removeFxPrimitive(primitiveId: string) {
    const id = normalizeFxProfileId(primitiveId);
    if (ATOM_FX_PRIMITIVE_DEFAULTS[id as keyof typeof ATOM_FX_PRIMITIVE_DEFAULTS]) {
      status = 'Built-in primitive cannot be deleted.';
      return;
    }
    const currentPrimitives =
      visualState?.fxPrimitives && typeof visualState.fxPrimitives === 'object' ? visualState.fxPrimitives : {};
    if (!currentPrimitives[id]) return;
    const nextPrimitives = { ...currentPrimitives };
    delete nextPrimitives[id];
    const nextProfiles = { ...(visualState?.fxProfiles ?? {}) };
    for (const [profileId, profile] of Object.entries(nextProfiles)) {
      const stack = Array.isArray((profile as any)?.stack) ? (profile as any).stack.filter((entryId: string) => entryId !== id) : [];
      nextProfiles[profileId] = { ...(profile as any), stack };
    }
    visualState = sanitizeAtomVisualLabState({
      ...visualState,
      fxPrimitives: nextPrimitives,
      fxProfiles: nextProfiles,
    }) as VisualLabState;
    selectedFxPrimitiveId = Object.keys(visualState.fxPrimitives ?? {})[0] ?? 'burst_clean';
    markVisualDirty();
  }

  function updateFxProfileStack(profileId: string, index: number, primitiveId: string) {
    const profile = selectedFxProfile;
    if (!profile || profile.id !== profileId) return;
    const stack = Array.isArray(profile.stack) ? [...profile.stack] : [];
    if (!stack[index]) return;
    stack[index] = primitiveId;
    patchFxProfile(profileId, { stack });
  }

  function addPrimitiveToProfile(profileId: string, primitiveId = selectedFxPrimitiveId || selectedFxPrimitive?.id || 'burst_clean') {
    const profile = selectedFxProfile;
    if (!profile || profile.id !== profileId) return;
    const stack = Array.isArray(profile.stack) ? [...profile.stack] : [];
    stack.push(primitiveId);
    patchFxProfile(profileId, { stack });
    selectedFxStackIndex = stack.length - 1;
    fxPreviewSource = 'stackItem';
  }

  function removePrimitiveFromProfile(profileId: string, index: number) {
    const profile = selectedFxProfile;
    if (!profile || profile.id !== profileId) return;
    const stack = Array.isArray(profile.stack) ? [...profile.stack] : [];
    if (!stack[index]) return;
    stack.splice(index, 1);
    patchFxProfile(profileId, { stack });
    selectedFxStackIndex = Math.max(0, Math.min(index, stack.length - 1));
  }

  function addFxProfile(scope: 'merge' | 'molecule' | 'both' = 'both') {
    const currentProfiles =
      visualState?.fxProfiles && typeof visualState.fxProfiles === 'object' ? visualState.fxProfiles : {};
    const base =
      scope === 'molecule'
        ? ATOM_FX_PROFILE_DEFAULTS.molecule_default
        : ATOM_FX_PROFILE_DEFAULTS.merge_default;
    const prefix = scope === 'molecule' ? 'molecule_fx_' : scope === 'merge' ? 'merge_fx_' : 'fx_';
    let id = normalizeFxProfileId(`${prefix}${Object.keys(currentProfiles).length + 1}`, `${prefix}1`);
    let iter = 2;
    while (currentProfiles[id]) {
      id = normalizeFxProfileId(`${prefix}${iter}`, `${prefix}${iter}`);
      iter += 1;
    }
    const next = {
      ...currentProfiles,
      [id]: {
        ...base,
        id,
        scope,
        name: buildFxProfileName(scope, Object.keys(currentProfiles).length + 1),
      },
    };
    patchFxProfiles(next);
    selectedFxProfileId = id;
  }

  function duplicateFxProfile(profileId: string) {
    const currentProfiles =
      visualState?.fxProfiles && typeof visualState.fxProfiles === 'object' ? visualState.fxProfiles : {};
    const source = currentProfiles[profileId];
    if (!source) return;
    let id = normalizeFxProfileId(`${profileId}_copy`, `${profileId}_copy`);
    let iter = 2;
    while (currentProfiles[id]) {
      id = normalizeFxProfileId(`${profileId}_copy_${iter}`, `${profileId}_copy_${iter}`);
      iter += 1;
    }
    const next = {
      ...currentProfiles,
      [id]: {
        ...source,
        id,
        name: `${source.name ?? source.id} Copy`,
      },
    };
    patchFxProfiles(next);
    selectedFxProfileId = id;
  }

  function removeFxProfile(profileId: string) {
    const id = normalizeFxProfileId(profileId);
    if (ATOM_FX_PROFILE_DEFAULTS[id as keyof typeof ATOM_FX_PROFILE_DEFAULTS]) {
      status = 'Built-in profile cannot be deleted.';
      return;
    }
    const currentProfiles =
      visualState?.fxProfiles && typeof visualState.fxProfiles === 'object' ? visualState.fxProfiles : {};
    if (!currentProfiles[id]) return;
    const nextProfiles = { ...currentProfiles };
    delete nextProfiles[id];

    const nextAtoms = { ...(visualState?.atoms ?? {}) };
    for (const key of Object.keys(nextAtoms)) {
      const atom = nextAtoms[key];
      if (
        atom?.mergeFxId === id ||
        atom?.collisionFxSameId === id ||
        atom?.collisionFxOtherId === id ||
        (Array.isArray(atom?.collisionRules) && atom.collisionRules.some((rule: any) => rule?.fxId === id))
      ) {
        nextAtoms[key] = {
          ...atom,
          ...(atom?.mergeFxId === id ? { mergeFxId: null } : null),
          ...(atom?.collisionFxSameId === id ? { collisionFxSameId: null } : null),
          ...(atom?.collisionFxOtherId === id ? { collisionFxOtherId: null } : null),
          ...(Array.isArray(atom?.collisionRules)
            ? {
                collisionRules: atom.collisionRules.map((rule: any) =>
                  rule?.fxId === id ? { ...rule, fxId: null } : rule,
                ),
              }
            : null),
        };
      }
    }
    const nextMolecules = { ...(visualState?.molecules ?? {}) };
    for (const key of Object.keys(nextMolecules)) {
      const molecule = nextMolecules[key];
      if (molecule?.formationFxId === id) nextMolecules[key] = { ...molecule, formationFxId: null };
    }

    visualState = sanitizeAtomVisualLabState({
      ...visualState,
      fxProfiles: nextProfiles,
      atoms: nextAtoms,
      molecules: nextMolecules,
    }) as VisualLabState;
    const fallbackId = Object.keys(visualState.fxProfiles ?? {})[0] ?? 'merge_default';
    selectedFxProfileId = fallbackId;
    markVisualDirty();
  }

  function patchGlobals(patch: Record<string, any>) {
    visualState = sanitizeAtomVisualLabState({
      ...visualState,
      globals: {
        ...(visualState?.globals ?? ATOM_VISUAL_GLOBAL_DEFAULTS),
        ...patch,
      },
    }) as VisualLabState;
    markVisualDirty();
  }

  function clearAtomOverrides() {
    const atoms = { ...(visualState?.atoms ?? {}) };
    delete atoms[String(selectedAtomZ)];
    visualState = sanitizeAtomVisualLabState({ ...visualState, atoms }) as VisualLabState;
    markVisualDirty();
  }

  function useGlobalAtomLayers() {
    const key = String(selectedAtomZ);
    const atoms = { ...(visualState?.atoms ?? {}) };
    const current = atoms[key] ?? {};
    const next = { ...current };
    delete next.layers;
    if (Object.keys(next).length === 0) delete atoms[key];
    else atoms[key] = next;
    visualState = sanitizeAtomVisualLabState({ ...visualState, atoms }) as VisualLabState;
    selectedAtomLayerIndex = 0;
    markVisualDirty('Atom now uses global layers.');
  }

  function updateAtomLayer(index: number, patch: Record<string, any>) {
    const current = visualState?.atoms?.[String(selectedAtomZ)] ?? {};
    const layers = normalizeLayerStack(current?.layers ?? selectedAtomLayers);
    if (!layers[index]) return;
    layers[index] = makeLayer(layers[index].type, { ...layers[index], ...patch });
    patchAtom({ layers });
  }

  function addAtomLayer(type = 'cloud') {
    const current = visualState?.atoms?.[String(selectedAtomZ)] ?? {};
    const layers = normalizeLayerStack(current?.layers ?? selectedAtomLayers);
    layers.push(makeLayer(type));
    patchAtom({ layers });
    selectedAtomLayerIndex = layers.length - 1;
  }

  function duplicateAtomLayer(index: number) {
    const current = visualState?.atoms?.[String(selectedAtomZ)] ?? {};
    const layers = normalizeLayerStack(current?.layers ?? selectedAtomLayers);
    const layer = layers[index];
    if (!layer) return;
    layers.splice(index + 1, 0, makeLayer(layer.type, { ...layer, id: undefined }));
    patchAtom({ layers });
    selectedAtomLayerIndex = index + 1;
  }

  function moveAtomLayer(index: number, direction: -1 | 1) {
    const current = visualState?.atoms?.[String(selectedAtomZ)] ?? {};
    const layers = normalizeLayerStack(current?.layers ?? selectedAtomLayers);
    const nextIndex = index + direction;
    if (!layers[index] || nextIndex < 0 || nextIndex >= layers.length) return;
    const [layer] = layers.splice(index, 1);
    layers.splice(nextIndex, 0, layer);
    patchAtom({ layers });
    selectedAtomLayerIndex = nextIndex;
  }

  function removeAtomLayer(index: number) {
    const current = visualState?.atoms?.[String(selectedAtomZ)] ?? {};
    const layers = normalizeLayerStack(current?.layers ?? selectedAtomLayers);
    if (!layers[index]) return;
    layers.splice(index, 1);
    patchAtom({ layers });
    selectedAtomLayerIndex = Math.max(0, Math.min(index, layers.length - 1));
  }

  function updateGlobalLayer(index: number, patch: Record<string, any>) {
    const layers = normalizeLayerStack(globalLayerTemplate);
    if (!layers[index]) return;
    layers[index] = makeLayer(layers[index].type, { ...layers[index], ...patch });
    patchGlobals({ layerTemplate: layers });
  }

  function addGlobalLayer(type = 'cloud') {
    const layers = normalizeLayerStack(globalLayerTemplate);
    layers.push(makeLayer(type));
    patchGlobals({ layerTemplate: layers });
    selectedGlobalLayerIndex = layers.length - 1;
  }

  function duplicateGlobalLayer(index: number) {
    const layers = normalizeLayerStack(globalLayerTemplate);
    const layer = layers[index];
    if (!layer) return;
    layers.splice(index + 1, 0, makeLayer(layer.type, { ...layer, id: undefined }));
    patchGlobals({ layerTemplate: layers });
    selectedGlobalLayerIndex = index + 1;
  }

  function moveGlobalLayer(index: number, direction: -1 | 1) {
    const layers = normalizeLayerStack(globalLayerTemplate);
    const nextIndex = index + direction;
    if (!layers[index] || nextIndex < 0 || nextIndex >= layers.length) return;
    const [layer] = layers.splice(index, 1);
    layers.splice(nextIndex, 0, layer);
    patchGlobals({ layerTemplate: layers });
    selectedGlobalLayerIndex = nextIndex;
  }

  function resetGlobalLayers() {
    patchGlobals({ layerTemplate: ATOM_VISUAL_GLOBAL_DEFAULTS.layerTemplate });
    selectedGlobalLayerIndex = 0;
    markVisualDirty('Global layers reset.');
  }

  function removeGlobalLayer(index: number) {
    const layers = normalizeLayerStack(globalLayerTemplate);
    if (!layers[index]) return;
    layers.splice(index, 1);
    patchGlobals({ layerTemplate: layers });
    selectedGlobalLayerIndex = Math.max(0, Math.min(index, layers.length - 1));
  }

  function setSelectedAtomRadiusPercent(percent: number) {
    const p = clamp(percent, 0, 100);
    const radius = atomRadiusMax * (p / 100);
    patchAtom({ radius });
  }

  function layerOuterDiameterPct(layer: any) {
    return clamp(Number(layer?.sizePct ?? 100) || 0, 0, 100);
  }

  function layerSupportsThickness(layer: any) {
    return String(layer?.type ?? '') === 'shell';
  }

  function primitiveSupportsRadius(type: string | null | undefined) {
    return ['attractor', 'orbit', 'trails', 'sparkStorm'].includes(String(type ?? ''));
  }

  function primitiveSupportsSpread(type: string | null | undefined) {
    return ['attractor', 'orbit', 'trails', 'sparkStorm'].includes(String(type ?? ''));
  }

  function openFxProfileEditor(profileId: string | null | undefined, fallbackKind: 'merge' | 'molecule') {
    const nextId = profileId || (fallbackKind === 'merge' ? 'merge_default' : 'molecule_default');
    selectedFxProfileId = nextId;
    fxEditorSection = 'profiles';
    fxPreviewSource = 'profile';
    fxPreviewKind = fallbackKind === 'merge' ? 'merge' : 'molecule';
    activePanel = 'effects';
  }

  function clearMoleculeOverrides() {
    const molecules = { ...(visualState?.molecules ?? {}) };
    delete molecules[selectedMoleculeId];
    visualState = sanitizeAtomVisualLabState({ ...visualState, molecules }) as VisualLabState;
    markVisualDirty();
  }

  function resetFxOverrides() {
    visualState = sanitizeAtomVisualLabState({
      ...visualState,
      fx: { ...ATOM_FX_DEFAULTS },
    }) as VisualLabState;
    markVisualDirty();
  }

  function visualPayloadJson() {
    return JSON.stringify(sanitizeAtomVisualLabState(visualState), null, 2);
  }

  async function copyVisualJson() {
    try {
      await navigator.clipboard.writeText(visualPayloadJson());
      status = 'Copied visual JSON';
    } catch {
      status = 'Clipboard blocked';
    }
  }

  function downloadVisualJson() {
    const blob = new Blob([visualPayloadJson()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atom-visual-config.json';
    a.click();
    URL.revokeObjectURL(url);
    status = 'Downloaded atom-visual-config.json';
  }

  function importVisualJson() {
    try {
      const parsed = sanitizeAtomVisualLabState(JSON.parse(visualJsonInput));
      visualState = parsed as VisualLabState;
      visualJsonInput = JSON.stringify(parsed, null, 2);
      visualDirty = true;
      status = 'Imported visual JSON. Click Save + Apply.';
    } catch {
      status = 'Invalid visual JSON';
    }
  }

  function applyPreset(name: string) {
    if (!isAtomPresetName(name)) return;
    preset = name;
    values = cloneAtomPreset(name);
    status = `Preset applied: ${name}`;
    scheduleApplyPhysics();
  }

  function resetToPreset() {
    values = cloneAtomPreset(preset);
    scheduleApplyPhysics();
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(payloadJson());
      status = 'Copied physics JSON';
    } catch {
      status = 'Clipboard blocked';
    }
  }

  function downloadJson() {
    const blob = new Blob([payloadJson()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atom-physics-config.json';
    a.click();
    URL.revokeObjectURL(url);
    status = 'Downloaded atom-physics-config.json';
  }

  function importJson() {
    try {
      const parsed = sanitizeAtomPhysicsLabPayload(JSON.parse(jsonInput));
      if (!parsed) {
        status = 'Invalid JSON';
        return;
      }
      preset = isAtomPresetName(parsed.preset) ? parsed.preset : ATOM_PHYSICS_DEFAULT_PRESET;
      enabled = parsed.enabled !== false;
      values = { ...cloneAtomPreset(preset), ...parsed.values };
      saveAndBroadcastPhysics();
      status = 'Imported physics JSON';
    } catch {
      status = 'Invalid JSON';
    }
  }

  function openAtomsGameTab() {
    const url = `${window.location.origin}${window.location.pathname}?play=1&mode=atoms`;
    window.open(url, '_blank', 'noopener');
  }

  function setActivePanel(panelId: FxPanelId) {
    activePanel = panelId;
    panelMenuOpen = false;
  }

  function triggerFxPreview(kind: 'merge' | 'molecule' | 'water' | 'fire' | 'explosion' = fxPreviewKind) {
    const profile = activeFxPreviewProfile ?? null;
    const payload = {
      kind,
      intensity: fxPreviewIntensity,
      color: colorHexToNumber(colorNumberToHex(selectedAtomSpec?.color ?? 0x88bbff)),
      profile,
      fxConfig: visualState?.fx ?? ATOM_FX_DEFAULTS,
    };
    fxPreviewController?.trigger(payload);
    fxPreviewChannel?.postMessage(payload);
    status = `FX preview: ${kind}`;
  }

  function assignSelectedProfileToAtomMerge() {
    if (!selectedFxProfile?.id) return;
    patchAtom({ mergeFxId: selectedFxProfile.id });
    status = `Assigned ${selectedFxProfile.name} to ${selectedAtomSpec?.symbol ?? 'atom'} merge`;
  }

  function assignSelectedProfileToMoleculeFormation() {
    if (!selectedFxProfile?.id || !selectedMoleculeId) return;
    patchMolecule({ formationFxId: selectedFxProfile.id });
    status = `Assigned ${selectedFxProfile.name} to ${selectedMolecule?.formula ?? 'molecule'} formation`;
  }

  function scheduleFxPreview(kind: 'merge' | 'molecule' | 'water' | 'fire' | 'explosion' = fxPreviewKind) {
    if (!fxLivePreview) return;
    if (fxPreviewTimer) clearTimeout(fxPreviewTimer);
    fxPreviewTimer = setTimeout(() => {
      triggerFxPreview(kind);
    }, 110);
  }

  function fxPreviewViewport(node: HTMLDivElement, payload: any) {
    let mounted = true;
    let controller: null | { update: (nextPayload: any) => void; trigger: (nextPayload?: any) => void; destroy: () => void } = null;
    let seq = 0;

    async function render(nextPayload: any) {
      const token = ++seq;
      const { mountFxMiniPreview } = await import('../game/fx-mini-preview.js');
      if (!mounted || token !== seq) return;
      if (!controller) {
        controller = mountFxMiniPreview(node, nextPayload);
        fxPreviewController = controller;
        return;
      }
      controller.update(nextPayload);
      fxPreviewController = controller;
    }

    render(payload);
    return {
      update(nextPayload: any) {
        render(nextPayload);
      },
      destroy() {
        mounted = false;
        if (fxPreviewController === controller) fxPreviewController = null;
        controller?.destroy();
        controller = null;
      },
    };
  }

  function atomPreview(node: HTMLDivElement, payload: any) {
    let mounted = true;
    let controller: null | { update: (nextPayload: any) => void; destroy: () => void } = null;
    let seq = 0;

    async function render(nextPayload: any) {
      const token = ++seq;
      if (!nextPayload?.spec) return;
      const { mountAtomMiniPreview } = await import('../game/atom-mini-preview.js');
      if (!mounted || token !== seq) return;
      if (!controller) {
        controller = mountAtomMiniPreview(node, nextPayload);
        return;
      }
      controller.update(nextPayload);
    }

    render(payload);
    return {
      update(nextPayload: any) {
        render(nextPayload);
      },
      destroy() {
        mounted = false;
        controller?.destroy();
        controller = null;
      },
    };
  }

  function moleculePreview(node: HTMLDivElement, payload: any) {
    let mounted = true;
    let controller: null | { update: (nextPayload: any) => void; destroy: () => void } = null;
    let seq = 0;

    async function render(nextPayload: any) {
      const token = ++seq;
      if (!nextPayload?.recipe) return;
      const { mountMoleculeMiniPreview } = await import('../game/molecule-mini-preview.js');
      if (!mounted || token !== seq) return;
      if (!controller) {
        controller = mountMoleculeMiniPreview(node, {
          recipe: nextPayload.recipe,
        } as any);
        return;
      }
      controller.update({
        recipe: nextPayload.recipe,
      } as any);
    }

    render(payload);
    return {
      update(nextPayload: any) {
        render(nextPayload);
      },
      destroy() {
        mounted = false;
        controller?.destroy();
        controller = null;
      },
    };
  }

  $effect(() => {
    const primitiveKeys = Object.keys(
      visualState?.fxPrimitives && typeof visualState.fxPrimitives === 'object' ? visualState.fxPrimitives : {},
    );
    if (primitiveKeys.length <= 0) return;
    if (!primitiveKeys.includes(selectedFxPrimitiveId)) {
      selectedFxPrimitiveId = primitiveKeys[0];
    }
  });

  $effect(() => {
    const profileKeys = Object.keys(
      visualState?.fxProfiles && typeof visualState.fxProfiles === 'object' ? visualState.fxProfiles : {},
    );
    if (profileKeys.length <= 0) return;
    if (!profileKeys.includes(selectedFxProfileId)) {
      selectedFxProfileId = profileKeys[0];
    }
  });

  $effect(() => {
    const count = Array.isArray(selectedFxProfile?.stackEntries) ? selectedFxProfile.stackEntries.length : 0;
    if (count <= 0) {
      selectedFxStackIndex = 0;
      if (fxPreviewSource === 'stackItem') fxPreviewSource = 'profile';
      return;
    }
    if (selectedFxStackIndex >= count) selectedFxStackIndex = count - 1;
  });

  $effect(() => {
    const count = Array.isArray(selectedAtomLayers) ? selectedAtomLayers.length : 0;
    if (count <= 0) {
      selectedAtomLayerIndex = 0;
      return;
    }
    if (selectedAtomLayerIndex >= count) selectedAtomLayerIndex = count - 1;
  });

  $effect(() => {
    const count = Array.isArray(selectedAtomCollisionRules) ? selectedAtomCollisionRules.length : 0;
    if (count <= 0) {
      selectedAtomCollisionRuleIndex = 0;
      return;
    }
    if (selectedAtomCollisionRuleIndex >= count) selectedAtomCollisionRuleIndex = count - 1;
  });

  $effect(() => {
    const count = Array.isArray(globalLayerTemplate) ? globalLayerTemplate.length : 0;
    if (count <= 0) {
      selectedGlobalLayerIndex = 0;
      return;
    }
    if (selectedGlobalLayerIndex >= count) selectedGlobalLayerIndex = count - 1;
  });

  $effect(() => {
    if (activePanel !== 'effects') return;
    if (!fxLivePreview) return;
    const profileId = activeFxPreviewProfile?.id ?? '';
    const profileSig = JSON.stringify(activeFxPreviewProfile ?? null);
    const fxSig = JSON.stringify(visualState?.fx ?? ATOM_FX_DEFAULTS);
    const previewSig = `${fxPreviewKind}:${fxPreviewIntensity}:${profileId}:${profileSig}:${fxSig}:${selectedAtomSpec?.color ?? 0}`;
    if (!previewSig) return;
    scheduleFxPreview(fxPreviewKind);
  });

  onMount(() => {
    try {
      const raw = localStorage.getItem(ATOM_PHYSICS_LS_KEY);
      if (raw) {
        const parsed = sanitizeAtomPhysicsLabPayload(JSON.parse(raw));
        if (parsed) {
          preset = isAtomPresetName(parsed.preset) ? parsed.preset : ATOM_PHYSICS_DEFAULT_PRESET;
          enabled = parsed.enabled !== false;
          values = { ...cloneAtomPreset(preset), ...parsed.values };
        }
      }
    } catch {}

    visualState = loadAtomVisualLabState() as VisualLabState;
    jsonInput = payloadJson();
    visualJsonInput = visualPayloadJson();
    saveAndBroadcastPhysics();
    visualDirty = false;
    if (typeof BroadcastChannel !== 'undefined') {
      physicsChannel = new BroadcastChannel(ATOM_PHYSICS_BROADCAST_CHANNEL);
      visualChannel = new BroadcastChannel(ATOM_VISUAL_LAB_BROADCAST_CHANNEL);
      fxPreviewChannel = new BroadcastChannel(ATOM_FX_PREVIEW_BROADCAST_CHANNEL);
    }
    return () => {
      if (applyTimer) clearTimeout(applyTimer);
      if (visualApplyTimer) clearTimeout(visualApplyTimer);
      if (fxPreviewTimer) clearTimeout(fxPreviewTimer);
      physicsChannel?.close();
      visualChannel?.close();
      fxPreviewChannel?.close();
      physicsChannel = null;
      visualChannel = null;
      fxPreviewChannel = null;
    };
  });
</script>

<main class="lab-shell">
  <section class="lab-card">
    <header class="lab-top">
      <div>
        <h1>Atom Lab</h1>
        <p>Physics + visual tuning. Open this tab and one game tab for fast iteration.</p>
      </div>
      <div class="top-actions">
        <button class="ghost nav-toggle" onclick={() => (panelMenuOpen = !panelMenuOpen)}>☰ Panels</button>
        <button class="ghost" onclick={openAtomsGameTab}>Open Atoms Tab</button>
        <button class="ghost" onclick={onBack}>Back</button>
      </div>
    </header>

    <nav class="panel-switch {panelMenuOpen ? 'is-open' : ''}">
      {#each LAB_PANELS as panel}
        <button
          class="ghost tiny {activePanel === panel.id ? 'is-active' : ''}"
          onclick={() => setActivePanel(panel.id)}
        >
          {panel.label}
        </button>
      {/each}
    </nav>

    {#if activePanel === 'physics'}
    <section class="panel">
      <h2>Physics</h2>
      <div class="row">
        <label class="field">
          <span>Preset</span>
          <select
            value={preset}
            onchange={(event) => applyPreset((event.currentTarget as HTMLSelectElement).value)}
          >
            {#each presetNames as name}
              <option value={name}>{name}</option>
            {/each}
          </select>
        </label>
        <label class="field switch">
          <span>Enable Override</span>
          <input
            type="checkbox"
            checked={enabled}
            onchange={(event) => {
              enabled = (event.currentTarget as HTMLInputElement).checked;
              scheduleApplyPhysics();
            }}
          />
        </label>
      </div>

      <div class="sliders">
        {#each fieldList as field}
          <label class="slider-row">
            <div class="label-row">
              <span>{field.label}</span>
              <span class="help-wrap">
                <button
                  type="button"
                  class="help-btn"
                  aria-label={`About ${field.label}`}
                >
                  i
                </button>
                <span class="help-bubble">{field.help}</span>
              </span>
              <strong>{formatPhysicsFieldValue(field.key, values[field.key] ?? 0)}</strong>
            </div>
            <div class="slider-stack">
              <div class="percent-row">
                <span class="percent-label">{fieldPercent(field, values[field.key] ?? field.min).toFixed(1)}%</span>
                <input
                  class="percent-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={fieldPercent(field, values[field.key] ?? field.min)}
                  oninput={(event) => {
                    const p = Number((event.currentTarget as HTMLInputElement).value);
                    const v = fieldValueFromPercent(field, p);
                    values = { ...values, [field.key]: v };
                    scheduleApplyPhysics();
                  }}
                />
                <input
                  class="value-input"
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={values[field.key] ?? 0}
                  oninput={(event) => {
                    const raw = Number((event.currentTarget as HTMLInputElement).value);
                    const v = clamp(raw, field.min, field.max);
                    values = { ...values, [field.key]: v };
                    scheduleApplyPhysics();
                  }}
                />
              </div>
            </div>
          </label>
        {/each}
      </div>

      <div class="actions">
        <button class="ghost" onclick={resetToPreset}>Reset To Preset</button>
        <button class="ghost" onclick={saveAndBroadcastPhysics}>Apply Now</button>
        <button class="ghost" onclick={copyJson}>Copy JSON</button>
        <button class="ghost" onclick={downloadJson}>Download JSON</button>
        <button class="ghost" onclick={importJson}>Import JSON</button>
      </div>
      <textarea bind:value={jsonInput} spellcheck="false"></textarea>
    </section>
    {/if}

    {#if activePanel !== 'physics' && activePanel !== 'json'}
    <section class="panel">
      <h2>Visual Lab</h2>
      <div class="visual-grid">
        {#if activePanel === 'atom'}
        <article class="editor-card">
          <header class="editor-head">
            <h3>Atom Studio</h3>
            <button class="ghost tiny" onclick={clearAtomOverrides}>Reset Atom</button>
          </header>
          <label class="field">
            <span>Atom</span>
            <select
              value={String(selectedAtomZ)}
              onchange={(event) => {
                selectedAtomZ = Number((event.currentTarget as HTMLSelectElement).value);
              }}
            >
              {#each atomOptions as option}
                <option value={option.z}>{option.label}</option>
              {/each}
            </select>
          </label>
          <nav class="fx-nav section-nav">
            <button class="ghost tiny {atomEditorSection === 'basics' ? 'is-active' : ''}" type="button" onclick={() => (atomEditorSection = 'basics')}>Basics</button>
            <button class="ghost tiny {atomEditorSection === 'layers' ? 'is-active' : ''}" type="button" onclick={() => (atomEditorSection = 'layers')}>Layers</button>
            <button class="ghost tiny {atomEditorSection === 'composition' ? 'is-active' : ''}" type="button" onclick={() => (atomEditorSection = 'composition')}>Particles</button>
            <button class="ghost tiny {atomEditorSection === 'material' ? 'is-active' : ''}" type="button" onclick={() => (atomEditorSection = 'material')}>Material</button>
            <button class="ghost tiny {atomEditorSection === 'fx' ? 'is-active' : ''}" type="button" onclick={() => (atomEditorSection = 'fx')}>FX</button>
          </nav>
          <div class="editor-split">
            <div class="editor-main">
          {#if atomEditorSection === 'basics'}
          <div class="mini-grid">
            <label class="field">
              <span>Ball Diameter % (0-100)</span>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={selectedAtomRadiusPercent}
                oninput={(event) => setSelectedAtomRadiusPercent(Number((event.currentTarget as HTMLInputElement).value))}
              />
            </label>
            <label class="field">
              <span>Ball Radius (raw)</span>
              <input
                type="number"
                min="0"
                max="6"
                step="0.001"
                value={selectedAtomSpec?.radius ?? selectedAtomBase?.radius ?? 0.9}
                oninput={(event) => patchAtom({ radius: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Fallback Body Color</span>
              <input
                type="color"
                value={colorNumberToHex(selectedAtomSpec?.color, '#88bbff')}
                oninput={(event) =>
                  patchAtom({ color: colorHexToNumber((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Symbol</span>
              <input
                type="text"
                value={selectedAtomSpec?.symbol ?? ''}
                maxlength="4"
                oninput={(event) => patchAtom({ symbol: (event.currentTarget as HTMLInputElement).value })}
              />
            </label>
            <label class="field">
              <span>Name</span>
              <input
                type="text"
                value={selectedAtomSpec?.name ?? ''}
                maxlength="42"
                oninput={(event) => patchAtom({ name: (event.currentTarget as HTMLInputElement).value })}
              />
            </label>
            <label class="field">
              <span>Phase</span>
              <select
                value={selectedAtomSpec?.phase ?? 'solid'}
                onchange={(event) => patchAtom({ phase: (event.currentTarget as HTMLSelectElement).value })}
              >
                <option value="solid">solid</option>
                <option value="liquid">liquid</option>
                <option value="gas">gas</option>
              </select>
            </label>
          </div>
          {/if}
          {#if atomEditorSection === 'composition'}
          <section class="composition-colors section-card">
            <h4>Particle Colors</h4>
            <div class="composition-grid">
              <label class="field composition-field">
                <span>Nucleus</span>
                <input
                  type="color"
                  value={colorNumberToHex(
                    selectedAtomSpec?.visual?.nucleusColor,
                    colorNumberToHex(compositionFallbackColor('nucleusColor'), '#809db8'),
                  )}
                  oninput={(event) =>
                    patchAtomVisual({ nucleusColor: colorHexToNumber((event.currentTarget as HTMLInputElement).value) })}
                />
              </label>
              <label class="field composition-field">
                <span>Electron Cloud</span>
                <input
                  type="color"
                  value={colorNumberToHex(
                    selectedAtomSpec?.visual?.electronColor,
                    colorNumberToHex(compositionFallbackColor('electronColor'), '#a0d0ff'),
                  )}
                  oninput={(event) =>
                    patchAtomVisual({ electronColor: colorHexToNumber((event.currentTarget as HTMLInputElement).value) })}
                />
              </label>
              <label class="field composition-field">
                <span>Proton Dot</span>
                <input
                  type="color"
                  value={colorNumberToHex(
                    selectedAtomSpec?.visual?.protonColor,
                    colorNumberToHex(compositionFallbackColor('protonColor'), '#ff7c7c'),
                  )}
                  oninput={(event) =>
                    patchAtomVisual({ protonColor: colorHexToNumber((event.currentTarget as HTMLInputElement).value) })}
                />
              </label>
              <label class="field composition-field">
                <span>Neutron Dot</span>
                <input
                  type="color"
                  value={colorNumberToHex(
                    selectedAtomSpec?.visual?.neutronColor,
                    colorNumberToHex(compositionFallbackColor('neutronColor'), '#9dc0dd'),
                  )}
                  oninput={(event) =>
                    patchAtomVisual({ neutronColor: colorHexToNumber((event.currentTarget as HTMLInputElement).value) })}
                />
              </label>
              <label class="field composition-field">
                <span>Electron Count</span>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  value={selectedAtomSpec?.visual?.electronCount ?? selectedAtomSpec?.visual?.shellCount ?? 2}
                  oninput={(event) =>
                    patchAtomVisual({ electronCount: Number((event.currentTarget as HTMLInputElement).value) })}
                />
              </label>
              <label class="field composition-field">
                <span>Electron Speed</span>
                <input
                  type="range"
                  min="0"
                  max="1.8"
                  step="0.01"
                  value={selectedAtomSpec?.visual?.electronSpeed ?? selectedAtomSpec?.visual?.shellSpin ?? 0.34}
                  oninput={(event) =>
                    patchAtomVisual({ electronSpeed: Number((event.currentTarget as HTMLInputElement).value) })}
                />
              </label>
            </div>
          </section>
          {/if}
          {#if atomEditorSection === 'layers'}
          <div class="layers-card">
            <div class="layers-head">
              <h4>Atom Layers</h4>
              <div class="actions">
                <button class="ghost tiny" type="button" onclick={() => addAtomLayer('core')}>+ Core</button>
                <button class="ghost tiny" type="button" onclick={() => addAtomLayer('cloud')}>+ Cloud</button>
                <button class="ghost tiny" type="button" onclick={() => addAtomLayer('shell')}>+ Shell</button>
                <button class="ghost tiny" type="button" onclick={() => addAtomLayer('halo')}>+ Halo</button>
                <button class="ghost tiny" type="button" onclick={useGlobalAtomLayers}>Use Global</button>
              </div>
            </div>
            <label class="field">
              <span>Selected Layer</span>
              <select
                value={String(selectedAtomLayerIndex)}
                onchange={(event) => {
                  selectedAtomLayerIndex = Number((event.currentTarget as HTMLSelectElement).value);
                }}
              >
                {#each selectedAtomLayers as layer, idx}
                  <option value={String(idx)}>{idx + 1}. {layer.type}{layer.enabled === false ? ' · off' : ''}</option>
                {/each}
              </select>
            </label>
            {#if selectedAtomLayer}
              <div class="layer-row selected-layer-card">
                <div class="layer-line">
                  <label class="field">
                    <span>Type</span>
                    <select
                      value={selectedAtomLayer.type}
                      onchange={(event) => updateAtomLayer(selectedAtomLayerIndex, { type: (event.currentTarget as HTMLSelectElement).value })}
                    >
                      {#each ATOM_VISUAL_LAYER_TYPES as layerType}
                        <option value={layerType}>{layerType}</option>
                      {/each}
                    </select>
                  </label>
                  <label class="field switch">
                    <span>On</span>
                    <input
                      type="checkbox"
                      checked={selectedAtomLayer.enabled !== false}
                      onchange={(event) => updateAtomLayer(selectedAtomLayerIndex, { enabled: (event.currentTarget as HTMLInputElement).checked })}
                    />
                  </label>
                  <button class="ghost tiny" type="button" disabled={selectedAtomLayerIndex <= 0} onclick={() => moveAtomLayer(selectedAtomLayerIndex, -1)}>Up</button>
                  <button class="ghost tiny" type="button" disabled={selectedAtomLayerIndex >= selectedAtomLayers.length - 1} onclick={() => moveAtomLayer(selectedAtomLayerIndex, 1)}>Down</button>
                  <button class="ghost tiny" type="button" onclick={() => duplicateAtomLayer(selectedAtomLayerIndex)}>Duplicate</button>
                  <button class="ghost tiny" type="button" disabled={selectedAtomLayers.length <= 1} onclick={() => removeAtomLayer(selectedAtomLayerIndex)}>Delete Layer</button>
                </div>
                <div class="layer-grid">
                  <label class="field"><span>Layer Color</span><input type="color" value={colorNumberToHex(selectedAtomLayer.color, '#88bbff')} oninput={(event) => updateAtomLayer(selectedAtomLayerIndex, { color: colorHexToNumber((event.currentTarget as HTMLInputElement).value) })} /></label>
                  <label class="field"><span>Diameter %</span><input type="range" min="0" max="100" step="0.1" value={layerOuterDiameterPct(selectedAtomLayer)} oninput={(event) => updateAtomLayer(selectedAtomLayerIndex, { sizePct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  <label class="field"><span>Opacity %</span><input type="range" min="0" max="100" step="0.1" value={selectedAtomLayer.opacityPct ?? 100} oninput={(event) => updateAtomLayer(selectedAtomLayerIndex, { opacityPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  <label class="field"><span>Glow %</span><input type="range" min="0" max="100" step="0.1" value={selectedAtomLayer.glowPct ?? 0} oninput={(event) => updateAtomLayer(selectedAtomLayerIndex, { glowPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  <label class="field"><span>Spin %</span><input type="range" min="0" max="100" step="0.1" value={selectedAtomLayer.spinPct ?? 0} oninput={(event) => updateAtomLayer(selectedAtomLayerIndex, { spinPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  {#if layerSupportsThickness(selectedAtomLayer)}
                    <label class="field"><span>Ring Thickness %</span><input type="range" min="0" max="100" step="0.1" value={selectedAtomLayer.thicknessPct ?? 0} oninput={(event) => updateAtomLayer(selectedAtomLayerIndex, { thicknessPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                    <label class="field"><span>Ring Copies</span><input type="range" min="1" max="8" step="1" value={selectedAtomLayer.count ?? 1} oninput={(event) => updateAtomLayer(selectedAtomLayerIndex, { count: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                    <label class="field"><span>Orbit Radius %</span><input type="range" min="0" max="180" step="0.1" value={selectedAtomLayer.orbitRadiusPct ?? 100} oninput={(event) => updateAtomLayer(selectedAtomLayerIndex, { orbitRadiusPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                    <label class="field"><span>Ring Spread %</span><input type="range" min="0" max="100" step="0.1" value={selectedAtomLayer.spreadPct ?? 0} oninput={(event) => updateAtomLayer(selectedAtomLayerIndex, { spreadPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                    <label class="field"><span>Tilt %</span><input type="range" min="0" max="100" step="0.1" value={selectedAtomLayer.tiltPct ?? 50} oninput={(event) => updateAtomLayer(selectedAtomLayerIndex, { tiltPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  {/if}
                </div>
                <p class="formula-note">
                  {#if layerSupportsThickness(selectedAtomLayer)}
                    Shell is the orbit ring layer. Use copies, orbit radius, spread, tilt, spin and thickness to build vivid atomic rings.
                  {:else}
                    Filled layers stay solid. Use opacity and a shell layer above them for a hollow or orbital look.
                  {/if}
                </p>
              </div>
            {/if}
          </div>
          {/if}
          {#if atomEditorSection === 'material'}
          <div class="mini-grid">
            <label class="field">
              <span>Roughness</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedAtomSpec?.visual?.roughness ?? 0.3}
                oninput={(event) => patchAtomVisual({ roughness: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Metalness</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedAtomSpec?.visual?.metalness ?? 0.08}
                oninput={(event) => patchAtomVisual({ metalness: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Transmission</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedAtomSpec?.visual?.transmission ?? 0.28}
                oninput={(event) => patchAtomVisual({ transmission: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Clearcoat</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={selectedAtomSpec?.visual?.clearcoat ?? 0.35}
                oninput={(event) => patchAtomVisual({ clearcoat: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>IOR</span>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.01"
                value={selectedAtomSpec?.visual?.ior ?? 1.52}
                oninput={(event) => patchAtomVisual({ ior: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Env Intensity</span>
              <input
                type="range"
                min="0"
                max="3"
                step="0.01"
                value={selectedAtomSpec?.visual?.envMapIntensity ?? 1}
                oninput={(event) => patchAtomVisual({ envMapIntensity: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
          </div>
          {/if}
          {#if atomEditorSection === 'fx'}
          <div class="layers-card">
            <div class="layers-head">
              <h4>Atom Merge Effect</h4>
            </div>
            <label class="field">
              <span>Assigned FX Recipe</span>
              <select
                value={selectedAtomSpec?.mergeFxId ?? ''}
                onchange={(event) => patchAtom({ mergeFxId: (event.currentTarget as HTMLSelectElement).value || null })}
              >
                <option value="">None (default merge)</option>
                {#each fxProfiles.filter((profile) => profileMatchesScope(profile, 'merge')) as profile}
                  <option value={profile.id}>{profile.name} · {profile.id}</option>
                {/each}
              </select>
            </label>
            <div class="actions">
              <button
                class="ghost tiny"
                type="button"
                onclick={() => openFxProfileEditor(selectedAtomSpec?.mergeFxId ?? 'merge_default', 'merge')}
              >
                Open In FX Studio
              </button>
            </div>
            <p class="formula-note">
              Atoms use `merge_default` unless you assign a custom merge profile here.
            </p>
          </div>
          <div class="layers-card">
            <div class="layers-head">
              <h4>Collision FX</h4>
              <div class="actions">
                <button class="ghost tiny" type="button" onclick={() => openFxProfileEditor(selectedAtomSpec?.collisionFxSameId ?? 'collision_same_pop', 'merge')}>Edit Same</button>
                <button class="ghost tiny" type="button" onclick={() => openFxProfileEditor(selectedAtomSpec?.collisionFxOtherId ?? 'collision_other_flash', 'merge')}>Edit Other</button>
              </div>
            </div>
            <div class="mini-grid">
              <label class="field">
                <span>Same Atom FX</span>
                <select
                  value={selectedAtomSpec?.collisionFxSameId ?? ''}
                  onchange={(event) => patchAtom({ collisionFxSameId: (event.currentTarget as HTMLSelectElement).value || null })}
                >
                  <option value="">Default same collision</option>
                  {#each fxProfiles.filter((profile) => profileMatchesScope(profile, 'merge')) as profile}
                    <option value={profile.id}>{profile.name} · {profile.id}</option>
                  {/each}
                </select>
              </label>
              <label class="field">
                <span>Other Atom FX</span>
                <select
                  value={selectedAtomSpec?.collisionFxOtherId ?? ''}
                  onchange={(event) => patchAtom({ collisionFxOtherId: (event.currentTarget as HTMLSelectElement).value || null })}
                >
                  <option value="">Default other collision</option>
                  {#each fxProfiles.filter((profile) => profileMatchesScope(profile, 'merge')) as profile}
                    <option value={profile.id}>{profile.name} · {profile.id}</option>
                  {/each}
                </select>
              </label>
            </div>
            <p class="formula-note">
              These play on atom-to-atom contact before any merge. Same-type and different-type collisions can feel different.
            </p>
          </div>
          <div class="layers-card">
            <div class="layers-head">
              <h4>Special Collision Links</h4>
              <div class="actions">
                <button class="ghost tiny" type="button" onclick={addAtomCollisionRule}>+ Rule</button>
              </div>
            </div>
            {#if selectedAtomCollisionRules.length > 0}
              <label class="field">
                <span>Rule</span>
                <select
                  value={String(selectedAtomCollisionRuleIndex)}
                  onchange={(event) => (selectedAtomCollisionRuleIndex = Number((event.currentTarget as HTMLSelectElement).value))}
                >
                  {#each selectedAtomCollisionRules as rule, idx}
                    <option value={String(idx)}>{idx + 1}. {selectedAtomSpec?.symbol} + {(atomByZ.get(rule.targetAtomicNumber)?.symbol ?? `Z${rule.targetAtomicNumber}`)}</option>
                  {/each}
                </select>
              </label>
              {#if selectedAtomCollisionRule}
                <div class="mini-grid">
                  <label class="field">
                    <span>Target Atom</span>
                    <select
                      value={String(selectedAtomCollisionRule.targetAtomicNumber)}
                      onchange={(event) => updateAtomCollisionRule(selectedAtomCollisionRuleIndex, { targetAtomicNumber: Number((event.currentTarget as HTMLSelectElement).value) })}
                    >
                      {#each atomOptions as option}
                        <option value={String(option.z)}>{option.label}</option>
                      {/each}
                    </select>
                  </label>
                  <label class="field">
                    <span>Reaction</span>
                    <select
                      value={selectedAtomCollisionRule.reaction ?? 'none'}
                      onchange={(event) => updateAtomCollisionRule(selectedAtomCollisionRuleIndex, { reaction: (event.currentTarget as HTMLSelectElement).value })}
                    >
                      {#each ATOM_COLLISION_REACTIONS as reaction}
                        <option value={reaction}>{reaction}</option>
                      {/each}
                    </select>
                  </label>
                  <label class="field">
                    <span>FX Recipe</span>
                    <select
                      value={selectedAtomCollisionRule.fxId ?? ''}
                      onchange={(event) => updateAtomCollisionRule(selectedAtomCollisionRuleIndex, { fxId: (event.currentTarget as HTMLSelectElement).value || null })}
                    >
                      <option value="">Use reaction default</option>
                      {#each fxProfiles.filter((profile) => profileMatchesScope(profile, 'merge')) as profile}
                        <option value={profile.id}>{profile.name} · {profile.id}</option>
                      {/each}
                    </select>
                  </label>
                  <label class="field">
                    <span>Intensity</span>
                    <input
                      type="range"
                      min="0.2"
                      max="3"
                      step="0.01"
                      value={selectedAtomCollisionRule.intensity ?? 1}
                      oninput={(event) => updateAtomCollisionRule(selectedAtomCollisionRuleIndex, { intensity: Number((event.currentTarget as HTMLInputElement).value) })}
                    />
                  </label>
                </div>
                <div class="actions">
                  <button class="ghost tiny" type="button" onclick={() => openFxProfileEditor(selectedAtomCollisionRule.fxId ?? 'collision_special_storm', 'merge')}>Open Rule FX</button>
                  <button class="ghost tiny" type="button" onclick={() => removeAtomCollisionRule(selectedAtomCollisionRuleIndex)}>Delete Rule</button>
                </div>
              {/if}
            {:else}
              <p class="formula-note">
                Add a rule to give this atom a custom reaction when it collides with one special target atom.
              </p>
            {/if}
          </div>
          {/if}
            </div>
            <aside class="editor-side">
              <div class="preview-canvas preview-canvas-tall" use:atomPreview={{ spec: selectedAtomSpec }}></div>
              <p class="formula-note">
                Live atom preview. Changes here update this viewport immediately.
              </p>
            </aside>
          </div>
        </article>
        {/if}

        {#if activePanel === 'molecule'}
        <article class="editor-card">
          <header class="editor-head">
            <h3>Molecule Preview</h3>
            <button class="ghost tiny" onclick={clearMoleculeOverrides}>Reset Molecule</button>
          </header>
          <label class="field">
            <span>Molecule</span>
            <select
              value={selectedMoleculeId}
              onchange={(event) => {
                selectedMoleculeId = (event.currentTarget as HTMLSelectElement).value;
              }}
            >
              {#each moleculeOptions as option}
                <option value={option.id}>{option.label}</option>
              {/each}
            </select>
          </label>
          <div class="preview-canvas" use:moleculePreview={{ recipe: selectedMolecule }}></div>
          <div class="mini-grid">
            <label class="field">
              <span>Points</span>
              <input
                type="number"
                min="40"
                max="20000"
                value={selectedMolecule?.points ?? 480}
                oninput={(event) => patchMolecule({ points: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Multiplier</span>
              <input
                type="number"
                min="1.2"
                max="14"
                step="0.1"
                value={selectedMolecule?.multiplier ?? 3}
                oninput={(event) => patchMolecule({ multiplier: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>FX Intensity</span>
              <input
                type="range"
                min="0.4"
                max="2.8"
                step="0.01"
                value={selectedMolecule?.fxIntensity ?? 1}
                oninput={(event) => patchMolecule({ fxIntensity: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Assigned FX Recipe</span>
              <select
                value={selectedMolecule?.formationFxId ?? ''}
                onchange={(event) =>
                  patchMolecule({ formationFxId: (event.currentTarget as HTMLSelectElement).value || null })}
              >
                <option value="">None (default molecule)</option>
                {#each fxProfiles.filter((profile) => profileMatchesScope(profile, 'molecule')) as profile}
                  <option value={profile.id}>{profile.name} · {profile.id}</option>
                {/each}
              </select>
            </label>
            <label class="field switch">
              <span>In-World Preview Entity</span>
              <input
                type="checkbox"
                checked={Boolean((selectedMoleculePresentation as any)?.showWorldEntity)}
                onchange={(event) =>
                  patchMoleculePresentation({ showWorldEntity: (event.currentTarget as HTMLInputElement).checked })}
              />
            </label>
          </div>
          <div class="actions">
            <button
              class="ghost tiny"
              type="button"
              onclick={() => openFxProfileEditor(selectedMolecule?.formationFxId ?? 'molecule_default', 'molecule')}
            >
              Open In FX Studio
            </button>
          </div>
          <div class="mini-grid">
            <label class="field">
              <span>Atom Scale</span>
              <input
                type="range"
                min="0.24"
                max="0.72"
                step="0.01"
                value={selectedMoleculePresentation?.atomScale ?? 0.42}
                oninput={(event) => patchMoleculePresentation({ atomScale: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Max Atoms</span>
              <input
                type="range"
                min="2"
                max="10"
                step="1"
                value={selectedMoleculePresentation?.maxAtoms ?? 5}
                oninput={(event) => patchMoleculePresentation({ maxAtoms: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Burst Radius</span>
              <input
                type="range"
                min="0.18"
                max="1.18"
                step="0.01"
                value={selectedMoleculePresentation?.burstRadius ?? 0.56}
                oninput={(event) => patchMoleculePresentation({ burstRadius: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Duration</span>
              <input
                type="range"
                min="0.45"
                max="2.4"
                step="0.01"
                value={selectedMoleculePresentation?.duration ?? 1.04}
                oninput={(event) => patchMoleculePresentation({ duration: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Rise</span>
              <input
                type="range"
                min="0.05"
                max="0.72"
                step="0.01"
                value={selectedMoleculePresentation?.rise ?? 0.3}
                oninput={(event) => patchMoleculePresentation({ rise: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Sparks</span>
              <input
                type="range"
                min="3"
                max="56"
                step="1"
                value={selectedMoleculePresentation?.sparkCount ?? 14}
                oninput={(event) => patchMoleculePresentation({ sparkCount: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Formation zoom peak</span>
              <input
                type="range"
                min="1"
                max="1.42"
                step="0.01"
                value={selectedMoleculePresentation?.formationZoomPeak ?? 1.14}
                oninput={(event) =>
                  patchMoleculePresentation({ formationZoomPeak: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Formation zoom in by (time)</span>
              <input
                type="range"
                min="0.18"
                max="0.52"
                step="0.01"
                value={selectedMoleculePresentation?.formationZoomInEnd ?? 0.38}
                oninput={(event) =>
                  patchMoleculePresentation({ formationZoomInEnd: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
            <label class="field">
              <span>Formation zoom hold until (time)</span>
              <input
                type="range"
                min="0.35"
                max="0.82"
                step="0.01"
                value={selectedMoleculePresentation?.formationZoomHoldEnd ?? 0.55}
                oninput={(event) =>
                  patchMoleculePresentation({ formationZoomHoldEnd: Number((event.currentTarget as HTMLInputElement).value) })}
              />
            </label>
          </div>
          <p class="formula-note">
            Formation zoom scales the in-world molecule ghost only (atoms converging + local zoom). The main camera does not move.
            Time is 0–1 across the formation duration. “Zoom in by” also sets when atoms finish easing together.
          </p>
          <p class="formula-note">
            Molecule color is derived automatically from atom colors.
          </p>
          <p class="formula-note">
            Display: {formatChemicalFormula(selectedMolecule?.formula ?? '')}
          </p>
        </article>
        {/if}

        {#if activePanel === 'globals'}
        <article class="editor-card">
          <header class="editor-head">
            <h3>Global Atom Template</h3>
          </header>
          <label class="field">
            <span>Global Atom Scale % (0-600)</span>
            <input
              type="range"
              min="0"
              max="600"
              step="0.1"
              value={visualState?.globals?.atomGlobalScalePct ?? ATOM_VISUAL_GLOBAL_DEFAULTS.atomGlobalScalePct}
              oninput={(event) => patchGlobals({ atomGlobalScalePct: Number((event.currentTarget as HTMLInputElement).value) })}
            />
          </label>
          <label class="field">
            <span>Global Scale Numeric</span>
            <input
              type="number"
              min="0"
              max="600"
              step="0.1"
              value={visualState?.globals?.atomGlobalScalePct ?? ATOM_VISUAL_GLOBAL_DEFAULTS.atomGlobalScalePct}
              oninput={(event) => patchGlobals({ atomGlobalScalePct: Number((event.currentTarget as HTMLInputElement).value) })}
            />
          </label>
          <div class="layers-card">
            <div class="layers-head">
              <h4>Global Layer Template</h4>
              <div class="actions">
                <button class="ghost tiny" type="button" onclick={() => addGlobalLayer('core')}>+ Core</button>
                <button class="ghost tiny" type="button" onclick={() => addGlobalLayer('cloud')}>+ Cloud</button>
                <button class="ghost tiny" type="button" onclick={() => addGlobalLayer('shell')}>+ Shell</button>
                <button class="ghost tiny" type="button" onclick={() => addGlobalLayer('halo')}>+ Halo</button>
                <button class="ghost tiny" type="button" onclick={resetGlobalLayers}>Reset</button>
              </div>
            </div>
            <label class="field">
              <span>Selected Global Layer</span>
              <select
                value={String(selectedGlobalLayerIndex)}
                onchange={(event) => {
                  selectedGlobalLayerIndex = Number((event.currentTarget as HTMLSelectElement).value);
                }}
              >
                {#each globalLayerTemplate as layer, idx}
                  <option value={String(idx)}>{idx + 1}. {layer.type}{layer.enabled === false ? ' · off' : ''}</option>
                {/each}
              </select>
            </label>
            {#if selectedGlobalLayer}
              <div class="layer-row selected-layer-card">
                <div class="layer-line">
                  <label class="field">
                    <span>Type</span>
                    <select value={selectedGlobalLayer.type} onchange={(event) => updateGlobalLayer(selectedGlobalLayerIndex, { type: (event.currentTarget as HTMLSelectElement).value })}>
                      {#each ATOM_VISUAL_LAYER_TYPES as layerType}
                        <option value={layerType}>{layerType}</option>
                      {/each}
                    </select>
                  </label>
                  <label class="field switch">
                    <span>On</span>
                    <input type="checkbox" checked={selectedGlobalLayer.enabled !== false} onchange={(event) => updateGlobalLayer(selectedGlobalLayerIndex, { enabled: (event.currentTarget as HTMLInputElement).checked })} />
                  </label>
                  <button class="ghost tiny" type="button" disabled={selectedGlobalLayerIndex <= 0} onclick={() => moveGlobalLayer(selectedGlobalLayerIndex, -1)}>Up</button>
                  <button class="ghost tiny" type="button" disabled={selectedGlobalLayerIndex >= globalLayerTemplate.length - 1} onclick={() => moveGlobalLayer(selectedGlobalLayerIndex, 1)}>Down</button>
                  <button class="ghost tiny" type="button" onclick={() => duplicateGlobalLayer(selectedGlobalLayerIndex)}>Duplicate</button>
                  <button class="ghost tiny" type="button" disabled={globalLayerTemplate.length <= 1} onclick={() => removeGlobalLayer(selectedGlobalLayerIndex)}>Delete</button>
                </div>
                <div class="layer-grid">
                  <label class="field"><span>Layer Color</span><input type="color" value={colorNumberToHex(selectedGlobalLayer.color, '#88bbff')} oninput={(event) => updateGlobalLayer(selectedGlobalLayerIndex, { color: colorHexToNumber((event.currentTarget as HTMLInputElement).value) })} /></label>
                  <label class="field"><span>Diameter %</span><input type="range" min="0" max="100" step="0.1" value={layerOuterDiameterPct(selectedGlobalLayer)} oninput={(event) => updateGlobalLayer(selectedGlobalLayerIndex, { sizePct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  <label class="field"><span>Opacity %</span><input type="range" min="0" max="100" step="0.1" value={selectedGlobalLayer.opacityPct ?? 100} oninput={(event) => updateGlobalLayer(selectedGlobalLayerIndex, { opacityPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  <label class="field"><span>Glow %</span><input type="range" min="0" max="100" step="0.1" value={selectedGlobalLayer.glowPct ?? 0} oninput={(event) => updateGlobalLayer(selectedGlobalLayerIndex, { glowPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  <label class="field"><span>Spin %</span><input type="range" min="0" max="100" step="0.1" value={selectedGlobalLayer.spinPct ?? 0} oninput={(event) => updateGlobalLayer(selectedGlobalLayerIndex, { spinPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  {#if layerSupportsThickness(selectedGlobalLayer)}
                    <label class="field"><span>Ring Thickness %</span><input type="range" min="0" max="100" step="0.1" value={selectedGlobalLayer.thicknessPct ?? 0} oninput={(event) => updateGlobalLayer(selectedGlobalLayerIndex, { thicknessPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                    <label class="field"><span>Ring Copies</span><input type="range" min="1" max="8" step="1" value={selectedGlobalLayer.count ?? 1} oninput={(event) => updateGlobalLayer(selectedGlobalLayerIndex, { count: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                    <label class="field"><span>Orbit Radius %</span><input type="range" min="0" max="180" step="0.1" value={selectedGlobalLayer.orbitRadiusPct ?? 100} oninput={(event) => updateGlobalLayer(selectedGlobalLayerIndex, { orbitRadiusPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                    <label class="field"><span>Ring Spread %</span><input type="range" min="0" max="100" step="0.1" value={selectedGlobalLayer.spreadPct ?? 0} oninput={(event) => updateGlobalLayer(selectedGlobalLayerIndex, { spreadPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                    <label class="field"><span>Tilt %</span><input type="range" min="0" max="100" step="0.1" value={selectedGlobalLayer.tiltPct ?? 50} oninput={(event) => updateGlobalLayer(selectedGlobalLayerIndex, { tiltPct: Number((event.currentTarget as HTMLInputElement).value) })} /></label>
                  {/if}
                </div>
                <p class="formula-note">
                  {#if layerSupportsThickness(selectedGlobalLayer)}
                    Shell is the orbit ring layer. Use copies, orbit radius, spread, tilt and spin for faster, richer shells.
                  {:else}
                    Filled layers stay solid. Use shell layers plus transparency for orbital/ring looks.
                  {/if}
                </p>
              </div>
            {/if}
          </div>
        </article>
        {/if}

        {#if activePanel === 'effects'}
        <article class="editor-card">
          <header class="editor-head">
            <h3>FX Studio</h3>
            <button class="ghost tiny" onclick={resetFxOverrides}>Reset FX</button>
          </header>
          <nav class="fx-nav">
            <button class="ghost tiny {fxEditorSection === 'overview' ? 'is-active' : ''}" type="button" onclick={() => (fxEditorSection = 'overview')}>Overview</button>
            <button class="ghost tiny {fxEditorSection === 'primitives' ? 'is-active' : ''}" type="button" onclick={() => { fxEditorSection = 'primitives'; fxPreviewSource = 'primitive'; }}>Primitives</button>
            <button class="ghost tiny {fxEditorSection === 'profiles' ? 'is-active' : ''}" type="button" onclick={() => { fxEditorSection = 'profiles'; fxPreviewSource = 'profile'; }}>Profiles</button>
          </nav>
          <div class="layers-card">
            <div class="layers-head">
              <h4>FX Preview</h4>
              <label class="field switch compact-switch">
                <span>Live</span>
                <input
                  type="checkbox"
                  checked={fxLivePreview}
                  onchange={(event) => {
                    fxLivePreview = (event.currentTarget as HTMLInputElement).checked;
                    if (fxLivePreview) scheduleFxPreview(fxPreviewKind);
                  }}
                />
              </label>
            </div>
            <div class="mini-grid">
              <label class="field">
                <span>Preview Source</span>
                <select
                  value={fxPreviewSource}
                  onchange={(event) => {
                    fxPreviewSource = (event.currentTarget as HTMLSelectElement).value as FxPreviewSource;
                  }}
                >
                  <option value="primitive">FX Block</option>
                  <option value="stackItem" disabled={!selectedFxStackPrimitive}>Stack Item</option>
                  <option value="profile">FX Recipe</option>
                </select>
              </label>
              {#if fxPreviewSource === 'stackItem'}
                <label class="field">
                  <span>Stack Item</span>
                  <select
                    value={String(selectedFxStackIndex)}
                    onchange={(event) => {
                      selectedFxStackIndex = Number((event.currentTarget as HTMLSelectElement).value);
                    }}
                  >
                    {#each (selectedFxProfile?.stackEntries ?? []) as primitive, index}
                      <option value={String(index)}>{index + 1}. {primitive.name} · {primitive.type}</option>
                    {/each}
                  </select>
                </label>
              {/if}
            </div>
            <div
              class="preview-canvas fx-preview-canvas"
              use:fxPreviewViewport={{
                kind: fxPreviewKind,
                intensity: fxPreviewIntensity,
                color: colorHexToNumber(colorNumberToHex(selectedAtomSpec?.color ?? 0x88bbff)),
                profile: activeFxPreviewProfile ?? null,
                fxConfig: visualState?.fx ?? ATOM_FX_DEFAULTS,
              }}
            ></div>
            <p class="formula-note">Preview source: {fxPreviewSourceLabel(fxPreviewSource)}</p>
            <p class="formula-note">
              Gameplay default uses `merge_default` for same-atom merges and `molecule_default` for molecule creation when no custom profile is assigned.
            </p>
            <div class="mini-grid">
              <label class="field">
                <span>Preview Kind</span>
                <select
                  value={fxPreviewKind}
                  onchange={(event) => {
                    fxPreviewKind = (event.currentTarget as HTMLSelectElement).value as any;
                  }}
                >
                  <option value="merge">Atom Merge</option>
                  <option value="molecule">Molecule</option>
                  <option value="water">Water</option>
                  <option value="fire">Fire</option>
                  <option value="explosion">Explosion</option>
                </select>
              </label>
              <label class="field">
                <span>Intensity %</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={scaleToPercent(fxPreviewIntensity, 3)}
                  oninput={(event) => {
                    fxPreviewIntensity = percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3);
                  }}
                />
              </label>
            </div>
            <div class="actions">
              <button class="ghost tiny" type="button" onclick={() => triggerFxPreview(fxPreviewKind)}>
                Replay {FX_PREVIEW_KIND_LABELS[fxPreviewKind] ?? 'Preview'}
              </button>
            </div>
          </div>
          {#if fxEditorSection === 'overview'}
          <div class="layers-card">
            <div class="layers-head">
              <h4>Scene FX Amount</h4>
            </div>
            <div class="mini-grid">
              <label class="field">
                <span>Ambient</span>
                <input
                  type="range"
                  min="0"
                  max="2.2"
                  step="0.01"
                  value={visualState?.fx?.ambientDensity ?? 1}
                  oninput={(event) => patchFx({ ambientDensity: Number((event.currentTarget as HTMLInputElement).value) })}
                />
              </label>
              <label class="field">
                <span>Sparks</span>
                <input
                  type="range"
                  min="0"
                  max="2.2"
                  step="0.01"
                  value={visualState?.fx?.sparkDensity ?? 1}
                  oninput={(event) => patchFx({ sparkDensity: Number((event.currentTarget as HTMLInputElement).value) })}
                />
              </label>
              <label class="field">
                <span>Trails</span>
                <input
                  type="range"
                  min="0"
                  max="2.2"
                  step="0.01"
                  value={visualState?.fx?.trailDensity ?? 1}
                  oninput={(event) => patchFx({ trailDensity: Number((event.currentTarget as HTMLInputElement).value) })}
                />
              </label>
              <label class="field">
                <span>Drop guide</span>
                <input
                  type="range"
                  min="0"
                  max="2.2"
                  step="0.01"
                  value={visualState?.fx?.dropTrailDensity ?? 1}
                  oninput={(event) => patchFx({ dropTrailDensity: Number((event.currentTarget as HTMLInputElement).value) })}
                />
              </label>
              <label class="field">
                <span>Droplets</span>
                <input
                  type="range"
                  min="0"
                  max="2.2"
                  step="0.01"
                  value={visualState?.fx?.dropletDensity ?? 1}
                  oninput={(event) => patchFx({ dropletDensity: Number((event.currentTarget as HTMLInputElement).value) })}
                />
              </label>
              <label class="field">
                <span>Bond Links</span>
                <input
                  type="range"
                  min="0"
                  max="2.2"
                  step="0.01"
                  value={visualState?.fx?.bondLinkIntensity ?? 1}
                  oninput={(event) => patchFx({ bondLinkIntensity: Number((event.currentTarget as HTMLInputElement).value) })}
                />
              </label>
            </div>
          </div>
          {/if}
          {#if fxEditorSection === 'primitives'}
          <div class="layers-card">
            <div class="layers-head">
              <h4>FX Block Library</h4>
            </div>
            <div class="type-chip-grid">
              {#each ATOM_FX_PRIMITIVE_TYPES as type}
                <button
                  class="ghost tiny"
                  type="button"
                  onclick={() => {
                    addFxPrimitive(type);
                    fxPreviewSource = 'primitive';
                  }}
                >
                  + {fxTypeLabel(type)}
                </button>
              {/each}
            </div>
            <label class="field">
              <span>FX Block To Edit</span>
              <select
                value={selectedFxPrimitive?.id ?? ''}
                onchange={(event) => {
                  selectedFxPrimitiveId = (event.currentTarget as HTMLSelectElement).value;
                  fxPreviewSource = 'primitive';
                }}
              >
                {#each fxPrimitives as primitive}
                  <option value={primitive.id}>{primitive.name} · {fxTypeLabel(primitive.type)}</option>
                {/each}
              </select>
            </label>
            {#if selectedFxPrimitive}
              <div class="mini-grid">
                <label class="field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={selectedFxPrimitive.name ?? ''}
                    maxlength="64"
                    oninput={(event) => patchFxPrimitive(selectedFxPrimitive.id, { name: (event.currentTarget as HTMLInputElement).value })}
                  />
                </label>
                <label class="field">
                  <span>FX Type</span>
                  <select
                    value={selectedFxPrimitive.type ?? 'burst'}
                    onchange={(event) => patchFxPrimitive(selectedFxPrimitive.id, { type: (event.currentTarget as HTMLSelectElement).value })}
                  >
                    {#each ATOM_FX_PRIMITIVE_TYPES as type}
                      <option value={type}>{fxTypeLabel(type)}</option>
                    {/each}
                  </select>
                </label>
                <label class="field switch">
                  <span>Enabled</span>
                  <input
                    type="checkbox"
                    checked={selectedFxPrimitive.enabled !== false}
                    onchange={(event) => patchFxPrimitive(selectedFxPrimitive.id, { enabled: (event.currentTarget as HTMLInputElement).checked })}
                  />
                </label>
                <label class="field switch">
                  <span>Use Context Color</span>
                  <input
                    type="checkbox"
                    checked={selectedFxPrimitive.useContextColor !== false}
                    onchange={(event) => patchFxPrimitive(selectedFxPrimitive.id, { useContextColor: (event.currentTarget as HTMLInputElement).checked })}
                  />
                </label>
                <label class="field">
                  <span>Style</span>
                  <select
                    value={selectedFxPrimitive.style ?? 'auto'}
                    onchange={(event) => patchFxPrimitive(selectedFxPrimitive.id, { style: (event.currentTarget as HTMLSelectElement).value })}
                  >
                    {#each ATOM_FX_PRIMITIVE_STYLES as style}
                      <option value={style}>{style}</option>
                    {/each}
                  </select>
                </label>
                {#if selectedFxPrimitive.useContextColor === false}
                  <label class="field">
                    <span>Color</span>
                    <input
                      type="color"
                      value={colorNumberToHex(selectedFxPrimitive.color, '#8ed8ff')}
                      oninput={(event) => patchFxPrimitive(selectedFxPrimitive.id, { color: colorHexToNumber((event.currentTarget as HTMLInputElement).value) })}
                    />
                  </label>
                {/if}
              </div>
              <div class="mini-grid">
                <label class="field"><span>Intensity %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxPrimitive.intensity ?? 1, 3)} oninput={(event) => patchFxPrimitive(selectedFxPrimitive.id, { intensity: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                <label class="field"><span>Size %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxPrimitive.size ?? 1, 3)} oninput={(event) => patchFxPrimitive(selectedFxPrimitive.id, { size: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                {#if !['bond', 'explosion', 'fire'].includes(selectedFxPrimitive.type ?? '')}
                  <label class="field"><span>Count %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxPrimitive.count ?? 1, 6)} oninput={(event) => patchFxPrimitive(selectedFxPrimitive.id, { count: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 6) })} /></label>
                {/if}
                {#if ['sparks', 'trails', 'burst', 'attractor', 'orbit', 'sparkStorm'].includes(selectedFxPrimitive.type ?? '')}
                  <label class="field"><span>Speed %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxPrimitive.speed ?? 1, 3)} oninput={(event) => patchFxPrimitive(selectedFxPrimitive.id, { speed: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                {/if}
                {#if !['explosion', 'fire'].includes(selectedFxPrimitive.type ?? '')}
                  <label class="field"><span>Duration %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxPrimitive.duration ?? 1, 3)} oninput={(event) => patchFxPrimitive(selectedFxPrimitive.id, { duration: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                {/if}
                {#if primitiveSupportsRadius(selectedFxPrimitive.type)}
                  <label class="field"><span>Radius %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxPrimitive.radius ?? 1, 3)} oninput={(event) => patchFxPrimitive(selectedFxPrimitive.id, { radius: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                {/if}
                {#if primitiveSupportsSpread(selectedFxPrimitive.type)}
                  <label class="field"><span>Spread %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxPrimitive.spread ?? 1, 3)} oninput={(event) => patchFxPrimitive(selectedFxPrimitive.id, { spread: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                {/if}
                {#if ['smoke', 'waterDroplets', 'bond', 'attractor', 'orbit'].includes(selectedFxPrimitive.type ?? '')}
                  <label class="field"><span>Opacity %</span><input type="range" min="0" max="100" step="0.1" value={opacityToPercent(selectedFxPrimitive.opacity ?? 1)} oninput={(event) => patchFxPrimitive(selectedFxPrimitive.id, { opacity: percentToOpacity(Number((event.currentTarget as HTMLInputElement).value)) })} /></label>
                {/if}
              </div>
              <div class="actions">
                <button class="ghost tiny" type="button" onclick={() => duplicateFxPrimitive(selectedFxPrimitive.id)}>Duplicate</button>
                <button class="ghost tiny" type="button" onclick={() => removeFxPrimitive(selectedFxPrimitive.id)}>Delete</button>
              </div>
            {/if}
          </div>
          {/if}
          {#if fxEditorSection === 'profiles'}
          <div class="layers-card">
            <div class="layers-head">
              <h4>FX Recipes</h4>
              <div class="actions">
                <button class="ghost tiny" type="button" onclick={() => addFxProfile('merge')}>+ Atom Merge FX</button>
                <button class="ghost tiny" type="button" onclick={() => addFxProfile('molecule')}>+ Molecule FX</button>
              </div>
            </div>
            <label class="field">
              <span>FX Recipe To Edit</span>
              <select
                value={selectedFxProfile?.id ?? ''}
                onchange={(event) => {
                  selectedFxProfileId = (event.currentTarget as HTMLSelectElement).value;
                  fxPreviewSource = 'profile';
                }}
              >
                {#each fxProfiles as profile}
                  <option value={profile.id}>{profile.name} · {profile.id}</option>
                {/each}
              </select>
            </label>
            {#if selectedFxProfile}
              <div class="mini-grid">
                <label class="field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={selectedFxProfile.name ?? ''}
                    maxlength="64"
                    oninput={(event) => patchFxProfile(selectedFxProfile.id, { name: (event.currentTarget as HTMLInputElement).value })}
                  />
                </label>
                <label class="field">
                  <span>Scope</span>
                  <select
                    value={selectedFxProfile.scope ?? 'both'}
                    onchange={(event) =>
                      patchFxProfile(selectedFxProfile.id, { scope: (event.currentTarget as HTMLSelectElement).value })}
                  >
                    {#each ATOM_FX_PROFILE_SCOPES as scope}
                      <option value={scope}>{scope}</option>
                    {/each}
                  </select>
                </label>
                <label class="field switch">
                  <span>Enabled</span>
                  <input
                    type="checkbox"
                    checked={selectedFxProfile.enabled !== false}
                    onchange={(event) =>
                      patchFxProfile(selectedFxProfile.id, { enabled: (event.currentTarget as HTMLInputElement).checked })}
                  />
                </label>
                <label class="field">
                  <span>Elemental Mode</span>
                  <select
                    value={selectedFxProfile.elementalMode ?? 'auto'}
                    onchange={(event) =>
                      patchFxProfile(selectedFxProfile.id, { elementalMode: (event.currentTarget as HTMLSelectElement).value })}
                  >
                    <option value="auto">auto</option>
                    <option value="water">water</option>
                    <option value="fire">fire</option>
                    <option value="smoke">smoke</option>
                    <option value="explosion">explosion</option>
                  </select>
                </label>
                <label class="field">
                  <span>Trail Style</span>
                  <select
                    value={selectedFxProfile.trailStyle ?? 'auto'}
                    onchange={(event) =>
                      patchFxProfile(selectedFxProfile.id, { trailStyle: (event.currentTarget as HTMLSelectElement).value })}
                  >
                    <option value="auto">auto</option>
                    <option value="none">none</option>
                    <option value="lite">lite</option>
                    <option value="full">full</option>
                  </select>
                </label>
                <label class="field switch">
                  <span>Advanced</span>
                  <input
                    type="checkbox"
                    checked={fxProfileAdvanced}
                    onchange={(event) => {
                      fxProfileAdvanced = (event.currentTarget as HTMLInputElement).checked;
                    }}
                  />
                </label>
              </div>
              {#if fxProfileAdvanced}
                <div class="mini-grid">
                  <label class="field"><span>Burst %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxProfile.burstScale ?? 1, 3)} oninput={(event) => patchFxProfile(selectedFxProfile.id, { burstScale: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                  <label class="field"><span>Sparks %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxProfile.sparkScale ?? 1, 3)} oninput={(event) => patchFxProfile(selectedFxProfile.id, { sparkScale: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                  <label class="field"><span>Droplets %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxProfile.dropletScale ?? 1, 3)} oninput={(event) => patchFxProfile(selectedFxProfile.id, { dropletScale: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                  <label class="field"><span>Bond %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxProfile.bondScale ?? 1, 3)} oninput={(event) => patchFxProfile(selectedFxProfile.id, { bondScale: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                  <label class="field"><span>Smoke %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxProfile.smokeScale ?? 1, 3)} oninput={(event) => patchFxProfile(selectedFxProfile.id, { smokeScale: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                  <label class="field"><span>Shatter %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxProfile.shatterScale ?? 1, 3)} oninput={(event) => patchFxProfile(selectedFxProfile.id, { shatterScale: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                  <label class="field"><span>Trails %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxProfile.trailScale ?? 1, 3)} oninput={(event) => patchFxProfile(selectedFxProfile.id, { trailScale: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                  <label class="field"><span>Explosion %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxProfile.explosionScale ?? 1, 3)} oninput={(event) => patchFxProfile(selectedFxProfile.id, { explosionScale: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                  <label class="field"><span>Hit Pause %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxProfile.hitPauseScale ?? 1, 3)} oninput={(event) => patchFxProfile(selectedFxProfile.id, { hitPauseScale: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                  <label class="field"><span>Vibrate %</span><input type="range" min="0" max="100" step="0.1" value={scaleToPercent(selectedFxProfile.vibrateScale ?? 1, 3)} oninput={(event) => patchFxProfile(selectedFxProfile.id, { vibrateScale: percentToScale(Number((event.currentTarget as HTMLInputElement).value), 3) })} /></label>
                </div>
              {/if}
              <div class="layers-card inner-card">
                <div class="layers-head">
                  <h4>FX Stack</h4>
                  <div class="actions">
                    <button class="ghost tiny" type="button" onclick={() => addPrimitiveToProfile(selectedFxProfile.id)}>+ Add Selected Primitive</button>
                  </div>
                </div>
                {#if Array.isArray(selectedFxProfile.stack) && selectedFxProfile.stack.length > 0}
                  {#each selectedFxProfile.stack as primitiveId, index}
                    <div
                      class="layer-line stack-line {selectedFxStackIndex === index ? 'is-active' : ''}"
                      role="button"
                      tabindex="0"
                      onclick={() => {
                        selectedFxStackIndex = index;
                        fxPreviewSource = 'stackItem';
                      }}
                      onkeydown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          selectedFxStackIndex = index;
                          fxPreviewSource = 'stackItem';
                        }
                      }}
                    >
                      <label class="field">
                        <span>Stack Item {index + 1}</span>
                        <select
                          value={primitiveId}
                          onchange={(event) => {
                            updateFxProfileStack(selectedFxProfile.id, index, (event.currentTarget as HTMLSelectElement).value);
                            selectedFxStackIndex = index;
                            fxPreviewSource = 'stackItem';
                          }}
                        >
                          {#each fxPrimitives as primitive}
                            <option value={primitive.id}>{primitive.name} · {primitive.type}</option>
                          {/each}
                        </select>
                      </label>
                      <button class="ghost tiny" type="button" onclick={() => removePrimitiveFromProfile(selectedFxProfile.id, index)}>Remove</button>
                    </div>
                  {/each}
                {:else}
                  <p class="formula-note">No custom primitives in stack yet.</p>
                {/if}
              </div>
              <div class="actions">
                <button class="ghost tiny" type="button" onclick={assignSelectedProfileToAtomMerge}>Use On Selected Atom Merge</button>
                <button class="ghost tiny" type="button" onclick={assignSelectedProfileToMoleculeFormation}>Use On Selected Molecule</button>
              </div>
              <div class="actions">
                <button class="ghost tiny" type="button" onclick={() => duplicateFxProfile(selectedFxProfile.id)}>Duplicate</button>
                <button class="ghost tiny" type="button" onclick={() => removeFxProfile(selectedFxProfile.id)}>Delete</button>
              </div>
            {/if}
          </div>
          {/if}
          <p class="formula-note">Varun-style trails are controlled by the Trails slider.</p>
        </article>
        {/if}
      </div>
    </section>
    {/if}

    {#if activePanel === 'json'}
      <section class="panel">
        <h2>JSON Tools</h2>
        <div class="actions">
          <button class="ghost" onclick={copyJson}>Copy Physics JSON</button>
          <button class="ghost" onclick={downloadJson}>Download Physics JSON</button>
          <button class="ghost" onclick={importJson}>Import Physics JSON</button>
        </div>
        <textarea bind:value={jsonInput} spellcheck="false"></textarea>
        <div class="actions">
          <button class="ghost" onclick={copyVisualJson}>Copy Visual JSON</button>
          <button class="ghost" onclick={downloadVisualJson}>Download Visual JSON</button>
          <button class="ghost" onclick={importVisualJson}>Import Visual JSON</button>
          <button class="ghost primary" onclick={applyVisualToGame} disabled={!visualDirty}>
            Save + Apply To Game
          </button>
        </div>
        <textarea bind:value={visualJsonInput} spellcheck="false"></textarea>
      </section>
    {/if}

    <div class="apply-strip">
      <label class="field switch live-switch">
        <span>Live Preview</span>
        <input
          type="checkbox"
          checked={visualLivePreview}
          onchange={(event) => {
            visualLivePreview = (event.currentTarget as HTMLInputElement).checked;
            if (visualLivePreview && visualDirty) scheduleVisualPreview();
          }}
        />
      </label>
      <button class="ghost primary" onclick={applyVisualToGame} disabled={!visualDirty}>
        Save + Apply To Game
      </button>
      <span>
        {visualLivePreview
          ? visualDirty
            ? 'Live preview on · unsaved changes'
            : 'Live preview on · config synced'
          : visualDirty
            ? 'Live preview off · unsaved changes'
            : 'Live preview off · config synced'}
      </span>
    </div>

    <p class="status">{status}</p>
  </section>
</main>

<style>
  .lab-shell {
    min-height: 100vh;
    padding: 16px;
    background: linear-gradient(180deg, #071322 0%, #08192b 100%);
    color: #eaf6ff;
    font-family: 'Sora', 'Avenir Next', sans-serif;
  }

  .lab-card {
    width: min(1100px, 100%);
    margin: 0 auto;
    border-radius: 20px;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(8, 20, 36, 0.84);
    display: grid;
    gap: 12px;
  }

  .lab-top {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: flex-start;
  }

  h1 {
    margin: 0;
    font-size: 1.4rem;
  }

  p {
    margin: 4px 0 0;
    color: rgba(213, 231, 255, 0.88);
  }

  .panel {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    background: rgba(7, 20, 35, 0.7);
    padding: 12px;
    display: grid;
    gap: 10px;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
    letter-spacing: 0.02em;
  }

  .top-actions,
  .actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .panel-switch {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    background: rgba(7, 20, 35, 0.58);
  }

  .ghost.is-active {
    border-color: rgba(143, 244, 215, 0.52);
    background: rgba(22, 67, 97, 0.95);
    color: #d9fff5;
  }

  .apply-strip {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 8px 10px;
    border-radius: 12px;
    border: 1px solid rgba(151, 231, 208, 0.2);
    background: rgba(8, 22, 38, 0.65);
    color: rgba(205, 238, 255, 0.92);
    font-size: 0.82rem;
  }

  .live-switch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: center;
  }

  .field {
    display: grid;
    gap: 6px;
  }

  .field span {
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(207, 230, 255, 0.8);
  }

  .field select,
  .field input[type='text'],
  .field input[type='number'] {
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(6, 18, 30, 0.9);
    color: #f1f8ff;
    padding: 10px;
  }

  .field input[type='color'] {
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 10px;
    min-height: 40px;
    background: rgba(6, 18, 30, 0.9);
  }

  .switch {
    justify-items: end;
  }

  .switch input {
    width: 20px;
    height: 20px;
  }

  .sliders {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 10px;
  }

  .slider-row {
    display: grid;
    gap: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 8px;
    background: rgba(8, 20, 34, 0.78);
  }

  .slider-stack {
    display: grid;
    gap: 6px;
  }

  .percent-row {
    display: grid;
    grid-template-columns: auto 1fr minmax(96px, 112px);
    align-items: center;
    gap: 8px;
  }

  .percent-label {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    color: rgba(191, 221, 255, 0.82);
    min-width: 52px;
    text-align: right;
  }

  .percent-slider {
    width: 100%;
  }

  .value-input {
    width: 100%;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(6, 18, 30, 0.9);
    color: #f1f8ff;
    padding: 6px 8px;
    font-size: 0.86rem;
  }

  .composition-colors {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 8px;
    background: rgba(8, 22, 36, 0.56);
    display: grid;
    gap: 8px;
  }

  .composition-colors h4 {
    margin: 0;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(205, 231, 255, 0.86);
  }

  .composition-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
  }

  .composition-field {
    padding: 6px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(7, 19, 32, 0.64);
  }

  .label-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
  }

  .help-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .help-btn {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    border: 1px solid rgba(184, 226, 255, 0.35);
    background: rgba(10, 25, 41, 0.9);
    color: #a8ddff;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1;
    cursor: help;
    padding: 0;
  }

  .help-bubble {
    position: absolute;
    left: 22px;
    top: 50%;
    transform: translateY(-50%);
    min-width: 210px;
    max-width: 280px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(190, 232, 255, 0.3);
    background: rgba(4, 14, 26, 0.96);
    color: #d9f1ff;
    font-size: 0.74rem;
    line-height: 1.35;
    box-shadow: 0 14px 28px rgba(0, 0, 0, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity 130ms ease;
    z-index: 4;
  }

  .help-wrap:hover .help-bubble {
    opacity: 1;
  }

  .label-row strong {
    color: #8ff4d7;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  input[type='range'] {
    width: 100%;
  }

  .ghost {
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(8, 22, 38, 0.86);
    color: #eef7ff;
    border-radius: 12px;
    padding: 8px 12px;
    cursor: pointer;
  }

  .ghost.tiny {
    padding: 6px 10px;
    font-size: 0.78rem;
  }

  .ghost.primary {
    border-color: rgba(156, 255, 222, 0.52);
    background: linear-gradient(135deg, rgba(50, 116, 208, 0.9), rgba(36, 166, 142, 0.9));
    color: #f6fffd;
    font-weight: 700;
  }

  .ghost:disabled {
    cursor: not-allowed;
    opacity: 0.56;
  }

  textarea {
    width: 100%;
    min-height: 170px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(3, 13, 25, 0.92);
    color: #dff0ff;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.8rem;
    padding: 10px;
    resize: vertical;
  }

  .visual-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 10px;
  }

  .editor-split {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.9fr);
    gap: 12px;
    align-items: start;
  }

  .editor-main,
  .editor-side {
    display: grid;
    gap: 10px;
  }

  .editor-card {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 10px;
    background: rgba(5, 17, 30, 0.7);
    display: grid;
    gap: 8px;
  }

  .editor-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
  }

  .editor-head h3 {
    margin: 0;
    font-size: 0.92rem;
  }

  .preview-canvas {
    position: relative;
    min-height: 170px;
    border-radius: 12px;
    border: 1px solid rgba(155, 210, 244, 0.22);
    background:
      radial-gradient(circle at 28% 22%, rgba(176, 236, 255, 0.16), transparent 42%),
      linear-gradient(150deg, rgba(6, 18, 30, 0.96), rgba(8, 24, 39, 0.82));
    overflow: hidden;
  }

  .fx-preview-canvas {
    min-height: 220px;
  }

  .preview-canvas-tall {
    min-height: 360px;
  }

  .mini-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .fx-nav {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }

  .section-nav {
    margin-bottom: 0;
  }

  .section-card {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 10px;
    background: rgba(8, 22, 36, 0.56);
    display: grid;
    gap: 8px;
  }

  .layers-card,
  .selected-layer-card {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 10px;
    background: rgba(8, 22, 36, 0.56);
    display: grid;
    gap: 8px;
  }

  .layers-head,
  .layer-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .layer-row {
    display: grid;
    gap: 8px;
  }

  .layer-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .type-chip-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }

  .inner-card {
    margin-top: 8px;
    background: rgba(255, 255, 255, 0.03);
  }

  .stack-line.is-active {
    padding: 8px;
    border-radius: 12px;
    background: rgba(126, 243, 229, 0.08);
    border: 1px solid rgba(126, 243, 229, 0.22);
  }

  .formula-note {
    margin: 0;
    color: #a3dbff;
    font-weight: 700;
    font-size: 0.86rem;
  }

  .status {
    margin: 0;
    min-height: 1.2em;
    color: #87ffd3;
    font-size: 0.84rem;
  }

  @media (max-width: 760px) {
    .editor-split,
    .row {
      grid-template-columns: 1fr;
    }

    .switch {
      justify-items: start;
    }

    .help-bubble {
      left: auto;
      right: 0;
      top: 120%;
      transform: none;
      max-width: min(72vw, 280px);
    }

    .panel-switch {
      display: none;
    }

    .panel-switch.is-open {
      display: flex;
    }

    .layer-grid,
    .mini-grid {
      grid-template-columns: 1fr;
    }

    .preview-canvas-tall {
      min-height: 220px;
    }
  }
</style>
