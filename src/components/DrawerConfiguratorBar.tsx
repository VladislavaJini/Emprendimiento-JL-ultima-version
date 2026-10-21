import React, { useState } from 'react';
import {
  Layers,
  AlertTriangle,
  Settings2,
  ChevronDown,
  ChevronUp,
  Ruler,
  Wrench,
  Disc,
  Box,
} from 'lucide-react';
import {
  DrawerSpec,
  InventoryItem,
  CutPiece,
  PredefinedCut,
} from '../types/atelier';
import {
  getInternalAvailableHeight,
  getMaxDrawersAllowed,
  generateDefaultDrawers,
  validateDrawersFit,
  calcDrawerEdgeMeters,
  calcPieceEdgeMetersBySides,
} from '../utils/drawerEngine';
import { formatARS } from '../data/initialData';

interface DrawerConfiguratorBarProps {
  drawerCount: number;
  drawersConfig: DrawerSpec[];
  cabinetWidthMm: number;
  cabinetHeightMm: number;
  cabinetDepthMm: number;
  edgePricePerMeterArs?: number;
  inventoryItems?: InventoryItem[];
  cutPieces?: CutPiece[];
  predefinedCuts?: PredefinedCut[];
  onChange: (newCount: number, newConfig: DrawerSpec[]) => void;
}

const DRAWER_BUTTON_NUMBERS = [0, 1, 2, 3, 4, 5, 6];
const EDGE_SIDES_BUTTONS: (0 | 1 | 2 | 3 | 4)[] = [0, 1, 2, 3, 4];

export const DrawerConfiguratorBar: React.FC<DrawerConfiguratorBarProps> = ({
  drawerCount,
  drawersConfig,
  cabinetWidthMm,
  cabinetHeightMm,
  cabinetDepthMm,
  edgePricePerMeterArs = 650,
  inventoryItems = [],
  cutPieces = [],
  predefinedCuts = [],
  onChange,
}) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [activeDrawerTab, setActiveDrawerTab] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeW = Number(cabinetWidthMm) || 450;
  const safeH = Number(cabinetHeightMm) || 550;
  const safeD = Number(cabinetDepthMm) || 380;

  const internalHeight = getInternalAvailableHeight(safeH);
  const maxDrawers = getMaxDrawersAllowed(safeH);

  // Extract wood pieces & hardware from inventory for quick selection
  const woodInventoryOptions = inventoryItems.filter(
    (it) => it && it.category === 'pieza_cortada'
  );
  const hardwareInventoryOptions = inventoryItems.filter(
    (it) => it && it.category === 'herraje'
  );

  const handleSelectDrawerCount = (num: number) => {
    if (num > maxDrawers) {
      setErrorMessage(
        `Límite físico alcanzado: En una mesa de ${safeW} × ${safeH} mm (altura útil interna de ${internalHeight} mm) caben máximo ${maxDrawers} cajones.`
      );
      return;
    }
    setErrorMessage(null);
    const nextConfig = generateDefaultDrawers(num, safeW, safeH, safeD).map(
      (d) => ({
        ...d,
        edgePricePerMeterArs: edgePricePerMeterArs || 650,
        edgeCostArs: Math.round(
          d.edgeMeters * (Number(edgePricePerMeterArs) || 650)
        ),
      })
    );
    if (activeDrawerTab >= num) {
      setActiveDrawerTab(Math.max(0, num - 1));
    }
    onChange(num, nextConfig);
  };

  const handleUpdateDrawerField = (
    idx: number,
    updates: Partial<DrawerSpec>,
    recalculateEdge = true
  ) => {
    const safeList = Array.isArray(drawersConfig) ? [...drawersConfig] : [];
    if (!safeList[idx]) return;
    const merged: DrawerSpec = { ...safeList[idx], ...updates };

    if (recalculateEdge) {
      const autoMeters = calcDrawerEdgeMeters(merged);
      const pricePerM =
        Number(merged.edgePricePerMeterArs) ||
        Number(edgePricePerMeterArs) ||
        650;
      merged.edgeMeters = autoMeters;
      merged.edgePricePerMeterArs = pricePerM;
      merged.edgeCostArs = Math.round(autoMeters * pricePerM);
    }

    safeList[idx] = merged;

    const check = validateDrawersFit(safeList, safeH);
    if (!check.valid) {
      setErrorMessage(
        check.errorMsg ||
          'La suma de las alturas de los frentes supera la altura útil de la mesa.'
      );
    } else {
      setErrorMessage(null);
    }
    onChange(drawerCount, safeList);
  };

  const safeDrawers = Array.isArray(drawersConfig) ? drawersConfig : [];
  const currentDrawer =
    safeDrawers[Math.min(activeDrawerTab, Math.max(0, safeDrawers.length - 1))];

  return (
    <div className="p-3.5 rounded-2xl bg-[#181a1a] border border-white/10 space-y-3">
      {/* Header & Physical Constraint Summary */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#e87a50]" />
            <span>Barra de Cajones (0 al 6)</span>
          </div>
          <div className="text-[10.5px] text-[#c8c6c5] mt-0.5">
            Cota mesa:{' '}
            <strong className="text-white">
              {safeW}×{safeH}×{safeD} mm
            </strong>{' '}
            • Vano útil:{' '}
            <strong className="text-[#ffb59b]">{internalHeight} mm</strong>{' '}
            (Máx: {maxDrawers})
          </div>
        </div>

        {drawerCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="px-2.5 py-1 rounded-lg bg-[#242626] hover:bg-[#2e3131] text-[11px] font-bold text-[#ffb59b] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Settings2 className="w-3 h-3" />
            <span>{expanded ? 'Ocultar' : 'Editar Cajones'}</span>
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Numeric Selector Bar [0] [1] [2] [3] [4] [5] [6] */}
      <div className="grid grid-cols-7 gap-1.5">
        {DRAWER_BUTTON_NUMBERS.map((num) => {
          const isSelected = drawerCount === num;
          const isOverLimit = num > maxDrawers;
          return (
            <button
              key={num}
              type="button"
              onClick={() => handleSelectDrawerCount(num)}
              className={`h-9 rounded-xl font-bold text-xs tabular-nums transition-all cursor-pointer flex flex-col items-center justify-center border ${
                isSelected
                  ? 'bg-[#e87a50] text-[#1f0800] border-[#ffb59b] shadow-md scale-[1.03]'
                  : isOverLimit
                  ? 'bg-[#221919] text-[#8a5a5a] border-rose-500/25 hover:border-rose-500/50'
                  : 'bg-[#222424] text-[#e3e2e2] border-white/10 hover:bg-[#2c2e2e]'
              }`}
              title={
                isOverLimit
                  ? `Supera la altura física útil (${internalHeight} mm)`
                  : `${num} ${num === 1 ? 'cajón' : 'cajones'}`
              }
            >
              <span>{num}</span>
            </button>
          );
        })}
      </div>

      {/* Physical Dimension Validation Alert */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="leading-snug font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Detailed 100% Editable Drawer Configuration Panel */}
      {drawerCount > 0 && expanded && currentDrawer && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          {/* Tabs to switch between Cajón #1 .. Cajón #N */}
          {safeDrawers.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {safeDrawers.map((d, idx) => (
                <button
                  key={d.id || idx}
                  type="button"
                  onClick={() => setActiveDrawerTab(idx)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    activeDrawerTab === idx
                      ? 'bg-[#36231c] text-[#ffb59b] border border-[#e87a50]/60'
                      : 'bg-[#222424] text-[#a1a1a1] hover:text-white'
                  }`}
                >
                  Cajón #{idx + 1} ({d.frontHeightMm}mm • {d.edgeMeters}m filo)
                </button>
              ))}
            </div>
          )}

          <div className="p-3 rounded-xl bg-[#141616] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#ffb59b]">
                Configuración a Medida • Cajón #
                {currentDrawer.index || activeDrawerTab + 1}
              </span>
              <span className="text-[10px] text-[#a1a1a1]">100% Editable</span>
            </div>

            {/* 1. MADERAS DEL CAJÓN (Frente, Laterales, Contrafrente) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                <Ruler className="w-3.5 h-3.5 text-[#e87a50]" />
                <span>
                  1. Maderas del Cajón (Frente, Laterales y Contrafrente)
                </span>
              </div>

              {/* Quick Wood Cut Selector from Inventory / Cutter */}
              <div>
                <label className="block text-[10px] text-[#c8c6c5] mb-1">
                  Autocompletar madera desde Inventario / Guillotina:
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (val.startsWith('inv-')) {
                      const found = woodInventoryOptions.find(
                        (i) => i.id === val
                      );
                      if (found) {
                        const dims = found.subtitle.match(
                          /(\d+)\s*[×x]\s*(\d+)/
                        );
                        handleUpdateDrawerField(activeDrawerTab, {
                          frontPieceName: found.name,
                          ...(dims
                            ? {
                                frontWidthMm:
                                  parseInt(dims[1], 10) ||
                                  currentDrawer.frontWidthMm,
                                frontHeightMm:
                                  parseInt(dims[2], 10) ||
                                  currentDrawer.frontHeightMm,
                              }
                            : {}),
                        });
                      }
                    } else if (val.startsWith('cut-')) {
                      const found = cutPieces.find((c) => c.id === val);
                      if (found) {
                        handleUpdateDrawerField(activeDrawerTab, {
                          frontPieceName: found.name,
                          frontWidthMm: found.widthMm,
                          frontHeightMm: found.heightMm,
                        });
                      }
                    } else if (val.startsWith('pre-')) {
                      const found = predefinedCuts.find((p) => p.id === val);
                      if (found) {
                        handleUpdateDrawerField(activeDrawerTab, {
                          frontPieceName: found.name,
                          frontWidthMm: found.widthMm,
                          frontHeightMm: found.heightMm,
                        });
                      }
                    }
                  }}
                  className="w-full bg-[#222424] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white cursor-pointer"
                >
                  <option value="">
                    -- Seleccionar pieza de madera o escribir abajo --
                  </option>
                  {woodInventoryOptions.length > 0 && (
                    <optgroup label="Piezas de Madera en Inventario">
                      {woodInventoryOptions.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.subtitle} • Stock: {w.stockQty})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {cutPieces.length > 0 && (
                    <optgroup label="Cortes en Guillotina 2D">
                      {cutPieces.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.widthMm}×{c.heightMm} mm)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {predefinedCuts.length > 0 && (
                    <optgroup label="Plantillas Predefinidas">
                      {predefinedCuts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.widthMm}×{p.heightMm} mm)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Frente de Cajón */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Frente Largo (mm)
                  </label>
                  <input
                    type="number"
                    value={currentDrawer.frontWidthMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        frontWidthMm: parseInt(e.target.value, 10) || 100,
                      })
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#ffb59b] mb-0.5">
                    Frente Prof./Alto (mm)
                  </label>
                  <input
                    type="number"
                    value={currentDrawer.frontHeightMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        frontHeightMm: parseInt(e.target.value, 10) || 75,
                      })
                    }
                    className="w-full bg-[#222424] border border-[#e87a50] rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Cant. Frente
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={currentDrawer.frontQty ?? 1}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        frontQty: Math.max(
                          1,
                          parseInt(e.target.value, 10) || 1
                        ),
                      })
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>

              {/* Laterales y Contrafrente */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Lateral Profundidad (mm)
                  </label>
                  <input
                    type="number"
                    value={currentDrawer.sidesDepthMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        sidesDepthMm: parseInt(e.target.value, 10) || 250,
                      })
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Lateral Alto (mm)
                  </label>
                  <input
                    type="number"
                    value={currentDrawer.sidesHeightMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        sidesHeightMm: parseInt(e.target.value, 10) || 60,
                        backHeightMm: parseInt(e.target.value, 10) || 60,
                      })
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Contrafrente Largo (mm)
                  </label>
                  <input
                    type="number"
                    value={currentDrawer.backWidthMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        backWidthMm: parseInt(e.target.value, 10) || 200,
                      })
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* 2. FONDO DE CAJÓN */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                <Box className="w-3.5 h-3.5 text-[#e87a50]" />
                <span>2. Fondo de Cajón (Fibroplus / MDF 3mm)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Largo Fondo (mm)
                  </label>
                  <input
                    type="number"
                    value={currentDrawer.bottomWidthMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        bottomWidthMm: parseInt(e.target.value, 10) || 200,
                      })
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Profundidad Fondo (mm)
                  </label>
                  <input
                    type="number"
                    value={currentDrawer.bottomDepthMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        bottomDepthMm: parseInt(e.target.value, 10) || 250,
                      })
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Cant. Fondos
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={currentDrawer.bottomQty ?? 1}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        bottomQty: Math.max(
                          1,
                          parseInt(e.target.value, 10) || 1
                        ),
                      })
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* 3. FILO / TAPACANTOS CON SELECTOR DE LADOS (0, 1, 2, 3 o 4 Lados) */}
            <div className="space-y-2.5 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                  <Disc className="w-3.5 h-3.5 text-[#e87a50]" />
                  <span>3. Filo del Cajón (Elegir Lados con Filo)</span>
                </div>
                <span className="text-[10px] font-extrabold text-[#ffb59b] tabular-nums">
                  {currentDrawer.edgeMeters.toFixed(2)} m •{' '}
                  {formatARS(
                    Math.round(
                      currentDrawer.edgeMeters *
                        (Number(currentDrawer.edgePricePerMeterArs) ||
                          Number(edgePricePerMeterArs) ||
                          650)
                    )
                  )}
                </span>
              </div>

              {/* Selector de cuántos lados llevan filo en el Frente del Cajón */}
              <div className="bg-[#1b1d1d] p-2.5 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#c8c6c5]">
                    Lados con filo en Frente ({currentDrawer.frontWidthMm}×
                    {currentDrawer.frontHeightMm}mm):
                  </span>
                  <span className="font-bold text-[#ffb59b] tabular-nums">
                    {
                      calcPieceEdgeMetersBySides(
                        currentDrawer.frontWidthMm,
                        currentDrawer.frontHeightMm,
                        (currentDrawer.edgeSidesCount ?? 4) as
                          | 0
                          | 1
                          | 2
                          | 3
                          | 4,
                        currentDrawer.frontQty || 1
                      ).toFixed(2)
                    }{' '}
                    m
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {EDGE_SIDES_BUTTONS.map((sidesNum) => {
                    const active =
                      (currentDrawer.edgeSidesCount ?? 4) === sidesNum;
                    return (
                      <button
                        key={sidesNum}
                        type="button"
                        onClick={() =>
                          handleUpdateDrawerField(activeDrawerTab, {
                            edgeSidesCount: sidesNum,
                          })
                        }
                        className={`py-1.5 rounded-lg text-[10px] font-extrabold border cursor-pointer transition-all ${
                          active
                            ? 'bg-[#e87a50] text-[#121414] border-[#ffb59b] shadow-xs'
                            : 'bg-[#222424] text-[#c8c6c5] border-white/10 hover:text-white'
                        }`}
                      >
                        {sidesNum === 0
                          ? '0 Lados'
                          : sidesNum === 1
                          ? '1 Lado'
                          : `${sidesNum} Lados`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de cuántos lados llevan filo en Laterales y Contrafrente */}
              <div className="bg-[#1b1d1d] p-2.5 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#c8c6c5]">
                    Lados con filo en Laterales/Contrafrente:
                  </span>
                  <span className="font-bold text-[#ffb59b] tabular-nums">
                    {(
                      calcPieceEdgeMetersBySides(
                        currentDrawer.sidesDepthMm,
                        currentDrawer.sidesHeightMm,
                        (currentDrawer.sidesEdgeCount ?? 1) as
                          | 0
                          | 1
                          | 2
                          | 3
                          | 4,
                        currentDrawer.sidesQty || 2
                      ) +
                      calcPieceEdgeMetersBySides(
                        currentDrawer.backWidthMm,
                        currentDrawer.backHeightMm,
                        (currentDrawer.sidesEdgeCount ?? 1) as
                          | 0
                          | 1
                          | 2
                          | 3
                          | 4,
                        currentDrawer.backQty || 1
                      )
                    ).toFixed(2)}{' '}
                    m
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {EDGE_SIDES_BUTTONS.map((sidesNum) => {
                    const active =
                      (currentDrawer.sidesEdgeCount ?? 1) === sidesNum;
                    return (
                      <button
                        key={sidesNum}
                        type="button"
                        onClick={() =>
                          handleUpdateDrawerField(activeDrawerTab, {
                            sidesEdgeCount: sidesNum,
                          })
                        }
                        className={`py-1.5 rounded-lg text-[10px] font-extrabold border cursor-pointer transition-all ${
                          active
                            ? 'bg-[#e87a50] text-[#121414] border-[#ffb59b] shadow-xs'
                            : 'bg-[#222424] text-[#c8c6c5] border-white/10 hover:text-white'
                        }`}
                      >
                        {sidesNum === 0
                          ? '0 Lados'
                          : sidesNum === 1
                          ? '1 Lado'
                          : `${sidesNum} Lados`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Tipo / Color de Filo
                  </label>
                  <input
                    type="text"
                    value={
                      currentDrawer.edgeType || 'Filo PVC 22mm × 0.45mm'
                    }
                    onChange={(e) =>
                      handleUpdateDrawerField(
                        activeDrawerTab,
                        {
                          edgeType: e.target.value,
                        },
                        false
                      )
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#ffb59b] mb-0.5">
                    Total Filo (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={currentDrawer.edgeMeters}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      const pricePerM =
                        Number(currentDrawer.edgePricePerMeterArs) ||
                        Number(edgePricePerMeterArs) ||
                        650;
                      handleUpdateDrawerField(
                        activeDrawerTab,
                        {
                          edgeMeters: val,
                          edgeCostArs: Math.round(val * pricePerM),
                        },
                        false
                      );
                    }}
                    className="w-full bg-[#222424] border border-[#e87a50] rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* 4. INSUMOS / HERRAJES DEL INVENTARIO */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                <Wrench className="w-3.5 h-3.5 text-[#e87a50]" />
                <span>
                  4. Insumos &amp; Herrajes (Correderas, Tiradores, Tornillos)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Corredera (Inventario)
                  </label>
                  <select
                    value={currentDrawer.slideType}
                    onChange={(e) =>
                      handleUpdateDrawerField(
                        activeDrawerTab,
                        {
                          slideType: e.target.value,
                        },
                        false
                      )
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs text-white cursor-pointer"
                  >
                    <option value="Correderas Telescópicas 350mm H45">
                      Correderas Telescópicas 350mm H45
                    </option>
                    <option value="Correderas Telescópicas 400mm H45">
                      Correderas Telescópicas 400mm H45
                    </option>
                    <option value="Correderas Cierre Suave 350mm">
                      Correderas Cierre Suave 350mm
                    </option>
                    {hardwareInventoryOptions
                      .filter((h) => h.name.toLowerCase().includes('corredera'))
                      .map((h) => (
                        <option key={h.id} value={h.name}>
                          {h.name} (Stock: {h.stockQty})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Pares Corr.
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={currentDrawer.slideQty ?? 1}
                    onChange={(e) =>
                      handleUpdateDrawerField(
                        activeDrawerTab,
                        {
                          slideQty: Math.max(
                            1,
                            parseInt(e.target.value, 10) || 1
                          ),
                        },
                        false
                      )
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Tirador / Manija
                  </label>
                  <select
                    value={currentDrawer.handleType}
                    onChange={(e) =>
                      handleUpdateDrawerField(
                        activeDrawerTab,
                        {
                          handleType: e.target.value,
                        },
                        false
                      )
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs text-white cursor-pointer"
                  >
                    <option value="Tirador Perfil Oculto / Pomo Nórdico">
                      Tirador Perfil Oculto / Pomo Nórdico
                    </option>
                    <option value="Tirador Cubeta Embutido Negro">
                      Tirador Cubeta Embutido Negro
                    </option>
                    <option value="Sin Tirador (Sistema Push-Open)">
                      Sin Tirador (Sistema Push-Open)
                    </option>
                    {hardwareInventoryOptions
                      .filter((h) => h.name.toLowerCase().includes('tirador'))
                      .map((h) => (
                        <option key={h.id} value={h.name}>
                          {h.name} (Stock: {h.stockQty})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Tornillos (u.)
                  </label>
                  <input
                    type="number"
                    min={4}
                    value={currentDrawer.screwsCount}
                    onChange={(e) =>
                      handleUpdateDrawerField(
                        activeDrawerTab,
                        {
                          screwsCount: Math.max(
                            0,
                            parseInt(e.target.value, 10) || 16
                          ),
                        },
                        false
                      )
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
