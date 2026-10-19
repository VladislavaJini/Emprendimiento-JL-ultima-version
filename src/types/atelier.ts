export type ScreenId =
  | 'guillotina'
  | 'fondo'
  | 'filo'
  | 'inventario'
  | 'catalogo'
  | 'cad'
  | 'operaciones'
  | 'logistica'
  | 'gamificacion';

export interface MelaminaBoard {
  id: string;
  name: string;
  brandSpec: string;
  widthMm: number;
  heightMm: number;
  costArs: number;
  swatchColor: string;
  grainType: 'horizontal' | 'vertical';
}

export interface CutPiece {
  id: string;
  numberLabel: string;
  name: string;
  subtitle: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  unitPriceArs: number;
  edgesLabel: string;
  edgesType: '4L' | '2L' | '1L' | '0L';
  allowRotation: boolean;
  mandatoryGrain?: boolean;
}

export interface EdgeBandingRoll {
  id: string;
  name: string;
  widthThickSpec: string; // e.g. "22mm × 0.45mm PVC" or "22mm × 2.0mm ABS"
  rollLengthMeters: number; // e.g. 10, 25, 50
  rollPriceArs: number; // e.g. 6500
  swatchColor: string;
  trimWasteMmPerSide: number; // e.g. 15mm minimum waste per applied edge
}

export interface EdgeBandingPiece {
  id: string;
  name: string;
  subtitle: string;
  lengthMm: number;
  widthMm: number;
  quantity: number;
  longSidesCount: 0 | 1 | 2; // 0, 1, or 2 largos
  shortSidesCount: 0 | 1 | 2; // 0, 1, or 2 anchos
}

export type InventoryCategory = 'herraje' | 'pieza_cortada' | 'material';

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  category: InventoryCategory;
  unitPriceArs: number;
  unitLabel: string;
  stockQty: number;
  step: number;
  iconType: 'board' | 'edge' | 'slide' | 'leg' | 'screw';
}

export type OrderStage = 'proceso' | 'terminado' | 'embalado' | 'entregado';

export interface WorkshopOrder {
  id: string;
  code: string;
  deliveryDate: string;
  clientName: string;
  location: string;
  distanceKm: number;
  itemsSummary: string;
  materialSpec: string;
  totalArs: number;
  stage: OrderStage;
  packagesCount: number;
  packagingSpec: string;
  address: string;
  featured?: boolean;
}

export interface CashMovement {
  id: string;
  description: string;
  amountArs: number;
  type: 'ingreso' | 'egreso';
  channel: 'efectivo' | 'bancos';
  timestamp: string;
}

export interface BomMaterialItem {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  unitPriceArs: number;
  unitLabel: string;
  quantity: number;
  step: number;
  iconType: 'board' | 'edge' | 'slide' | 'leg' | 'screw';
  inventoryItemId?: string;
  cadQuantityLabel?: string;
  cadSubLabel?: string;
}

export interface FurnitureDesign {
  id: string;
  code: string;
  name: string;
  shortTitle: string;
  catalogTitle: string;
  description: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  materialSummary: string;
  cutPiecesCount: number;
  suggestedPvpArs: number;
  baseCostArs: number;
  activeInWorkshop: boolean;
  bodyTexture: 'Blanco Puro' | 'Negro Grafito';
  frontTexture: 'Carvalho' | 'Báltico' | 'Gaudí';
  bomItems: BomMaterialItem[];
}
