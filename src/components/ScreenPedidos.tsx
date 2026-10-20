import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  PlusCircle,
  Calendar,
  MapPin,
  Package,
  Truck,
  CheckCircle2,
  Pencil,
  Trash2,
  ArrowRight,
  X,
  Hammer,
  Wrench,
} from 'lucide-react';
import {
  WorkshopOrder,
  OrderStage,
  FurnitureDesign,
  InventoryItem,
  CutPiece,
  PredefinedCut,
  DrawerSpec,
} from '../types/atelier';
import { formatARS } from '../data/initialData';
import { DrawerConfiguratorBar } from './DrawerConfiguratorBar';
import {
  generateDefaultDrawers,
  normalizeDrawersConfig,
  validateDrawersFit,
} from '../utils/drawerEngine';
import {
  parseOrderDateToTimestamp,
  formatReadableDate,
} from './ScreenInicio';

interface ScreenPedidosProps {
  orders: WorkshopOrder[];
  designs: FurnitureDesign[];
  inventoryItems: InventoryItem[];
  cutPieces: CutPiece[];
  predefinedCuts: PredefinedCut[];
  ratePerKm: number;
  highlightedOrderId?: string | null;
  onAddOrder: (order: Omit<WorkshopOrder, 'id'>) => void;
  onUpdateOrder: (orderId: string, updated: Partial<WorkshopOrder>) => void;
  onDeleteOrder: (orderId: string) => void;
  onMarkOrderDeliveredAndSold: (order: WorkshopOrder) => void;
  onGoToFlete: (orderId: string) => void;
  onDeductOrderAssemblyStock?: (order: WorkshopOrder) => void;
  onShowToast: (msg: string) => void;
}

export const ScreenPedidos: React.FC<ScreenPedidosProps> = ({
  orders,
  designs,
  inventoryItems,
  cutPieces,
  predefinedCuts,
  ratePerKm,
  highlightedOrderId,
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
  onMarkOrderDeliveredAndSold,
  onGoToFlete,
  onDeductOrderAssemblyStock,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'en_curso' | 'todos'>('en_curso');

  // Create / Edit Order Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedDesignId, setSelectedDesignId] = useState<string>(
    designs[0]?.id || 'mn-4555'
  );
  const [furnitureName, setFurnitureName] = useState<string>(
    designs[0]?.catalogTitle || 'Mesita de Luz Nórdica V1'
  );
  const [clientName, setClientName] = useState<string>('');
  const [address, setAddress] = useState<string>('Av. de Mayo 850, Ramos Mejía');
  const [distanceKm, setDistanceKm] = useState<string>('8.4');
  const [furnitureQty, setFurnitureQty] = useState<string>('1');
  const [unitPriceArs, setUnitPriceArs] = useState<string>(
    String(designs[0]?.suggestedPvpArs || 85000)
  );
  const [deliveryDateIso, setDeliveryDateIso] = useState<string>('2026-10-22');
  const [drawerCount, setDrawerCount] = useState<number>(1);
  const [drawersConfig, setDrawersConfig] = useState<DrawerSpec[]>(() =>
    generateDefaultDrawers(1, 450, 550, 380)
  );
  const [modalError, setModalError] = useState<string | null>(null);

  const activeDesign =
    designs.find((d) => d.id === selectedDesignId) || designs[0];
  const cabW = activeDesign?.widthMm || 450;
  const cabH = activeDesign?.heightMm || 550;
  const cabD = activeDesign?.depthMm || 380;

  // Sort orders by delivery date priority ascending
  const sortedOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) => parseOrderDateToTimestamp(a) - parseOrderDateToTimestamp(b)
    );
  }, [orders]);

  const ordersEnCurso = useMemo(() => {
    return sortedOrders.filter((o) => o.stage !== 'entregado');
  }, [sortedOrders]);

  const openNewOrderModal = () => {
    const defDesign = designs[0];
    const w = defDesign?.widthMm || 450;
    const h = defDesign?.heightMm || 550;
    const d = defDesign?.depthMm || 380;
    const drw = defDesign?.drawerCount ?? 1;

    setEditingOrderId(null);
    setSelectedDesignId(defDesign?.id || '');
    setFurnitureName(defDesign?.catalogTitle || 'Mesita de Luz Nórdica V1');
    setClientName('');
    setAddress('Av. de Mayo 850, Ramos Mejía');
    setDistanceKm('8.4');
    setFurnitureQty('1');
    setUnitPriceArs(String(defDesign?.suggestedPvpArs || 85000));
    setDeliveryDateIso('2026-10-22');
    setDrawerCount(drw);
    setDrawersConfig(
      normalizeDrawersConfig(defDesign?.drawersConfig, drw, w, h, d)
    );
    setModalError(null);
    setShowOrderModal(true);
  };

  const openEditOrderModal = (order: WorkshopOrder) => {
    const matchedDesign =
      designs.find((d) => d.id === order.furnitureId) ||
      designs.find((d) =>
        (order.furnitureName || order.itemsSummary || '')
          .toLowerCase()
          .includes((d.catalogTitle || d.name || '').toLowerCase())
      ) ||
      designs[0];

    const w = matchedDesign?.widthMm || 450;
    const h = matchedDesign?.heightMm || 550;
    const d = matchedDesign?.depthMm || 380;
    const drw =
      order.drawerCount !== undefined
        ? order.drawerCount
        : matchedDesign?.drawerCount ?? 1;

    setEditingOrderId(order.id);
    setSelectedDesignId(matchedDesign?.id || '');
    setFurnitureName(order.furnitureName || order.itemsSummary || 'Mueble a Medida');
    setClientName(order.clientName || '');
    setAddress(order.address || order.location || '');
    setDistanceKm(String(order.distanceKm || 8.4));
    const qty = order.furnitureQty || order.packagesCount || 1;
    setFurnitureQty(String(qty));
    const fPrice =
      order.furniturePriceArs ||
      Math.max(
        20000,
        Math.round(
          ((order.totalArs || 85000) - (order.freightArs || 0)) / Math.max(1, qty)
        )
      );
    setUnitPriceArs(String(fPrice));
    setDeliveryDateIso(order.deliveryDateIso || '2026-10-24');
    setDrawerCount(drw);
    setDrawersConfig(
      normalizeDrawersConfig(
        order.drawersConfig || matchedDesign?.drawersConfig,
        drw,
        w,
        h,
        d
      )
    );
    setModalError(null);
    setShowOrderModal(true);
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const fitCheck = validateDrawersFit(drawersConfig, cabH);
    if (!fitCheck.valid) {
      setModalError(
        fitCheck.errorMsg ||
          'La cantidad o altura de los cajones supera el límite físico de la mesa.'
      );
      return;
    }

    const qty = Math.max(1, parseInt(furnitureQty, 10) || 1);
    const uPrice = Math.max(0, parseInt(unitPriceArs, 10) || 85000);
    const km = Math.max(0.5, parseFloat(distanceKm) || 8.4);
    const freightCost = Math.round(km * ratePerKm);
    const furnitureTotal = uPrice * qty;
    const totalArs = furnitureTotal + freightCost;

    const tempOrderForDate: WorkshopOrder = {
      id: 'tmp',
      code: '',
      deliveryDate: deliveryDateIso,
      deliveryDateIso,
      clientName: '',
      location: '',
      distanceKm: km,
      itemsSummary: '',
      materialSpec: '',
      totalArs,
      stage: 'proceso',
      packagesCount: qty,
      packagingSpec: '',
      address,
    };
    const readableDate = formatReadableDate(tempOrderForDate);

    if (editingOrderId) {
      onUpdateOrder(editingOrderId, {
        furnitureId: selectedDesignId,
        furnitureName: furnitureName.trim() || 'Mueble J&L',
        itemsSummary: `${qty}x ${furnitureName.trim() || 'Mueble J&L'} (${drawerCount} caj.)`,
        clientName: clientName.trim() || 'Cliente Taller J&L',
        address: address.trim(),
        location: `${address.trim()} • ${km} km`,
        distanceKm: km,
        furnitureQty: qty,
        packagesCount: qty,
        packagingSpec: `${qty} ${qty === 1 ? 'mueble' : 'muebles'} • ${drawerCount} cajones`,
        furniturePriceArs: uPrice,
        freightArs: freightCost,
        totalArs,
        deliveryDateIso,
        deliveryDate: readableDate,
        drawerCount,
        drawersConfig,
        inCourse: true,
      });
      onShowToast('Pedido actualizado y sincronizado en Pedidos en Curso');
    } else {
      const numCode = 1085 + orders.length;
      onAddOrder({
        code: `#PED-${numCode}`,
        deliveryDate: readableDate,
        deliveryDateIso,
        clientName: clientName.trim() || 'Cliente Taller J&L',
        location: `${address.trim()} • ${km} km`,
        distanceKm: km,
        itemsSummary: `${qty}x ${furnitureName.trim() || 'Mueble J&L'} (${drawerCount} caj.)`,
        materialSpec: `Melamina 18mm • ${drawerCount} cajones a medida`,
        totalArs,
        stage: 'proceso',
        packagesCount: qty,
        packagingSpec: `${qty} ${qty === 1 ? 'mueble' : 'muebles'} • ${drawerCount} cajones`,
        address: address.trim(),
        featured: true,
        furnitureId: selectedDesignId,
        furnitureName: furnitureName.trim() || 'Mueble J&L',
        furnitureQty: qty,
        furniturePriceArs: uPrice,
        freightArs: freightCost,
        ratePerKm,
        drawerCount,
        drawersConfig,
        inCourse: true,
      });
      onShowToast(`Nuevo pedido #PED-${numCode} enviado a Pedidos en Curso`);
    }

    setShowOrderModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#ffb59b]">
            CIRCUITO INTEGRAL • TALLER J&amp;L
          </div>
          <h1 className="text-xl font-bold font-display text-white">
            Todos los Pedidos &amp; En Curso
          </h1>
        </div>

        <button
          type="button"
          onClick={openNewOrderModal}
          className="h-10 px-3.5 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#1f0800] text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Nuevo Pedido</span>
        </button>
      </div>

      {/* Segmented Switch: Pedidos en Curso vs Todos los Pedidos */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-[#181a1a] border border-white/10 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('en_curso')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'en_curso'
              ? 'bg-[#e87a50] text-[#1f0800] shadow-sm'
              : 'text-[#c8c6c5] hover:text-white'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Pedidos en Curso ({ordersEnCurso.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('todos')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'todos'
              ? 'bg-[#e87a50] text-[#1f0800] shadow-sm'
              : 'text-[#c8c6c5] hover:text-white'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Todos los Pedidos ({sortedOrders.length})</span>
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-3.5">
        {(activeTab === 'en_curso' ? ordersEnCurso : sortedOrders).map(
          (order) => {
            const qty = order.furnitureQty || order.packagesCount || 1;
            const freightArs =
              order.freightArs !== undefined
                ? order.freightArs
                : Math.round((order.distanceKm || 8.4) * ratePerKm);
            const furnitureSub = Math.max(0, order.totalArs - freightArs);
            const isHighlighted = highlightedOrderId === order.id;

            return (
              <div
                key={order.id}
                className={`atelier-card rounded-2xl p-4 space-y-3.5 border transition-all ${
                  isHighlighted
                    ? 'border-[#e87a50] ring-2 ring-[#e87a50]/30'
                    : 'border-white/10'
                }`}
              >
                {/* Top Row: Code + Stage + Edit/Delete */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#ffb59b] tabular-nums">
                      {order.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        order.stage === 'entregado'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-[#2a1f1a] text-[#ffb59b]'
                      }`}
                    >
                      {order.stage === 'entregado'
                        ? 'Entregado / Vendido'
                        : 'Pedido en Curso'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditOrderModal(order)}
                      title="Editar pedido, fecha y cajones (0 al 6)"
                      className="w-8 h-8 rounded-xl bg-[#222424] hover:bg-[#e87a50] hover:text-[#121414] text-[#c8c6c5] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onGoToFlete(order.id)}
                      title="Recalcular en Flete"
                      className="w-8 h-8 rounded-xl bg-[#222424] hover:bg-[#2e3131] text-[#ffb59b] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteOrder(order.id)}
                      title="Eliminar pedido"
                      className="w-8 h-8 rounded-xl bg-[#222424] hover:bg-rose-950 text-[#c8c6c5] hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mandatory 5 Data Points of "Pedidos en Curso" */}
                <div className="bg-[#161818] border border-white/5 rounded-xl p-3 space-y-2.5">
                  {/* 1. Nombre del pedido / Mueble */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1a1]">
                        Nombre del Pedido / Mueble
                      </div>
                      <h3 className="text-sm font-bold text-white mt-0.5">
                        {order.furnitureName || order.itemsSummary}
                      </h3>
                      <div className="text-xs text-[#c8c6c5]">
                        Cliente: <strong className="text-white">{order.clientName}</strong>
                        {order.drawerCount !== undefined && (
                          <span> • {order.drawerCount} cajones</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Cantidad de muebles */}
                    <div className="bg-[#242626] border border-white/10 rounded-xl px-2.5 py-1.5 text-center shrink-0">
                      <div className="text-[9px] font-bold uppercase text-[#a1a1a1]">
                        Cantidad
                      </div>
                      <div className="text-sm font-extrabold text-[#ffb59b] tabular-nums">
                        {qty} {qty === 1 ? 'ud.' : 'uds.'}
                      </div>
                    </div>
                  </div>

                  {/* 2. Dirección de entrega */}
                  <div className="flex items-center gap-2 text-xs text-[#e3e2e2] pt-1 border-t border-white/5">
                    <MapPin className="w-3.5 h-3.5 text-[#e87a50] shrink-0" />
                    <span className="truncate font-medium">
                      {order.address || order.location} ({order.distanceKm} km)
                    </span>
                  </div>

                  {/* 4. Precio Total (Muebles + Flete) & 5. Fecha de Entrega Editable */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 items-center">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-[#a1a1a1]">
                        Fecha de Entrega (Prioridad)
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-[#e87a50] shrink-0" />
                        <input
                          type="date"
                          value={order.deliveryDateIso || '2026-10-24'}
                          onChange={(e) => {
                            const newIso = e.target.value;
                            const updatedTemp: WorkshopOrder = {
                              ...order,
                              deliveryDateIso: newIso,
                            };
                            onUpdateOrder(order.id, {
                              deliveryDateIso: newIso,
                              deliveryDate: formatReadableDate(updatedTemp),
                            });
                          }}
                          className="bg-[#222424] border border-white/15 rounded-lg px-2 py-1 text-xs font-bold text-[#ffb59b] focus:border-[#e87a50] focus:outline-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase text-[#a1a1a1]">
                        Precio Total (Mueble + Flete)
                      </div>
                      <div className="text-base font-extrabold font-display text-[#e87a50] tabular-nums mt-0.5">
                        {formatARS(order.totalArs)}
                      </div>
                      <div className="text-[10px] text-[#c8c6c5] tabular-nums">
                        Muebles: {formatARS(furnitureSub)} + Flete:{' '}
                        {formatARS(freightArs)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {onDeductOrderAssemblyStock && (
                    <button
                      type="button"
                      onClick={() => onDeductOrderAssemblyStock(order)}
                      className="h-9 rounded-xl bg-[#222424] hover:bg-[#2c2f2f] border border-white/10 text-xs font-bold text-[#ffb59b] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Hammer className="w-3.5 h-3.5 text-[#e87a50]" />
                      <span>Descontar Armado</span>
                    </button>
                  )}

                  {order.stage !== 'entregado' && (
                    <button
                      type="button"
                      onClick={() => onMarkOrderDeliveredAndSold(order)}
                      className="h-9 rounded-xl bg-[#2e7d32] hover:bg-[#388e3c] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors col-span-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Entregado / Vendido</span>
                    </button>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>

      {/* Modal: Crear / Editar Pedido con Barra de Cajones (0 al 6) e Insumos */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3.5 overflow-y-auto">
          <div className="atelier-card rounded-2xl max-w-md w-full p-5 space-y-4 border border-white/15 my-auto max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold font-display text-white">
                  {editingOrderId
                    ? 'Editar Pedido y Cajonera'
                    : 'Nuevo Pedido en Curso'}
                </h3>
                <p className="text-[11px] text-[#c8c6c5]">
                  Configura fecha de entrega, flete y cajones (0 al 6)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="p-1.5 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-3.5">
              {/* Selector de Producto del Catálogo */}
              <div>
                <label className="block text-xs font-semibold text-[#ffb59b] mb-1">
                  Seleccionar Mueble del Catálogo
                </label>
                <select
                  value={selectedDesignId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedDesignId(id);
                    const found = designs.find((d) => d.id === id);
                    if (found) {
                      setFurnitureName(found.catalogTitle || found.name);
                      setUnitPriceArs(String(found.suggestedPvpArs || 85000));
                      const drw = found.drawerCount ?? 1;
                      setDrawerCount(drw);
                      setDrawersConfig(
                        normalizeDrawersConfig(
                          found.drawersConfig,
                          drw,
                          found.widthMm || 450,
                          found.heightMm || 550,
                          found.depthMm || 380
                        )
                      );
                    }
                  }}
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  {designs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.catalogTitle || d.name} ({Math.round((d.widthMm || 450) / 10)}×
                      {Math.round((d.heightMm || 550) / 10)} cm •{' '}
                      {formatARS(d.suggestedPvpArs || 85000)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Nombre del Pedido / Mueble
                  </label>
                  <input
                    type="text"
                    required
                    value={furnitureName}
                    onChange={(e) => setFurnitureName(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Estudio Arq. Rossi"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Dirección de Entrega
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Distancia (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Cant. Muebles
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={furnitureQty}
                    onChange={(e) => setFurnitureQty(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Precio Unit. (ARS)
                  </label>
                  <input
                    type="number"
                    value={unitPriceArs}
                    onChange={(e) => setUnitPriceArs(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#ffb59b] mb-1">
                    Fecha Entrega
                  </label>
                  <input
                    type="date"
                    required
                    value={deliveryDateIso}
                    onChange={(e) => setDeliveryDateIso(e.target.value)}
                    className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-2 py-2 text-xs font-bold text-white cursor-pointer"
                  />
                </div>
              </div>

              {/* BARRA DE CAJONES (0 al 6) 100% EDITABLE */}
              <DrawerConfiguratorBar
                drawerCount={drawerCount}
                drawersConfig={drawersConfig}
                cabinetWidthMm={cabW}
                cabinetHeightMm={cabH}
                cabinetDepthMm={cabD}
                inventoryItems={inventoryItems}
                cutPieces={cutPieces}
                predefinedCuts={predefinedCuts}
                onChange={(newCount, newConfig) => {
                  setDrawerCount(newCount);
                  setDrawersConfig(newConfig);
                  setModalError(null);
                }}
              />

              {modalError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#1f0800] text-xs font-bold cursor-pointer shadow-md"
                >
                  Guardar en Pedidos en Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
