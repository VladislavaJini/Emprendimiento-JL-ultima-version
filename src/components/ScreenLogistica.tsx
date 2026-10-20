import React, { useState, useEffect } from 'react';
import {
  Truck,
  Navigation,
  Home,
  MapPin,
  CheckCircle2,
  X,
  Minus,
  Plus,
  Receipt,
  ClipboardCheck,
  Map,
  Copy,
  ArrowRight,
  Package,
} from 'lucide-react';
import {
  WorkshopOrder,
  OrderStage,
  FurnitureDesign,
} from '../types/atelier';
import { formatARS } from '../data/initialData';

interface ScreenLogisticaProps {
  activeOrder: WorkshopOrder;
  orders: WorkshopOrder[];
  designs: FurnitureDesign[];
  preselectedDesignId?: string | null;
  ratePerKm: number;
  onUpdateRatePerKm: (newRate: number) => void;
  onSelectOrder: (orderId: string) => void;
  onUpdateOrderStage: (orderId: string, stage: OrderStage) => void;
  onSubmitFreightToPedidos: (payload: {
    design: FurnitureDesign;
    quantity: number;
    clientName: string;
    address: string;
    distanceKm: number;
    ratePerKm: number;
    freightArs: number;
    totalArs: number;
  }) => void;
  onShowToast: (msg: string) => void;
}

const DESTINATION_PRESETS = [
  { address: 'Av. de Mayo 850, Ramos Mejía', km: 8.4 },
  { address: 'Av. Rivadavia 16200, Haedo', km: 5.2 },
  { address: 'Av. Santa Fe 3400, Palermo CABA', km: 19.6 },
  { address: 'Sarmiento 940, Morón Centro', km: 7.0 },
  { address: 'Av. del Libertador 14200, San Isidro', km: 24.5 },
];

export const ScreenLogistica: React.FC<ScreenLogisticaProps> = ({
  activeOrder,
  orders,
  designs = [],
  preselectedDesignId,
  ratePerKm,
  onUpdateRatePerKm,
  onSelectOrder,
  onUpdateOrderStage,
  onSubmitFreightToPedidos,
  onShowToast,
}) => {
  const [distanceKm, setDistanceKm] = useState<number>(
    activeOrder.distanceKm || 8.4
  );
  const [destinationAddress, setDestinationAddress] = useState<string>(
    activeOrder.address || 'Av. de Mayo 850, Ramos Mejía'
  );
  const [clientName, setClientName] = useState<string>(
    activeOrder.clientName || 'Estudio Arq. Rossi'
  );
  const [roundTrip, setRoundTrip] = useState<boolean>(false);

  // Catalog Product Selector & Quantity state
  const [selectedDesignId, setSelectedDesignId] = useState<string>(
    preselectedDesignId || designs[0]?.id || 'mn-4555'
  );
  const [productQty, setProductQty] = useState<number>(
    activeOrder.furnitureQty || activeOrder.packagesCount || 1
  );

  // Sync when preselectedDesignId changes (e.g. from Catalog "🚚 Enviar al Flete")
  useEffect(() => {
    if (preselectedDesignId) {
      setSelectedDesignId(preselectedDesignId);
    }
  }, [preselectedDesignId]);

  const selectedDesign: FurnitureDesign =
    designs.find((d) => d.id === selectedDesignId) ||
    designs[0] || {
      id: 'mn-4555',
      code: 'MN-4555',
      name: 'Mesita de Luz Nórdica V1',
      shortTitle: 'MESITA NÓRDICA',
      catalogTitle: 'Mesita de Luz Nórdica V1',
      description: 'Mesa de luz en melamina 18mm',
      widthMm: 450,
      heightMm: 550,
      depthMm: 380,
      materialSummary: 'Melamina Carvalho 18mm',
      cutPiecesCount: 10,
      suggestedPvpArs: 85000,
      baseCostArs: 32400,
      activeInWorkshop: true,
      bodyTexture: 'Blanco Puro',
      frontTexture: 'Carvalho',
      bomItems: [],
      drawerCount: 1,
    };

  const effectiveKm = Number((distanceKm * (roundTrip ? 2 : 1)).toFixed(1));
  // Strictly: Kilometers × Value per Kilometer (Base F-100 removed)
  const totalFreightArs = Math.round(effectiveKm * ratePerKm);
  const furnitureSubtotalArs =
    (Number(selectedDesign?.suggestedPvpArs) || 85000) * productQty;
  const combinedOrderTotalArs = furnitureSubtotalArs + totalFreightArs;

  const adjustKm = (delta: number) => {
    setDistanceKm((prev) => {
      const next = Math.max(
        0.5,
        Math.min(250, Number((prev + delta).toFixed(1)))
      );
      return next;
    });
  };

  const handleCycleStage = () => {
    const orderStages: OrderStage[] = [
      'proceso',
      'terminado',
      'embalado',
      'entregado',
    ];
    const idx = orderStages.indexOf(activeOrder.stage);
    const nextStage = orderStages[(idx + 1) % orderStages.length];
    onUpdateOrderStage(activeOrder.id, nextStage);
    onShowToast(
      `Estado de ${activeOrder.code} cambiado a ${nextStage.toUpperCase()}`
    );
  };

  const handleCopyDetail = () => {
    const text = `Cotización Flete Muebles J&L (${selectedDesign.catalogTitle || selectedDesign.name} x${productQty} - ${clientName}): Origen Villa Luzuriaga -> ${destinationAddress} (${effectiveKm} km × ${formatARS(ratePerKm)}/km). Total Flete: ${formatARS(totalFreightArs)} ARS | Total Pedido c/ Muebles: ${formatARS(combinedOrderTotalArs)} ARS.`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    onShowToast('Detalle de cotización de flete copiado al portapapeles');
  };

  const arcRatio = Math.min(0.92, Math.max(0.18, effectiveKm / 16.8));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ffb59b]">
          <Truck className="w-4 h-4 shrink-0" />
          <span>TALLER CENTRAL VILLA LUZURIAGA</span>
        </div>
        <h1 className="text-2xl font-bold font-display text-white tracking-tight">
          Logística &amp; Cotizador de Fletes
        </h1>
        <p className="text-xs text-[#b7b5b4]">
          Base Operativa: Villa Luzuriaga (La Matanza) • Zona Oeste &amp; CABA
        </p>
      </div>

      {/* Vertical Mobile Stack */}
      <div className="space-y-4">
        {/* 1. SELECTOR DE PRODUCTOS DEL CATÁLOGO Y CANTIDAD */}
        <section className="atelier-card rounded-2xl p-4 space-y-3 border border-[#e87a50]/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#e87a50]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Mueble del Catálogo a Despachar
              </span>
            </div>

            {orders.length > 0 && (
              <select
                value={activeOrder.id}
                onChange={(e) => {
                  const found = orders.find((o) => o.id === e.target.value);
                  if (found) {
                    onSelectOrder(found.id);
                    setDistanceKm(found.distanceKm || 8.4);
                    setDestinationAddress(found.address || found.location);
                    setClientName(found.clientName);
                    if (found.furnitureQty) setProductQty(found.furnitureQty);
                  }
                }}
                aria-label="Seleccionar orden previa"
                className="bg-[#232525] border border-white/10 text-[#c8c6c5] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider cursor-pointer focus:outline-none"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} • {o.clientName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Product Dropdown from Catalog */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#c8c6c5] mb-1">
                Producto del Catálogo
              </label>
              <select
                value={selectedDesignId}
                onChange={(e) => setSelectedDesignId(e.target.value)}
                className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-[#e87a50] focus:outline-none cursor-pointer"
              >
                {designs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.catalogTitle || d.name} (
                    {Math.round((d.widthMm || 450) / 10)}×
                    {Math.round((d.heightMm || 550) / 10)}×
                    {Math.round((d.depthMm || 380) / 10)} cm •{' '}
                    {formatARS(d.suggestedPvpArs || 85000)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-[#c8c6c5] mb-1">
                  Cliente Destinatario
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full bg-[#222424] border border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#ffb59b] mb-1">
                  Cantidad de Muebles
                </label>
                <div className="flex items-center justify-between bg-[#222424] border border-[#e87a50]/50 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setProductQty((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg bg-[#161818] text-white flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-extrabold text-white tabular-nums">
                    {productQty} {productQty === 1 ? 'unidad' : 'unidades'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setProductQty((q) => q + 1)}
                    className="w-7 h-7 rounded-lg bg-[#e87a50] text-[#1f0800] flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. RUTA Y MEDIDOR SEMICIRCULAR DE DISTANCIA */}
        <section className="atelier-card rounded-2xl p-4 space-y-4">
          <div className="relative flex flex-col items-center justify-center pt-2 pb-1">
            <svg viewBox="0 0 240 130" className="w-60 h-32 overflow-visible">
              <path
                d="M 28 112 A 92 92 0 0 1 212 112"
                fill="none"
                stroke="#f2f0ef"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M 28 112 A 92 92 0 0 1 212 112"
                fill="none"
                stroke="#e87a50"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={Math.PI * 92}
                strokeDashoffset={Math.PI * 92 * (1 - arcRatio)}
                className="transition-all duration-300"
              />
            </svg>

            <div className="absolute bottom-2 flex flex-col items-center text-center">
              <div className="w-7 h-7 rounded-full bg-[#ffb59b] text-[#380d00] flex items-center justify-center shadow-sm mb-1">
                <Navigation className="w-3.5 h-3.5 fill-current" />
              </div>
              <div className="text-2xl font-bold font-display text-white tabular-nums leading-none">
                {effectiveKm} km
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#b7b5b4] mt-1">
                TRAYECTO ESTIMADO
              </div>
            </div>
          </div>

          <div className="atelier-subcard rounded-2xl p-3.5 space-y-3.5 relative">
            {/* Origin Row */}
            <div className="flex items-start gap-3 relative">
              <div className="w-0.5 h-10 bg-white/10 absolute left-3.5 top-7" />

              <div className="w-7 h-7 rounded-full bg-[#ffb59b] text-[#380d00] flex items-center justify-center shrink-0 mt-0.5">
                <Home className="w-3.5 h-3.5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffb59b]">
                    ORIGEN TALLER (FIJO)
                  </span>
                  <span className="text-[#c8c6c5] text-[10px] font-semibold">
                    Base J&amp;L
                  </span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  Garibaldi y Triunvirato
                </div>
                <div className="text-xs text-[#a1a1a1]">
                  Villa Luzuriaga, La Matanza
                </div>
              </div>
            </div>

            {/* Destination Row */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#e87a50] text-[#280b00] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
                    DESTINO DE ENTREGA
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#ffb59b]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Calculado</span>
                  </span>
                </div>

                <div className="bg-[#141616] border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    className="w-full bg-transparent text-xs font-medium text-white focus:outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const currIdx = DESTINATION_PRESETS.findIndex(
                        (p) => p.address === destinationAddress
                      );
                      const nextPreset =
                        DESTINATION_PRESETS[
                          (currIdx + 1) % DESTINATION_PRESETS.length
                        ];
                      setDestinationAddress(nextPreset.address);
                      setDistanceKm(nextPreset.km);
                      onShowToast(
                        `Destino cambiado a ${nextPreset.address} (${nextPreset.km} km)`
                      );
                    }}
                    title="Cambiar dirección sugerida"
                    className="text-[#a1a1a1] hover:text-white cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. AJUSTE FINO DE KILOMETRAJE & TARIFA DINÁMICA 100% EDITABLE (SIN BASE F-100) */}
        <section className="atelier-card rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white leading-snug">
              Ajuste Fino de Kilometraje &amp; Tarifa
            </h2>

            <button
              type="button"
              onClick={() => {
                setRoundTrip((prev) => !prev);
                onShowToast(
                  !roundTrip
                    ? 'Modo Ida & Vuelta activado (kilometraje duplicado)'
                    : 'Modo Tramo Simple activado'
                );
              }}
              className={`text-left text-xs px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                roundTrip
                  ? 'bg-[#3d261e] border-[#e87a50] text-[#ffb59b] font-bold'
                  : 'bg-[#222424] border-white/10 text-[#c8c6c5] hover:bg-white/5'
              }`}
            >
              Ida &amp; Vuelta ({roundTrip ? 'x2 activo' : 'simple'})
            </button>
          </div>

          {/* Stepper Control */}
          <div className="bg-[#1e2020] rounded-2xl p-2 flex items-center justify-between border border-white/5">
            <button
              type="button"
              onClick={() => adjustKm(-0.5)}
              className="w-11 h-11 rounded-xl bg-[#151717] hover:bg-[#252727] text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1 tabular-nums">
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={distanceKm}
                  onChange={(e) =>
                    setDistanceKm(Math.max(0.5, parseFloat(e.target.value) || 1))
                  }
                  className="w-20 bg-transparent text-center text-xl font-bold font-display text-white focus:outline-none"
                />
                <span className="text-xs font-bold text-[#c8c6c5]">km</span>
              </div>
              <div className="text-[11px] text-[#a1a1a1]">
                Distancia computada ({effectiveKm} km efectivos)
              </div>
            </div>

            <button
              type="button"
              onClick={() => adjustKm(0.5)}
              className="w-11 h-11 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#280b00] flex items-center justify-center transition-colors cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Single 100% Editable TARIFA DINÁMICA Card (Base F-100 Taller Completely Removed) */}
          <div className="atelier-subcard rounded-xl p-3.5 border border-[#e87a50]/40 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#ffb59b]">
                  TARIFA DINÁMICA (ARS / km recorrido)
                </div>
                <div className="text-[11px] text-[#a1a1a1]">
                  100% Editable • Total Flete = Kilómetros × Valor del Kilómetro
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#ffb59b]">$</span>
              <input
                type="number"
                min={0}
                step={50}
                value={ratePerKm}
                onChange={(e) =>
                  onUpdateRatePerKm(
                    Math.max(0, parseInt(e.target.value, 10) || 0)
                  )
                }
                className="w-full bg-[#141616] border border-[#e87a50] rounded-xl px-3 py-2 text-base font-extrabold font-display text-white tabular-nums focus:outline-none"
              />
              <span className="text-xs font-semibold text-[#c8c6c5] shrink-0">
                ARS / km
              </span>
            </div>
          </div>
        </section>

        {/* 4. RESUMEN DE FLETE (Solo Kilómetros × Valor del Kilómetro) */}
        <section className="bg-[#e8e6e5] text-[#1c1b1b] rounded-2xl p-4 space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#e87a50]" />
              <h2 className="text-sm font-bold text-[#2f3131]">
                Resumen de Flete
              </h2>
            </div>

            <span className="bg-[#d2cfce] text-[#b85d38] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              TARIFA POR KM
            </span>
          </div>

          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[#5c5a59] font-medium">
                Trayecto ({effectiveKm} km × {formatARS(ratePerKm)}/km)
              </span>
              <span className="font-bold text-[#2f3131] tabular-nums">
                {formatARS(totalFreightArs)} ARS
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#5c5a59] font-medium">
                Muebles ({productQty}× {selectedDesign.catalogTitle || selectedDesign.name})
              </span>
              <span className="font-bold text-[#2f3131] tabular-nums">
                {formatARS(furnitureSubtotalArs)} ARS
              </span>
            </div>
          </div>

          {/* Inner Total Box */}
          <div className="bg-[#dad7d6] rounded-xl p-3.5 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#e87a50]">
                TOTAL SUGERIDO FLETE
              </div>
              <div className="text-[11px] text-[#5c5a59] mt-0.5">
                {effectiveKm} km × {formatARS(ratePerKm)} (Total c/ Muebles:{' '}
                <strong>{formatARS(combinedOrderTotalArs)}</strong>)
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-extrabold font-display text-[#6b2304] tabular-nums leading-none">
                {formatARS(totalFreightArs)}
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#e87a50] mt-1">
                SOLO FLETE ARS
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Controls */}
        <div className="space-y-2.5">
          {/* Abrir Google Maps & Copiar Detalle */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                'Garibaldi y Triunvirato, Villa Luzuriaga, Buenos Aires'
              )}&destination=${encodeURIComponent(
                destinationAddress || 'Ramos Mejía, Buenos Aires'
              )}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                onShowToast(
                  `Abriendo ruta hacia ${destinationAddress} en Google Maps...`
                )
              }
              className="h-11 rounded-xl bg-[#271e1a] hover:bg-[#332620] border border-[#e87a50]/60 text-[#ffb59b] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer no-underline"
            >
              <Map className="w-4 h-4 text-[#e87a50] shrink-0" />
              <span>Abrir Google Maps</span>
            </a>

            <button
              type="button"
              onClick={handleCopyDetail}
              className="h-11 rounded-xl bg-[#181a1a] hover:bg-[#222424] border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4 text-[#c8c6c5]" />
              <span>Copiar Detalle</span>
            </button>
          </div>

          {/* Primary CTA: CAMBIAR PEDIDO -> Redirects to Todos los Pedidos */}
          <button
            type="button"
            onClick={() => {
              onSubmitFreightToPedidos({
                design: selectedDesign,
                quantity: productQty,
                clientName: clientName.trim() || 'Cliente Taller J&L',
                address: destinationAddress.trim() || 'Ramos Mejía',
                distanceKm: effectiveKm,
                ratePerKm,
                freightArs: totalFreightArs,
                totalArs: combinedOrderTotalArs,
              });
            }}
            className="w-full h-13 rounded-2xl bg-[#e87a50] hover:bg-[#f0855c] active:scale-[0.99] text-[#280b00] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer"
          >
            <span>Cambiar Pedido</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
