import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Puzzle,
  Settings,
  Plus,
  Minus,
  Save,
  FileText,
  Trash2,
  Pencil,
  X,
  Layers,
  Disc,
  RotateCcw,
} from 'lucide-react';
import { formatARS } from '../data/initialData';
import {
  InventoryItem,
  CutPiece,
  MelaminaBoard,
  EdgeBandingRoll,
} from '../types/atelier';

export type EdgeCode =
  | '0L'
  | '1L'
  | '1P'
  | '2L'
  | '1L1P'
  | '1L1A'
  | '2P'
  | '3L'
  | '2L1P'
  | '1L2P'
  | '4L';

export interface PresupuestoPiece {
  id: string;
  name: string;
  lengthMm: number;
  widthMm: number; // Profundidad (mm)
  thicknessMm: number;
  quantity: number;
  edgeCode: EdgeCode;
}

export interface PresupuestoHardware {
  id: string;
  name: string;
  quantity: number;
  unitPriceArs: number;
}

interface ScreenPresupuestoProps {
  onBack: () => void;
  boards?: MelaminaBoard[];
  edgeRolls?: EdgeBandingRoll[];
  inventoryItems?: InventoryItem[];
  onSendPiecesToGuillotine?: (
    pieces: Omit<CutPiece, 'id' | 'numberLabel'>[]
  ) => void;
  onShowToast: (msg: string) => void;
}

export const EDGE_OPTIONS: {
  code: EdgeCode;
  sidesCount: 0 | 1 | 2 | 3 | 4;
  label: string;
  short: string;
}[] = [
  {
    code: '0L',
    sidesCount: 0,
    label: '0 Lados (Sin filo)',
    short: '0 Lados (Sin filo)',
  },
  {
    code: '1L',
    sidesCount: 1,
    label: '1 Lado (1 Largo)',
    short: '1 Lado (1L)',
  },
  {
    code: '1P',
    sidesCount: 1,
    label: '1 Lado (1 Profundidad)',
    short: '1 Lado (1P)',
  },
  {
    code: '2L',
    sidesCount: 2,
    label: '2 Lados (2 Largos)',
    short: '2 Lados (2L)',
  },
  {
    code: '1L1P',
    sidesCount: 2,
    label: '2 Lados (1 Largo + 1 Prof.)',
    short: '2 Lados (1L+1P)',
  },
  {
    code: '2P',
    sidesCount: 2,
    label: '2 Lados (2 Profundidades)',
    short: '2 Lados (2P)',
  },
  {
    code: '3L',
    sidesCount: 3,
    label: '3 Lados (2 Largos + 1 Prof.)',
    short: '3 Lados (2L+1P)',
  },
  {
    code: '1L2P',
    sidesCount: 3,
    label: '3 Lados (1 Largo + 2 Prof.)',
    short: '3 Lados (1L+2P)',
  },
  {
    code: '4L',
    sidesCount: 4,
    label: '4 Lados (Perímetro completo)',
    short: '4 Lados (2L+2P)',
  },
];

const QUICK_SIDES_BUTTONS: {
  sides: 0 | 1 | 2 | 3 | 4;
  defaultCode: EdgeCode;
  label: string;
}[] = [
  { sides: 0, defaultCode: '0L', label: '0 Lados' },
  { sides: 1, defaultCode: '1L', label: '1 Lado' },
  { sides: 2, defaultCode: '2L', label: '2 Lados' },
  { sides: 3, defaultCode: '3L', label: '3 Lados' },
  { sides: 4, defaultCode: '4L', label: '4 Lados' },
];

export function getEdgeSidesCount(code?: EdgeCode): 0 | 1 | 2 | 3 | 4 {
  switch (code) {
    case '1L':
    case '1P':
      return 1;
    case '2L':
    case '1L1P':
    case '1L1A':
    case '2P':
      return 2;
    case '3L':
    case '2L1P':
    case '1L2P':
      return 3;
    case '4L':
      return 4;
    case '0L':
    default:
      return 0;
  }
}

export function calcPieceLinearEdgeMeters(
  lengthMm: number,
  depthMm: number,
  edgeCode: EdgeCode,
  quantity: number
): number {
  const l = Math.max(0, Number(lengthMm) || 0);
  const p = Math.max(0, Number(depthMm) || 0);
  const q = Math.max(0, Number(quantity) || 0);
  let mmPerUnit = 0;
  switch (edgeCode) {
    case '1L':
      mmPerUnit = l;
      break;
    case '1P':
      mmPerUnit = p;
      break;
    case '2L':
      mmPerUnit = l * 2;
      break;
    case '1L1P':
    case '1L1A':
      mmPerUnit = l + p;
      break;
    case '2P':
      mmPerUnit = p * 2;
      break;
    case '3L':
    case '2L1P':
      mmPerUnit = l * 2 + p;
      break;
    case '1L2P':
      mmPerUnit = l + p * 2;
      break;
    case '4L':
      mmPerUnit = (l + p) * 2;
      break;
    case '0L':
    default:
      mmPerUnit = 0;
      break;
  }
  return (mmPerUnit * q) / 1000;
}

export const ScreenPresupuesto: React.FC<ScreenPresupuestoProps> = ({
  onBack,
  boards = [],
  edgeRolls = [],
  inventoryItems = [],
  onSendPiecesToGuillotine,
  onShowToast,
}) => {
  // Base Board & Edge Banding Configuration (for accurate cut & edge calculations)
  const [boardWidthMm, setBoardWidthMm] = useState<number>(() => {
    try {
      const s = localStorage.getItem('mjl_pres_v2_board_w');
      if (s) return Math.max(100, Number(JSON.parse(s)) || 2750);
    } catch {}
    return boards[0]?.widthMm || 2750;
  });

  const [boardHeightMm, setBoardHeightMm] = useState<number>(() => {
    try {
      const s = localStorage.getItem('mjl_pres_v2_board_h');
      if (s) return Math.max(100, Number(JSON.parse(s)) || 1830);
    } catch {}
    return boards[0]?.heightMm || 1830;
  });

  const [boardPriceArs, setBoardPriceArs] = useState<number>(() => {
    try {
      const s = localStorage.getItem('mjl_pres_v2_board_price');
      if (s) return Math.max(0, Number(JSON.parse(s)) || 0);
    } catch {}
    return boards[0]?.costArs || 0;
  });

  const [edgePricePerMeterArs, setEdgePricePerMeterArs] = useState<number>(
    () => {
      try {
        const s = localStorage.getItem('mjl_pres_v2_edge_price_m');
        if (s) return Math.max(0, Number(JSON.parse(s)) || 0);
      } catch {}
      if (edgeRolls[0] && edgeRolls[0].rollLengthMeters > 0) {
        return Math.round(
          edgeRolls[0].rollPriceArs / edgeRolls[0].rollLengthMeters
        );
      }
      return 0;
    }
  );

  // 1. MESITA (Estructura) Cuts & Hardware — Empty by default
  const [mesaPieces, setMesaPieces] = useState<PresupuestoPiece[]>(() => {
    try {
      const saved = localStorage.getItem('mjl_pres_v2_mesa_pieces');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [mesaHardware, setMesaHardware] = useState<PresupuestoHardware[]>(
    () => {
      try {
        const saved = localStorage.getItem('mjl_pres_v2_mesa_hw');
        if (saved) return JSON.parse(saved);
      } catch {}
      return [];
    }
  );

  // 2. CAJONES (Por separado) Cuts & Hardware — Empty by default
  const [drawerPieces, setDrawerPieces] = useState<PresupuestoPiece[]>(() => {
    try {
      const saved = localStorage.getItem('mjl_pres_v2_drawer_pieces');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [drawerHardware, setDrawerHardware] = useState<PresupuestoHardware[]>(
    () => {
      try {
        const saved = localStorage.getItem('mjl_pres_v2_drawer_hw');
        if (saved) return JSON.parse(saved);
      } catch {}
      return [];
    }
  );

  const [drawerUnitsMultiplier, setDrawerUnitsMultiplier] = useState<number>(
    () => {
      try {
        const saved = localStorage.getItem('mjl_pres_v2_drawer_mult');
        if (saved) return Math.max(1, Number(JSON.parse(saved)) || 1);
      } catch {}
      return 1;
    }
  );

  // Automatic localStorage persistence
  useEffect(() => {
    try {
      localStorage.setItem('mjl_pres_v2_board_w', JSON.stringify(boardWidthMm));
      localStorage.setItem(
        'mjl_pres_v2_board_h',
        JSON.stringify(boardHeightMm)
      );
      localStorage.setItem(
        'mjl_pres_v2_board_price',
        JSON.stringify(boardPriceArs)
      );
      localStorage.setItem(
        'mjl_pres_v2_edge_price_m',
        JSON.stringify(edgePricePerMeterArs)
      );
      localStorage.setItem(
        'mjl_pres_v2_mesa_pieces',
        JSON.stringify(mesaPieces)
      );
      localStorage.setItem(
        'mjl_pres_v2_mesa_hw',
        JSON.stringify(mesaHardware)
      );
      localStorage.setItem(
        'mjl_pres_v2_drawer_pieces',
        JSON.stringify(drawerPieces)
      );
      localStorage.setItem(
        'mjl_pres_v2_drawer_hw',
        JSON.stringify(drawerHardware)
      );
      localStorage.setItem(
        'mjl_pres_v2_drawer_mult',
        JSON.stringify(drawerUnitsMultiplier)
      );
    } catch {}
  }, [
    boardWidthMm,
    boardHeightMm,
    boardPriceArs,
    edgePricePerMeterArs,
    mesaPieces,
    mesaHardware,
    drawerPieces,
    drawerHardware,
    drawerUnitsMultiplier,
  ]);

  // Quick Add inputs for Mesita Cuts
  const [mesaCutName, setMesaCutName] = useState('');
  const [mesaCutL, setMesaCutL] = useState('');
  const [mesaCutW, setMesaCutW] = useState('');
  const [mesaCutT, setMesaCutT] = useState('18');
  const [mesaCutQty, setMesaCutQty] = useState('1');
  const [mesaCutEdge, setMesaCutEdge] = useState<EdgeCode>('1L');

  // Quick Add inputs for Cajones Cuts
  const [drwCutName, setDrwCutName] = useState('');
  const [drwCutL, setDrwCutL] = useState('');
  const [drwCutW, setDrwCutW] = useState('');
  const [drwCutT, setDrwCutT] = useState('18');
  const [drwCutQty, setDrwCutQty] = useState('1');
  const [drwCutEdge, setDrwCutEdge] = useState<EdgeCode>('1L');

  // Edit Cut Modal (works for both 'mesa' and 'cajon')
  const [editingCutTarget, setEditingCutTarget] = useState<{
    section: 'mesa' | 'cajon';
    piece: PresupuestoPiece;
  } | null>(null);
  const [editCutName, setEditCutName] = useState('');
  const [editCutL, setEditCutL] = useState('');
  const [editCutW, setEditCutW] = useState('');
  const [editCutT, setEditCutT] = useState('18');
  const [editCutQty, setEditCutQty] = useState('1');
  const [editCutEdge, setEditCutEdge] = useState<EdgeCode>('0L');

  // Hardware Add/Edit Modal (works for both 'mesa' and 'cajon')
  const [hwModalSection, setHwModalSection] = useState<'mesa' | 'cajon' | null>(
    null
  );
  const [editingHwId, setEditingHwId] = useState<string | null>(null);
  const [hwName, setHwName] = useState('');
  const [hwQty, setHwQty] = useState('1');
  const [hwPrice, setHwPrice] = useState('');

  // PDF Preview Modal
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);

  // =========================================================================
  // EXACT MATHEMATICAL CALCULATIONS (Proportional to Board Value + Linear Edge)
  // =========================================================================
  const safeBoardW = Math.max(100, Number(boardWidthMm) || 2750);
  const safeBoardH = Math.max(100, Number(boardHeightMm) || 1830);
  const safeBoardPrice = Math.max(0, Number(boardPriceArs) || 0);
  const safeEdgePriceM = Math.max(0, Number(edgePricePerMeterArs) || 0);

  const boardAreaMm2 = safeBoardW * safeBoardH;
  const boardAreaM2 = boardAreaMm2 / 1_000_000;
  const costPerM2Ars = boardAreaM2 > 0 ? safeBoardPrice / boardAreaM2 : 0;

  // Function to compute exact proportional board cost for a piece
  const getPieceUnitBoardCost = (p: PresupuestoPiece): number => {
    const pieceAreaMm2 =
      Math.max(0, Number(p.lengthMm) || 0) *
      Math.max(0, Number(p.widthMm) || 0);
    if (boardAreaMm2 <= 0 || safeBoardPrice <= 0) return 0;
    return (pieceAreaMm2 / boardAreaMm2) * safeBoardPrice;
  };

  // Mesita Calculations
  const costoPlacasMesita = mesaPieces.reduce(
    (sum, p) => sum + getPieceUnitBoardCost(p) * p.quantity,
    0
  );
  const metrosFiloMesita = mesaPieces.reduce(
    (sum, p) =>
      sum +
      calcPieceLinearEdgeMeters(
        p.lengthMm,
        p.widthMm,
        p.edgeCode || '0L',
        p.quantity
      ),
    0
  );
  const costoFilosMesita = metrosFiloMesita * safeEdgePriceM;
  const costoHerrajesMesita = mesaHardware.reduce(
    (sum, h) => sum + h.unitPriceArs * h.quantity,
    0
  );

  // Cajones Calculations (multiplied by drawerUnitsMultiplier if > 1)
  const mult = Math.max(1, drawerUnitsMultiplier);
  const costoPlacasCajones =
    drawerPieces.reduce(
      (sum, p) => sum + getPieceUnitBoardCost(p) * p.quantity,
      0
    ) * mult;
  const metrosFiloCajones =
    drawerPieces.reduce(
      (sum, p) =>
        sum +
        calcPieceLinearEdgeMeters(
          p.lengthMm,
          p.widthMm,
          p.edgeCode || '0L',
          p.quantity
        ),
      0
    ) * mult;
  const costoFilosCajones = metrosFiloCajones * safeEdgePriceM;
  const costoHerrajesCajones =
    drawerHardware.reduce((sum, h) => sum + h.unitPriceArs * h.quantity, 0) *
    mult;

  // Combined Totals
  const totalCostoPlacas = Math.round(costoPlacasMesita + costoPlacasCajones);
  const totalMetrosFilo = Number(
    (metrosFiloMesita + metrosFiloCajones).toFixed(2)
  );
  const totalCostoFilos = Math.round(costoFilosMesita + costoFilosCajones);
  const totalCostoHerrajes = Math.round(
    costoHerrajesMesita + costoHerrajesCajones
  );
  const totalPresupuesto =
    totalCostoPlacas + totalCostoHerrajes + totalCostoFilos;

  const totalMesaCutUnits = mesaPieces.reduce((a, p) => a + p.quantity, 0);
  const totalDrawerCutUnits =
    drawerPieces.reduce((a, p) => a + p.quantity, 0) * mult;
  const totalDefinedPieces = totalMesaCutUnits + totalDrawerCutUnits;

  // =========================================================================
  // HANDLERS FOR MESITA & CAJONES CUTS
  // =========================================================================
  const handleAddMesaCut = () => {
    const l = parseInt(mesaCutL, 10);
    const w = parseInt(mesaCutW, 10);
    const t = parseInt(mesaCutT, 10) || 18;
    const q = Math.max(1, parseInt(mesaCutQty, 10) || 1);

    if (!l || l <= 0 || !w || w <= 0) {
      onShowToast(
        'Ingresá el Largo (mm) y Profundidad (mm) del corte de la mesita'
      );
      return;
    }

    const newPiece: PresupuestoPiece = {
      id: `mpz-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: mesaCutName.trim() || `Corte Mesita #${mesaPieces.length + 1}`,
      lengthMm: l,
      widthMm: w,
      thicknessMm: t,
      quantity: q,
      edgeCode: mesaCutEdge,
    };

    setMesaPieces((prev) => [...prev, newPiece]);
    setMesaCutName('');
    setMesaCutL('');
    setMesaCutW('');
    setMesaCutQty('1');
    onShowToast(`Corte de mesita agregado: ${newPiece.name} (${l}×${w} mm)`);
  };

  const handleAddDrawerCut = () => {
    const l = parseInt(drwCutL, 10);
    const w = parseInt(drwCutW, 10);
    const t = parseInt(drwCutT, 10) || 18;
    const q = Math.max(1, parseInt(drwCutQty, 10) || 1);

    if (!l || l <= 0 || !w || w <= 0) {
      onShowToast(
        'Ingresá el Largo (mm) y Profundidad (mm) del corte de cajón'
      );
      return;
    }

    const newPiece: PresupuestoPiece = {
      id: `dpz-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: drwCutName.trim() || `Corte Cajón #${drawerPieces.length + 1}`,
      lengthMm: l,
      widthMm: w,
      thicknessMm: t,
      quantity: q,
      edgeCode: drwCutEdge,
    };

    setDrawerPieces((prev) => [...prev, newPiece]);
    setDrwCutName('');
    setDrwCutL('');
    setDrwCutW('');
    setDrwCutQty('1');
    onShowToast(`Corte de cajón agregado: ${newPiece.name} (${l}×${w} mm)`);
  };

  const openEditCutModal = (
    section: 'mesa' | 'cajon',
    piece: PresupuestoPiece
  ) => {
    setEditingCutTarget({ section, piece });
    setEditCutName(piece.name);
    setEditCutL(String(piece.lengthMm));
    setEditCutW(String(piece.widthMm));
    setEditCutT(String(piece.thicknessMm));
    setEditCutQty(String(piece.quantity));
    setEditCutEdge(piece.edgeCode || '0L');
  };

  const handleSaveEditCut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCutTarget) return;
    const l = Math.max(10, parseInt(editCutL, 10) || 100);
    const w = Math.max(10, parseInt(editCutW, 10) || 100);
    const t = Math.max(3, parseInt(editCutT, 10) || 18);
    const q = Math.max(1, parseInt(editCutQty, 10) || 1);

    const updatedPiece: PresupuestoPiece = {
      ...editingCutTarget.piece,
      name: editCutName.trim() || editingCutTarget.piece.name,
      lengthMm: l,
      widthMm: w,
      thicknessMm: t,
      quantity: q,
      edgeCode: editCutEdge,
    };

    if (editingCutTarget.section === 'mesa') {
      setMesaPieces((prev) =>
        prev.map((p) => (p.id === updatedPiece.id ? updatedPiece : p))
      );
    } else {
      setDrawerPieces((prev) =>
        prev.map((p) => (p.id === updatedPiece.id ? updatedPiece : p))
      );
    }

    setEditingCutTarget(null);
    onShowToast(`Corte actualizado: ${updatedPiece.name}`);
  };

  // =========================================================================
  // HANDLERS FOR HARDWARE (MESITA & CAJONES)
  // =========================================================================
  const openAddHwModal = (section: 'mesa' | 'cajon') => {
    setHwModalSection(section);
    setEditingHwId(null);
    setHwName('');
    setHwQty('1');
    setHwPrice('');
  };

  const openEditHwModal = (
    section: 'mesa' | 'cajon',
    hw: PresupuestoHardware
  ) => {
    setHwModalSection(section);
    setEditingHwId(hw.id);
    setHwName(hw.name);
    setHwQty(String(hw.quantity));
    setHwPrice(String(hw.unitPriceArs));
  };

  const handleSaveHardware = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwModalSection) return;
    const qty = Math.max(1, parseInt(hwQty, 10) || 1);
    const price = Math.max(0, parseInt(hwPrice.replace(/\D/g, ''), 10) || 0);
    const cleanName =
      hwName.trim() ||
      (hwModalSection === 'mesa' ? 'Herraje Mesita' : 'Herraje Cajón');

    if (editingHwId) {
      const updater = (prev: PresupuestoHardware[]) =>
        prev.map((h) =>
          h.id === editingHwId
            ? { ...h, name: cleanName, quantity: qty, unitPriceArs: price }
            : h
        );
      if (hwModalSection === 'mesa') {
        setMesaHardware(updater);
      } else {
        setDrawerHardware(updater);
      }
      onShowToast(`Herraje actualizado: ${cleanName}`);
    } else {
      const newHw: PresupuestoHardware = {
        id: `hw-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: cleanName,
        quantity: qty,
        unitPriceArs: price,
      };
      if (hwModalSection === 'mesa') {
        setMesaHardware((prev) => [...prev, newHw]);
      } else {
        setDrawerHardware((prev) => [...prev, newHw]);
      }
      onShowToast(`Herraje agregado: ${cleanName}`);
    }

    setHwModalSection(null);
    setEditingHwId(null);
  };

  const handleClearAllPresupuesto = () => {
    setMesaPieces([]);
    setMesaHardware([]);
    setDrawerPieces([]);
    setDrawerHardware([]);
    setDrawerUnitsMultiplier(1);
    onShowToast('Presupuesto vaciado por completo (0 cortes y 0 herrajes)');
  };

  const mapEdgeCodeToGuillotine = (
    code: EdgeCode
  ): '4L' | '3L' | '2L' | '1L' | '0L' => {
    const sides = getEdgeSidesCount(code);
    if (sides === 4) return '4L';
    if (sides === 3) return '3L';
    if (sides === 2) return '2L';
    if (sides === 1) return '1L';
    return '0L';
  };

  const handleSendAllToGuillotine = () => {
    if (!onSendPiecesToGuillotine) return;
    const allToLoad: Omit<CutPiece, 'id' | 'numberLabel'>[] = [
      ...mesaPieces.map((p) => ({
        name: `${p.name} (Mesita)`,
        subtitle: `Espesor ${p.thicknessMm}mm`,
        widthMm: p.lengthMm,
        heightMm: p.widthMm,
        quantity: p.quantity,
        unitPriceArs: Math.round(getPieceUnitBoardCost(p)),
        edgesLabel:
          EDGE_OPTIONS.find((e) => e.code === p.edgeCode)?.short || 'Sin filo',
        edgesType: mapEdgeCodeToGuillotine(p.edgeCode),
        allowRotation: true,
        mandatoryGrain: false,
      })),
      ...drawerPieces.map((p) => ({
        name: `${p.name} (Cajón)`,
        subtitle: `Espesor ${p.thicknessMm}mm`,
        widthMm: p.lengthMm,
        heightMm: p.widthMm,
        quantity: p.quantity * mult,
        unitPriceArs: Math.round(getPieceUnitBoardCost(p)),
        edgesLabel:
          EDGE_OPTIONS.find((e) => e.code === p.edgeCode)?.short || 'Sin filo',
        edgesType: mapEdgeCodeToGuillotine(p.edgeCode),
        allowRotation: true,
        mandatoryGrain: false,
      })),
    ];

    if (allToLoad.length === 0) {
      onShowToast('Agregá al menos un corte para enviarlo a la Guillotina 2D');
      return;
    }
    onSendPiecesToGuillotine(allToLoad);
  };

  return (
    <div className="space-y-3 pb-4">
      {/* HEADER: Back Arrow + Title + Clear All */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            title="Volver"
            className="w-8 h-8 rounded-xl bg-[#1a1c1c] hover:bg-[#252727] border border-white/10 flex items-center justify-center text-[#e87a50] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <h1 className="text-xl font-extrabold font-display text-white tracking-tight">
            Nuevo Presupuesto
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          {onSendPiecesToGuillotine && totalDefinedPieces > 0 && (
            <button
              type="button"
              onClick={handleSendAllToGuillotine}
              className="text-[10px] font-bold text-[#ffb59b] hover:text-white px-2.5 py-1.5 rounded-xl bg-[#261c18] border border-[#e87a50]/40 cursor-pointer transition-colors"
            >
              Enviar a Sierra 2D
            </button>
          )}
          <button
            type="button"
            onClick={handleClearAllPresupuesto}
            className="text-[10px] font-bold text-[#ffb59b] hover:text-white px-2.5 py-1.5 rounded-xl bg-[#1a1c1c] border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
            title="Vaciar todos los cortes y herrajes"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Vaciar Todo</span>
          </button>
        </div>
      </div>

      {/* TOP COMPACT ROW: Vista Compacta de la Mesita (apenas más grande que el cubo) + Configuración de Valor de Placa y Filo */}
      <div className="flex items-start gap-2.5">
        {/* TARJETA COMPACTA DEL CUBO (Apenas más grande que el diseño de la mesita) */}
        <div className="w-[126px] shrink-0 bg-[#161818] rounded-2xl border border-[#e87a50]/35 p-2 flex flex-col items-center justify-center shadow-md">
          <svg
            viewBox="14 16 190 210"
            className="w-[96px] h-[102px] overflow-visible select-none"
          >
            <defs>
              <filter
                id="cubeSoftCopperGlowCompact"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="4"
                  floodColor="#e87a50"
                  floodOpacity="0.6"
                />
              </filter>
              <linearGradient
                id="oakTopFaceC"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#dfbe99" />
                <stop offset="50%" stopColor="#cfa77d" />
                <stop offset="100%" stopColor="#be9266" />
              </linearGradient>
              <linearGradient
                id="oakRightFaceC"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#c89f74" />
                <stop offset="60%" stopColor="#b4885c" />
                <stop offset="100%" stopColor="#9f7348" />
              </linearGradient>
              <linearGradient
                id="oakFloorFaceC"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#d4ad84" />
                <stop offset="100%" stopColor="#b88c61" />
              </linearGradient>
              <linearGradient
                id="oakInnerLeftC"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#a67c52" />
                <stop offset="100%" stopColor="#855f3a" />
              </linearGradient>
              <linearGradient
                id="oakEdgeLightC"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#ebd0b3" />
                <stop offset="100%" stopColor="#c79c71" />
              </linearGradient>
            </defs>

            <polygon
              points="92,24 196,76 196,178 126,218 22,166 22,64"
              fill="none"
              stroke="#e87a50"
              strokeWidth="2.4"
              strokeLinejoin="round"
              filter="url(#cubeSoftCopperGlowCompact)"
            />
            <polygon
              points="22,64 92,24 196,76 196,178 126,218 22,166"
              fill="#111313"
            />
            <polygon
              points="30,68 92,32 92,126 30,162"
              fill="url(#oakInnerLeftC)"
              stroke="#5e4126"
              strokeWidth="1"
            />
            <polygon
              points="22,64 30,68 30,162 22,166"
              fill="url(#oakEdgeLightC)"
              stroke="#8b8e8e"
              strokeWidth="1.2"
            />
            <polygon
              points="30,154 92,118 188,166 126,202"
              fill="url(#oakFloorFaceC)"
              stroke="#6e4d2e"
              strokeWidth="1"
            />
            <polygon
              points="22,158 126,210 126,218 22,166"
              fill="url(#oakEdgeLightC)"
              stroke="#8b8e8e"
              strokeWidth="1.2"
            />
            <polygon
              points="22,64 92,24 196,76 126,116"
              fill="url(#oakTopFaceC)"
              stroke="#6e4d2e"
              strokeWidth="1.2"
            />
            <polygon
              points="22,64 126,116 126,125 22,73"
              fill="url(#oakEdgeLightC)"
              stroke="#8b8e8e"
              strokeWidth="1.1"
            />
            <polygon
              points="126,116 196,76 196,178 126,218"
              fill="url(#oakRightFaceC)"
              stroke="#6e4d2e"
              strokeWidth="1.2"
            />
            <polygon
              points="118,121 126,116 126,218 118,214"
              fill="url(#oakEdgeLightC)"
              stroke="#8b8e8e"
              strokeWidth="1"
            />
            <polygon
              points="22,64 126,116 126,218 22,166"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <polygon
              points="30,73 118,117 118,206 30,162"
              fill="none"
              stroke="#71717a"
              strokeWidth="1.3"
              strokeDasharray="4 3"
            />
          </svg>

          <div className="pt-1 flex items-center justify-center gap-1 text-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#e87a50] shrink-0" />
            <span className="text-[10px] font-bold text-[#ffb59b] leading-tight">
              {totalDefinedPieces}{' '}
              {totalDefinedPieces === 1 ? 'corte' : 'cortes'}
            </span>
          </div>
        </div>

        {/* TARJETA DE VALOR DE PLACA Y FILO */}
        <div className="flex-1 bg-[#161818] rounded-2xl border border-[#e87a50]/35 p-2.5 space-y-2 shadow-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">
              Base de Cálculo (Placa &amp; Filo)
            </span>
            <span className="text-[10px] font-bold text-[#ffb59b] tabular-nums">
              {boardAreaM2.toFixed(2)} m² • {formatARS(costPerM2Ars)}/m²
            </span>
          </div>

          {boards.length > 0 && (
            <div>
              <select
                defaultValue=""
                onChange={(e) => {
                  const found = boards.find((b) => b.id === e.target.value);
                  if (found) {
                    setBoardWidthMm(found.widthMm);
                    setBoardHeightMm(found.heightMm);
                    setBoardPriceArs(found.costArs);
                    onShowToast(`Placa base aplicada: ${found.name}`);
                  }
                }}
                className="w-full bg-[#222424] border border-white/15 rounded-lg px-2 py-1 text-[10px] font-semibold text-white cursor-pointer"
              >
                <option value="" disabled>
                  Usar placa cargada en Guillotina 2D...
                </option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.widthMm}×{b.heightMm}mm) —{' '}
                    {formatARS(b.costArs)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[9px] font-bold text-[#c8c6c5] uppercase mb-0.5">
                Valor Placa (ARS)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Ej. 104000"
                value={boardPriceArs || ''}
                onChange={(e) =>
                  setBoardPriceArs(
                    Math.max(0, parseInt(e.target.value, 10) || 0)
                  )
                }
                className="w-full h-8 bg-[#222424] border border-white/15 rounded-lg px-2 text-xs font-bold text-white tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#c8c6c5] uppercase mb-0.5">
                Filo ($ / Metro)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Ej. 650"
                value={edgePricePerMeterArs || ''}
                onChange={(e) =>
                  setEdgePricePerMeterArs(
                    Math.max(0, parseInt(e.target.value, 10) || 0)
                  )
                }
                className="w-full h-8 bg-[#222424] border border-white/15 rounded-lg px-2 text-xs font-bold text-white tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[9px] font-bold text-[#c8c6c5] uppercase mb-0.5">
                Largo Placa (mm)
              </label>
              <input
                type="number"
                min="100"
                value={boardWidthMm || ''}
                onChange={(e) =>
                  setBoardWidthMm(
                    Math.max(100, parseInt(e.target.value, 10) || 2750)
                  )
                }
                className="w-full h-7 bg-[#222424] border border-white/15 rounded-lg px-2 text-[11px] font-semibold text-white tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#c8c6c5] uppercase mb-0.5">
                Profundidad Placa (mm)
              </label>
              <input
                type="number"
                min="100"
                value={boardHeightMm || ''}
                onChange={(e) =>
                  setBoardHeightMm(
                    Math.max(100, parseInt(e.target.value, 10) || 1830)
                  )
                }
                className="w-full h-7 bg-[#222424] border border-white/15 rounded-lg px-2 text-[11px] font-semibold text-white tabular-nums"
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          BLOQUE 1: ESTRUCTURA DE LA MESITA (CORTES Y HERRAJES DE LA MESITA)
          ===================================================================== */}
      <div className="bg-[#161818] rounded-2xl border border-[#e87a50]/35 p-3 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Puzzle className="w-4 h-4 text-[#e87a50] shrink-0" />
            <div>
              <h2 className="text-sm font-extrabold font-display text-white leading-tight">
                1. Cortes de la Mesita (Estructura)
              </h2>
              <p className="text-[10px] text-[#c8c6c5]">
                Subtotal Placa: {formatARS(costoPlacasMesita)} • Filo:{' '}
                {metrosFiloMesita.toFixed(2)} m ({formatARS(costoFilosMesita)})
              </p>
            </div>
          </div>
          {mesaPieces.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMesaPieces([]);
                onShowToast('Cortes de la mesita vaciados');
              }}
              className="text-[10px] font-bold text-[#ffb59b] hover:text-white px-2 py-1 rounded-lg bg-black/25 border border-white/10 cursor-pointer"
            >
              Quitar todos
            </button>
          )}
        </div>

        {/* Lista de Cortes de la Mesita */}
        {mesaPieces.length === 0 ? (
          <div className="text-center py-3 px-2 rounded-xl bg-black/20 border border-dashed border-white/10 text-[11px] text-[#c8c6c5]">
            Sin cortes cargados en la estructura de la mesita. Agregá tus piezas
            debajo (Largo × Profundidad).
          </div>
        ) : (
          <div className="space-y-2">
            {mesaPieces.map((piece) => {
              const unitCost = getPieceUnitBoardCost(piece);
              const totalCost = unitCost * piece.quantity;
              const edgeM = calcPieceLinearEdgeMeters(
                piece.lengthMm,
                piece.widthMm,
                piece.edgeCode || '0L',
                piece.quantity
              );
              const pieceEdgeCost = edgeM * safeEdgePriceM;
              const edgeInfo =
                EDGE_OPTIONS.find((e) => e.code === piece.edgeCode)?.short ||
                '0 Lados';
              const activeSidesCount = getEdgeSidesCount(piece.edgeCode);

              return (
                <div
                  key={piece.id}
                  className="bg-[#222424] rounded-xl p-2.5 border border-white/10 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {piece.name}
                      </div>
                      <div className="text-[10px] text-[#c8c6c5] tabular-nums">
                        Largo {piece.lengthMm} × Prof. {piece.widthMm} ×{' '}
                        {piece.thicknessMm} mm
                      </div>
                      <div className="text-[10px] text-[#ffb59b] font-semibold tabular-nums mt-0.5">
                        Filo: {edgeInfo} → {edgeM.toFixed(2)} m (
                        {formatARS(pieceEdgeCost)})
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-[#ffb59b] tabular-nums">
                        {formatARS(totalCost)}
                      </div>
                      {piece.quantity > 1 && (
                        <div className="text-[9px] text-[#c8c6c5] tabular-nums">
                          {formatARS(unitCost)} c/u
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selector rápido de cuántos lados llevan filo (0, 1, 2, 3 o 4 lados) */}
                  <div className="bg-black/25 rounded-lg p-1.5 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-[#c8c6c5] px-0.5">
                      <span className="font-bold uppercase tracking-wider">
                        Elegir cuántos lados llevan filo:
                      </span>
                      <span className="font-bold text-[#ffb59b] tabular-nums">
                        {edgeM.toFixed(2)} m ({formatARS(pieceEdgeCost)})
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {QUICK_SIDES_BUTTONS.map((btn) => {
                        const isSelected = activeSidesCount === btn.sides;
                        return (
                          <button
                            key={btn.sides}
                            type="button"
                            onClick={() =>
                              setMesaPieces((prev) =>
                                prev.map((p) =>
                                  p.id === piece.id
                                    ? { ...p, edgeCode: btn.defaultCode }
                                    : p
                                )
                              )
                            }
                            className={`py-1 rounded-md text-[10px] font-extrabold border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#e87a50] text-[#121414] border-[#ffb59b] shadow-xs'
                                : 'bg-[#181a1a] text-[#c8c6c5] border-white/10 hover:text-white'
                            }`}
                          >
                            {btn.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/10">
                    {/* Quantity stepper */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#c8c6c5]">Cant:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setMesaPieces((prev) =>
                            prev.map((p) =>
                              p.id === piece.id
                                ? { ...p, quantity: Math.max(1, p.quantity - 1) }
                                : p
                            )
                          )
                        }
                        className="w-6 h-6 rounded-lg bg-black/30 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-white px-1 tabular-nums">
                        {piece.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMesaPieces((prev) =>
                            prev.map((p) =>
                              p.id === piece.id
                                ? { ...p, quantity: p.quantity + 1 }
                                : p
                            )
                          )
                        }
                        className="w-6 h-6 rounded-lg bg-black/30 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Always-visible Edit & Delete buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditCutModal('mesa', piece)}
                        className="px-2 py-1 rounded-lg bg-black/30 hover:bg-black/50 text-[#f0d9c0] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMesaPieces((prev) =>
                            prev.filter((p) => p.id !== piece.id)
                          )
                        }
                        className="px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-400/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Quitar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Formulario Rápido para Agregar Corte de la Mesita */}
        <div className="bg-black/20 rounded-xl p-2.5 border border-dashed border-[#e87a50]/50 space-y-2">
          <div className="text-[10px] font-bold text-[#ffb59b] uppercase">
            + Agregar Corte a la Mesita (Largo × Profundidad)
          </div>
          <div className="grid grid-cols-12 gap-1.5">
            <input
              type="text"
              placeholder="Nombre (ej. Techo, Piso, Lateral)"
              value={mesaCutName}
              onChange={(e) => setMesaCutName(e.target.value)}
              className="col-span-6 h-8 bg-[#222424] border border-white/15 rounded-lg px-2 text-[11px] text-white"
            />
            <select
              value={mesaCutEdge}
              onChange={(e) => setMesaCutEdge(e.target.value as EdgeCode)}
              className="col-span-6 h-8 bg-[#222424] border border-white/15 rounded-lg px-1.5 text-[10px] font-bold text-white cursor-pointer"
              title="Elegir cuántos lados llevan filo"
            >
              {EDGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  Filo: {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-12 gap-1.5 items-center">
            <input
              type="number"
              placeholder="Largo mm"
              value={mesaCutL}
              onChange={(e) => setMesaCutL(e.target.value)}
              title="Largo en mm"
              className="col-span-3 h-8 bg-[#222424] border border-white/15 rounded-lg px-1.5 text-[11px] text-center font-semibold text-white tabular-nums"
            />
            <input
              type="number"
              placeholder="Prof. mm"
              value={mesaCutW}
              onChange={(e) => setMesaCutW(e.target.value)}
              title="Profundidad en mm"
              className="col-span-3 h-8 bg-[#222424] border border-white/15 rounded-lg px-1.5 text-[11px] text-center font-semibold text-white tabular-nums"
            />
            <input
              type="number"
              placeholder="Esp."
              value={mesaCutT}
              onChange={(e) => setMesaCutT(e.target.value)}
              title="Espesor en mm"
              className="col-span-2 h-8 bg-[#222424] border border-white/15 rounded-lg px-1 text-[11px] text-center font-semibold text-white tabular-nums"
            />
            <input
              type="number"
              min="1"
              placeholder="Cant"
              value={mesaCutQty}
              onChange={(e) => setMesaCutQty(e.target.value)}
              title="Cantidad de unidades"
              className="col-span-2 h-8 bg-[#222424] border border-white/15 rounded-lg px-1 text-[11px] text-center font-semibold text-white tabular-nums"
            />
            <button
              type="button"
              onClick={handleAddMesaCut}
              className="col-span-2 h-8 rounded-lg bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] font-extrabold text-xs flex items-center justify-center cursor-pointer shadow-sm"
              title="Agregar corte a la mesita"
            >
              <Plus className="w-4 h-4 stroke-[2.8]" />
            </button>
          </div>
        </div>

        {/* Sub-sección: Herrajes de la Mesita */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-[#e87a50]" />
              <span className="text-xs font-extrabold text-white">
                Herrajes de la Mesita ({formatARS(costoHerrajesMesita)})
              </span>
            </div>
            {mesaHardware.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMesaHardware([]);
                  onShowToast('Herrajes de la mesita vaciados');
                }}
                className="text-[10px] font-bold text-[#ffb59b] hover:text-white px-2 py-0.5 rounded bg-black/25 border border-white/10 cursor-pointer"
              >
                Quitar todos
              </button>
            )}
          </div>

          {mesaHardware.length === 0 ? (
            <div className="text-center py-2 px-2 rounded-xl bg-black/20 border border-dashed border-white/10 text-[11px] text-[#c8c6c5]">
              Sin herrajes en la mesita.
            </div>
          ) : (
            <div className="space-y-1.5">
              {mesaHardware.map((hw) => (
                <div
                  key={hw.id}
                  className="bg-[#222424] rounded-xl p-2 border border-white/10 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      {hw.name}
                    </div>
                    <div className="text-[10px] text-[#c8c6c5] tabular-nums">
                      Cant: {hw.quantity} × {formatARS(hw.unitPriceArs)} c/u ={' '}
                      <span className="font-bold text-[#ffb59b]">
                        {formatARS(hw.quantity * hw.unitPriceArs)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditHwModal('mesa', hw)}
                      className="p-1.5 rounded-lg bg-black/30 text-[#f0d9c0] hover:text-white cursor-pointer"
                      title="Editar herraje"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMesaHardware((prev) =>
                          prev.filter((h) => h.id !== hw.id)
                        )
                      }
                      className="p-1.5 rounded-lg bg-red-950/60 text-red-200 border border-red-400/30 cursor-pointer"
                      title="Quitar herraje"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => openAddHwModal('mesa')}
            className="w-full py-1.5 px-3 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
            <span>Agregar herraje de mesita</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          BLOQUE 2: CORTES Y HERRAJES PARA LOS CAJONES (POR SEPARADO)
          ===================================================================== */}
      <div className="bg-[#161818] rounded-2xl border border-[#e87a50]/35 p-3 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#e87a50] shrink-0" />
            <div>
              <h2 className="text-sm font-extrabold font-display text-white leading-tight">
                2. Cajones (Cortes y Herrajes por Separado)
              </h2>
              <p className="text-[10px] text-[#c8c6c5]">
                Placas Cajón: {formatARS(costoPlacasCajones)} • Filo:{' '}
                {metrosFiloCajones.toFixed(2)} m ({formatARS(costoFilosCajones)}
                )
              </p>
            </div>
          </div>

          {/* Multiplicador de cantidad de cajones */}
          <div className="flex items-center gap-1 bg-[#222424] px-2 py-1 rounded-xl border border-white/10">
            <span className="text-[10px] font-bold text-[#c8c6c5]">
              Cajones:
            </span>
            <button
              type="button"
              onClick={() =>
                setDrawerUnitsMultiplier((m) => Math.max(1, m - 1))
              }
              className="w-5 h-5 rounded bg-black/30 text-white flex items-center justify-center cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-extrabold text-[#ffb59b] px-1 tabular-nums">
              {drawerUnitsMultiplier}
            </span>
            <button
              type="button"
              onClick={() => setDrawerUnitsMultiplier((m) => m + 1)}
              className="w-5 h-5 rounded bg-black/30 text-white flex items-center justify-center cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Lista de Cortes de los Cajones */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white">
            Cortes para Cajones
          </span>
          {drawerPieces.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setDrawerPieces([]);
                onShowToast('Cortes de cajones vaciados');
              }}
              className="text-[10px] font-bold text-[#ffb59b] hover:text-white px-2 py-0.5 rounded bg-black/25 border border-white/10 cursor-pointer"
            >
              Quitar todos
            </button>
          )}
        </div>

        {drawerPieces.length === 0 ? (
          <div className="text-center py-3 px-2 rounded-xl bg-black/20 border border-dashed border-white/10 text-[11px] text-[#c8c6c5]">
            Sin cortes cargados para los cajones. Agregá frentes, laterales,
            contrafrentes o fondos debajo (Largo × Profundidad).
          </div>
        ) : (
          <div className="space-y-2">
            {drawerPieces.map((piece) => {
              const unitCost = getPieceUnitBoardCost(piece);
              const totalPieceCost = unitCost * piece.quantity * mult;
              const edgeM =
                calcPieceLinearEdgeMeters(
                  piece.lengthMm,
                  piece.widthMm,
                  piece.edgeCode || '0L',
                  piece.quantity
                ) * mult;
              const pieceEdgeCost = edgeM * safeEdgePriceM;
              const edgeInfo =
                EDGE_OPTIONS.find((e) => e.code === piece.edgeCode)?.short ||
                '0 Lados';
              const activeSidesCount = getEdgeSidesCount(piece.edgeCode);

              return (
                <div
                  key={piece.id}
                  className="bg-[#222424] rounded-xl p-2.5 border border-white/10 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {piece.name}
                      </div>
                      <div className="text-[10px] text-[#c8c6c5] tabular-nums">
                        Largo {piece.lengthMm} × Prof. {piece.widthMm} ×{' '}
                        {piece.thicknessMm} mm
                      </div>
                      <div className="text-[10px] text-[#ffb59b] font-semibold tabular-nums mt-0.5">
                        Filo: {edgeInfo} → {edgeM.toFixed(2)} m (
                        {formatARS(pieceEdgeCost)})
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-[#ffb59b] tabular-nums">
                        {formatARS(totalPieceCost)}
                      </div>
                      <div className="text-[9px] text-[#c8c6c5] tabular-nums">
                        {formatARS(unitCost)} c/u
                        {mult > 1 ? ` (×${mult} caj.)` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Selector rápido de cuántos lados llevan filo (0, 1, 2, 3 o 4 lados) */}
                  <div className="bg-black/25 rounded-lg p-1.5 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-[#c8c6c5] px-0.5">
                      <span className="font-bold uppercase tracking-wider">
                        Elegir cuántos lados llevan filo:
                      </span>
                      <span className="font-bold text-[#ffb59b] tabular-nums">
                        {edgeM.toFixed(2)} m ({formatARS(pieceEdgeCost)})
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {QUICK_SIDES_BUTTONS.map((btn) => {
                        const isSelected = activeSidesCount === btn.sides;
                        return (
                          <button
                            key={btn.sides}
                            type="button"
                            onClick={() =>
                              setDrawerPieces((prev) =>
                                prev.map((p) =>
                                  p.id === piece.id
                                    ? { ...p, edgeCode: btn.defaultCode }
                                    : p
                                )
                              )
                            }
                            className={`py-1 rounded-md text-[10px] font-extrabold border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#e87a50] text-[#121414] border-[#ffb59b] shadow-xs'
                                : 'bg-[#181a1a] text-[#c8c6c5] border-white/10 hover:text-white'
                            }`}
                          >
                            {btn.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#c8c6c5]">
                        Cant por cajón:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDrawerPieces((prev) =>
                            prev.map((p) =>
                              p.id === piece.id
                                ? { ...p, quantity: Math.max(1, p.quantity - 1) }
                                : p
                            )
                          )
                        }
                        className="w-6 h-6 rounded-lg bg-black/30 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-white px-1 tabular-nums">
                        {piece.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDrawerPieces((prev) =>
                            prev.map((p) =>
                              p.id === piece.id
                                ? { ...p, quantity: p.quantity + 1 }
                                : p
                            )
                          )
                        }
                        className="w-6 h-6 rounded-lg bg-black/30 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditCutModal('cajon', piece)}
                        className="px-2 py-1 rounded-lg bg-black/30 hover:bg-black/50 text-[#f0d9c0] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDrawerPieces((prev) =>
                            prev.filter((p) => p.id !== piece.id)
                          )
                        }
                        className="px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-400/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Quitar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Formulario Rápido para Agregar Corte de Cajón */}
        <div className="bg-black/20 rounded-xl p-2.5 border border-dashed border-[#e87a50]/50 space-y-2">
          <div className="text-[10px] font-bold text-[#ffb59b] uppercase">
            + Agregar Corte para Cajón (Largo × Profundidad)
          </div>
          <div className="grid grid-cols-12 gap-1.5">
            <input
              type="text"
              placeholder="Nombre (ej. Frente cajón, Lateral cajón)"
              value={drwCutName}
              onChange={(e) => setDrwCutName(e.target.value)}
              className="col-span-6 h-8 bg-[#222424] border border-white/15 rounded-lg px-2 text-[11px] text-white"
            />
            <select
              value={drwCutEdge}
              onChange={(e) => setDrwCutEdge(e.target.value as EdgeCode)}
              className="col-span-6 h-8 bg-[#222424] border border-white/15 rounded-lg px-1.5 text-[10px] font-bold text-white cursor-pointer"
              title="Elegir cuántos lados llevan filo"
            >
              {EDGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  Filo: {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-12 gap-1.5 items-center">
            <input
              type="number"
              placeholder="Largo mm"
              value={drwCutL}
              onChange={(e) => setDrwCutL(e.target.value)}
              title="Largo en mm"
              className="col-span-3 h-8 bg-[#222424] border border-white/15 rounded-lg px-1.5 text-[11px] text-center font-semibold text-white tabular-nums"
            />
            <input
              type="number"
              placeholder="Prof. mm"
              value={drwCutW}
              onChange={(e) => setDrwCutW(e.target.value)}
              title="Profundidad en mm"
              className="col-span-3 h-8 bg-[#222424] border border-white/15 rounded-lg px-1.5 text-[11px] text-center font-semibold text-white tabular-nums"
            />
            <input
              type="number"
              placeholder="Esp."
              value={drwCutT}
              onChange={(e) => setDrwCutT(e.target.value)}
              className="col-span-2 h-8 bg-[#222424] border border-white/15 rounded-lg px-1 text-[11px] text-center font-semibold text-white tabular-nums"
            />
            <input
              type="number"
              min="1"
              placeholder="Cant"
              value={drwCutQty}
              onChange={(e) => setDrwCutQty(e.target.value)}
              className="col-span-2 h-8 bg-[#222424] border border-white/15 rounded-lg px-1 text-[11px] text-center font-semibold text-white tabular-nums"
            />
            <button
              type="button"
              onClick={handleAddDrawerCut}
              className="col-span-2 h-8 rounded-lg bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] font-extrabold text-xs flex items-center justify-center cursor-pointer shadow-sm"
              title="Agregar corte de cajón"
            >
              <Plus className="w-4 h-4 stroke-[2.8]" />
            </button>
          </div>
        </div>

        {/* Sub-sección: Herrajes para los Cajones */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-[#e87a50]" />
              <span className="text-xs font-extrabold text-white">
                Herrajes para los Cajones ({formatARS(costoHerrajesCajones)})
              </span>
            </div>
            {drawerHardware.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDrawerHardware([]);
                  onShowToast('Herrajes de cajones vaciados');
                }}
                className="text-[10px] font-bold text-[#ffb59b] hover:text-white px-2 py-0.5 rounded bg-black/25 border border-white/10 cursor-pointer"
              >
                Quitar todos
              </button>
            )}
          </div>

          {drawerHardware.length === 0 ? (
            <div className="text-center py-2 px-2 rounded-xl bg-black/20 border border-dashed border-white/10 text-[11px] text-[#c8c6c5]">
              Sin herrajes cargados para los cajones (ej. correderas,
              tiradores).
            </div>
          ) : (
            <div className="space-y-1.5">
              {drawerHardware.map((hw) => {
                const subTotal = hw.quantity * hw.unitPriceArs * mult;
                return (
                  <div
                    key={hw.id}
                    className="bg-[#222424] rounded-xl p-2 border border-white/10 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {hw.name}
                      </div>
                      <div className="text-[10px] text-[#c8c6c5] tabular-nums">
                        Cant: {hw.quantity} × {formatARS(hw.unitPriceArs)} c/u
                        {mult > 1 ? ` × ${mult} caj.` : ''} ={' '}
                        <span className="font-bold text-[#ffb59b]">
                          {formatARS(subTotal)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditHwModal('cajon', hw)}
                        className="p-1.5 rounded-lg bg-black/30 text-[#f0d9c0] hover:text-white cursor-pointer"
                        title="Editar herraje de cajón"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDrawerHardware((prev) =>
                            prev.filter((h) => h.id !== hw.id)
                          )
                        }
                        className="p-1.5 rounded-lg bg-red-950/60 text-red-200 border border-red-400/30 cursor-pointer"
                        title="Quitar herraje de cajón"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => openAddHwModal('cajon')}
            className="w-full py-1.5 px-3 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
            <span>Agregar herraje para cajones</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          4. RESUMEN DE COSTOS (Con Cálculo de Filos en lugar de Mano de Obra)
          ===================================================================== */}
      <div className="bg-[#161818] rounded-2xl border border-[#e87a50]/45 p-3.5 shadow-lg">
        <div className="grid grid-cols-2 divide-x divide-white/10">
          {/* Left Column: Costo placas + Cálculo de filos */}
          <div className="pr-3 space-y-2.5">
            <div className="border-b border-white/10 pb-2">
              <div className="text-xs text-[#c8c6c5] font-medium">
                Costo placas (Cortes)
              </div>
              <div className="text-lg font-extrabold text-[#e87a50] tabular-nums leading-tight mt-0.5">
                {formatARS(totalCostoPlacas)}
              </div>
              <div className="text-[10px] text-[#c8c6c5] tabular-nums">
                Mesita: {formatARS(costoPlacasMesita)} • Cajones:{' '}
                {formatARS(costoPlacasCajones)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1 text-xs text-[#c8c6c5] font-medium">
                <Disc className="w-3.5 h-3.5 text-[#e87a50]" />
                <span>Cálculo de filos</span>
              </div>
              <div className="text-lg font-extrabold text-[#e87a50] tabular-nums leading-tight mt-0.5">
                {formatARS(totalCostoFilos)}
              </div>
              <div className="text-[10px] text-[#c8c6c5] tabular-nums">
                {totalMetrosFilo.toFixed(2)} m lineales ×{' '}
                {formatARS(safeEdgePriceM)}/m
              </div>
            </div>
          </div>

          {/* Right Column: Costo herrajes + TOTAL */}
          <div className="pl-3 flex flex-col justify-between">
            <div className="border-b border-white/10 pb-2">
              <div className="text-xs text-[#c8c6c5] font-medium">
                Costo herrajes
              </div>
              <div className="text-lg font-extrabold text-[#e87a50] tabular-nums leading-tight mt-0.5">
                {formatARS(totalCostoHerrajes)}
              </div>
              <div className="text-[10px] text-[#c8c6c5] tabular-nums">
                Mesita: {formatARS(costoHerrajesMesita)} • Cajones:{' '}
                {formatARS(costoHerrajesCajones)}
              </div>
            </div>

            <div className="pt-1 flex flex-col justify-end">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                TOTAL PRESUPUESTO
              </span>
              <span className="text-2xl font-extrabold font-display text-[#e87a50] tabular-nums tracking-tight leading-none mt-0.5">
                {formatARS(totalPresupuesto)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. BOTONES DE ACCIÓN */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        <button
          type="button"
          onClick={() =>
            onShowToast(
              `Borrador guardado (${totalDefinedPieces} cortes • Total ${formatARS(
                totalPresupuesto
              )})`
            )
          }
          className="h-12 rounded-2xl bg-[#161818] hover:bg-[#222424] active:scale-[0.99] border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <Save className="w-4 h-4 text-[#ffb59b]" />
          <span>Guardar borrador</span>
        </button>

        <button
          type="button"
          onClick={() => setShowPdfModal(true)}
          className="h-12 rounded-2xl bg-[#e87a50] hover:bg-[#f0855c] active:scale-[0.99] text-[#121414] font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
        >
          <FileText className="w-4 h-4 stroke-[2.4]" />
          <span>Generar PDF</span>
        </button>
      </div>

      {/* MODAL: EDITAR CORTE (MESITA O CAJÓN) */}
      {editingCutTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                Editar Corte (
                {editingCutTarget.section === 'mesa' ? 'Mesita' : 'Cajón'})
              </h3>
              <button
                type="button"
                onClick={() => setEditingCutTarget(null)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCut} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Nombre de la Pieza
                </label>
                <input
                  type="text"
                  required
                  value={editCutName}
                  onChange={(e) => setEditCutName(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[#c8c6c5] mb-1">
                    Largo (mm)
                  </label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={editCutL}
                    onChange={(e) => setEditCutL(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#c8c6c5] mb-1">
                    Profundidad (mm)
                  </label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={editCutW}
                    onChange={(e) => setEditCutW(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#c8c6c5] mb-1">
                    Espesor (mm)
                  </label>
                  <input
                    type="number"
                    required
                    min="3"
                    value={editCutT}
                    onChange={(e) => setEditCutT(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white tabular-nums"
                  />
                </div>
              </div>

              {/* Botones rápidos de 0 a 4 lados dentro del modal */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-[#c8c6c5]">
                  Elegir cuántos lados llevan filo:
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {QUICK_SIDES_BUTTONS.map((btn) => {
                    const active = getEdgeSidesCount(editCutEdge) === btn.sides;
                    return (
                      <button
                        key={btn.sides}
                        type="button"
                        onClick={() => setEditCutEdge(btn.defaultCode)}
                        className={`py-1.5 rounded-lg text-[10px] font-extrabold border cursor-pointer ${
                          active
                            ? 'bg-[#e87a50] text-[#121414] border-[#ffb59b]'
                            : 'bg-[#222424] text-[#c8c6c5] border-white/10'
                        }`}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[#c8c6c5] mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editCutQty}
                    onChange={(e) => setEditCutQty(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#c8c6c5] mb-1">
                    Detalle de Lados con Filo
                  </label>
                  <select
                    value={editCutEdge}
                    onChange={(e) =>
                      setEditCutEdge(e.target.value as EdgeCode)
                    }
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white cursor-pointer"
                  >
                    {EDGE_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCutTarget(null)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR / EDITAR HERRAJE (MESITA O CAJÓN) */}
      {hwModalSection && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                {editingHwId ? 'Editar Herraje' : 'Agregar Herraje'} (
                {hwModalSection === 'mesa' ? 'Mesita' : 'Cajones'})
              </h3>
              <button
                type="button"
                onClick={() => setHwModalSection(null)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inventoryItems.filter((i) => i.category === 'herraje').length >
              0 && (
              <div>
                <label className="block text-[11px] font-bold text-[#ffb59b] uppercase tracking-wider mb-1">
                  Elegir desde Inventario (Opcional)
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const found = inventoryItems.find(
                      (it) => it.id === e.target.value
                    );
                    if (found) {
                      setHwName(found.name);
                      setHwPrice(String(found.unitPriceArs));
                    }
                  }}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
                >
                  <option value="" disabled>
                    -- Seleccionar herraje cargado --
                  </option>
                  {inventoryItems
                    .filter((i) => i.category === 'herraje')
                    .map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({formatARS(it.unitPriceArs)})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <form onSubmit={handleSaveHardware} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Nombre del Herraje
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    hwModalSection === 'mesa'
                      ? 'Ej. Patas cónicas, Tarugos, Minifix'
                      : 'Ej. Correderas telescópicas, Tirador'
                  }
                  value={hwName}
                  onChange={(e) => setHwName(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={hwQty}
                    onChange={(e) => setHwQty(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Precio Unitario (ARS)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Ej. 1500"
                    value={hwPrice}
                    onChange={(e) => setHwPrice(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHwModalSection(null)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                >
                  {editingHwId ? 'Guardar' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISTA PREVIA & DESCARGA DE PRESUPUESTO PDF */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-md w-full p-5 space-y-4 border border-[#e87a50]/50 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#ffb59b]">
                  MUEBLES J&amp;L • ATELIER DE CARPINTERÍA
                </div>
                <h3 className="text-base font-extrabold font-display text-white">
                  Presupuesto Técnico Detallado
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#1b1d1d] rounded-xl p-3 space-y-1.5 border border-white/5">
                <div className="text-[11px] font-bold text-[#ffb59b] uppercase">
                  1. Estructura Mesita ({mesaPieces.length} tipos de corte)
                </div>
                {mesaPieces.length === 0 ? (
                  <div className="text-[#a1a1a1] text-[11px]">
                    Sin cortes de mesita cargados.
                  </div>
                ) : (
                  mesaPieces.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-[#e3e2e2] tabular-nums"
                    >
                      <span>
                        • {p.name}: {p.lengthMm}×{p.widthMm}×{p.thicknessMm}mm
                        (×{p.quantity} • {getEdgeSidesCount(p.edgeCode)} lados
                        filo)
                      </span>
                      <span className="font-semibold text-[#c8c6c5]">
                        {formatARS(getPieceUnitBoardCost(p) * p.quantity)}
                      </span>
                    </div>
                  ))
                )}
                {mesaHardware.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between text-[#d5bc9f] tabular-nums text-[11px]"
                  >
                    <span>
                      + Herraje: {h.name} (×{h.quantity})
                    </span>
                    <span>{formatARS(h.unitPriceArs * h.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[#1b1d1d] rounded-xl p-3 space-y-1.5 border border-white/5">
                <div className="text-[11px] font-bold text-[#ffb59b] uppercase">
                  2. Cajones (×{mult} {mult === 1 ? 'cajón' : 'cajones'})
                </div>
                {drawerPieces.length === 0 && drawerHardware.length === 0 ? (
                  <div className="text-[#a1a1a1] text-[11px]">
                    Sin cortes ni herrajes de cajón cargados.
                  </div>
                ) : (
                  <>
                    {drawerPieces.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-[#e3e2e2] tabular-nums"
                      >
                        <span>
                          • {p.name}: {p.lengthMm}×{p.widthMm}×{p.thicknessMm}mm
                          (×{p.quantity * mult} •{' '}
                          {getEdgeSidesCount(p.edgeCode)} lados filo)
                        </span>
                        <span className="font-semibold text-[#c8c6c5]">
                          {formatARS(
                            getPieceUnitBoardCost(p) * p.quantity * mult
                          )}
                        </span>
                      </div>
                    ))}
                    {drawerHardware.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between text-[#d5bc9f] tabular-nums text-[11px]"
                      >
                        <span>
                          + Herraje Cajón: {h.name} (×{h.quantity * mult})
                        </span>
                        <span>
                          {formatARS(h.unitPriceArs * h.quantity * mult)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="bg-[#231915] border border-[#e87a50]/40 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-[#c8c6c5]">
                  <span>Costo placas (Mesita + Cajones):</span>
                  <span className="font-bold text-white tabular-nums">
                    {formatARS(totalCostoPlacas)}
                  </span>
                </div>
                <div className="flex justify-between text-[#c8c6c5]">
                  <span>Costo herrajes (Mesita + Cajones):</span>
                  <span className="font-bold text-white tabular-nums">
                    {formatARS(totalCostoHerrajes)}
                  </span>
                </div>
                <div className="flex justify-between text-[#c8c6c5]">
                  <span>
                    Cálculo de filos ({totalMetrosFilo.toFixed(2)} m):
                  </span>
                  <span className="font-bold text-white tabular-nums">
                    {formatARS(totalCostoFilos)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
                  <span className="text-sm font-extrabold text-white">
                    TOTAL FINAL:
                  </span>
                  <span className="text-xl font-extrabold text-[#e87a50] tabular-nums">
                    {formatARS(totalPresupuesto)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="h-10 rounded-xl bg-[#222424] text-xs font-bold text-[#c8c6c5] cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  onShowToast('Documento enviado a impresión / PDF');
                }}
                className="h-10 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Imprimir / Guardar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
