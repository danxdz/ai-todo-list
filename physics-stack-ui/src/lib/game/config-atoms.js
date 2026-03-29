/**
 * Periodic stack - full 118 tiers (H-Og).
 * Gameplay radius uses a normalized cube-root atomic-mass scale.
 * This keeps relative scientific sizing while staying playable on mobile screens.
 */
export const ROW_Z = 0;
export const GHOST_Z = ROW_Z + 0.42;
export const QUEUE_STRIP_SCALE = 0.52;
export const QUEUE_STRIP_LANE = 0.09;
export const QUEUE_TOP_BAND = 0.38;

export { FRUIT_DENSITY, fruitMassForRadius } from './ball-mass.js';

export const MERGE_DIST_MULT = 1.045;
export const JACKPOT_MERGE_DIST_MULT = 1.12;

export const ELEMENTS = [
  { radius: 0.34, color: 0xffffff, symbol: 'H', name: 'Hydrogen', atomicNumber: 1, atomicMass: 1.008, phase: 'gas', family: 'nonmetal', fact: 'Atomic mass 1.008 u. Period 1, group 1.' },
  { radius: 0.574, color: 0xd9ffff, symbol: 'He', name: 'Helium', atomicNumber: 2, atomicMass: 4.002602, phase: 'gas', family: 'noble-gas', fact: 'Atomic mass 4.003 u. Period 1, group 18.' },
  { radius: 0.702, color: 0xcc80ff, symbol: 'Li', name: 'Lithium', atomicNumber: 3, atomicMass: 6.94, phase: 'solid', family: 'alkali-metal', fact: 'Atomic mass 6.940 u. Period 2, group 1.' },
  { radius: 0.772, color: 0xc2ff00, symbol: 'Be', name: 'Beryllium', atomicNumber: 4, atomicMass: 9.012183, phase: 'solid', family: 'alkaline-earth', fact: 'Atomic mass 9.012 u. Period 2, group 2.' },
  { radius: 0.824, color: 0xffb5b5, symbol: 'B', name: 'Boron', atomicNumber: 5, atomicMass: 10.81, phase: 'solid', family: 'metalloid', fact: 'Atomic mass 10.810 u. Period 2, group 13.' },
  { radius: 0.855, color: 0x909090, symbol: 'C', name: 'Carbon', atomicNumber: 6, atomicMass: 12.011, phase: 'solid', family: 'nonmetal', fact: 'Atomic mass 12.011 u. Period 2, group 14.' },
  { radius: 0.903, color: 0x3050f8, symbol: 'N', name: 'Nitrogen', atomicNumber: 7, atomicMass: 14.007, phase: 'gas', family: 'nonmetal', fact: 'Atomic mass 14.007 u. Period 2, group 15.' },
  { radius: 0.947, color: 0xff0d0d, symbol: 'O', name: 'Oxygen', atomicNumber: 8, atomicMass: 15.999, phase: 'gas', family: 'nonmetal', fact: 'Atomic mass 15.999 u. Period 2, group 16.' },
  { radius: 1.007, color: 0x90e050, symbol: 'F', name: 'Fluorine', atomicNumber: 9, atomicMass: 18.998403, phase: 'gas', family: 'halogen', fact: 'Atomic mass 18.998 u. Period 2, group 17.' },
  { radius: 1.028, color: 0xb3e3f5, symbol: 'Ne', name: 'Neon', atomicNumber: 10, atomicMass: 20.17976, phase: 'gas', family: 'noble-gas', fact: 'Atomic mass 20.180 u. Period 2, group 18.' },
  { radius: 1.077, color: 0xab5cf2, symbol: 'Na', name: 'Sodium', atomicNumber: 11, atomicMass: 22.989769, phase: 'solid', family: 'alkali-metal', fact: 'Atomic mass 22.990 u. Period 3, group 1.' },
  { radius: 1.098, color: 0x8aff00, symbol: 'Mg', name: 'Magnesium', atomicNumber: 12, atomicMass: 24.305, phase: 'solid', family: 'alkaline-earth', fact: 'Atomic mass 24.305 u. Period 3, group 2.' },
  { radius: 1.139, color: 0xbfa6a6, symbol: 'Al', name: 'Aluminium', atomicNumber: 13, atomicMass: 26.981539, phase: 'solid', family: 'post-transition-metal', fact: 'Atomic mass 26.982 u. Period 3, group 13.' },
  { radius: 1.155, color: 0xf0c8a0, symbol: 'Si', name: 'Silicon', atomicNumber: 14, atomicMass: 28.085, phase: 'solid', family: 'metalloid', fact: 'Atomic mass 28.085 u. Period 3, group 14.' },
  { radius: 1.196, color: 0xff8000, symbol: 'P', name: 'Phosphorus', atomicNumber: 15, atomicMass: 30.973762, phase: 'solid', family: 'nonmetal', fact: 'Atomic mass 30.974 u. Period 3, group 15.' },
  { radius: 1.21, color: 0xffff30, symbol: 'S', name: 'Sulfur', atomicNumber: 16, atomicMass: 32.06, phase: 'solid', family: 'nonmetal', fact: 'Atomic mass 32.060 u. Period 3, group 16.' },
  { radius: 1.253, color: 0x1ff01f, symbol: 'Cl', name: 'Chlorine', atomicNumber: 17, atomicMass: 35.45, phase: 'gas', family: 'halogen', fact: 'Atomic mass 35.450 u. Period 3, group 17.' },
  { radius: 1.307, color: 0x80d1e3, symbol: 'Ar', name: 'Argon', atomicNumber: 18, atomicMass: 39.9481, phase: 'gas', family: 'noble-gas', fact: 'Atomic mass 39.948 u. Period 3, group 18.' },
  { radius: 1.297, color: 0x8f40d4, symbol: 'K', name: 'Potassium', atomicNumber: 19, atomicMass: 39.09831, phase: 'solid', family: 'alkali-metal', fact: 'Atomic mass 39.098 u. Period 4, group 1.' },
  { radius: 1.308, color: 0x3dff00, symbol: 'Ca', name: 'Calcium', atomicNumber: 20, atomicMass: 40.0784, phase: 'solid', family: 'alkaline-earth', fact: 'Atomic mass 40.078 u. Period 4, group 2.' },
  { radius: 1.362, color: 0xe6e6e6, symbol: 'Sc', name: 'Scandium', atomicNumber: 21, atomicMass: 44.955908, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 44.956 u. Period 4, group 3.' },
  { radius: 1.392, color: 0xbfc2c7, symbol: 'Ti', name: 'Titanium', atomicNumber: 22, atomicMass: 47.8671, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 47.867 u. Period 4, group 4.' },
  { radius: 1.422, color: 0xa6a6ab, symbol: 'V', name: 'Vanadium', atomicNumber: 23, atomicMass: 50.94151, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 50.942 u. Period 4, group 5.' },
  { radius: 1.433, color: 0x8a99c7, symbol: 'Cr', name: 'Chromium', atomicNumber: 24, atomicMass: 51.99616, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 51.996 u. Period 4, group 6.' },
  { radius: 1.46, color: 0x9c7ac7, symbol: 'Mn', name: 'Manganese', atomicNumber: 25, atomicMass: 54.938044, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 54.938 u. Period 4, group 7.' },
  { radius: 1.469, color: 0xe06633, symbol: 'Fe', name: 'Iron', atomicNumber: 26, atomicMass: 55.8452, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 55.845 u. Period 4, group 8.' },
  { radius: 1.496, color: 0xf090a0, symbol: 'Co', name: 'Cobalt', atomicNumber: 27, atomicMass: 58.933194, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 58.933 u. Period 4, group 9.' },
  { radius: 1.494, color: 0x50d050, symbol: 'Ni', name: 'Nickel', atomicNumber: 28, atomicMass: 58.69344, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 58.693 u. Period 4, group 10.' },
  { radius: 1.536, color: 0xc88033, symbol: 'Cu', name: 'Copper', atomicNumber: 29, atomicMass: 63.5463, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 63.546 u. Period 4, group 11.' },
  { radius: 1.551, color: 0x7d80b0, symbol: 'Zn', name: 'Zinc', atomicNumber: 30, atomicMass: 65.382, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 65.382 u. Period 4, group 12.' },
  { radius: 1.586, color: 0xc28f8f, symbol: 'Ga', name: 'Gallium', atomicNumber: 31, atomicMass: 69.7231, phase: 'solid', family: 'post-transition-metal', fact: 'Atomic mass 69.723 u. Period 4, group 13.' },
  { radius: 1.609, color: 0x668f8f, symbol: 'Ge', name: 'Germanium', atomicNumber: 32, atomicMass: 72.6308, phase: 'solid', family: 'metalloid', fact: 'Atomic mass 72.631 u. Period 4, group 14.' },
  { radius: 1.626, color: 0xbd80e3, symbol: 'As', name: 'Arsenic', atomicNumber: 33, atomicMass: 74.921596, phase: 'solid', family: 'metalloid', fact: 'Atomic mass 74.922 u. Period 4, group 15.' },
  { radius: 1.656, color: 0xffa100, symbol: 'Se', name: 'Selenium', atomicNumber: 34, atomicMass: 78.9718, phase: 'solid', family: 'nonmetal', fact: 'Atomic mass 78.972 u. Period 4, group 16.' },
  { radius: 1.663, color: 0xa62929, symbol: 'Br', name: 'Bromine', atomicNumber: 35, atomicMass: 79.904, phase: 'liquid', family: 'halogen', fact: 'Atomic mass 79.904 u. Period 4, group 17.' },
  { radius: 1.69, color: 0x5cb8d1, symbol: 'Kr', name: 'Krypton', atomicNumber: 36, atomicMass: 83.7982, phase: 'gas', family: 'noble-gas', fact: 'Atomic mass 83.798 u. Period 4, group 18.' },
  { radius: 1.702, color: 0x702eb0, symbol: 'Rb', name: 'Rubidium', atomicNumber: 37, atomicMass: 85.46783, phase: 'solid', family: 'alkali-metal', fact: 'Atomic mass 85.468 u. Period 5, group 1.' },
  { radius: 1.716, color: 0x00ff00, symbol: 'Sr', name: 'Strontium', atomicNumber: 38, atomicMass: 87.621, phase: 'solid', family: 'alkaline-earth', fact: 'Atomic mass 87.621 u. Period 5, group 2.' },
  { radius: 1.725, color: 0x94ffff, symbol: 'Y', name: 'Yttrium', atomicNumber: 39, atomicMass: 88.905842, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 88.906 u. Period 5, group 3.' },
  { radius: 1.74, color: 0x94e0e0, symbol: 'Zr', name: 'Zirconium', atomicNumber: 40, atomicMass: 91.2242, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 91.224 u. Period 5, group 4.' },
  { radius: 1.751, color: 0x73c2c9, symbol: 'Nb', name: 'Niobium', atomicNumber: 41, atomicMass: 92.906372, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 92.906 u. Period 5, group 5.' },
  { radius: 1.771, color: 0x54b5b5, symbol: 'Mo', name: 'Molybdenum', atomicNumber: 42, atomicMass: 95.951, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 95.951 u. Period 5, group 6.' },
  { radius: 1.784, color: 0x3b9e9e, symbol: 'Tc', name: 'Technetium', atomicNumber: 43, atomicMass: 98, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 98.000 u. Period 5, group 7.' },
  { radius: 1.803, color: 0x248f8f, symbol: 'Ru', name: 'Ruthenium', atomicNumber: 44, atomicMass: 101.072, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 101.072 u. Period 5, group 8.' },
  { radius: 1.814, color: 0x0a7d8c, symbol: 'Rh', name: 'Rhodium', atomicNumber: 45, atomicMass: 102.905502, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 102.906 u. Period 5, group 9.' },
  { radius: 1.835, color: 0x006985, symbol: 'Pd', name: 'Palladium', atomicNumber: 46, atomicMass: 106.421, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 106.421 u. Period 5, group 10.' },
  { radius: 1.844, color: 0xc0c0c0, symbol: 'Ag', name: 'Silver', atomicNumber: 47, atomicMass: 107.86822, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 107.868 u. Period 5, group 11.' },
  { radius: 1.87, color: 0xffd98f, symbol: 'Cd', name: 'Cadmium', atomicNumber: 48, atomicMass: 112.4144, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 112.414 u. Period 5, group 12.' },
  { radius: 1.884, color: 0xa67573, symbol: 'In', name: 'Indium', atomicNumber: 49, atomicMass: 114.8181, phase: 'solid', family: 'post-transition-metal', fact: 'Atomic mass 114.818 u. Period 5, group 13.' },
  { radius: 1.906, color: 0x668080, symbol: 'Sn', name: 'Tin', atomicNumber: 50, atomicMass: 118.7107, phase: 'solid', family: 'post-transition-metal', fact: 'Atomic mass 118.711 u. Period 5, group 14.' },
  { radius: 1.922, color: 0x9e63b5, symbol: 'Sb', name: 'Antimony', atomicNumber: 51, atomicMass: 121.7601, phase: 'solid', family: 'metalloid', fact: 'Atomic mass 121.760 u. Period 5, group 15.' },
  { radius: 1.954, color: 0xd47a00, symbol: 'Te', name: 'Tellurium', atomicNumber: 52, atomicMass: 127.603, phase: 'solid', family: 'metalloid', fact: 'Atomic mass 127.603 u. Period 5, group 16.' },
  { radius: 1.95, color: 0x940094, symbol: 'I', name: 'Iodine', atomicNumber: 53, atomicMass: 126.904473, phase: 'solid', family: 'halogen', fact: 'Atomic mass 126.904 u. Period 5, group 17.' },
  { radius: 1.973, color: 0x429eb0, symbol: 'Xe', name: 'Xenon', atomicNumber: 54, atomicMass: 131.2936, phase: 'gas', family: 'noble-gas', fact: 'Atomic mass 131.294 u. Period 5, group 18.' },
  { radius: 1.981, color: 0x57178f, symbol: 'Cs', name: 'Cesium', atomicNumber: 55, atomicMass: 132.905452, phase: 'solid', family: 'alkali-metal', fact: 'Atomic mass 132.905 u. Period 6, group 1.' },
  { radius: 2.004, color: 0x00c900, symbol: 'Ba', name: 'Barium', atomicNumber: 56, atomicMass: 137.3277, phase: 'solid', family: 'alkaline-earth', fact: 'Atomic mass 137.328 u. Period 6, group 2.' },
  { radius: 2.011, color: 0x70d4ff, symbol: 'La', name: 'Lanthanum', atomicNumber: 57, atomicMass: 138.905477, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 138.905 u. Period 6, group 3.' },
  { radius: 2.017, color: 0xffffc7, symbol: 'Ce', name: 'Cerium', atomicNumber: 58, atomicMass: 140.1161, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 140.116 u. Period 6, group 3.' },
  { radius: 2.021, color: 0xd9ffc7, symbol: 'Pr', name: 'Praseodymium', atomicNumber: 59, atomicMass: 140.907662, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 140.908 u. Period 6, group 3.' },
  { radius: 2.038, color: 0xc7ffc7, symbol: 'Nd', name: 'Neodymium', atomicNumber: 60, atomicMass: 144.2423, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 144.242 u. Period 6, group 3.' },
  { radius: 2.041, color: 0xa3ffc7, symbol: 'Pm', name: 'Promethium', atomicNumber: 61, atomicMass: 145, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 145.000 u. Period 6, group 3.' },
  { radius: 2.067, color: 0x8fffc7, symbol: 'Sm', name: 'Samarium', atomicNumber: 62, atomicMass: 150.362, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 150.362 u. Period 6, group 3.' },
  { radius: 2.074, color: 0x61ffc7, symbol: 'Eu', name: 'Europium', atomicNumber: 63, atomicMass: 151.9641, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 151.964 u. Period 6, group 3.' },
  { radius: 2.099, color: 0x45ffc7, symbol: 'Gd', name: 'Gadolinium', atomicNumber: 64, atomicMass: 157.253, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 157.253 u. Period 6, group 3.' },
  { radius: 2.107, color: 0x30ffc7, symbol: 'Tb', name: 'Terbium', atomicNumber: 65, atomicMass: 158.925352, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 158.925 u. Period 6, group 3.' },
  { radius: 2.123, color: 0x1fffc7, symbol: 'Dy', name: 'Dysprosium', atomicNumber: 66, atomicMass: 162.5001, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 162.500 u. Period 6, group 3.' },
  { radius: 2.134, color: 0x00ff9c, symbol: 'Ho', name: 'Holmium', atomicNumber: 67, atomicMass: 164.930332, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 164.930 u. Period 6, group 3.' },
  { radius: 2.144, color: 0x00e675, symbol: 'Er', name: 'Erbium', atomicNumber: 68, atomicMass: 167.2593, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 167.259 u. Period 6, group 3.' },
  { radius: 2.151, color: 0x00d452, symbol: 'Tm', name: 'Thulium', atomicNumber: 69, atomicMass: 168.934222, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 168.934 u. Period 6, group 3.' },
  { radius: 2.169, color: 0x00bf38, symbol: 'Yb', name: 'Ytterbium', atomicNumber: 70, atomicMass: 173.0451, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 173.045 u. Period 6, group 3.' },
  { radius: 2.177, color: 0x00ab24, symbol: 'Lu', name: 'Lutetium', atomicNumber: 71, atomicMass: 174.96681, phase: 'solid', family: 'lanthanide', fact: 'Atomic mass 174.967 u. Period 6, group 3.' },
  { radius: 2.192, color: 0x4dc2ff, symbol: 'Hf', name: 'Hafnium', atomicNumber: 72, atomicMass: 178.492, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 178.492 u. Period 6, group 4.' },
  { radius: 2.202, color: 0x4da6ff, symbol: 'Ta', name: 'Tantalum', atomicNumber: 73, atomicMass: 180.947882, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 180.948 u. Period 6, group 5.' },
  { radius: 2.214, color: 0x2194d6, symbol: 'W', name: 'Tungsten', atomicNumber: 74, atomicMass: 183.841, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 183.841 u. Period 6, group 6.' },
  { radius: 2.224, color: 0x267dab, symbol: 'Re', name: 'Rhenium', atomicNumber: 75, atomicMass: 186.2071, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 186.207 u. Period 6, group 7.' },
  { radius: 2.241, color: 0x266696, symbol: 'Os', name: 'Osmium', atomicNumber: 76, atomicMass: 190.233, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 190.233 u. Period 6, group 8.' },
  { radius: 2.249, color: 0x175487, symbol: 'Ir', name: 'Iridium', atomicNumber: 77, atomicMass: 192.2173, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 192.217 u. Period 6, group 9.' },
  { radius: 2.26, color: 0xd0d0e0, symbol: 'Pt', name: 'Platinum', atomicNumber: 78, atomicMass: 195.0849, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 195.085 u. Period 6, group 10.' },
  { radius: 2.267, color: 0xffd123, symbol: 'Au', name: 'Gold', atomicNumber: 79, atomicMass: 196.966569, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 196.967 u. Period 6, group 11.' },
  { radius: 2.282, color: 0xb8b8d0, symbol: 'Hg', name: 'Mercury', atomicNumber: 80, atomicMass: 200.5923, phase: 'liquid', family: 'transition-metal', fact: 'Atomic mass 200.592 u. Period 6, group 12.' },
  { radius: 2.296, color: 0xa6544d, symbol: 'Tl', name: 'Thallium', atomicNumber: 81, atomicMass: 204.38, phase: 'solid', family: 'post-transition-metal', fact: 'Atomic mass 204.380 u. Period 6, group 13.' },
  { radius: 2.307, color: 0x575961, symbol: 'Pb', name: 'Lead', atomicNumber: 82, atomicMass: 207.21, phase: 'solid', family: 'post-transition-metal', fact: 'Atomic mass 207.210 u. Period 6, group 14.' },
  { radius: 2.314, color: 0x9e4fb5, symbol: 'Bi', name: 'Bismuth', atomicNumber: 83, atomicMass: 208.980401, phase: 'solid', family: 'post-transition-metal', fact: 'Atomic mass 208.980 u. Period 6, group 15.' },
  { radius: 2.314, color: 0xab5c00, symbol: 'Po', name: 'Polonium', atomicNumber: 84, atomicMass: 209, phase: 'solid', family: 'post-transition-metal', fact: 'Atomic mass 209.000 u. Period 6, group 16.' },
  { radius: 2.318, color: 0x754f45, symbol: 'At', name: 'Astatine', atomicNumber: 85, atomicMass: 210, phase: 'solid', family: 'halogen', fact: 'Atomic mass 210.000 u. Period 6, group 17.' },
  { radius: 2.362, color: 0x428296, symbol: 'Rn', name: 'Radon', atomicNumber: 86, atomicMass: 222, phase: 'gas', family: 'noble-gas', fact: 'Atomic mass 222.000 u. Period 6, group 18.' },
  { radius: 2.366, color: 0x420066, symbol: 'Fr', name: 'Francium', atomicNumber: 87, atomicMass: 223, phase: 'solid', family: 'alkali-metal', fact: 'Atomic mass 223.000 u. Period 7, group 1.' },
  { radius: 2.377, color: 0x007d00, symbol: 'Ra', name: 'Radium', atomicNumber: 88, atomicMass: 226, phase: 'solid', family: 'alkaline-earth', fact: 'Atomic mass 226.000 u. Period 7, group 2.' },
  { radius: 2.38, color: 0x70abfa, symbol: 'Ac', name: 'Actinium', atomicNumber: 89, atomicMass: 227, phase: 'solid', family: 'actinide', fact: 'Atomic mass 227.000 u. Period 7, group 3.' },
  { radius: 2.398, color: 0x00baff, symbol: 'Th', name: 'Thorium', atomicNumber: 90, atomicMass: 232.03774, phase: 'solid', family: 'actinide', fact: 'Atomic mass 232.038 u. Period 7, group 3.' },
  { radius: 2.395, color: 0x00a1ff, symbol: 'Pa', name: 'Protactinium', atomicNumber: 91, atomicMass: 231.035882, phase: 'solid', family: 'actinide', fact: 'Atomic mass 231.036 u. Period 7, group 3.' },
  { radius: 2.419, color: 0x008fff, symbol: 'U', name: 'Uranium', atomicNumber: 92, atomicMass: 238.028913, phase: 'solid', family: 'actinide', fact: 'Atomic mass 238.029 u. Period 7, group 3.' },
  { radius: 2.416, color: 0x0080ff, symbol: 'Np', name: 'Neptunium', atomicNumber: 93, atomicMass: 237, phase: 'solid', family: 'actinide', fact: 'Atomic mass 237.000 u. Period 7, group 3.' },
  { radius: 2.44, color: 0x006bff, symbol: 'Pu', name: 'Plutonium', atomicNumber: 94, atomicMass: 244, phase: 'solid', family: 'actinide', fact: 'Atomic mass 244.000 u. Period 7, group 3.' },
  { radius: 2.436, color: 0x545cf2, symbol: 'Am', name: 'Americium', atomicNumber: 95, atomicMass: 243, phase: 'solid', family: 'actinide', fact: 'Atomic mass 243.000 u. Period 7, group 3.' },
  { radius: 2.45, color: 0x785ce3, symbol: 'Cm', name: 'Curium', atomicNumber: 96, atomicMass: 247, phase: 'solid', family: 'actinide', fact: 'Atomic mass 247.000 u. Period 7, group 3.' },
  { radius: 2.45, color: 0x8a4fe3, symbol: 'Bk', name: 'Berkelium', atomicNumber: 97, atomicMass: 247, phase: 'solid', family: 'actinide', fact: 'Atomic mass 247.000 u. Period 7, group 3.' },
  { radius: 2.463, color: 0xa136d4, symbol: 'Cf', name: 'Californium', atomicNumber: 98, atomicMass: 251, phase: 'solid', family: 'actinide', fact: 'Atomic mass 251.000 u. Period 7, group 3.' },
  { radius: 2.467, color: 0xb31fd4, symbol: 'Es', name: 'Einsteinium', atomicNumber: 99, atomicMass: 252, phase: 'solid', family: 'actinide', fact: 'Atomic mass 252.000 u. Period 7, group 3.' },
  { radius: 2.483, color: 0xb31fba, symbol: 'Fm', name: 'Fermium', atomicNumber: 100, atomicMass: 257, phase: 'solid', family: 'actinide', fact: 'Atomic mass 257.000 u. Period 7, group 3.' },
  { radius: 2.487, color: 0xb30da6, symbol: 'Md', name: 'Mendelevium', atomicNumber: 101, atomicMass: 258, phase: 'solid', family: 'actinide', fact: 'Atomic mass 258.000 u. Period 7, group 3.' },
  { radius: 2.49, color: 0xbd0d87, symbol: 'No', name: 'Nobelium', atomicNumber: 102, atomicMass: 259, phase: 'solid', family: 'actinide', fact: 'Atomic mass 259.000 u. Period 7, group 3.' },
  { radius: 2.513, color: 0xc70066, symbol: 'Lr', name: 'Lawrencium', atomicNumber: 103, atomicMass: 266, phase: 'solid', family: 'actinide', fact: 'Atomic mass 266.000 u. Period 7, group 3.' },
  { radius: 2.516, color: 0xcc0059, symbol: 'Rf', name: 'Rutherfordium', atomicNumber: 104, atomicMass: 267, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 267.000 u. Period 7, group 4.' },
  { radius: 2.519, color: 0xd1004f, symbol: 'Db', name: 'Dubnium', atomicNumber: 105, atomicMass: 268, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 268.000 u. Period 7, group 5.' },
  { radius: 2.522, color: 0xd90045, symbol: 'Sg', name: 'Seaborgium', atomicNumber: 106, atomicMass: 269, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 269.000 u. Period 7, group 6.' },
  { radius: 2.526, color: 0xe00038, symbol: 'Bh', name: 'Bohrium', atomicNumber: 107, atomicMass: 270, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 270.000 u. Period 7, group 7.' },
  { radius: 2.522, color: 0xe6002e, symbol: 'Hs', name: 'Hassium', atomicNumber: 108, atomicMass: 269, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 269.000 u. Period 7, group 8.' },
  { radius: 2.551, color: 0xeb0026, symbol: 'Mt', name: 'Meitnerium', atomicNumber: 109, atomicMass: 278, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 278.000 u. Period 7, group 9.' },
  { radius: 2.56, color: 0xbfa6a6, symbol: 'Ds', name: 'Darmstadtium', atomicNumber: 110, atomicMass: 281, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 281.000 u. Period 7, group 10.' },
  { radius: 2.563, color: 0xbfa6a6, symbol: 'Rg', name: 'Roentgenium', atomicNumber: 111, atomicMass: 282, phase: 'solid', family: 'transition-metal', fact: 'Atomic mass 282.000 u. Period 7, group 11.' },
  { radius: 2.573, color: 0xbfa6a6, symbol: 'Cn', name: 'Copernicium', atomicNumber: 112, atomicMass: 285, phase: 'liquid', family: 'transition-metal', fact: 'Atomic mass 285.000 u. Period 7, group 12.' },
  { radius: 2.576, color: 0xdddddd, symbol: 'Nh', name: 'Nihonium', atomicNumber: 113, atomicMass: 286, phase: 'solid', family: 'other', fact: 'Atomic mass 286.000 u. Period 7, group 13.' },
  { radius: 2.585, color: 0xc7b39a, symbol: 'Fl', name: 'Flerovium', atomicNumber: 114, atomicMass: 289, phase: 'solid', family: 'post-transition-metal', fact: 'Atomic mass 289.000 u. Period 7, group 14.' },
  { radius: 2.585, color: 0xc7b39a, symbol: 'Mc', name: 'Moscovium', atomicNumber: 115, atomicMass: 289, phase: 'solid', family: 'post-transition-metal', fact: 'Atomic mass 289.000 u. Period 7, group 15.' },
  { radius: 2.597, color: 0xc7b39a, symbol: 'Lv', name: 'Livermorium', atomicNumber: 116, atomicMass: 293, phase: 'solid', family: 'post-transition-metal', fact: 'Atomic mass 293.000 u. Period 7, group 16.' },
  { radius: 2.6, color: 0x42db5b, symbol: 'Ts', name: 'Tennessine', atomicNumber: 117, atomicMass: 294, phase: 'solid', family: 'halogen', fact: 'Atomic mass 294.000 u. Period 7, group 17.' },
  { radius: 2.6, color: 0x80d1ff, symbol: 'Og', name: 'Oganesson', atomicNumber: 118, atomicMass: 294, phase: 'solid', family: 'noble-gas', fact: 'Atomic mass 294.000 u. Period 7, group 18.' },
];

// Backward-compatible alias for legacy shared-core naming.
export const FRUITS = ELEMENTS;

let ACTIVE_ATOM_ELEMENTS = ELEMENTS;

export function setActiveAtomElements(elements) {
  if (!Array.isArray(elements) || elements.length < 2) {
    ACTIVE_ATOM_ELEMENTS = ELEMENTS;
    return;
  }
  ACTIVE_ATOM_ELEMENTS = elements;
}

export function getActiveAtomElements() {
  return ACTIVE_ATOM_ELEMENTS;
}

export function getActiveAtomSpec(type) {
  return ACTIVE_ATOM_ELEMENTS[type] ?? ELEMENTS[type];
}

// Backward-compatible aliases (legacy naming).
export const setActiveAtomFruits = setActiveAtomElements;
export const getActiveAtomFruits = getActiveAtomElements;

export const MERGE_POINTS = ELEMENTS.map((e) => Math.round(e.atomicNumber * 12 + e.atomicMass * 0.45));
export const MERGEABLE_TYPE_MAX = ELEMENTS.length - 2;
export const MAX_RADIUS = ELEMENTS[ELEMENTS.length - 1].radius;

/**
 * Advanced chemistry layer (Atoms mode only).
 * inputs = atomic numbers (Z) multiset required in close proximity.
 */
export const MOLECULE_RECIPES = [
  {
    id: 'water',
    name: 'Water',
    formula: 'H2O',
    inputs: [1, 1, 8],
    points: 460,
    multiplier: 3.2,
    color: 0x6ac9ff,
    fact: 'Water can exist naturally as solid, liquid, and gas on Earth.',
    unlockLevel: 5,
  },
  {
    id: 'carbon_dioxide',
    name: 'Carbon Dioxide',
    formula: 'CO2',
    inputs: [6, 8, 8],
    points: 520,
    multiplier: 3.4,
    color: 0xb7d5df,
    fact: 'CO2 helps trap heat in Earths atmosphere and fuels plant photosynthesis.',
    unlockLevel: 5,
    detectBoost: 1.12,
    priority: 4,
  },
  {
    id: 'ammonia',
    name: 'Ammonia',
    formula: 'NH3',
    inputs: [7, 1, 1, 1],
    points: 610,
    multiplier: 3.8,
    color: 0xb8c5ff,
    fact: 'Ammonia is a key ingredient in modern fertilizer production.',
    unlockLevel: 6,
  },
  {
    id: 'methane',
    name: 'Methane',
    formula: 'CH4',
    inputs: [6, 1, 1, 1, 1],
    points: 680,
    multiplier: 4,
    color: 0x8ef1d5,
    fact: 'Methane is the main component of natural gas.',
    unlockLevel: 6,
  },
  {
    id: 'hydrogen_peroxide',
    name: 'Hydrogen Peroxide',
    formula: 'H2O2',
    inputs: [1, 1, 8, 8],
    points: 760,
    multiplier: 4.2,
    color: 0x8df3ff,
    fact: 'Hydrogen peroxide is used as a disinfectant and bleaching agent.',
    unlockLevel: 7,
  },
  {
    id: 'hydrochloric_acid',
    name: 'Hydrochloric Acid',
    formula: 'HCl',
    inputs: [1, 17],
    points: 540,
    multiplier: 3.6,
    color: 0xbdf07d,
    fact: 'Hydrochloric acid is naturally present in the human stomach.',
    unlockLevel: 7,
  },
  {
    id: 'hydroxyl',
    name: 'Hydroxyl',
    formula: 'OH',
    inputs: [8, 1],
    points: 360,
    multiplier: 3.0,
    color: 0x9fe6ff,
    fact: 'Hydroxyl radicals are highly reactive and important in atmospheric chemistry.',
    unlockLevel: 5,
    priority: 3,
  },
  {
    id: 'hydrogen_fluoride',
    name: 'Hydrogen Fluoride',
    formula: 'HF',
    inputs: [1, 9],
    points: 420,
    multiplier: 3.2,
    color: 0xbdf7c4,
    fact: 'Hydrogen fluoride is used to produce many fluorine-containing compounds.',
    unlockLevel: 5,
    priority: 4,
  },
  {
    id: 'lithium_hydride',
    name: 'Lithium Hydride',
    formula: 'LiH',
    inputs: [3, 1],
    points: 460,
    multiplier: 3.3,
    color: 0xd5c8ff,
    fact: 'Lithium hydride is a light ionic compound used in high-energy chemistry.',
    unlockLevel: 5,
    priority: 3,
  },
  {
    id: 'sodium_chloride',
    name: 'Sodium Chloride',
    formula: 'NaCl',
    inputs: [11, 17],
    points: 820,
    multiplier: 4.5,
    color: 0xfff3b0,
    fact: 'Table salt forms a crystal lattice of sodium and chloride ions.',
    unlockLevel: 8,
  },
  {
    id: 'magnesium_oxide',
    name: 'Magnesium Oxide',
    formula: 'MgO',
    inputs: [12, 8],
    points: 610,
    multiplier: 3.8,
    color: 0xf5ffe9,
    fact: 'Magnesium oxide is a high-melting ceramic used in refractories.',
    unlockLevel: 6,
  },
  {
    id: 'silicon_carbide',
    name: 'Silicon Carbide',
    formula: 'SiC',
    inputs: [14, 6],
    points: 720,
    multiplier: 4.1,
    color: 0xd8dfc8,
    fact: 'Silicon carbide is an ultra-hard material used in abrasives and semiconductors.',
    unlockLevel: 7,
  },
  {
    id: 'carbon_monoxide',
    name: 'Carbon Monoxide',
    formula: 'CO',
    inputs: [6, 8],
    points: 430,
    multiplier: 3.3,
    color: 0xb2d2de,
    fact: 'Carbon monoxide is colorless and dangerous because it binds to hemoglobin.',
    unlockLevel: 8,
    priority: 1,
  },
  {
    id: 'nitric_oxide',
    name: 'Nitric Oxide',
    formula: 'NO',
    inputs: [7, 8],
    points: 500,
    multiplier: 3.5,
    color: 0x9ec3ff,
    fact: 'Nitric oxide is a signaling molecule used by the body to relax blood vessels.',
    unlockLevel: 6,
  },
  {
    id: 'hydrogen_cyanide',
    name: 'Hydrogen Cyanide',
    formula: 'HCN',
    inputs: [1, 6, 7],
    points: 640,
    multiplier: 4.0,
    color: 0xaed8f0,
    fact: 'Hydrogen cyanide is a small, linear molecule with important industrial uses.',
    unlockLevel: 7,
  },
  {
    id: 'nitrogen_dioxide',
    name: 'Nitrogen Dioxide',
    formula: 'NO2',
    inputs: [7, 8, 8],
    points: 620,
    multiplier: 4.1,
    color: 0xe8b082,
    fact: 'Nitrogen dioxide contributes to urban smog and acid rain formation.',
    unlockLevel: 6,
  },
  {
    id: 'sulfur_dioxide',
    name: 'Sulfur Dioxide',
    formula: 'SO2',
    inputs: [16, 8, 8],
    points: 700,
    multiplier: 4.3,
    color: 0xffcc88,
    fact: 'Sulfur dioxide is produced by volcanoes and burning sulfur-containing fuels.',
    unlockLevel: 7,
  },
  {
    id: 'sulfur_trioxide',
    name: 'Sulfur Trioxide',
    formula: 'SO3',
    inputs: [16, 8, 8, 8],
    points: 860,
    multiplier: 4.8,
    color: 0xffd694,
    fact: 'Sulfur trioxide reacts quickly with water to form sulfuric acid.',
    unlockLevel: 8,
  },
  {
    id: 'nitric_acid',
    name: 'Nitric Acid',
    formula: 'HNO3',
    inputs: [1, 7, 8, 8, 8],
    points: 930,
    multiplier: 5,
    color: 0xc6f0ad,
    fact: 'Nitric acid is widely used in fertilizers, dyes, and chemical synthesis.',
    unlockLevel: 8,
  },
  {
    id: 'sodium_hydroxide',
    name: 'Sodium Hydroxide',
    formula: 'NaOH',
    inputs: [11, 8, 1],
    points: 780,
    multiplier: 4.4,
    color: 0xe8f7ff,
    fact: 'Sodium hydroxide is a strong base used in soap and paper manufacturing.',
    unlockLevel: 8,
  },
  {
    id: 'silicon_dioxide',
    name: 'Silicon Dioxide',
    formula: 'SiO2',
    inputs: [14, 8, 8],
    points: 910,
    multiplier: 4.9,
    color: 0xd7f0ff,
    fact: 'Silicon dioxide is the main component of quartz and common sand.',
    unlockLevel: 9,
  },
  {
    id: 'calcium_carbonate',
    name: 'Calcium Carbonate',
    formula: 'CaCO3',
    inputs: [20, 6, 8, 8, 8],
    points: 1080,
    multiplier: 5.4,
    color: 0xf2f1e7,
    fact: 'Calcium carbonate forms limestone, chalk, and many shells.',
    unlockLevel: 10,
  },
  {
    id: 'ethanol',
    name: 'Ethanol',
    formula: 'C2H6O',
    inputs: [6, 6, 1, 1, 1, 1, 1, 1, 8],
    points: 1160,
    multiplier: 5.8,
    color: 0xffe4bd,
    fact: 'Ethanol is produced by fermentation and used as fuel and solvent.',
    unlockLevel: 10,
  },
  {
    id: 'glucose',
    name: 'Glucose',
    formula: 'C6H12O6',
    inputs: [6, 6, 6, 6, 6, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 8, 8, 8, 8, 8, 8],
    points: 1200,
    multiplier: 6,
    color: 0xffb86e,
    fact: 'Glucose is a primary fuel molecule for cells in living organisms.',
    unlockLevel: 10,
  },
];

const MOLECULE_FX_PRESET_DEFAULT = {
  atomScale: 0.42,
  maxAtoms: 5,
  burstRadius: 0.56,
  startScale: 0.76,
  peakScale: 1.28,
  duration: 1.04,
  rise: 0.3,
  floatWave: 0.05,
  spinSpeed: 1.3,
  fadeStart: 0.42,
  smokeAt: 0.5,
  smokeCount: 12,
  finalShatterAt: 0.8,
  finalShatter: 10,
  sparkCount: 14,
};

const MOLECULE_FX_PRESET_BY_ID = {
  water: {
    atomScale: 0.46,
    maxAtoms: 5,
    burstRadius: 0.62,
    duration: 1.08,
    smokeCount: 16,
    sparkCount: 18,
  },
  methane: {
    atomScale: 0.44,
    maxAtoms: 6,
    burstRadius: 0.64,
    duration: 1.02,
    finalShatter: 16,
    sparkCount: 20,
  },
  glucose: {
    atomScale: 0.36,
    maxAtoms: 8,
    burstRadius: 0.84,
    peakScale: 1.46,
    duration: 1.28,
    rise: 0.42,
    smokeCount: 24,
    finalShatter: 28,
    sparkCount: 26,
  },
};

for (const recipe of MOLECULE_RECIPES) {
  const inputCount = Array.isArray(recipe.inputs) ? recipe.inputs.length : 2;
  const preset = MOLECULE_FX_PRESET_BY_ID[recipe.id] ?? {};
  if (!Number.isFinite(recipe.fxIntensity)) {
    recipe.fxIntensity = Math.max(0.82, Math.min(2.2, 0.86 + inputCount * 0.12));
  }
  recipe.presentation = {
    ...MOLECULE_FX_PRESET_DEFAULT,
    ...preset,
    ...(recipe.presentation && typeof recipe.presentation === 'object' ? recipe.presentation : {}),
  };
}

export const MOLECULE_UNLOCK_LEVEL = 5;
export const MOLECULE_UNLOCK_DISCOVERED = 10;
export const MOLECULE_DETECT_DIST_MULT = 1.22;

export const CUP_BASE = {
  halfX: 5,
  get halfZ() {
    return Math.max(0.52, MAX_RADIUS + 0.08);
  },
  wallT: 0.14,
};

export const DROP_TYPE_MAX = 8;
export const DROP_COOLDOWN_MS = 420;
export const GAME_OVER_DWELL_SEC = 0.95;

export const LEVEL_GOAL_START = 360;
export const LEVEL_GOAL_SCALE = 1.18;
export const LEVEL_GOAL_ADD = 54;
export const GAME_OVER_BELOW_RIM = 0.065;

export const COMBO_CHAIN_SEC = 1.9;
export const COMBO_MAX_MULT = 4;
export const COMBO_MULT_PER_TIER = 0.35;

export const DANGER_PULSE_BAND = 1.35;
export const DROP_VY_PER_LEVEL = 0.028;
export const DROP_VY_LEVEL_CAP = 0.38;

export const ATOM_VISUAL_DEFAULTS = {
  coreScale: 0.74,
  nucleusScale: 0.2,
  nucleusOpacity: 0.96,
  nucleusEmissive: 0.3,
  cloudScale: 1.08,
  cloudOpacity: 0.06,
  cloudGlow: 0.14,
  cloudSpin: 0.28,
  electronCount: 3,
  electronSpeed: 0.48,
  shellCount: 3,
  shellRadius: 1.08,
  shellThickness: 0.01,
  shellOpacity: 0.13,
  shellSpin: 0.52,
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function clampColor(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return clamp(Math.floor(n), 0x000000, 0xffffff);
}

function mixColor(a, b, t = 0.5) {
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

/**
 * Data-driven atom render profile.
 * Each element may define `visual` in ELEMENTS entries to override these.
 * Example:
 * visual: { cloudOpacity: 0.2, shellCount: 3, nucleusScale: 0.16 }
 */
export function getAtomVisualProfile(spec) {
  const z = spec?.atomicNumber ?? 1;
  const phase = spec?.phase ?? 'solid';
  const family = spec?.family ?? 'nonmetal';
  const out = { ...ATOM_VISUAL_DEFAULTS };
  const baseColor = clampColor(spec?.color) ?? 0x88bbff;

  out.coreColor = mixColor(baseColor, 0x08101d, phase === 'gas' ? 0.2 : 0.12);
  out.electronColor = mixColor(baseColor, 0xffffff, phase === 'gas' ? 0.62 : 0.46);
  out.nucleusColor = mixColor(0xff9d7d, baseColor, family === 'transition-metal' ? 0.22 : 0.14);
  out.protonColor = mixColor(0xff505f, baseColor, 0.18);
  out.neutronColor = mixColor(0x96d4ff, baseColor, 0.22);
  out.shellColor = mixColor(baseColor, 0xffef9c, phase === 'gas' ? 0.34 : 0.24);
  out.haloColor = mixColor(baseColor, 0xffffff, 0.62);

  if (phase === 'gas') {
    out.coreScale = 0.72;
    out.cloudScale = 1.12;
    out.cloudOpacity = 0.12;
    out.cloudGlow = 0.12;
    out.nucleusScale = 0.11;
    out.nucleusOpacity = 0.54;
    out.shellCount = Math.max(out.shellCount, 2);
    out.shellOpacity = 0.22;
    out.shellSpin = 0.42;
  } else if (phase === 'liquid') {
    out.coreScale = 0.82;
    out.cloudScale = 1.02;
    out.cloudOpacity = 0.07;
    out.nucleusScale = 0.14;
    out.shellCount = Math.max(out.shellCount, 1);
    out.shellOpacity = 0.1;
  }

  if (family === 'noble-gas') {
    out.cloudScale += 0.08;
    out.cloudOpacity += 0.04;
    out.cloudGlow += 0.06;
    out.nucleusScale = Math.max(0.12, out.nucleusScale - 0.02);
    out.nucleusEmissive += 0.1;
    out.shellCount = Math.max(out.shellCount, 2);
    out.shellOpacity += 0.05;
  } else if (family === 'transition-metal') {
    out.coreScale += 0.06;
    out.cloudScale -= 0.08;
    out.cloudOpacity -= 0.04;
    out.nucleusScale += 0.04;
    out.nucleusOpacity += 0.06;
    out.shellCount = 1;
    out.shellSpin *= 0.85;
  } else if (family === 'halogen') {
    out.cloudOpacity += 0.03;
    out.cloudGlow += 0.04;
    out.shellCount = Math.max(out.shellCount, 3);
    out.shellSpin += 0.08;
  }

  if (z <= 2) {
    out.nucleusScale = Math.max(0.11, out.nucleusScale - 0.03);
    out.shellCount = Math.max(1, Math.min(out.shellCount, 2));
  } else if (z > 54) {
    out.coreScale += 0.04;
    out.nucleusScale += 0.03;
    out.shellCount = Math.max(1, out.shellCount - 1);
    out.cloudOpacity -= 0.015;
  }

  const custom = spec?.visual && typeof spec.visual === 'object' ? spec.visual : null;
  if (custom) {
    for (const key of Object.keys(custom)) {
      out[key] = custom[key];
    }
  }

  out.coreScale = clamp(out.coreScale, 0, 1.2);
  out.nucleusScale = clamp(out.nucleusScale, 0, 1);
  out.nucleusOpacity = clamp(out.nucleusOpacity, 0, 1);
  out.nucleusEmissive = clamp(out.nucleusEmissive, 0, 0.6);
  out.cloudScale = clamp(out.cloudScale, 0, 1.8);
  out.cloudOpacity = clamp(out.cloudOpacity, 0, 0.32);
  out.cloudGlow = clamp(out.cloudGlow, 0, 0.34);
  out.cloudSpin = clamp(out.cloudSpin, 0, 1.2);
  out.electronCount = Math.round(clamp(out.electronCount ?? out.shellCount ?? 2, 0, 8));
  out.electronSpeed = clamp(out.electronSpeed ?? out.shellSpin ?? 0.34, 0, 1.8);
  out.cloudSpin = clamp(Math.max(out.cloudSpin, out.electronSpeed * 0.55), 0, 1.2);
  out.shellCount = Math.round(clamp(out.electronCount || out.shellCount, 0, 8));
  out.shellRadius = clamp(out.shellRadius, 0, 1.6);
  out.shellThickness = clamp(out.shellThickness, 0, 0.08);
  out.shellOpacity = clamp(out.shellOpacity, 0, 0.4);
  out.shellSpin = clamp(Math.max(out.shellSpin, out.electronSpeed), 0, 1.4);
  const nucleusColor = clampColor(out.nucleusColor);
  if (nucleusColor != null) out.nucleusColor = nucleusColor;
  const electronColor = clampColor(out.electronColor);
  if (electronColor != null) out.electronColor = electronColor;
  const protonColor = clampColor(out.protonColor);
  if (protonColor != null) out.protonColor = protonColor;
  const neutronColor = clampColor(out.neutronColor);
  if (neutronColor != null) out.neutronColor = neutronColor;
  const coreColor = clampColor(out.coreColor);
  if (coreColor != null) out.coreColor = coreColor;
  const shellColor = clampColor(out.shellColor);
  if (shellColor != null) out.shellColor = shellColor;
  const haloColor = clampColor(out.haloColor);
  if (haloColor != null) out.haloColor = haloColor;
  return out;
}
