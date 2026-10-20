import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Puzzle,
  Settings,
  Plus,
  Save,
  FileText,
  Trash2,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import { formatARS } from '../data/initialData';
import { InventoryItem, CutPiece } from '../types/atelier';

export interface PresupuestoPiece {
  id: string;
  name: string;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  quantity: number;
  materialNote?: string;
  costArs: number;
}

export interface PresupuestoHardware {
  id: string;
  name: string;
  quantity: number;
  unitPriceArs: number;
  iconKind: 'hinge' | 'handle' | 'generic';
}

interface ScreenPresupuestoProps {
  onBack: () => void;
  inventoryItems?: InventoryItem[];
  onSendPiecesToGuillotine?: (pieces: Omit<CutPiece, 'id' | 'numberLabel'>[]) => void;
  onShowToast: (msg: string) => void;
}

const INITIAL_PRESUPUESTO_PIECES: PresupuestoPiece[] = [
  {
    id: 'pz-techo',
    name: 'Techo',
    lengthMm: 500,
    widthMm: 400,
    thicknessMm: 18,
    quantity: 1,
    materialNote: 'Melamina roble',
    costArs: 11500,
  },
  {
    id: 'pz-piso',
    name: 'Piso',
    lengthMm: 500,
    widthMm: 400,
    thicknessMm: 18,
    quantity: 1,
    costArs: 11500,
  },
  {
    id: 'pz-lat-izq',
    name: 'Lateral Izq',
    lengthMm: 500,
    widthMm: 450,
    thicknessMm: 18,
    quantity: 1,
    costArs: 12750,
  },
  {
    id: 'pz-lat-der',
    name: 'Lateral Der',
    lengthMm: 500,
    widthMm: 450,
    thicknessMm: 18,
    quantity: 1,
    costArs: 12750,
  },
];

const INITIAL_PRESUPUESTO_HARDWARE: PresupuestoHardware[] = [
  {
    id: 'hw-bisagras',
    name: 'Bisagras ocultas 35mm',
    quantity: 4,
    unitPriceArs: 1200,
    iconKind: 'hinge',
  },
  {
    id: 'hw-tirador',
    name: 'Tirador aluminio negro',
    quantity: 2,
    unitPriceArs: 850,
    iconKind: 'handle',
  },
];

export const ScreenPresupuesto: React.FC<ScreenPresupuestoProps> = ({
  onBack,
  inventoryItems = [],
  onSendPiecesToGuillotine,
  onShowToast,
}) => {
  const [pieces, setPieces] = useState<PresupuestoPiece[]>(() => {
    try {
      const saved = localStorage.getItem('mjl_presupuesto_pieces');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PRESUPUESTO_PIECES;
  });

  const [hardware, setHardware] = useState<PresupuestoHardware[]>(() => {
    try {
      const saved = localStorage.getItem('mjl_presupuesto_hw');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PRESUPUESTO_HARDWARE;
  });

  const [manoDeObraArs, setManoDeObraArs] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mjl_presupuesto_mano_obra');
      if (saved) return JSON.parse(saved);
    } catch {}
    return 12000;
  });

  // Quick 3-input add piece state (Largo mm, Ancho mm, Espesor mm)
  const [quickLength, setQuickLength] = useState<string>('');
  const [quickWidth, setQuickWidth] = useState<string>('');
  const [quickThickness, setQuickThickness] = useState<string>('18');
  const [quickName, setQuickName] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState<boolean>(false);
  const [highlightedPart, setHighlightedPart] = useState<string | null>(null);

  // Add / Edit Hardware modal state
  const [showHwModal, setShowHwModal] = useState<boolean>(false);
  const [hwName, setHwName] = useState<string>('');
  const [hwQty, setHwQty] = useState<string>('1');
  const [hwPrice, setHwPrice] = useState<string>('1200');
  const [editingLabor, setEditingLabor] = useState<boolean>(false);
  const [laborInput, setLaborInput] = useState<string>(String(manoDeObraArs));

  // PDF Preview Modal state
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);

  // Cost calculations:
  // Default 4 pieces sum exactly to $48.500 (11500 + 11500 + 12750 + 12750 = 48500)
  const costoPlacas = pieces.reduce(
    (sum, p) => sum + p.costArs * p.quantity,
    0
  );

  // Base hardware cost: 4 * 1200 (4800) + 2 * 850 (1700) = $6.500
  const costoHerrajes = hardware.reduce(
    (sum, h) => sum + h.unitPriceArs * h.quantity,
    0
  );

  const totalPresupuesto = costoPlacas + costoHerrajes + manoDeObraArs;
  const totalDefinedPieces = pieces.reduce((acc, p) => acc + p.quantity, 0);

  const handleQuickAddPiece = () => {
    const l = parseInt(quickLength, 10) || 500;
    const w = parseInt(quickWidth, 10) || 400;
    const t = parseInt(quickThickness, 10) || 18;
    const areaM2 = (l * w) / 1_000_000;
    const estimatedCost = Math.max(2500, Math.round(areaM2 * 57500));

    const newPiece: PresupuestoPiece = {
      id: `pz-${Date.now()}`,
      name: quickName.trim() || `Pieza #${pieces.length + 1}`,
      lengthMm: l,
      widthMm: w,
      thicknessMm: t,
      quantity: 1,
      materialNote: t === 18 ? 'Melamina roble' : `Espesor ${t}mm`,
      costArs: estimatedCost,
    };

    setPieces((prev) => [...prev, newPiece]);
    setQuickLength('');
    setQuickWidth('');
    setQuickName('');
    setShowNameInput(false);
    onShowToast(
      `Pieza agregada: ${newPiece.name} (${l} × ${w} × ${t} mm)`
    );
  };

  const handleRemovePiece = (id: string) => {
    setPieces((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddHardware = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Math.max(1, parseInt(hwQty, 10) || 1);
    const price = Math.max(0, parseInt(hwPrice, 10) || 0);
    const nameClean = hwName.trim() || 'Herraje adicional';
    const isHinge = nameClean.toLowerCase().includes('bisagra');

    const newHw: PresupuestoHardware = {
      id: `hw-${Date.now()}`,
      name: nameClean,
      quantity: qty,
      unitPriceArs: price,
      iconKind: isHinge ? 'hinge' : 'handle',
    };

    setHardware((prev) => [...prev, newHw]);
    setHwName('');
    setHwQty('1');
    setHwPrice('1200');
    setShowHwModal(false);
    onShowToast(`Herraje agregado: ${newHw.name} (×${qty})`);
  };

  const handleRemoveHardware = (id: string) => {
    setHardware((prev) => prev.filter((h) => h.id !== id));
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem('mjl_presupuesto_pieces', JSON.stringify(pieces));
      localStorage.setItem('mjl_presupuesto_hw', JSON.stringify(hardware));
      localStorage.setItem(
        'mjl_presupuesto_mano_obra',
        JSON.stringify(manoDeObraArs)
      );
    } catch {}
    onShowToast(
      `💾 Borrador guardado (${totalDefinedPieces} piezas • Total ${formatARS(
        totalPresupuesto
      )})`
    );
  };

  const handleResetDefaultValues = () => {
    setPieces(INITIAL_PRESUPUESTO_PIECES);
    setHardware(INITIAL_PRESUPUESTO_HARDWARE);
    setManoDeObraArs(12000);
    onShowToast('Valores iniciales del presupuesto restaurados ($67.000)');
  };

  return (
    <div className="space-y-3 pb-4">
      {/* HEADER: Back Arrow + Title "Nuevo Presupuesto" */}
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

        <button
          type="button"
          onClick={handleResetDefaultValues}
          className="text-[10px] font-bold text-[#a1a1a1] hover:text-[#ffb59b] px-2 py-1 rounded-lg bg-[#1a1c1c] border border-white/5 cursor-pointer transition-colors"
        >
          Restaurar base
        </button>
      </div>

      {/* 3. CONTENIDO PRINCIPAL (2 Columnas estilo captura / adaptable) */}
      <div className="grid grid-cols-12 gap-2.5 items-stretch">
        {/* COLUMNA IZQUIERDA: Cubo Isométrico Parcialmente Armado (Sin aletas superiores) */}
        <div className="col-span-5 bg-[#161818] rounded-2xl border border-[#e87a50]/35 p-2.5 flex flex-col justify-between shadow-[0_0_25px_rgba(232,122,80,0.08)]">
          <div className="flex-1 flex items-center justify-center py-2">
            {/* SVG ISOMETRIC FLUSH CUBE (Techo, Piso y Laterales en Roble Claro, Frente en contorno gris sin relleno, sin partes sobresalientes arriba) */}
            <svg
              viewBox="0 0 220 240"
              className="w-full h-auto max-h-[250px] overflow-visible select-none"
            >
              <defs>
                {/* Soft Copper/Orange Outer Glow obeying app colors */}
                <filter
                  id="cubeSoftCopperGlow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="5"
                    floodColor="#e87a50"
                    floodOpacity="0.65"
                  />
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="10"
                    floodColor="#ffb59b"
                    floodOpacity="0.28"
                  />
                </filter>

                {/* Light Oak Wood Gradients (Madera Clara Tipo Roble) */}
                <linearGradient id="oakTopFace" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#dfbe99" />
                  <stop offset="50%" stopColor="#cfa77d" />
                  <stop offset="100%" stopColor="#be9266" />
                </linearGradient>

                <linearGradient id="oakRightFace" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c89f74" />
                  <stop offset="60%" stopColor="#b4885c" />
                  <stop offset="100%" stopColor="#9f7348" />
                </linearGradient>

                <linearGradient id="oakFloorFace" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d4ad84" />
                  <stop offset="100%" stopColor="#b88c61" />
                </linearGradient>

                <linearGradient id="oakInnerLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a67c52" />
                  <stop offset="100%" stopColor="#855f3a" />
                </linearGradient>

                <linearGradient id="oakEdgeLight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ebd0b3" />
                  <stop offset="100%" stopColor="#c79c71" />
                </linearGradient>
              </defs>

              {/* OUTER SILHOUETTE GLOW LAYER (Pure Flush Cube - No top wings) */}
              <polygon
                points="92,24 196,76 196,178 126,218 22,166 22,64"
                fill="none"
                stroke="#e87a50"
                strokeWidth="2.4"
                strokeLinejoin="round"
                filter="url(#cubeSoftCopperGlow)"
              />

              {/* DARK INTERIOR CAVITY BACKING */}
              <polygon
                points="22,64 92,24 196,76 196,178 126,218 22,166"
                fill="#111313"
              />

              {/* 1. LATERAL IZQUIERDO (Left Side Board - partially visible inside & left edge) */}
              <g
                className="transition-opacity duration-200"
                style={{
                  opacity:
                    highlightedPart && highlightedPart !== 'pz-lat-izq'
                      ? 0.55
                      : 1,
                }}
              >
                {/* Inner visible wall of Lateral Izquierdo */}
                <polygon
                  points="30,68 92,32 92,126 30,162"
                  fill="url(#oakInnerLeft)"
                  stroke="#5e4126"
                  strokeWidth="1"
                />
                {/* Subtle vertical wood grain on inner left wall */}
                <line
                  x1="48"
                  y1="58"
                  x2="48"
                  y2="151"
                  stroke="#704e2e"
                  strokeWidth="0.7"
                  opacity="0.6"
                />
                <line
                  x1="68"
                  y1="46"
                  x2="68"
                  y2="139"
                  stroke="#704e2e"
                  strokeWidth="0.7"
                  opacity="0.6"
                />
                {/* Left Front 18mm Thickness Edge (Grey contour + subtle oak core) */}
                <polygon
                  points="22,64 30,68 30,162 22,166"
                  fill="url(#oakEdgeLight)"
                  stroke="#8b8e8e"
                  strokeWidth="1.2"
                />
              </g>

              {/* 2. PISO (Bottom Board - 500x400x18mm colored in light oak) */}
              <g
                className="transition-opacity duration-200"
                style={{
                  opacity:
                    highlightedPart && highlightedPart !== 'pz-piso' ? 0.55 : 1,
                }}
              >
                {/* Upper surface of Piso inside the cube */}
                <polygon
                  points="30,154 92,118 188,166 126,202"
                  fill="url(#oakFloorFace)"
                  stroke="#6e4d2e"
                  strokeWidth="1"
                />
                {/* Wood grain lines on Piso */}
                <line
                  x1="48"
                  y1="162"
                  x2="108"
                  y2="127"
                  stroke="#9c7248"
                  strokeWidth="0.8"
                  opacity="0.55"
                />
                <line
                  x1="74"
                  y1="175"
                  x2="134"
                  y2="140"
                  stroke="#9c7248"
                  strokeWidth="0.8"
                  opacity="0.55"
                />
                <line
                  x1="100"
                  y1="188"
                  x2="160"
                  y2="153"
                  stroke="#9c7248"
                  strokeWidth="0.8"
                  opacity="0.55"
                />
                {/* Front 18mm edge of Piso */}
                <polygon
                  points="22,158 126,210 126,218 22,166"
                  fill="url(#oakEdgeLight)"
                  stroke="#8b8e8e"
                  strokeWidth="1.2"
                />
              </g>

              {/* 3. TECHO (Top Board - FLUSH CUBE ROOF, no protruding side flaps!) */}
              <g
                className="transition-opacity duration-200"
                style={{
                  opacity:
                    highlightedPart && highlightedPart !== 'pz-techo'
                      ? 0.55
                      : 1,
                }}
              >
                {/* Top outer oak face of Techo */}
                <polygon
                  points="22,64 92,24 196,76 126,116"
                  fill="url(#oakTopFace)"
                  stroke="#6e4d2e"
                  strokeWidth="1.2"
                />
                {/* Oak grain lines along Techo */}
                <line
                  x1="42"
                  y1="73"
                  x2="112"
                  y2="33"
                  stroke="#ab8054"
                  strokeWidth="0.85"
                  opacity="0.55"
                />
                <line
                  x1="66"
                  y1="85"
                  x2="136"
                  y2="45"
                  stroke="#ab8054"
                  strokeWidth="0.85"
                  opacity="0.55"
                />
                <line
                  x1="92"
                  y1="98"
                  x2="162"
                  y2="58"
                  stroke="#ab8054"
                  strokeWidth="0.85"
                  opacity="0.55"
                />
                <line
                  x1="112"
                  y1="108"
                  x2="182"
                  y2="68"
                  stroke="#ab8054"
                  strokeWidth="0.85"
                  opacity="0.55"
                />
                {/* Front-left 18mm thickness edge of Techo */}
                <polygon
                  points="22,64 126,116 126,125 22,73"
                  fill="url(#oakEdgeLight)"
                  stroke="#8b8e8e"
                  strokeWidth="1.1"
                />
              </g>

              {/* 4. LATERAL DERECHO (Right Side Board - Flush with Techo & Piso) */}
              <g
                className="transition-opacity duration-200"
                style={{
                  opacity:
                    highlightedPart && highlightedPart !== 'pz-lat-der'
                      ? 0.55
                      : 1,
                }}
              >
                {/* Outer Right Face in Light Oak */}
                <polygon
                  points="126,116 196,76 196,178 126,218"
                  fill="url(#oakRightFace)"
                  stroke="#6e4d2e"
                  strokeWidth="1.2"
                />
                {/* Subtle vertical oak wood grain lines on Lateral Derecho */}
                <line
                  x1="142"
                  y1="108"
                  x2="142"
                  y2="208"
                  stroke="#8c6239"
                  strokeWidth="0.85"
                  opacity="0.5"
                />
                <line
                  x1="160"
                  y1="97"
                  x2="160"
                  y2="198"
                  stroke="#8c6239"
                  strokeWidth="0.85"
                  opacity="0.5"
                />
                <line
                  x1="178"
                  y1="87"
                  x2="178"
                  y2="188"
                  stroke="#8c6239"
                  strokeWidth="0.85"
                  opacity="0.5"
                />
                {/* Front 18mm edge of Lateral Derecho */}
                <polygon
                  points="118,121 126,116 126,218 118,214"
                  fill="url(#oakEdgeLight)"
                  stroke="#8b8e8e"
                  strokeWidth="1"
                />
              </g>

              {/* 5. FRENTE EN CONTORNO GRIS (SIN RELLENO - Unassembled front face wireframe) */}
              <g pointerEvents="none">
                {/* Outer grey contour of the open front face */}
                <polygon
                  points="22,64 126,116 126,218 22,166"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                {/* Inner grey contour of the front opening (unfilled front cavity) */}
                <polygon
                  points="30,73 118,117 118,206 30,162"
                  fill="none"
                  stroke="#71717a"
                  strokeWidth="1.3"
                  strokeDasharray="4 3"
                />
              </g>
            </svg>
          </div>

          {/* Bottom Check + "4 piezas definidas" */}
          <div className="pt-2 pb-1 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#e87a50] shrink-0" />
            <span className="text-xs font-bold text-[#ffb59b]">
              {pieces.length} {pieces.length === 1 ? 'pieza definida' : 'piezas definidas'}
            </span>
          </div>
        </div>

        {/* COLUMNA DERECHA: Tarjeta "Piezas / Cortes" + Tarjeta "Herrajes" */}
        <div className="col-span-7 flex flex-col gap-2.5">
          {/* TARJETA 1: PIEZAS / CORTES */}
          <div className="bg-[#161818] rounded-2xl border border-[#e87a50]/35 p-3 space-y-2.5 shadow-[0_0_20px_rgba(232,122,80,0.06)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Puzzle className="w-4 h-4 text-[#e87a50] fill-[#e87a50]/20 shrink-0" />
                <h2 className="text-sm font-extrabold font-display text-white">
                  Piezas / Cortes
                </h2>
              </div>
              {onSendPiecesToGuillotine && (
                <button
                  type="button"
                  onClick={() => {
                    onSendPiecesToGuillotine(
                      pieces.map((p) => ({
                        name: p.name,
                        subtitle: p.materialNote || 'Presupuesto Cubo J&L',
                        widthMm: p.lengthMm,
                        heightMm: p.widthMm,
                        quantity: p.quantity,
                        unitPriceArs: p.costArs,
                        edgesLabel: 'Sin Tapacantos',
                        edgesType: '0L',
                        allowRotation: true,
                        mandatoryGrain: false,
                      }))
                    );
                  }}
                  title="Enviar estas piezas a la Guillotina 2D"
                  className="text-[10px] font-bold text-[#ffb59b] hover:text-white bg-[#261c18] border border-[#e87a50]/40 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                >
                  A Sierra 2D
                </button>
              )}
            </div>

            {/* Lista de Piezas */}
            <div className="space-y-2 max-h-[195px] overflow-y-auto pr-0.5">
              {pieces.map((piece) => (
                <div
                  key={piece.id}
                  onMouseEnter={() => setHighlightedPart(piece.id)}
                  onMouseLeave={() => setHighlightedPart(null)}
                  className="flex items-center justify-between gap-1.5 group rounded-lg p-1 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Oak wood swatch thumbnail */}
                    <div
                      className="w-6 h-6 rounded-md shrink-0 border border-white/20 shadow-inner"
                      style={{
                        background:
                          'linear-gradient(135deg, #dfbe99 0%, #c89d70 55%, #b08254 100%)',
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white leading-tight truncate">
                        {piece.name}
                      </div>
                      <div className="text-[10px] text-[#c8c6c5] leading-tight truncate tabular-nums">
                        {piece.lengthMm} × {piece.widthMm} × {piece.thicknessMm} mm · Cant:{' '}
                        {piece.quantity}
                        {piece.materialNote ? ` · ${piece.materialNote}` : ''}
                      </div>
                    </div>
                  </div>

                  {pieces.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePiece(piece.id)}
                      title="Quitar pieza"
                      className="opacity-60 group-hover:opacity-100 p-1 text-[#a1a1a1] hover:text-[#ffb4ab] cursor-pointer shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Botón con borde punteado "+ Agregar pieza" */}
            <button
              type="button"
              onClick={() => setShowNameInput((prev) => !prev)}
              className="w-full py-1.5 px-2.5 rounded-xl border border-dashed border-[#e87a50]/70 hover:border-[#e87a50] bg-[#1e1917]/60 hover:bg-[#281e1a] text-[#ffb59b] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#e87a50] stroke-[2.5]" />
              <span>Agregar pieza</span>
            </button>

            {showNameInput && (
              <input
                type="text"
                placeholder="Nombre pieza (ej. Estante o Divisorio)"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="w-full bg-[#202222] border border-[#e87a50]/40 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#e87a50]"
              />
            )}

            {/* Tres campos pequeños (Largo mm, Ancho mm, Espesor mm) + botón "+" */}
            <div className="grid grid-cols-10 gap-1.5 items-stretch pt-0.5">
              <div className="col-span-3">
                <input
                  type="number"
                  placeholder="Largo (mm)"
                  value={quickLength}
                  onChange={(e) => setQuickLength(e.target.value)}
                  className="w-full h-9 bg-[#1d1f1f] border border-white/15 rounded-xl px-1.5 text-[10px] text-center font-semibold text-white placeholder:text-[#9a9a9a] focus:outline-none focus:border-[#e87a50] tabular-nums"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="number"
                  placeholder="Ancho (mm)"
                  value={quickWidth}
                  onChange={(e) => setQuickWidth(e.target.value)}
                  className="w-full h-9 bg-[#1d1f1f] border border-white/15 rounded-xl px-1.5 text-[10px] text-center font-semibold text-white placeholder:text-[#9a9a9a] focus:outline-none focus:border-[#e87a50] tabular-nums"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  placeholder="Espesor"
                  value={quickThickness}
                  onChange={(e) => setQuickThickness(e.target.value)}
                  title="Espesor (mm)"
                  className="w-full h-9 bg-[#1d1f1f] border border-white/15 rounded-xl px-1 text-[10px] text-center font-semibold text-white placeholder:text-[#9a9a9a] focus:outline-none focus:border-[#e87a50] tabular-nums"
                />
              </div>
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={handleQuickAddPiece}
                  title="Sumar pieza al presupuesto"
                  className="w-full h-9 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] active:scale-95 text-[#121414] flex items-center justify-center shadow-md cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.8]" />
                </button>
              </div>
            </div>
          </div>

          {/* TARJETA 2: HERRAJES */}
          <div className="bg-[#161818] rounded-2xl border border-[#e87a50]/35 p-3 space-y-2.5 shadow-[0_0_20px_rgba(232,122,80,0.06)]">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <Settings className="w-4 h-4 text-[#e87a50] shrink-0" />
              <h2 className="text-sm font-extrabold font-display text-white">
                Herrajes
              </h2>
            </div>

            <div className="space-y-2">
              {hardware.map((hw) => (
                <div
                  key={hw.id}
                  className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/5 last:border-none last:pb-0 group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Custom Vector Icon for Hinge / Handle matching reference image */}
                    {hw.iconKind === 'hinge' ? (
                      <div className="w-6 h-6 rounded-md bg-[#261c18] border border-[#e87a50]/50 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#e87a50]">
                          <rect
                            x="3"
                            y="4"
                            width="7"
                            height="16"
                            rx="1.5"
                            fill="currentColor"
                            opacity="0.85"
                          />
                          <rect
                            x="14"
                            y="4"
                            width="7"
                            height="16"
                            rx="1.5"
                            fill="currentColor"
                            opacity="0.85"
                          />
                          <line
                            x1="12"
                            y1="3"
                            x2="12"
                            y2="21"
                            stroke="#ffb59b"
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-[#222424] border border-white/15 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#c8c6c5]">
                          <path
                            d="M4 15 L20 9 M6 14 L6 18 M18 10 L18 14"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-white leading-tight truncate">
                        {hw.name}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#c8c6c5] mt-0.5 tabular-nums">
                        <span>Cant: {hw.quantity}</span>
                        <span className="font-semibold text-[#e3e2e2]">
                          {formatARS(hw.unitPriceArs)} c/u
                        </span>
                      </div>
                    </div>
                  </div>

                  {hardware.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveHardware(hw.id)}
                      className="opacity-60 group-hover:opacity-100 p-1 text-[#a1a1a1] hover:text-[#ffb4ab] cursor-pointer shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowHwModal(true)}
              className="w-full py-1.5 px-3 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.8]" />
              <span>Agregar herraje</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. RESUMEN DE COSTOS (Tarjeta Inferior Destacada) */}
      <div className="bg-[#161818] rounded-2xl border border-[#e87a50]/45 p-3.5 shadow-[0_0_24px_rgba(232,122,80,0.08)]">
        <div className="grid grid-cols-2 divide-x divide-white/10">
          {/* Left Column of Costs: Costo placas + Mano de obra */}
          <div className="pr-3 space-y-2.5">
            <div className="border-b border-white/10 pb-2">
              <div className="text-xs text-[#c8c6c5] font-medium">
                Costo placas
              </div>
              <div className="text-lg font-extrabold text-[#e87a50] tabular-nums leading-tight mt-0.5">
                {formatARS(costoPlacas)}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#c8c6c5] font-medium">
                  Mano de obra
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLaborInput(String(manoDeObraArs));
                    setEditingLabor((prev) => !prev);
                  }}
                  className="text-[#a1a1a1] hover:text-[#ffb59b] cursor-pointer"
                  title="Editar mano de obra"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
              {editingLabor ? (
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    value={laborInput}
                    onChange={(e) => setLaborInput(e.target.value)}
                    className="w-24 bg-[#222424] border border-[#e87a50] rounded-lg px-2 py-0.5 text-xs font-bold text-white tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.max(0, parseInt(laborInput, 10) || 0);
                      setManoDeObraArs(val);
                      setEditingLabor(false);
                    }}
                    className="p-1 rounded-lg bg-[#e87a50] text-[#121414] cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="text-lg font-extrabold text-[#e87a50] tabular-nums leading-tight mt-0.5">
                  {formatARS(manoDeObraArs)}
                </div>
              )}
            </div>
          </div>

          {/* Right Column of Costs: Costo herrajes + TOTAL */}
          <div className="pl-3 flex flex-col justify-between">
            <div className="border-b border-white/10 pb-2">
              <div className="text-xs text-[#c8c6c5] font-medium">
                Costo herrajes
              </div>
              <div className="text-lg font-extrabold text-[#e87a50] tabular-nums leading-tight mt-0.5">
                {formatARS(costoHerrajes)}
              </div>
            </div>

            <div className="pt-1 flex items-baseline justify-between gap-1">
              <span className="text-sm font-extrabold uppercase tracking-wider text-white">
                TOTAL
              </span>
              <span className="text-2xl font-extrabold font-display text-[#e87a50] tabular-nums tracking-tight">
                {formatARS(totalPresupuesto)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. BOTONES DE ACCIÓN: "Guardar borrador" + "Generar PDF" */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        <button
          type="button"
          onClick={handleSaveDraft}
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

      {/* MODAL: AGREGAR HERRAJE */}
      {showHwModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                Agregar Herraje al Presupuesto
              </h3>
              <button
                type="button"
                onClick={() => setShowHwModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inventoryItems.filter((i) => i.category === 'herraje').length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-[#ffb59b] uppercase tracking-wider mb-1">
                  Vincular desde Inventario (Opcional)
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
                    -- Seleccionar herraje del taller --
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

            <form onSubmit={handleAddHardware} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Nombre del Herraje
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Correderas telescópicas 350mm"
                  value={hwName}
                  onChange={(e) => setHwName(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
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
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white tabular-nums"
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
                    value={hwPrice}
                    onChange={(e) => setHwPrice(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHwModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                >
                  Agregar
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
                  Presupuesto Técnico — Mesita Cúbica
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
                  Despiece de Placas ({pieces.length} piezas definidas)
                </div>
                {pieces.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-[#e3e2e2] tabular-nums"
                  >
                    <span>
                      • {p.name}: {p.lengthMm}×{p.widthMm}×{p.thicknessMm} mm (×
                      {p.quantity})
                    </span>
                    <span className="font-semibold text-[#c8c6c5]">
                      {formatARS(p.costArs * p.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-[#1b1d1d] rounded-xl p-3 space-y-1.5 border border-white/5">
                <div className="text-[11px] font-bold text-[#ffb59b] uppercase">
                  Herrajes Incluidos
                </div>
                {hardware.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between text-[#e3e2e2] tabular-nums"
                  >
                    <span>
                      • {h.name} (Cant: {h.quantity} × {formatARS(h.unitPriceArs)})
                    </span>
                    <span className="font-semibold text-[#c8c6c5]">
                      {formatARS(h.unitPriceArs * h.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-[#231915] border border-[#e87a50]/40 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-[#c8c6c5]">
                  <span>Costo placas:</span>
                  <span className="font-bold text-white tabular-nums">
                    {formatARS(costoPlacas)}
                  </span>
                </div>
                <div className="flex justify-between text-[#c8c6c5]">
                  <span>Costo herrajes:</span>
                  <span className="font-bold text-white tabular-nums">
                    {formatARS(costoHerrajes)}
                  </span>
                </div>
                <div className="flex justify-between text-[#c8c6c5]">
                  <span>Mano de obra:</span>
                  <span className="font-bold text-white tabular-nums">
                    {formatARS(manoDeObraArs)}
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
                  onShowToast('📄 Documento de presupuesto enviado a impresión / PDF');
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
