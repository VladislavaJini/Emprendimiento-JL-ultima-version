import React, { useState } from 'react';
import {
  Palette,
  Pencil,
  Trash2,
  Plus,
  Minus,
  ChevronDown,
  Zap,
  Banknote,
  Ruler,
  Scissors,
  RotateCcw,
  Check,
  RefreshCw,
  X,
} from 'lucide-react';
import { EdgeBandingRoll, EdgeBandingPiece, CutPiece } from '../types/atelier';
import { formatARS } from '../data/initialData';

interface ScreenCalculadorFiloProps {
  rolls: EdgeBandingRoll[];
  selectedRollId: string;
  onSelectRoll: (id: string) => void;
  onAddRoll: (roll: EdgeBandingRoll) => void;
  onUpdateRoll: (id: string, updated: Partial<EdgeBandingRoll>) => void;
  onDeleteRoll: (id: string) => void;
  pieces: EdgeBandingPiece[];
  onAddPiece: (piece: EdgeBandingPiece) => void;
  onUpdatePiece: (id: string, updated: Partial<EdgeBandingPiece>) => void;
  onDeletePiece: (id: string) => void;
  onResetPieces: () => void;
  cutPieces?: CutPiece[];
  onSyncWithGuillotine?: (importedPieces: EdgeBandingPiece[]) => void;
  onShowToast: (msg: string) => void;
}

const FILO_SWATCHES = [
  { name: 'Carvalho / Roble', hex: '#c99768' },
  { name: 'Blanco Puro', hex: '#f5f5f3' },
  { name: 'Paraíso / Haya', hex: '#deb887' },
  { name: 'Nogal Gaudí', hex: '#785337' },
  { name: 'Gris Humo', hex: '#9ca3af' },
  { name: 'Negro Grafito', hex: '#26282a' },
];

export const ScreenCalculadorFilo: React.FC<ScreenCalculadorFiloProps> = ({
  rolls,
  selectedRollId,
  onSelectRoll,
  onAddRoll,
  onUpdateRoll,
  onDeleteRoll,
  pieces,
  onAddPiece,
  onUpdatePiece,
  onDeletePiece,
  onResetPieces,
  cutPieces = [],
  onSyncWithGuillotine,
  onShowToast,
}) => {
  const [showRollDropdown, setShowRollDropdown] = useState(false);

  // Modal for Add / Edit Roll (Color & Medidas de Filo)
  const [showRollModal, setShowRollModal] = useState(false);
  const [editingRollId, setEditingRollId] = useState<string | null>(null);
  const [rollName, setRollName] = useState('');
  const [rollSpec, setRollSpec] = useState('22mm × 0.45mm • PVC');
  const [rollLengthM, setRollLengthM] = useState('10');
  const [rollPrice, setRollPrice] = useState('6500');
  const [rollTrimMm, setRollTrimMm] = useState('15');
  const [rollHex, setRollHex] = useState('#c99768');

  // Modal for Add / Edit Wood Piece
  const [showPieceModal, setShowPieceModal] = useState(false);
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [pieceName, setPieceName] = useState('');
  const [pieceSub, setPieceSub] = useState('Módulo Melamina 18mm');
  const [pieceLen, setPieceLen] = useState('800');
  const [pieceWid, setPieceWid] = useState('450');
  const [pieceQty, setPieceQty] = useState('2');
  const [pieceLongSides, setPieceLongSides] = useState<0 | 1 | 2>(1);
  const [pieceShortSides, setPieceShortSides] = useState<0 | 1 | 2>(0);

  const activeRoll: EdgeBandingRoll =
    rolls.find((r) => r.id === selectedRollId) ||
    rolls[0] || {
      id: 'filo-empty',
      name: 'Rollo de Filo (Sin cargar)',
      widthThickSpec: 'Tocá + Nuevo Color o el lápiz para configurar',
      rollLengthMeters: 10,
      rollPriceArs: 0,
      swatchColor: '#c99768',
      trimWasteMmPerSide: 15,
    };

  const pricePerMeterArs =
    activeRoll.rollPriceArs / Math.max(0.5, activeRoll.rollLengthMeters);

  // Compute exact linear meters & minimum waste for each wood piece
  const pieceCalculations = pieces.map((p) => {
    const netMmPerUnit =
      p.longSidesCount * p.lengthMm + p.shortSidesCount * p.widthMm;
    const totalEdgesAppliedPerUnit = p.longSidesCount + p.shortSidesCount;
    // Minimum waste: trim allowance at start/end of each applied edge strip
    const wasteMmPerUnit =
      totalEdgesAppliedPerUnit * activeRoll.trimWasteMmPerSide;
    const totalMmWithMinWaste =
      (netMmPerUnit + wasteMmPerUnit) * p.quantity;
    const totalMeters = totalMmWithMinWaste / 1000;
    const netMeters = (netMmPerUnit * p.quantity) / 1000;
    const wasteMeters = (wasteMmPerUnit * p.quantity) / 1000;
    const costArs = totalMeters * pricePerMeterArs;

    return {
      piece: p,
      netMeters,
      wasteMeters,
      totalMeters,
      costArs,
    };
  });

  const totalNetMeters = Number(
    pieceCalculations.reduce((acc, c) => acc + c.netMeters, 0).toFixed(2)
  );
  const totalWasteMeters = Number(
    pieceCalculations.reduce((acc, c) => acc + c.wasteMeters, 0).toFixed(2)
  );
  const totalRequiredMeters = Number(
    (totalNetMeters + totalWasteMeters).toFixed(2)
  );

  const exactSpentOnPiecesArs =
    pieces.length === 0 ? 0 : Math.round(totalRequiredMeters * pricePerMeterArs);
  const rollsNeeded =
    pieces.length === 0 || totalRequiredMeters <= 0
      ? 0
      : Math.max(
          1,
          Math.ceil(totalRequiredMeters / Math.max(0.5, activeRoll.rollLengthMeters))
        );
  const totalBoughtMeters =
    pieces.length === 0
      ? 0
      : Number((rollsNeeded * activeRoll.rollLengthMeters).toFixed(2));
  const remainingRollMeters =
    pieces.length === 0
      ? 0
      : Number(Math.max(0, totalBoughtMeters - totalRequiredMeters).toFixed(2));
  const rollUsedPercent =
    pieces.length === 0 || totalBoughtMeters <= 0
      ? 0
      : Math.min(
          100,
          Math.round((totalRequiredMeters / Math.max(0.5, totalBoughtMeters)) * 100)
        );

  // Breakdown by Edge Type: PVC 0.45mm vs ABS 2.0mm
  const pvc045Calculations = pieceCalculations.filter(
    (c) =>
      !c.piece.subtitle.toLowerCase().includes('abs') &&
      !c.piece.subtitle.toLowerCase().includes('2mm') &&
      !c.piece.name.toLowerCase().includes('abs')
  );
  const abs2mmCalculations = pieceCalculations.filter(
    (c) =>
      c.piece.subtitle.toLowerCase().includes('abs') ||
      c.piece.subtitle.toLowerCase().includes('2mm') ||
      c.piece.name.toLowerCase().includes('abs')
  );

  const pvc045Meters = Number(
    pvc045Calculations.reduce((acc, c) => acc + c.totalMeters, 0).toFixed(2)
  );
  const abs2mmMeters = Number(
    abs2mmCalculations.reduce((acc, c) => acc + c.totalMeters, 0).toFixed(2)
  );

  const pvc045CostArs = Math.round(pvc045Meters * pricePerMeterArs);
  // ABS 2mm standard cost per meter is roughly 2.2x standard PVC 0.45mm
  const absPricePerMeterArs = Math.round(pricePerMeterArs * 2.2);
  const abs2mmCostArs = Math.round(abs2mmMeters * absPricePerMeterArs);

  // Auto-Sync from Guillotine Cut Optimizer
  const handleImportFromGuillotine = () => {
    if (!cutPieces || cutPieces.length === 0) {
      onShowToast('No hay cortes activos en la Guillotina 2D para sincronizar.');
      return;
    }

    const converted: EdgeBandingPiece[] = cutPieces.map((cp, idx) => {
      let longSides: 0 | 1 | 2 = 0;
      let shortSides: 0 | 1 | 2 = 0;

      if (cp.edgesType === '4L') {
        longSides = 2;
        shortSides = 2;
      } else if (cp.edgesType === '3L') {
        longSides = 2;
        shortSides = 1;
      } else if (cp.edgesType === '2L') {
        longSides = 2;
        shortSides = 0;
      } else if (cp.edgesType === '1L') {
        longSides = 1;
        shortSides = 0;
      }

      return {
        id: `ep-sync-${idx}-${Date.now()}`,
        name: cp.name,
        subtitle: `${cp.subtitle || 'Corte Guillotina'} (${cp.edgesLabel || cp.edgesType})`,
        lengthMm: cp.widthMm,
        widthMm: cp.heightMm,
        quantity: cp.quantity,
        longSidesCount: longSides,
        shortSidesCount: shortSides,
      };
    });

    if (onSyncWithGuillotine) {
      onSyncWithGuillotine(converted);
    } else {
      converted.forEach((p) => onAddPiece(p));
    }

    const totalLinearMeters = converted.reduce((sum, p) => {
      const perUnit = p.longSidesCount * p.lengthMm + p.shortSidesCount * p.widthMm;
      return sum + (perUnit * p.quantity) / 1000;
    }, 0);

    onShowToast(
      `🔄 Auto-Sync: ${converted.length} piezas importadas desde Guillotina (${totalLinearMeters.toFixed(
        2
      )} m lineales calculados)`
    );
  };

  // Open Modal to Edit existing roll
  const openEditRollModal = (roll: EdgeBandingRoll) => {
    setEditingRollId(roll.id);
    setRollName(roll.name);
    setRollSpec(roll.widthThickSpec);
    setRollLengthM(String(roll.rollLengthMeters));
    setRollPrice(String(roll.rollPriceArs));
    setRollTrimMm(String(roll.trimWasteMmPerSide));
    setRollHex(roll.swatchColor);
    setShowRollModal(true);
  };

  // Open Modal to Add new roll
  const openNewRollModal = () => {
    setEditingRollId(null);
    setRollName('');
    setRollSpec('22mm × 0.45mm • PVC');
    setRollLengthM('10');
    setRollPrice('6500');
    setRollTrimMm('15');
    setRollHex('#deb887');
    setShowRollModal(true);
  };

  const handleSaveRoll = (e: React.FormEvent) => {
    e.preventDefault();
    const meters = Math.max(1, parseFloat(rollLengthM) || 10);
    const price = Math.max(100, parseInt(rollPrice.replace(/\D/g, ''), 10) || 6500);
    const trim = Math.max(0, Math.min(100, parseInt(rollTrimMm, 10) || 15));

    if (editingRollId) {
      onUpdateRoll(editingRollId, {
        name: rollName.trim() || 'Filo Personalizado',
        widthThickSpec: rollSpec.trim() || '22mm × 0.45mm',
        rollLengthMeters: meters,
        rollPriceArs: price,
        trimWasteMmPerSide: trim,
        swatchColor: rollHex,
      });
      onShowToast(
        `Rollo actualizado: ${rollName || 'Filo'} (${meters}m • ${formatARS(price)})`
      );
    } else {
      const newId = `filo-${Date.now()}`;
      onAddRoll({
        id: newId,
        name: rollName.trim() || 'Filo Nuevo Color',
        widthThickSpec: rollSpec.trim() || '22mm × 0.45mm • PVC',
        rollLengthMeters: meters,
        rollPriceArs: price,
        trimWasteMmPerSide: trim,
        swatchColor: rollHex,
      });
      onSelectRoll(newId);
      onShowToast(
        `Nuevo color de filo agregado (${meters}m • ${formatARS(price)})`
      );
    }
    setShowRollModal(false);
  };

  const openNewPieceModal = () => {
    setEditingPieceId(null);
    setPieceName('');
    setPieceSub('Módulo Melamina 18mm');
    setPieceLen('800');
    setPieceWid('450');
    setPieceQty('2');
    setPieceLongSides(1);
    setPieceShortSides(1);
    setShowPieceModal(true);
  };

  const openEditPieceModal = (p: EdgeBandingPiece) => {
    setEditingPieceId(p.id);
    setPieceName(p.name);
    setPieceSub(p.subtitle);
    setPieceLen(String(p.lengthMm));
    setPieceWid(String(p.widthMm));
    setPieceQty(String(p.quantity));
    setPieceLongSides(p.longSidesCount);
    setPieceShortSides(p.shortSidesCount);
    setShowPieceModal(true);
  };

  const handleSavePiece = (e: React.FormEvent) => {
    e.preventDefault();
    const len = Math.max(50, parseInt(pieceLen, 10) || 800);
    const wid = Math.max(50, parseInt(pieceWid, 10) || 450);
    const qty = Math.max(1, parseInt(pieceQty, 10) || 1);

    if (editingPieceId) {
      onUpdatePiece(editingPieceId, {
        name: pieceName.trim() || 'Pieza de Madera',
        subtitle: pieceSub.trim() || 'Módulo Taller J&L',
        lengthMm: len,
        widthMm: wid,
        quantity: qty,
        longSidesCount: pieceLongSides,
        shortSidesCount: pieceShortSides,
      });
      onShowToast(`Pieza actualizada (${len} × ${wid} mm)`);
    } else {
      onAddPiece({
        id: `ep-${Date.now()}`,
        name: pieceName.trim() || 'Puerta / Frente Cajón',
        subtitle: pieceSub.trim() || 'Módulo Taller J&L',
        lengthMm: len,
        widthMm: wid,
        quantity: qty,
        longSidesCount: pieceLongSides,
        shortSidesCount: pieceShortSides,
      });
      onShowToast(`Pieza agregada al cálculo de filo`);
    }
    setShowPieceModal(false);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Action Row */}
      <div className="grid grid-cols-12 gap-2.5">
        <button
          onClick={onResetPieces}
          className="col-span-7 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#271e1a] hover:bg-[#332620] border border-[#4d352b] text-[#f2ded7] text-xs font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-[#ffb59b] shrink-0" />
          <span className="leading-tight text-center">
            Reiniciar Todo en 0 (Filo Limpio)
          </span>
        </button>

        <button
          onClick={openNewRollModal}
          className="col-span-5 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1e2020] hover:bg-[#292a2a] border border-white/10 text-[#ffb59b] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          <Palette className="w-3.5 h-3.5 text-[#ffb59b] shrink-0" />
          <span>+ Agregar Color</span>
        </button>

        {/* Auto-Sync with Guillotine 2D Button */}
        <button
          onClick={handleImportFromGuillotine}
          className="col-span-12 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#e87a50] to-[#b3532c] hover:from-[#f0855c] hover:to-[#c45e35] text-[#280b00] font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          <span>🔄 Importar Cortes de Guillotina ({cutPieces.length} piezas activas en Cutter)</span>
        </button>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e87a50] inline-block" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffb59b]">
              CALCULADOR DE TAPACANTOS
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#c8c6c5] tabular-nums">
            Uso: {rollUsedPercent}%
          </span>
        </div>

        <h1 className="text-2xl font-bold font-display text-white tracking-tight">
          Precio &amp; Consumo de Filo
        </h1>
        <p className="text-xs text-[#c8c6c5]">
          Calcula cuánto gastas por rollo en tus piezas con mínimo desperdicio.
        </p>
      </div>

      {/* CARD 1: MINIMALIST VECTOR EDGE-BANDING WHEEL + ACTIVE ROLL SELECTOR */}
      <section className="atelier-card rounded-2xl p-4 space-y-4">
        {/* Quick Roll/Color Pills */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-[#c8c6c5]">
            Rollos y Colores Cargados (toca para elegir o editar):
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {rolls.map((r) => {
              const active = r.id === activeRoll.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelectRoll(r.id)}
                  className={`h-9 px-3 rounded-full flex items-center gap-2 text-xs font-bold shrink-0 border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#e87a50] text-[#280b00] border-[#e87a50] shadow-sm'
                      : 'bg-[#1e2020] text-[#e3e2e2] border-white/10 hover:border-white/25'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/30 shrink-0"
                    style={{ backgroundColor: r.swatchColor }}
                  />
                  <span>
                    {r.name.replace('Filo ', '')} ({r.rollLengthMeters}m)
                  </span>
                </button>
              );
            })}

            <button
              onClick={openNewRollModal}
              className="h-9 px-3 rounded-full bg-[#2c1d17] hover:bg-[#3a261e] border border-[#e87a50]/50 text-[#ffb59b] text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Filo</span>
            </button>
          </div>
        </div>

        {/* MINIMALIST VECTOR DRAWING OF AN EDGE-BANDING ROLL (RUEDA DE FILO PARA MELAMINA) */}
        <div className="bg-[#141616] border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
          <svg
            viewBox="0 0 320 175"
            className="w-full max-w-[300px] h-40 overflow-visible"
          >
            {/* Subtle background measurement grid lines */}
            <line
              x1="15"
              y1="145"
              x2="305"
              y2="145"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            {/* Minimalist Isometric / Side Vector of Melamine Edge-Banding Wheel (Rueda de Filo) */}
            <g transform="translate(115, 82)">
              {/* Outer 3D depth rim of the tape roll */}
              <ellipse
                cx="8"
                cy="4"
                rx="60"
                ry="60"
                fill="none"
                stroke={activeRoll.swatchColor}
                strokeWidth="4"
                strokeOpacity="0.35"
              />

              {/* Outer Roll Circle */}
              <circle
                cx="0"
                cy="0"
                r="60"
                fill="#1b1d1d"
                stroke={activeRoll.swatchColor}
                strokeWidth="3.5"
              />

              {/* Concentric Minimalist Tape Layers inside the Wheel */}
              <circle
                cx="0"
                cy="0"
                r="52"
                fill="none"
                stroke="#e87a50"
                strokeWidth="1.5"
                strokeDasharray="180 40"
              />
              <circle
                cx="0"
                cy="0"
                r="44"
                fill="none"
                stroke={activeRoll.swatchColor}
                strokeWidth="1.4"
                strokeOpacity="0.75"
              />
              <circle
                cx="0"
                cy="0"
                r="36"
                fill="none"
                stroke="#ffb59b"
                strokeWidth="1.2"
                strokeDasharray="95 30"
                strokeOpacity="0.6"
              />
              <circle
                cx="0"
                cy="0"
                r="28"
                fill="none"
                stroke={activeRoll.swatchColor}
                strokeWidth="1.5"
                strokeOpacity="0.85"
              />

              {/* Inner Cardboard / ABS Spool Core (Núcleo de la Rueda) */}
              <circle
                cx="0"
                cy="0"
                r="19"
                fill="#121414"
                stroke="#e3e2e2"
                strokeWidth="2"
              />
              {/* Spool center spokes (minimalist geometric) */}
              <circle
                cx="0"
                cy="0"
                r="6"
                fill="none"
                stroke="#e87a50"
                strokeWidth="1.8"
              />
              <line x1="-19" y1="0" x2="-6" y2="0" stroke="#717171" strokeWidth="1.5" />
              <line x1="6" y1="0" x2="19" y2="0" stroke="#717171" strokeWidth="1.5" />
              <line x1="0" y1="-19" x2="0" y2="-6" stroke="#717171" strokeWidth="1.5" />
              <line x1="0" y1="6" x2="0" y2="19" stroke="#717171" strokeWidth="1.5" />

              {/* Unwinding Melamine Edge Tape Strip coming off bottom tangent */}
              <path
                d="M 0 60 L 145 60 L 155 47 L 18 47"
                fill={activeRoll.swatchColor}
                fillOpacity="0.28"
                stroke="#e87a50"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Minimalist grain/texture lines on the unwinding strip */}
              <line
                x1="40"
                y1="53.5"
                x2="138"
                y2="53.5"
                stroke="#ffb59b"
                strokeWidth="1.2"
                strokeDasharray="10 6"
              />

              {/* Dimension callout on the unwinding strip */}
              <text
                x="92"
                y="41"
                textAnchor="middle"
                fill="#ffb59b"
                fontSize="9.5"
                fontWeight="bold"
              >
                {activeRoll.widthThickSpec.split('•')[0].trim()}
              </text>
              <text
                x="92"
                y="74"
                textAnchor="middle"
                fill="#e3e2e2"
                fontSize="9"
                fontWeight="bold"
              >
                Rollo: {activeRoll.rollLengthMeters} m ({formatARS(pricePerMeterArs)}/m)
              </text>
            </g>
          </svg>

          <div className="w-full flex items-center justify-between text-[11px] font-semibold text-[#c8c6c5] mt-1 pt-2 border-t border-white/5">
            <span>
              Consumo del rollo:{' '}
              <strong className="text-white tabular-nums">
                {totalRequiredMeters} m / {totalBoughtMeters} m
              </strong>
            </span>
            <span className="text-[#ffb59b] font-bold tabular-nums">
              {rollUsedPercent}% utilizado
            </span>
          </div>
        </div>

        {/* Selected Roll Box with Edit & Delete Actions */}
        <div className="border border-[#56423c]/80 bg-[#1c1e1e] rounded-xl p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <span
                className="w-6 h-6 rounded-lg border border-white/25 shrink-0 mt-0.5"
                style={{ backgroundColor: activeRoll.swatchColor }}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold font-display text-white">
                    {activeRoll.name}
                  </h2>
                  <span className="bg-[#3d261e] text-[#ffb59b] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    SELECCIONADO
                  </span>
                </div>
                <p className="text-xs text-[#d0cecd] mt-0.5 font-medium">
                  {activeRoll.widthThickSpec}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => openEditRollModal(activeRoll)}
                title="Editar color, metros o precio del rollo"
                className="p-1.5 rounded-lg bg-[#292a2a] text-[#e3e2e2] hover:bg-[#e87a50] hover:text-[#121414] transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDeleteRoll(activeRoll.id)}
                title="Eliminar este color de filo"
                className="p-1.5 rounded-lg bg-[#292a2a] text-[#c8c6c5] hover:text-[#ffb4ab] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowRollDropdown((prev) => !prev)}
                title="Ver todos los rollos"
                className="p-1.5 rounded-lg bg-[#292a2a] text-[#ffb59b] cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {showRollDropdown && (
            <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
              {rolls.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                    r.id === activeRoll.id
                      ? 'bg-[#3d261e] text-[#ffb59b] font-bold'
                      : 'bg-[#161818] text-[#e3e2e2]'
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectRoll(r.id);
                      setShowRollDropdown(false);
                    }}
                    className="flex items-center gap-2 text-left flex-1 cursor-pointer"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: r.swatchColor }}
                    />
                    <div>
                      <div>{r.name}</div>
                      <div className="text-[10px] text-[#b7b5b4]">
                        {r.widthThickSpec} • Rollo {r.rollLengthMeters}m
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-bold text-white">
                      {formatARS(r.rollPriceArs)}
                    </span>
                    <button
                      onClick={() => openEditRollModal(r)}
                      className="p-1 text-[#c8c6c5] hover:text-white cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2 Subcards: Largo del Rollo & Precio del Rollo */}
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => openEditRollModal(activeRoll)}
            className="atelier-subcard rounded-xl p-3.5 cursor-pointer hover:border-white/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5]">
                MEDIDA ROLLO
              </span>
              <Pencil className="w-3 h-3 text-[#a1a1a1]" />
            </div>
            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {activeRoll.rollLengthMeters} Metros
            </div>
            <div className="text-[11px] text-[#c8c6c5] mt-1 tabular-nums">
              Despunte mín: {activeRoll.trimWasteMmPerSide}mm / lado
            </div>
          </div>

          <div
            onClick={() => openEditRollModal(activeRoll)}
            className="atelier-subcard rounded-xl p-3.5 cursor-pointer hover:border-white/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5]">
                PRECIO ROLLO
              </span>
              <Pencil className="w-3 h-3 text-[#ffb59b]" />
            </div>
            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {formatARS(activeRoll.rollPriceArs)}
            </div>
            <div className="inline-block bg-[#2d211d] text-[#ffb59b] text-[11px] font-bold px-2 py-0.5 rounded mt-1 tabular-nums">
              {formatARS(pricePerMeterArs)} / metro
            </div>
          </div>
        </div>
      </section>

      {/* CARD 2: RESUMEN DE GASTO DE FILO Y MÍNIMO DESPERDICIO */}
      <section className="atelier-card rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#ffb59b]">
              OPTIMIZACIÓN LINEAL DE FILO
            </div>
            <h2 className="text-lg font-bold font-display text-white">
              Gasto Exacto en Piezas
            </h2>
          </div>

          <span className="bg-[#2c1d17] border border-[#e87a50]/40 text-[#ffb59b] text-xs font-bold px-3 py-1 rounded-full tabular-nums">
            {rollsNeeded} {rollsNeeded === 1 ? 'Rollo' : 'Rollos'} ({totalBoughtMeters}m)
          </span>
        </div>

        {/* Highlight Box: Cuánto Gasto en las Piezas */}
        <div className="bg-[#241914] border border-[#e87a50]/50 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#ffb59b]">
              COSTO FILO CONSUMIDO EN PIEZAS
            </div>
            <div className="text-xs text-[#d8d6d5] mt-0.5">
              {totalRequiredMeters} m usados de {activeRoll.rollLengthMeters} m (incl. despunte mín.)
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-2xl font-extrabold font-display text-white tabular-nums">
              {formatARS(exactSpentOnPiecesArs)}
            </div>
            <div className="text-[10px] font-bold text-[#ffb59b] uppercase">
              ARS GASTADOS
            </div>
          </div>
        </div>

        {/* 2x2 Breakdown Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="atelier-subcard rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e3e2e2]">
              <Ruler className="w-3.5 h-3.5 text-[#e87a50]" />
              <span>Filo Neto Madera</span>
            </div>
            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {totalNetMeters} m
            </div>
            <div className="text-[11px] text-[#c8c6c5] tabular-nums">
              Suma exacta de cantos
            </div>
          </div>

          <div className="atelier-subcard rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e3e2e2]">
              <Scissors className="w-3.5 h-3.5 text-[#ffb59b]" />
              <span>Desperdicio Mín.</span>
            </div>
            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {totalWasteMeters} m
            </div>
            <div className="text-[11px] text-[#c8c6c5] tabular-nums">
              Refilado ({activeRoll.trimWasteMmPerSide}mm/pasada)
            </div>
          </div>

          <div className="atelier-subcard rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e3e2e2]">
              <Zap className="w-3.5 h-3.5 text-[#37d67a]" />
              <span>Filo Sobrante</span>
            </div>
            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {remainingRollMeters} m
            </div>
            <div className="text-[11px] text-[#c8c6c5] tabular-nums">
              Quedan en la rueda
            </div>
          </div>

          <div className="atelier-subcard rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#e3e2e2]">
              <Banknote className="w-3.5 h-3.5 text-[#ffb59b]" />
              <span>Valor Sobrante</span>
            </div>
            <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
              {formatARS(remainingRollMeters * pricePerMeterArs)}
            </div>
            <div className="text-[11px] text-[#c8c6c5]">
              ARS p/ próximos muebles
            </div>
          </div>
        </div>

        {/* Breakdown by Edge Type (PVC 0.45mm vs ABS 2.0mm) */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5] flex items-center justify-between">
            <span>Desglose por Espesor / Tipo de Canto</span>
            <span className="text-[#ffb59b]">PVC 0.45mm vs ABS 2.0mm</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* PVC 0.45mm */}
            <div className="p-2.5 rounded-xl bg-[#1a1c1c] border border-white/10 space-y-1">
              <div className="flex items-center justify-between font-bold text-white">
                <span className="text-[#a5d6a7]">PVC 0.45 mm</span>
                <span className="tabular-nums">{pvc045Meters} m</span>
              </div>
              <p className="text-[10px] text-[#b7b5b4]">
                Interiores & fajas • {formatARS(pricePerMeterArs)}/m
              </p>
              <div className="text-right text-[11px] font-bold text-[#e3e2e2] tabular-nums pt-0.5">
                Subtotal: {formatARS(pvc045CostArs)}
              </div>
            </div>

            {/* ABS 2.0mm */}
            <div className="p-2.5 rounded-xl bg-[#2a1e18] border border-[#e87a50]/30 space-y-1">
              <div className="flex items-center justify-between font-bold text-white">
                <span className="text-[#ffb59b]">ABS 2.0 mm</span>
                <span className="tabular-nums">{abs2mmMeters} m</span>
              </div>
              <p className="text-[10px] text-[#b7b5b4]">
                Frentes y tapas • {formatARS(absPricePerMeterArs)}/m
              </p>
              <div className="text-right text-[11px] font-bold text-[#ffb59b] tabular-nums pt-0.5">
                Subtotal: {formatARS(abs2mmCostArs)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: PIEZAS DE MADERA A CANTEAR */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold font-display text-white">
              Piezas de Madera
            </h2>
            <span className="bg-[#34221c] text-[#ffb59b] text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums">
              {pieces.reduce((a, b) => a + b.quantity, 0)} uds
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onResetPieces}
              title="Reiniciar todas las piezas y consumo de filo a 0 absoluto"
              className="h-8 px-2.5 rounded-lg bg-[#271e1a] hover:bg-[#34241d] border border-[#e87a50]/70 text-[#ffb59b] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3 h-3 text-[#ffb59b]" />
              <span>Reiniciar</span>
            </button>

            <button
              onClick={openNewPieceModal}
              className="h-8 px-2.5 rounded-lg bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Pieza</span>
            </button>
          </div>
        </div>

        {pieces.length === 0 ? (
          <div className="atelier-card rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#271e1a] border border-[#e87a50]/40 flex items-center justify-center text-[#ffb59b]">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Calculador de Filo en 0 Absoluto
              </h3>
              <p className="text-xs text-[#c8c6c5] mt-1">
                No hay ninguna pieza cargada (0 m consumidos • $0 gastados). Agrega piezas de madera para calcular el filo.
              </p>
            </div>
            <div className="flex items-center justify-center pt-1">
              <button
                onClick={openNewPieceModal}
                className="px-4 py-2.5 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar Primera Pieza p/ Filo</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pieceCalculations.map(({ piece, totalMeters, costArs }, idx) => (
              <div
                key={piece.id}
                className="atelier-card rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#3c241b] text-[#ffb59b] text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                      {idx + 1}
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

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="bg-[#252727] text-[#ffb59b] text-xs font-bold px-2.5 py-1 rounded-lg tabular-nums">
                      {formatARS(costArs)} ({totalMeters.toFixed(2)}m)
                    </div>
                    <button
                      onClick={() => openEditPieceModal(piece)}
                      className="p-1.5 rounded-lg bg-[#252727] text-[#e3e2e2] hover:bg-[#e87a50] hover:text-[#121414] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletePiece(piece.id)}
                      className="p-1.5 rounded-lg bg-[#252727] text-[#c8c6c5] hover:text-[#ffb4ab] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dimensions & Interactive Sides Toggles */}
                <div className="bg-[#202222] rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white tabular-nums">
                      Medida: {piece.lengthMm} × {piece.widthMm} mm
                    </span>
                    <span className="text-[#ffb59b] font-semibold tabular-nums">
                      {piece.longSidesCount} Largo(s) + {piece.shortSidesCount} Prof.(s)
                    </span>
                  </div>

                  {/* Quick Side Buttons (1L, 2L, 1P, 2P, 4 Lados) */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() =>
                        onUpdatePiece(piece.id, {
                          longSidesCount: 1,
                          shortSidesCount: 0,
                        })
                      }
                      className={`py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        piece.longSidesCount === 1 && piece.shortSidesCount === 0
                          ? 'bg-[#e87a50] text-[#121414] border-[#e87a50]'
                          : 'bg-[#161818] text-[#c8c6c5] border-white/10'
                      }`}
                    >
                      1 Largo
                    </button>
                    <button
                      onClick={() =>
                        onUpdatePiece(piece.id, {
                          longSidesCount: 2,
                          shortSidesCount: 0,
                        })
                      }
                      className={`py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        piece.longSidesCount === 2 && piece.shortSidesCount === 0
                          ? 'bg-[#e87a50] text-[#121414] border-[#e87a50]'
                          : 'bg-[#161818] text-[#c8c6c5] border-white/10'
                      }`}
                    >
                      2 Largos
                    </button>
                    <button
                      onClick={() =>
                        onUpdatePiece(piece.id, {
                          longSidesCount: 1,
                          shortSidesCount: 1,
                        })
                      }
                      className={`py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        piece.longSidesCount === 1 && piece.shortSidesCount === 1
                          ? 'bg-[#e87a50] text-[#121414] border-[#e87a50]'
                          : 'bg-[#161818] text-[#c8c6c5] border-white/10'
                      }`}
                    >
                      1L + 1P
                    </button>
                    <button
                      onClick={() =>
                        onUpdatePiece(piece.id, {
                          longSidesCount: 2,
                          shortSidesCount: 2,
                        })
                      }
                      className={`py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        piece.longSidesCount === 2 && piece.shortSidesCount === 2
                          ? 'bg-[#e87a50] text-[#121414] border-[#e87a50]'
                          : 'bg-[#161818] text-[#c8c6c5] border-white/10'
                      }`}
                    >
                      4 Lados
                    </button>
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#c8c6c5] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#ffb59b]" />
                    <span>Cantidad de piezas iguales:</span>
                  </span>

                  <div className="flex items-center gap-3 bg-[#202222] border border-white/10 rounded-full px-2.5 py-1">
                    <button
                      onClick={() =>
                        onUpdatePiece(piece.id, {
                          quantity: Math.max(1, piece.quantity - 1),
                        })
                      }
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-white min-w-[16px] text-center tabular-nums">
                      {piece.quantity}
                    </span>
                    <button
                      onClick={() =>
                        onUpdatePiece(piece.id, { quantity: piece.quantity + 1 })
                      }
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onResetPieces}
            className="h-12 rounded-xl bg-[#271e1a] hover:bg-[#34241d] border border-[#e87a50]/60 text-[#ffb59b] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <RotateCcw className="w-4 h-4 text-[#e87a50]" />
            <span>Reiniciar Filo</span>
          </button>

          <button
            onClick={openNewPieceModal}
            className="h-12 rounded-xl bg-[#e3e2e2] hover:bg-white text-[#121414] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>+ Agregar Pieza</span>
          </button>
        </div>
      </section>

      {/* MODAL 1: AGREGAR / EDITAR ROLLO DE FILO */}
      {showRollModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                {editingRollId
                  ? 'Editar Rollo / Color de Filo'
                  : 'Agregar Nuevo Color de Filo'}
              </h3>
              <button
                onClick={() => setShowRollModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoll} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Color / Nombre del Filo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Filo Paraíso / Filo PVC Blanco"
                  value={rollName}
                  onChange={(e) => setRollName(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2 text-xs font-semibold text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Tono Visual de la Rueda
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {FILO_SWATCHES.map((sw) => (
                    <button
                      type="button"
                      key={sw.hex}
                      onClick={() => {
                        setRollHex(sw.hex);
                        if (!rollName) setRollName(`Filo ${sw.name}`);
                      }}
                      className={`p-2 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                        rollHex === sw.hex
                          ? 'bg-[#3d261e] border-[#e87a50] text-white'
                          : 'bg-[#222424] border-white/10 text-[#c8c6c5]'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/30 shrink-0"
                        style={{ backgroundColor: sw.hex }}
                      />
                      <span className="truncate">{sw.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Ancho y Espesor (ej. 22mm × 0.45mm o 45mm × 2mm)
                </label>
                <input
                  type="text"
                  value={rollSpec}
                  onChange={(e) => setRollSpec(e.target.value)}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Metros Rollo
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={rollLengthM}
                    onChange={(e) => setRollLengthM(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#ffb59b] mb-1">
                    Precio (ARS)
                  </label>
                  <input
                    type="number"
                    value={rollPrice}
                    onChange={(e) => setRollPrice(e.target.value)}
                    className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Despunte mm
                  </label>
                  <input
                    type="number"
                    value={rollTrimMm}
                    onChange={(e) => setRollTrimMm(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRollModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                >
                  Guardar Filo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AGREGAR / EDITAR PIEZA DE MADERA PARA FILO */}
      {showPieceModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                {editingPieceId
                  ? 'Editar Pieza de Madera'
                  : 'Nueva Pieza p/ Calcular Filo'}
              </h3>
              <button
                onClick={() => setShowPieceModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePiece} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                  Nombre de la Pieza
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Puerta Alacena / Tapa Escritorio"
                  value={pieceName}
                  onChange={(e) => setPieceName(e.target.value)}
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
                    value={pieceLen}
                    onChange={(e) => setPieceLen(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Profundidad (mm)
                  </label>
                  <input
                    type="number"
                    value={pieceWid}
                    onChange={(e) => setPieceWid(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={pieceQty}
                    onChange={(e) => setPieceQty(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Cantos en el Largo
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {([0, 1, 2] as const).map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setPieceLongSides(n)}
                        className={`py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                          pieceLongSides === n
                            ? 'bg-[#e87a50] text-[#121414] border-[#e87a50]'
                            : 'bg-[#222424] text-[#c8c6c5] border-white/10'
                        }`}
                      >
                        {n}L
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Cantos en Profundidad
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {([0, 1, 2] as const).map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setPieceShortSides(n)}
                        className={`py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                          pieceShortSides === n
                            ? 'bg-[#e87a50] text-[#121414] border-[#e87a50]'
                            : 'bg-[#222424] text-[#c8c6c5] border-white/10'
                        }`}
                      >
                        {n}P
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPieceModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                >
                  Guardar Pieza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
