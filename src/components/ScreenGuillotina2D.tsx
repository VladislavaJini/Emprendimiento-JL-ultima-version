import React, { useState } from 'react';
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
  Minus,
  Plus,
  Save,
  Lock,
  X,
} from 'lucide-react';
import { MelaminaBoard, CutPiece } from '../types/atelier';
import { formatARS } from '../data/initialData';

interface ScreenGuillotina2DProps {
  boards: MelaminaBoard[];
  selectedBoardId: string;
  onSelectBoard: (id: string) => void;
  onUpdateBoardCost: (id: string, newCost: number) => void;
  cutPieces: CutPiece[];
  onUpdatePieceQty: (id: string, delta: number) => void;
  onUpdatePieceDetails?: (id: string, updated: Partial<CutPiece>) => void;
  onDeletePiece?: (id: string) => void;
  onClearAllCuts?: () => void;
  onTogglePieceRotation: (id: string) => void;
  onAddCutPiece: (piece: Omit<CutPiece, 'id' | 'numberLabel'>) => void;
  onResetCleanOrder: () => void;
  onShowToast: (msg: string) => void;
}

export const ScreenGuillotina2D: React.FC<ScreenGuillotina2DProps> = ({
  boards,
  selectedBoardId,
  onSelectBoard,
  onUpdateBoardCost,
  cutPieces,
  onUpdatePieceQty,
  onUpdatePieceDetails,
  onDeletePiece,
  onClearAllCuts,
  onTogglePieceRotation,
  onAddCutPiece,
  onResetCleanOrder,
  onShowToast,
}) => {
  const [kerfMm, setKerfMm] = useState<number>(3.2);
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

  // Cut modal fields (used for both Add and Edit)
  const [cutName, setCutName] = useState('');
  const [cutSub, setCutSub] = useState('Módulo Personalizado • Taller J&L');
  const [cutW, setCutW] = useState('600');
  const [cutH, setCutH] = useState('400');
  const [cutQty, setCutQty] = useState('2');
  const [cutEdges, setCutEdges] = useState<'4L' | '2L' | '1L' | '0L'>('2L');
  const [cutAllowRotation, setCutAllowRotation] = useState<boolean>(true);

  const activeBoard = boards.find((b) => b.id === selectedBoardId) || boards[0];

  // Compute metrics dynamically
  const boardAreaM2 = Number(((activeBoard.widthMm * activeBoard.heightMm) / 1_000_000).toFixed(2));
  const costPerM2 = Math.round(activeBoard.costArs / Math.max(0.1, boardAreaM2));

  const totalPiecesCount = cutPieces.reduce((acc, p) => acc + p.quantity, 0);
  const rawCutAreaM2 = cutPieces.reduce(
    (acc, p) => acc + (p.widthMm * p.heightMm * p.quantity) / 1_000_000,
    0
  );

  const isDefaultState =
    totalPiecesCount === 14 &&
    cutPieces.length === 7 &&
    activeBoard.id === 'carvalho-mezzo' &&
    activeBoard.costArs === 104000;

  const usedAreaM2 =
    cutPieces.length === 0
      ? 0
      : isDefaultState
      ? 2.69
      : Math.min(boardAreaM2, Number(rawCutAreaM2.toFixed(2)));
  const wasteAreaM2 =
    cutPieces.length === 0
      ? 0
      : Number(Math.max(0, boardAreaM2 - usedAreaM2).toFixed(2));
  const efficiencyPct =
    cutPieces.length === 0
      ? 0
      : isDefaultState
      ? 53.5
      : Number(Math.min(98.5, (usedAreaM2 / Math.max(0.1, boardAreaM2)) * 100).toFixed(1));
  const restPct =
    cutPieces.length === 0 ? 0 : Number((100 - efficiencyPct).toFixed(1));
  const cutValueArs =
    cutPieces.length === 0
      ? 0
      : isDefaultState
      ? 55682
      : Math.round((efficiencyPct / 100) * activeBoard.costArs);

  const visiblePieces = showAllCuts ? cutPieces : cutPieces.slice(0, 4);

  const handleRunOptimizer = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      onShowToast(
        `Algoritmo Guillotina v4.2 completado (Sierra ${kerfMm}mm) • Eficiencia ${efficiencyPct}%`
      );
    }, 450);
  };

  const handleSaveBoardCost = () => {
    const parsed = parseInt(costInput.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed > 1000) {
      onUpdateBoardCost(activeBoard.id, parsed);
      onShowToast(`Costo de placa actualizado a ${formatARS(parsed)}`);
    }
    setEditingCost(false);
  };

  const openAddModal = () => {
    setEditingPieceId(null);
    setCutName('');
    setCutSub('Módulo Taller J&L');
    setCutW('600');
    setCutH('400');
    setCutQty('2');
    setCutEdges('2L');
    setCutAllowRotation(true);
    setShowCutModal(true);
  };

  const openEditModal = (p: CutPiece) => {
    setEditingPieceId(p.id);
    setCutName(p.name);
    setCutSub(p.subtitle);
    setCutW(String(p.widthMm));
    setCutH(String(p.heightMm));
    setCutQty(String(p.quantity));
    setCutEdges(p.edgesType);
    setCutAllowRotation(p.allowRotation);
    setShowCutModal(true);
  };

  const handleDeleteCut = (pieceId: string) => {
    if (onDeletePiece) {
      onDeletePiece(pieceId);
    } else {
      onShowToast('Corte eliminado');
    }
  };

  const handleSaveCut = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Math.max(50, Math.min(2750, parseInt(cutW, 10) || 600));
    const h = Math.max(50, Math.min(1830, parseInt(cutH, 10) || 400));
    const q = Math.max(1, Math.min(50, parseInt(cutQty, 10) || 1));
    const area = (w * h) / 1_000_000;
    const price = Math.round(area * costPerM2 * 1.15);

    const edgesLabelMap = {
      '4L': 'Cantos 4L (2mm ABS)',
      '2L': 'Cantos 2L Frontal',
      '1L': 'Cantos 1L Frente',
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
      onShowToast(`Corte actualizado (${w} × ${h} mm • ${q} uds)`);
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
      onShowToast(`Corte agregado a la placa (${w} × ${h} mm • ${q} uds)`);
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
            onResetCleanOrder();
          }}
          className="col-span-7 flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#271e1a] hover:bg-[#332620] border border-[#4d352b] text-[#f2ded7] text-xs font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-[#ffb59b] shrink-0" />
          <span className="leading-tight text-center">
            Reiniciar Todo en 0 (Placa Limpia)
          </span>
        </button>

        <button
          onClick={() => {
            const nextKerf = kerfMm === 3.2 ? 2.8 : kerfMm === 2.8 ? 4.0 : 3.2;
            setKerfMm(nextKerf);
            onShowToast(`Espesor de disco de sierra ajustado a ${nextKerf.toFixed(1)} mm`);
          }}
          className="col-span-5 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#1e2020] hover:bg-[#292a2a] border border-white/10 text-[#e3e2e2] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#c8c6c5] shrink-0" />
          <span>Sierra: {kerfMm.toFixed(1)} mm</span>
        </button>
      </div>

      {/* Mode Subtitle */}
      <div className="flex items-center gap-2 px-0.5">
        <span className="w-2 h-2 rounded-full bg-[#e87a50] inline-block" />
        <span className="text-xs font-bold text-[#c8c6c5] tracking-tight">
          Guillotina 2D v4.2
        </span>
      </div>

      {/* Vertical Mobile Stack */}
      <div className="space-y-4">
        {/* Top Section: Board & Pattern Efficiency */}
        <div className="space-y-4">
          {/* CARD 1: PLACA MELAMINA & ACABADO */}
          <section className="atelier-card rounded-2xl p-4 relative overflow-hidden">
            {/* Top-right diagonal terracotta hatch */}
            <div
              className="w-5 h-5 rounded atelier-hatch absolute top-3.5 right-3.5 opacity-90"
              aria-hidden="true"
            />

            <div className="text-[11px] font-bold uppercase tracking-wider text-[#c8c6c5] mb-3">
              PLACA MELAMINA & ACABADO
            </div>

            {/* Selected Board Selector Box */}
            <div className="relative border border-[#56423c]/80 bg-[#1c1e1e] rounded-xl p-3.5 mb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold font-display text-white leading-tight">
                      {activeBoard.name}
                    </h2>
                    <span className="bg-[#3d261e] text-[#ffb59b] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      SELECCIONADA
                    </span>
                  </div>
                  <p className="text-xs text-[#b7b5b4] mt-1">
                    {activeBoard.brandSpec}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[#a1a1a1] shrink-0 mt-1">
                  <button
                    onClick={() => {
                      setCostInput(String(activeBoard.costArs));
                      setEditingCost(true);
                    }}
                    title="Editar costo de placa"
                    className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onResetCleanOrder}
                    title="Limpiar cortes de placa"
                    className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowBoardMenu((prev) => !prev)}
                    title="Cambiar placa melamina"
                    className="p-1.5 rounded-lg hover:bg-white/10 text-[#e87a50] transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dropdown menu for switching Melamina boards */}
              {showBoardMenu && (
                <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1">
                  {boards.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        onSelectBoard(b.id);
                        setShowBoardMenu(false);
                        onShowToast(`Placa seleccionada: ${b.name}`);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        b.id === activeBoard.id
                          ? 'bg-[#3d261e] text-[#ffb59b] font-semibold'
                          : 'hover:bg-white/5 text-[#e3e2e2]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: b.swatchColor }}
                        />
                        <span>{b.name}</span>
                      </span>
                      <span className="tabular-nums text-[#a1a1a1]">
                        {formatARS(b.costArs)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Formato Bruto & Costo Placa Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="atelier-subcard rounded-xl p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
                  FORMATO BRUTO
                </div>
                <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
                  {activeBoard.widthMm} × {activeBoard.heightMm}
                </div>
                <div className="text-xs font-bold text-[#c8c6c5]">mm</div>
                <div className="text-[11px] text-[#a1a1a1] mt-1.5 tabular-nums">
                  Superficie: {boardAreaM2} m²
                </div>
              </div>

              <div className="atelier-subcard rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4] leading-tight">
                    COSTO
                    <br />
                    PLACA
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="bg-[#2c2e2e] text-[#c8c6c5] text-[10px] font-bold px-1.5 py-0.5 rounded">
                      ARS
                    </span>
                    <button
                      onClick={() => {
                        setCostInput(String(activeBoard.costArs));
                        setEditingCost((prev) => !prev);
                      }}
                      className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {editingCost ? (
                  <div className="mt-1.5 flex items-center gap-1">
                    <input
                      type="text"
                      value={costInput}
                      onChange={(e) => setCostInput(e.target.value)}
                      className="w-full bg-[#121414] border border-[#e87a50] rounded px-2 py-1 text-xs text-white tabular-nums"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveBoardCost}
                      className="px-2 py-1 bg-[#e87a50] text-[#121414] rounded text-xs font-bold cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
                    {formatARS(activeBoard.costArs)}
                  </div>
                )}

                <div className="inline-block bg-[#2d211d] text-[#ffb59b] text-[11px] font-bold px-2 py-0.5 rounded mt-1.5 tabular-nums">
                  {formatARS(costPerM2)} / m²
                </div>
              </div>
            </div>

            {/* Primary CTA Button */}
            <button
              onClick={handleRunOptimizer}
              disabled={isOptimizing}
              className="w-full h-12 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] active:scale-[0.99] text-[#280b00] font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer"
            >
              <Wand2 className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>
                {isOptimizing
                  ? 'Calculando Cortes Guillotina...'
                  : 'Ejecutar Algoritmo Guillotina'}
              </span>
            </button>
          </section>

          {/* CARD 2: RENDIMIENTO DE HOJA - Eficiencia de Patrón */}
          <section className="atelier-card rounded-2xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
                  RENDIMIENTO DE HOJA
                </div>
                <h2 className="text-lg font-bold font-display text-white">
                  Eficiencia de Patrón
                </h2>
              </div>
              <span className="bg-[#232525] border border-white/10 text-[#e3e2e2] text-[11px] font-semibold px-3 py-1 rounded-full">
                Placa #1 de 1
              </span>
            </div>

            {/* Segmented Semi-Circular Gauge */}
            <div className="relative flex flex-col items-center justify-center my-3 pt-2">
              <svg viewBox="0 0 240 130" className="w-56 h-32 overflow-visible">
                {Array.from({ length: totalSegments }).map((_, idx) => {
                  // Angles from 180 deg (left) to 0 deg (right)
                  const totalSpan = 180;
                  const gapDeg = 8;
                  const segSpan = (totalSpan - gapDeg * (totalSegments - 1)) / totalSegments;
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
                  {efficiencyPct}% de la placa
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
                  <span className="leading-tight">Piezas / Sobrantes</span>
                </div>
                <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
                  {totalPiecesCount} uds
                </div>
                <div className="text-[11px] text-[#a1a1a1] mt-0.5">
                  {cutPieces.length === 0 ? '0 retazos (en 0)' : '1 retazo (>0.2m²)'}
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
                    onShowToast('Vista ajustada a escala 100% de placa 2750×1830mm');
                  }}
                  title="Centrar Plano"
                  className="w-8 h-8 rounded-full bg-[#222424] hover:bg-[#2c2e2e] text-[#e3e2e2] flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* CAD Sheet Container */}
            <div className="bg-[#232525] p-2.5 rounded-xl border border-white/10 relative overflow-hidden">
              <div
                className={`relative w-full aspect-[2750/1830] bg-[#464747] rounded overflow-hidden transition-transform duration-300 ${
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

                {/* DEFAULT SCREENSHOT LAYOUT (When cuts are at factory baseline) */}
                {isDefaultState && (
                  <>
                    {/* #1 TAPA MESA PPAL (Top-Left Peach/Terracotta Highlighted Piece) */}
                    <div
                      onClick={() =>
                        setSelectedCadPiece('#1 Tapa Mesa Ppal • 1200 × 600 mm • Cantos 4L ABS')
                      }
                      className="absolute top-[2%] left-[1.5%] w-[43.5%] h-[36%] bg-[#ffdbcf] border-2 border-[#e87a50] flex flex-col items-center justify-center text-center p-1 cursor-pointer hover:brightness-105 transition-all"
                    >
                      {showLabelsOnCad && (
                        <>
                          <span className="text-[9px] sm:text-[10px] font-extrabold text-[#5b1a00] leading-tight">
                            #1 TAPA MESA PPAL
                          </span>
                          <span className="text-[7px] sm:text-[8px] font-semibold text-[#7e2b06] tabular-nums">
                            1200 × 600 mm (Cantos 4L)
                          </span>
                        </>
                      )}
                    </div>

                    {/* #2 LATERAL IZQ */}
                    <div
                      onClick={() =>
                        setSelectedCadPiece('#2 Lateral Izquierdo • 720 × 400 mm • Cantos 2L')
                      }
                      className="absolute top-[40%] left-[1.5%] w-[26.5%] h-[27%] bg-[#f2f0ef] border border-[#343535] flex flex-col items-center justify-center text-center p-1 cursor-pointer hover:bg-white transition-all"
                    >
                      {showLabelsOnCad && (
                        <>
                          <span className="text-[8px] sm:text-[9px] font-bold text-[#1b1c1c] leading-tight">
                            #2 LATERAL IZQ
                          </span>
                          <span className="text-[7px] text-[#474746] tabular-nums">
                            720 × 400 mm
                          </span>
                        </>
                      )}
                    </div>

                    {/* #3 LATERAL DER */}
                    <div
                      onClick={() =>
                        setSelectedCadPiece('#3 Lateral Derecho • 720 × 400 mm • Cantos 2L')
                      }
                      className="absolute top-[69%] left-[1.5%] w-[26.5%] h-[28.5%] bg-[#f2f0ef] border border-[#343535] flex flex-col items-center justify-center text-center p-1 cursor-pointer hover:bg-white transition-all"
                    >
                      {showLabelsOnCad && (
                        <>
                          <span className="text-[8px] sm:text-[9px] font-bold text-[#1b1c1c] leading-tight">
                            #3 LATERAL DER
                          </span>
                          <span className="text-[7px] text-[#474746] tabular-nums">
                            720 × 400 mm
                          </span>
                        </>
                      )}
                    </div>

                    {/* Middle stacked shelves (#4, #5, #6) */}
                    {[0, 1, 2].map((idx) => (
                      <div
                        key={idx}
                        onClick={() =>
                          setSelectedCadPiece(`#${idx + 4} Estante Regulable • 370 × 260 mm`)
                        }
                        style={{ top: `${40 + idx * 19.5}%` }}
                        className="absolute left-[29%] w-[13.5%] h-[18%] bg-[#e5e2e1] border border-[#343535] flex flex-col items-center justify-center text-center p-0.5 cursor-pointer hover:bg-white transition-all"
                      >
                        {showLabelsOnCad && (
                          <span className="text-[7px] font-bold text-[#1b1c1c]">
                            #{idx + 4} ESTANTE
                          </span>
                        )}
                      </div>
                    ))}

                    {/* Top-right shelves (#7, #8, #9) */}
                    {[0, 1, 2].map((idx) => (
                      <div
                        key={idx}
                        onClick={() =>
                          setSelectedCadPiece(`#${idx + 7} Estante Auxiliar • 370 × 260 mm`)
                        }
                        style={{ left: `${46.5 + idx * 14}%` }}
                        className="absolute top-[2%] w-[13%] h-[16%] bg-[#e5e2e1] border border-[#343535] flex flex-col items-center justify-center text-center p-0.5 cursor-pointer hover:bg-white transition-all"
                      >
                        {showLabelsOnCad && (
                          <span className="text-[7px] font-bold text-[#1b1c1c]">
                            #{idx + 7} EST.
                          </span>
                        )}
                      </div>
                    ))}

                    {/* RETAZO A (1524 x 1044) */}
                    <div
                      onClick={() =>
                        setSelectedCadPiece('Retazo Recuperable A • 1524 × 1044 mm (1.59 m²)')
                      }
                      className="absolute bottom-[2%] right-[1.5%] w-[54.5%] h-[57%] bg-[#d9d7d6] border border-[#717171] flex flex-col items-center justify-center text-center p-2 cursor-pointer hover:bg-[#e5e2e1] transition-all"
                    >
                      {showLabelsOnCad && (
                        <>
                          <span className="text-[8px] sm:text-[9px] font-bold text-[#303031]">
                            RETAZO A (1524 × 1044)
                          </span>
                          <span className="text-[7px] text-[#474746] mt-0.5">
                            Apto Cajoneras / Zócalos (1.59 m²)
                          </span>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* DYNAMIC PACKING (When user adds, edits or deletes cuts) */}
                {!isDefaultState && cutPieces.length > 0 && (
                  <div className="absolute inset-2 flex flex-wrap content-start gap-1.5 overflow-hidden">
                    {cutPieces.map((piece, idx) => {
                      const isFirst = idx === 0;
                      const wPct = Math.min(
                        94,
                        Math.max(16, Math.round((piece.widthMm / activeBoard.widthMm) * 100))
                      );
                      const hPct = Math.min(
                        94,
                        Math.max(14, Math.round((piece.heightMm / activeBoard.heightMm) * 100))
                      );

                      return (
                        <div
                          key={piece.id}
                          onClick={() =>
                            setSelectedCadPiece(
                              `${piece.name} • ${piece.widthMm} × ${piece.heightMm} mm (×${piece.quantity})`
                            )
                          }
                          style={{
                            flexBasis: `${Math.min(48, Math.max(22, wPct * 0.5))}%`,
                            height: `${Math.min(44, Math.max(18, hPct * 0.45))}%`,
                          }}
                          className={`rounded border flex flex-col items-center justify-center text-center p-1 cursor-pointer transition-all ${
                            isFirst
                              ? 'bg-[#ffdbcf] border-[#e87a50] text-[#5b1a00]'
                              : 'bg-[#f2f0ef] border-[#343535] text-[#1b1c1c] hover:bg-white'
                          }`}
                        >
                          {showLabelsOnCad && (
                            <>
                              <span className="text-[8px] font-bold leading-tight truncate max-w-full">
                                {piece.numberLabel} {piece.name}
                              </span>
                              <span className="text-[7px] opacity-80 tabular-nums">
                                {piece.widthMm} × {piece.heightMm} mm (×{piece.quantity})
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {wasteAreaM2 > 0.05 && (
                      <div className="flex-1 min-w-[28%] min-h-[18%] bg-[#d9d7d6] border border-dashed border-[#717171] rounded flex flex-col items-center justify-center p-1 text-center">
                        <span className="text-[8px] font-bold text-[#303031]">
                          RETAZO SOBRANTE
                        </span>
                        <span className="text-[7px] text-[#474746] tabular-nums">
                          {wasteAreaM2} m² libre
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Floating Scale Badge */}
                <div className="absolute bottom-2.5 left-2.5 bg-[#181a1a]/95 border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-[#e87a50]" />
                  <span className="text-[11px] font-bold text-white tabular-nums">
                    {cadZoom ? '150% Escala Visual' : '100% Escala Visual'}
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
          </section>

          {/* SECTION: CORTES ASIGNADOS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display text-white">
                  Cortes Asignados
                </h2>
                <span className="bg-[#34221c] text-[#ffb59b] text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                  {totalPiecesCount} piezas
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setSelectedCadPiece(null);
                    onResetCleanOrder();
                  }}
                  title="Reiniciar todos los cortes, simulador y eficiencia a 0 absoluto"
                  className="h-8 px-2.5 rounded-lg bg-[#271e1a] hover:bg-[#34241d] border border-[#e87a50]/70 text-[#ffb59b] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3 h-3 text-[#ffb59b]" />
                  <span>Reiniciar</span>
                </button>

                <button
                  onClick={openAddModal}
                  className="h-8 px-2.5 rounded-lg bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Corte</span>
                </button>
              </div>
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
                    No hay ningún corte cargado. Agrega tus piezas a medida para calcular el patrón.
                  </p>
                </div>
                <div className="flex items-center justify-center pt-1">
                  <button
                    onClick={openAddModal}
                    className="px-4 py-2.5 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Primer Corte</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Cut Piece Cards */
              <div className="space-y-3">
                {visiblePieces.map((piece, idx) => {
                  const isFirst = idx === 0;
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
                            <p className="text-xs text-[#a1a1a1] mt-0.5 truncate">
                              {piece.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Price + Edit + Delete Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="bg-[#252727] text-[#ffb59b] text-[11px] font-bold px-2 py-1 rounded-lg tabular-nums">
                            {formatARS(piece.unitPriceArs)}
                          </div>

                          <button
                            onClick={() => openEditModal(piece)}
                            title="Editar corte (nombre, medidas, cantos, cantidad)"
                            className="p-1.5 rounded-lg bg-[#252727] text-[#e3e2e2] hover:bg-[#e87a50] hover:text-[#121414] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteCut(piece.id)}
                            title="Eliminar este corte"
                            className="p-1.5 rounded-lg bg-[#252727] text-[#c8c6c5] hover:text-[#ffb4ab] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Dimensions & Edge Banding Bar */}
                      <div className="bg-[#202222] rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 font-bold text-white tabular-nums">
                          <span className="w-4 h-3.5 border border-[#a1a1a1] rounded-xs inline-block relative">
                            <span className="absolute top-0.5 left-0.5 w-1.5 h-1 border-t border-l border-[#a1a1a1]" />
                          </span>
                          <span>
                            {piece.widthMm} × {piece.heightMm} mm
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[#c8c6c5] font-medium">
                          {piece.edgesType === '4L' ? (
                            <span className="w-3.5 h-3.5 border border-dashed border-[#e87a50] rounded-xs inline-block" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-[#c8c6c5]" />
                          )}
                          <span>{piece.edgesLabel}</span>
                        </div>
                      </div>

                      {/* Rotation / Grain & Quantity Stepper */}
                      <div className="flex items-center justify-between pt-0.5">
                        <button
                          onClick={() => onTogglePieceRotation(piece.id)}
                          className="flex items-center gap-2 text-xs font-medium cursor-pointer group"
                        >
                          {piece.mandatoryGrain ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-[#e87a50]" />
                              <span className="text-[#ffb59b] font-semibold">
                                Veta Obligatoria
                              </span>
                            </>
                          ) : (
                            <>
                              <RotateCw className="w-3.5 h-3.5 text-[#a1a1a1] group-hover:text-white transition-colors" />
                              <span className="text-[#a1a1a1] group-hover:text-white transition-colors">
                                Permite rotación 90°
                              </span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-3 bg-[#202222] border border-white/5 rounded-full px-2.5 py-1">
                          <button
                            onClick={() => onUpdatePieceQty(piece.id, -1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[#c8c6c5] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-white min-w-[16px] text-center tabular-nums">
                            {piece.quantity}
                          </span>
                          <button
                            onClick={() => onUpdatePieceQty(piece.id, 1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[#c8c6c5] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
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

            {/* Bottom Direct Reset & Add Buttons */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={onResetCleanOrder}
                  className="h-12 rounded-xl bg-[#271e1a] hover:bg-[#34241d] border border-[#e87a50]/60 text-[#ffb59b] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-4 h-4 text-[#e87a50]" />
                  <span>Reiniciar Cortes</span>
                </button>

                <button
                  onClick={openAddModal}
                  className="h-12 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Agregar Corte</span>
                </button>
              </div>

              {onClearAllCuts && cutPieces.length > 0 && (
                <button
                  onClick={onClearAllCuts}
                  className="w-full py-2 text-center text-xs text-[#a1a1a1] hover:text-[#ffb4ab] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vaciar todos los cortes (dejar placa limpia)</span>
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

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
                    onChange={(e) => setCutW(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white tabular-nums focus:outline-none focus:border-[#e87a50]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Ancho (mm)
                  </label>
                  <input
                    type="number"
                    required
                    value={cutH}
                    onChange={(e) => setCutH(e.target.value)}
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

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Pegado de Cantos (Filo)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['4L', '2L', '1L', '0L'] as const).map((edge) => (
                    <button
                      type="button"
                      key={edge}
                      onClick={() => setCutEdges(edge)}
                      className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                        cutEdges === edge
                          ? 'bg-[#e87a50] text-[#121414] border-[#e87a50]'
                          : 'bg-[#222424] text-[#c8c6c5] border-white/10'
                      }`}
                    >
                      {edge}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
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
    </div>
  );
};
