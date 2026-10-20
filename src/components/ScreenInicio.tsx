import React, { useState, useMemo } from 'react';
import {
  Calendar,
  MapPin,
  Truck,
  ClipboardList,
  Plus,
  Minus,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  Package,
} from 'lucide-react';
import { WorkshopOrder } from '../types/atelier';
import { formatARS } from '../data/initialData';

interface ScreenInicioProps {
  orders: WorkshopOrder[];
  soldUnitsCount?: number;
  salesGoalUnits: number;
  onUpdateSoldUnits?: (newCount: number) => void;
  onUpdateSalesGoal?: (newGoal: number) => void;
  extraSoldUnits?: number;
  onUpdateExtraSoldUnits?: (newCount: number) => void;
  onUpdateSalesGoalUnits?: (newGoal: number) => void;
  onGoToPedidos: (orderId?: string) => void;
  onGoToFlete?: (orderId: string) => void;
  onSelectOrderForFreight?: (orderId: string) => void;
  onGoToPresupuesto?: () => void;
  onMarkOrderDelivered: (orderId: string) => void;
  onShowToast: (msg: string) => void;
}

const SPANISH_MONTHS: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  set: 8,
  oct: 9,
  nov: 10,
  dic: 11,
};

/**
 * Parses an order's deliveryDateIso ('YYYY-MM-DD') or Spanish date ('24 Oct') into a timestamp
 * so orders can be strictly sorted from closest to furthest.
 */
export function parseOrderDateToTimestamp(order: WorkshopOrder): number {
  if (order.deliveryDateIso) {
    const parsed = new Date(order.deliveryDateIso + 'T12:00:00').getTime();
    if (!isNaN(parsed)) return parsed;
  }
  const raw = (order.deliveryDate || '').trim().toLowerCase();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T12:00:00`).getTime();
  }
  const parts = raw.split(/\s+/);
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const monStr = parts[1].slice(0, 3);
    const month = SPANISH_MONTHS[monStr];
    if (!isNaN(day) && month !== undefined) {
      return new Date(2026, month, day, 12, 0, 0).getTime();
    }
  }
  return new Date(2026, 9, 30, 12, 0, 0).getTime();
}

export function formatReadableDate(order: WorkshopOrder): string {
  if (order.deliveryDateIso) {
    const [y, m, d] = order.deliveryDateIso.split('-').map(Number);
    if (y && m && d) {
      const monthNames = [
        'Ene',
        'Feb',
        'Mar',
        'Abr',
        'May',
        'Jun',
        'Jul',
        'Ago',
        'Sep',
        'Oct',
        'Nov',
        'Dic',
      ];
      return `${String(d).padStart(2, '0')} ${monthNames[(m - 1) % 12]}`;
    }
  }
  return order.deliveryDate || 'Sin fecha';
}

export const ScreenInicio: React.FC<ScreenInicioProps> = ({
  orders,
  soldUnitsCount,
  salesGoalUnits,
  onUpdateSoldUnits,
  onUpdateSalesGoal,
  extraSoldUnits = 12,
  onUpdateExtraSoldUnits,
  onUpdateSalesGoalUnits,
  onGoToPedidos,
  onGoToFlete,
  onSelectOrderForFreight,
  onGoToPresupuesto,
  onMarkOrderDelivered,
  onShowToast,
}) => {
  const deliveredFromOrders = (Array.isArray(orders) ? orders : [])
    .filter((o) => o && o.stage === 'entregado')
    .reduce((acc, o) => acc + (Number(o.furnitureQty) || Number(o.packagesCount) || 1), 0);

  const safeExtraSold = Number.isFinite(Number(extraSoldUnits))
    ? Number(extraSoldUnits)
    : 12;

  const rawSoldUnits =
    typeof soldUnitsCount === 'number' && Number.isFinite(soldUnitsCount)
      ? soldUnitsCount
      : Math.max(0, safeExtraSold + deliveredFromOrders);

  const effectiveSoldUnits = Number.isFinite(rawSoldUnits) ? rawSoldUnits : 12;

  const handleSetSoldUnits = (newCount: number) => {
    const validCount = Number.isFinite(newCount) ? Math.max(0, newCount) : 0;
    if (onUpdateSoldUnits) {
      onUpdateSoldUnits(validCount);
    } else if (onUpdateExtraSoldUnits) {
      onUpdateExtraSoldUnits(Math.max(0, validCount - deliveredFromOrders));
    }
  };

  const handleSetGoalUnits = (newGoal: number) => {
    const validGoal = Number.isFinite(newGoal) && newGoal > 0 ? newGoal : 20;
    if (onUpdateSalesGoal) {
      onUpdateSalesGoal(validGoal);
    } else if (onUpdateSalesGoalUnits) {
      onUpdateSalesGoalUnits(validGoal);
    }
  };

  const handleOpenFreight = (orderId: string) => {
    if (onGoToFlete) onGoToFlete(orderId);
    else if (onSelectOrderForFreight) onSelectOrderForFreight(orderId);
  };

  const safeGoal =
    typeof salesGoalUnits === 'number' && Number.isFinite(salesGoalUnits) && salesGoalUnits > 0
      ? salesGoalUnits
      : 20;

  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [goalInput, setGoalInput] = useState(String(safeGoal));
  const [soldInput, setSoldInput] = useState(String(effectiveSoldUnits));

  const rawRatio = effectiveSoldUnits / safeGoal;
  const fillRatio = Number.isFinite(rawRatio)
    ? Math.min(1, Math.max(0, rawRatio))
    : 0;
  const fillPercent = Math.round(fillRatio * 100);

  // Total ARS of all orders
  const totalSalesArs = useMemo(() => {
    return (Array.isArray(orders) ? orders : []).reduce(
      (acc, o) => acc + (Number(o?.totalArs) || 0),
      0
    );
  }, [orders]);

  // Active orders sorted strictly by delivery date ascending (closest first, furthest last)
  const sortedActiveOrders = useMemo(() => {
    const pending = (Array.isArray(orders) ? orders : []).filter(
      (o) => o && o.stage !== 'entregado'
    );
    return [...pending].sort(
      (a, b) => parseOrderDateToTimestamp(a) - parseOrderDateToTimestamp(b)
    );
  }, [orders]);

  const getUrgencyBadge = (order: WorkshopOrder, index: number) => {
    const targetTs = parseOrderDateToTimestamp(order);
    // Reference workshop date: Oct 20, 2026 or current date
    const now = new Date(2026, 9, 20, 12, 0, 0).getTime();
    const diffDays = Math.round((targetTs - now) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1 || index === 0) {
      return {
        label: '🔴 Entrega Hoy / Mañana',
        className: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
      };
    }
    if (diffDays <= 6) {
      return {
        label: '🟡 Esta semana',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      };
    }
    return {
      label: '🟢 En fecha',
      className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    };
  };

  // SVG vertical fill coordinates: viewBox height is 160 (table spans y=16 to y=146 -> 130px height)
  const tableTopY = 16;
  const tableBottomY = 146;
  const tableTotalH = tableBottomY - tableTopY;
  const fillHeightPx = Number.isFinite(tableTotalH * fillRatio)
    ? tableTotalH * fillRatio
    : 0;
  const fillStartY = Number.isFinite(tableBottomY - fillHeightPx)
    ? tableBottomY - fillHeightPx
    : tableBottomY;

  return (
    <div className="space-y-5">
      {/* 1. TARJETA ÚNICA DE VENTAS CON MESA MINIMALISTA COLOREABLE (PROGRESO VISUAL) */}
      <section className="atelier-card rounded-2xl p-5 border border-[#e87a50]/30 relative overflow-hidden shadow-xl">
        {/* Subtle copper ambient glow */}
        <div
          className="pointer-events-none absolute -right-10 -bottom-10 w-44 h-44 rounded-full blur-3xl transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle, rgba(232,122,80,0.22) 0%, transparent 70%)',
          }}
        />

        <div className="flex items-center justify-between gap-4 relative z-10">
          {/* IZQUIERDA: Número Gigante de Ventas + Meta */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ffb59b]">
                META DE VENTAS • TALLER J&amp;L
              </span>
              <button
                type="button"
                onClick={() => {
                  setGoalInput(String(salesGoalUnits));
                  setSoldInput(String(effectiveSoldUnits));
                  setShowGoalEditor((prev) => !prev);
                }}
                title="Ajustar meta o contador de ventas"
                className="p-1 rounded-lg bg-[#222424] hover:bg-[#2c2e2e] text-[#c8c6c5] hover:text-white cursor-pointer transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Giant Sales Number */}
            <div className="flex items-baseline gap-2.5 tabular-nums">
              <span className="text-5xl font-extrabold font-display text-white tracking-tight leading-none">
                {effectiveSoldUnits}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#ffb59b]">
                  / {safeGoal} vendidas
                </span>
                <span className="text-[11px] font-semibold text-[#a1a1a1]">
                  {fillPercent}% completado
                </span>
              </div>
            </div>

            {/* Accumulated Sales Amount & Quick +/- Controls */}
            <div className="pt-1 space-y-2">
              <div className="text-xs text-[#c8c6c5] font-medium">
                Facturación acumulada:{' '}
                <strong className="text-white tabular-nums">
                  {formatARS(totalSalesArs)}
                </strong>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleSetSoldUnits(Math.max(0, effectiveSoldUnits - 1))
                  }
                  className="h-8 px-2.5 rounded-xl bg-[#222424] hover:bg-[#2c2e2e] border border-white/10 text-xs font-bold text-[#c8c6c5] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSetSoldUnits(effectiveSoldUnits + 1);
                    onShowToast('✨ +1 Mueble vendido sumado a la mesa minimalista');
                  }}
                  className="h-8 px-3 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#1f0800] text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Sumar Venta</span>
                </button>
                {onGoToPresupuesto && (
                  <button
                    type="button"
                    onClick={onGoToPresupuesto}
                    className="h-8 px-3 rounded-xl bg-[#261c18] hover:bg-[#33241e] border border-[#e87a50]/50 text-[#ffb59b] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>📐 Nuevo Presupuesto</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* DERECHA: Diseño Vectorial (SVG) Minimalista de Mesa de Luz Coloreable de Abajo hacia Arriba */}
          <div className="w-34 h-40 shrink-0 flex flex-col items-center justify-center bg-[#141616] border border-white/10 rounded-2xl p-2 relative">
            <svg
              viewBox="0 0 140 160"
              className="w-full h-full overflow-visible"
              aria-label="Medidor de progreso de mesa de luz minimalista"
            >
              <defs>
                {/* Dynamic Bottom-to-Top Clip Path reactive to sales progress */}
                <clipPath id="nightstandProgressClip">
                  <rect
                    x="0"
                    y={fillStartY}
                    width="140"
                    height={fillHeightPx}
                    className="transition-all duration-500 ease-out"
                  />
                </clipPath>

                {/* Warm Reference Wood Palette Gradient (#59230F -> #8C3F23 -> #BD9774) */}
                <linearGradient
                  id="nightstandCopperFill"
                  x1="0"
                  y1="1"
                  x2="0"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#59230F" />
                  <stop offset="52%" stopColor="#8C3F23" />
                  <stop offset="100%" stopColor="#BD9774" />
                </linearGradient>
              </defs>

              {/* LAYER 1: Unfilled Minimalist Nightstand Silhouette (Olive/Mahogany Wireframe Base) */}
              <g stroke="#BD9774" strokeOpacity="0.35" strokeWidth="2.2" fill="#2A160D">
                {/* Left Nordic Splayed Leg */}
                <polygon points="36,96 45,96 35,144 26,144" />
                {/* Right Nordic Splayed Leg */}
                <polygon points="95,96 104,96 114,144 105,144" />
                {/* Back Support Shadow Legs */}
                <polygon points="46,96 52,96 45,138 39,138" opacity="0.6" />
                <polygon points="88,96 94,96 101,138 95,138" opacity="0.6" />
                {/* Main Cabinet Box */}
                <rect x="22" y="24" width="96" height="72" rx="5" />
                {/* Top Overhang Board */}
                <rect x="18" y="16" width="104" height="8" rx="3" />
                {/* Upper Drawer Front */}
                <rect x="29" y="31" width="82" height="26" rx="2.5" />
                {/* Lower Open Niche / Second Drawer */}
                <rect x="29" y="62" width="82" height="27" rx="2.5" />
                {/* Minimalist Knob Handles */}
                <circle cx="70" cy="44" r="3.2" fill="#3a3d3d" />
                <circle cx="70" cy="75.5" r="3.2" fill="#3a3d3d" />
              </g>

              {/* LAYER 2: Gradually Colored Nightstand (Fills from Bottom to Top) */}
              <g clipPath="url(#nightstandProgressClip)">
                {/* Legs Colored */}
                <polygon
                  points="46,96 52,96 45,138 39,138"
                  fill="#8c3f19"
                />
                <polygon
                  points="88,96 94,96 101,138 95,138"
                  fill="#8c3f19"
                />
                <polygon
                  points="36,96 45,96 35,144 26,144"
                  fill="url(#nightstandCopperFill)"
                  stroke="#ffb59b"
                  strokeWidth="1.5"
                />
                <polygon
                  points="95,96 104,96 114,144 105,144"
                  fill="url(#nightstandCopperFill)"
                  stroke="#ffb59b"
                  strokeWidth="1.5"
                />
                {/* Main Cabinet Box Colored */}
                <rect
                  x="22"
                  y="24"
                  width="96"
                  height="72"
                  rx="5"
                  fill="url(#nightstandCopperFill)"
                  stroke="#ffdbcf"
                  strokeWidth="1.8"
                />
                {/* Top Overhang Board Colored */}
                <rect
                  x="18"
                  y="16"
                  width="104"
                  height="8"
                  rx="3"
                  fill="#ffb59b"
                  stroke="#ffdbcf"
                  strokeWidth="1.5"
                />
                {/* Upper Drawer Front Colored */}
                <rect
                  x="29"
                  y="31"
                  width="82"
                  height="26"
                  rx="2.5"
                  fill="#d2693e"
                  stroke="#ffdbcf"
                  strokeWidth="1.4"
                />
                {/* Lower Drawer Front Colored */}
                <rect
                  x="29"
                  y="62"
                  width="82"
                  height="27"
                  rx="2.5"
                  fill="#c25b31"
                  stroke="#ffdbcf"
                  strokeWidth="1.4"
                />
                {/* Glowing Handles */}
                <circle cx="70" cy="44" r="3.5" fill="#280b00" stroke="#ffdbcf" strokeWidth="1" />
                <circle cx="70" cy="75.5" r="3.5" fill="#280b00" stroke="#ffdbcf" strokeWidth="1" />
              </g>
            </svg>

            {/* Percentage Pill at Base of Illustration */}
            <div className="absolute bottom-1.5 right-2 bg-[#1e2020]/90 border border-[#e87a50]/40 px-2 py-0.5 rounded-md text-[10px] font-extrabold text-[#ffb59b] tabular-nums">
              {fillPercent}%
            </div>
          </div>
        </div>

        {/* Optional Quick Goal & Sales Editor Drawer */}
        {showGoalEditor && (
          <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 items-end">
            <div>
              <label className="block text-[10px] font-bold text-[#c8c6c5] mb-1">
                Vendidas Actual
              </label>
              <input
                type="number"
                min={0}
                value={soldInput}
                onChange={(e) => setSoldInput(e.target.value)}
                className="w-full bg-[#222424] border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#ffb59b] mb-1">
                Meta Objetivo
              </label>
              <input
                type="number"
                min={1}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-2.5 py-1.5 text-xs font-bold text-white tabular-nums"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const s = Math.max(0, parseInt(soldInput, 10) || 0);
                const g = Math.max(1, parseInt(goalInput, 10) || 20);
                handleSetSoldUnits(s);
                handleSetGoalUnits(g);
                setShowGoalEditor(false);
                onShowToast(`Meta actualizada: ${s} / ${g} mesas vendidas`);
              }}
              className="h-8 rounded-xl bg-[#e87a50] text-[#1f0800] text-xs font-bold cursor-pointer"
            >
              Guardar
            </button>
          </div>
        )}
      </section>

      {/* 2. LISTA DE "PEDIDOS A ENTREGAR" POR ORDEN DE PRIORIDAD (FECHA MÁS CERCANA A MÁS LEJANA) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
              <span>Pedidos a Entregar</span>
              <span className="bg-[#2a1f1a] border border-[#e87a50]/40 text-[#ffb59b] text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                {sortedActiveOrders.length}
              </span>
            </h2>
            <p className="text-[11px] text-[#a1a1a1]">
              Ordenados por prioridad (fecha más cercana a más lejana)
            </p>
          </div>

          <button
            type="button"
            onClick={() => onGoToPedidos()}
            className="px-3 py-1.5 rounded-xl bg-[#222424] hover:bg-[#2c2e2e] border border-white/10 text-xs font-bold text-[#ffb59b] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Ver Todos</span>
          </button>
        </div>

        {sortedActiveOrders.length === 0 ? (
          <div className="atelier-card rounded-2xl p-6 text-center space-y-2.5">
            <div className="w-11 h-11 mx-auto rounded-full bg-[#271e1a] border border-[#e87a50]/40 flex items-center justify-center text-[#ffb59b]">
              <Package className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white">
              No hay entregas pendientes
            </div>
            <p className="text-xs text-[#c8c6c5]">
              Todos los pedidos han sido entregados o puedes cargar uno nuevo desde el Catálogo o Pedidos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedActiveOrders.map((order, idx) => {
              const urgency = getUrgencyBadge(order, idx);
              const qty = order.furnitureQty || order.packagesCount || 1;
              const readableDate = formatReadableDate(order);

              return (
                <div
                  key={order.id}
                  className="atelier-card rounded-2xl p-4 space-y-3 border border-white/10 hover:border-[#e87a50]/40 transition-all"
                >
                  {/* Top Row: Urgency Badge + Delivery Date */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-lg border ${urgency.className}`}
                    >
                      {urgency.label}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#ffb59b] tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-[#e87a50]" />
                      <span>Entrega: {readableDate}</span>
                    </div>
                  </div>

                  {/* Furniture Name, Client & Address */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold text-[#e87a50] tabular-nums">
                          {order.code}
                        </span>
                        <h3 className="text-sm font-bold text-white truncate">
                          {order.furnitureName || order.itemsSummary}
                        </h3>
                      </div>

                      <div className="text-xs font-semibold text-[#e3e2e2]">
                        {order.clientName} •{' '}
                        <span className="text-[#ffb59b] font-bold">
                          Cant: {qty} {qty === 1 ? 'mueble' : 'muebles'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-[#b7b5b4]">
                        <MapPin className="w-3.5 h-3.5 text-[#e87a50] shrink-0" />
                        <span className="truncate">
                          {order.address || order.location}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold font-display text-white tabular-nums">
                        {formatARS(order.totalArs)}
                      </div>
                      <div className="text-[10px] text-[#a1a1a1] uppercase">
                        Total c/ Flete
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => onGoToPedidos(order.id)}
                      className="h-8 rounded-xl bg-[#222424] hover:bg-[#2c2e2e] border border-white/10 text-[11px] font-bold text-[#e3e2e2] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-[#ffb59b]" />
                      <span>Detalle</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenFreight(order.id)}
                      className="h-8 rounded-xl bg-[#271e1a] hover:bg-[#332620] border border-[#e87a50]/40 text-[11px] font-bold text-[#ffb59b] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Truck className="w-3.5 h-3.5 text-[#e87a50]" />
                      <span>Ruta Flete</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onMarkOrderDelivered(order.id)}
                      className="h-8 rounded-xl bg-[#1e3325] hover:bg-[#264230] border border-emerald-500/40 text-[11px] font-bold text-emerald-300 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Entregado</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
