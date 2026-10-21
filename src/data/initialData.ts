import {
  MelaminaBoard,
  CutPiece,
  PredefinedCut,
  EdgeBandingRoll,
  EdgeBandingPiece,
  InventoryItem,
  WorkshopOrder,
  FurnitureDesign,
  CashMovement,
  DesignCutPiece,
} from '../types/atelier';

export const formatARS = (val: number): string => {
  const safe = Number.isFinite(val) ? val : 0;
  return '$' + Math.round(safe).toLocaleString('es-AR');
};

export const formatMm = (val: number): string => {
  const safe = Number.isFinite(val) ? Number(val.toFixed(2)) : 0;
  return String(safe).replace('.', ',');
};

export const parseMm = (raw: string | number, fallback = 0): number => {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : fallback;
  }
  const normalized = String(raw || '')
    .trim()
    .replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Cortes cargados por defecto según especificación del taller (100% editables y con lados de filo por separado)
export const INITIAL_PREDEFINED_CUTS: PredefinedCut[] = [
  {
    id: 'pre-techo',
    name: 'Techo',
    widthMm: 400,
    heightMm: 335,
    edgesType: '3L',
    edgesLabel: '3 Lados con filo',
    allowRotation: true,
    mandatoryGrain: false,
  },
  {
    id: 'pre-piso',
    name: 'Piso',
    widthMm: 400,
    heightMm: 335,
    edgesType: '3L',
    edgesLabel: '3 Lados con filo',
    allowRotation: true,
    mandatoryGrain: false,
  },
  {
    id: 'pre-laterales',
    name: 'Laterales',
    widthMm: 280,
    heightMm: 335,
    edgesType: '2L',
    edgesLabel: '2 Lados con filo',
    allowRotation: true,
    mandatoryGrain: false,
  },
  {
    id: 'pre-frente',
    name: 'Frente',
    widthMm: 395,
    heightMm: 160,
    edgesType: '4L',
    edgesLabel: '4 Lados con filo',
    allowRotation: true,
    mandatoryGrain: false,
  },
  {
    id: 'pre-cajones',
    name: 'Cajones',
    widthMm: 301.5,
    heightMm: 83,
    edgesType: '1L',
    edgesLabel: '1 Lado con filo',
    allowRotation: true,
    mandatoryGrain: false,
  },
  {
    id: 'pre-techo-secador',
    name: 'Techo secador',
    widthMm: 500,
    heightMm: 335,
    edgesType: '3L',
    edgesLabel: '3 Lados con filo',
    allowRotation: true,
    mandatoryGrain: false,
  },
  {
    id: 'pre-mesita-grande',
    name: 'Mesita grande',
    widthMm: 700,
    heightMm: 335,
    edgesType: '3L',
    edgesLabel: '3 Lados con filo',
    allowRotation: true,
    mandatoryGrain: false,
  },
];

export const INITIAL_CUT_PIECES: CutPiece[] = [
  {
    id: 'cut-techo',
    numberLabel: '1',
    name: 'Techo',
    subtitle: '400 × 335 mm • Melamina 18mm',
    widthMm: 400,
    heightMm: 335,
    quantity: 1,
    unitPriceArs: 0,
    edgesLabel: '3 Lados con filo',
    edgesType: '3L',
    allowRotation: true,
    mandatoryGrain: false,
  },
  {
    id: 'cut-piso',
    numberLabel: '2',
    name: 'Piso',
    subtitle: '400 × 335 mm • Melamina 18mm',
    widthMm: 400,
    heightMm: 335,
    quantity: 1,
    unitPriceArs: 0,
    edgesLabel: '3 Lados con filo',
    edgesType: '3L',
    allowRotation: true,
    mandatoryGrain: false,
  },
  {
    id: 'cut-laterales',
    numberLabel: '3-4',
    name: 'Laterales',
    subtitle: '280 × 335 mm • Melamina 18mm',
    widthMm: 280,
    heightMm: 335,
    quantity: 2,
    unitPriceArs: 0,
    edgesLabel: '2 Lados con filo',
    edgesType: '2L',
    allowRotation: true,
    mandatoryGrain: false,
  },
  {
    id: 'cut-frente',
    numberLabel: '5',
    name: 'Frente',
    subtitle: '395 × 160 mm • Melamina 18mm',
    widthMm: 395,
    heightMm: 160,
    quantity: 1,
    unitPriceArs: 0,
    edgesLabel: '4 Lados con filo',
    edgesType: '4L',
    allowRotation: true,
    mandatoryGrain: false,
  },
  {
    id: 'cut-cajones',
    numberLabel: '6-7',
    name: 'Cajones',
    subtitle: '301,5 × 83 mm • Melamina 18mm',
    widthMm: 301.5,
    heightMm: 83,
    quantity: 2,
    unitPriceArs: 0,
    edgesLabel: '1 Lado con filo',
    edgesType: '1L',
    allowRotation: true,
    mandatoryGrain: false,
  },
  {
    id: 'cut-techo-secador',
    numberLabel: '8',
    name: 'Techo secador',
    subtitle: '500 × 335 mm • Melamina 18mm',
    widthMm: 500,
    heightMm: 335,
    quantity: 1,
    unitPriceArs: 0,
    edgesLabel: '3 Lados con filo',
    edgesType: '3L',
    allowRotation: true,
    mandatoryGrain: false,
  },
  {
    id: 'cut-mesita-grande',
    numberLabel: '9',
    name: 'Mesita grande',
    subtitle: '700 × 335 mm • Melamina 18mm',
    widthMm: 700,
    heightMm: 335,
    quantity: 1,
    unitPriceArs: 0,
    edgesLabel: '3 Lados con filo',
    edgesType: '3L',
    allowRotation: true,
    mandatoryGrain: false,
  },
];

export const DEFAULT_CATALOG_STRUCTURE_CUTS: DesignCutPiece[] = [
  {
    id: 'dc-techo',
    name: 'Techo',
    lengthMm: 400,
    depthMm: 335,
    quantity: 1,
    edgeSidesCount: 3,
  },
  {
    id: 'dc-piso',
    name: 'Piso',
    lengthMm: 400,
    depthMm: 335,
    quantity: 1,
    edgeSidesCount: 3,
  },
  {
    id: 'dc-laterales',
    name: 'Laterales',
    lengthMm: 280,
    depthMm: 335,
    quantity: 2,
    edgeSidesCount: 2,
  },
  {
    id: 'dc-frente',
    name: 'Frente',
    lengthMm: 395,
    depthMm: 160,
    quantity: 1,
    edgeSidesCount: 4,
  },
  {
    id: 'dc-cajones',
    name: 'Cajones',
    lengthMm: 301.5,
    depthMm: 83,
    quantity: 2,
    edgeSidesCount: 1,
  },
  {
    id: 'dc-techo-secador',
    name: 'Techo secador',
    lengthMm: 500,
    depthMm: 335,
    quantity: 1,
    edgeSidesCount: 3,
  },
  {
    id: 'dc-mesita-grande',
    name: 'Mesita grande',
    lengthMm: 700,
    depthMm: 335,
    quantity: 1,
    edgeSidesCount: 3,
  },
];

export const INITIAL_EDGE_PIECES: EdgeBandingPiece[] = [
  {
    id: 'ep-techo',
    name: 'Techo',
    subtitle: '400 × 335 mm • 3 lados con filo',
    lengthMm: 400,
    widthMm: 335,
    quantity: 1,
    longSidesCount: 2,
    shortSidesCount: 1,
  },
  {
    id: 'ep-piso',
    name: 'Piso',
    subtitle: '400 × 335 mm • 3 lados con filo',
    lengthMm: 400,
    widthMm: 335,
    quantity: 1,
    longSidesCount: 2,
    shortSidesCount: 1,
  },
  {
    id: 'ep-laterales',
    name: 'Laterales',
    subtitle: '280 × 335 mm • 2 lados con filo',
    lengthMm: 280,
    widthMm: 335,
    quantity: 2,
    longSidesCount: 1,
    shortSidesCount: 1,
  },
  {
    id: 'ep-frente',
    name: 'Frente',
    subtitle: '395 × 160 mm • 4 lados con filo',
    lengthMm: 395,
    widthMm: 160,
    quantity: 1,
    longSidesCount: 2,
    shortSidesCount: 2,
  },
  {
    id: 'ep-cajones',
    name: 'Cajones',
    subtitle: '301,5 × 83 mm • 1 lado con filo',
    lengthMm: 301.5,
    widthMm: 83,
    quantity: 2,
    longSidesCount: 1,
    shortSidesCount: 0,
  },
  {
    id: 'ep-techo-secador',
    name: 'Techo secador',
    subtitle: '500 × 335 mm • 3 lados con filo',
    lengthMm: 500,
    widthMm: 335,
    quantity: 1,
    longSidesCount: 2,
    shortSidesCount: 1,
  },
  {
    id: 'ep-mesita-grande',
    name: 'Mesita grande',
    subtitle: '700 × 335 mm • 3 lados con filo',
    lengthMm: 700,
    widthMm: 335,
    quantity: 1,
    longSidesCount: 2,
    shortSidesCount: 1,
  },
];

export const INITIAL_BOARDS: MelaminaBoard[] = [];

export const INITIAL_ORDERS: WorkshopOrder[] = [];

export const INITIAL_CASH_MOVEMENTS: CashMovement[] = [];

export const INITIAL_DESIGNS: FurnitureDesign[] = [];

export const INITIAL_FONDO_BOARDS: MelaminaBoard[] = [];

export const INITIAL_FONDO_PIECES: CutPiece[] = [];

export const INITIAL_EDGE_ROLLS: EdgeBandingRoll[] = [];

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [];
