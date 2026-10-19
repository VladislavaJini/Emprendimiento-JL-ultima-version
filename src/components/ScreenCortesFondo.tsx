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
  Check,
  Minus,
  Plus,
  Save,
  Lock,
  Palette,
  X,
} from 'lucide-react';
import { MelaminaBoard, CutPiece } from '../types/atelier';
import { formatARS } from '../data/initialData';

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
  onShowToast,
}) => {
  const [kerfMm, setKerfMm] = useState<number>(3.2);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [cadZoom, setCadZoom] = useState<boolean>(false);
  const [showLabelsOnCad, setShowLabelsOnCad] = useState<boolean>(true);
  const [grainDirection, setGrainDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [selectedCadPiece, setSelectedCadPiece] = useState<string | null>(null);

  // Edit active board modal / inline state
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

  const activeBoard = boards.find((b) => b.id === selectedBoardId) || boards[0];

  const boardAreaM2 = Number(
    ((activeBoard.widthMm * activeBoard.heightMm) / 1_000_000).toFixed(2)
  );
  const costPerM2 = Math.round(activeBoard.costArs / Math.max(0.1, boardAreaM2));

  const totalPiecesCount = cutPieces.reduce((acc, p) => acc + p.quantity, 0);
  const rawCutAreaM2 = cutPieces.reduce(
    (acc, p) => acc + (p.widthMm * p.heightMm * p.quantity) / 1_000_000,
    0
  );

  const usedAreaM2 = Math.min(boardAreaM2, Number(rawCutAreaM2.toFixed(2)));
  const wasteAreaM2 = Number(Math.max(0, boardAreaM2 - usedAreaM2).toFixed(2));
  const efficiencyPct = Number(
    Math.min(98.5, (usedAreaM2 / Math.max(0.1, boardAreaM2)) * 100).toFixed(1)
  );
  const restPct = Number((100 - efficiencyPct).toFixed(1));
  const cutValueArs = Math.round((efficiencyPct / 100) * activeBoard.costArs);

  const totalSegments = 7;
  const activeSegments = Math.max(
    1,
    Math.min(7, Math.round((efficiencyPct / 100) * totalSegments))
  );

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
    setShowCutModal(true);
  };

  const openEditCutModal = (piece: CutPiece) => {
    setEditingPieceId(piece.id);
    setCutName(piece.name);
    setCutSub(piece.subtitle);
    setCutW(String(piece.widthMm));
    setCutH(String(piece.heightMm));
    setCutQty(String(piece.quantity));
    setCutMountType(piece.edgesType);
    setShowCutModal(true);
  };

  const handleSaveCutModal = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Math.max(50, Math.min(2750, parseInt(cutW, 10) || 800));
    const h = Math.max(50, Math.min(1830, parseInt(cutH, 10) || 500));
    const q = Math.max(1, Math.min(50, parseInt(cutQty, 10) || 1));
    const area = (w * h) / 1_000_000;
    const price = Math.max(450, Math.round(area * costPerM2 * 1.1));

    const mountLabels = {
      '0L': 'Ranurado 4L (Sin Canto)',
      '1L': 'Clavado / Ranura 3mm',
      '2L': 'Engrampado Perimetral',
      '4L': 'Fondo Vista Doble Faz',
    };

    if (editingPieceId) {
      onUpdatePieceDetails(editingPieceId, {
        name: cutName.trim() || 'Fondo de Mueble',
        subtitle: cutSub.trim() || 'Módulo Taller J&L',
        widthMm: w,
        heightMm: h,
        quantity: q,
        unitPriceArs: price,
        edgesLabel: mountLabels[cutMountType],
        edgesType: cutMountType,
      });
      onShowToast(`Corte de fondo actualizado (${w} × ${h} mm)`);
    } else {
      onAddCutPiece({
        name: cutName.trim() || 'Fondo Medida Especial',
        subtitle: cutSub.trim() || 'Módulo Taller J&L • 3mm',
        widthMm: w,
        heightMm: h,
        quantity: q,
        unitPriceArs: price,
        edgesLabel: mountLabels[cutMountType],
        edgesType: cutMountType,
        allowRotation: true,
        mandatoryGrain: false,
      });
      onShowToast(`Corte de fondo agregado (${w} × ${h} mm • ${q} uds)`);
    }

    setShowCutModal(false);
  };

  const handleRunOptimizer = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      onShowToast(
        `Optimizador de Fondo 3mm completado • Aprovechamiento ${efficiencyPct}%`
      );
    }, 400);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Action Row */}
      <div className="grid grid-cols-12 gap-2.5">
        <button
          onClick={onResetCleanOrder}
          className="col-span-7 flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#271e1a] hover:bg-[#332620] border border-[#4d352b] text-[#f2ded7] text-xs font-semibold transition-colors cursor-pointer"
        >
          <PlusSquare className="w-4 h-4 text-[#ffb59b] shrink-0" />
          <span className="leading-tight text-center">
            Nueva Orden (Fondo Limpio)
          </span>
        </button>

        <button
          onClick={() => {
            const nextKerf = kerfMm === 3.2 ? 2.8 : kerfMm === 2.8 ? 4.0 : 3.2;
            setKerfMm(nextKerf);
            onShowToast(`Espesor de sierra ajustado a ${nextKerf.toFixed(1)} mm`);
          }}
          className="col-span-5 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#1e2020] hover:bg-[#292a2a] border border-white/10 text-[#e3e2e2] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#c8c6c5] shrink-0" />
          <span>Sierra: {kerfMm.toFixed(1)} mm</span>
        </button>
      </div>

      {/* Mode Subtitle */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#e87a50] inline-block" />
          <span className="text-xs font-bold text-[#c8c6c5] tracking-tight">
            Cortes Fondo 2D • Placas 3mm / 5.5mm
          </span>
        </div>
        <button
          onClick={() => setShowAddColorModal(true)}
          className="text-[11px] font-bold text-[#ffb59b] hover:text-[#e87a50] flex items-center gap-1 cursor-pointer"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>+ Nuevo Color</span>
        </button>
      </div>

      {/* CARD 1: PLACA DE FONDO & PRECIO */}
      <section className="atelier-card rounded-2xl p-4 relative overflow-hidden space-y-3.5">
        <div
          className="w-5 h-5 rounded atelier-hatch absolute top-3.5 right-3.5 opacity-90"
          aria-hidden="true"
        />

        <div className="text-[11px] font-bold uppercase tracking-wider text-[#c8c6c5]">
          PLACA DE FONDO &amp; ACABADO
        </div>

        {/* Quick Color Selector Pills (Blanco + Additional Colors + Add button) */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-[#b7b5b4]">
            Colores disponibles (toca para cambiar o agregar):
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {boards.map((b) => {
              const isSelected = b.id === activeBoard.id;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    onSelectBoard(b.id);
                    onShowToast(`Color seleccionado: ${b.name} (${formatARS(b.costArs)})`);
                  }}
                  className={`h-9 px-3 rounded-full flex items-center gap-2 text-xs font-bold shrink-0 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#e87a50] text-[#280b00] border-[#e87a50] shadow-sm'
                      : 'bg-[#1e2020] text-[#e3e2e2] border-white/10 hover:border-white/25'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/30 shrink-0"
                    style={{ backgroundColor: b.swatchColor }}
                  />
                  <span>{b.name.replace('Fondo ', '')}</span>
                </button>
              );
            })}

            <button
              onClick={() => setShowAddColorModal(true)}
              className="h-9 px-3 rounded-full bg-[#2c1d17] hover:bg-[#3a261e] border border-[#e87a50]/50 text-[#ffb59b] text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Color</span>
            </button>
          </div>
        </div>

        {/* Selected Backing Board Detail Box */}
        <div className="relative border border-[#56423c]/80 bg-[#1c1e1e] rounded-xl p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <span
                className="w-6 h-6 rounded-lg border border-white/20 shrink-0 mt-1 shadow-inner"
                style={{ backgroundColor: activeBoard.swatchColor }}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold font-display text-white leading-tight">
                    {activeBoard.name}
                  </h2>
                  <span className="bg-[#3d261e] text-[#ffb59b] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    ACTIVA
                  </span>
                </div>
                <p className="text-xs text-[#d0cecd] mt-1 font-medium">
                  {activeBoard.brandSpec}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[#c8c6c5] shrink-0">
              <button
                onClick={openEditBoard}
                title="Editar nombre, medidas o precio de placa de fondo"
                className="p-1.5 rounded-lg bg-[#292a2a] hover:bg-[#e87a50] hover:text-[#121414] transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowBoardMenu((prev) => !prev)}
                title="Desplegar lista de placas de fondo"
                className="p-1.5 rounded-lg bg-[#292a2a] text-[#ffb59b] hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {showBoardMenu && (
            <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1">
              {boards.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    onSelectBoard(b.id);
                    setShowBoardMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    b.id === activeBoard.id
                      ? 'bg-[#3d261e] text-[#ffb59b] font-bold'
                      : 'hover:bg-white/5 text-[#e3e2e2]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: b.swatchColor }}
                    />
                    <span>{b.name}</span>
                  </span>
                  <span className="tabular-nums font-bold text-white">
                    {formatARS(b.costArs)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Formato Bruto & Costo Placa de Fondo Grid */}
        <div className="grid grid-cols-2 gap-3">
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
              ? 'Optimizando Placa de Fondo...'
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
          <span className="bg-[#232525] border border-white/10 text-[#e3e2e2] text-[11px] font-semibold px-3 py-1 rounded-full">
            Fondo #1 de 1
          </span>
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
              {efficiencyPct}% de la placa
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
              {restPct}% restante
            </div>
          </div>

          <div className="atelier-subcard rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e3e2e2]">
              <Banknote className="w-3.5 h-3.5 text-[#ffb59b]" />
              <span>Costo Proporcional</span>
            </div>
            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {formatARS(cutValueArs)}
            </div>
            <div className="text-[11px] text-[#c8c6c5] mt-0.5">
              ARS en cortes
            </div>
          </div>

          <div className="atelier-subcard rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e3e2e2]">
              <ClipboardCheck className="w-3.5 h-3.5 text-[#ffb59b]" />
              <span>Total Fondos</span>
            </div>
            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {totalPiecesCount} uds
            </div>
            <div className="text-[11px] text-[#c8c6c5] mt-0.5">
              Retazo reutilizable
            </div>
          </div>
        </div>
      </section>

      {/* CARD 3: PLANO DE SIERRA - Simulador HiDPI CAD (Fondo) */}
      <section className="atelier-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5]">
              PLANO DE CORTE FONDO 3MM
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
                onShowToast('Plano de fondo centrado al 100%');
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
            className={`relative w-full aspect-[2750/1830] bg-[#383a3a] rounded overflow-hidden transition-transform duration-300 ${
              cadZoom ? 'scale-110 origin-top-left' : 'scale-100'
            }`}
          >
            {/* Piece 1: #1 FONDO CÓMODA 4C */}
            <div
              onClick={() =>
                setSelectedCadPiece('#1 Fondo Trasero Cómoda 4C • 1164 × 784 mm')
              }
              className="absolute top-[2%] left-[1.5%] w-[42.5%] h-[43%] bg-[#ffdbcf] border-2 border-[#e87a50] flex flex-col items-center justify-center text-center p-1 cursor-pointer hover:brightness-105 transition-all"
            >
              {showLabelsOnCad && (
                <>
                  <span className="text-[9px] font-extrabold text-[#380d00] leading-tight">
                    #1 FONDO CÓMODA 4C
                  </span>
                  <span className="text-[8px] font-bold text-[#7e2b06] tabular-nums">
                    1164 × 784 mm (3mm)
                  </span>
                </>
              )}
            </div>

            {/* Pieces 2 & 3: FONDOS MESITA NÓRDICA */}
            <div
              onClick={() =>
                setSelectedCadPiece('#2 Fondo Mesita Nórdica V1 • 414 × 514 mm')
              }
              className="absolute top-[47%] left-[1.5%] w-[20.5%] h-[49%] bg-[#f5f5f3] border border-[#343535] flex flex-col items-center justify-center text-center p-1 cursor-pointer hover:bg-white transition-all"
            >
              {showLabelsOnCad && (
                <>
                  <span className="text-[8px] font-extrabold text-[#121414] leading-tight">
                    #2 FONDO MESITA
                  </span>
                  <span className="text-[7px] font-bold text-[#303031] tabular-nums">
                    414 × 514 mm
                  </span>
                </>
              )}
            </div>

            <div
              onClick={() =>
                setSelectedCadPiece('#3 Fondo Mesita Nórdica V1 • 414 × 514 mm')
              }
              className="absolute top-[47%] left-[23%] w-[21%] h-[49%] bg-[#f5f5f3] border border-[#343535] flex flex-col items-center justify-center text-center p-1 cursor-pointer hover:bg-white transition-all"
            >
              {showLabelsOnCad && (
                <>
                  <span className="text-[8px] font-extrabold text-[#121414] leading-tight">
                    #3 FONDO MESITA
                  </span>
                  <span className="text-[7px] font-bold text-[#303031] tabular-nums">
                    414 × 514 mm
                  </span>
                </>
              )}
            </div>

            {/* Pieces 4 to 7: FONDOS DE CAJÓN */}
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                onClick={() =>
                  setSelectedCadPiece(`#${idx + 4} Fondo de Cajón • 380 × 340 mm`)
                }
                style={{ left: `${45.5 + idx * 13.2}%` }}
                className="absolute top-[2%] w-[12.2%] h-[22%] bg-[#e8e6e5] border border-[#343535] flex flex-col items-center justify-center text-center p-0.5 cursor-pointer hover:bg-white transition-all"
              >
                {showLabelsOnCad && (
                  <>
                    <span className="text-[7px] font-extrabold text-[#121414]">
                      #{idx + 4} CAJÓN
                    </span>
                    <span className="text-[6.5px] font-bold text-[#303031] tabular-nums">
                      380×340
                    </span>
                  </>
                )}
              </div>
            ))}

            {/* RETAZO FONDO DISPONIBLE */}
            <div
              onClick={() =>
                setSelectedCadPiece(
                  `Retazo Fondo ${activeBoard.name.replace('Fondo ', '')} • 1490 × 1350 mm`
                )
              }
              className="absolute bottom-[2%] right-[1.5%] w-[53%] h-[71%] bg-[#d9d7d6] border border-[#717171] flex flex-col items-center justify-center text-center p-2 cursor-pointer hover:bg-[#e5e2e1] transition-all"
            >
              {showLabelsOnCad && (
                <>
                  <span className="text-[9px] font-extrabold text-[#1b1c1c]">
                    RETAZO FONDO (1490 × 1350)
                  </span>
                  <span className="text-[7.5px] font-semibold text-[#303031] mt-0.5">
                    Color: {activeBoard.name.replace('Fondo ', '')}
                  </span>
                </>
              )}
            </div>

            {/* Floating Scale Badge */}
            <div className="absolute bottom-2.5 left-2.5 bg-[#181a1a]/95 border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-md">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/30"
                style={{ backgroundColor: activeBoard.swatchColor }}
              />
              <span className="text-[11px] font-bold text-white tabular-nums">
                {activeBoard.name.replace('Fondo ', '')} •{' '}
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
      </section>

      {/* SECTION: CORTES DE FONDO ASIGNADOS (EDITABLE & LEGIBLE) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold font-display text-white">
              Cortes de Fondo
            </h2>
            <span className="bg-[#34221c] text-[#ffb59b] text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums">
              {totalPiecesCount} piezas
            </span>
          </div>

          <button
            onClick={openNewCutModal}
            className="text-xs font-bold text-[#ffb59b] hover:text-[#e87a50] transition-colors cursor-pointer"
          >
            + Nuevo Corte
          </button>
        </div>

        <div className="space-y-3">
          {cutPieces.map((piece, idx) => {
            const isFirst = idx === 0;
            return (
              <div
                key={piece.id}
                className="atelier-card rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold tabular-nums shrink-0 ${
                        isFirst
                          ? 'bg-[#3c241b] text-[#ffb59b]'
                          : 'bg-[#252727] text-white'
                      }`}
                    >
                      {piece.numberLabel}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-snug">
                        {piece.name}
                      </h3>
                      <p className="text-xs text-[#c8c6c5] mt-0.5">
                        {piece.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="bg-[#252727] text-[#ffb59b] text-xs font-bold px-2.5 py-1 rounded-lg tabular-nums">
                      {formatARS(piece.unitPriceArs)} c/u
                    </div>
                    <button
                      onClick={() => openEditCutModal(piece)}
                      title="Editar medida o nombre de este fondo"
                      className="p-1.5 rounded-lg bg-[#252727] text-[#e3e2e2] hover:bg-[#e87a50] hover:text-[#121414] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletePiece(piece.id)}
                      title="Eliminar corte de fondo"
                      className="p-1.5 rounded-lg bg-[#252727] text-[#c8c6c5] hover:text-[#ffb4ab] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* High-Legibility Dimensions & Mounting Bar */}
                <div
                  onClick={() => openEditCutModal(piece)}
                  className="bg-[#222424] hover:bg-[#2a2c2c] border border-white/5 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 font-bold text-white text-sm tabular-nums">
                    <span
                      className="w-3.5 h-3.5 rounded-xs border border-white/40 inline-block"
                      style={{ backgroundColor: activeBoard.swatchColor }}
                    />
                    <span>
                      {piece.widthMm} × {piece.heightMm} mm
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[#e3e2e2] font-semibold">
                    <Check className="w-3.5 h-3.5 text-[#ffb59b]" />
                    <span>{piece.edgesLabel}</span>
                  </div>
                </div>

                {/* Rotation & Quantity Stepper */}
                <div className="flex items-center justify-between pt-0.5">
                  <button
                    onClick={() => onTogglePieceRotation(piece.id)}
                    className="flex items-center gap-2 text-xs font-semibold cursor-pointer group"
                  >
                    {piece.mandatoryGrain ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-[#e87a50]" />
                        <span className="text-[#ffb59b]">
                          Veta Obligatoria
                        </span>
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5 text-[#c8c6c5] group-hover:text-white transition-colors" />
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

        {/* Bottom Sticky/Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() =>
              onShowToast(
                `Cortes de ${activeBoard.name} guardados en orden de taller`
              )
            }
            className="h-12 rounded-xl bg-[#1e2020] hover:bg-[#292a2a] border border-white/10 text-[#e3e2e2] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 text-[#ffb59b]" />
            <span>Guardar Fondo</span>
          </button>

          <button
            onClick={openNewCutModal}
            className="h-12 rounded-xl bg-[#e3e2e2] hover:bg-white text-[#121414] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Corte Fondo</span>
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
              <h3 className="text-base font-bold font-display text-white">
                Agregar Color de Fondo
              </h3>
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
                  Nombre del Color de Fondo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Fondo Gris Grafito / Haya / Cedro"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Tono / Textura Visual
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SWATCH_PRESETS.map((sw) => (
                    <button
                      type="button"
                      key={sw.hex}
                      onClick={() => {
                        setNewColorHex(sw.hex);
                        if (!newColorName) setNewColorName(`Fondo ${sw.name}`);
                      }}
                      className={`p-2 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                        newColorHex === sw.hex
                          ? 'bg-[#3d261e] border-[#e87a50] text-white'
                          : 'bg-[#222424] border-white/10 text-[#c8c6c5]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/30 shrink-0"
                        style={{ backgroundColor: sw.hex }}
                      />
                      <span className="truncate">{sw.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Marca y Espesor
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
                  Precio Placa (ARS)
                </label>
                <input
                  type="number"
                  required
                  value={newColorCost}
                  onChange={(e) => setNewColorCost(e.target.value)}
                  className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-3.5 py-2.5 text-sm font-bold text-white tabular-nums"
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
                  Agregar Color
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
                {editingPieceId
                  ? 'Editar Corte de Fondo'
                  : 'Agregar Corte de Fondo'}
              </h3>
              <button
                onClick={() => setShowCutModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCutModal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Nombre de la Pieza de Fondo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Fondo Placard / Base Cajón"
                  value={cutName}
                  onChange={(e) => setCutName(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Detalle / Módulo
                </label>
                <input
                  type="text"
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
                    value={cutH}
                    onChange={(e) => setCutH(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Cant.
                  </label>
                  <input
                    type="number"
                    value={cutQty}
                    onChange={(e) => setCutQty(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Tipo de Colocación en Mueble
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: '0L' as const, label: 'Ranurado 4L' },
                    { key: '1L' as const, label: 'Clavado / Ranura' },
                    { key: '2L' as const, label: 'Engrampado' },
                    { key: '4L' as const, label: 'Doble Faz Vista' },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.key}
                      onClick={() => setCutMountType(opt.key)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                        cutMountType === opt.key
                          ? 'bg-[#e87a50] text-[#121414] border-[#e87a50]'
                          : 'bg-[#222424] text-[#c8c6c5] border-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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
                  {editingPieceId ? 'Guardar' : 'Asignar Corte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
