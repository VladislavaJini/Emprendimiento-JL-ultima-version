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
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import {
  WorkshopOrder,
  OrderStage,
  CashMovement,
  InventoryItem,
  FurnitureDesign,
  CutPiece,
} from '../types/atelier';
import { formatARS } from '../data/initialData';

interface ScreenOperacionesProps {
  showGamificacion?: boolean;
  orders: WorkshopOrder[];
  onUpdateOrderStage: (orderId: string, stage: OrderStage) => void;
  onUpdateOrder?: (orderId: string, updated: Partial<WorkshopOrder>) => void;
  onAddOrder: (order: Omit<WorkshopOrder, 'id'>) => void;
  onDeleteOrder: (orderId: string) => void;
  onSelectOrderForFreight: (orderId: string) => void;
  cashEfectivo: number;
  cashBancos: number;
  onUpdateCashBalances?: (efectivo: number, bancos: number) => void;
  cobradoMes?: number;
  onUpdateCobradoMes?: (val: number) => void;
  porPercibir?: number;
  onUpdatePorPercibir?: (val: number) => void;
  extraBillingArs?: number;
  onUpdateExtraBillingArs?: (val: number) => void;
  movements: CashMovement[];
  onAddCashMovement: (
    description: string,
    amount: number,
    type: 'ingreso' | 'egreso',
    channel: 'efectivo' | 'bancos'
  ) => void;
  onResetCash: () => void;
  inventoryItems?: InventoryItem[];
  designs?: FurnitureDesign[];
  onLoadMissingPiecesToCutter?: (pieces: Omit<CutPiece, 'id' | 'numberLabel'>[]) => void;
  onDeductOrderAssemblyStock?: (order: WorkshopOrder) => void;
  onShowToast: (msg: string) => void;
}

export const ScreenOperaciones: React.FC<ScreenOperacionesProps> = ({
  showGamificacion = false,
  orders,
  onUpdateOrderStage,
  onUpdateOrder,
  onAddOrder,
  onDeleteOrder,
  onSelectOrderForFreight,
  cashEfectivo,
  cashBancos,
  onUpdateCashBalances,
  cobradoMes = 1840000,
  onUpdateCobradoMes,
  porPercibir = 620000,
  onUpdatePorPercibir,
  extraBillingArs = 0,
  onUpdateExtraBillingArs,
  movements,
  onAddCashMovement,
  onResetCash,
  inventoryItems = [],
  designs = [],
  onLoadMissingPiecesToCutter,
  onDeductOrderAssemblyStock,
  onShowToast,
}) => {
  // Meta de Fabricación: Suma todas las ventas independientemente del tipo de mueble + simulador
  const totalOrdersSalesArs = orders.reduce((acc, o) => acc + o.totalArs, 0);
  const historicalBilling = Math.max(0, totalOrdersSalesArs + extraBillingArs);
  const cycleTarget = 500000;
  const currentCycleIndex =
    historicalBilling <= 0
      ? 1
      : Math.floor((historicalBilling - 1) / cycleTarget) + 1;
  const cycleFilledAmount =
    historicalBilling <= 0
      ? 0
      : historicalBilling % cycleTarget === 0
      ? cycleTarget
      : historicalBilling % cycleTarget;
  const cyclePercent =
    historicalBilling <= 0
      ? 0
      : Math.round((cycleFilledAmount / cycleTarget) * 100);

  // Order filter & creation state
  const [orderFilter, setOrderFilter] = useState<'todos' | OrderStage>('todos');
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [newClient, setNewClient] = useState('');
  const [newLocation, setNewLocation] = useState('Ramos Mejía • 4.2 km');
  const [newItems, setNewItems] = useState('');
  const [newTotal, setNewTotal] = useState('245000');

  // Order editing modal state
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editClient, setEditClient] = useState('');
  const [editDelivery, setEditDelivery] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editItems, setEditItems] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editMaterial, setEditMaterial] = useState('');

  // Helper to compare an order against inventory items (BOM Sync)
  const getOrderBomReadiness = (order: WorkshopOrder) => {
    const matchedDesign = designs.find(
      (d) =>
        order.itemsSummary.toLowerCase().includes(d.catalogTitle.toLowerCase()) ||
        order.itemsSummary.toLowerCase().includes(d.name.toLowerCase())
    );
    const isRack = order.itemsSummary.toLowerCase().includes('rack');
    const drawerCount =
      matchedDesign?.drawerCount !== undefined
        ? matchedDesign.drawerCount
        : isRack
        ? 2
        : 1;
    const wMm = matchedDesign?.widthMm || (isRack ? 1800 : 450);
    const hMm = matchedDesign?.heightMm || (isRack ? 520 : 550);
    const dMm = matchedDesign?.depthMm || (isRack ? 420 : 380);

    const neededPieces = [
      { name: 'Tapa', qty: 1, w: wMm, h: dMm },
      { name: 'Lateral', qty: 2, w: hMm, h: dMm },
      ...(drawerCount > 0
        ? [{ name: 'Frente', qty: drawerCount, w: Math.max(120, wMm - 42), h: 180 }]
        : []),
    ];

    let missingWoodPieces: Omit<CutPiece, 'id' | 'numberLabel'>[] = [];
    let missingWoodCount = 0;
    let missingEdgeMm = 0;

    neededPieces.forEach((np) => {
      const match = inventoryItems.find(
        (it) =>
          it.category === 'pieza_cortada' &&
          it.name.toLowerCase().includes(np.name.toLowerCase())
      );
      const stock = match ? match.stockQty : 0;
      if (stock < np.qty) {
        const diff = np.qty - stock;
        missingWoodCount += diff;
        missingEdgeMm += (np.w * 2 + np.h) * diff;
        missingWoodPieces.push({
          name: `${np.name} (${order.code})`,
          subtitle: `Pieza faltante p/ ${order.itemsSummary}`,
          widthMm: np.w,
          heightMm: np.h,
          quantity: diff,
          unitPriceArs: 4800,
          edgesLabel: 'Cantos 2L Frontal',
          edgesType: '2L',
          allowRotation: true,
          mandatoryGrain: false,
        });
      }
    });

    const missingEdgeMeters = Number((missingEdgeMm / 1000).toFixed(1));

    const neededHardware = [
      ...(drawerCount > 0
        ? [
            {
              keyword: 'Corredera',
              qty: drawerCount,
              label: `pares de correderas de ${dMm >= 400 ? '350mm' : '300mm'}`,
            },
            {
              keyword: 'Tirador',
              qty: drawerCount,
              label: 'tiradores minimalistas',
            },
          ]
        : []),
      { keyword: 'Pata', qty: 4, label: 'patas macizas' },
    ];

    const missingHardwareDetails: string[] = [];
    neededHardware.forEach((hw) => {
      const match = inventoryItems.find(
        (it) =>
          it.category === 'herraje' &&
          it.name.toLowerCase().includes(hw.keyword.toLowerCase())
      );
      const stock = match ? match.stockQty : 0;
      if (stock < hw.qty) {
        const diff = hw.qty - stock;
        missingHardwareDetails.push(`Faltan ${diff} ${hw.label}`);
      }
    });

    if (missingWoodCount === 0 && missingHardwareDetails.length === 0) {
      return {
        status: 'ready' as const,
        badge: '🟢 Stock Completo para Armar (Sin usar sierra)',
        detail: 'Todas las piezas pre-cortadas y herrajes disponibles en taller',
        color: 'text-green-400 bg-green-500/10 border-green-500/30',
        missingWoodCount: 0,
        missingWoodPieces: [],
      };
    } else if (missingWoodCount > 0) {
      return {
        status: 'needs_saw' as const,
        badge: `🟡 Faltan cortar ${missingWoodCount} piezas / Pegar ${missingEdgeMeters} m de filo`,
        detail:
          missingHardwareDetails.length > 0
            ? `Además: ${missingHardwareDetails.join(' • ')}`
            : 'Herrajes completos en stock',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        missingWoodCount,
        missingWoodPieces,
      };
    } else {
      return {
        status: 'needs_hardware' as const,
        badge: '🔴 Faltan Herrajes/Insumos',
        detail: missingHardwareDetails.join(' • '),
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        missingWoodCount: 0,
        missingWoodPieces: [],
      };
    }
  };


  // KPI Edit modal state
  const [showEditKpiModal, setShowEditKpiModal] = useState(false);
  const [editCobradoInput, setEditCobradoInput] = useState(String(cobradoMes));
  const [editPercibirInput, setEditPercibirInput] = useState(String(porPercibir));

  // Cash Balances Direct Edit state
  const [showEditCashBalancesModal, setShowEditCashBalancesModal] = useState(false);
  const [editEfectivoInput, setEditEfectivoInput] = useState(String(cashEfectivo));
  const [editBancosInput, setEditBancosInput] = useState(String(cashBancos));

  // Cash movement modal state
  const [showCashModal, setShowCashModal] = useState(false);
  const [movDesc, setMovDesc] = useState('');
  const [movAmount, setMovAmount] = useState('45000');
  const [movType, setMovType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [movChannel, setMovChannel] = useState<'efectivo' | 'bancos'>('efectivo');
  const [cajaCerrada, setCajaCerrada] = useState(false);
  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);

  const filteredOrders =
    orderFilter === 'todos'
      ? orders
      : orders.filter((o) => o.stage === orderFilter);

  const countProceso = orders.filter((o) => o.stage === 'proceso').length;
  const countTerminado = orders.filter((o) => o.stage === 'terminado').length;
  const countEmbalado = orders.filter((o) => o.stage === 'embalado').length;

  const totalCaja = cashEfectivo + cashBancos;

  const handleAddBilling = (delta: number) => {
    if (onUpdateExtraBillingArs) {
      onUpdateExtraBillingArs(extraBillingArs + delta);
    }
    onShowToast(`Simulador Atelier: +${formatARS(delta)} ARS aplicados al ciclo`);
  };

  const handleResetGamificacionZero = () => {
    onResetCash();
    if (onUpdateExtraBillingArs) {
      onUpdateExtraBillingArs(0);
    }
    onShowToast(
      'Gamificación Atelier reiniciada en 0 absoluto: 0% fluido y $0 ventas'
    );
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

  const openEditOrderModal = (order: WorkshopOrder) => {
    setEditingOrderId(order.id);
    setEditClient(order.clientName);
    setEditDelivery(order.deliveryDate);
    setEditLocation(order.location);
    setEditItems(order.itemsSummary);
    setEditTotal(String(order.totalArs));
    setEditMaterial(order.materialSpec);
    setShowEditOrderModal(true);
  };

  const handleSaveOrderEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrderId || !onUpdateOrder) return;
    onUpdateOrder(editingOrderId, {
      clientName: editClient.trim() || 'Cliente Taller',
      deliveryDate: editDelivery.trim() || 'A coordinar',
      location: editLocation.trim() || 'Villa Luzuriaga',
      itemsSummary: editItems.trim() || 'Muebles a medida',
      totalArs: Math.max(1000, parseInt(editTotal.replace(/\D/g, ''), 10) || 100000),
      materialSpec: editMaterial.trim() || 'Melamina 18mm',
    });
    setShowEditOrderModal(false);
  };

  const handleSaveKpiEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const cobrado = Math.max(0, parseInt(editCobradoInput.replace(/\D/g, ''), 10) || 0);
    const percibir = Math.max(0, parseInt(editPercibirInput.replace(/\D/g, ''), 10) || 0);
    if (onUpdateCobradoMes) onUpdateCobradoMes(cobrado);
    if (onUpdatePorPercibir) onUpdatePorPercibir(percibir);
    setShowEditKpiModal(false);
    onShowToast('Métricas financieras del mes actualizadas');
  };

  const handleSaveCashBalances = (e: React.FormEvent) => {
    e.preventDefault();
    const efectivo = Math.max(0, parseInt(editEfectivoInput.replace(/\D/g, ''), 10) || 0);
    const bancos = Math.max(0, parseInt(editBancosInput.replace(/\D/g, ''), 10) || 0);
    if (onUpdateCashBalances) {
      onUpdateCashBalances(efectivo, bancos);
    }
    setShowEditCashBalancesModal(false);
    onShowToast('Saldos de efectivo y bancos actualizados');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* GAMIFICACIÓN ATELIER MODULE (Shown in Screen Gamificación) */}
      {showGamificacion && (
        <div className="space-y-3">
          {/* Top Action Row for Gamificación (same reset pattern as other windows) */}
          <div className="grid grid-cols-12 gap-2.5">
            <button
              onClick={handleResetGamificacionZero}
              className="col-span-7 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#271e1a] hover:bg-[#332620] border border-[#4d352b] text-[#f2ded7] text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#ffb59b] shrink-0" />
              <span className="leading-tight text-center">
                Reiniciar Todo en 0 (Meta Limpia)
              </span>
            </button>

            <button
              onClick={() => handleAddBilling(100000)}
              className="col-span-5 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#1e2020] hover:bg-[#292a2a] border border-white/10 text-[#ffb59b] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 text-[#ffb59b] shrink-0" />
              <span>Simular +$100k</span>
            </button>
          </div>

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
                  Meta de Fabricación
                </h2>
                <p className="text-[11px] text-[#c8c6c5] mt-0.5">
                  Suma todas las ventas ({orders.length}{' '}
                  {orders.length === 1 ? 'pedido' : 'pedidos'} de cualquier tipo de mueble)
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleResetGamificacionZero}
                  title="Reiniciar Meta de Fabricación y simulador en 0 absoluto"
                  className="h-8 px-2.5 rounded-xl bg-[#271e1a] hover:bg-[#34241d] border border-[#e87a50]/70 text-[#ffb59b] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-[#ffb59b]" />
                  <span>Reiniciar</span>
                </button>
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
                  height={cyclePercent > 0 ? (132 * cyclePercent) / 100 + 10 : 0}
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
                style={{ width: `${cyclePercent}%` }}
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
                  Ventas Totales Acumuladas (Todos los Muebles)
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
                onClick={handleResetGamificacionZero}
                className="py-2.5 px-2 rounded-xl bg-[#271e1a] hover:bg-[#34241d] border border-[#e87a50]/60 flex flex-col items-center justify-center transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#ffb59b]" />
                <span className="text-[10px] font-bold text-[#ffb59b] mt-1">
                  Reiniciar 0
                </span>
              </button>
            </div>
          </div>
          </section>
        </div>
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
              <div
                onClick={() => {
                  setEditCobradoInput(String(cobradoMes));
                  setEditPercibirInput(String(porPercibir));
                  setShowEditKpiModal(true);
                }}
                className="atelier-card rounded-2xl p-4 relative overflow-hidden cursor-pointer hover:border-[#ffb59b]/40 transition-colors group"
                title="Tocar para editar Cobrado Mes"
              >
                <div className="w-16 h-14 rounded-tl-xl bg-[#4a3b36]/40 absolute bottom-0 right-0 pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#c8c6c5] flex items-center gap-1.5">
                    <span>Cobrado mes</span>
                    <Pencil className="w-2.5 h-2.5 text-[#ffb59b] opacity-60 group-hover:opacity-100" />
                  </span>
                  <div className="w-7 h-7 rounded-full bg-[#252727] flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-[#ffb59b]" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1 tabular-nums">
                  <span className="text-2xl font-bold font-display text-white">
                    ${(cobradoMes / 1000).toLocaleString('es-AR')}K
                  </span>
                  <span className="text-xs font-semibold text-[#a1a1a1]">
                    ARS
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#ffb59b] relative z-10">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatARS(cobradoMes)}</span>
                </div>
              </div>

              {/* Por percibir */}
              <div
                onClick={() => {
                  setEditCobradoInput(String(cobradoMes));
                  setEditPercibirInput(String(porPercibir));
                  setShowEditKpiModal(true);
                }}
                className="atelier-card rounded-2xl p-4 relative overflow-hidden cursor-pointer hover:border-white/20 transition-colors group"
                title="Tocar para editar Por Percibir"
              >
                <div className="w-16 h-14 rounded-tl-xl bg-[#474746]/40 absolute bottom-0 right-0 pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#c8c6c5] flex items-center gap-1.5">
                    <span>Por percibir</span>
                    <Pencil className="w-2.5 h-2.5 text-[#c8c6c5] opacity-60 group-hover:opacity-100" />
                  </span>
                  <div className="w-7 h-7 rounded-full bg-[#252727] flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-[#c8c6c5]" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-baseline gap-1 tabular-nums">
                  <span className="text-2xl font-bold font-display text-white">
                    ${(porPercibir / 1000).toLocaleString('es-AR')}K
                  </span>
                  <span className="text-xs font-semibold text-[#a1a1a1]">
                    ARS
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#c8c6c5] relative z-10">
                  <Hourglass className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatARS(porPercibir)}</span>
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
                {filteredOrders.length === 0 ? (
                  <div className="atelier-card rounded-2xl p-6 text-center space-y-2.5">
                    <div className="w-11 h-11 mx-auto rounded-full bg-[#271e1a] border border-[#e87a50]/40 flex items-center justify-center text-[#ffb59b]">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-bold text-white">
                      Cola de Pedidos en 0
                    </div>
                    <p className="text-xs text-[#c8c6c5]">
                      No hay ningún pedido cargado en la cola de producción.
                    </p>
                  </div>
                ) : (
                  filteredOrders.map((order, idx) => {
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

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditOrderModal(order);
                            }}
                            title="Editar pedido completo"
                            className="w-7 h-7 rounded-full bg-[#2a2c2c] hover:bg-[#e87a50] hover:text-[#121414] flex items-center justify-center text-[#c8c6c5] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <span className="bg-[#232525] border border-white/10 text-[#c8c6c5] text-[11px] font-semibold px-2.5 py-1 rounded-full">
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
                            onClick={() => openEditOrderModal(order)}
                            title="Editar pedido completo (cliente, entrega, medidas, precio)"
                            className="w-8 h-8 rounded-full bg-[#232525] hover:bg-[#e87a50] hover:text-[#121414] flex items-center justify-center text-[#c8c6c5] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectOrderForFreight(order.id)}
                            title="Cotizar flete y logística para este encargo"
                            className="w-8 h-8 rounded-full bg-[#232525] hover:bg-[#2e3131] flex items-center justify-center text-[#ffb59b] hover:text-white transition-colors cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
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

                      {/* BOM Inventory Readiness Check & 1-Click Actions */}
                      {(() => {
                        const readiness = getOrderBomReadiness(order);
                        return (
                          <div className="space-y-2">
                            <div
                              className={`p-2.5 rounded-xl border space-y-1.5 ${readiness.color}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold leading-tight">
                                  {readiness.badge}
                                </span>
                                {readiness.status === 'needs_saw' && onLoadMissingPiecesToCutter && (
                                  <button
                                    onClick={() => {
                                      onLoadMissingPiecesToCutter(readiness.missingWoodPieces);
                                      onShowToast(
                                        `🛠️ ${readiness.missingWoodPieces.length} piezas faltantes cargadas al Optimizador de Corte`
                                      );
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-[#e87a50] text-[#121414] text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer hover:bg-[#f0855c] transition-colors shadow-xs"
                                  >
                                    <Wrench className="w-3 h-3" />
                                    <span>Enviar a Sierra 2D</span>
                                  </button>
                                )}
                              </div>
                              {readiness.detail && (
                                <div className="text-[10.5px] opacity-90 font-medium">
                                  {readiness.detail}
                                </div>
                              )}
                            </div>

                            {onDeductOrderAssemblyStock && (
                              <button
                                onClick={() => onDeductOrderAssemblyStock(order)}
                                className="w-full py-2 px-3 rounded-xl bg-[#222424] hover:bg-[#2c2f2f] border border-white/10 text-xs font-bold text-[#ffb59b] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Hammer className="w-3.5 h-3.5 text-[#e87a50]" />
                                <span>Descontar Insumos de Armado</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}

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
                  })
                )}
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
                  {totalCaja === 0 ? '0.0%' : '↑ +356.1%'}
                </span>
              </div>

              {/* 2 Sub-Cards: Efectivo & Bancos */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => {
                    setEditEfectivoInput(String(cashEfectivo));
                    setEditBancosInput(String(cashBancos));
                    setShowEditCashBalancesModal(true);
                  }}
                  className="atelier-subcard rounded-xl p-3 cursor-pointer hover:border-[#ffb59b]/40 transition-colors group"
                  title="Tocar para ajustar saldo en efectivo"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[#c8c6c5]">
                    <div className="flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-[#c8c6c5]" />
                      <span>Efectivo en Mano</span>
                    </div>
                    <Pencil className="w-2.5 h-2.5 text-[#ffb59b] opacity-50 group-hover:opacity-100" />
                  </div>
                  <div className="text-base font-bold font-display text-white mt-1.5 tabular-nums">
                    {formatARS(cashEfectivo)}
                  </div>
                  <div className="text-[11px] text-[#a1a1a1] mt-0.5">
                    Billetes arqueados
                  </div>
                </div>

                <div
                  onClick={() => {
                    setEditEfectivoInput(String(cashEfectivo));
                    setEditBancosInput(String(cashBancos));
                    setShowEditCashBalancesModal(true);
                  }}
                  className="atelier-subcard rounded-xl p-3 cursor-pointer hover:border-[#ffb59b]/40 transition-colors group"
                  title="Tocar para ajustar saldo en bancos"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[#c8c6c5]">
                    <div className="flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-[#c8c6c5]" />
                      <span>Bancos &amp; MP</span>
                    </div>
                    <Pencil className="w-2.5 h-2.5 text-[#ffb59b] opacity-50 group-hover:opacity-100" />
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

              {/* Cierre de Caja & Reiniciar Saldo Neto de la Caja */}
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
                  onClick={() => setShowConfirmResetModal(true)}
                  className="h-11 rounded-xl bg-[#271e1a] hover:bg-[#34241d] border border-[#e87a50]/60 text-[#ffb59b] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#e87a50]" />
                  <span>Reiniciar Saldo Neto</span>
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
      {/* Modal: Editar Pedido Completo */}
      {showEditOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-md w-full p-5 space-y-4 border border-white/15 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                Editar Pedido / Encargo
              </h3>
              <button
                onClick={() => setShowEditOrderModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOrderEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Cliente / Estudio
                </label>
                <input
                  type="text"
                  required
                  value={editClient}
                  onChange={(e) => setEditClient(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Fecha de Entrega
                  </label>
                  <input
                    type="text"
                    required
                    value={editDelivery}
                    onChange={(e) => setEditDelivery(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Monto Total (ARS)
                  </label>
                  <input
                    type="number"
                    required
                    value={editTotal}
                    onChange={(e) => setEditTotal(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white tabular-nums font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Ubicación de Destino
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Mobiliario / Piezas
                </label>
                <input
                  type="text"
                  required
                  value={editItems}
                  onChange={(e) => setEditItems(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Especificación de Material
                </label>
                <input
                  type="text"
                  value={editMaterial}
                  onChange={(e) => setEditMaterial(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditOrderModal(false)}
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

      {/* Modal: Editar KPIs (Cobrado Mes & Por Percibir) */}
      {showEditKpiModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                Editar Métricas del Taller
              </h3>
              <button
                onClick={() => setShowEditKpiModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Cobrado en el Mes (ARS)
                </label>
                <input
                  type="number"
                  value={editCobradoInput}
                  onChange={(e) => setEditCobradoInput(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Por Percibir / Pendiente (ARS)
                </label>
                <input
                  type="number"
                  value={editPercibirInput}
                  onChange={(e) => setEditPercibirInput(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white tabular-nums"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditKpiModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = parseInt(editCobradoInput.replace(/\D/g, ''), 10) || 0;
                    const p = parseInt(editPercibirInput.replace(/\D/g, ''), 10) || 0;
                    if (onUpdateCobradoMes) onUpdateCobradoMes(c);
                    if (onUpdatePorPercibir) onUpdatePorPercibir(p);
                    setShowEditKpiModal(false);
                    onShowToast('Métricas de taller actualizadas');
                  }}
                  className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                >
                  Guardar Métricas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Saldos de Caja Directos */}
      {showEditCashBalancesModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                Ajustar Saldos de Caja
              </h3>
              <button
                onClick={() => setShowEditCashBalancesModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Efectivo en Mano (ARS)
                </label>
                <input
                  type="number"
                  value={editEfectivoInput}
                  onChange={(e) => setEditEfectivoInput(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Bancos &amp; MercadoPago (ARS)
                </label>
                <input
                  type="number"
                  value={editBancosInput}
                  onChange={(e) => setEditBancosInput(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white tabular-nums"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditCashBalancesModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ef = parseInt(editEfectivoInput.replace(/\D/g, ''), 10) || 0;
                    const ba = parseInt(editBancosInput.replace(/\D/g, ''), 10) || 0;
                    if (onUpdateCashBalances) {
                      onUpdateCashBalances(ef, ba);
                    }
                    setShowEditCashBalancesModal(false);
                    onShowToast(`Saldos de caja actualizados (${formatARS(ef + ba)})`);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#ffb59b] text-[#380d00] text-xs font-bold cursor-pointer"
                >
                  Guardar Saldos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pop-up de Confirmación para Reiniciar Todo el Saldo Neto de la Caja y la Ventana a 0 */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-[#e87a50]/60 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#3d2020] border border-[#ffb4ab]/40 flex items-center justify-center text-[#ffb4ab] shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold font-display text-white leading-tight">
                  ¿Confirmar Reinicio Total a 0?
                </h3>
              </div>
              <button
                onClick={() => setShowConfirmResetModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#1b1d1d] border border-white/10 rounded-xl p-3.5 space-y-1.5 text-xs text-[#d8d6d5]">
              <p className="font-semibold text-[#ffb59b]">
                Al confirmar con el botón de abajo, toda la ventana volverá a 0 absoluto:
              </p>
              <ul className="space-y-1 text-[11px] text-[#c8c6c5] list-disc pl-4">
                <li>Saldo Neto Total en Caja (Efectivo y Bancos): $0 ARS</li>
                <li>Cola de Pedidos: 0 pedidos cargados</li>
                <li>Cobrado mes y Por percibir: $0 ARS</li>
                <li>Meta de Fabricación y Simulador: $0 ARS (0%)</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                className="h-11 rounded-xl bg-[#222424] hover:bg-[#2c2e2e] text-xs font-bold text-[#c8c6c5] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetCash();
                  setShowConfirmResetModal(false);
                }}
                className="h-11 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirmar Reinicio a 0</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
