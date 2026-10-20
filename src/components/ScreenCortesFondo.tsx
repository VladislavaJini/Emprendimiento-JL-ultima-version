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
  Palette,
  X,
} from 'lucide-react';
import { MelaminaBoard, CutPiece } from '../types/atelier';
import { formatARS } from '../data/initialData';
import {
  calculate2DGuillotineNesting,
  PlacedPiece,
  BoardNestingResult,
} from '../utils/cutNesting';

interface ScreenCortesFondoProps {
  boards: MelaminaBoard[];
  selectedBoardId: string;
  onSelectBoard: (id: string) => void;
  onUpdateBoard: (id: string, updated: Partial<MelaminaBoard>) => void;
  onAddBoardColor: (newBoard: MelaminaBoard) => void;
  cutPieces: CutPiece[];
  onUpdatePieceQty: (id: string, delta: number) => void;
  onUpdatePieceDetails: (id: string, updated: Partial<CutPiece>) => void;
  onDeletePiece: (id: string) => void;
  onTogglePieceRotation: (id: string) => void;
  onAddCutPiece: (piece: Omit<CutPiece, 'id' | 'numberLabel'>) => void;
  onResetCleanOrder: () => void;
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

const SWATCH_PRESETS = [
  { name: 'Blanco Plus', hex: '#f5f5f3' },
  { name: 'Gris Humo', hex: '#9ca3af' },
  { name: 'Haya / Paraíso', hex: '#deb887' },
  { name: 'Roble / Carvalho', hex: '#c99768' },
  { name: 'Nogal Habano', hex: '#6e472b' },
  { name: 'Negro Mate', hex: '#26282a' },
];

export const ScreenCortesFondo: React.FC<ScreenCortesFondoProps> = ({
  boards,
  selectedBoardId,
  onSelectBoard,
  onUpdateBoard,
  onAddBoardColor,
  cutPieces,
  onUpdatePieceQty,
  onUpdatePieceDetails,
  onDeletePiece,
  onTogglePieceRotation,
  onAddCutPiece,
  onResetCleanOrder,
  onConfirmSawCut,
  onShowToast,
}) => {
  const [kerfMm, setKerfMm] = useState<number>(3.2);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [cadZoom, setCadZoom] = useState<boolean>(false);
  const [showLabelsOnCad, setShowLabelsOnCad] = useState<boolean>(true);
  const [grainDirection, setGrainDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [selectedCadPiece, setSelectedCadPiece] = useState<string | null>(null);

  // Multi-board viewing page
  const [currentBoardPage, setCurrentBoardPage] = useState<number>(0);

  // Edit active board modal state
  const [showEditBoardModal, setShowEditBoardModal] = useState(false);
  const [editBoardName, setEditBoardName] = useState('');
  const [editBoardSpec, setEditBoardSpec] = useState('');
  const [editBoardW, setEditBoardW] = useState('2750');
  const [editBoardH, setEditBoardH] = useState('1830');
  const [editBoardCost, setEditBoardCost] = useState('38500');

  // Add new Fondo Color modal state
  const [showAddColorModal, setShowAddColorModal] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorSpec, setNewColorSpec] = useState('Fibroplus Faplac • 3mm 1ra Calidad');
  const [newColorCost, setNewColorCost] = useState('41500');
  const [newColorHex, setNewColorHex] = useState('#deb887');

  // Add / Edit Cut Piece modal state
  const [showCutModal, setShowCutModal] = useState(false);
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [cutName, setCutName] = useState('');
  const [cutSub, setCutSub] = useState('Fondo de Mueble • Ranura 3mm');
  const [cutW, setCutW] = useState('800');
  const [cutH, setCutH] = useState('500');
  const [cutQty, setCutQty] = useState('1');
  const [cutMountType, setCutMountType] = useState<'0L' | '1L' | '2L' | '4L'>('0L');
  const [cutAllowRotation, setCutAllowRotation] = useState<boolean>(true);

  const activeBoard = boards.find((b) => b.id === selectedBoardId) || boards[0];

  // 2D Guillotine Nesting calculation for Back Panels
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

  const boardAreaM2 = Number(
    ((activeBoard.widthMm * activeBoard.heightMm) / 1_000_000).toFixed(2)
  );
  const costPerM2 = Math.round(activeBoard.costArs / Math.max(0.1, boardAreaM2));

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
      : Math.round((efficiencyPct / 100) * (activeBoard.costArs * totalBoardsCount));

  const totalSegments = 7;
  const activeSegments =
    cutPieces.length === 0 || efficiencyPct <= 0
      ? 0
      : Math.max(
          1,
          Math.min(7, Math.round((efficiencyPct / 100) * totalSegments))
        );

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
      onShowToast('No hay cortes de fondo asignados en la placa para procesar.');
      return;
    }
    setShowConfirmCutModal(true);
  };

  const handleExecuteConfirmCut = () => {
    if (onConfirmSawCut) {
      onConfirmSawCut({
        boardType: 'fondo',
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
        `✅ Corte de Fondo en Sierra confirmado: ${totalBoardsCount} placa(s) descontada(s) e inventario actualizado`
      );
    }
    setShowConfirmCutModal(false);
  };


  const openEditBoard = () => {
    setEditBoardName(activeBoard.name);
    setEditBoardSpec(activeBoard.brandSpec);
    setEditBoardW(String(activeBoard.widthMm));
    setEditBoardH(String(activeBoard.heightMm));
    setEditBoardCost(String(activeBoard.costArs));
    setShowEditBoardModal(true);
  };

  const handleSaveBoardEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Math.max(500, parseInt(editBoardCost.replace(/\D/g, ''), 10) || 38500);
    const w = Math.max(500, parseInt(editBoardW, 10) || 2750);
    const h = Math.max(500, parseInt(editBoardH, 10) || 1830);
    onUpdateBoard(activeBoard.id, {
      name: editBoardName.trim() || activeBoard.name,
      brandSpec: editBoardSpec.trim() || activeBoard.brandSpec,
      widthMm: w,
      heightMm: h,
      costArs: cost,
    });
    setShowEditBoardModal(false);
    onShowToast(`Placa de fondo actualizada: ${formatARS(cost)} ARS`);
  };

  const handleCreateColor = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Math.max(500, parseInt(newColorCost.replace(/\D/g, ''), 10) || 41500);
    const newId = `fondo-${Date.now()}`;
    const created: MelaminaBoard = {
      id: newId,
      name: newColorName.trim() || 'Fondo Haya Natural',
      brandSpec: newColorSpec.trim() || 'Fibroplus Faplac • 3mm 1ra Calidad',
      widthMm: 2750,
      heightMm: 1830,
      costArs: cost,
      swatchColor: newColorHex,
      grainType: 'horizontal',
    };
    onAddBoardColor(created);
    onSelectBoard(newId);
    setNewColorName('');
    setShowAddColorModal(false);
    onShowToast(`Nuevo color agregado: ${created.name} (${formatARS(cost)})`);
  };

  const openNewCutModal = () => {
    setEditingPieceId(null);
    setCutName('');
    setCutSub('Fondo Trasero • Ranura 3mm');
    setCutW('800');
    setCutH('500');
    setCutQty('1');
    setCutMountType('0L');
    setCutAllowRotation(true);
    setShowCutModal(true);
  };

  const openEditCutModal = (p: CutPiece) => {
    setEditingPieceId(p.id);
    setCutName(p.name);
    setCutSub(p.subtitle);
    setCutW(String(p.widthMm));
    setCutH(String(p.heightMm));
    setCutQty(String(p.quantity));
    setCutMountType((p.edgesType as any) || '0L');
    setCutAllowRotation(p.allowRotation);
    setShowCutModal(true);
  };

  const handleSaveCut = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Math.max(50, Math.min(2750, parseInt(cutW, 10) || 800));
    const h = Math.max(50, Math.min(1830, parseInt(cutH, 10) || 500));
    const q = Math.max(1, Math.min(50, parseInt(cutQty, 10) || 1));
    const area = (w * h) / 1_000_000;
    const price = Math.round(area * costPerM2 * 1.1);

    if (editingPieceId) {
      onUpdatePieceDetails(editingPieceId, {
        name: cutName.trim() || 'Fondo Trasero',
        subtitle: cutSub.trim() || 'Ranura 3mm',
        widthMm: w,
        heightMm: h,
        quantity: q,
        unitPriceArs: price,
        edgesType: cutMountType,
        edgesLabel:
          cutMountType === '0L'
            ? 'Ranurado en Mueble'
            : `Fijación perimetral (${cutMountType})`,
        allowRotation: cutAllowRotation,
        mandatoryGrain: !cutAllowRotation,
      });
      onShowToast(`Corte de fondo actualizado (${w}×${h} mm • ${q} uds)`);
    } else {
      onAddCutPiece({
        name: cutName.trim() || 'Fondo Trasero Especial',
        subtitle: cutSub.trim() || 'Fondo de Mueble • Ranura 3mm',
        widthMm: w,
        heightMm: h,
        quantity: q,
        unitPriceArs: price,
        edgesType: cutMountType,
        edgesLabel:
          cutMountType === '0L'
            ? 'Ranurado en Mueble'
            : `Fijación perimetral (${cutMountType})`,
        allowRotation: cutAllowRotation,
        mandatoryGrain: !cutAllowRotation,
      });
      onShowToast(`Corte de fondo agregado (${w}×${h} mm • ${q} uds)`);
    }
    setShowCutModal(false);
  };

  const handleRunOptimizer = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      onShowToast(
        `Optimización de fondo 2D completada: ${totalPiecesCount} piezas, ${totalBoardsCount} ${
          totalBoardsCount === 1 ? 'placa' : 'placas'
        } • Eficiencia ${efficiencyPct}%`
      );
    }, 450);
  };

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
          <span>Reiniciar Todo en 0 (Fondo Limpio)</span>
        </button>

        <button
          onClick={openNewCutModal}
          className="col-span-4 h-10 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] active:scale-[0.99] text-[#280b00] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>+ Corte Fondo</span>
        </button>
      </div>

      {/* CARD 1: CONFIGURACIÓN DE PLACA DE FONDO */}
      <section className="atelier-card rounded-2xl p-4 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffb59b]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5]">
              CONFIGURACIÓN PLACA DE FONDO
            </span>
          </div>
          <span className="text-xs font-semibold text-[#ffb59b]">
            Fibroplus / MDF 3mm
          </span>
        </div>

        {/* Active Board Selector Strip */}
        <div className="relative mb-3.5">
          <div className="bg-[#222424] rounded-xl p-3 flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg shadow-inner shrink-0 border border-white/20"
                style={{ backgroundColor: activeBoard.swatchColor }}
              />
              <div>
                <h3 className="font-bold text-sm text-white">
                  {activeBoard.name}
                </h3>
                <p className="text-xs text-[#a1a1a1]">{activeBoard.brandSpec}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[#c8c6c5] shrink-0">
              <button
                onClick={openEditBoard}
                title="Editar nombre, medidas o precio de placa de fondo"
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedCadPiece(null);
                  setCurrentBoardPage(0);
                  onResetCleanOrder();
                }}
                title="Reiniciar todos los cortes a 0 absoluto"
                className="p-1.5 hover:bg-[#34241d] text-[#ffb59b] rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowBoardMenu((prev) => !prev)}
                title="Cambiar color de fondo o agregar nuevo"
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Color Dropdown */}
          {showBoardMenu && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1e2020] border border-white/10 rounded-xl p-2 shadow-2xl z-20 space-y-1">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1a1]">
                  Colores de Fondo en Taller
                </span>
                <button
                  onClick={() => {
                    setShowBoardMenu(false);
                    setShowAddColorModal(true);
                  }}
                  className="text-[10px] font-bold text-[#ffb59b] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Agregar Color</span>
                </button>
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

        {/* Board Specs: 2 Columns */}
        <div className="grid grid-cols-2 gap-2.5 mb-3.5">
          <div
            onClick={openEditBoard}
            className="atelier-subcard rounded-xl p-3.5 cursor-pointer hover:border-white/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5]">
                FORMATO FONDO
              </span>
              <Pencil className="w-3 h-3 text-[#a1a1a1]" />
            </div>
            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {activeBoard.widthMm} × {activeBoard.heightMm}
            </div>
            <div className="text-xs font-bold text-[#c8c6c5]">mm (3mm esp.)</div>
            <div className="text-[11px] text-[#c8c6c5] mt-1.5 tabular-nums">
              Superficie: {boardAreaM2} m²
            </div>
          </div>

          <div
            onClick={openEditBoard}
            className="atelier-subcard rounded-xl p-3.5 cursor-pointer hover:border-white/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5] leading-tight">
                PRECIO PLACA
                <br />
                DE FONDO
              </span>
              <div className="flex items-center gap-1">
                <span className="bg-[#2c2e2e] text-[#e3e2e2] text-[10px] font-bold px-1.5 py-0.5 rounded">
                  ARS
                </span>
                <Pencil className="w-3.5 h-3.5 text-[#ffb59b]" />
              </div>
            </div>

            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {formatARS(activeBoard.costArs)}
            </div>

            <div className="inline-block bg-[#2d211d] text-[#ffb59b] text-[11px] font-bold px-2 py-0.5 rounded mt-1.5 tabular-nums">
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
              ? 'Calculando Guillotina 2D Fondo...'
              : 'Optimizar Cortes de Fondo'}
          </span>
        </button>
      </section>

      {/* CARD 2: RENDIMIENTO DE HOJA DE FONDO */}
      <section className="atelier-card rounded-2xl p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5]">
              RENDIMIENTO PLACA DE FONDO
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
              title="Reiniciar a 0 absoluto"
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
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e3e2e2]">
              <span className="w-2 h-2 rounded-full bg-[#e87a50]" />
              <span>Área Fondo Útil</span>
            </div>
            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {usedAreaM2} m²
            </div>
            <div className="text-[11px] text-[#c8c6c5] mt-0.5 tabular-nums">
              {efficiencyPct}% de placas
            </div>
          </div>

          <div className="atelier-subcard rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e3e2e2]">
              <span className="w-2 h-2 rounded-full bg-[#717171]" />
              <span>Sobrante Fondo</span>
            </div>
            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {wasteAreaM2} m²
            </div>
            <div className="text-[11px] text-[#c8c6c5] mt-0.5 tabular-nums">
              {restPct}% libre
            </div>
          </div>

          <div className="atelier-subcard rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e3e2e2]">
              <Banknote className="w-3.5 h-3.5 text-[#ffb59b]" />
              <span>Costo Placas</span>
            </div>
            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {formatARS(cutValueArs)}
            </div>
            <div className="text-[11px] text-[#c8c6c5] mt-0.5">
              Fondo calculado
            </div>
          </div>

          <div className="atelier-subcard rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e3e2e2]">
              <ClipboardCheck className="w-3.5 h-3.5 text-[#ffb59b]" />
              <span>Piezas / Placas</span>
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

      {/* CARD 3: SIMULADOR CAD DE FONDO */}
      <section className="atelier-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5]">
              PLANO DE SIERRA FONDO
            </div>
            <h2 className="text-lg font-bold font-display text-white">
              Simulador CAD ({activeBoard.name.replace('Fondo ', '')})
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
                onShowToast(`Plano de fondo centrado en Placa #${activeBoardIndex + 1}`);
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
            className={`relative w-full aspect-[2750/1830] bg-[#353737] rounded overflow-hidden transition-transform duration-300 ${
              cadZoom ? 'scale-110 origin-top-left' : 'scale-100'
            }`}
          >
            {/* EMPTY BOARD STATE */}
            {cutPieces.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#ffb59b] mb-2">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-white">
                  Simulador de Fondo en 0 ({activeBoard.widthMm} × {activeBoard.heightMm} mm)
                </span>
                <span className="text-xs text-[#c8c6c5] mt-1">
                  0% Eficiencia • Sin ningún corte de fondo cargado
                </span>
              </div>
            )}

            {/* REAL 2D PHYSICAL NESTING FOR BACK-PANELS */}
            {cutPieces.length > 0 && (
              <>
                {/* Render every single individual unit on this board */}
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
                          ? 'bg-[#ffdbcf] border-2 border-[#e87a50] text-[#380d00]'
                          : 'bg-[#f5f5f3] border border-[#343535] text-[#121414] hover:bg-white'
                      }`}
                    >
                      {showLabelsOnCad && (
                        <>
                          <span className="text-[7.5px] sm:text-[9px] font-extrabold leading-tight truncate px-0.5 max-w-full">
                            #{piece.displayLabel} {piece.name}
                          </span>
                          <span className="text-[6.5px] sm:text-[7.5px] font-bold opacity-80 tabular-nums">
                            {piece.widthMm} × {piece.heightMm} mm{piece.rotated ? ' ↻' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Render remaining scrap rectangles (RETAZO FONDO) */}
                {activeNestingBoard.freeRectangles.map((fr, frIdx) => {
                  if (fr.widthMm < 120 || fr.heightMm < 90) return null;
                  return (
                    <div
                      key={frIdx}
                      onClick={() =>
                        setSelectedCadPiece(
                          `Retazo Fondo • ${fr.widthMm} × ${fr.heightMm} mm (${fr.areaM2} m² libre)`
                        )
                      }
                      style={{
                        left: `${(fr.xMm / activeBoard.widthMm) * 100}%`,
                        top: `${(fr.yMm / activeBoard.heightMm) * 100}%`,
                        width: `${(fr.widthMm / activeBoard.widthMm) * 100}%`,
                        height: `${(fr.heightMm / activeBoard.heightMm) * 100}%`,
                      }}
                      className="absolute bg-[#272929]/90 border border-dashed border-[#717171] rounded-[2.5px] flex flex-col items-center justify-center p-1 text-center cursor-pointer hover:bg-[#303333] transition-colors"
                    >
                      <span className="text-[7.5px] font-extrabold text-[#1b1c1c] leading-tight">
                        RETAZO FONDO
                      </span>
                      <span className="text-[6.5px] text-[#ffb59b] font-semibold tabular-nums mt-0.5">
                        {fr.areaM2} m² libre ({activeBoard.name.replace('Fondo ', '')})
                      </span>
                    </div>
                  );
                })}
              </>
            )}

            {/* Floating Scale Badge */}
            <div className="absolute bottom-2.5 left-2.5 bg-[#181a1a]/95 border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-md">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/30"
                style={{ backgroundColor: activeBoard.swatchColor }}
              />
              <span className="text-[11px] font-bold text-white tabular-nums">
                Placa #{activeBoardIndex + 1} de {totalBoardsCount} •{' '}
                {cadZoom ? '150%' : '100%'}
              </span>
            </div>
          </div>

          {selectedCadPiece && (
            <div className="mt-2 px-3 py-1.5 rounded-lg bg-[#2d211d] border border-[#e87a50]/40 flex items-center justify-between text-xs font-semibold text-[#ffdbcf]">
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
            <Tag className="w-3.5 h-3.5 text-[#ffb59b]" />
            <span>{showLabelsOnCad ? 'Ocultar Cotas' : 'Ver Etiquetas'}</span>
          </button>

          <button
            onClick={() =>
              setGrainDirection((prev) =>
                prev === 'horizontal' ? 'vertical' : 'horizontal'
              )
            }
            className="text-xs font-bold text-[#e3e2e2] hover:text-[#ffb59b] transition-colors px-2 py-1 cursor-pointer"
          >
            {grainDirection === 'horizontal'
              ? 'Sentido Horizontal →'
              : 'Sentido Vertical ↓'}
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
              {totalBoardsCount} {totalBoardsCount === 1 ? 'placa' : 'placas'} • {totalPiecesCount} piezas fondo
            </span>
          </button>
        </div>
      </section>

      {/* CARD 4: LISTA DE CORTES DE FONDO ASIGNADOS */}
      <section className="atelier-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5]">
              LISTADO DE PIEZAS DE FONDO
            </div>
            <h2 className="text-lg font-bold font-display text-white">
              Cortes de Fondo ({totalPiecesCount})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedCadPiece(null);
                setCurrentBoardPage(0);
                onResetCleanOrder();
              }}
              title="Reiniciar todos los cortes de fondo a 0 absoluto"
              className="h-8 px-2.5 rounded-lg bg-[#271e1a] hover:bg-[#34241d] border border-[#e87a50]/70 text-[#ffb59b] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3 h-3 text-[#ffb59b]" />
              <span>Reiniciar</span>
            </button>

            <button
              onClick={openNewCutModal}
              className="h-8 px-3 rounded-lg bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Corte</span>
            </button>
          </div>
        </div>

        {/* Empty state when 0 cuts assigned */}
        {cutPieces.length === 0 ? (
          <div className="bg-[#181a1a] border border-white/5 rounded-xl p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#271e1a] border border-[#e87a50]/40 flex items-center justify-center text-[#ffb59b]">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Fondo Limpio y en 0 Absoluto
              </h3>
              <p className="text-xs text-[#c8c6c5] mt-1">
                No hay piezas de fondo asignadas. Agrega los fondos de tus módulos para simular el corte físico.
              </p>
            </div>
            <div className="flex items-center justify-center pt-1">
              <button
                onClick={openNewCutModal}
                className="px-4 py-2.5 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar Primer Fondo</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cutPieces.map((piece) => {
              const pieceArea = (piece.widthMm * piece.heightMm) / 1_000_000;
              return (
                <div
                  key={piece.id}
                  className="bg-[#181a1a] border border-white/5 rounded-xl p-3.5 space-y-2.5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#ffb59b]">
                          #{piece.numberLabel}
                        </span>
                        <h3 className="text-xs font-bold text-white truncate">
                          {piece.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-[#c8c6c5] mt-0.5 truncate">
                        {piece.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditCutModal(piece)}
                        className="p-1.5 text-[#c8c6c5] hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeletePiece(piece.id)}
                        className="p-1.5 text-[#c8c6c5] hover:text-[#ffb59b] rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#202222] rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                      <span className="text-[#c8c6c5]">Medidas:</span>
                      <span className="font-bold text-white tabular-nums">
                        {piece.widthMm} × {piece.heightMm} mm
                      </span>
                    </div>

                    {(() => {
                      const unitFondoPrice =
                        piece.unitPriceArs && piece.unitPriceArs > 0
                          ? piece.unitPriceArs
                          : Math.round(pieceArea * costPerM2 * 1.15);
                      const totalFondoPrice = unitFondoPrice * piece.quantity;
                      return (
                        <div className="bg-[#202222] rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[#c8c6c5]">
                              {piece.quantity > 1
                                ? `Valor (×${piece.quantity}):`
                                : 'Valor:'}
                            </span>
                            <span className="font-bold text-[#ffb59b] tabular-nums">
                              {formatARS(totalFondoPrice)}
                            </span>
                          </div>
                          {piece.quantity > 1 && (
                            <div className="text-[10px] text-[#9e9c9b] text-right tabular-nums leading-tight">
                              {formatARS(unitFondoPrice)} c/u
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => onTogglePieceRotation(piece.id)}
                      className="flex items-center gap-1.5 text-xs text-[#c8c6c5] hover:text-white cursor-pointer group"
                    >
                      <RotateCw
                        className={`w-3.5 h-3.5 ${
                          piece.allowRotation
                            ? 'text-[#ffb59b]'
                            : 'text-[#717171]'
                        }`}
                      />
                      {piece.allowRotation ? (
                        <span className="text-[#ffb59b] font-semibold">
                          Rotación 90° habilitada
                        </span>
                      ) : (
                        <>
                          <Lock className="w-3 h-3 text-[#717171]" />
                          <span className="text-[#c8c6c5] group-hover:text-white transition-colors">
                            Permite rotación 90°
                          </span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-3 bg-[#202222] border border-white/10 rounded-full px-2.5 py-1">
                      <button
                        onClick={() => onUpdatePieceQty(piece.id, -1)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white min-w-[16px] text-center tabular-nums">
                        {piece.quantity}
                      </span>
                      <button
                        onClick={() => onUpdatePieceQty(piece.id, 1)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => {
              setSelectedCadPiece(null);
              setCurrentBoardPage(0);
              onResetCleanOrder();
            }}
            className="h-12 rounded-xl bg-[#271e1a] hover:bg-[#34241d] border border-[#e87a50]/60 text-[#ffb59b] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <RotateCcw className="w-4 h-4 text-[#e87a50]" />
            <span>Reiniciar Fondo</span>
          </button>

          <button
            onClick={openNewCutModal}
            className="h-12 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>+ Agregar Corte Fondo</span>
          </button>
        </div>
      </section>

      {/* MODAL 1: EDITAR PLACA DE FONDO & PRECIO */}
      {showEditBoardModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                Editar Placa de Fondo
              </h3>
              <button
                onClick={() => setShowEditBoardModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBoardEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Nombre / Color de Placa de Fondo
                </label>
                <input
                  type="text"
                  required
                  value={editBoardName}
                  onChange={(e) => setEditBoardName(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Especificación / Espesor
                </label>
                <input
                  type="text"
                  value={editBoardSpec}
                  onChange={(e) => setEditBoardSpec(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Largo (mm)
                  </label>
                  <input
                    type="number"
                    value={editBoardW}
                    onChange={(e) => setEditBoardW(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Ancho (mm)
                  </label>
                  <input
                    type="number"
                    value={editBoardH}
                    onChange={(e) => setEditBoardH(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#ffb59b] mb-1">
                  Precio de la Placa de Fondo (ARS)
                </label>
                <input
                  type="number"
                  required
                  value={editBoardCost}
                  onChange={(e) => setEditBoardCost(e.target.value)}
                  className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-3.5 py-2.5 text-sm font-bold text-white tabular-nums"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditBoardModal(false)}
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

      {/* MODAL 2: AGREGAR NUEVO COLOR DE FONDO */}
      {showAddColorModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#ffb59b]" />
                <h3 className="text-base font-bold font-display text-white">
                  Nuevo Color de Fondo
                </h3>
              </div>
              <button
                onClick={() => setShowAddColorModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateColor} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Nombre del Color
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Fondo Haya Natural"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1.5">
                  Muestra / Textura
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {SWATCH_PRESETS.map((sw) => (
                    <button
                      type="button"
                      key={sw.name}
                      onClick={() => setNewColorHex(sw.hex)}
                      title={sw.name}
                      className={`w-9 h-9 rounded-xl border-2 transition-transform cursor-pointer ${
                        newColorHex === sw.hex
                          ? 'border-[#e87a50] scale-110'
                          : 'border-white/10'
                      }`}
                      style={{ backgroundColor: sw.hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Especificación de Fábrica
                </label>
                <input
                  type="text"
                  value={newColorSpec}
                  onChange={(e) => setNewColorSpec(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#ffb59b] mb-1">
                  Precio de la Placa (ARS)
                </label>
                <input
                  type="number"
                  required
                  value={newColorCost}
                  onChange={(e) => setNewColorCost(e.target.value)}
                  className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-3.5 py-2 text-xs font-bold text-white tabular-nums"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddColorModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                >
                  Crear y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AGREGAR O EDITAR CORTE DE FONDO */}
      {showCutModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                {editingPieceId ? 'Editar Corte de Fondo' : 'Nuevo Corte de Fondo'}
              </h3>
              <button
                onClick={() => setShowCutModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCut} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Nombre de la Pieza
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Fondo Trasero Cómoda 4C"
                  value={cutName}
                  onChange={(e) => setCutName(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Módulo / Especificación
                </label>
                <input
                  type="text"
                  placeholder="Ej. Fondo de Mueble • Ranura 3mm"
                  value={cutSub}
                  onChange={(e) => setCutSub(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Largo (mm)
                  </label>
                  <input
                    type="number"
                    required
                    value={cutW}
                    onChange={(e) => setCutW(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Ancho (mm)
                  </label>
                  <input
                    type="number"
                    required
                    value={cutH}
                    onChange={(e) => setCutH(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cutQty}
                    onChange={(e) => setCutQty(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rotCheckFondo"
                  checked={cutAllowRotation}
                  onChange={(e) => setCutAllowRotation(e.target.checked)}
                  className="rounded text-[#e87a50] cursor-pointer"
                />
                <label
                  htmlFor="rotCheckFondo"
                  className="text-xs text-[#c8c6c5] cursor-pointer"
                >
                  Permite rotar 90° en el optimizador de fondo
                </label>
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
                  {editingPieceId ? 'Guardar Cambios' : 'Asignar a Fondo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR CORTE EN SIERRA & RECUPERACIÓN DE RETAZO ÚTIL (FONDOS) */}
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
                    Confirmar Corte de Fondos en Sierra
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
                    <span>1. Descontar Placa de Fondo Base</span>
                  </span>
                  <span className="text-[#e87a50] tabular-nums">
                    -{totalBoardsCount} {totalBoardsCount === 1 ? 'placa' : 'placas'}
                  </span>
                </div>
                <p className="text-[11px] text-[#c8c6c5]">
                  Se restará de <span className="text-white font-semibold">Insumos / Placas</span>: {activeBoard.name} ({activeBoard.widthMm} × {activeBoard.heightMm} mm).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#1e2020] border border-white/5 space-y-1">
                <div className="flex items-center justify-between font-bold text-white">
                  <span className="flex items-center gap-1.5 text-[#a5d6a7]">
                    <span>2. Acumular Fondos Cortados</span>
                  </span>
                  <span className="text-green-400 tabular-nums">
                    +{totalPiecesCount} piezas
                  </span>
                </div>
                <p className="text-[11px] text-[#c8c6c5]">
                  Las {cutPieces.length} medidas cortadas de fondo se sumarán a la categoría <span className="text-white font-semibold">Pieza Madera</span> (stock acumulativo).
                </p>
              </div>

              {/* Scrap/Offcut Recovery Prompt */}
              {largestScrap && largestScrap.areaM2 >= 0.30 ? (
                <div className="p-3 rounded-xl bg-[#2a221b] border border-[#e87a50]/40 space-y-2">
                  <div className="flex items-center gap-2 text-[#ffb59b] font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#e87a50]" />
                    <span>Retazo de Fondo Útil Detectado ({largestScrap.areaM2} m² libre)</span>
                  </div>
                  <p className="text-[11px] text-[#e3e2e2]">
                    El retazo sobrante de fondo de <strong className="text-white">{largestScrap.widthMm} × {largestScrap.heightMm} mm</strong> supera los 0.30 m².
                  </p>
                  <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveScrapOption}
                      onChange={(e) => setSaveScrapOption(e.target.checked)}
                      className="rounded text-[#e87a50] focus:ring-0 cursor-pointer w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-white">
                      ¿Guardar retazo fondo en Inventario (Insumos / Placas)?
                    </span>
                  </label>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#1c1e1e] border border-white/5 text-[11px] text-[#a1a1a1]">
                  Desperdicio fondo: {wasteAreaM2} m² (menor a 0.30 m², considerado scrap no recuperable).
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
    </div>
  );
};
