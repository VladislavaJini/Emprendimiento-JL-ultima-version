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
} from '../types/atelier';

// Por defecto toda la aplicación inicia con datos vacíos para que el usuario cargue, edite y elimine sus propios registros
export const INITIAL_PREDEFINED_CUTS: PredefinedCut[] = [];

export const INITIAL_BOARDS: MelaminaBoard[] = [];

export const INITIAL_CUT_PIECES: CutPiece[] = [];

export const INITIAL_ORDERS: WorkshopOrder[] = [];

export const INITIAL_CASH_MOVEMENTS: CashMovement[] = [];

export const INITIAL_DESIGNS: FurnitureDesign[] = [];

export const INITIAL_FONDO_BOARDS: MelaminaBoard[] = [];

export const INITIAL_FONDO_PIECES: CutPiece[] = [];

export const INITIAL_EDGE_ROLLS: EdgeBandingRoll[] = [];

export const INITIAL_EDGE_PIECES: EdgeBandingPiece[] = [];

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [];

export const formatARS = (val: number): string => {
  const safe = Number.isFinite(val) ? val : 0;
  return '$' + Math.round(safe).toLocaleString('es-AR');
};
