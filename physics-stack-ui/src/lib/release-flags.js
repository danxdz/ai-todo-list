/**
 * Release switches used to keep one shared runtime while changing product focus.
 * Keep features in code, enable/disable from here per release train.
 */
export const RELEASE_FLAGS = {
  atomsFocus: true,
  showExperimentalModes: false,
  enableShopEntry: false,
  enableSkinsLab: false,
};

/**
 * Curated skin subset for the current public build.
 * Full skin catalog remains in source and can be re-enabled by flags.
 */
export const CURATED_SKIN_IDS = ['default', 'neon_glow', 'crystal_lattice', 'bohr_classic'];

