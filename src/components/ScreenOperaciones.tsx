import React, { useState } from 'react';
import {
  Trophy,
  RotateCcw,
  TrendingUp,
  Clock,
  CheckCircle2,
  Hourglass,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  MapPin,
  Check,
  Package,
  Truck,
  Banknote,
  Landmark,
  Plus,
  Lock,
  Hammer,
  X,
  Droplets,
} from 'lucide-react';
import { WorkshopOrder, OrderStage, CashMovement } from '../types/atelier';
import { formatARS } from '../data/initialData';

interface ScreenOperacionesProps {
  showGamificacion?: boolean;
  orders: WorkshopOrder[];
  onUpdateOrderStage: (orderId: string, stage: OrderStage) => void;
  onAddOrder: (order: Omit<WorkshopOrder, 'id'>) => void;
  onDeleteOrder: (orderId: string) => void;
  onSelectOrderForFreight: (orderId: string) => void;
  cashEfectivo: number;
  cashBancos: number;
  movements: CashMovement[];
  onAddCashMovement: (
    description: string,
    amount: number,
    type: 'ingreso' | 'egreso',
    channel: 'efectivo' | 'bancos'
  ) => void;
  onResetCash: () => void;
  onShowToast: (msg: string) => void;
}

export const ScreenOperaciones: React.FC<ScreenOperacionesProps> = ({
  showGamificacion = false,
  orders,
  onUpdateOrderStage,
  onAddOrder,
  onDeleteOrder,
  onSelectOrderForFreight,
  cashEfectivo,
  cashBancos,
  onAddCashMovement,
  onResetCash,
  onShowToast,
}) => {
  // Gamificación state (Ciclo $500.000 ARS, initial $100.000 = 20%)
  const [historicalBilling, setHistoricalBilling] = useState<number>(100000);
  const cycleTarget = 500000;
  const currentCycleIndex = Math.floor(historicalBilling / cycleTarget) + 1;
  const cycleFilledAmount =
    historicalBilling > 0 && historicalBilling % cycleTarget === 0
      ? cycleTarget
      : historicalBilling % cycleTarget;
  const cyclePercent = Math.round((cycleFilledAmount / cycleTarget) * 100);

  // Order filter & creation state
  const [orderFilter, setOrderFilter] = useState<'todos' | OrderStage>('todos');
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [newClient, setNewClient] = useState('');
  const [newLocation, setNewLocation] = useState('Ramos Mejía • 4.2 km');
  const [newItems, setNewItems] = useState('');
  const [newTotal, setNewTotal] = useState('245000');

  // Cash movement modal state
  const [showCashModal, setShowCashModal] = useState(false);
  const [movDesc, setMovDesc] = useState('');
  const [movAmount, setMovAmount] = useState('45000');
  const [movType, setMovType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [movChannel, setMovChannel] = useState<'efectivo' | 'bancos'>('efectivo');
  const [cajaCerrada, setCajaCerrada] = useState(false);

  const filteredOrders =
    orderFilter === 'todos'
      ? orders
      : orders.filter((o) => o.stage === orderFilter);

  const countProceso = orders.filter((o) => o.stage === 'proceso').length;
  const countTerminado = orders.filter((o) => o.stage === 'terminado').length;
  const countEmbalado = orders.filter((o) => o.stage === 'embalado').length;

  const totalCaja = cashEfectivo + cashBancos;

  const handleAddBilling = (delta: number) => {
    setHistoricalBilling((prev) => prev + delta);
    onShowToast(`Simulador Atelier: +${formatARS(delta)} ARS aplicados al ciclo`);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const numCode = 1085 + orders.length;
    onAddOrder({
      code: `#PED-${numCode}`,
      deliveryDate: '02 Nov',
      clientName: newClient.trim() || 'Arquitectura & Diseño Sur',
      location: newLocation.trim() || 'Haedo • 4.5 km',
      distanceKm: 6.2,
      itemsSummary: newItems.trim() || 'Escritorio Nórdico + Cajonera 3C',
      materialSpec: 'Melamina Carvalho Mezzo 18mm • Cantos ABS 2mm',
      totalArs: parseInt(newTotal, 10) || 245000,
      stage: 'proceso',
      packagesCount: 2,
      packagingSpec: '2 bultos • Film stretch & esquineros',
      address: newLocation.split('•')[0].trim() || 'Av. Rivadavia 15800, Haedo',
      featured: true,
    });
    setNewClient('');
    setNewItems('');
    setShowNewOrderForm(false);
    onShowToast(`Nuevo pedido #PED-${numCode} incorporado a la cola de taller`);
  };

  const handleCreateCashMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(movAmount.replace(/\D/g, ''), 10) || 0;
    if (amt <= 0) return;
    onAddCashMovement(
      movDesc.trim() || (movType === 'ingreso' ? 'Cobro de seña cliente' : 'Insumos de taller'),
      amt,
      movType,
      movChannel
    );
    setMovDesc('');
    setShowCashModal(false);
    onShowToast(
      `Movimiento registrado: ${movType === 'ingreso' ? '+' : '-'}${formatARS(amt)} (${movChannel})`
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* GAMIFICACIÓN ATELIER MODULE (Shown in Screen 6 / Image_11) */}
      {showGamificacion && (
        <section className="atelier-card rounded-2xl p-4 space-y-4 border border-white/10">
          {/* Top Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                <span className="text-[#ffb59b]">GAMIFICACIÓN ATELIER</span>
                <span className="text-[#a1a1a1]">•</span>
                <span className="text-[#c8c6c5]">
                  Ciclo {currentCycleIndex}: $0 - $500k • Terracota Atelier
                </span>
              </div>
              <h2 className="text-lg font-bold font-display text-white mt-1 leading-snug">
                Meta de Fabricación: Mesita Clásica
              </h2>
            </div>

            <div className="bg-[#2c1d17] border border-[#56382d] rounded-xl px-3 py-1.5 flex items-center gap-1.5 shrink-0">
              <Trophy className="w-3.5 h-3.5 text-[#ffb59b]" />
              <span className="text-[11px] font-bold text-[#ffb59b] leading-tight">
                Ciclo
                <br />
                Activo
              </span>
            </div>
          </div>

          {/* Interactive Proportional Fill Nightstand Visual */}
          <div className="bg-[#141616] rounded-2xl p-5 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Subtle radial glow */}
            <div
              className="w-44 h-44 rounded-full absolute pointer-events-none opacity-20"
              style={{
                background: 'radial-gradient(circle, #e87a50 0%, transparent 70%)',
              }}
            />

            {/* SVG Silhouette of Mesita Clásica with proportional liquid fill */}
            <svg viewBox="0 0 200 180" className="w-44 h-40 relative z-10">
              <defs>
                <clipPath id="nightstand-clip">
                  {/* Top overhang */}
                  <rect x="40" y="26" width="120" height="8" rx="2" />
                  {/* Main cabinet box */}
                  <rect x="44" y="34" width="112" height="84" rx="3" />
                  {/* Left outer leg */}
                  <polygon points="54,118 64,118 56,158 48,158" />
                  {/* Left inner leg */}
                  <polygon points="72,118 80,118 75,152 69,152" />
                  {/* Right inner leg */}
                  <polygon points="120,118 128,118 131,152 125,152" />
                  {/* Right outer leg */}
                  <polygon points="136,118 146,118 152,158 144,158" />
                </clipPath>
              </defs>

              {/* Base dark silhouette */}
              <g clipPath="url(#nightstand-clip)">
                <rect x="30" y="20" width="140" height="145" fill="#1c1f1f" />
                {/* Proportional terracotta liquid fill from bottom (y=158 up to y=26) */}
                <rect
                  x="30"
                  y={158 - (132 * cyclePercent) / 100}
                  width="140"
                  height={(132 * cyclePercent) / 100 + 10}
                  fill="#e87a50"
                  className="transition-all duration-500"
                />
              </g>

              {/* Structural outlines & drawer handle detail */}
              <rect
                x="40"
                y="26"
                width="120"
                height="8"
                rx="2"
                fill="none"
                stroke="#2e3232"
                strokeWidth="2"
              />
              <rect
                x="44"
                y="34"
                width="112"
                height="84"
                rx="3"
                fill="none"
                stroke="#2e3232"
                strokeWidth="2"
              />
              {/* Drawer inset box */}
              <rect
                x="52"
                y="42"
                width="96"
                height="34"
                rx="2"
                fill="none"
                stroke="#2e3232"
                strokeWidth="1.5"
              />
              {/* Drawer slot handle */}
              <rect x="86" y="57" width="28" height="4" rx="2" fill="#383c3c" />
              {/* Open lower shelf recess */}
              <rect
                x="52"
                y="82"
                width="96"
                height="28"
                rx="2"
                fill="#141616"
                fillOpacity="0.45"
              />
            </svg>

            <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-[#d8d6d5]">
              <Droplets className="w-4 h-4 text-[#ffb59b]" />
              <span className="tabular-nums">
                Nivel de Llenado: {cyclePercent}% fluido
              </span>
            </div>
          </div>

          {/* Cycle Progress Bar & Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#b7b5b4] font-medium">
                Llenado de Ciclo Actual
              </span>
              <span className="text-[#ffb59b] font-bold tabular-nums">
                {cyclePercent}% del ciclo
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 tabular-nums">
              <span className="text-2xl font-bold font-display text-white">
                {formatARS(cycleFilledAmount)}
              </span>
              <span className="text-sm font-medium text-[#a1a1a1]">
                / $500.000 ARS
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-[#252727] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#e87a50] rounded-full transition-all duration-500"
                style={{ width: `${Math.max(4, cyclePercent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-[#a1a1a1]">$0 (Inicio)</span>
              <span className="text-[#ffb59b]">
                Ciclo {currentCycleIndex}: $0 – $500k
              </span>
              <span className="text-[#a1a1a1]">$500k meta</span>
            </div>

            {/* Historical Billing Box */}
            <div className="atelier-subcard rounded-xl p-3 flex items-center justify-between mt-2">
              <div>
                <div className="text-[11px] text-[#a1a1a1]">
                  Facturación Total Histórica
                </div>
                <div className="text-sm font-bold text-white tabular-nums mt-0.5">
                  {formatARS(historicalBilling)} ARS
                </div>
              </div>
              <span className="bg-[#282a2a] border border-white/10 text-[#e3e2e2] text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                CICLO {currentCycleIndex}
              </span>
            </div>
          </div>

          {/* Simulator Controls */}
          <div className="pt-1 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
              <span>SIMULADOR DE LLENADO PROPORCIONAL CONTINUO</span>
              <span className="text-[#a1a1a1] normal-case font-medium">
                Escala: $500.000 por ciclo
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleAddBilling(50000)}
                className="py-2.5 px-2 rounded-xl bg-[#1e2020] hover:bg-[#292a2a] border border-white/10 flex flex-col items-center justify-center transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-white tabular-nums">
                  +$50k
                </span>
                <span className="text-[10px] text-[#a1a1a1] mt-0.5">
                  10% ciclo
                </span>
              </button>

              <button
                onClick={() => handleAddBilling(100000)}
                className="py-2.5 px-2 rounded-xl bg-[#2c1d17] hover:bg-[#38241d] border border-[#e87a50]/60 flex flex-col items-center justify-center transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-[#ffb59b] tabular-nums">
                  +$100k
                </span>
                <span className="text-[10px] text-[#ffb59b]/80 mt-0.5">
                  20% ciclo
                </span>
              </button>

              <button
                onClick={() => handleAddBilling(500000)}
                className="py-2.5 px-2 rounded-xl bg-[#1e2020] hover:bg-[#292a2a] border border-white/10 flex flex-col items-center justify-center transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-white tabular-nums">
                  +$500k
                </span>
                <span className="text-[10px] text-[#a1a1a1] mt-0.5">
                  Nuevo Ciclo
                </span>
              </button>

              <button
                onClick={() => {
                  setHistoricalBilling(100000);
                  onShowToast('Simulador reiniciado a Ciclo 1 ($100.000 ARS • 20%)');
                }}
                className="py-2.5 px-2 rounded-xl bg-[#1e2020] hover:bg-[#292a2a] border border-white/10 flex flex-col items-center justify-center transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#c8c6c5]" />
                <span className="text-[10px] text-[#c8c6c5] mt-1">
                  Reiniciar
                </span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* PANEL DE OPERACIONES: GESTIÓN & FINANZAS */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#ffb59b]">
              PANEL DE OPERACIONES
            </div>
            <h1 className="text-2xl font-bold font-display text-white tracking-tight mt-0.5">
              Gestión & Finanzas
            </h1>
          </div>

          <div className="bg-[#1e2020] border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8c6252]" />
            <span className="text-xs font-semibold text-[#e3e2e2]">
              J&amp;L Central
            </span>
          </div>
        </div>

        {/* Vertical Mobile Stack */}
        <div className="space-y-5">
          {/* KPIs + Order Queue */}
          <div className="space-y-4">
            {/* 2 KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Cobrado mes */}
              <div className="atelier-card rounded-2xl p-4 relative overflow-hidden">
                <div className="w-16 h-14 rounded-tl-xl bg-[#4a3b36]/40 absolute bottom-0 right-0 pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#c8c6c5]">
                    Cobrado mes
                  </span>
                  <div className="w-7 h-7 rounded-full bg-[#252727] flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-[#ffb59b]" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1 tabular-nums">
                  <span className="text-2xl font-bold font-display text-white">
                    $1.840K
                  </span>
                  <span className="text-xs font-semibold text-[#a1a1a1]">
                    ARS
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#ffb59b] relative z-10">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>92% meta mensual</span>
                </div>
              </div>

              {/* Por percibir */}
              <div className="atelier-card rounded-2xl p-4 relative overflow-hidden">
                <div className="w-16 h-14 rounded-tl-xl bg-[#474746]/40 absolute bottom-0 right-0 pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#c8c6c5]">
                    Por percibir
                  </span>
                  <div className="w-7 h-7 rounded-full bg-[#252727] flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-[#c8c6c5]" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1 tabular-nums">
                  <span className="text-2xl font-bold font-display text-white">
                    $620K
                  </span>
                  <span className="text-xs font-semibold text-[#a1a1a1]">
                    ARS
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#c8c6c5] relative z-10">
                  <Hourglass className="w-3.5 h-3.5 shrink-0" />
                  <span>3 órdenes pendientes</span>
                </div>
              </div>
            </div>

            {/* + Nuevo Pedido / Encargo Button */}
            <button
              onClick={() => setShowNewOrderForm((prev) => !prev)}
              className="w-full h-12 rounded-2xl bg-[#e87a50] hover:bg-[#f0855c] text-[#280b00] font-semibold text-sm px-4 flex items-center justify-between shadow-lg transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <PlusCircle className="w-4 h-4" />
                <span>+ Nuevo Pedido / Encargo</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showNewOrderForm ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Collapsible New Order Form */}
            {showNewOrderForm && (
              <form
                onSubmit={handleCreateOrder}
                className="atelier-card rounded-2xl p-4 space-y-3 border border-[#e87a50]/40"
              >
                <div className="text-xs font-bold text-[#ffb59b] uppercase tracking-wider">
                  Registrar Nuevo Encargo de Carpintería
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Cliente / Estudio (ej. Arq. Méndez)"
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Localidad • Distancia (ej. Morón • 6.1 km)"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Muebles encargados (ej. Rack TV + Biblioteca)"
                    value={newItems}
                    onChange={(e) => setNewItems(e.target.value)}
                    className="sm:col-span-2 bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="Total ARS"
                    value={newTotal}
                    onChange={(e) => setNewTotal(e.target.value)}
                    className="bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewOrderForm(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#252727] text-xs text-[#c8c6c5] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                  >
                    Crear Orden
                  </button>
                </div>
              </form>
            )}

            {/* Cola de Pedidos Section */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-display text-white">
                    Cola de Pedidos
                  </h2>
                  <span className="w-5 h-5 rounded-full bg-[#292a2a] text-[#c8c6c5] text-xs font-bold flex items-center justify-center tabular-nums">
                    {orders.length}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setOrderFilter('todos');
                    onShowToast('Mostrando historial completo de órdenes activas');
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-[#ffb59b] hover:text-[#e87a50] cursor-pointer"
                >
                  <span>Historial</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setOrderFilter('todos')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    orderFilter === 'todos'
                      ? 'bg-[#e87a50] text-[#1f0800]'
                      : 'bg-[#1e2020] text-[#a1a1a1] hover:text-white'
                  }`}
                >
                  Todos ({orders.length})
                </button>
                <button
                  onClick={() => setOrderFilter('proceso')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    orderFilter === 'proceso'
                      ? 'bg-[#e87a50] text-[#1f0800] font-bold'
                      : 'bg-[#1e2020] text-[#a1a1a1] hover:text-white'
                  }`}
                >
                  En Proceso ({countProceso})
                </button>
                <button
                  onClick={() => setOrderFilter('terminado')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    orderFilter === 'terminado'
                      ? 'bg-[#e87a50] text-[#1f0800] font-bold'
                      : 'bg-[#1e2020] text-[#a1a1a1] hover:text-white'
                  }`}
                >
                  Terminado ({countTerminado})
                </button>
                <button
                  onClick={() => setOrderFilter('embalado')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    orderFilter === 'embalado'
                      ? 'bg-[#e87a50] text-[#1f0800] font-bold'
                      : 'bg-[#1e2020] text-[#a1a1a1] hover:text-white'
                  }`}
                >
                  Embalado ({countEmbalado})
                </button>
              </div>

              {/* Orders List */}
              <div className="space-y-3">
                {filteredOrders.map((order, idx) => {
                  const isDetailed = idx === 0 || order.featured;

                  if (!isDetailed) {
                    return (
                      <div
                        key={order.id}
                        onClick={() => onSelectOrderForFreight(order.id)}
                        className="atelier-card rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-white/15 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#222424] flex items-center justify-center text-[#ffb59b] shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-bold text-[#ffb59b] tabular-nums">
                                {order.code}
                              </span>
                              <span className="text-[#c8c6c5] font-medium">
                                {order.itemsSummary}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-white mt-0.5">
                              {order.clientName}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="bg-[#232525] border border-white/10 text-[#c8c6c5] text-[11px] font-semibold px-3 py-1 rounded-full">
                            {order.stage === 'proceso'
                              ? 'En Proceso'
                              : order.stage === 'terminado'
                              ? 'Terminado'
                              : order.stage === 'embalado'
                              ? 'Embalado'
                              : 'Entregado'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#a1a1a1]" />
                        </div>
                      </div>
                    );
                  }

                  const stages: { key: OrderStage; label: string }[] = [
                    { key: 'proceso', label: 'En proc.' },
                    { key: 'terminado', label: 'Terminado' },
                    { key: 'embalado', label: 'Embalado' },
                    { key: 'entregado', label: 'Entregado' },
                  ];
                  const activeStageIdx = stages.findIndex(
                    (s) => s.key === order.stage
                  );

                  return (
                    <div
                      key={order.id}
                      className="atelier-card rounded-2xl p-4 space-y-3.5"
                    >
                      {/* Top Info Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {/* Realistic Workshop Furniture SVG Illustration Thumbnail */}
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#2b221a] border border-white/10 shrink-0 relative">
                            <svg
                              viewBox="0 0 80 80"
                              className="w-full h-full object-cover"
                            >
                              <rect width="80" height="80" fill="#2c2219" />
                              {/* Background workshop shelves */}
                              <rect x="6" y="10" width="68" height="4" fill="#4a3728" />
                              <rect x="6" y="24" width="68" height="4" fill="#4a3728" />
                              <rect x="12" y="14" width="14" height="10" fill="#8b6546" />
                              <rect x="34" y="14" width="18" height="10" fill="#a87e58" />
                              {/* Warm sunlight glow */}
                              <circle
                                cx="65"
                                cy="15"
                                r="25"
                                fill="#ffb59b"
                                fillOpacity="0.15"
                              />
                              {/* Floor */}
                              <rect x="0" y="58" width="80" height="22" fill="#8e7968" />
                              {/* Carvalho Nordic Sideboard / Cómoda */}
                              <rect
                                x="12"
                                y="32"
                                width="56"
                                height="24"
                                rx="2"
                                fill="#d2a273"
                                stroke="#5c3d22"
                                strokeWidth="1.5"
                              />
                              <line
                                x1="40"
                                y1="32"
                                x2="40"
                                y2="56"
                                stroke="#5c3d22"
                                strokeWidth="1.2"
                              />
                              <line
                                x1="12"
                                y1="44"
                                x2="68"
                                y2="44"
                                stroke="#5c3d22"
                                strokeWidth="1.2"
                              />
                              {/* Angled Nordic legs */}
                              <line
                                x1="17"
                                y1="56"
                                x2="14"
                                y2="66"
                                stroke="#c49363"
                                strokeWidth="2.5"
                              />
                              <line
                                x1="63"
                                y1="56"
                                x2="66"
                                y2="66"
                                stroke="#c49363"
                                strokeWidth="2.5"
                              />
                            </svg>
                          </div>

                          <div>
                            <div className="text-[11px] font-medium text-[#c8c6c5]">
                              <span className="font-bold text-[#ffb59b] tabular-nums">
                                {order.code}
                              </span>{' '}
                              • Entrega: {order.deliveryDate}
                            </div>
                            <h3 className="text-base font-bold font-display text-white mt-0.5">
                              {order.clientName}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-[#b7b5b4] mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-[#ffb59b] shrink-0" />
                              <span>{order.location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onSelectOrderForFreight(order.id)}
                            title="Cotizar flete para esta orden"
                            className="w-8 h-8 rounded-full bg-[#232525] hover:bg-[#2e3131] flex items-center justify-center text-[#c8c6c5] hover:text-white transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteOrder(order.id)}
                            title="Eliminar orden"
                            className="w-8 h-8 rounded-full bg-[#232525] hover:bg-[#3d2020] flex items-center justify-center text-[#c8c6c5] hover:text-[#ffb4ab] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Order Specs & Price Box */}
                      <div className="atelier-subcard rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs font-bold">
                          <span className="text-white">
                            {order.itemsSummary}
                          </span>
                          <span className="text-[#e87a50] tabular-nums shrink-0">
                            {formatARS(order.totalArs)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#b7b5b4]">
                          <span className="w-3 h-3 rounded-xs atelier-hatch shrink-0 inline-block" />
                          <span>{order.materialSpec}</span>
                        </div>
                      </div>

                      {/* 4-Stage Interactive Stepper */}
                      <div className="pt-1 px-1">
                        <div className="relative flex items-center justify-between">
                          {/* Connecting Track Line */}
                          <div className="absolute top-4 left-6 right-6 h-0.5 bg-[#292a2a]" />
                          <div
                            className="absolute top-4 left-6 h-0.5 bg-[#e87a50] transition-all duration-300"
                            style={{
                              width: `${(activeStageIdx / (stages.length - 1)) * 84}%`,
                            }}
                          />

                          {stages.map((st, sIdx) => {
                            const isPast = sIdx < activeStageIdx;
                            const isCurrent = sIdx === activeStageIdx;

                            return (
                              <button
                                key={st.key}
                                onClick={() => {
                                  onUpdateOrderStage(order.id, st.key);
                                  onShowToast(
                                    `Estado de ${order.code} actualizado a: ${st.label}`
                                  );
                                }}
                                className="relative z-10 flex flex-col items-center gap-1.5 cursor-pointer group"
                              >
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                    isCurrent
                                      ? 'bg-[#e87a50] text-[#280b00] ring-4 ring-[#e87a50]/25 scale-110'
                                      : isPast
                                      ? 'bg-[#e87a50] text-[#280b00]'
                                      : 'bg-[#222424] text-[#c8c6c5] border border-white/10 group-hover:border-[#e87a50]'
                                  }`}
                                >
                                  {isPast ? (
                                    <Check className="w-4 h-4 stroke-[2.5]" />
                                  ) : st.key === 'embalado' ? (
                                    <Package className="w-4 h-4" />
                                  ) : st.key === 'entregado' ? (
                                    <Truck className="w-4 h-4" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </div>
                                <span
                                  className={`text-[11px] font-semibold ${
                                    isCurrent
                                      ? 'text-[#ffb59b] font-bold'
                                      : isPast
                                      ? 'text-[#b7b5b4]'
                                      : 'text-[#8e8e8e]'
                                  }`}
                                >
                                  {st.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Control de Caja & Finanzas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-display text-white leading-tight">
                Control de Caja &amp;
                <br />
                Finanzas
              </h2>

              <div className="bg-[#8b7369]/80 border border-[#a48b83]/40 rounded-full px-3.5 py-1.5 flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    cajaCerrada ? 'bg-[#ffb4ab]' : 'bg-[#ffb59b]'
                  }`}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white leading-tight">
                  {cajaCerrada ? 'CAJA CERRADA' : 'CAJA ABIERTA • REAL'}
                  <br />
                  TIME
                </span>
              </div>
            </div>

            {/* Cash Register Main Card */}
            <div className="atelier-card rounded-2xl p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#c8c6c5]">
                    Saldo Neto Total en Caja
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1 tabular-nums">
                    <span className="text-3xl font-bold font-display text-white">
                      {formatARS(totalCaja)}
                    </span>
                    <span className="text-xs font-semibold text-[#a1a1a1]">
                      ARS
                    </span>
                  </div>
                </div>

                <span className="bg-[#332019] text-[#ffb59b] text-xs font-bold px-2.5 py-1 rounded-full tabular-nums">
                  ↑ +356.1%
                </span>
              </div>

              {/* 2 Sub-Cards: Efectivo & Bancos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="atelier-subcard rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#c8c6c5]">
                    <Banknote className="w-3.5 h-3.5 text-[#c8c6c5]" />
                    <span>Efectivo en Mano</span>
                  </div>
                  <div className="text-base font-bold font-display text-white mt-1.5 tabular-nums">
                    {formatARS(cashEfectivo)}
                  </div>
                  <div className="text-[11px] text-[#a1a1a1] mt-0.5">
                    Billetes arqueados
                  </div>
                </div>

                <div className="atelier-subcard rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#c8c6c5]">
                    <Landmark className="w-3.5 h-3.5 text-[#c8c6c5]" />
                    <span>Bancos &amp; MP</span>
                  </div>
                  <div className="text-base font-bold font-display text-white mt-1.5 tabular-nums">
                    {formatARS(cashBancos)}
                  </div>
                  <div className="text-[11px] font-semibold text-[#ffb59b] mt-0.5">
                    CVU Atelier Listo
                  </div>
                </div>
              </div>

              {/* Primary Peach Action Button */}
              <button
                onClick={() => setShowCashModal(true)}
                className="w-full h-12 rounded-xl bg-[#ffb59b] hover:bg-[#ffc4af] text-[#380d00] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Registrar Movimiento</span>
              </button>

              {/* Cierre de Caja & Reiniciar Caja */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setCajaCerrada((prev) => !prev);
                    onShowToast(
                      cajaCerrada
                        ? 'Caja reabierta en modo Real Time'
                        : `Arqueo y Cierre de Caja completado (${formatARS(totalCaja)} ARS)`
                    );
                  }}
                  className="h-11 rounded-xl bg-[#202222] hover:bg-[#292a2a] border border-white/5 text-[#e3e2e2] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-[#c8c6c5]" />
                  <span>{cajaCerrada ? 'Abrir Caja' : 'Cierre de Caja'}</span>
                </button>

                <button
                  onClick={onResetCash}
                  className="h-11 rounded-xl bg-[#202222] hover:bg-[#292a2a] border border-white/5 text-[#e3e2e2] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#c8c6c5]" />
                  <span>Reiniciar Caja</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workshop Footer */}
      <footer className="pt-6 pb-2 flex flex-col items-center text-center space-y-2 opacity-80">
        <div className="w-9 h-9 rounded-full bg-[#1e2020] border border-white/10 flex items-center justify-center text-[#a1a1a1]">
          <Hammer className="w-4 h-4" />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1a1]">
          MUEBLES J&amp;L • PRECISIÓN &amp; OFICIO
        </div>
        <div className="text-[11px] text-[#717171]">
          Villa Luzuriaga, Buenos Aires
        </div>
      </footer>

      {/* Modal: Registrar Movimiento de Caja */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-md w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                Registrar Movimiento de Caja
              </h3>
              <button
                onClick={() => setShowCashModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCashMovement} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovType('ingreso')}
                  className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    movType === 'ingreso'
                      ? 'bg-[#e87a50] text-[#121414] border-[#e87a50]'
                      : 'bg-[#222424] text-[#c8c6c5] border-white/10'
                  }`}
                >
                  + Ingreso / Cobro
                </button>
                <button
                  type="button"
                  onClick={() => setMovType('egreso')}
                  className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                    movType === 'egreso'
                      ? 'bg-[#ffb4ab] text-[#690005] border-[#ffb4ab]'
                      : 'bg-[#222424] text-[#c8c6c5] border-white/10'
                  }`}
                >
                  - Egreso / Gasto
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovChannel('efectivo')}
                  className={`py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                    movChannel === 'efectivo'
                      ? 'bg-[#3d261e] text-[#ffb59b] border-[#e87a50]/60'
                      : 'bg-[#222424] text-[#a1a1a1] border-white/10'
                  }`}
                >
                  Efectivo en Mano
                </button>
                <button
                  type="button"
                  onClick={() => setMovChannel('bancos')}
                  className={`py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                    movChannel === 'bancos'
                      ? 'bg-[#3d261e] text-[#ffb59b] border-[#e87a50]/60'
                      : 'bg-[#222424] text-[#a1a1a1] border-white/10'
                  }`}
                >
                  Bancos &amp; MercadoPago
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Concepto / Detalle
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Seña #PED-1085 / Compra Herrajes Ducasse"
                  value={movDesc}
                  onChange={(e) => setMovDesc(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Monto (ARS)
                </label>
                <input
                  type="number"
                  required
                  value={movAmount}
                  onChange={(e) => setMovAmount(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-sm font-bold text-white tabular-nums"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCashModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#ffb59b] text-[#380d00] text-xs font-bold cursor-pointer"
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
