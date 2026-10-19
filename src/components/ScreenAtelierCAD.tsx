import React, { useState } from 'react';
import {
  Box,
  Armchair,
  FileUp,
  Layers,
  Maximize2,
  Palette,
  Ruler,
  TrendingUp,
  ListChecks,
  RefreshCw,
  Rocket,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { FurnitureDesign } from '../types/atelier';
import { formatARS } from '../data/initialData';

interface ScreenAtelierCADProps {
  design: FurnitureDesign;
  onUpdateDesignTextures: (
    body: 'Blanco Puro' | 'Negro Grafito',
    front: 'Carvalho' | 'Báltico' | 'Gaudí'
  ) => void;
  onGoToCatalogo: () => void;
  onLaunchToProduction: () => void;
  onShowToast: (msg: string) => void;
}

export const ScreenAtelierCAD: React.FC<ScreenAtelierCADProps> = ({
  design,
  onUpdateDesignTextures,
  onGoToCatalogo,
  onLaunchToProduction,
  onShowToast,
}) => {
  const [cameraMode, setCameraMode] = useState<'Auto' | 'Frente' | 'Iso' | 'Planta'>('Iso');
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [showTechSheet, setShowTechSheet] = useState<boolean>(false);

  const bodyFill =
    design.bodyTexture === 'Blanco Puro' ? '#f3f1ed' : '#2b2d2f';
  const bodySideFill =
    design.bodyTexture === 'Blanco Puro' ? '#dedad2' : '#1f2123';
  const bodyStroke =
    design.bodyTexture === 'Blanco Puro' ? '#c8c3b8' : '#3e4144';

  const frontFillMap = {
    Carvalho: '#c9945c',
    Báltico: '#dfc39d',
    Gaudí: '#785337',
  };
  const frontFill = frontFillMap[design.frontTexture];

  const activeTextureLabel =
    design.frontTexture === 'Carvalho'
      ? 'Carvalho Mezzo'
      : design.frontTexture === 'Báltico'
      ? 'Roble Báltico'
      : 'Nogal Gaudí';

  const cadBomRows = [
    {
      num: '01',
      title: `Placa Melamina 18mm ${design.bodyTexture}`,
      subtitle: 'Carcasa principal cajonera',
      qty: '0.42 m²',
      subQty: '1 un.',
    },
    {
      num: '02',
      title: `Frente ${activeTextureLabel} 18mm`,
      subtitle: 'Veta horizontal continuada',
      qty: '0.08 m²',
      subQty: '1 un.',
    },
    {
      num: '03',
      title: 'Cantos PVC 22mm × 0.45mm',
      subtitle: 'Pegado termofusión taller',
      qty: '4.8 m',
      subQty: 'Rollos 50m',
    },
    {
      num: '04',
      title: 'Correderas Telescópicas 350mm Ducasse',
      subtitle: 'Cierre suave reforzado',
      qty: '1 Par',
      subQty: 'Herraje H35',
    },
    {
      num: '05',
      title: 'Tornillos Soberbios 7×50mm',
      subtitle: 'Cabeza Allen cincados',
      qty: '16 un.',
      subQty: '+ Tapas PVC',
    },
    {
      num: '06',
      title: 'Regatones Cónicos Paraíso',
      subtitle: 'Madera maciza lustrada',
      qty: '4 un.',
      subQty: 'Pata 15cm',
    },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#ffb59b]">
            <Box className="w-3.5 h-3.5 shrink-0" />
            <span>ATELIER CAD • MODELADO ACTIVO</span>
          </div>
          <span className="bg-[#3d231a] text-[#ffb59b] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            EN TALLER
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            {design.name}
          </h1>
          <span className="text-xs font-semibold text-[#b7b5b4] tabular-nums">
            Cod: {design.code}
          </span>
        </div>

        <p className="text-xs text-[#b7b5b4] leading-relaxed">
          Visor tridimensional WebGL e insumos de fabricación para corte y ensamble.
        </p>

        {/* Top 2 Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onGoToCatalogo}
            className="h-11 rounded-xl bg-[#181a1a] hover:bg-[#232525] border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Armchair className="w-4 h-4 text-[#c8c6c5]" />
            <span>Ir a Catálogo</span>
          </button>

          <button
            onClick={() =>
              onShowToast('Malla 3D sincronizada: MN-4555_Nordica_V1.glb (60 FPS WebGL)')
            }
            className="h-11 rounded-xl bg-[#181a1a] hover:bg-[#232525] border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <FileUp className="w-4 h-4 text-[#ffb59b]" />
            <span>Cargar .GLB</span>
          </button>
        </div>
      </div>

      {/* Vertical Mobile Stack */}
      <div className="space-y-4">
        {/* 3D Viewport + Customization */}
        <div className="space-y-4">
          {/* Interactive 3D CAD Viewport Card */}
          <section className="atelier-card rounded-2xl p-3.5 cad-grid-bg relative overflow-hidden">
            {/* Viewport Top Controls */}
            <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
              <div className="bg-[#1c1e1e] border border-white/10 rounded-full p-1 flex items-center gap-0.5">
                {(['Auto', 'Frente', 'Iso', 'Planta'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCameraMode(mode)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      cameraMode === mode
                        ? 'bg-[#e87a50] text-[#280b00]'
                        : 'text-[#c8c6c5] hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setWireframe((w) => !w)}
                  title="Alternar Malla Técnica Wireframe"
                  className={`w-8 h-8 rounded-full flex items-center justify-center border border-white/10 transition-colors cursor-pointer ${
                    wireframe
                      ? 'bg-[#e87a50] text-[#121414]'
                      : 'bg-[#1c1e1e] text-[#c8c6c5] hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setCameraMode('Iso');
                    setWireframe(false);
                    setActiveHotspot(null);
                    onShowToast('Cámara centrada en vista isométrica 1:1');
                  }}
                  title="Restablecer Cámara"
                  className="w-8 h-8 rounded-full bg-[#1c1e1e] hover:bg-[#282a2a] text-[#c8c6c5] hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Studio Render Frame Inside Grid Canvas */}
            <div className="py-5 px-4 flex items-center justify-center relative">
              <div
                className={`w-full max-w-[320px] aspect-[16/10] rounded-lg overflow-hidden relative shadow-2xl border border-white/10 transition-transform duration-500 ${
                  cameraMode === 'Auto' ? 'scale-[1.03]' : ''
                }`}
                style={{
                  background: wireframe
                    ? '#161919'
                    : 'linear-gradient(165deg, #e5e1da 0%, #dcd7cf 55%, #cfc9bf 100%)',
                }}
              >
                {/* Render SVG for Iso / Frente / Planta */}
                <svg viewBox="0 0 320 200" className="w-full h-full">
                  {!wireframe && (
                    /* Soft ambient floor shadow */
                    <ellipse
                      cx="158"
                      cy="160"
                      rx="68"
                      ry="12"
                      fill="rgba(0,0,0,0.16)"
                    />
                  )}

                  {cameraMode === 'Planta' ? (
                    /* Top-down Planta technical projection */
                    <g>
                      <rect
                        x="85"
                        y="35"
                        width="150"
                        height="120"
                        fill={wireframe ? 'none' : bodyFill}
                        stroke="#e87a50"
                        strokeWidth="2"
                      />
                      <rect
                        x="93"
                        y="43"
                        width="134"
                        height="104"
                        fill="none"
                        stroke="#717171"
                        strokeDasharray="4 3"
                      />
                      <text
                        x="160"
                        y="95"
                        textAnchor="middle"
                        fill={wireframe ? '#ffb59b' : '#2f3131'}
                        fontSize="10"
                        fontWeight="bold"
                      >
                        PLANTA 450 × 380 mm
                      </text>
                      <text
                        x="160"
                        y="112"
                        textAnchor="middle"
                        fill="#e87a50"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        Guías Ducasse 350mm
                      </text>
                    </g>
                  ) : cameraMode === 'Frente' ? (
                    /* Front Elevation view */
                    <g>
                      {/* Legs */}
                      <polygon
                        points="108,118 116,118 108,158 101,158"
                        fill={wireframe ? 'none' : '#d8be9e'}
                        stroke="#9b7c56"
                      />
                      <polygon
                        points="212,118 204,118 212,158 219,158"
                        fill={wireframe ? 'none' : '#d8be9e'}
                        stroke="#9b7c56"
                      />
                      {/* Main Box */}
                      <rect
                        x="96"
                        y="48"
                        width="128"
                        height="70"
                        rx="2"
                        fill={wireframe ? 'none' : bodyFill}
                        stroke={wireframe ? '#e87a50' : bodyStroke}
                        strokeWidth="2"
                      />
                      {/* Drawer Front */}
                      <rect
                        x="102"
                        y="54"
                        width="116"
                        height="58"
                        rx="1.5"
                        fill={wireframe ? 'none' : frontFill}
                        stroke="#8a623c"
                        strokeWidth="1.2"
                      />
                      {/* Finger pull cutout */}
                      <path
                        d="M 142 54 L 146 61 L 174 61 L 178 54 Z"
                        fill={wireframe ? '#161919' : '#3a2c20'}
                      />
                    </g>
                  ) : (
                    /* Default Isometric 3D Studio Render matching Image_7 */
                    <g>
                      {/* Back-Left Leg */}
                      <polygon
                        points="126,115 133,115 129,147 123,147"
                        fill={wireframe ? 'none' : '#c4aa89'}
                        stroke="#9e8464"
                        strokeWidth="0.8"
                      />
                      {/* Front-Left Leg */}
                      <polygon
                        points="108,116 116,116 107,156 100,156"
                        fill={wireframe ? 'none' : '#DFC8AA'}
                        stroke="#b59b7b"
                        strokeWidth="0.8"
                      />
                      {/* Back-Right Leg */}
                      <polygon
                        points="168,116 175,116 179,148 173,148"
                        fill={wireframe ? 'none' : '#c4aa89'}
                        stroke="#9e8464"
                        strokeWidth="0.8"
                      />
                      {/* Front-Right Leg */}
                      <polygon
                        points="182,120 190,120 197,159 189,159"
                        fill={wireframe ? 'none' : '#DFC8AA'}
                        stroke="#b59b7b"
                        strokeWidth="0.8"
                      />

                      {/* Left Side Panel (Isometric perspective) */}
                      <polygon
                        points="98,55 134,64 134,122 98,112"
                        fill={wireframe ? 'none' : bodySideFill}
                        stroke={wireframe ? '#ffb59b' : bodyStroke}
                        strokeWidth="1"
                      />

                      {/* Top Panel (Isometric perspective) */}
                      <polygon
                        points="98,55 172,49 212,57 134,64"
                        fill={wireframe ? 'none' : bodyFill}
                        stroke={wireframe ? '#ffb59b' : bodyStroke}
                        strokeWidth="1"
                      />

                      {/* Front Carcass Frame */}
                      <polygon
                        points="134,64 212,57 212,115 134,122"
                        fill={wireframe ? 'none' : bodyFill}
                        stroke={wireframe ? '#ffb59b' : bodyStroke}
                        strokeWidth="1.2"
                      />

                      {/* Textured Wood Drawer Front (Carvalho / Báltico / Gaudí) */}
                      <polygon
                        points="138,68 208,61 208,111 138,118"
                        fill={wireframe ? 'none' : frontFill}
                        stroke="#8c5f37"
                        strokeWidth="1"
                      />

                      {/* Horizontal Wood Grain Lines on Drawer */}
                      {!wireframe && (
                        <g stroke="rgba(75,42,14,0.18)" strokeWidth="1">
                          <line x1="140" y1="78" x2="206" y2="72" />
                          <line x1="140" y1="90" x2="206" y2="84" />
                          <line x1="140" y1="103" x2="206" y2="97" />
                        </g>
                      )}

                      {/* Top Finger-Pull Recessed Handle on Drawer */}
                      <polygon
                        points="163,65.5 186,63.3 183,69.5 166,71"
                        fill="#3b2b1e"
                      />
                    </g>
                  )}
                </svg>

                {/* Hotspot 1 (Top-Left Carcass) */}
                <button
                  onClick={() =>
                    setActiveHotspot(
                      'Ensamble 45° • Placa Melamina 18mm ' + design.bodyTexture
                    )
                  }
                  title="Inspeccionar Carcasa"
                  className="w-6 h-6 rounded-full bg-[#e87a50] border-2 border-[#ffb59b] shadow-lg absolute top-2 left-10 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
                />

                {/* Hotspot 2 (Bottom-Right Leg) */}
                <button
                  onClick={() =>
                    setActiveHotspot(
                      'Regatones Cónicos Madera Paraíso 15cm • Inclinación 12°'
                    )
                  }
                  title="Inspeccionar Patas Cónicas"
                  className="w-5 h-5 rounded-full bg-[#e87a50] border-2 border-[#121414] shadow-lg absolute bottom-5 right-12 cursor-pointer hover:scale-110 transition-transform"
                />
              </div>
            </div>

            {activeHotspot && (
              <div className="mb-3 px-3 py-1.5 rounded-lg bg-[#2c1d17] border border-[#e87a50]/50 flex items-center justify-between text-xs text-[#ffdbcf]">
                <span>{activeHotspot}</span>
                <button
                  onClick={() => setActiveHotspot(null)}
                  className="text-[#ffb59b] hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Bottom-Left Status Pill inside Viewport */}
            <div className="inline-flex items-center gap-2 bg-[#1a1c1c] border border-white/10 rounded-full px-3 py-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#e87a50]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5]">
                RENDER WEBGL 60 FPS • ESCALA 1:1
              </span>
            </div>
          </section>

          {/* CARD: PERSONALIZACIÓN & TEXTURAS */}
          <section className="atelier-card rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#ffb59b]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white leading-tight">
                  PERSONALIZACIÓN &amp;
                  <br />
                  TEXTURAS
                </h2>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-[#a1a1a1]">Textura Activa:</div>
                <div className="text-xs font-bold text-white">
                  {activeTextureLabel}
                </div>
              </div>
            </div>

            {/* Estructura Base (Cuerpo) */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#c8c6c5]">
                Estructura Base (Cuerpo)
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() =>
                    onUpdateDesignTextures('Blanco Puro', design.frontTexture)
                  }
                  className={`h-11 rounded-xl px-3 flex items-center gap-2.5 text-xs font-bold border transition-all cursor-pointer ${
                    design.bodyTexture === 'Blanco Puro'
                      ? 'bg-[#362119] border-[#6b4132] text-white'
                      : 'bg-[#1e2020] border-white/5 text-[#c8c6c5] hover:text-white'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#ffb59b]" />
                  </span>
                  <span>Blanco Puro</span>
                </button>

                <button
                  onClick={() =>
                    onUpdateDesignTextures('Negro Grafito', design.frontTexture)
                  }
                  className={`h-11 rounded-xl px-3 flex items-center gap-2.5 text-xs font-bold border transition-all cursor-pointer ${
                    design.bodyTexture === 'Negro Grafito'
                      ? 'bg-[#362119] border-[#6b4132] text-white'
                      : 'bg-[#1e2020] border-white/5 text-[#c8c6c5] hover:text-white'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-[#c8c6c5] shrink-0" />
                  <span>Negro Grafito</span>
                </button>
              </div>
            </div>

            {/* Frente de Cajón (Melamina Texturada) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#c8c6c5]">
                  Frente de Cajón (Melamina Texturada)
                </span>
                <button
                  onClick={() => setShowTechSheet((s) => !s)}
                  className="text-xs font-bold text-[#ffb59b] hover:text-[#e87a50] cursor-pointer"
                >
                  Ver ficha técnica
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() =>
                    onUpdateDesignTextures(design.bodyTexture, 'Carvalho')
                  }
                  className={`h-10 px-3.5 rounded-full flex items-center gap-2 text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    design.frontTexture === 'Carvalho'
                      ? 'bg-[#e87a50] text-[#280b00]'
                      : 'bg-[#1e2020] text-[#c8c6c5] border border-white/10'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-[#c9945c] border border-black/20" />
                  <span>Carvalho</span>
                  <span className="bg-[#5b1a00]/25 text-[9px] px-1.5 py-0.5 rounded uppercase font-extrabold">
                    PNG
                  </span>
                </button>

                <button
                  onClick={() =>
                    onUpdateDesignTextures(design.bodyTexture, 'Báltico')
                  }
                  className={`h-10 px-3.5 rounded-full flex items-center gap-2 text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    design.frontTexture === 'Báltico'
                      ? 'bg-[#e87a50] text-[#280b00]'
                      : 'bg-[#1e2020] text-[#c8c6c5] border border-white/10'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-[#dfc39d] border border-black/20" />
                  <span>Báltico</span>
                </button>

                <button
                  onClick={() =>
                    onUpdateDesignTextures(design.bodyTexture, 'Gaudí')
                  }
                  className={`h-10 px-3.5 rounded-full flex items-center gap-2 text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    design.frontTexture === 'Gaudí'
                      ? 'bg-[#e87a50] text-[#280b00]'
                      : 'bg-[#1e2020] text-[#c8c6c5] border border-white/10'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-[#785337] border border-black/20" />
                  <span>Gaudí</span>
                </button>
              </div>

              {showTechSheet && (
                <div className="p-3 rounded-xl bg-[#222424] border border-white/10 text-xs text-[#c8c6c5] space-y-1">
                  <div className="font-bold text-white">
                    Ficha Técnica Faplac Línea Texturada ({activeTextureLabel})
                  </div>
                  <div>
                    Sustrato MDP 18mm densidad 680 kg/m³ • Impregnación melamínica doble cara resistente a abrasión (350 ciclos Taber).
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Dimensions, Margin, Cost Bar & BOM Breakdown */}
        <div className="space-y-4">
          {/* 2-Column KPI Cards: Cotas Finales & Margen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="atelier-card rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
                <Ruler className="w-3.5 h-3.5 text-[#c8c6c5]" />
                <span>COTAS FINALES</span>
              </div>
              <div className="text-lg font-bold font-display text-white mt-2 tabular-nums">
                {design.widthMm} × {design.heightMm} × {design.depthMm}
              </div>
              <div className="text-[11px] text-[#a1a1a1] mt-1">
                Ancho × Alto × Prof. (mm)
              </div>
            </div>

            <div className="atelier-card rounded-2xl p-4">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#b7b5b4]">
                  <TrendingUp className="w-3.5 h-3.5 text-[#ffb59b]" />
                  <span>MARGEN</span>
                </div>
                <span className="bg-[#3d231a] text-[#ffb59b] text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                  +61.8%
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-2 tabular-nums">
                <span className="text-lg font-bold font-display text-white">
                  {formatARS(design.suggestedPvpArs)}
                </span>
                <span className="text-xs text-[#a1a1a1]">ARS</span>
              </div>
              <div className="text-[11px] text-[#a1a1a1] mt-1">
                PVP Sugerido en Local
              </div>
            </div>
          </div>

          {/* Costo Insumos Directo Card */}
          <section className="atelier-card rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#c8c6c5]">
                Costo Insumos Directo:
              </span>
              <span className="font-bold text-white tabular-nums">
                {formatARS(design.baseCostArs)} ARS
              </span>
            </div>

            {/* Segmented Horizontal Cost Bar */}
            <div className="w-full h-2 bg-[#292a2a] rounded-full overflow-hidden flex gap-0.5">
              <div className="h-full bg-[#e87a50] w-[38%] rounded-l-full" />
              <div className="h-full bg-[#ffb59b] w-[24%]" />
              <div className="h-full bg-[#383939] flex-1 rounded-r-full" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#b7b5b4]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#e87a50]" />
                <span>Melaminas (38%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ffb59b]" />
                <span>Herrajes (24%)</span>
              </span>
              <span>Mano de obra Taller</span>
            </div>
          </section>

          {/* DESGLOSE DE INSUMOS (BOM) Card */}
          <section className="atelier-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <ListChecks className="w-4 h-4 text-[#ffb59b] mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                    DESGLOSE DE INSUMOS (BOM)
                  </h2>
                  <p className="text-[11px] text-[#a1a1a1] mt-0.5">
                    6 ítems sincronizados con Optim 2D
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  onShowToast('BOM sincronizado con Guillotina Optim 2D v4.2')
                }
                className="p-2 rounded-lg hover:bg-white/5 text-[#c8c6c5] hover:text-white cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {cadBomRows.map((row) => (
                <div
                  key={row.num}
                  className="atelier-subcard rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#161818] text-[#ffb59b] text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                      {row.num}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {row.title}
                      </div>
                      <div className="text-[11px] text-[#a1a1a1] truncate">
                        {row.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 tabular-nums">
                    <div className="text-xs font-bold text-white">{row.qty}</div>
                    <div className="text-[11px] text-[#a1a1a1]">{row.subQty}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom Action CTA Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={onLaunchToProduction}
              className="w-full h-12 rounded-2xl bg-[#ffb59b] hover:bg-[#ffc4af] text-[#280b00] font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              <span>Lanzar a Producción en Taller</span>
            </button>

            <button
              onClick={onGoToCatalogo}
              className="w-full h-11 rounded-2xl bg-[#181a1a] hover:bg-[#232525] border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#c8c6c5]" />
              <span>Editar Escandallo / Materiales</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
