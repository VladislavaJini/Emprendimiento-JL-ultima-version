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
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';
import {
  DrawerSpec,
  InventoryItem,
  CutPiece,
  PredefinedCut,
  DrawerHardwareAssignment,
} from '../types/atelier';
import {
  getInternalAvailableHeight,
  getMaxDrawersAllowed,
  generateDefaultDrawers,
  validateDrawersFit,
  calcDrawerEdgeMeters,
  calcPieceEdgeMetersBySides,
} from '../utils/drawerEngine';
import { formatARS, formatMm, parseMm } from '../data/initialData';

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

  // State for adding a hardware item from Inventory to the active drawer
  const [selectedInvHwId, setSelectedInvHwId] = useState<string>('');
  const [selectedInvHwQty, setSelectedInvHwQty] = useState<string>('1');

  const safeW = Number(cabinetWidthMm) || 400;
  const safeH = Number(cabinetHeightMm) || 550;
  const safeD = Number(cabinetDepthMm) || 335;

  const internalHeight = getInternalAvailableHeight(safeH);
  const maxDrawers = getMaxDrawersAllowed(safeH);

  // Extract wood pieces & hardware from inventory for quick selection
  const woodInventoryOptions = inventoryItems.filter(
    (it) => it && it.category === 'pieza_cortada'
  );
  const hardwareInventoryOptions = inventoryItems.filter(
    (it) => it && it.category === 'herraje'
  );
  // Fallback: if user added items in inventory under another category, still allow picking them
  const allSelectableHardware =
    hardwareInventoryOptions.length > 0
      ? hardwareInventoryOptions
      : inventoryItems;

  const handleSelectDrawerCount = (num: number) => {
    if (num > maxDrawers) {
      setErrorMessage(
        `Límite físico alcanzado: En una mesa de ${formatMm(safeW)} × ${formatMm(safeH)} mm (altura útil interna de ${formatMm(internalHeight)} mm) caben máximo ${maxDrawers} cajones.`
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

  const handleAddInventoryHardwareToDrawer = () => {
    if (!currentDrawer || !selectedInvHwId) return;
    const invItem = inventoryItems.find((i) => i.id === selectedInvHwId);
    if (!invItem) return;
    const qty = Math.max(1, parseInt(selectedInvHwQty, 10) || 1);
    const currentList: DrawerHardwareAssignment[] = Array.isArray(
      currentDrawer.customHardware
    )
      ? [...currentDrawer.customHardware]
      : [];

    const existingIdx = currentList.findIndex(
      (h) => h.inventoryItemId === invItem.id || h.name === invItem.name
    );

    if (existingIdx >= 0) {
      currentList[existingIdx] = {
        ...currentList[existingIdx],
        quantity: currentList[existingIdx].quantity + qty,
        unitPriceArs: invItem.unitPriceArs,
      };
    } else {
      currentList.push({
        id: `dhw-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        inventoryItemId: invItem.id,
        name: invItem.name,
        quantity: qty,
        unitPriceArs: invItem.unitPriceArs,
      });
    }

    handleUpdateDrawerField(
      activeDrawerTab,
      { customHardware: currentList },
      false
    );
    setSelectedInvHwId('');
    setSelectedInvHwQty('1');
  };

  const handleUpdateCustomHwQty = (hwId: string, delta: number) => {
    if (!currentDrawer) return;
    const currentList = Array.isArray(currentDrawer.customHardware)
      ? currentDrawer.customHardware
      : [];
    const nextList = currentList.map((h) =>
      h.id === hwId ? { ...h, quantity: Math.max(1, h.quantity + delta) } : h
    );
    handleUpdateDrawerField(
      activeDrawerTab,
      { customHardware: nextList },
      false
    );
  };

  const handleRemoveCustomHw = (hwId: string) => {
    if (!currentDrawer) return;
    const currentList = Array.isArray(currentDrawer.customHardware)
      ? currentDrawer.customHardware
      : [];
    handleUpdateDrawerField(
      activeDrawerTab,
      { customHardware: currentList.filter((h) => h.id !== hwId) },
      false
    );
  };

  return (
    <div className="p-3.5 rounded-2xl bg-[#181a1a] border border-white/10 space-y-3">
      {/* Header & Physical Constraint Summary (100% en milímetros) */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#e87a50]" />
            <span>Barra de Cajones (0 al 6)</span>
          </div>
          <div className="text-[10.5px] text-[#c8c6c5] mt-0.5">
            Cota mesa:{' '}
            <strong className="text-white">
              {formatMm(safeW)}×{formatMm(safeH)}×{formatMm(safeD)} mm
            </strong>{' '}
            • Vano útil:{' '}
            <strong className="text-[#ffb59b]">
              {formatMm(internalHeight)} mm
            </strong>{' '}
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
                  ? `Supera la altura física útil (${formatMm(internalHeight)} mm)`
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
                  Cajón #{idx + 1} ({formatMm(d.frontHeightMm)}mm •{' '}
                  {d.edgeMeters}m filo)
                </button>
              ))}
            </div>
          )}

          <div className="p-3 rounded-xl bg-[#141616] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#ffb59b]">
                Configuración en Milímetros • Cajón #
                {currentDrawer.index || activeDrawerTab + 1}
              </span>
              <span className="text-[10px] text-[#a1a1a1]">
                Todo en mm (ej. 301,5×83)
              </span>
            </div>

            {/* 1. MADERAS DEL CAJÓN (Frente, Laterales, Contrafrente) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                <Ruler className="w-3.5 h-3.5 text-[#e87a50]" />
                <span>
                  1. Cortes del Cajón en mm (Frente 395×160 y Cajones 301,5×83)
                </span>
              </div>

              {/* Quick Wood Cut Selector from Inventory / Cutter */}
              <div>
                <label className="block text-[10px] text-[#c8c6c5] mb-1">
                  Autocompletar corte desde Plantillas / Guillotina / Inventario:
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
                          /(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/
                        );
                        handleUpdateDrawerField(activeDrawerTab, {
                          frontPieceName: found.name,
                          ...(dims
                            ? {
                                frontWidthMm: parseMm(
                                  dims[1],
                                  currentDrawer.frontWidthMm
                                ),
                                frontHeightMm: parseMm(
                                  dims[2],
                                  currentDrawer.frontHeightMm
                                ),
                              }
                            : {}),
                        });
                      }
                    } else if (val.startsWith('cut-')) {
                      const found = cutPieces.find((c) => c.id === val);
                      if (found) {
                        if (found.name.toLowerCase().includes('caj')) {
                          handleUpdateDrawerField(activeDrawerTab, {
                            sidesPieceName: found.name,
                            sidesDepthMm: found.widthMm,
                            sidesHeightMm: found.heightMm,
                            backWidthMm: found.widthMm,
                            backHeightMm: found.heightMm,
                          });
                        } else {
                          handleUpdateDrawerField(activeDrawerTab, {
                            frontPieceName: found.name,
                            frontWidthMm: found.widthMm,
                            frontHeightMm: found.heightMm,
                          });
                        }
                      }
                    } else if (val.startsWith('pre-')) {
                      const found = predefinedCuts.find((p) => p.id === val);
                      if (found) {
                        if (found.name.toLowerCase().includes('caj')) {
                          handleUpdateDrawerField(activeDrawerTab, {
                            sidesPieceName: found.name,
                            sidesDepthMm: found.widthMm,
                            sidesHeightMm: found.heightMm,
                            backWidthMm: found.widthMm,
                            backHeightMm: found.heightMm,
                          });
                        } else {
                          handleUpdateDrawerField(activeDrawerTab, {
                            frontPieceName: found.name,
                            frontWidthMm: found.widthMm,
                            frontHeightMm: found.heightMm,
                          });
                        }
                      }
                    }
                  }}
                  className="w-full bg-[#222424] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white cursor-pointer"
                >
                  <option value="">
                    -- Seleccionar corte cargado o editar medidas abajo --
                  </option>
                  {predefinedCuts.length > 0 && (
                    <optgroup label="Cortes por Defecto / Plantillas">
                      {predefinedCuts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatMm(p.widthMm)}×{formatMm(p.heightMm)}{' '}
                          mm)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {cutPieces.length > 0 && (
                    <optgroup label="Cortes en Guillotina 2D">
                      {cutPieces.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({formatMm(c.widthMm)}×{formatMm(c.heightMm)}{' '}
                          mm)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {woodInventoryOptions.length > 0 && (
                    <optgroup label="Piezas de Madera en Inventario">
                      {woodInventoryOptions.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.subtitle} • Stock: {w.stockQty})
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
                    step="0.5"
                    value={currentDrawer.frontWidthMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        frontWidthMm: parseMm(e.target.value, 395),
                      })
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#ffb59b] mb-0.5">
                    Frente Profundidad (mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={currentDrawer.frontHeightMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        frontHeightMm: parseMm(e.target.value, 160),
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

              {/* Laterales y Contrafrente (ej. 301.5 x 83 mm) */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Cajón Largo (mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={currentDrawer.sidesDepthMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        sidesDepthMm: parseMm(e.target.value, 301.5),
                      })
                    }
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Cajón Profundidad (mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={currentDrawer.sidesHeightMm}
                    onChange={(e) => {
                      const val = parseMm(e.target.value, 83);
                      handleUpdateDrawerField(activeDrawerTab, {
                        sidesHeightMm: val,
                        backHeightMm: val,
                      });
                    }}
                    className="w-full bg-[#222424] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Contrafrente (mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={currentDrawer.backWidthMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        backWidthMm: parseMm(e.target.value, 301.5),
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
                <span>2. Fondo de Cajón (Fibroplus / MDF 3mm en mm)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Largo Fondo (mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={currentDrawer.bottomWidthMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        bottomWidthMm: parseMm(e.target.value, 300),
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
                    step="0.5"
                    value={currentDrawer.bottomDepthMm}
                    onChange={(e) =>
                      handleUpdateDrawerField(activeDrawerTab, {
                        bottomDepthMm: parseMm(e.target.value, 290),
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

            {/* 3. FILO / TAPACANTOS POR CORTE SEPARADO (0, 1, 2, 3 o 4 Lados) */}
            <div className="space-y-2.5 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                  <Disc className="w-3.5 h-3.5 text-[#e87a50]" />
                  <span>3. Lados con Filo por Corte (Por Separado)</span>
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

              {/* A. Lados con filo en Frente del Cajón */}
              <div className="bg-[#1b1d1d] p-2.5 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#c8c6c5]">
                    Lados con filo en Frente ({formatMm(currentDrawer.frontWidthMm)}×
                    {formatMm(currentDrawer.frontHeightMm)}mm):
                  </span>
                  <span className="font-bold text-[#ffb59b] tabular-nums">
                    {calcPieceEdgeMetersBySides(
                      currentDrawer.frontWidthMm,
                      currentDrawer.frontHeightMm,
                      (currentDrawer.edgeSidesCount ?? 4) as 0 | 1 | 2 | 3 | 4,
                      currentDrawer.frontQty || 1
                    ).toFixed(2)}{' '}
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

              {/* B. Lados con filo en Laterales de Cajón */}
              <div className="bg-[#1b1d1d] p-2.5 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#c8c6c5]">
                    Lados con filo en Cajones / Laterales (
                    {formatMm(currentDrawer.sidesDepthMm)}×
                    {formatMm(currentDrawer.sidesHeightMm)}mm):
                  </span>
                  <span className="font-bold text-[#ffb59b] tabular-nums">
                    {calcPieceEdgeMetersBySides(
                      currentDrawer.sidesDepthMm,
                      currentDrawer.sidesHeightMm,
                      (currentDrawer.sidesEdgeCount ?? 1) as 0 | 1 | 2 | 3 | 4,
                      currentDrawer.sidesQty || 2
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

              {/* C. Lados con filo en Contrafrente (Por separado) */}
              <div className="bg-[#1b1d1d] p-2.5 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#c8c6c5]">
                    Lados con filo en Contrafrente (
                    {formatMm(currentDrawer.backWidthMm)}×
                    {formatMm(currentDrawer.backHeightMm)}mm):
                  </span>
                  <span className="font-bold text-[#ffb59b] tabular-nums">
                    {calcPieceEdgeMetersBySides(
                      currentDrawer.backWidthMm,
                      currentDrawer.backHeightMm,
                      (currentDrawer.backEdgeCount ??
                        currentDrawer.sidesEdgeCount ??
                        1) as 0 | 1 | 2 | 3 | 4,
                      currentDrawer.backQty || 1
                    ).toFixed(2)}{' '}
                    m
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {EDGE_SIDES_BUTTONS.map((sidesNum) => {
                    const active =
                      (currentDrawer.backEdgeCount ??
                        currentDrawer.sidesEdgeCount ??
                        1) === sidesNum;
                    return (
                      <button
                        key={sidesNum}
                        type="button"
                        onClick={() =>
                          handleUpdateDrawerField(activeDrawerTab, {
                            backEdgeCount: sidesNum,
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

            {/* 4. ELEGIR QUÉ HERRAJES CARGARLE AL CAJÓN EN BASE A LOS DEL INVENTARIO */}
            <div className="space-y-2.5 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                  <Wrench className="w-3.5 h-3.5 text-[#e87a50]" />
                  <span>
                    4. Herrajes del Cajón (Elegir desde tu Inventario)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[#ffb59b]">
                  {allSelectableHardware.length} en Inventario
                </span>
              </div>

              {/* Selector para cargar cualquier herraje del inventario al cajón */}
              <div className="bg-[#1b1d1d] p-2.5 rounded-xl border border-white/10 space-y-2">
                <label className="block text-[10px] font-bold text-[#c8c6c5]">
                  Elegir herraje cargado en tu Inventario para sumar a este cajón:
                </label>

                {allSelectableHardware.length === 0 ? (
                  <div className="text-[10px] text-[#ffb59b] bg-black/25 p-2 rounded-lg border border-dashed border-white/10">
                    No tenés herrajes cargados en la pestaña Inventario todavía.
                    Agregá tus correderas, tiradores, bisagras o tornillos en
                    Inventario para seleccionarlos aquí.
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-1.5 items-center">
                    <select
                      value={selectedInvHwId}
                      onChange={(e) => setSelectedInvHwId(e.target.value)}
                      className="col-span-7 h-8 bg-[#222424] border border-white/15 rounded-lg px-2 text-[11px] text-white cursor-pointer"
                    >
                      <option value="">
                        -- Seleccionar herraje del Inventario --
                      </option>
                      {allSelectableHardware.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({formatARS(h.unitPriceArs)} • Stock:{' '}
                          {h.stockQty})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={selectedInvHwQty}
                      onChange={(e) => setSelectedInvHwQty(e.target.value)}
                      placeholder="Cant"
                      title="Cantidad de este herraje por cajón"
                      className="col-span-2 h-8 bg-[#222424] border border-white/15 rounded-lg px-1.5 text-xs font-bold text-center text-white tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={handleAddInventoryHardwareToDrawer}
                      disabled={!selectedInvHwId}
                      className="col-span-3 h-8 rounded-lg bg-[#e87a50] hover:bg-[#f0855c] disabled:opacity-40 text-[#121414] text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Cargar</span>
                    </button>
                  </div>
                )}

                {/* Lista de herrajes cargados al cajón desde el Inventario */}
                {Array.isArray(currentDrawer.customHardware) &&
                  currentDrawer.customHardware.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[#ffb59b]">
                        Herrajes asignados a este cajón:
                      </div>
                      {currentDrawer.customHardware.map((hw) => (
                        <div
                          key={hw.id}
                          className="bg-[#222424] rounded-lg px-2.5 py-1.5 border border-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-white truncate">
                              {hw.name}
                            </div>
                            <div className="text-[9.5px] text-[#c8c6c5] tabular-nums">
                              {formatARS(hw.unitPriceArs)} c/u ={' '}
                              <strong className="text-[#ffb59b]">
                                {formatARS(hw.unitPriceArs * hw.quantity)}
                              </strong>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateCustomHwQty(hw.id, -1)}
                              className="w-5 h-5 rounded bg-black/30 text-white flex items-center justify-center cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-white px-1 tabular-nums">
                              {hw.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCustomHwQty(hw.id, 1)}
                              className="w-5 h-5 rounded bg-black/30 text-white flex items-center justify-center cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomHw(hw.id)}
                              className="p-1 rounded bg-red-950/60 text-red-200 border border-red-400/30 ml-1 cursor-pointer"
                              title="Quitar herraje del cajón"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              {/* Selectores directos basados en Inventario para Corredera y Tirador */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Corredera (Desde tu Inventario)
                  </label>
                  <select
                    value={currentDrawer.slideType || ''}
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
                    <option value="">
                      -- Elegir corredera del Inventario --
                    </option>
                    {allSelectableHardware.map((h) => (
                      <option key={h.id} value={h.name}>
                        {h.name} ({formatARS(h.unitPriceArs)} • Stock:{' '}
                        {h.stockQty})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#c8c6c5] mb-0.5">
                    Cant. Corr.
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={currentDrawer.slideQty ?? 1}
                    onChange={(e) =>
                      handleUpdateDrawerField(
                        activeDrawerTab,
                        {
                          slideQty: Math.max(
                            0,
                            parseInt(e.target.value, 10) || 0
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
                    Tirador / Manija (Desde tu Inventario)
                  </label>
                  <select
                    value={currentDrawer.handleType || ''}
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
                    <option value="">
                      -- Elegir tirador/herraje del Inventario --
                    </option>
                    {allSelectableHardware.map((h) => (
                      <option key={h.id} value={h.name}>
                        {h.name} ({formatARS(h.unitPriceArs)} • Stock:{' '}
                        {h.stockQty})
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
                    min={0}
                    value={currentDrawer.screwsCount}
                    onChange={(e) =>
                      handleUpdateDrawerField(
                        activeDrawerTab,
                        {
                          screwsCount: Math.max(
                            0,
                            parseInt(e.target.value, 10) || 0
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
