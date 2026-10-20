import React, { useState } from 'react';
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
  Archive,
} from 'lucide-react';
import { WorkshopOrder, OrderStage } from '../types/atelier';
import { formatARS } from '../data/initialData';

interface ScreenLogisticaProps {
  activeOrder: WorkshopOrder;
  orders: WorkshopOrder[];
  onSelectOrder: (orderId: string) => void;
  onUpdateOrderStage: (orderId: string, stage: OrderStage) => void;
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
  onSelectOrder,
  onUpdateOrderStage,
  onShowToast,
}) => {
  const [distanceKm, setDistanceKm] = useState<number>(activeOrder.distanceKm || 8.4);
  const [destinationAddress, setDestinationAddress] = useState<string>(
    activeOrder.address || 'Av. de Mayo 850, Ramos Mejía'
  );
  const [roundTrip, setRoundTrip] = useState<boolean>(false);
  const [ratePerKm, setRatePerKm] = useState<number>(1200);
  const [baseRate, setBaseRate] = useState<number>(8000);
  const [showMapsPreview, setShowMapsPreview] = useState<boolean>(false);

  const effectiveKm = Number((distanceKm * (roundTrip ? 2 : 1)).toFixed(1));
  const distanceCostArs = Math.round(effectiveKm * ratePerKm);
  const totalFreightArs = baseRate + distanceCostArs;

  const adjustKm = (delta: number) => {
    setDistanceKm((prev) => {
      const next = Math.max(0.5, Math.min(150, Number((prev + delta).toFixed(1))));
      return next;
    });
  };

  const handleCycleStage = () => {
    const orderStages: OrderStage[] = ['proceso', 'terminado', 'embalado', 'entregado'];
    const idx = orderStages.indexOf(activeOrder.stage);
    const nextStage = orderStages[(idx + 1) % orderStages.length];
    onUpdateOrderStage(activeOrder.id, nextStage);
    onShowToast(`Estado de ${activeOrder.code} cambiado a ${nextStage.toUpperCase()}`);
  };

  const handleCopyDetail = () => {
    const text = `Cotización Flete Muebles J&L (${activeOrder.code} - ${activeOrder.clientName}): Origen Villa Luzuriaga -> ${destinationAddress} (${effectiveKm} km). Base F-100: ${formatARS(baseRate)} + Recorrido: ${formatARS(distanceCostArs)} = Total Sugerido: ${formatARS(totalFreightArs)} ARS.`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    onShowToast('Detalle de cotización de flete copiado al portapapeles');
  };

  // Arc fill ratio (e.g. 8.4km out of ~18km visual scale = ~50% arc fill matching screenshot)
  const arcRatio = Math.min(0.92, Math.max(0.18, effectiveKm / 16.8));

  return (
    <div className="space-y-4 pb-8">
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
        {/* Active Order + Route Gauge */}
        <div className="space-y-4">
          {/* Active Order Dispatch Card */}
          <section className="atelier-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e87a50]" />
                <span className="text-xs font-bold text-white tabular-nums">
                  Orden {activeOrder.code}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={activeOrder.id}
                  onChange={(e) => {
                    const found = orders.find((o) => o.id === e.target.value);
                    if (found) {
                      onSelectOrder(found.id);
                      setDistanceKm(found.distanceKm);
                      setDestinationAddress(found.address);
                    }
                  }}
                  aria-label="Seleccionar orden para despacho"
                  className="bg-[#232525] border border-white/10 text-[#c8c6c5] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider cursor-pointer focus:outline-none"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.code} • LISTO P/ DESPACHO
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold font-display text-white">
                  {activeOrder.clientName}
                </h2>
                <p className="text-xs text-[#b7b5b4] mt-0.5 leading-snug">
                  {activeOrder.packagingSpec}
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-medium text-[#c8c6c5] leading-snug">
                  Melamina Roble
                  <br />
                  Natural 18mm
                </div>
              </div>
            </div>
          </section>

          {/* Route & Semi-Circular Distance Gauge Card */}
          <section className="atelier-card rounded-2xl p-4 space-y-4">
            {/* Semi-Circular Continuous Arc Gauge */}
            <div className="relative flex flex-col items-center justify-center pt-2 pb-1">
              <svg viewBox="0 0 240 130" className="w-60 h-32 overflow-visible">
                {/* Background Track Arc */}
                <path
                  d="M 28 112 A 92 92 0 0 1 212 112"
                  fill="none"
                  stroke="#f2f0ef"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                {/* Foreground Active Terracotta Arc */}
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

            {/* Origin & Destination Trough Card */}
            <div className="atelier-subcard rounded-2xl p-3.5 space-y-3.5 relative">
              {/* Origin Row */}
              <div className="flex items-start gap-3 relative">
                {/* Connecting Vertical Line */}
                <div className="w-0.5 h-10 bg-white/10 absolute left-3.5 top-7" />

                <div className="w-7 h-7 rounded-full bg-[#ffb59b] text-[#380d00] flex items-center justify-center shrink-0 mt-0.5">
                  <Home className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffb59b]">
                      ORIGEN TALLER (FIJO)
                    </span>
                    <span className="bg-[#292a2a] text-[#c8c6c5] text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
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
                      onClick={() => {
                        const currIdx = DESTINATION_PRESETS.findIndex(
                          (p) => p.address === destinationAddress
                        );
                        const nextPreset =
                          DESTINATION_PRESETS[(currIdx + 1) % DESTINATION_PRESETS.length];
                        setDestinationAddress(nextPreset.address);
                        setDistanceKm(nextPreset.km);
                        onShowToast(
                          `Destino cambiado a ${nextPreset.address} (${nextPreset.km} km)`
                        );
                      }}
                      title="Cambiar o limpiar dirección"
                      className="text-[#a1a1a1] hover:text-white cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Fine Mileage Adjustment & Freight Summary */}
        <div className="space-y-4">
          {/* Ajuste Fino de Kilometraje Card */}
          <section className="atelier-card rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-white leading-snug">
                Ajuste Fino de
                <br />
                Kilometraje
              </h2>

              <button
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
                    : 'bg-transparent border-transparent text-[#c8c6c5] hover:bg-white/5'
                }`}
              >
                Ida &amp; Vuelta
                <br />
                <span className="text-[#a1a1a1] text-[11px]">
                  {roundTrip ? 'activo (x2)' : 'opcional'}
                </span>
              </button>
            </div>

            {/* Stepper Control */}
            <div className="bg-[#1e2020] rounded-2xl p-2 flex items-center justify-between border border-white/5">
              <button
                onClick={() => adjustKm(-0.5)}
                className="w-11 h-11 rounded-xl bg-[#151717] hover:bg-[#252727] text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="text-center">
                <div className="flex items-baseline justify-center gap-1 tabular-nums">
                  <span className="text-xl font-bold font-display text-white">
                    {effectiveKm}
                  </span>
                  <span className="text-xs font-bold text-[#c8c6c5]">km</span>
                </div>
                <div className="text-[11px] text-[#a1a1a1]">
                  Distancia computada
                </div>
              </div>

              <button
                onClick={() => adjustKm(0.5)}
                className="w-11 h-11 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#280b00] flex items-center justify-center transition-colors cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Rate Subcards */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => {
                  const next = ratePerKm === 1200 ? 1500 : ratePerKm === 1500 ? 1000 : 1200;
                  setRatePerKm(next);
                  onShowToast(`Tarifa dinámica ajustada a ${formatARS(next)} / km`);
                }}
                className="atelier-subcard rounded-xl p-3 cursor-pointer hover:border-white/15 transition-colors"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
                  TARIFA DINÁMICA
                </div>
                <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
                  {formatARS(ratePerKm)}
                </div>
                <div className="text-[11px] text-[#a1a1a1] mt-0.5">
                  ARS / km recorrido
                </div>
              </div>

              <div
                onClick={() => {
                  const next = baseRate === 8000 ? 10000 : baseRate === 10000 ? 6500 : 8000;
                  setBaseRate(next);
                  onShowToast(`Base operativa F-100 ajustada a ${formatARS(next)}`);
                }}
                className="atelier-subcard rounded-xl p-3 cursor-pointer hover:border-white/15 transition-colors"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
                  BASE F-100 TALLER
                </div>
                <div className="text-lg font-bold font-display text-white mt-1 tabular-nums">
                  {formatARS(baseRate)}
                </div>
                <div className="text-[11px] text-[#a1a1a1] mt-0.5 leading-snug">
                  Salida + Carga y Descarga
                </div>
              </div>
            </div>
          </section>

          {/* Light Elevated Card: Resumen de Flete */}
          <section className="bg-[#e8e6e5] text-[#1c1b1b] rounded-2xl p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#e87a50]" />
                <h2 className="text-sm font-bold text-[#2f3131]">
                  Resumen de Flete
                </h2>
              </div>

              <span className="bg-[#d2cfce] text-[#b85d38] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                TARIFA TALLER J&amp;L
              </span>
            </div>

            <div className="space-y-1.5 text-xs pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[#5c5a59] font-medium">
                  Base F-100 Taller (Salida + Carga)
                </span>
                <span className="font-bold text-[#2f3131] tabular-nums">
                  {formatARS(baseRate)} ARS
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5c5a59] font-medium">
                  Trayecto ({effectiveKm} km × {formatARS(ratePerKm)})
                </span>
                <span className="font-bold text-[#2f3131] tabular-nums">
                  {formatARS(distanceCostArs)} ARS
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5c5a59] font-medium">
                  Film stretch &amp; esquineros
                </span>
                <span className="font-semibold text-[#e87a50]">
                  Sin costo extra
                </span>
              </div>
            </div>

            {/* Inner Total Box */}
            <div className="bg-[#dad7d6] rounded-xl p-3.5 flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#e87a50]">
                  TOTAL SUGERIDO
                </div>
                <div className="text-[11px] text-[#5c5a59] mt-0.5">
                  A abonar con flete o en destino
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-extrabold font-display text-[#6b2304] tabular-nums leading-none">
                  {formatARS(totalFreightArs)}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#e87a50] mt-1">
                  ARS FINAL
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Controls */}
          <div className="space-y-2.5">
            {/* Estado del Pedido Bar */}
            <div className="atelier-card rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ffdbcf] text-[#5b1a00] flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    Estado del Pedido
                  </div>
                  <div className="text-xs text-[#b7b5b4]">
                    Listo p/ Cargar •{' '}
                    <span className="capitalize">{activeOrder.stage}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCycleStage}
                className="bg-[#232525] hover:bg-[#2e3030] border border-white/10 text-white text-xs font-bold px-3.5 py-2 rounded-full transition-colors cursor-pointer shrink-0"
              >
                Cambiar Estado
              </button>
            </div>

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
                onClick={handleCopyDetail}
                className="h-11 rounded-xl bg-[#181a1a] hover:bg-[#222424] border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4 text-[#c8c6c5]" />
                <span>Copiar Detalle</span>
              </button>
            </div>

            {/*Interactive Route Map Preview when toggled */}
            {showMapsPreview && (
              <div className="atelier-card rounded-2xl p-3.5 border border-[#e87a50]/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#ffb59b]">
                    Ruta Directa Zona Oeste: Villa Luzuriaga → {destinationAddress}
                  </span>
                  <button
                    onClick={() => setShowMapsPreview(false)}
                    className="text-[#a1a1a1] hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="h-28 rounded-xl bg-[#141818] border border-white/10 relative overflow-hidden flex items-center justify-center">
                  <svg viewBox="0 0 320 100" className="w-full h-full">
                    <rect width="320" height="100" fill="#15191c" />
                    {/* Street grid */}
                    <path
                      d="M 0 30 L 320 30 M 0 70 L 320 70 M 70 0 L 70 100 M 160 0 L 160 100 M 250 0 L 250 100"
                      stroke="#22282c"
                      strokeWidth="2"
                    />
                    {/* Route polyline */}
                    <path
                      d="M 55 72 L 115 72 L 160 40 L 265 32"
                      fill="none"
                      stroke="#e87a50"
                      strokeWidth="3.5"
                      strokeDasharray="6 3"
                    />
                    <circle cx="55" cy="72" r="5" fill="#ffb59b" />
                    <text x="25" y="90" fill="#c8c6c5" fontSize="9" fontWeight="bold">
                      Taller J&amp;L
                    </text>
                    <circle cx="265" cy="32" r="6" fill="#e87a50" />
                    <text x="210" y="18" fill="#ffb59b" fontSize="9" fontWeight="bold">
                      Destino ({effectiveKm} km)
                    </text>
                  </svg>
                </div>
              </div>
            )}

            {/* Primary CTA: CARGAR PEDIDO AL FLETE */}
            <button
              onClick={() => {
                onUpdateOrderStage(activeOrder.id, 'entregado');
                onShowToast(
                  `Orden ${activeOrder.code} cargada a F-100 Taller • Total flete ${formatARS(totalFreightArs)} ARS`
                );
              }}
              className="w-full h-13 rounded-2xl bg-[#e87a50] hover:bg-[#f0855c] active:scale-[0.99] text-[#280b00] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer"
            >
              <Archive className="w-4 h-4 stroke-[2.2]" />
              <span>CARGAR PEDIDO AL FLETE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
