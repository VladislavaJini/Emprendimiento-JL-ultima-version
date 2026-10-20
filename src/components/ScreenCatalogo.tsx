import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Package,
  Search,
  Pencil,
  X,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Layers,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FurnitureDesign, InventoryItem, DrawerSpec, CutPiece } from '../types/atelier';
import {
  getInternalAvailableHeight,
  getMaxDrawersAllowed,
  generateDefaultDrawers,
  validateDrawersFit,
  getDrawerBomItems,
  getDrawerWoodCutPieces,
} from '../utils/drawerEngine';
import { formatARS } from '../data/initialData';

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
  onLoadMissingPiecesToCutter?: (pieces: Omit<CutPiece, 'id' | 'numberLabel'>[]) => void;
  inventoryItems: InventoryItem[];
  onGoToInventario: () => void;
  onOpenCadViewer?: () => void;
  onShowToast: (msg: string) => void;
}

export const ScreenCatalogo: React.FC<ScreenCatalogoProps> = ({
  designs,
  onAddDesign,
  onDeleteDesign,
  onUpdateDesign,
  inventoryItems,
  onGoToInventario,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Edit design modal
  const [editingDesign, setEditingDesign] = useState<FurnitureDesign | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editWidthCm, setEditWidthCm] = useState('45');
  const [editHeightCm, setEditHeightCm] = useState('55');
  const [editDepthCm, setEditDepthCm] = useState('38');

  // New design modal
  const [showNewDesignModal, setShowNewDesignModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWidthCm, setNewWidthCm] = useState('45');
  const [newHeightCm, setNewHeightCm] = useState('55');
  const [newDepthCm, setNewDepthCm] = useState('38');

  const filteredDesigns = designs.filter(
    (d) =>
      d.catalogTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Drawer & geometric configuration for Edit Modal
  const [editDrawerCount, setEditDrawerCount] = useState<number>(1);
  const [editDrawersConfig, setEditDrawersConfig] = useState<DrawerSpec[]>([]);
  const [showDrawersSubpanel, setShowDrawersSubpanel] = useState<boolean>(false);
  const [geometricError, setGeometricError] = useState<string | null>(null);

  // Drawer configuration for New Modal
  const [newDrawerCount, setNewDrawerCount] = useState<number>(1);
  const [newDrawersConfig, setNewDrawersConfig] = useState<DrawerSpec[]>([]);
  const [showNewDrawersSubpanel, setShowNewDrawersSubpanel] = useState<boolean>(false);
  const [newGeometricError, setNewGeometricError] = useState<string | null>(null);

  // Helper to compute readiness status
  const getReadinessForDesign = (
    design: FurnitureDesign,
    drawerCountOverride?: number
  ) => {
    const drwCount =
      drawerCountOverride !== undefined
        ? drawerCountOverride
        : design.drawerCount !== undefined
        ? design.drawerCount
        : 1;

    // Wood pieces
    const woodChecks = [
      { name: 'Tapa', needed: 1 },
      { name: 'Lateral', needed: 2 },
      { name: 'Piso', needed: 1 },
      ...(drwCount > 0
        ? [
            { name: 'Frente', needed: drwCount },
            { name: 'Cajón', needed: drwCount * 2 },
          ]
        : []),
    ];

    let missingWoodPieces: Omit<CutPiece, 'id' | 'numberLabel'>[] = [];
    let missingWoodCount = 0;

    woodChecks.forEach((wc) => {
      const match = inventoryItems.find(
        (it) =>
          it.category === 'pieza_cortada' &&
          it.name.toLowerCase().includes(wc.name.toLowerCase())
      );
      const stock = match ? match.stockQty : 0;
      if (stock < wc.needed) {
        const diff = wc.needed - stock;
        missingWoodCount += diff;
        missingWoodPieces.push({
          name: `${wc.name} (${design.catalogTitle || design.name})`,
          subtitle: `Pieza faltante de Escandallo BOM • Melamina 18mm`,
          widthMm: wc.name === 'Tapa' ? design.widthMm : design.depthMm,
          heightMm: wc.name === 'Lateral' ? design.heightMm : 180,
          quantity: diff,
          unitPriceArs: 4800,
          edgesLabel: 'Cantos 2L Frontal',
          edgesType: '2L',
          allowRotation: true,
          mandatoryGrain: false,
        });
      }
    });

    // Hardware checks
    const hardwareChecks = [
      ...(drwCount > 0
        ? [
            { name: 'Corredera', needed: drwCount },
            { name: 'Tirador', needed: drwCount },
          ]
        : []),
      { name: 'Pata', needed: 4 },
      { name: 'Tornillo', needed: 24 },
    ];

    let missingHardware = false;
    hardwareChecks.forEach((hc) => {
      const match = inventoryItems.find(
        (it) =>
          it.category === 'herraje' &&
          it.name.toLowerCase().includes(hc.name.toLowerCase())
      );
      if (!match || match.stockQty < hc.needed) {
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

  const handleOpenEdit = (design: FurnitureDesign) => {
    setEditingDesign(design);
    setEditTitle(design.catalogTitle || design.name);
    setEditWidthCm(String(Math.round(design.widthMm / 10)));
    setEditHeightCm(String(Math.round(design.heightMm / 10)));
    setEditDepthCm(String(Math.round(design.depthMm / 10)));
    const drwCount = design.drawerCount !== undefined ? design.drawerCount : 1;
    setEditDrawerCount(drwCount);
    setEditDrawersConfig(
      design.drawersConfig && design.drawersConfig.length > 0
        ? design.drawersConfig
        : generateDefaultDrawers(drwCount, design.widthMm, design.heightMm, design.depthMm)
    );
    setShowDrawersSubpanel(false);
    setGeometricError(null);
  };


  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesign) return;
    const wMm = (parseInt(editWidthCm, 10) || 45) * 10;
    const hMm = (parseInt(editHeightCm, 10) || 55) * 10;
    const dMm = (parseInt(editDepthCm, 10) || 38) * 10;

    const fitCheck = validateDrawersFit(editDrawersConfig, hMm);
    if (!fitCheck.valid) {
      setGeometricError(fitCheck.errorMsg || 'La suma de alturas de cajón excede la altura útil.');
      return;
    }

    if (onUpdateDesign) {
      onUpdateDesign(editingDesign.id, {
        catalogTitle: editTitle.trim() || editingDesign.catalogTitle,
        name: editTitle.trim() || editingDesign.name,
        widthMm: wMm,
        heightMm: hMm,
        depthMm: dMm,
        drawerCount: editDrawerCount,
        drawersConfig: editDrawersConfig,
        bomItems: getDrawerBomItems(editDrawersConfig),
        cutPiecesCount: 6 + editDrawerCount * 4,
      });
    }
    setEditingDesign(null);
    onShowToast(`Diseño actualizado (${editDrawerCount} cajones): ${editWidthCm}×${editHeightCm}×${editDepthCm} cm`);
  };

  const handleDelete = (id: string, name: string) => {
    if (onDeleteDesign) {
      onDeleteDesign(id);
    }
    onShowToast(`Diseño eliminado: ${name}`);
  };

  const handleCreateNewDesign = (e: React.FormEvent) => {
    e.preventDefault();
    const wMm = (parseInt(newWidthCm, 10) || 45) * 10;
    const hMm = (parseInt(newHeightCm, 10) || 55) * 10;
    const dMm = (parseInt(newDepthCm, 10) || 38) * 10;
    const codeNum = 4560 + designs.length;

    const fitCheck = validateDrawersFit(newDrawersConfig, hMm);
    if (!fitCheck.valid) {
      setNewGeometricError(fitCheck.errorMsg || 'La suma de alturas de cajón excede la altura útil.');
      return;
    }

    onAddDesign({
      code: `MN-${codeNum}`,
      name: newTitle.trim() || 'Mesita Nórdica Nueva',
      shortTitle: (newTitle.trim() || 'MESITA NÓRDICA').toUpperCase(),
      catalogTitle: newTitle.trim() || 'Mesita Nórdica Nueva',
      description: 'Mesa de luz con cajón ensamblado a 45° y corredera oculta.',
      widthMm: wMm,
      heightMm: hMm,
      depthMm: dMm,
      materialSummary: 'Melamina Carvalho Mezzo 18mm',
      cutPiecesCount: 6 + newDrawerCount * 4,
      suggestedPvpArs: 85000 + newDrawerCount * 12000,
      baseCostArs: 32400 + newDrawerCount * 8500,
      activeInWorkshop: true,
      bodyTexture: 'Blanco Puro',
      frontTexture: 'Carvalho',
      drawerCount: newDrawerCount,
      drawersConfig: newDrawersConfig,
      bomItems: getDrawerBomItems(newDrawersConfig),
    });

    setNewTitle('');
    setShowNewDesignModal(false);
    onShowToast(`Nuevo diseño creado con ${newDrawerCount} cajones`);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Action Buttons (Strictly matching reference screenshot) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowNewDesignModal(true)}
          className="h-12 rounded-2xl bg-[#e87a50] hover:bg-[#f0855c] text-[#280b00] font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>+ Nuevo Diseño</span>
        </button>

        <button
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
          placeholder="Buscar mueble por nombre, serie o cota"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder-[#8e8e8e] focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-[#a1a1a1] hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Section Header: Diseños [8 items visible] */}
      <div className="flex items-center gap-2 pt-0.5">
        <h2 className="text-base font-bold font-display text-white">Diseños</h2>
        <span className="bg-[#222424] border border-white/5 text-[#a1a1a1] text-[11px] font-medium px-2.5 py-0.5 rounded-md tabular-nums">
          {filteredDesigns.length} items visible
        </span>
      </div>

      {/* 2-Column Catalog Grid (100% Identical to reference grok_1792461434646.jpg) */}
      <div className="grid grid-cols-2 gap-3">
        {filteredDesigns.map((design) => {
          const widthCm = Math.round(design.widthMm / 10);
          const heightCm = Math.round(design.heightMm / 10);
          const depthCm = Math.round(design.depthMm / 10);

          return (
            <div
              key={design.id}
              className="atelier-card rounded-2xl p-3 flex flex-col justify-between bg-[#161818] border border-white/10 hover:border-white/20 transition-all shadow-md group"
            >
              {/* Product Visual Studio Render (Isometric Nordic Nightstand with Drawer) */}
              <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#121414] border border-white/5 flex items-center justify-center p-2 relative">
                <svg
                  viewBox="0 0 160 140"
                  className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                >
                  <defs>
                    {/* Soft wood texture & gradient */}
                    <linearGradient id="bodyWood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d9a877" />
                      <stop offset="100%" stopColor="#bf8e5c" />
                    </linearGradient>
                    <linearGradient id="drawerFront" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e2b485" />
                      <stop offset="100%" stopColor="#c79664" />
                    </linearGradient>
                    <linearGradient id="legWood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ad7a4b" />
                      <stop offset="100%" stopColor="#87582d" />
                    </linearGradient>
                  </defs>

                  {/* Ground shadow */}
                  <ellipse cx="80" cy="126" rx="55" ry="7" fill="rgba(0,0,0,0.4)" />

                  {/* 4 Splayed Legs */}
                  {/* Left Back Leg */}
                  <polygon points="46,75 52,75 42,122 36,122" fill="#6b4421" />
                  {/* Right Back Leg */}
                  <polygon points="108,75 114,75 124,122 118,122" fill="#6b4421" />

                  {/* Left Front Splayed Leg */}
                  <polygon points="38,76 46,76 34,124 26,124" fill="url(#legWood)" stroke="#593717" strokeWidth="0.8" />
                  {/* Right Front Splayed Leg */}
                  <polygon points="114,76 122,76 134,124 126,124" fill="url(#legWood)" stroke="#593717" strokeWidth="0.8" />

                  {/* Cabinet Body Overhang Top */}
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

                  {/* Main Cabinet Box */}
                  <rect
                    x="24"
                    y="25"
                    width="112"
                    height="54"
                    rx="2"
                    fill="url(#bodyWood)"
                    stroke="#593717"
                    strokeWidth="1.2"
                  />

                  {/* Drawer Inset Rim */}
                  <rect
                    x="30"
                    y="31"
                    width="100"
                    height="42"
                    rx="1.5"
                    fill="#181512"
                  />

                  {/* Drawer Front */}
                  <rect
                    x="32"
                    y="33"
                    width="96"
                    height="38"
                    rx="1.2"
                    fill="url(#drawerFront)"
                    stroke="#663f1a"
                    strokeWidth="0.8"
                  />

                  {/* Minimalist Round Knob Pull */}
                  <circle cx="80" cy="52" r="3.2" fill="#2b1a0e" />
                  <circle cx="79.3" cy="51.3" r="1.2" fill="#4d321d" />
                </svg>
              </div>

              {/* Title Matching Reference Screenshot */}
              <h3 className="text-xs font-bold text-white leading-snug truncate mt-2">
                {design.catalogTitle || design.name}
              </h3>

              {/* Dimension Pills: [45 cm] [55 cm] [38 cm ✏️] */}
              <div className="flex items-center justify-between gap-1 mt-2">
                <span className="bg-[#242626] border border-white/10 text-white text-[11px] font-bold px-2 py-1 rounded-md tabular-nums">
                  {widthCm} cm
                </span>
                <span className="bg-[#242626] border border-white/10 text-white text-[11px] font-bold px-2 py-1 rounded-md tabular-nums">
                  {heightCm} cm
                </span>
                <button
                  onClick={() => handleOpenEdit(design)}
                  title="Editar medidas"
                  className="bg-[#242626] hover:bg-[#2c2e2e] border border-white/10 text-white text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer tabular-nums"
                >
                  <span>{depthCm} cm</span>
                  <Pencil className="w-2.5 h-2.5 text-[#a1a1a1]" />
                </button>
              </div>

              {/* Action Buttons: [Editar] [Eliminar] */}
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <button
                  onClick={() => handleOpenEdit(design)}
                  className="h-8 rounded-lg bg-[#e87a50] hover:bg-[#f0855c] active:scale-95 text-[#121414] font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-xs"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(design.id, design.catalogTitle)}
                  className="h-8 rounded-lg bg-[#242626] hover:bg-[#342020] hover:text-[#ffb4ab] border border-white/5 text-white font-semibold text-xs flex items-center justify-center transition-colors cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Design Modal with Parametric Drawer Configurator & BOM Sync */}
      {editingDesign && (() => {
        const hMm = (parseInt(editHeightCm, 10) || 55) * 10;
        const wMm = (parseInt(editWidthCm, 10) || 45) * 10;
        const dMm = (parseInt(editDepthCm, 10) || 38) * 10;
        const internalHeight = getInternalAvailableHeight(hMm);
        const maxDrawers = getMaxDrawersAllowed(hMm);
        const readiness = getReadinessForDesign(editingDesign, editDrawerCount);

        const handleDrawerChange = (delta: number) => {
          const next = editDrawerCount + delta;
          if (next < 0) return;
          if (next > maxDrawers) {
            setGeometricError(
              `Límite físico alcanzado: En una altura útil de ${internalHeight} mm caben máximo ${maxDrawers} cajones.`
            );
            return;
          }
          setGeometricError(null);
          setEditDrawerCount(next);
          setEditDrawersConfig(generateDefaultDrawers(next, wMm, hMm, dMm));
        };

        const handleUpdateSingleDrawer = (dIdx: number, field: keyof DrawerSpec, value: any) => {
          const updated = [...editDrawersConfig];
          updated[dIdx] = { ...updated[dIdx], [field]: value };
          const validation = validateDrawersFit(updated, hMm);
          if (!validation.valid) {
            setGeometricError(validation.errorMsg || 'La suma de alturas de cajón excede la altura útil.');
          } else {
            setGeometricError(null);
          }
          setEditDrawersConfig(updated);
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3.5 overflow-y-auto">
            <div className="atelier-card rounded-2xl max-w-md w-full p-5 space-y-4 border border-white/15 my-auto max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold font-display text-white">
                    Configuración &amp; Escandallo (BOM)
                  </h3>
                  <p className="text-[11px] text-[#c8c6c5]">
                    Mueble paramétrico vinculado con Inventario
                  </p>
                </div>
                <button
                  onClick={() => setEditingDesign(null)}
                  className="p-1.5 text-[#a1a1a1] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Real-Time BOM Readiness Badge */}
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${readiness.color}`}>
                <div className="text-xs font-bold leading-tight">
                  {readiness.badge}
                </div>
                {readiness.status === 'needs_saw' && onLoadMissingPiecesToCutter && (
                  <button
                    type="button"
                    onClick={() => {
                      onLoadMissingPiecesToCutter(readiness.missingWoodPieces);
                      setEditingDesign(null);
                      onShowToast(`🛠️ ${readiness.missingWoodPieces.length} piezas faltantes cargadas en la Guillotina 2D`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#e87a50] text-[#121414] text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer hover:bg-[#f0855c] transition-colors"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Cargar a Sierra</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Nombre del Mueble / Modelo
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                      Ancho (cm)
                    </label>
                    <input
                      type="number"
                      value={editWidthCm}
                      onChange={(e) => {
                        setEditWidthCm(e.target.value);
                        const newW = (parseInt(e.target.value, 10) || 45) * 10;
                        setEditDrawersConfig(generateDefaultDrawers(editDrawerCount, newW, hMm, dMm));
                      }}
                      className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                      Alto (cm)
                    </label>
                    <input
                      type="number"
                      value={editHeightCm}
                      onChange={(e) => {
                        setEditHeightCm(e.target.value);
                        const newH = (parseInt(e.target.value, 10) || 55) * 10;
                        setEditDrawersConfig(generateDefaultDrawers(editDrawerCount, wMm, newH, dMm));
                      }}
                      className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#ffb59b] mb-1">
                      Prof. (cm)
                    </label>
                    <input
                      type="number"
                      value={editDepthCm}
                      onChange={(e) => {
                        setEditDepthCm(e.target.value);
                        const newD = (parseInt(e.target.value, 10) || 38) * 10;
                        setEditDrawersConfig(generateDefaultDrawers(editDrawerCount, wMm, hMm, newD));
                      }}
                      className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                    />
                  </div>
                </div>

                {/* PARAMETRIC DRAWER CONFIGURATOR & GEOMETRIC VALIDATION */}
                <div className="p-3.5 rounded-xl bg-[#1c1e1e] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#e87a50]" />
                        <span>Cantidad de Cajones</span>
                      </div>
                      <div className="text-[10px] text-[#c8c6c5]">
                        Altura útil interna: <strong className="text-white">{internalHeight} mm</strong> (Máx: {maxDrawers} cajones)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDrawerChange(-1)}
                        disabled={editDrawerCount <= 0}
                        className="w-8 h-8 rounded-lg bg-[#272929] hover:bg-[#323535] text-white flex items-center justify-center font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-[#ffb59b] tabular-nums">
                        {editDrawerCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDrawerChange(1)}
                        className="w-8 h-8 rounded-lg bg-[#272929] hover:bg-[#323535] text-white flex items-center justify-center font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Geometric Validation Warning (Constraint Engine) */}
                  {geometricError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{geometricError}</span>
                    </div>
                  )}

                  {/* Drawer Parts Preview */}
                  {editDrawerCount > 0 && editDrawersConfig.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-white/5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#c8c6c5]">
                        <span>Desglose de Piezas de Cajonería:</span>
                        <button
                          type="button"
                          onClick={() => setShowDrawersSubpanel((prev) => !prev)}
                          className="text-[#ffb59b] hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <Settings2 className="w-3 h-3" />
                          <span>{showDrawersSubpanel ? 'Ocultar Ajuste' : 'Editar Cajones / Insumos'}</span>
                          {showDrawersSubpanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Sub-panel "Editar Cajón / Insumos" */}
                      {showDrawersSubpanel ? (
                        <div className="space-y-2.5 bg-[#171919] p-3 rounded-lg border border-white/10">
                          {editDrawersConfig.map((drw, dIdx) => (
                            <div key={drw.id || dIdx} className="p-2.5 rounded bg-[#202222] border border-white/5 space-y-2 text-xs">
                              <div className="flex items-center justify-between font-bold text-white">
                                <span className="text-[#ffb59b]">Cajón #{drw.index}</span>
                                <span className="text-[11px] text-[#a1a1a1]">
                                  Luz / H: {drw.frontHeightMm} mm
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-[#c8c6c5] block mb-0.5">
                                    Alto Frente (mm)
                                  </label>
                                  <input
                                    type="number"
                                    value={drw.frontHeightMm}
                                    onChange={(e) =>
                                      handleUpdateSingleDrawer(dIdx, 'frontHeightMm', parseInt(e.target.value, 10) || 85)
                                    }
                                    className="w-full bg-[#2a2c2c] border border-white/10 rounded px-2 py-1 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-[#c8c6c5] block mb-0.5">
                                    Corredera
                                  </label>
                                  <select
                                    value={drw.slideType}
                                    onChange={(e) => handleUpdateSingleDrawer(dIdx, 'slideType', e.target.value)}
                                    className="w-full bg-[#2a2c2c] border border-white/10 rounded px-2 py-1 text-xs text-white cursor-pointer"
                                  >
                                    <option value="Correderas Telescópicas 350mm">Telescópica 350mm</option>
                                    <option value="Correderas Telescópicas 400mm">Telescópica 400mm</option>
                                    <option value="Correderas Cierre Suave 350mm">Cierre Suave 350mm</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#b7b5b4]">
                          <div className="p-2 rounded bg-[#161818] border border-white/5">
                            <span className="text-white font-medium">Frente ({editDrawerCount}x):</span> {editDrawersConfig[0]?.frontWidthMm} × {editDrawersConfig[0]?.frontHeightMm} mm
                          </div>
                          <div className="p-2 rounded bg-[#161818] border border-white/5">
                            <span className="text-white font-medium">Laterales ({editDrawerCount * 2}x):</span> {editDrawersConfig[0]?.sidesDepthMm} × {editDrawersConfig[0]?.sidesHeightMm} mm
                          </div>
                          <div className="p-2 rounded bg-[#161818] border border-white/5">
                            <span className="text-white font-medium">Fondo ({editDrawerCount}x):</span> {editDrawersConfig[0]?.bottomWidthMm} × {editDrawersConfig[0]?.bottomDepthMm} mm
                          </div>
                          <div className="p-2 rounded bg-[#161818] border border-white/5 text-[#ffb59b]">
                            <span className="font-medium">Insumos:</span> {editDrawerCount} par correderas + tiradores
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

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

      {/* New Design Modal with Parametric Drawer Configurator */}
      {showNewDesignModal && (() => {
        const hMm = (parseInt(newHeightCm, 10) || 55) * 10;
        const wMm = (parseInt(newWidthCm, 10) || 45) * 10;
        const dMm = (parseInt(newDepthCm, 10) || 38) * 10;
        const internalHeight = getInternalAvailableHeight(hMm);
        const maxDrawers = getMaxDrawersAllowed(hMm);

        const handleNewDrawerChange = (delta: number) => {
          const next = newDrawerCount + delta;
          if (next < 0) return;
          if (next > maxDrawers) {
            setNewGeometricError(
              `Límite físico alcanzado: En una altura útil de ${internalHeight} mm caben máximo ${maxDrawers} cajones.`
            );
            return;
          }
          setNewGeometricError(null);
          setNewDrawerCount(next);
          setNewDrawersConfig(generateDefaultDrawers(next, wMm, hMm, dMm));
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3.5 overflow-y-auto">
            <div className="atelier-card rounded-2xl max-w-md w-full p-5 space-y-4 border border-white/15 my-auto max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-base font-bold font-display text-white">
                  Nuevo Diseño en Catálogo
                </h3>
                <button
                  onClick={() => setShowNewDesignModal(false)}
                  className="p-1.5 text-[#a1a1a1] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateNewDesign} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Nombre del Mueble
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Mesita Nórdica V3"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                      Ancho (cm)
                    </label>
                    <input
                      type="number"
                      value={newWidthCm}
                      onChange={(e) => {
                        setNewWidthCm(e.target.value);
                        const newW = (parseInt(e.target.value, 10) || 45) * 10;
                        setNewDrawersConfig(generateDefaultDrawers(newDrawerCount, newW, hMm, dMm));
                      }}
                      className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                      Alto (cm)
                    </label>
                    <input
                      type="number"
                      value={newHeightCm}
                      onChange={(e) => {
                        setNewHeightCm(e.target.value);
                        const newH = (parseInt(e.target.value, 10) || 55) * 10;
                        setNewDrawersConfig(generateDefaultDrawers(newDrawerCount, wMm, newH, dMm));
                      }}
                      className="w-full bg-[#222424] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#ffb59b] mb-1">
                      Prof. (cm)
                    </label>
                    <input
                      type="number"
                      value={newDepthCm}
                      onChange={(e) => {
                        setNewDepthCm(e.target.value);
                        const newD = (parseInt(e.target.value, 10) || 38) * 10;
                        setNewDrawersConfig(generateDefaultDrawers(newDrawerCount, wMm, hMm, newD));
                      }}
                      className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                    />
                  </div>
                </div>

                {/* Parametric Drawer Selector */}
                <div className="p-3.5 rounded-xl bg-[#1c1e1e] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#e87a50]" />
                        <span>Cantidad de Cajones</span>
                      </div>
                      <div className="text-[10px] text-[#c8c6c5]">
                        Altura útil: {internalHeight} mm (Máx: {maxDrawers} cajones)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleNewDrawerChange(-1)}
                        disabled={newDrawerCount <= 0}
                        className="w-8 h-8 rounded-lg bg-[#272929] hover:bg-[#323535] text-white flex items-center justify-center font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-[#ffb59b] tabular-nums">
                        {newDrawerCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleNewDrawerChange(1)}
                        className="w-8 h-8 rounded-lg bg-[#272929] hover:bg-[#323535] text-white flex items-center justify-center font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {newGeometricError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{newGeometricError}</span>
                    </div>
                  )}
                </div>

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
