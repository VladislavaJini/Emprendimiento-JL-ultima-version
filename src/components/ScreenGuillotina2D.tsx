import React, { useState, useMemo } from 'react';
import {
  PlusSquare,
  SlidersHorizontal,
  Pencil,
  Trash2,
  ChevronDown,
  Wand2,
  Zap,
  Banknote,
  ClipboardCheck,
  ZoomIn,
  Maximize2,
  Tag,
  RotateCw,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertCircle,
  Minus,
  Plus,
  Save,
  Lock,
  Bookmark,
  Layers,
  X,
} from 'lucide-react';
import { MelaminaBoard, CutPiece, PredefinedCut } from '../types/atelier';
import { formatARS } from '../data/initialData';
import {
  calculate2DGuillotineNesting,
  PlacedPiece,
  BoardNestingResult,
} from '../utils/cutNesting';

interface ScreenGuillotina2DProps {
  boards: MelaminaBoard[];
  selectedBoardId: string;
  onSelectBoard: (id: string) => void;
  onUpdateBoardCost: (id: string, newCost: number) => void;
  onAddBoard?: (board: MelaminaBoard) => void;
  onUpdateBoard?: (id: string, updated: Partial<MelaminaBoard>) => void;
  onDeleteBoard?: (id: string) => void;
  cutPieces: CutPiece[];
  onUpdatePieceQty: (id: string, delta: number) => void;
  onUpdatePieceDetails?: (id: string, updated: Partial<CutPiece>) => void;
  onDeletePiece?: (id: string) => void;
  onClearAllCuts?: () => void;
  onTogglePieceRotation: (id: string) => void;
  onAddCutPiece: (piece: Omit<CutPiece, 'id' | 'numberLabel'>) => void;
  onResetCleanOrder: () => void;
  predefinedCuts?: PredefinedCut[];
  onAddPredefinedCut?: (cut: Omit<PredefinedCut, 'id'>) => void;
  onUpdatePredefinedCut?: (id: string, updated: Partial<PredefinedCut>) => void;
  onDeletePredefinedCut?: (id: string) => void;
  onConfirmSawCut?: (data: {
    boardType: 'melamina' | 'fondo';
    boardName: string;
    boardsCount: number;
    pieces: { name: string; widthMm: number; heightMm: number; quantity: number }[];
    largestScrap?: { widthMm: number; heightMm: number; areaM2: number };
    saveScrap: boolean;
  }) => void;
  onShowToast: (msg: string) => void;
}

const FALLBACK_MELAMINA_BOARD: MelaminaBoard = {
  id: 'board-empty',
  name: 'Placa Base (Sin cargar)',
  brandSpec: 'Tocá el lápiz o + Placa para configurar',
  widthMm: 2750,
  heightMm: 1830,
  costArs: 0,
  swatchColor: '#c99768',
  grainType: 'horizontal',
};

export const ScreenGuillotina2D: React.FC<ScreenGuillotina2DProps> = ({
  boards,
  selectedBoardId,
  onSelectBoard,
  onUpdateBoardCost,
  onAddBoard,
  onUpdateBoard,
  onDeleteBoard,
  cutPieces,
  onUpdatePieceQty,
  onUpdatePieceDetails,
  onDeletePiece,
  onClearAllCuts,
  onTogglePieceRotation,
  onAddCutPiece,
  onResetCleanOrder,
  predefinedCuts = [],
  onAddPredefinedCut,
  onUpdatePredefinedCut,
  onDeletePredefinedCut,
  onConfirmSawCut,
  onShowToast,
}) => {
  const [kerfMm, setKerfMm] = useState<number>(3.2);
  const [showBoardModal, setShowBoardModal] = useState<boolean>(false);
  const [editingBoardMode, setEditingBoardMode] = useState<'add' | 'edit'>('add');
  const [boardFormName, setBoardFormName] = useState('');
  const [boardFormSpec, setBoardFormSpec] = useState('Melamina 18mm');
  const [boardFormW, setBoardFormW] = useState('2750');
  const [boardFormH, setBoardFormH] = useState('1830');
  const [boardFormCost, setBoardFormCost] = useState('');
  const [boardFormColor, setBoardFormColor] = useState('#c99768');
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [editingCost, setEditingCost] = useState(false);
  const [costInput, setCostInput] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [cadZoom, setCadZoom] = useState<boolean>(false);
  const [showLabelsOnCad, setShowLabelsOnCad] = useState<boolean>(true);
  const [grainDirection, setGrainDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [showAllCuts, setShowAllCuts] = useState<boolean>(true);
  const [showCutModal, setShowCutModal] = useState<boolean>(false);
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [selectedCadPiece, setSelectedCadPiece] = useState<string | null>(null);

  // Multi-board viewing page
  const [currentBoardPage, setCurrentBoardPage] = useState<number>(0);

  // Predefined Cuts CRUD Modal / Management state
  const [showPresetsMenu, setShowPresetsMenu] = useState<boolean>(false);
  const [showPresetEditModal, setShowPresetEditModal] = useState<boolean>(false);
  const [editingPreset, setEditingPreset] = useState<PredefinedCut | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetW, setPresetW] = useState('600');
  const [presetH, setPresetH] = useState('400');
  const [presetEdges, setPresetEdges] = useState<'4L' | '3L' | '2L' | '1L' | '0L'>('2L');
  const [presetAllowRot, setPresetAllowRot] = useState<boolean>(true);

  // Cut modal fields (used for both Add and Edit)
  const [cutName, setCutName] = useState('');
  const [cutSub, setCutSub] = useState('Módulo Personalizado • Taller J&L');
  const [cutW, setCutW] = useState('600');
  const [cutH, setCutH] = useState('400');
  const [cutQty, setCutQty] = useState('2');
  const [cutCustomPrice, setCutCustomPrice] = useState<string>('');
  const [cutEdges, setCutEdges] = useState<'4L' | '3L' | '2L' | '1L' | '0L'>('2L');
  const [cutAllowRotation, setCutAllowRotation] = useState<boolean>(true);
  const [saveAlsoAsPreset, setSaveAlsoAsPreset] = useState<boolean>(false);

  const activeBoard: MelaminaBoard =
    boards.find((b) => b.id === selectedBoardId) ||
    boards[0] ||
    FALLBACK_MELAMINA_BOARD;

  // 2D Guillotine & Multi-Board Nesting calculation
  const nestingResult = useMemo(() => {
    return calculate2DGuillotineNesting(
      activeBoard.widthMm,
      activeBoard.heightMm,
      kerfMm,
      grainDirection,
      cutPieces
    );
  }, [activeBoard.widthMm, activeBoard.heightMm, kerfMm, grainDirection, cutPieces]);

  // Active board in the multi-board viewer
  const activeBoardIndex = Math.min(
    currentBoardPage,
    Math.max(0, nestingResult.boards.length - 1)
  );
  const activeNestingBoard: BoardNestingResult =
    nestingResult.boards[activeBoardIndex] || nestingResult.boards[0];

  // Compute metrics dynamically & exact proportional cut cost
  const boardAreaMm2 = Math.max(1, activeBoard.widthMm * activeBoard.heightMm);
  const boardAreaM2 = Number((boardAreaMm2 / 1_000_000).toFixed(2));
  const costPerM2 = Math.round(activeBoard.costArs / Math.max(0.01, boardAreaMm2 / 1_000_000));

  const calcExactCutUnitPrice = (wMm: number, hMm: number): number => {
    if (activeBoard.costArs <= 0) return 0;
    return Math.round(((wMm * hMm) / boardAreaMm2) * activeBoard.costArs);
  };

  const totalPiecesCount = nestingResult.totalPiecesRequested;
  const totalBoardsCount = nestingResult.totalBoardsRequired;
  const usedAreaM2 = nestingResult.totalUsedAreaM2;
  const wasteAreaM2 = Math.max(
    0,
    Number((nestingResult.totalBoardAreaM2 - nestingResult.totalUsedAreaM2).toFixed(2))
  );
  const efficiencyPct = nestingResult.overallEfficiencyPct;
  const restPct = cutPieces.length === 0 ? 0 : Number((100 - efficiencyPct).toFixed(1));
  const cutValueArs =
    cutPieces.length === 0
      ? 0
      : cutPieces.reduce(
          (sum, p) => sum + calcExactCutUnitPrice(p.widthMm, p.heightMm) * p.quantity,
          0
        );

  const visiblePieces = showAllCuts ? cutPieces : cutPieces.slice(0, 4);

  // Largest offcut calculation for Offcut Recovery Prompt (>0.30 m²)
  const largestScrap = useMemo(() => {
    if (
      !activeNestingBoard ||
      !activeNestingBoard.freeRectangles ||
      activeNestingBoard.freeRectangles.length === 0
    ) {
      return null;
    }
    return activeNestingBoard.freeRectangles.reduce((prev, curr) =>
      curr.areaM2 > (prev?.areaM2 || 0) ? curr : prev,
      null as { xMm: number; yMm: number; widthMm: number; heightMm: number; areaM2: number } | null
    );
  }, [activeNestingBoard]);

  const [showConfirmCutModal, setShowConfirmCutModal] = useState<boolean>(false);
  const [saveScrapOption, setSaveScrapOption] = useState<boolean>(true);

  const handleInitiateConfirmCut = () => {
    if (cutPieces.length === 0) {
      onShowToast('No hay cortes asignados en la placa para procesar.');
      return;
    }
    setShowConfirmCutModal(true);
  };

  const handleExecuteConfirmCut = () => {
    if (onConfirmSawCut) {
      onConfirmSawCut({
        boardType: 'melamina',
        boardName: activeBoard.name,
        boardsCount: totalBoardsCount,
        pieces: cutPieces.map((p) => ({
          name: p.name,
          widthMm: p.widthMm,
          heightMm: p.heightMm,
          quantity: p.quantity,
        })),
        largestScrap: largestScrap && largestScrap.areaM2 >= 0.30 ? largestScrap : undefined,
        saveScrap: saveScrapOption && !!(largestScrap && largestScrap.areaM2 >= 0.30),
      });
    } else {
      onShowToast(
        `✅ Corte en Sierra confirmado: ${totalBoardsCount} placa(s) descontada(s) e inventario actualizado`
      );
    }
    setShowConfirmCutModal(false);
  };


  const handleRunOptimizer = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      onShowToast(
        `Algoritmo Guillotina 2D completado (${totalPiecesCount} piezas, ${totalBoardsCount} ${
          totalBoardsCount === 1 ? 'placa' : 'placas'
        }) • Eficiencia ${efficiencyPct}%`
      );
    }, 450);
  };

  const handleSaveBoardCost = () => {
    const parsed = parseInt(costInput.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      if (boards.length === 0 && onAddBoard) {
        const newB: MelaminaBoard = {
          id: `board-${Date.now()}`,
          name: 'Placa Melamina 18mm',
          brandSpec: 'Melamina 18mm',
          widthMm: 2750,
          heightMm: 1830,
          costArs: parsed,
          swatchColor: '#c99768',
          grainType: 'horizontal',
        };
        onAddBoard(newB);
        onSelectBoard(newB.id);
      } else {
        onUpdateBoardCost(activeBoard.id, parsed);
      }
      onShowToast(`Costo de placa actualizado a ${formatARS(parsed)}`);
    }
    setEditingCost(false);
  };

  const openAddBoardModal = () => {
    setEditingBoardMode('add');
    setBoardFormName('');
    setBoardFormSpec('Melamina 18mm');
    setBoardFormW('2750');
    setBoardFormH('1830');
    setBoardFormCost('');
    setBoardFormColor('#c99768');
    setShowBoardModal(true);
  };

  const openEditBoardModal = () => {
    setEditingBoardMode(boards.length === 0 ? 'add' : 'edit');
    setBoardFormName(boards.length === 0 ? '' : activeBoard.name);
    setBoardFormSpec(activeBoard.brandSpec || 'Melamina 18mm');
    setBoardFormW(String(activeBoard.widthMm));
    setBoardFormH(String(activeBoard.heightMm));
    setBoardFormCost(String(activeBoard.costArs || ''));
    setBoardFormColor(activeBoard.swatchColor || '#c99768');
    setShowBoardModal(true);
  };

  const handleSaveBoardModal = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Math.max(200, parseInt(boardFormW, 10) || 2750);
    const h = Math.max(200, parseInt(boardFormH, 10) || 1830);
    const cost = Math.max(0, parseInt(boardFormCost.replace(/\D/g, ''), 10) || 0);
    const nameClean = boardFormName.trim() || 'Placa Melamina';

    if (editingBoardMode === 'add' || boards.length === 0) {
      const created: MelaminaBoard = {
        id: `board-${Date.now()}`,
        name: nameClean,
        brandSpec: boardFormSpec.trim() || 'Melamina 18mm',
        widthMm: w,
        heightMm: h,
        costArs: cost,
        swatchColor: boardFormColor,
        grainType: 'horizontal',
      };
      if (onAddBoard) onAddBoard(created);
      onSelectBoard(created.id);
      onShowToast(`Placa creada: ${created.name} (${formatARS(cost)})`);
    } else {
      if (onUpdateBoard) {
        onUpdateBoard(activeBoard.id, {
          name: nameClean,
          brandSpec: boardFormSpec.trim() || 'Melamina 18mm',
          widthMm: w,
          heightMm: h,
          costArs: cost,
          swatchColor: boardFormColor,
        });
      } else {
        onUpdateBoardCost(activeBoard.id, cost);
      }
      onShowToast(`Placa actualizada: ${nameClean} (${formatARS(cost)})`);
    }
    setShowBoardModal(false);
  };

  const openAddModal = () => {
    setEditingPieceId(null);
    setCutName('');
    setCutSub('Módulo Taller J&L');
    setCutW('600');
    setCutH('400');
    setCutQty('1');
    const defaultPrice = calcExactCutUnitPrice(600, 400);
    setCutCustomPrice(String(defaultPrice));
    setCutEdges('0L');
    setCutAllowRotation(true);
    setSaveAlsoAsPreset(false);
    setShowCutModal(true);
  };

  const openEditModal = (p: CutPiece) => {
    setEditingPieceId(p.id);
    setCutName(p.name);
    setCutSub(p.subtitle);
    setCutW(String(p.widthMm));
    setCutH(String(p.heightMm));
    setCutQty(String(p.quantity));
    const calcPrice = calcExactCutUnitPrice(p.widthMm, p.heightMm);
    setCutCustomPrice(String(calcPrice));
    setCutEdges(p.edgesType);
    setCutAllowRotation(p.allowRotation);
    setSaveAlsoAsPreset(false);
    setShowCutModal(true);
  };

  const handleDeleteCut = (pieceId: string) => {
    if (onDeletePiece) {
      onDeletePiece(pieceId);
    } else {
      onShowToast('Corte eliminado');
    }
  };

  // Add piece directly from a predefined cut
  const handleAddFromPreset = (preset: PredefinedCut, qty: number = 1) => {
    const price = calcExactCutUnitPrice(preset.widthMm, preset.heightMm);

    onAddCutPiece({
      name: preset.name,
      subtitle: 'Módulo Taller J&L',
      widthMm: preset.widthMm,
      heightMm: preset.heightMm,
      quantity: qty,
      unitPriceArs: price,
      edgesLabel: 'Sin Tapacantos',
      edgesType: preset.edgesType,
      allowRotation: preset.allowRotation,
      mandatoryGrain: !preset.allowRotation,
    });
    onShowToast(
      `Corte asignado: ${preset.name} (×${qty}) • Valor: ${formatARS(price * qty)}`
    );
  };

  // Preset CRUD Modal open handlers
  const openNewPresetModal = () => {
    setEditingPreset(null);
    setPresetName('');
    setPresetW('600');
    setPresetH('400');
    setPresetEdges('2L');
    setPresetAllowRot(true);
    setShowPresetEditModal(true);
  };

  const openEditPresetModal = (pre: PredefinedCut) => {
    setEditingPreset(pre);
    setPresetName(pre.name);
    setPresetW(String(pre.widthMm));
    setPresetH(String(pre.heightMm));
    setPresetEdges(pre.edgesType);
    setPresetAllowRot(pre.allowRotation);
    setShowPresetEditModal(true);
  };

  const handleSavePresetForm = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Math.max(50, Math.min(2750, parseInt(presetW, 10) || 600));
    const h = Math.max(50, Math.min(1830, parseInt(presetH, 10) || 400));
    const edgesLabelMap = {
      '4L': '4 Lados con filo',
      '3L': '3 Lados con filo',
      '2L': '2 Lados con filo',
      '1L': '1 Lado con filo',
      '0L': 'Sin Tapacantos',
    };

    if (editingPreset) {
      if (onUpdatePredefinedCut) {
        onUpdatePredefinedCut(editingPreset.id, {
          name: presetName.trim() || editingPreset.name,
          widthMm: w,
          heightMm: h,
          edgesType: presetEdges,
          edgesLabel: edgesLabelMap[presetEdges],
          allowRotation: presetAllowRot,
        });
      }
    } else {
      if (onAddPredefinedCut) {
        onAddPredefinedCut({
          name: presetName.trim() || 'Nuevo Corte Predefinido',
          widthMm: w,
          heightMm: h,
          edgesType: presetEdges,
          edgesLabel: edgesLabelMap[presetEdges],
          allowRotation: presetAllowRot,
        });
      }
    }
    setShowPresetEditModal(false);
  };

  const handleSaveCut = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Math.max(50, Math.min(2750, parseInt(cutW, 10) || 600));
    const h = Math.max(50, Math.min(1830, parseInt(cutH, 10) || 400));
    const q = Math.max(1, Math.min(50, parseInt(cutQty, 10) || 1));
    const price = calcExactCutUnitPrice(w, h);

    const edgesLabelMap = {
      '4L': '4 Lados con filo',
      '3L': '3 Lados con filo',
      '2L': '2 Lados con filo',
      '1L': '1 Lado con filo',
      '0L': 'Sin Tapacantos',
    };

    if (editingPieceId) {
      if (onUpdatePieceDetails) {
        onUpdatePieceDetails(editingPieceId, {
          name: cutName.trim() || 'Pieza Cortada',
          subtitle: cutSub.trim() || 'Módulo Taller J&L',
          widthMm: w,
          heightMm: h,
          quantity: q,
          unitPriceArs: price,
          edgesLabel: edgesLabelMap[cutEdges],
          edgesType: cutEdges,
          allowRotation: cutAllowRotation,
          mandatoryGrain: !cutAllowRotation,
        });
      }
      onShowToast(
        `Corte actualizado (${w} × ${h} mm • ${q} uds • ${formatARS(price * q)})`
      );
    } else {
      onAddCutPiece({
        name: cutName.trim() || 'Panel Medida Especial',
        subtitle: cutSub.trim() || 'Módulo Taller J&L',
        widthMm: w,
        heightMm: h,
        quantity: q,
        unitPriceArs: price,
        edgesLabel: edgesLabelMap[cutEdges],
        edgesType: cutEdges,
        allowRotation: cutAllowRotation,
        mandatoryGrain: !cutAllowRotation,
      });
      onShowToast(
        `Corte agregado (${w} × ${h} mm • ${q} uds • ${formatARS(price * q)})`
      );

      if (saveAlsoAsPreset && onAddPredefinedCut) {
        onAddPredefinedCut({
          name: cutName.trim() || 'Plantilla Guardada',
          widthMm: w,
          heightMm: h,
          edgesType: cutEdges,
          edgesLabel: edgesLabelMap[cutEdges],
          allowRotation: cutAllowRotation,
        });
      }
    }

    setShowCutModal(false);
    setShowAllCuts(true);
  };

  // Calculate active segments out of 7 for the semicircular gauge
  const totalSegments = 7;
  const activeSegments =
    cutPieces.length === 0 || efficiencyPct <= 0
      ? 0
      : Math.max(
          1,
          Math.min(7, Math.round((efficiencyPct / 100) * totalSegments))
        );

  return (
    <div className="space-y-4 pb-8">
      {/* Top Action Row */}
      <div className="grid grid-cols-12 gap-2.5">
        <button
          onClick={() => {
            setSelectedCadPiece(null);
            setCurrentBoardPage(0);
            onResetCleanOrder();
          }}
          className="col-span-8 h-10 rounded-xl bg-[#271e1a] hover:bg-[#34241d] active:scale-[0.99] border border-[#e87a50]/60 text-[#ffb59b] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#ffb59b]" />
          <span>Reiniciar Todo en 0 (Melamina)</span>
        </button>

        <button
          onClick={openAddModal}
          className="col-span-4 h-10 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] active:scale-[0.99] text-[#121414] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>+ Corte</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* Top Section: Board Config & Optimization Metrics */}
        <div className="space-y-4">
          {/* CARD 1: Configuración de Hoja */}
          <section className="atelier-card rounded-2xl p-4 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e87a50]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
                  CONFIGURACIÓN DE HOJA
                </span>
              </div>
              <button
                type="button"
                onClick={openAddBoardModal}
                className="text-[10px] font-bold text-[#121414] bg-[#e87a50] hover:bg-[#f0855c] px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Nueva Placa</span>
              </button>
            </div>

            {/* Active Board Selector Strip */}
            <div className="relative mb-3.5">
              <div className="bg-[#222424] rounded-xl p-3 flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-lg shadow-inner shrink-0 border border-white/10"
                    style={{ backgroundColor: activeBoard.swatchColor }}
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-white truncate">
                      {activeBoard.name}
                    </h3>
                    <p className="text-xs text-[#a1a1a1] truncate">{activeBoard.brandSpec}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[#c8c6c5] shrink-0">
                  <button
                    onClick={openEditBoardModal}
                    title="Editar nombre, medidas y costo de placa"
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {boards.length > 0 && onDeleteBoard && (
                    <button
                      onClick={() => onDeleteBoard(activeBoard.id)}
                      title="Eliminar placa"
                      className="p-1.5 hover:bg-red-950/60 text-red-300 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowBoardMenu((prev) => !prev)}
                    title="Cambiar placa de melamina"
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Board Selector Dropdown */}
              {showBoardMenu && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1e2020] border border-white/10 rounded-xl p-2 shadow-2xl z-20 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1a1] px-2 py-1">
                    Seleccionar Placa de Melamina
                  </div>
                  {boards.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        onSelectBoard(b.id);
                        setShowBoardMenu(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold cursor-pointer ${
                        b.id === selectedBoardId
                          ? 'bg-[#e87a50] text-[#121414]'
                          : 'text-[#e3e2e2] hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: b.swatchColor }}
                        />
                        <span>{b.name}</span>
                      </div>
                      <span className="tabular-nums opacity-80">
                        {formatARS(b.costArs)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Inline Cost Editor */}
            {editingCost && (
              <div className="mb-3.5 p-3 rounded-xl bg-[#281d18] border border-[#e87a50] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#ffb59b]">
                    Actualizar Costo Placa ({activeBoard.name})
                  </span>
                  <button
                    onClick={() => setEditingCost(false)}
                    className="text-[#a1a1a1] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={costInput}
                    onChange={(e) => setCostInput(e.target.value)}
                    className="flex-1 bg-[#181a1a] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white tabular-nums font-bold"
                  />
                  <button
                    onClick={handleSaveBoardCost}
                    className="px-3 py-1.5 bg-[#e87a50] text-[#121414] text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Board Specs: 2 Columns */}
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              <div className="atelier-subcard rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
                  DIMENSIONES
                </div>
                <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
                  {activeBoard.widthMm} × {activeBoard.heightMm}
                </div>
                <div className="text-xs text-[#a1a1a1]">mm (18mm)</div>
                <div className="text-[11px] text-[#c8c6c5] mt-1 tabular-nums">
                  Superficie: {boardAreaM2} m²
                </div>
              </div>

              <div className="atelier-subcard rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
                    COSTO PLACA
                  </span>
                  <span className="bg-[#2c2e2e] text-[#e3e2e2] text-[10px] font-bold px-1.5 py-0.5 rounded">
                    ARS
                  </span>
                </div>
                <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
                  {formatARS(activeBoard.costArs)}
                </div>
                <div className="inline-block bg-[#2d211d] text-[#ffb59b] text-[11px] font-bold px-2 py-0.5 rounded mt-1 tabular-nums">
                  {formatARS(costPerM2)} / m²
                </div>
              </div>
            </div>

            {/* Primary CTA Button */}
            <button
              onClick={handleRunOptimizer}
              disabled={isOptimizing}
              className="w-full h-12 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] active:scale-[0.99] text-[#280b00] font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer"
            >
              <Wand2 className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>
                {isOptimizing
                  ? 'Calculando Guillotina 2D...'
                  : 'Optimizar Cortes (2D Guillotina)'}
              </span>
            </button>
          </section>

          {/* CARD 2: Rendimiento de Hoja */}
          <section className="atelier-card rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
                  RENDIMIENTO DE CORTE
                </div>
                <h2 className="text-lg font-bold font-display text-white">
                  Eficiencia de Patrón
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-[#232525] border border-white/10 text-[#e3e2e2] text-[11px] font-semibold px-2.5 py-1 rounded-full tabular-nums">
                  {totalBoardsCount} {totalBoardsCount === 1 ? 'Placa' : 'Placas'}
                </span>
                <button
                  onClick={() => {
                    setSelectedCadPiece(null);
                    setCurrentBoardPage(0);
                    onResetCleanOrder();
                  }}
                  title="Reiniciar Cortes"
                  className="p-1 rounded-lg bg-[#271e1a] text-[#ffb59b] hover:bg-[#34241d] border border-[#e87a50]/50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Segmented Semi-Circular Gauge */}
            <div className="relative flex flex-col items-center justify-center my-3 pt-2">
              <svg viewBox="0 0 240 130" className="w-56 h-32 overflow-visible">
                {Array.from({ length: totalSegments }).map((_, idx) => {
                  const totalSpan = 180;
                  const gapDeg = 8;
                  const segSpan =
                    (totalSpan - gapDeg * (totalSegments - 1)) / totalSegments;
                  const startDeg = 180 - idx * (segSpan + gapDeg);
                  const endDeg = startDeg - segSpan;

                  const r = 88;
                  const cx = 120;
                  const cy = 112;

                  const startRad = (startDeg * Math.PI) / 180;
                  const endRad = (endDeg * Math.PI) / 180;

                  const x1 = cx + r * Math.cos(startRad);
                  const y1 = cy - r * Math.sin(startRad);
                  const x2 = cx + r * Math.cos(endRad);
                  const y2 = cy - r * Math.sin(endRad);

                  const isFilled = idx < activeSegments;

                  return (
                    <path
                      key={idx}
                      d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                      fill="none"
                      stroke={isFilled ? '#e87a50' : '#f2f0ef'}
                      strokeWidth="12"
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  );
                })}
              </svg>

              <div className="absolute bottom-2 flex flex-col items-center text-center">
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-[#c8c6c5]">
                  <Zap className="w-3.5 h-3.5 text-[#e87a50] fill-[#e87a50]" />
                  <span>OPTIMIZADO</span>
                </div>
                <div className="text-3xl font-bold font-display text-white tracking-tight tabular-nums mt-0.5">
                  {efficiencyPct}%
                </div>
              </div>
            </div>

            {/* 2x2 Metric Subcards */}
            <div className="grid grid-cols-2 gap-2.5 mt-2">
              <div className="atelier-subcard rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#c8c6c5]">
                  <span className="w-2 h-2 rounded-full bg-[#e87a50]" />
                  <span>Área Útil Cortada</span>
                </div>
                <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
                  {usedAreaM2} m²
                </div>
                <div className="text-[11px] text-[#a1a1a1] mt-0.5 tabular-nums">
                  {efficiencyPct}% de placas
                </div>
              </div>

              <div className="atelier-subcard rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#c8c6c5]">
                  <span className="w-2 h-2 rounded-full bg-[#717171]" />
                  <span className="leading-tight">Desperdicio Técnico</span>
                </div>
                <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
                  {wasteAreaM2} m²
                </div>
                <div className="text-[11px] text-[#a1a1a1] mt-0.5 tabular-nums">
                  {restPct}% restante
                </div>
              </div>

              <div className="atelier-subcard rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#c8c6c5]">
                  <Banknote className="w-3.5 h-3.5 text-[#c8c6c5]" />
                  <span>Valor Cortes</span>
                </div>
                <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
                  {formatARS(cutValueArs)}
                </div>
                <div className="text-[11px] text-[#a1a1a1] mt-0.5">
                  ARS aplicado
                </div>
              </div>

              <div className="atelier-subcard rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#c8c6c5]">
                  <ClipboardCheck className="w-3.5 h-3.5 text-[#c8c6c5]" />
                  <span className="leading-tight">Piezas / Placas</span>
                </div>
                <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
                  {totalPiecesCount} uds
                </div>
                <div className="text-[11px] text-[#ffb59b] mt-0.5 tabular-nums">
                  {totalBoardsCount} {totalBoardsCount === 1 ? 'placa completa' : 'placas necesarias'}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Section: CAD Simulator & Assigned Cuts */}
        <div className="space-y-4">
          {/* CARD 3: PLANO DE SIERRA - Simulador HiDPI CAD */}
          <section className="atelier-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
                  PLANO DE SIERRA
                </div>
                <h2 className="text-lg font-bold font-display text-white">
                  Simulador HiDPI CAD
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCadZoom((z) => !z)}
                  title="Alternar Zoom"
                  className={`w-8 h-8 rounded-full flex items-center justify-center border border-white/10 transition-colors cursor-pointer ${
                    cadZoom
                      ? 'bg-[#e87a50] text-[#121414]'
                      : 'bg-[#222424] text-[#e3e2e2] hover:bg-[#2c2e2e]'
                  }`}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedCadPiece(null);
                    setCadZoom(false);
                    onShowToast(`Vista centrada en Placa #${activeBoardIndex + 1} (${activeBoard.widthMm}×${activeBoard.heightMm}mm)`);
                  }}
                  title="Centrar Plano"
                  className="w-8 h-8 rounded-full bg-[#222424] hover:bg-[#2c2e2e] text-[#e3e2e2] flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MULTI-BOARD TABS (If cuts require 2 or more boards) */}
            {totalBoardsCount > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
                {nestingResult.boards.map((b, bIdx) => {
                  const isActive = activeBoardIndex === bIdx;
                  return (
                    <button
                      key={bIdx}
                      onClick={() => setCurrentBoardPage(bIdx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        isActive
                          ? 'bg-[#e87a50] text-[#121414] shadow-md'
                          : 'bg-[#222424] text-[#c8c6c5] hover:text-white border border-white/10'
                      }`}
                    >
                      <span>Placa #{b.boardNumber} de {totalBoardsCount}</span>
                      <span className="text-[10px] opacity-80 tabular-nums">
                        ({b.placedPieces.length} piezas • {b.efficiencyPct}%)
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* CAD Sheet Container */}
            <div className="bg-[#232525] p-2.5 rounded-xl border border-white/10 relative overflow-hidden">
              <div
                className={`relative w-full aspect-[2750/1830] bg-[#3a3b3b] rounded overflow-hidden transition-transform duration-300 ${
                  cadZoom ? 'scale-110 origin-top-left' : 'scale-100'
                }`}
              >
                {/* Grain lines overlay */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage:
                      grainDirection === 'horizontal'
                        ? 'repeating-linear-gradient(0deg, transparent, transparent 12px, #000 12px, #000 13px)'
                        : 'repeating-linear-gradient(90deg, transparent, transparent 12px, #000 12px, #000 13px)',
                  }}
                />

                {/* EMPTY BOARD STATE */}
                {cutPieces.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#ffb59b] mb-2">
                      <RotateCcw className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-white">
                      Simulador en 0 ({activeBoard.widthMm} × {activeBoard.heightMm} mm)
                    </span>
                    <span className="text-xs text-[#c8c6c5] mt-1">
                      0% Eficiencia • Sin ningún corte cargado en la placa
                    </span>
                  </div>
                )}

                {/* REAL 2D GUILLOTINE / BIN-PACKING NESTING RENDERING */}
                {cutPieces.length > 0 && (
                  <>
                    {/* Render every single physical unit placed on this board */}
                    {activeNestingBoard.placedPieces.map((piece, pIdx) => {
                      const isHighlighted = pIdx === 0 && activeBoardIndex === 0;
                      return (
                        <div
                          key={piece.id}
                          onClick={() =>
                            setSelectedCadPiece(
                              `${piece.displayLabel} ${piece.name} • ${piece.originalWidthMm} × ${piece.originalHeightMm} mm${
                                piece.rotated ? ' (Rotada 90°)' : ''
                              } • Placa #${activeBoardIndex + 1}`
                            )
                          }
                          style={{
                            left: `${(piece.xMm / activeBoard.widthMm) * 100}%`,
                            top: `${(piece.yMm / activeBoard.heightMm) * 100}%`,
                            width: `${(piece.widthMm / activeBoard.widthMm) * 100}%`,
                            height: `${(piece.heightMm / activeBoard.heightMm) * 100}%`,
                          }}
                          className={`absolute rounded-[2.5px] border flex flex-col items-center justify-center text-center p-0.5 cursor-pointer transition-all hover:brightness-105 hover:z-20 ${
                            isHighlighted
                              ? 'bg-[#ffdbcf] border-2 border-[#e87a50] text-[#5b1a00]'
                              : 'bg-[#f4f2f0] border border-[#383a3a] text-[#141616] hover:bg-white'
                          }`}
                        >
                          {showLabelsOnCad && (
                            <>
                              <span className="text-[7.5px] sm:text-[9px] font-extrabold leading-tight truncate px-0.5 max-w-full">
                                {piece.displayLabel} {piece.name}
                              </span>
                              <span className="text-[6.5px] sm:text-[7.5px] font-semibold opacity-85 tabular-nums">
                                {piece.widthMm} × {piece.heightMm} mm{piece.rotated ? ' ↻' : ''}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Render remaining scrap areas (RETAZO SOBRANTE) */}
                    {activeNestingBoard.freeRectangles.map((fr, frIdx) => {
                      // Only display label if scrap rectangle is large enough
                      if (fr.widthMm < 120 || fr.heightMm < 90) return null;
                      return (
                        <div
                          key={frIdx}
                          onClick={() =>
                            setSelectedCadPiece(
                              `Retazo Sobrante • ${fr.widthMm} × ${fr.heightMm} mm (${fr.areaM2} m² libre)`
                            )
                          }
                          style={{
                            left: `${(fr.xMm / activeBoard.widthMm) * 100}%`,
                            top: `${(fr.yMm / activeBoard.heightMm) * 100}%`,
                            width: `${(fr.widthMm / activeBoard.widthMm) * 100}%`,
                            height: `${(fr.heightMm / activeBoard.heightMm) * 100}%`,
                          }}
                          className="absolute bg-[#282a2a]/90 border border-dashed border-[#717171] rounded-[2.5px] flex flex-col items-center justify-center p-1 text-center cursor-pointer hover:bg-[#303333] transition-colors"
                        >
                          <span className="text-[7.5px] font-extrabold text-[#e3e2e2] leading-tight">
                            RETAZO SOBRANTE
                          </span>
                          <span className="text-[6.5px] text-[#ffb59b] font-semibold tabular-nums mt-0.5">
                            {fr.areaM2} m² libre
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Floating Scale Badge */}
                <div className="absolute bottom-2.5 left-2.5 bg-[#181a1a]/95 border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-[#e87a50]" />
                  <span className="text-[11px] font-bold text-white tabular-nums">
                    Placa #{activeBoardIndex + 1} de {totalBoardsCount} •{' '}
                    {cadZoom ? '150%' : '100%'}
                  </span>
                </div>
              </div>

              {selectedCadPiece && (
                <div className="mt-2 px-3 py-1.5 rounded-lg bg-[#2d211d] border border-[#e87a50]/40 flex items-center justify-between text-xs text-[#ffdbcf]">
                  <span>{selectedCadPiece}</span>
                  <button
                    onClick={() => setSelectedCadPiece(null)}
                    className="text-[#ffb59b] hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Controls of CAD Card */}
            <div className="flex items-center justify-between mt-3 pt-1">
              <button
                onClick={() => setShowLabelsOnCad((prev) => !prev)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#222424] hover:bg-[#2c2e2e] border border-white/5 text-xs font-semibold text-[#e3e2e2] transition-colors cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-[#c8c6c5]" />
                <span>{showLabelsOnCad ? 'Ver Etiquetas' : 'Mostrar Etiquetas'}</span>
              </button>

              <button
                onClick={() =>
                  setGrainDirection((prev) =>
                    prev === 'horizontal' ? 'vertical' : 'horizontal'
                  )
                }
                className="text-xs font-bold text-[#c8c6c5] hover:text-white transition-colors px-2 py-1 cursor-pointer"
              >
                {grainDirection === 'horizontal'
                  ? 'Veta Horizontal →'
                  : 'Veta Vertical ↓'}
              </button>
            </div>

            {/* ONE-CLICK CONFIRM SAW CUT ACTION */}
            <div className="mt-3.5 pt-2.5 border-t border-white/5">
              <button
                onClick={handleInitiateConfirmCut}
                disabled={cutPieces.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#2e7d32] to-[#1b5e20] hover:from-[#388e3c] hover:to-[#2e7d32] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-green-900/30 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4 text-[#a5d6a7]" />
                <span>✅ Confirmar Corte en Sierra</span>
                <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full font-mono text-[#c8e6c9]">
                  {totalBoardsCount} {totalBoardsCount === 1 ? 'placa' : 'placas'} • {totalPiecesCount} piezas
                </span>
              </button>
            </div>
          </section>

          {/* SECTION: CONTROLES DE CORTES (Sin desborde horizontal) */}
          <section className="space-y-3">
            <div className="grid grid-cols-3 gap-2 w-full">
              {/* PREDEFINED CUTS DROPDOWN BUTTON */}
              <button
                onClick={() => setShowPresetsMenu(true)}
                title="Plantillas y Cortes Predefinidos (CRUD)"
                className="h-9 px-2 rounded-xl bg-[#222424] hover:bg-[#2b2d2d] border border-white/10 text-[#e3e2e2] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs truncate"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#ffb59b] shrink-0" />
                <span className="truncate">Plantillas ({predefinedCuts.length})</span>
              </button>

              <button
                onClick={() => {
                  setSelectedCadPiece(null);
                  setCurrentBoardPage(0);
                  onResetCleanOrder();
                }}
                title="Reiniciar todos los cortes, simulador y eficiencia a 0 absoluto"
                className="h-9 px-2 rounded-xl bg-[#271e1a] hover:bg-[#34241d] border border-[#e87a50]/70 text-[#ffb59b] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs truncate"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#ffb59b] shrink-0" />
                <span className="truncate">Reiniciar</span>
              </button>

              <button
                onClick={openAddModal}
                className="h-9 px-2 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs truncate"
              >
                <Plus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                <span className="truncate">+ Corte</span>
              </button>
            </div>

            {/* Empty state when 0 cuts assigned */}
            {cutPieces.length === 0 ? (
              <div className="atelier-card rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#271e1a] border border-[#e87a50]/40 flex items-center justify-center text-[#ffb59b]">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Cortes, Simulador y Eficiencia en 0%
                  </h3>
                  <p className="text-xs text-[#c8c6c5] mt-1">
                    No hay ningún corte cargado. Agrega tus piezas a medida para calcular el patrón físico.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={openAddModal}
                    className="px-4 py-2.5 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Corte</span>
                  </button>
                  <button
                    onClick={() => setShowPresetsMenu(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#271e1a] border border-[#e87a50]/50 text-[#ffb59b] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Ver Plantillas</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Cut Piece Cards */
              <div className="space-y-3">
                {/* Summary Bar: Total Value of All Loaded Cuts */}
                <div className="bg-[#1b1d1d] border border-[#e87a50]/35 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <span className="text-[#c8c6c5] font-semibold">
                    Valor total cortes ({totalPiecesCount}{' '}
                    {totalPiecesCount === 1 ? 'unidad' : 'unidades'}):
                  </span>
                  <span className="text-sm font-extrabold text-[#ffb59b] tabular-nums">
                    {formatARS(
                      cutPieces.reduce((sum, p) => {
                        const unitVal = calcExactCutUnitPrice(
                          p.widthMm,
                          p.heightMm
                        );
                        return sum + unitVal * p.quantity;
                      }, 0)
                    )}
                  </span>
                </div>

                {visiblePieces.map((piece, idx) => {
                  const isFirst = idx === 0;
                  const unitCutPriceArs = calcExactCutUnitPrice(
                    piece.widthMm,
                    piece.heightMm
                  );
                  const totalCutPriceArs = unitCutPriceArs * piece.quantity;
                  const cleanSubtitle = (piece.subtitle || 'Módulo Taller J&L')
                    .replace(/\s*•\s*Cantos.*$/i, '')
                    .replace(/\s*•\s*Sin Tapacantos.*$/i, '');

                  return (
                    <div
                      key={piece.id}
                      className="atelier-card rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold tabular-nums shrink-0 ${
                              isFirst
                                ? 'bg-[#3c241b] text-[#ffb59b]'
                                : 'bg-[#252727] text-[#e3e2e2]'
                            }`}
                          >
                            {piece.numberLabel}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white leading-snug truncate">
                              {piece.name}
                            </h3>
                            <p className="text-xs text-[#a1a1a1] truncate">
                              {cleanSubtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-[#c8c6c5] shrink-0">
                          <button
                            onClick={() => openEditModal(piece)}
                            title="Editar dimensiones, precio y cantidad"
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCut(piece.id)}
                            title="Eliminar corte de la placa"
                            className="p-1.5 hover:bg-[#381e18] text-[#ffb59b] rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Dimensions & Specific Cut Value Row (Sums automatically with Quantity) */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-[#222424] rounded-xl px-3 py-2 flex items-center justify-between">
                          <span className="text-[#a1a1a1]">Medidas:</span>
                          <span className="font-bold text-white tabular-nums">
                            {piece.widthMm} × {piece.heightMm} mm
                          </span>
                        </div>

                        <div className="bg-[#222424] rounded-xl px-3 py-2 flex flex-col justify-center">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[#a1a1a1]">
                              {piece.quantity > 1
                                ? `Valor (×${piece.quantity}):`
                                : 'Valor:'}
                            </span>
                            <span className="font-bold text-[#ffb59b] tabular-nums">
                              {formatARS(totalCutPriceArs)}
                            </span>
                          </div>
                          {piece.quantity > 1 && (
                            <div className="text-[10px] text-[#9e9c9b] text-right tabular-nums leading-tight mt-0.5">
                              {formatARS(unitCutPriceArs)} c/u
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity & Rotation Controls */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-[#a1a1a1]">
                          <button
                            onClick={() => onTogglePieceRotation(piece.id)}
                            className="flex items-center gap-1 bg-[#222424] hover:bg-[#2c2e2e] text-[#e3e2e2] px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5 text-[#ffb59b]" />
                            <span>
                              {piece.allowRotation ? 'Rotación 90° Sí' : 'Fijo (Veta)'}
                            </span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#a1a1a1]">Cantidad:</span>
                          <div className="flex items-center gap-2 bg-[#222424] rounded-full px-2 py-0.5 border border-white/5">
                            <button
                              onClick={() => onUpdatePieceQty(piece.id, -1)}
                              disabled={piece.quantity <= 1}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-white tabular-nums min-w-[20px] text-center">
                              {piece.quantity}
                            </span>
                            <button
                              onClick={() => onUpdatePieceQty(piece.id, 1)}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white hover:bg-white/10 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {cutPieces.length > 4 && (
                  <button
                    onClick={() => setShowAllCuts((prev) => !prev)}
                    className="w-full py-2.5 rounded-xl bg-[#222424] hover:bg-[#2c2e2e] text-xs font-semibold text-[#c8c6c5] transition-colors cursor-pointer"
                  >
                    {showAllCuts
                      ? 'Mostrar Menos Cortes'
                      : `Ver Todos los Cortes (${cutPieces.length})`}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* MODAL: PREDEFINED CUTS / PLANTILLAS (FULL CRUD) */}
      {showPresetsMenu && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-md w-full p-5 space-y-4 border border-white/15 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-[#ffb59b]" />
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    Cortes Predefinidos (Plantillas)
                  </h3>
                  <p className="text-[11px] text-[#c8c6c5]">
                    Cortes estándar con medidas y tapacantos preconfigurados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPresetsMenu(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between shrink-0 pt-1">
              <span className="text-xs text-[#a1a1a1]">
                {predefinedCuts.length} plantillas guardadas
              </span>
              <button
                onClick={openNewPresetModal}
                className="px-3 py-1.5 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nueva Plantilla</span>
              </button>
            </div>

            {/* Presets List */}
            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {predefinedCuts.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#1e2020] text-center text-xs text-[#a1a1a1]">
                  No tienes cortes predefinidos guardados. Crea uno con el botón superior.
                </div>
              ) : (
                predefinedCuts.map((pre) => (
                  <div
                    key={pre.id}
                    className="p-3 rounded-xl bg-[#1f2121] border border-white/10 flex items-center justify-between gap-2.5 hover:border-white/20 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate">
                        {pre.name}
                      </div>
                      <div className="text-[11px] text-[#ffb59b] font-semibold tabular-nums mt-0.5">
                        {pre.widthMm} × {pre.heightMm} mm • Valor:{' '}
                        {formatARS(
                          Math.round(
                            ((pre.widthMm * pre.heightMm) / 1_000_000) *
                              costPerM2 *
                              1.15
                          )
                        )}{' '}
                        c/u
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleAddFromPreset(pre, 1)}
                        title="Agregar 1 unidad a la guillotina"
                        className="px-2 py-1 rounded-lg bg-[#2e201b] hover:bg-[#3d2720] border border-[#e87a50]/60 text-[#ffb59b] text-[11px] font-bold cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleAddFromPreset(pre, 2)}
                        title="Agregar 2 unidades a la guillotina"
                        className="px-2 py-1 rounded-lg bg-[#2e201b] hover:bg-[#3d2720] border border-[#e87a50]/60 text-[#ffb59b] text-[11px] font-bold cursor-pointer"
                      >
                        +2
                      </button>
                      <button
                        onClick={() => openEditPresetModal(pre)}
                        title="Editar plantilla (nombre o medidas)"
                        className="p-1.5 rounded-lg bg-[#272929] hover:bg-white/10 text-[#c8c6c5] cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (onDeletePredefinedCut) onDeletePredefinedCut(pre.id);
                        }}
                        title="Eliminar plantilla"
                        className="p-1.5 rounded-lg bg-[#272929] hover:bg-[#381e18] text-[#ffb59b] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowPresetsMenu(false)}
                className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] hover:text-white cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR PLANTILLA PREDEFINIDA */}
      {showPresetEditModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                {editingPreset ? 'Editar Corte Predefinido' : 'Nuevo Corte Predefinido'}
              </h3>
              <button
                onClick={() => setShowPresetEditModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePresetForm} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Nombre de la Plantilla
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Frentes de cajón"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Largo (mm)
                  </label>
                  <input
                    type="number"
                    required
                    value={presetW}
                    onChange={(e) => setPresetW(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Profundidad (mm)
                  </label>
                  <input
                    type="number"
                    required
                    value={presetH}
                    onChange={(e) => setPresetH(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
                <span className="text-[#c8c6c5] font-semibold">
                  Valor estimado por corte:
                </span>
                <span className="font-bold text-[#ffb59b] tabular-nums">
                  {formatARS(
                    Math.round(
                      (((parseInt(presetW, 10) || 0) *
                        (parseInt(presetH, 10) || 0)) /
                        1_000_000) *
                        costPerM2 *
                        1.15
                    )
                  )}{' '}
                  c/u
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="presetRot"
                  checked={presetAllowRot}
                  onChange={(e) => setPresetAllowRot(e.target.checked)}
                  className="rounded text-[#e87a50]"
                />
                <label htmlFor="presetRot" className="text-xs text-[#c8c6c5] cursor-pointer">
                  Permite rotar 90° en guillotina
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPresetEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                >
                  Guardar Plantilla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR O EDITAR CORTE */}
      {showCutModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-md w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                {editingPieceId ? 'Editar Corte de Placa' : 'Agregar Nuevo Corte a Placa'}
              </h3>
              <button
                onClick={() => setShowCutModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QUICK PRESET SELECTOR (If adding a new cut) */}
            {!editingPieceId && predefinedCuts.length > 0 && (
              <div className="p-3 rounded-xl bg-[#1d1f1f] border border-[#e87a50]/40 space-y-1">
                <label className="text-[11px] font-bold text-[#ffb59b] uppercase tracking-wider block">
                  Plantilla Predefinida (Opcional)
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const preset = predefinedCuts.find((p) => p.id === e.target.value);
                    if (preset) {
                      setCutName(preset.name);
                      setCutW(String(preset.widthMm));
                      setCutH(String(preset.heightMm));
                      setCutCustomPrice(
                        String(
                          Math.round(
                            ((preset.widthMm * preset.heightMm) / 1_000_000) *
                              costPerM2 *
                              1.15
                          )
                        )
                      );
                      setCutEdges(preset.edgesType);
                      setCutAllowRotation(preset.allowRotation);
                    }
                  }}
                  className="w-full bg-[#272929] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white font-semibold cursor-pointer"
                >
                  <option value="" disabled>
                    -- Seleccionar plantilla para auto-completar --
                  </option>
                  {predefinedCuts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.widthMm}×{p.heightMm} mm •{' '}
                      {formatARS(
                        Math.round(
                          ((p.widthMm * p.heightMm) / 1_000_000) *
                            costPerM2 *
                            1.15
                        )
                      )}
                      )
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleSaveCut} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Nombre de la Pieza
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Puerta Alacena Izquierda"
                  value={cutName}
                  onChange={(e) => setCutName(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#e87a50]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Subtítulo / Módulo
                </label>
                <input
                  type="text"
                  placeholder="Ej. Módulo Bajo Mesada • Línea Escandinava"
                  value={cutSub}
                  onChange={(e) => setCutSub(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#e87a50]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Largo (mm)
                  </label>
                  <input
                    type="number"
                    required
                    value={cutW}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCutW(val);
                      const wNum = parseInt(val, 10) || 0;
                      const hNum = parseInt(cutH, 10) || 0;
                      setCutCustomPrice(
                        String(
                          Math.round(((wNum * hNum) / 1_000_000) * costPerM2 * 1.15)
                        )
                      );
                    }}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white tabular-nums focus:outline-none focus:border-[#e87a50]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Profundidad (mm)
                  </label>
                  <input
                    type="number"
                    required
                    value={cutH}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCutH(val);
                      const wNum = parseInt(cutW, 10) || 0;
                      const hNum = parseInt(val, 10) || 0;
                      setCutCustomPrice(
                        String(
                          Math.round(((wNum * hNum) / 1_000_000) * costPerM2 * 1.15)
                        )
                      );
                    }}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white tabular-nums focus:outline-none focus:border-[#e87a50]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cutQty}
                    onChange={(e) => setCutQty(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white tabular-nums focus:outline-none focus:border-[#e87a50]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#1d1f1f] border border-[#e87a50]/35 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[#c8c6c5]">
                    Valor Unitario del Corte (ARS)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cutCustomPrice}
                    onChange={(e) => setCutCustomPrice(e.target.value)}
                    className="w-28 bg-[#272929] border border-white/15 rounded-lg px-2.5 py-1 text-xs font-bold text-[#ffb59b] text-right tabular-nums focus:outline-none focus:border-[#e87a50]"
                  />
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                  <span className="text-[#a1a1a1]">
                    Total sumado ({Math.max(1, parseInt(cutQty, 10) || 1)}{' '}
                    {Math.max(1, parseInt(cutQty, 10) || 1) === 1
                      ? 'unidad'
                      : 'unidades'}
                    ):
                  </span>
                  <span className="text-sm font-extrabold text-[#e87a50] tabular-nums">
                    {formatARS(
                      (parseInt(cutCustomPrice, 10) || 0) *
                        Math.max(1, parseInt(cutQty, 10) || 1)
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cutRotCheck"
                    checked={cutAllowRotation}
                    onChange={(e) => setCutAllowRotation(e.target.checked)}
                    className="rounded text-[#e87a50] cursor-pointer"
                  />
                  <label
                    htmlFor="cutRotCheck"
                    className="text-xs text-[#c8c6c5] cursor-pointer"
                  >
                    Permite rotar 90° en el optimizador guillotina
                  </label>
                </div>

                {!editingPieceId && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="saveAsPresetCheck"
                      checked={saveAlsoAsPreset}
                      onChange={(e) => setSaveAlsoAsPreset(e.target.checked)}
                      className="rounded text-[#e87a50] cursor-pointer"
                    />
                    <label
                      htmlFor="saveAsPresetCheck"
                      className="text-xs text-[#ffb59b] font-semibold cursor-pointer"
                    >
                      Guardar también como nuevo Corte Predefinido (Plantilla)
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCutModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                >
                  {editingPieceId ? 'Guardar Cambios' : 'Asignar a Placa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR CORTE EN SIERRA & RECUPERACIÓN DE RETAZO ÚTIL */}
      {showConfirmCutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-white">
                    Confirmar Corte en Sierra
                  </h3>
                  <p className="text-[10px] text-[#c8c6c5]">
                    Impacto directo en Inventario de Taller
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmCutModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transaction summary steps */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#1e2020] border border-white/5 space-y-1">
                <div className="flex items-center justify-between font-bold text-white">
                  <span className="flex items-center gap-1.5 text-[#ffb59b]">
                    <span>1. Descontar Placa Base</span>
                  </span>
                  <span className="text-[#e87a50] tabular-nums">
                    -{totalBoardsCount} {totalBoardsCount === 1 ? 'placa' : 'placas'}
                  </span>
                </div>
                <p className="text-[11px] text-[#c8c6c5]">
                  Se restará de la categoría <span className="text-white font-semibold">Insumos / Placas</span>: {activeBoard.name} ({activeBoard.widthMm} × {activeBoard.heightMm} mm).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#1e2020] border border-white/5 space-y-1">
                <div className="flex items-center justify-between font-bold text-white">
                  <span className="flex items-center gap-1.5 text-[#a5d6a7]">
                    <span>2. Acumular Piezas Cortadas</span>
                  </span>
                  <span className="text-green-400 tabular-nums">
                    +{totalPiecesCount} piezas
                  </span>
                </div>
                <p className="text-[11px] text-[#c8c6c5]">
                  Las {cutPieces.length} medidas cortadas se sumarán a la categoría <span className="text-white font-semibold">Pieza Madera</span> (stock acumulativo).
                </p>
              </div>

              {/* Scrap/Offcut Recovery Prompt */}
              {largestScrap && largestScrap.areaM2 >= 0.30 ? (
                <div className="p-3 rounded-xl bg-[#2a221b] border border-[#e87a50]/40 space-y-2">
                  <div className="flex items-center gap-2 text-[#ffb59b] font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#e87a50]" />
                    <span>Retazo Útil Detectado ({largestScrap.areaM2} m² libre)</span>
                  </div>
                  <p className="text-[11px] text-[#e3e2e2]">
                    El retazo sobrante de <strong className="text-white">{largestScrap.widthMm} × {largestScrap.heightMm} mm</strong> supera los 0.30 m².
                  </p>
                  <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveScrapOption}
                      onChange={(e) => setSaveScrapOption(e.target.checked)}
                      className="rounded text-[#e87a50] focus:ring-0 cursor-pointer w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-white">
                      ¿Guardar retazo útil en Inventario (Insumos / Placas)?
                    </span>
                  </label>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#1c1e1e] border border-white/5 text-[11px] text-[#a1a1a1]">
                  Desperdicio / Retazo: {wasteAreaM2} m² (menor a 0.30 m², considerado aserrín/scrap no recuperable).
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowConfirmCutModal(false)}
                className="px-4 py-2 rounded-xl bg-[#222424] hover:bg-[#2c2e2e] text-xs font-semibold text-[#c8c6c5] cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmCut}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2e7d32] to-[#1b5e20] hover:from-[#388e3c] hover:to-[#2e7d32] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar e Impactar Stock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR PLACA DE MELAMINA */}
      {showBoardModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                {editingBoardMode === 'add' ? 'Nueva Placa de Melamina' : 'Editar Placa de Melamina'}
              </h3>
              <button
                type="button"
                onClick={() => setShowBoardModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBoardModal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Nombre de la Placa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carvalho Mezzo 18mm"
                  value={boardFormName}
                  onChange={(e) => setBoardFormName(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Especificación / Marca
                </label>
                <input
                  type="text"
                  placeholder="Ej. Faplac 18mm 1ra Calidad"
                  value={boardFormSpec}
                  onChange={(e) => setBoardFormSpec(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Largo (mm)
                  </label>
                  <input
                    type="number"
                    required
                    min="200"
                    value={boardFormW}
                    onChange={(e) => setBoardFormW(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Profundidad (mm)
                  </label>
                  <input
                    type="number"
                    required
                    min="200"
                    value={boardFormH}
                    onChange={(e) => setBoardFormH(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2.5 items-end">
                <div className="col-span-9">
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Valor de la Placa (ARS)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Ej. 104000"
                    value={boardFormCost}
                    onChange={(e) => setBoardFormCost(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-semibold text-[#c8c6c5] mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={boardFormColor}
                    onChange={(e) => setBoardFormColor(e.target.value)}
                    className="w-full h-9 rounded-xl bg-[#222424] border border-white/15 p-0.5 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBoardModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                >
                  Guardar Placa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
