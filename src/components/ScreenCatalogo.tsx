import React, { useState } from 'react';
import {
  PlusCircle,
  Package,
  Search,
  Pencil,
  X,
  Wrench,
  Truck,
  Camera,
  ImagePlus,
  Trash2,
  Disc,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  FurnitureDesign,
  InventoryItem,
  DrawerSpec,
  CutPiece,
  PredefinedCut,
  DesignCutPiece,
} from '../types/atelier';
import {
  generateDefaultDrawers,
  normalizeDrawersConfig,
  validateDrawersFit,
  getDrawerBomItems,
  calcStructureCutsEdgeMeters,
  calcPieceEdgeMetersBySides,
} from '../utils/drawerEngine';
import { DrawerConfiguratorBar } from './DrawerConfiguratorBar';
import {
  formatARS,
  formatMm,
  parseMm,
  DEFAULT_CATALOG_STRUCTURE_CUTS,
} from '../data/initialData';

interface ScreenCatalogoProps {
  designs: FurnitureDesign[];
  activeDesignIndex?: number;
  onSelectDesignIndex?: (index: number) => void;
  onUpdateBomQty?: (designId: string, bomId: string, delta: number) => void;
  onDeleteBomItem?: (designId: string, bomId: string) => void;
  onAddBomItem?: (designId: string, item: any) => void;
  onSaveDesignCost?: (designId: string, newCostArs: number) => void;
  onAddDesign: (design: Omit<FurnitureDesign, 'id'>) => void;
  onDeleteDesign?: (designId: string) => void;
  onUpdateDesign?: (designId: string, updated: Partial<FurnitureDesign>) => void;
  onLoadMissingPiecesToCutter?: (
    pieces: Omit<CutPiece, 'id' | 'numberLabel'>[]
  ) => void;
  onSendDesignToFreight?: (design: FurnitureDesign) => void;
  onSendToFreight?: (design: FurnitureDesign) => void;
  inventoryItems: InventoryItem[];
  cutPieces?: CutPiece[];
  predefinedCuts?: PredefinedCut[];
  onGoToInventario: () => void;
  onShowToast: (msg: string) => void;
}

const EDGE_SIDES_OPTIONS: (0 | 1 | 2 | 3 | 4)[] = [0, 1, 2, 3, 4];

function cloneDefaultStructureCuts(): DesignCutPiece[] {
  return DEFAULT_CATALOG_STRUCTURE_CUTS.map((c) => ({ ...c }));
}

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 480;
        const maxH = 360;
        let width = img.width;
        let height = img.height;
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(ev.target?.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = String(ev.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}

export const ScreenCatalogo: React.FC<ScreenCatalogoProps> = ({
  designs = [],
  onAddDesign,
  onDeleteDesign,
  onUpdateDesign,
  onLoadMissingPiecesToCutter,
  onSendDesignToFreight,
  onSendToFreight,
  inventoryItems = [],
  cutPieces = [],
  predefinedCuts = [],
  onGoToInventario,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Edit design modal state (100% en milímetros)
  const [editingDesign, setEditingDesign] = useState<FurnitureDesign | null>(
    null
  );
  const [editTitle, setEditTitle] = useState('');
  const [editWidthMm, setEditWidthMm] = useState('400');
  const [editHeightMm, setEditHeightMm] = useState('550');
  const [editDepthMm, setEditDepthMm] = useState('335');
  const [editPriceArs, setEditPriceArs] = useState('85000');
  const [editStructureCuts, setEditStructureCuts] = useState<DesignCutPiece[]>(
    () => cloneDefaultStructureCuts()
  );
  const [editEdgePricePerM, setEditEdgePricePerM] = useState('650');
  const [editDrawerCount, setEditDrawerCount] = useState<number>(1);
  const [editDrawersConfig, setEditDrawersConfig] = useState<DrawerSpec[]>([]);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState<string>('');
  const [geometricError, setGeometricError] = useState<string | null>(null);

  // New design modal state (100% en milímetros)
  const [showNewDesignModal, setShowNewDesignModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWidthMm, setNewWidthMm] = useState('400');
  const [newHeightMm, setNewHeightMm] = useState('550');
  const [newDepthMm, setNewDepthMm] = useState('335');
  const [newPriceArs, setNewPriceArs] = useState('85000');
  const [newStructureCuts, setNewStructureCuts] = useState<DesignCutPiece[]>(
    () => cloneDefaultStructureCuts()
  );
  const [newEdgePricePerM, setNewEdgePricePerM] = useState('650');
  const [newDrawerCount, setNewDrawerCount] = useState<number>(1);
  const [newDrawersConfig, setNewDrawersConfig] = useState<DrawerSpec[]>(() =>
    generateDefaultDrawers(1, 400, 550, 335)
  );
  const [newThumbnailUrl, setNewThumbnailUrl] = useState<string>('');
  const [newGeometricError, setNewGeometricError] = useState<string | null>(
    null
  );

  // Defensive filtering so legacy designs never crash
  const safeDesigns = Array.isArray(designs) ? designs.filter(Boolean) : [];
  const filteredDesigns = safeDesigns.filter((d) => {
    const q = (searchQuery || '').toLowerCase();
    const catTitle = (d?.catalogTitle || d?.name || '').toLowerCase();
    const nameStr = (d?.name || '').toLowerCase();
    const codeStr = (d?.code || '').toLowerCase();
    return catTitle.includes(q) || nameStr.includes(q) || codeStr.includes(q);
  });

  // Helper to update a single cut in a DesignCutPiece[] list
  const updateCutInList = (
    list: DesignCutPiece[],
    id: string,
    updates: Partial<DesignCutPiece>
  ): DesignCutPiece[] =>
    list.map((c) => (c.id === id ? { ...c, ...updates } : c));

  // Defensive readiness helper
  const getReadinessForDesign = (
    design: FurnitureDesign | null,
    drawerCountOverride?: number,
    customCutsOverride?: DesignCutPiece[]
  ) => {
    const titleLabel =
      design?.catalogTitle || design?.name || 'Mesa de Luz J&L';

    const drwCount =
      drawerCountOverride !== undefined
        ? drawerCountOverride
        : design?.drawerCount !== undefined
        ? Number(design.drawerCount)
        : 1;

    const structureList =
      customCutsOverride && customCutsOverride.length > 0
        ? customCutsOverride
        : Array.isArray(design?.structureCuts) &&
          design!.structureCuts!.length > 0
        ? design!.structureCuts!
        : DEFAULT_CATALOG_STRUCTURE_CUTS;

    const mapSidesType = (
      s: number
    ): { type: '0L' | '1L' | '2L' | '3L' | '4L'; label: string } => {
      if (s === 0) return { type: '0L', label: '0 Lados (Sin filo)' };
      if (s === 1) return { type: '1L', label: '1 Lado con filo' };
      if (s === 2) return { type: '2L', label: '2 Lados con filo' };
      if (s === 3) return { type: '3L', label: '3 Lados con filo' };
      return { type: '4L', label: '4 Lados con filo' };
    };

    const missingWoodPieces: Omit<CutPiece, 'id' | 'numberLabel'>[] = [];
    let missingWoodCount = 0;

    structureList.forEach((sc) => {
      const match = inventoryItems.find(
        (it) =>
          it &&
          it.category === 'pieza_cortada' &&
          (it.name || '').toLowerCase().includes(sc.name.toLowerCase())
      );
      const stock = match ? Number(match.stockQty) || 0 : 0;
      const needed = Math.max(1, Number(sc.quantity) || 1);
      if (stock < needed) {
        const diff = needed - stock;
        missingWoodCount += diff;
        const edgeInfo = mapSidesType(sc.edgeSidesCount ?? 2);
        missingWoodPieces.push({
          name: `${sc.name} (${titleLabel})`,
          subtitle: `${formatMm(sc.lengthMm)} × ${formatMm(sc.depthMm)} mm • Melamina 18mm`,
          widthMm: sc.lengthMm,
          heightMm: sc.depthMm,
          quantity: diff,
          unitPriceArs: 4800,
          edgesLabel: edgeInfo.label,
          edgesType: edgeInfo.type,
          allowRotation: true,
          mandatoryGrain: false,
        });
      }
    });

    const hardwareChecks = [
      ...(drwCount > 0
        ? [
            { name: 'Corredera', needed: drwCount },
            { name: 'Tirador', needed: drwCount },
          ]
        : []),
      { name: 'Pata', needed: 4 },
      { name: 'Tornillo', needed: 16 },
    ];

    let missingHardware = false;
    hardwareChecks.forEach((hc) => {
      const match = inventoryItems.find(
        (it) =>
          it &&
          it.category === 'herraje' &&
          (it.name || '').toLowerCase().includes(hc.name.toLowerCase())
      );
      if (!match || (Number(match.stockQty) || 0) < hc.needed) {
        missingHardware = true;
      }
    });

    if (missingWoodCount === 0 && !missingHardware) {
      return {
        status: 'ready' as const,
        badge: '🟢 Stock Completo para Armar (Sin usar sierra)',
        color: 'text-green-400 bg-green-500/10 border-green-500/30',
        missingWoodCount: 0,
        missingWoodPieces: [],
      };
    } else if (missingWoodCount > 0) {
      return {
        status: 'needs_saw' as const,
        badge: `🟡 Requiere Sierra (Faltan ${missingWoodCount} piezas)`,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        missingWoodCount,
        missingWoodPieces,
      };
    } else {
      return {
        status: 'needs_hardware' as const,
        badge: '🔴 Faltan Herrajes/Insumos',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        missingWoodCount: 0,
        missingWoodPieces: [],
      };
    }
  };

  // Safe defensive opener for Edit Modal (100% en milímetros)
  const handleOpenEdit = (design: FurnitureDesign) => {
    if (!design) return;
    const safeW = Number(design?.widthMm) || 400;
    const safeH = Number(design?.heightMm) || 550;
    const safeD = Number(design?.depthMm) || 335;
    const drwCount =
      design?.drawerCount !== undefined
        ? Math.max(0, Math.min(6, Number(design.drawerCount) || 0))
        : 1;

    setEditingDesign(design);
    setEditTitle(design?.catalogTitle || design?.name || 'Mesa Blanca Común');
    setEditWidthMm(String(safeW));
    setEditHeightMm(String(safeH));
    setEditDepthMm(String(safeD));
    setEditPriceArs(String(Number(design?.suggestedPvpArs) || 85000));
    setEditStructureCuts(
      Array.isArray(design?.structureCuts) && design.structureCuts.length > 0
        ? design.structureCuts.map((c) => ({ ...c }))
        : cloneDefaultStructureCuts()
    );
    setEditEdgePricePerM(
      String(Number(design?.edgePricePerMeterArs) || 650)
    );
    setEditDrawerCount(drwCount);
    setEditDrawersConfig(
      normalizeDrawersConfig(
        design?.drawersConfig,
        drwCount,
        safeW,
        safeH,
        safeD
      )
    );
    setEditThumbnailUrl(design?.thumbnailUrl || '');
    setGeometricError(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesign) return;
    const wMm = Math.max(50, parseMm(editWidthMm, 400));
    const hMm = Math.max(50, parseMm(editHeightMm, 550));
    const dMm = Math.max(50, parseMm(editDepthMm, 335));
    const pvpArs = Math.max(1000, parseInt(editPriceArs, 10) || 85000);
    const edgePriceM = Math.max(0, parseInt(editEdgePricePerM, 10) || 650);

    const fitCheck = validateDrawersFit(editDrawersConfig, hMm);
    if (!fitCheck.valid) {
      setGeometricError(
        fitCheck.errorMsg ||
          'La suma de alturas de cajón excede la altura útil de la mesa.'
      );
      return;
    }

    const structEdgeM = calcStructureCutsEdgeMeters(editStructureCuts);
    const drwEdgeM = editDrawersConfig.reduce(
      (acc, d) => acc + (Number(d.edgeMeters) || 0),
      0
    );
    const totalEdgeM = Number((structEdgeM + drwEdgeM).toFixed(2));
    const totalEdgeCost = Math.round(totalEdgeM * edgePriceM);

    if (onUpdateDesign) {
      onUpdateDesign(editingDesign.id, {
        catalogTitle:
          editTitle.trim() ||
          editingDesign.catalogTitle ||
          editingDesign.name ||
          'Mesa de Luz',
        name:
          editTitle.trim() ||
          editingDesign.name ||
          editingDesign.catalogTitle ||
          'Mesa de Luz',
        widthMm: wMm,
        heightMm: hMm,
        depthMm: dMm,
        suggestedPvpArs: pvpArs,
        drawerCount: editDrawerCount,
        drawersConfig: editDrawersConfig,
        structureCuts: editStructureCuts,
        edgePricePerMeterArs: edgePriceM,
        totalEdgeMeters: totalEdgeM,
        totalEdgeCostArs: totalEdgeCost,
        bomItems: getDrawerBomItems(
          editDrawersConfig,
          structEdgeM,
          edgePriceM
        ),
        cutPiecesCount:
          editStructureCuts.reduce((a, c) => a + (Number(c.quantity) || 1), 0) +
          editDrawerCount * 4,
        thumbnailUrl: editThumbnailUrl || undefined,
      });
    }
    setEditingDesign(null);
    onShowToast(
      `Diseño guardado en mm (${formatMm(wMm)}×${formatMm(hMm)}×${formatMm(dMm)}mm • Filo: ${totalEdgeM}m = ${formatARS(
        totalEdgeCost
      )})`
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (onDeleteDesign) {
      onDeleteDesign(id);
    }
    onShowToast(`Diseño eliminado: ${name || 'Mueble'}`);
  };

  const handleCreateNewDesign = (e: React.FormEvent) => {
    e.preventDefault();
    const wMm = Math.max(50, parseMm(newWidthMm, 400));
    const hMm = Math.max(50, parseMm(newHeightMm, 550));
    const dMm = Math.max(50, parseMm(newDepthMm, 335));
    const pvpArs = Math.max(1000, parseInt(newPriceArs, 10) || 85000);
    const edgePriceM = Math.max(0, parseInt(newEdgePricePerM, 10) || 650);
    const codeNum = 4560 + safeDesigns.length;

    const fitCheck = validateDrawersFit(newDrawersConfig, hMm);
    if (!fitCheck.valid) {
      setNewGeometricError(
        fitCheck.errorMsg ||
          'La suma de alturas de cajón excede la altura útil de la mesa.'
      );
      return;
    }

    const structEdgeM = calcStructureCutsEdgeMeters(newStructureCuts);
    const drwEdgeM = newDrawersConfig.reduce(
      (acc, d) => acc + (Number(d.edgeMeters) || 0),
      0
    );
    const totalEdgeM = Number((structEdgeM + drwEdgeM).toFixed(2));
    const totalEdgeCost = Math.round(totalEdgeM * edgePriceM);

    onAddDesign({
      code: `MN-${codeNum}`,
      name: newTitle.trim() || 'Mesita Nórdica Nueva',
      shortTitle: (newTitle.trim() || 'MESITA NÓRDICA').toUpperCase(),
      catalogTitle: newTitle.trim() || 'Mesita Nórdica Nueva',
      description: 'Mesa de luz con cortes y filos a medida en milímetros.',
      widthMm: wMm,
      heightMm: hMm,
      depthMm: dMm,
      materialSummary: 'Melamina 18mm',
      cutPiecesCount:
        newStructureCuts.reduce((a, c) => a + (Number(c.quantity) || 1), 0) +
        newDrawerCount * 4,
      suggestedPvpArs: pvpArs,
      baseCostArs: Math.round(pvpArs * 0.45),
      activeInWorkshop: true,
      bodyTexture: 'Blanco Puro',
      frontTexture: 'Carvalho',
      drawerCount: newDrawerCount,
      drawersConfig: newDrawersConfig,
      structureCuts: newStructureCuts,
      edgePricePerMeterArs: edgePriceM,
      totalEdgeMeters: totalEdgeM,
      totalEdgeCostArs: totalEdgeCost,
      bomItems: getDrawerBomItems(newDrawersConfig, structEdgeM, edgePriceM),
      thumbnailUrl: newThumbnailUrl || undefined,
    });

    setNewTitle('');
    setNewThumbnailUrl('');
    setShowNewDesignModal(false);
    onShowToast(
      `Nuevo diseño creado en mm (${formatMm(wMm)}×${formatMm(hMm)}×${formatMm(dMm)}mm • Filo: ${totalEdgeM}m = ${formatARS(
        totalEdgeCost
      )})`
    );
  };

  // Shared Renderer for the Per-Cut Editable Structure & Filo List inside Modals
  const renderStructureCutsFiloEditor = (
    cuts: DesignCutPiece[],
    setCuts: React.Dispatch<React.SetStateAction<DesignCutPiece[]>>,
    edgePricePerM: string,
    setEdgePricePerM: (v: string) => void,
    structEdgeM: number,
    drwEdgeM: number,
    drwCount: number,
    totalEdgeM: number,
    totalEdgeCost: number
  ) => {
    const safePriceM = Math.max(0, parseInt(edgePricePerM, 10) || 650);

    return (
      <div className="p-3.5 rounded-2xl bg-[#181a1a] border border-[#e87a50]/35 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Disc className="w-4 h-4 text-[#e87a50] shrink-0" />
            <span>
              Cortes Cargados y Lados con Filo (Por Separado en mm)
            </span>
          </div>
          <span className="text-xs font-extrabold text-[#ffb59b] tabular-nums shrink-0">
            {totalEdgeM.toFixed(2)} m = {formatARS(totalEdgeCost)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] text-[#c8c6c5]">
            Editá las medidas (mm) y elegí cuántos lados llevan filo en cada
            pieza por separado:
          </span>
          <button
            type="button"
            onClick={() => setCuts(cloneDefaultStructureCuts())}
            title="Restaurar los 7 cortes por defecto"
            className="px-2 py-1 rounded-lg bg-[#222424] hover:bg-[#2c2e2e] border border-white/10 text-[10px] font-bold text-[#ffb59b] flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Por defecto</span>
          </button>
        </div>

        {/* Lista de cada corte con edición en mm + selector individual de 0 a 4 lados de filo */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
          {cuts.map((cut) => {
            const pieceMeters = calcPieceEdgeMetersBySides(
              cut.lengthMm,
              cut.depthMm,
              cut.edgeSidesCount,
              cut.quantity
            );
            const pieceFiloCost = Math.round(pieceMeters * safePriceM);

            return (
              <div
                key={cut.id}
                className="bg-[#141616] p-2.5 rounded-xl border border-white/10 space-y-2"
              >
                {/* Fila 1: Nombre, Largo (mm), Profundidad (mm), Cant, Eliminar */}
                <div className="grid grid-cols-12 gap-1.5 items-end">
                  <div className="col-span-4">
                    <label className="block text-[9px] font-bold text-[#c8c6c5] mb-0.5">
                      Pieza / Corte
                    </label>
                    <input
                      type="text"
                      value={cut.name}
                      onChange={(e) =>
                        setCuts((prev) =>
                          updateCutInList(prev, cut.id, {
                            name: e.target.value,
                          })
                        )
                      }
                      className="w-full h-7 bg-[#222424] border border-white/15 rounded-lg px-2 text-[11px] font-bold text-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[9px] font-bold text-[#c8c6c5] mb-0.5">
                      Largo (mm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={cut.lengthMm}
                      onChange={(e) =>
                        setCuts((prev) =>
                          updateCutInList(prev, cut.id, {
                            lengthMm: parseMm(e.target.value, cut.lengthMm),
                          })
                        )
                      }
                      className="w-full h-7 bg-[#222424] border border-white/15 rounded-lg px-1.5 text-[11px] font-bold text-center text-white tabular-nums"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[9px] font-bold text-[#ffb59b] mb-0.5">
                      Prof. (mm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={cut.depthMm}
                      onChange={(e) =>
                        setCuts((prev) =>
                          updateCutInList(prev, cut.id, {
                            depthMm: parseMm(e.target.value, cut.depthMm),
                          })
                        )
                      }
                      className="w-full h-7 bg-[#222424] border border-[#e87a50]/60 rounded-lg px-1.5 text-[11px] font-bold text-center text-white tabular-nums"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[9px] font-bold text-[#c8c6c5] mb-0.5">
                      Cant
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={cut.quantity}
                      onChange={(e) =>
                        setCuts((prev) =>
                          updateCutInList(prev, cut.id, {
                            quantity: Math.max(
                              1,
                              parseInt(e.target.value, 10) || 1
                            ),
                          })
                        )
                      }
                      className="w-full h-7 bg-[#222424] border border-white/15 rounded-lg px-1 text-[11px] font-bold text-center text-white tabular-nums"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setCuts((prev) => prev.filter((c) => c.id !== cut.id))
                      }
                      title="Quitar este corte"
                      className="h-7 w-7 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-400/30 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Fila 2: Botones para elegir cuántos lados lleva el filo en ESTA pieza */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#c8c6c5] font-semibold">
                      Filo en <strong className="text-white">{cut.name}</strong>{' '}
                      ({formatMm(cut.lengthMm)}×{formatMm(cut.depthMm)}mm ×
                      {cut.quantity}):
                    </span>
                    <span className="text-[#ffb59b] font-bold tabular-nums">
                      {pieceMeters.toFixed(2)} m ({formatARS(pieceFiloCost)})
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {EDGE_SIDES_OPTIONS.map((sides) => {
                      const active = cut.edgeSidesCount === sides;
                      return (
                        <button
                          key={sides}
                          type="button"
                          onClick={() =>
                            setCuts((prev) =>
                              updateCutInList(prev, cut.id, {
                                edgeSidesCount: sides,
                              })
                            )
                          }
                          className={`py-1 rounded-lg text-[10px] font-extrabold border cursor-pointer transition-all ${
                            active
                              ? 'bg-[#e87a50] text-[#121414] border-[#ffb59b] shadow-xs'
                              : 'bg-[#222424] text-[#c8c6c5] border-white/10 hover:text-white'
                          }`}
                        >
                          {sides === 0
                            ? '0 Lados'
                            : sides === 1
                            ? '1 Lado'
                            : `${sides} Lados`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Botón para agregar un nuevo corte personalizado a la lista */}
        <button
          type="button"
          onClick={() =>
            setCuts((prev) => [
              ...prev,
              {
                id: `dc-${Date.now()}`,
                name: `Corte #${prev.length + 1}`,
                lengthMm: 400,
                depthMm: 335,
                quantity: 1,
                edgeSidesCount: 2,
              },
            ])
          }
          className="w-full py-1.5 rounded-xl border border-dashed border-[#e87a50]/60 bg-black/20 hover:bg-black/35 text-[11px] font-bold text-[#ffb59b] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Agregar otro corte al mueble</span>
        </button>

        {/* Resumen de Valor Filo ($/Metro) y Totales */}
        <div className="grid grid-cols-2 gap-2 items-center pt-1 border-t border-white/10">
          <div>
            <label className="block text-[10px] font-semibold text-[#c8c6c5] mb-0.5">
              Valor Filo ($ / Metro)
            </label>
            <input
              type="number"
              min="0"
              value={edgePricePerM}
              onChange={(e) => setEdgePricePerM(e.target.value)}
              className="w-full bg-[#222424] border border-white/15 rounded-lg px-2.5 py-1 text-xs font-bold text-white tabular-nums"
            />
          </div>
          <div className="bg-[#222424] rounded-xl p-2 border border-white/10 text-[10px] space-y-0.5 tabular-nums">
            <div className="flex justify-between text-[#c8c6c5]">
              <span>Cortes ({cuts.length}):</span>
              <span className="text-white font-bold">
                {structEdgeM.toFixed(2)} m
              </span>
            </div>
            <div className="flex justify-between text-[#c8c6c5]">
              <span>Barra Cajones ({drwCount}):</span>
              <span className="text-white font-bold">
                {drwEdgeM.toFixed(2)} m
              </span>
            </div>
            <div className="flex justify-between text-[#ffb59b] font-extrabold border-t border-white/10 pt-0.5">
              <span>Total Filo:</span>
              <span>{formatARS(totalEdgeCost)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setNewTitle('');
            setNewWidthMm('400');
            setNewHeightMm('550');
            setNewDepthMm('335');
            setNewPriceArs('85000');
            setNewStructureCuts(cloneDefaultStructureCuts());
            setNewEdgePricePerM('650');
            setNewDrawerCount(1);
            setNewDrawersConfig(generateDefaultDrawers(1, 400, 550, 335));
            setNewThumbnailUrl('');
            setNewGeometricError(null);
            setShowNewDesignModal(true);
          }}
          className="h-12 rounded-2xl bg-[#e87a50] hover:bg-[#f0855c] text-[#280b00] font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>+ Nuevo Diseño</span>
        </button>

        <button
          type="button"
          onClick={onGoToInventario}
          className="h-12 rounded-2xl bg-[#1e2020] hover:bg-[#292a2a] border border-white/10 text-[#e3e2e2] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Package className="w-4 h-4 text-[#ffb59b] shrink-0" />
          <span>Ver Inventario ({inventoryItems.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-[#181a1a] border border-white/10 rounded-2xl px-3.5 py-3 flex items-center gap-2.5 shadow-inner">
        <Search className="w-4 h-4 text-[#a1a1a1] shrink-0" />
        <input
          type="text"
          placeholder="Buscar mueble por nombre, serie o medida en mm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder-[#8e8e8e] focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-[#a1a1a1] hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-2 pt-0.5">
        <h2 className="text-base font-bold font-display text-white">
          Diseños (Medidas en mm)
        </h2>
        <span className="bg-[#222424] border border-white/5 text-[#a1a1a1] text-[11px] font-medium px-2.5 py-0.5 rounded-md tabular-nums">
          {filteredDesigns.length} muebles
        </span>
      </div>

      {/* 2-Column Catalog Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredDesigns.map((design, idx) => {
          const safeW = Number(design?.widthMm) || 400;
          const safeH = Number(design?.heightMm) || 550;
          const safeD = Number(design?.depthMm) || 335;
          const drwCount =
            design?.drawerCount !== undefined ? Number(design.drawerCount) : 1;

          const edgePriceM = Number(design?.edgePricePerMeterArs) || 650;
          const structCuts =
            Array.isArray(design?.structureCuts) &&
            design.structureCuts.length > 0
              ? design.structureCuts
              : DEFAULT_CATALOG_STRUCTURE_CUTS;
          const structEdgeM = calcStructureCutsEdgeMeters(structCuts);
          const drwEdgeM = Array.isArray(design?.drawersConfig)
            ? design.drawersConfig.reduce(
                (acc, d) => acc + (Number(d?.edgeMeters) || 0),
                0
              )
            : 0;
          const totalEdgeM =
            design?.totalEdgeMeters !== undefined
              ? Number(design.totalEdgeMeters)
              : Number((structEdgeM + drwEdgeM).toFixed(2));
          const totalEdgeCost =
            design?.totalEdgeCostArs !== undefined
              ? Number(design.totalEdgeCostArs)
              : Math.round(totalEdgeM * edgePriceM);

          return (
            <div
              key={design?.id || idx}
              className="atelier-card rounded-2xl p-3 flex flex-col justify-between bg-[#161818] border border-white/10 hover:border-white/20 transition-all shadow-md group"
            >
              {/* Product Visual Studio Render OR Custom Uploaded Image Thumbnail */}
              <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#121414] border border-white/5 flex items-center justify-center p-2 relative">
                {design?.thumbnailUrl ? (
                  <img
                    src={design.thumbnailUrl}
                    alt={design?.catalogTitle || design?.name || 'Mueble'}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <svg
                    viewBox="0 0 160 140"
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                  >
                    <defs>
                      <linearGradient
                        id={`bodyWood-${idx}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#d9a877" />
                        <stop offset="100%" stopColor="#bf8e5c" />
                      </linearGradient>
                      <linearGradient
                        id={`drawerFront-${idx}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#e2b485" />
                        <stop offset="100%" stopColor="#c79664" />
                      </linearGradient>
                      <linearGradient
                        id={`legWood-${idx}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#ad7a4b" />
                        <stop offset="100%" stopColor="#87582d" />
                      </linearGradient>
                    </defs>

                    <ellipse
                      cx="80"
                      cy="126"
                      rx="55"
                      ry="7"
                      fill="rgba(0,0,0,0.4)"
                    />

                    <polygon points="46,75 52,75 42,122 36,122" fill="#6b4421" />
                    <polygon
                      points="108,75 114,75 124,122 118,122"
                      fill="#6b4421"
                    />
                    <polygon
                      points="38,76 46,76 34,124 26,124"
                      fill={`url(#legWood-${idx})`}
                      stroke="#593717"
                      strokeWidth="0.8"
                    />
                    <polygon
                      points="114,76 122,76 134,124 126,124"
                      fill={`url(#legWood-${idx})`}
                      stroke="#593717"
                      strokeWidth="0.8"
                    />

                    <rect
                      x="20"
                      y="18"
                      width="120"
                      height="8"
                      rx="1.5"
                      fill="#e5b88a"
                      stroke="#593717"
                      strokeWidth="1"
                    />

                    <rect
                      x="24"
                      y="25"
                      width="112"
                      height="54"
                      rx="2"
                      fill={`url(#bodyWood-${idx})`}
                      stroke="#593717"
                      strokeWidth="1.2"
                    />

                    <rect
                      x="30"
                      y="31"
                      width="100"
                      height="42"
                      rx="1.5"
                      fill="#181512"
                    />

                    <rect
                      x="32"
                      y="33"
                      width="96"
                      height="38"
                      rx="1.2"
                      fill={`url(#drawerFront-${idx})`}
                      stroke="#663f1a"
                      strokeWidth="0.8"
                    />

                    <circle cx="80" cy="52" r="3.2" fill="#2b1a0e" />
                    <circle cx="79.3" cy="51.3" r="1.2" fill="#4d321d" />
                  </svg>
                )}

                {/* Direct Thumbnail Image Upload Button */}
                <label
                  title="Subir imagen personalizada como miniatura"
                  className="absolute top-1.5 left-1.5 bg-black/75 hover:bg-[#8C3F23] border border-white/20 text-[#ffb59b] hover:text-white text-[9px] font-bold px-1.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <Camera className="w-3 h-3" />
                  <span>Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await compressImageToDataUrl(file);
                        if (onUpdateDesign) {
                          onUpdateDesign(design.id, { thumbnailUrl: dataUrl });
                          onShowToast(
                            `📷 Miniatura actualizada para ${
                              design.catalogTitle || design.name
                            }`
                          );
                        }
                      } catch {
                        onShowToast('No se pudo procesar la imagen seleccionada');
                      }
                      e.target.value = '';
                    }}
                  />
                </label>

                <span className="absolute top-1.5 right-1.5 bg-black/70 border border-white/10 text-[#ffb59b] text-[9px] font-bold px-1.5 py-0.5 rounded tabular-nums">
                  {drwCount} caj.
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xs font-bold text-white leading-snug truncate mt-2">
                {design?.catalogTitle || design?.name || 'Mesa de Luz'}
              </h3>

              {/* Dimension Pills in Millimeters: [L:400mm] [A:550mm] [P:335mm ✏️] */}
              <div className="flex items-center justify-between gap-1 mt-1.5">
                <span
                  title="Largo en milímetros"
                  className="bg-[#242626] border border-white/10 text-white text-[9.5px] font-bold px-1.5 py-1 rounded-md tabular-nums"
                >
                  L:{formatMm(safeW)}mm
                </span>
                <span
                  title="Alto en milímetros"
                  className="bg-[#242626] border border-white/10 text-white text-[9.5px] font-bold px-1.5 py-1 rounded-md tabular-nums"
                >
                  A:{formatMm(safeH)}mm
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(design)}
                  title="Editar Largo, Alto, Profundidad (mm) y Filos"
                  className="bg-[#242626] hover:bg-[#2c2e2e] border border-white/10 text-white text-[9.5px] font-bold px-1.5 py-1 rounded-md flex items-center gap-0.5 cursor-pointer tabular-nums"
                >
                  <span>P:{formatMm(safeD)}mm</span>
                  <Pencil className="w-2.5 h-2.5 text-[#a1a1a1]" />
                </button>
              </div>

              {/* Filo summary badge on card */}
              <div className="mt-1.5 px-2 py-1 rounded-lg bg-[#1e2020] border border-white/5 flex items-center justify-between text-[10px]">
                <span className="text-[#c8c6c5] flex items-center gap-1 truncate">
                  <Disc className="w-3 h-3 text-[#e87a50] shrink-0" />
                  <span>Filo: {totalEdgeM.toFixed(2)}m</span>
                </span>
                <span className="font-bold text-[#ffb59b] tabular-nums shrink-0">
                  {formatARS(totalEdgeCost)}
                </span>
              </div>

              {/* Action Buttons: [Editar] [Eliminar] */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(design)}
                  className="h-8 rounded-lg bg-[#e87a50] hover:bg-[#f0855c] active:scale-95 text-[#121414] font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-xs"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleDelete(
                      design.id,
                      design.catalogTitle || design.name || 'Mueble'
                    )
                  }
                  className="h-8 rounded-lg bg-[#242626] hover:bg-[#342020] hover:text-[#ffb4ab] border border-white/5 text-white font-semibold text-xs flex items-center justify-center transition-colors cursor-pointer"
                >
                  Eliminar
                </button>
              </div>

              {/* Mandatory "🚚 Enviar al Flete" Button on Every Catalog Card */}
              <button
                type="button"
                onClick={() => {
                  if (onSendDesignToFreight) {
                    onSendDesignToFreight(design);
                  } else if (onSendToFreight) {
                    onSendToFreight(design);
                  }
                }}
                className="w-full h-8 mt-2 rounded-lg bg-[#271e1a] hover:bg-[#342620] border border-[#e87a50]/60 text-[#ffb59b] font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-[#e87a50]" />
                <span>🚚 Enviar al Flete</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Design Modal (100% en milímetros, con cortes por separado y lados de filo por pieza) */}
      {editingDesign &&
        (() => {
          const wMm = Math.max(50, parseMm(editWidthMm, 400));
          const hMm = Math.max(50, parseMm(editHeightMm, 550));
          const dMm = Math.max(50, parseMm(editDepthMm, 335));
          const edgePriceM = Math.max(0, parseInt(editEdgePricePerM, 10) || 650);
          const structEdgeM = calcStructureCutsEdgeMeters(editStructureCuts);
          const drwEdgeM = editDrawersConfig.reduce(
            (acc, d) => acc + (Number(d?.edgeMeters) || 0),
            0
          );
          const totalEdgeM = Number((structEdgeM + drwEdgeM).toFixed(2));
          const totalEdgeCost = Math.round(totalEdgeM * edgePriceM);

          const readiness = getReadinessForDesign(
            editingDesign,
            editDrawerCount,
            editStructureCuts
          );

          return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3.5 overflow-y-auto">
              <div className="atelier-card rounded-2xl max-w-md w-full p-5 space-y-4 border border-white/15 my-auto max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-bold font-display text-white">
                      Editar Mueble, Cortes &amp; Filos (en mm)
                    </h3>
                    <p className="text-[11px] text-[#c8c6c5]">
                      Todas las medidas en milímetros • Filos por pieza
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingDesign(null)}
                    className="p-1.5 text-[#a1a1a1] hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Real-Time BOM Readiness Badge */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${readiness.color}`}
                >
                  <div className="text-xs font-bold leading-tight">
                    {readiness.badge}
                  </div>
                  {readiness.status === 'needs_saw' &&
                    onLoadMissingPiecesToCutter && (
                      <button
                        type="button"
                        onClick={() => {
                          onLoadMissingPiecesToCutter(
                            readiness.missingWoodPieces
                          );
                          setEditingDesign(null);
                          onShowToast(
                            `🛠️ ${readiness.missingWoodPieces.length} piezas faltantes cargadas en la Guillotina 2D`
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#e87a50] text-[#121414] text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer hover:bg-[#f0855c] transition-colors"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>Cargar a Sierra</span>
                      </button>
                    )}
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-3.5">
                  {/* Custom Thumbnail Image Uploader inside Edit Modal */}
                  <div className="p-3 rounded-xl bg-[#222424] border border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {editThumbnailUrl ? (
                        <img
                          src={editThumbnailUrl}
                          alt="Miniatura"
                          className="w-12 h-12 rounded-lg object-cover border border-white/20 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#141616] border border-white/10 flex items-center justify-center text-[#ffb59b] shrink-0">
                          <ImagePlus className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          Miniatura del Mueble
                        </div>
                        <div className="text-[10px] text-[#c8c6c5] truncate">
                          {editThumbnailUrl
                            ? 'Imagen personalizada cargada'
                            : 'Ilustración vectorial por defecto'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="px-2.5 py-1.5 rounded-lg bg-[#e87a50] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Subir Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const dataUrl = await compressImageToDataUrl(file);
                              setEditThumbnailUrl(dataUrl);
                            } catch {
                              onShowToast('Error al cargar imagen');
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {editThumbnailUrl && (
                        <button
                          type="button"
                          onClick={() => setEditThumbnailUrl('')}
                          title="Quitar imagen personalizada"
                          className="p-1.5 rounded-lg bg-[#141616] text-rose-300 hover:text-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                        Nombre del Mueble / Modelo
                      </label>
                      <input
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#ffb59b] mb-1">
                        Precio (ARS)
                      </label>
                      <input
                        type="number"
                        value={editPriceArs}
                        onChange={(e) => setEditPriceArs(e.target.value)}
                        className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-2.5 py-2 text-xs font-bold text-white tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Medidas Generales en MILÍMETROS: Largo (mm), Alto (mm), Profundidad (mm) */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                        Largo (mm)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={editWidthMm}
                        onChange={(e) => setEditWidthMm(e.target.value)}
                        className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                        Alto (mm)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={editHeightMm}
                        onChange={(e) => setEditHeightMm(e.target.value)}
                        className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#ffb59b] mb-1">
                        Profundidad (mm)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={editDepthMm}
                        onChange={(e) => setEditDepthMm(e.target.value)}
                        className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                      />
                    </div>
                  </div>

                  {/* SECCIÓN: CORTES POR SEPARADO CON ELECCIÓN INDIVIDUAL DE LADOS CON FILO */}
                  {renderStructureCutsFiloEditor(
                    editStructureCuts,
                    setEditStructureCuts,
                    editEdgePricePerM,
                    setEditEdgePricePerM,
                    structEdgeM,
                    drwEdgeM,
                    editDrawerCount,
                    totalEdgeM,
                    totalEdgeCost
                  )}

                  {/* Barra Numérica de Cajones (0 al 6) 100% Editable en mm con Herrajes desde Inventario */}
                  <DrawerConfiguratorBar
                    drawerCount={editDrawerCount}
                    drawersConfig={editDrawersConfig}
                    cabinetWidthMm={wMm}
                    cabinetHeightMm={hMm}
                    cabinetDepthMm={dMm}
                    edgePricePerMeterArs={edgePriceM}
                    inventoryItems={inventoryItems}
                    cutPieces={cutPieces}
                    predefinedCuts={predefinedCuts}
                    onChange={(newCount, newConfig) => {
                      setEditDrawerCount(newCount);
                      setEditDrawersConfig(newConfig);
                      setGeometricError(null);
                    }}
                  />

                  {geometricError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs">
                      {geometricError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditingDesign(null)}
                      className="px-4 py-2 rounded-xl bg-[#222424] hover:bg-[#2c2e2e] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] text-xs font-bold cursor-pointer shadow-md"
                    >
                      Guardar Configuración
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

      {/* New Design Modal (100% en milímetros, con los 7 cortes por defecto cargados y editables + filos por pieza) */}
      {showNewDesignModal &&
        (() => {
          const wMm = Math.max(50, parseMm(newWidthMm, 400));
          const hMm = Math.max(50, parseMm(newHeightMm, 550));
          const dMm = Math.max(50, parseMm(newDepthMm, 335));
          const edgePriceM = Math.max(0, parseInt(newEdgePricePerM, 10) || 650);
          const structEdgeM = calcStructureCutsEdgeMeters(newStructureCuts);
          const drwEdgeM = newDrawersConfig.reduce(
            (acc, d) => acc + (Number(d?.edgeMeters) || 0),
            0
          );
          const totalEdgeM = Number((structEdgeM + drwEdgeM).toFixed(2));
          const totalEdgeCost = Math.round(totalEdgeM * edgePriceM);

          return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3.5 overflow-y-auto">
              <div className="atelier-card rounded-2xl max-w-md w-full p-5 space-y-4 border border-white/15 my-auto max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-bold font-display text-white">
                      Nuevo Diseño en Catálogo (en mm)
                    </h3>
                    <p className="text-[11px] text-[#c8c6c5]">
                      Cortes por defecto cargados • Elegí lados con filo por pieza
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewDesignModal(false)}
                    className="p-1.5 text-[#a1a1a1] hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateNewDesign} className="space-y-3.5">
                  {/* Custom Thumbnail Image Uploader inside New Design Modal */}
                  <div className="p-3 rounded-xl bg-[#222424] border border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {newThumbnailUrl ? (
                        <img
                          src={newThumbnailUrl}
                          alt="Miniatura"
                          className="w-12 h-12 rounded-lg object-cover border border-white/20 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#141616] border border-white/10 flex items-center justify-center text-[#ffb59b] shrink-0">
                          <ImagePlus className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          Miniatura Personalizada
                        </div>
                        <div className="text-[10px] text-[#c8c6c5] truncate">
                          {newThumbnailUrl
                            ? 'Foto personalizada lista'
                            : 'Opcional: subí una foto real del mueble'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="px-2.5 py-1.5 rounded-lg bg-[#e87a50] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Subir Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const dataUrl = await compressImageToDataUrl(file);
                              setNewThumbnailUrl(dataUrl);
                            } catch {
                              onShowToast('Error al cargar imagen');
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {newThumbnailUrl && (
                        <button
                          type="button"
                          onClick={() => setNewThumbnailUrl('')}
                          title="Quitar imagen personalizada"
                          className="p-1.5 rounded-lg bg-[#141616] text-rose-300 hover:text-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                        Nombre del Mueble
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Mesita Nórdica V3"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#ffb59b] mb-1">
                        Precio (ARS)
                      </label>
                      <input
                        type="number"
                        value={newPriceArs}
                        onChange={(e) => setNewPriceArs(e.target.value)}
                        className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-2.5 py-2 text-xs font-bold text-white tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Medidas Generales en MILÍMETROS: Largo (mm), Alto (mm), Profundidad (mm) */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                        Largo (mm)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={newWidthMm}
                        onChange={(e) => setNewWidthMm(e.target.value)}
                        className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                        Alto (mm)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={newHeightMm}
                        onChange={(e) => setNewHeightMm(e.target.value)}
                        className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#ffb59b] mb-1">
                        Profundidad (mm)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={newDepthMm}
                        onChange={(e) => setNewDepthMm(e.target.value)}
                        className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                      />
                    </div>
                  </div>

                  {/* SECCIÓN: CORTES POR SEPARADO CON ELECCIÓN INDIVIDUAL DE LADOS CON FILO */}
                  {renderStructureCutsFiloEditor(
                    newStructureCuts,
                    setNewStructureCuts,
                    newEdgePricePerM,
                    setNewEdgePricePerM,
                    structEdgeM,
                    drwEdgeM,
                    newDrawerCount,
                    totalEdgeM,
                    totalEdgeCost
                  )}

                  {/* Barra Numérica de Cajones (0 al 6) 100% Editable en mm con Herrajes desde Inventario */}
                  <DrawerConfiguratorBar
                    drawerCount={newDrawerCount}
                    drawersConfig={newDrawersConfig}
                    cabinetWidthMm={wMm}
                    cabinetHeightMm={hMm}
                    cabinetDepthMm={dMm}
                    edgePricePerMeterArs={edgePriceM}
                    inventoryItems={inventoryItems}
                    cutPieces={cutPieces}
                    predefinedCuts={predefinedCuts}
                    onChange={(newCount, newConfig) => {
                      setNewDrawerCount(newCount);
                      setNewDrawersConfig(newConfig);
                      setNewGeometricError(null);
                    }}
                  />

                  {newGeometricError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs">
                      {newGeometricError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowNewDesignModal(false)}
                      className="px-4 py-2 rounded-xl bg-[#222424] hover:bg-[#2c2e2e] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#121414] text-xs font-bold cursor-pointer shadow-md"
                    >
                      Crear Mueble
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
    </div>
  );
};
