export type ScreenId =
  | 'inicio'
  | 'presupuesto'
  | 'guillotina'
  | 'fondo'
  | 'filo'
  | 'inventario'
  | 'catalogo'
  | 'operaciones'
  | 'logistica'
  | 'pedidos'
  | 'gamificacion';

export interface MelaminaBoard {
  id: string;
  name: string;
  brandSpec?: string;
  widthMm: number;
  heightMm: number;
  thicknessMm?: number;
  costArs: number;
  swatchColor: string;
  grainType?: 'horizontal' | 'vertical';
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
  edgesType: '4L' | '3L' | '2L' | '1L' | '0L';
  allowRotation: boolean;
  mandatoryGrain?: boolean;
}

export interface PredefinedCut {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  edgesType: '4L' | '3L' | '2L' | '1L' | '0L';
  edgesLabel: string;
  allowRotation: boolean;
  mandatoryGrain?: boolean;
}

export interface EdgeBandingRoll {
  id: string;
  name: string;
  widthThickSpec: string;
  rollLengthMeters: number;
  rollPriceArs: number;
  swatchColor: string;
  trimWasteMmPerSide: number;
}

export interface EdgeBandingPiece {
  id: string;
  name: string;
  subtitle: string;
  lengthMm: number;
  widthMm: number;
  quantity: number;
  longSidesCount: 0 | 1 | 2;
  shortSidesCount: 0 | 1 | 2;
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

export interface DrawerSpec {
  id: string;
  index: number;
  // 1. Maderas del cajón
  frontPieceName?: string;
  frontWidthMm: number;
  frontHeightMm: number;
  frontQty?: number;
  sidesPieceName?: string;
  sidesDepthMm: number;
  sidesHeightMm: number;
  sidesQty?: number;
  backPieceName?: string;
  backWidthMm: number;
  backHeightMm: number;
  backQty?: number;
  // 2. Fondo de cajón
  bottomWidthMm: number;
  bottomDepthMm: number;
  bottomQty?: number;
  bottomMaterial?: string;
  // 3. Filo (Tapacantos)
  edgeSidesCount?: 0 | 1 | 2 | 3 | 4;
  sidesEdgeCount?: 0 | 1 | 2 | 3 | 4;
  edgeMeters: number;
  edgePricePerMeterArs?: number;
  edgeCostArs?: number;
  edgeType?: string;
  // 4. Insumos / Herrajes
  slideType: string;
  slideQty?: number;
  handleType: string;
  handleQty?: number;
  screwType?: string;
  screwsCount: number;
}

export interface WorkshopOrder {
  id: string;
  code: string;
  deliveryDate: string;
  deliveryDateIso?: string;
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
  // Extended full-circuit fields
  furnitureId?: string;
  furnitureName?: string;
  furnitureQty?: number;
  furniturePriceArs?: number;
  freightArs?: number;
  ratePerKm?: number;
  drawerCount?: number;
  drawersConfig?: DrawerSpec[];
  inCourse?: boolean;
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
  drawerCount?: number;
  drawersConfig?: DrawerSpec[];
  thumbnailUrl?: string;
  structureEdgeSidesCount?: 0 | 1 | 2 | 3 | 4;
  edgePricePerMeterArs?: number;
  totalEdgeMeters?: number;
  totalEdgeCostArs?: number;
}
