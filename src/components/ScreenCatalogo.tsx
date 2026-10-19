import React, { useState } from 'react';
import {
  Archive,
  PlusCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Camera,
  Box,
  Pencil,
  Ruler,
  Scissors,
  FileSpreadsheet,
  ChevronDown,
  LayoutGrid,
  ArrowLeftRight,
  CircleDot,
  Hammer,
  Minus,
  Plus,
  Trash2,
  Package,
  X,
} from 'lucide-react';
import {
  FurnitureDesign,
  BomMaterialItem,
  InventoryItem,
} from '../types/atelier';
import { formatARS } from '../data/initialData';

interface ScreenCatalogoProps {
  designs: FurnitureDesign[];
  activeDesignIndex: number;
  onSelectDesignIndex: (index: number) => void;
  onUpdateBomQty: (designId: string, bomId: string, delta: number) => void;
  onDeleteBomItem: (designId: string, bomId: string) => void;
  onAddBomItem: (designId: string, item: Omit<BomMaterialItem, 'id' | 'code'>) => void;
  onSaveDesignCost: (designId: string, newCostArs: number) => void;
  onAddDesign: (design: Omit<FurnitureDesign, 'id'>) => void;
  inventoryItems: InventoryItem[];
  onGoToInventario: () => void;
  onOpenCadViewer: () => void;
  onShowToast: (msg: string) => void;
}

export const ScreenCatalogo: React.FC<ScreenCatalogoProps> = ({
  designs,
  activeDesignIndex,
  onSelectDesignIndex,
  onUpdateBomQty,
  onDeleteBomItem,
  onAddBomItem,
  onSaveDesignCost,
  onAddDesign,
  inventoryItems,
  onGoToInventario,
  onOpenCadViewer,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [bomExpanded, setBomExpanded] = useState(true);
  const [photoVariant, setPhotoVariant] = useState<number>(0);
  const [showAddBomModal, setShowAddBomModal] = useState(false);
  const [showNewDesignModal, setShowNewDesignModal] = useState(false);

  // Inventory-driven Add BOM Modal state (user selects from Inventory dropdown and only sets quantity!)
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>(
    inventoryItems[0]?.id || ''
  );
  const [newBomQty, setNewBomQty] = useState('1');

  // New Design fields
  const [newDesignTitle, setNewDesignTitle] = useState('');
  const [newDesignCode, setNewDesignCode] = useState('MN-4890');
  const [newDesignPvp, setNewDesignPvp] = useState('125000');

  const filteredDesigns = designs.filter(
    (d) =>
      d.catalogTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.materialSummary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentDesign =
    filteredDesigns[activeDesignIndex % Math.max(1, filteredDesigns.length)] ||
    designs[0];

  const liveSumCostArs = currentDesign.bomItems.reduce(
    (acc, item) => acc + Math.round(item.quantity * item.unitPriceArs),
    0
  );

  const selectedInvItem =
    inventoryItems.find((i) => i.id === selectedInventoryId) ||
    inventoryItems[0];

  const handlePrev = () => {
    const len = filteredDesigns.length || 1;
    onSelectDesignIndex((activeDesignIndex - 1 + len) % len);
  };

  const handleNext = () => {
    const len = filteredDesigns.length || 1;
    onSelectDesignIndex((activeDesignIndex + 1) % len);
  };

  const handleOpenAddBomModal = () => {
    if (inventoryItems.length > 0 && !selectedInventoryId) {
      setSelectedInventoryId(inventoryItems[0].id);
    }
    setNewBomQty('1');
    setShowAddBomModal(true);
  };

  const handleCreateBomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvItem) return;
    const qty = Math.max(0.1, parseFloat(newBomQty) || 1);

    onAddBomItem(currentDesign.id, {
      name: selectedInvItem.name,
      subtitle: selectedInvItem.subtitle,
      unitPriceArs: selectedInvItem.unitPriceArs,
      unitLabel: selectedInvItem.unitLabel,
      quantity: qty,
      step: selectedInvItem.step || 1,
      iconType: selectedInvItem.iconType,
      inventoryItemId: selectedInvItem.id,
    });
    setShowAddBomModal(false);
    onShowToast(
      `Incorporado desde Inventario: ${selectedInvItem.name} (×${qty} ${selectedInvItem.unitLabel})`
    );
  };

  const handleCreateDesign = (e: React.FormEvent) => {
    e.preventDefault();
    const pvp = parseInt(newDesignPvp, 10) || 125000;
    onAddDesign({
      code: newDesignCode.trim() || 'JL-5010',
      name: newDesignTitle.trim() || 'Vajillero Escandinavo V2',
      shortTitle: (newDesignTitle.trim() || 'VAJILLERO ESCANDINAVO').toUpperCase(),
      catalogTitle: newDesignTitle.trim() || 'Vajillero Escandinavo V2',
      description: 'Módulo de diseño propio con frentes a 45° y patas macizas.',
      widthMm: 1200,
      heightMm: 800,
      depthMm: 420,
      materialSummary: 'Melamina Carvalho Mezzo 18mm',
      cutPiecesCount: 15,
      suggestedPvpArs: pvp,
      baseCostArs: Math.round(pvp * 0.38),
      activeInWorkshop: true,
      bodyTexture: 'Blanco Puro',
      frontTexture: 'Carvalho',
      bomItems: currentDesign.bomItems,
    });
    setNewDesignTitle('');
    setShowNewDesignModal(false);
    onShowToast('Nuevo diseño incorporado al Catálogo de Muebles J&L');
  };

  const renderBomIcon = (type: BomMaterialItem['iconType']) => {
    switch (type) {
      case 'board':
        return <LayoutGrid className="w-4 h-4 text-[#c8c6c5]" />;
      case 'edge':
        return <Ruler className="w-4 h-4 text-[#c8c6c5]" />;
      case 'slide':
        return <ArrowLeftRight className="w-4 h-4 text-[#c8c6c5]" />;
      case 'leg':
        return <CircleDot className="w-4 h-4 text-[#c8c6c5]" />;
      case 'screw':
      default:
        return <Hammer className="w-4 h-4 text-[#c8c6c5]" />;
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#ffb59b]">
            <span className="w-2 h-2 rounded-full bg-[#e87a50]" />
            <span>TALLER &amp; PRODUCCIÓN J&amp;L</span>
          </div>

          <div className="bg-[#1e2020] border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#e3e2e2]">
            <Archive className="w-3.5 h-3.5 text-[#ffb59b]" />
            <span>{14 + designs.length} Diseños activos</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold font-display text-white tracking-tight">
          Catálogo de Muebles
        </h1>

        <p className="text-xs text-[#b7b5b4] leading-relaxed">
          Escandallos técnicos, modelos 3D y costeo directo de piezas.
        </p>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowNewDesignModal(true)}
            className="h-11 px-4 rounded-2xl bg-[#e87a50] hover:bg-[#f0855c] text-[#280b00] font-bold text-xs inline-flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Nuevo Diseño</span>
          </button>

          <button
            onClick={onGoToInventario}
            className="h-11 px-4 rounded-2xl bg-[#1e2020] hover:bg-[#292a2a] border border-white/10 text-[#ffb59b] font-bold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Ver Inventario ({inventoryItems.length})</span>
          </button>
        </div>
      </div>

      {/* Search & Carousel Controls */}
      <div className="space-y-2.5">
        <div className="bg-[#181a1a] border border-white/10 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
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

        {/* Carousel Bar */}
        <div className="bg-[#181a1a] border border-white/10 rounded-2xl p-2 flex items-center justify-between gap-2">
          <button
            onClick={handlePrev}
            className="px-3 py-1.5 rounded-xl bg-[#222424] hover:bg-[#2c2e2e] text-xs font-bold text-[#c8c6c5] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>

          <div className="flex flex-col items-center min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#ffb59b] truncate">
                {currentDesign.shortTitle}
              </span>
              <span className="bg-[#252727] text-[#c8c6c5] text-[10px] font-bold px-2 py-0.5 rounded tabular-nums">
                {(activeDesignIndex % Math.max(1, filteredDesigns.length)) + 1} /{' '}
                {filteredDesigns.length}
              </span>
            </div>
            <div className="w-20 h-1 bg-[#292a2a] rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-[#e87a50] rounded-full transition-all"
                style={{
                  width: `${
                    (((activeDesignIndex % Math.max(1, filteredDesigns.length)) + 1) /
                      Math.max(1, filteredDesigns.length)) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>

          <button
            onClick={handleNext}
            className="px-3.5 py-1.5 rounded-full bg-[#e87a50] hover:bg-[#f0855c] text-[#280b00] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Section Title */}
      <div className="flex items-center gap-2 pt-1">
        <h2 className="text-sm font-bold text-white">Diseños</h2>
        <span className="bg-[#222424] border border-white/5 text-[#a1a1a1] text-[11px] font-medium px-2.5 py-0.5 rounded-md">
          1 items visible
        </span>
      </div>

      {/* Vertical Mobile Stack */}
      <div className="space-y-4">
        {/* Product Showcase Card */}
        <div>
          <section className="atelier-card rounded-2xl p-4 space-y-4">
            {/* Bedroom Nightstand Studio Photo Illustration */}
            <div className="relative w-full aspect-[16/11] rounded-xl overflow-hidden bg-[#26201b] border border-white/10">
              <svg viewBox="0 0 400 275" className="w-full h-full object-cover">
                <defs>
                  <linearGradient id="wallGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop
                      offset="0%"
                      stopColor={photoVariant % 2 === 0 ? '#d8d0c5' : '#2d3134'}
                    />
                    <stop
                      offset="100%"
                      stopColor={photoVariant % 2 === 0 ? '#b5a899' : '#1b1e20'}
                    />
                  </linearGradient>
                  <radialGradient id="lampGlow" cx="0.45" cy="0.32" r="0.35">
                    <stop offset="0%" stopColor="#ffdf9e" stopOpacity="0.65" />
                    <stop offset="100%" stopColor="#ffdf9e" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <rect width="400" height="215" fill="url(#wallGrad)" />
                <rect y="215" width="400" height="60" fill="#6d5642" />

                <rect
                  x="245"
                  y="75"
                  width="165"
                  height="165"
                  rx="8"
                  fill="#c2b7ab"
                />
                <path
                  d="M 255 60 Q 315 52 370 68 L 365 118 Q 310 122 248 112 Z"
                  fill="#dfd7ce"
                />
                <path
                  d="M 245 125 Q 310 118 400 130 L 400 245 L 258 245 Z"
                  fill="#9b8e82"
                />

                <circle cx="172" cy="88" r="95" fill="url(#lampGlow)" />

                <polygon points="118,195 127,195 117,258 109,258" fill="#8c6747" />
                <polygon points="145,195 152,195 147,245 141,245" fill="#705136" />
                <polygon points="212,195 221,195 229,258 221,258" fill="#9c7450" />
                <polygon points="192,195 199,195 204,244 198,244" fill="#705136" />

                <polygon
                  points="96,125 125,134 125,198 96,186"
                  fill="#9e7652"
                  stroke="#6b4c30"
                />
                <polygon
                  points="96,125 198,118 232,127 125,134"
                  fill="#cfa379"
                  stroke="#8c6747"
                />
                <polygon
                  points="125,134 232,127 232,193 125,198"
                  fill="#c29368"
                  stroke="#6b4c30"
                  strokeWidth="2"
                />
                <polygon
                  points="131,140 226,133 226,187 131,192"
                  fill="#b8875b"
                  stroke="#5e4127"
                  strokeWidth="1.5"
                />
                <circle cx="180" cy="163" r="4.5" fill="#52371f" />
                <circle cx="179" cy="162" r="2.5" fill="#d4a359" />

                <polygon
                  points="134,117 195,113 206,119 144,124"
                  fill="#e6e2dc"
                  stroke="#9c968d"
                />
                <polygon
                  points="138,110 192,106 202,112 148,117"
                  fill="#d5cfc7"
                  stroke="#8c867d"
                />

                <rect
                  x="160"
                  y="86"
                  width="22"
                  height="22"
                  rx="6"
                  fill="#cfc8be"
                  stroke="#8c857b"
                />
                <ellipse
                  cx="171"
                  cy="74"
                  rx="9"
                  ry="12"
                  fill="#fff1c2"
                  stroke="#e8b954"
                />
                <circle cx="171" cy="74" r="4" fill="#ffffff" />
              </svg>

              <div className="absolute top-3 left-3 bg-[#141616]/90 backdrop-blur-xs border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#37d67a]" />
                <span className="text-[11px] font-bold text-white">
                  Activo en Taller
                </span>
              </div>

              <button
                onClick={() => {
                  setPhotoVariant((v) => v + 1);
                  onShowToast('Ambiente de fotografía de catálogo actualizado');
                }}
                className="absolute top-3 right-3 bg-[#141616]/90 hover:bg-[#1e2020] backdrop-blur-xs border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5 text-[11px] font-bold text-white transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#c8c6c5]" />
                <span>Cambiar foto</span>
              </button>

              <div className="absolute bottom-3 left-3 bg-[#141616]/90 border border-white/10 rounded-md px-2.5 py-1 text-[11px] font-bold text-white tabular-nums">
                {currentDesign.code}
              </div>

              <button
                onClick={onOpenCadViewer}
                title="Abrir en Atelier CAD 3D"
                className="absolute bottom-3 right-3 w-9 h-9 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#280b00] flex items-center justify-center shadow-lg transition-colors cursor-pointer"
              >
                <Box className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>

            {/* Product Title & Specs */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-bold font-display text-white leading-tight">
                  {currentDesign.catalogTitle}
                </h3>
                <button
                  onClick={onOpenCadViewer}
                  className="p-1.5 text-[#a1a1a1] hover:text-white cursor-pointer shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#b7b5b4] leading-relaxed">
                {currentDesign.description}
              </p>

              <div className="flex flex-wrap gap-2">
                <div className="bg-[#202222] border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-[#e3e2e2] tabular-nums">
                  <Ruler className="w-3.5 h-3.5 text-[#c8c6c5]" />
                  <span>
                    {currentDesign.widthMm / 10} × {currentDesign.heightMm / 10} ×{' '}
                    {currentDesign.depthMm / 10} cm
                  </span>
                </div>

                <div className="bg-[#202222] border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-[#e3e2e2]">
                  <span className="w-3 h-3 rounded-xs atelier-hatch inline-block" />
                  <span>{currentDesign.materialSummary}</span>
                </div>

                <div className="bg-[#202222] border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-[#e3e2e2] tabular-nums">
                  <Scissors className="w-3.5 h-3.5 text-[#c8c6c5]" />
                  <span>{currentDesign.cutPiecesCount} piezas de corte</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1a1]">
                    COSTO INSUMOS
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5 tabular-nums">
                    <span className="text-xl font-bold font-display text-[#ffb59b]">
                      {formatARS(currentDesign.baseCostArs)}
                    </span>
                    <span className="text-xs text-[#a1a1a1]">ARS</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1a1]">
                    PVP SUGERIDO
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5 tabular-nums">
                    <span className="text-xl font-bold font-display text-white">
                      {formatARS(currentDesign.suggestedPvpArs)}
                    </span>
                    <span className="text-xs text-[#a1a1a1]">ARS</span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setBomExpanded((prev) => !prev)}
                  className="bg-[#222424] hover:bg-[#2c2e2e] border border-white/10 rounded-xl px-3.5 py-2 inline-flex items-center gap-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#ffb59b]" />
                  <span>Insumos (BOM)</span>
                  <span className="bg-[#3d231a] text-[#ffb59b] text-[11px] px-2 py-0.5 rounded-md tabular-nums">
                    {currentDesign.bomItems.length}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#a1a1a1] transition-transform ${
                      bomExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Escandallo Directo de Materiales */}
        {bomExpanded && (
          <div>
            <section className="atelier-card rounded-2xl p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#2c1d17] text-[#ffb59b] flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">
                      Escandallo Directo de Materiales
                    </h3>
                    <p className="text-[11px] text-[#a1a1a1]">
                      (Selecciona del Inventario o modifica cantidades)
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleOpenAddBomModal}
                  className="bg-[#332018] hover:bg-[#42291f] border border-[#5c3b2e] text-[#ffb59b] text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  + Agregar
                  <br />
                  Insumo
                </button>
              </div>

              {/* BOM Items List */}
              <div className="space-y-2.5">
                {currentDesign.bomItems.map((item) => {
                  const itemSubtotal = Math.round(
                    item.quantity * item.unitPriceArs
                  );
                  return (
                    <div
                      key={item.id}
                      className="atelier-subcard rounded-xl p-3.5 space-y-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {renderBomIcon(item.iconType)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-[#a1a1a1] tabular-nums">
                            {formatARS(item.unitPriceArs)} /{' '}
                            {item.unitLabel === 'm'
                              ? 'metro lineal'
                              : item.unitLabel === 'un' &&
                                item.iconType === 'screw'
                              ? 'tornillo'
                              : item.unitLabel === 'un'
                              ? 'unidad'
                              : item.unitLabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {/* Stepper */}
                        <div className="flex items-center gap-2 bg-[#161818] border border-white/5 rounded-lg p-1">
                          <button
                            onClick={() =>
                              onUpdateBomQty(
                                currentDesign.id,
                                item.id,
                                -item.step
                              )
                            }
                            className="w-7 h-7 rounded-md bg-[#222424] hover:bg-[#2e3030] text-[#c8c6c5] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <div className="px-2 flex items-baseline gap-1 text-xs tabular-nums">
                            <span className="font-bold text-white">
                              {Number(item.quantity.toFixed(1))}
                            </span>
                            <span className="text-[11px] text-[#a1a1a1]">
                              {item.unitLabel}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              onUpdateBomQty(
                                currentDesign.id,
                                item.id,
                                item.step
                              )
                            }
                            className="w-7 h-7 rounded-md bg-[#222424] hover:bg-[#2e3030] text-[#c8c6c5] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Subtotal & Delete */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-white tabular-nums">
                            {formatARS(itemSubtotal)}
                          </span>
                          <button
                            onClick={() =>
                              onDeleteBomItem(currentDesign.id, item.id)
                            }
                            title="Quitar insumo"
                            className="text-[#a1a1a1] hover:text-[#ffb4ab] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Cost Summary Row */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1a1] leading-tight">
                    COSTO DIRECTO
                    <br />
                    SUMADO
                  </div>
                </div>

                <div className="text-base font-extrabold font-display text-[#ffb59b] tabular-nums">
                  {formatARS(liveSumCostArs)}
                  <br />
                  <span className="text-xs">ARS</span>
                </div>

                <button
                  onClick={() => {
                    onSaveDesignCost(currentDesign.id, liveSumCostArs);
                    onShowToast(
                      `Costo de insumos actualizado a ${formatARS(liveSumCostArs)} ARS`
                    );
                  }}
                  className="bg-[#232525] hover:bg-[#e87a50] hover:text-[#280b00] border border-white/10 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Guardar
                  <br />
                  Costo
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* MODAL: AGREGAR INSUMO AL ESCANDALLO (SELECCIONANDO DEL MENÚ DESPLEGABLE DE INVENTARIO) */}
      {showAddBomModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                Agregar Insumo al Escandallo
              </h3>
              <button
                onClick={() => setShowAddBomModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBomItem} className="space-y-3.5">
              {/* Dropdown Menu loaded directly from Inventory */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#e3e2e2]">
                    Seleccionar de Inventario (Herrajes / Piezas)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBomModal(false);
                      onGoToInventario();
                    }}
                    className="text-[11px] font-bold text-[#ffb59b] hover:underline cursor-pointer"
                  >
                    + Editar Inventario
                  </button>
                </div>

                <select
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                  className="w-full bg-[#222424] border border-[#e87a50]/60 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <optgroup label="Piezas de Madera Ya Cortadas">
                    {inventoryItems
                      .filter((i) => i.category === 'pieza_cortada')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — {formatARS(item.unitPriceArs)}/{item.unitLabel}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Herrajes & Accesorios">
                    {inventoryItems
                      .filter((i) => i.category === 'herraje')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — {formatARS(item.unitPriceArs)}/{item.unitLabel}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Placas & Filos">
                    {inventoryItems
                      .filter((i) => i.category === 'material')
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — {formatARS(item.unitPriceArs)}/{item.unitLabel}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Pre-loaded read-only details from Inventory + Quantity Input ONLY */}
              {selectedInvItem && (
                <>
                  <div className="bg-[#1c1e1e] border border-white/10 rounded-xl p-3 space-y-1">
                    <div className="text-[10px] font-bold uppercase text-[#ffb59b]">
                      Datos Cargados del Inventario ({selectedInvItem.code})
                    </div>
                    <div className="text-xs font-bold text-white">
                      {selectedInvItem.name}
                    </div>
                    <div className="text-[11px] text-[#c8c6c5]">
                      {selectedInvItem.subtitle} • Stock disp: {selectedInvItem.stockQty}{' '}
                      {selectedInvItem.unitLabel}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                        Costo Unit. (ARS)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formatARS(selectedInvItem.unitPriceArs)}
                        className="w-full bg-[#1a1c1c] border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-[#c8c6c5] tabular-nums cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#ffb59b] mb-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        autoFocus
                        value={newBomQty}
                        onChange={(e) => setNewBomQty(e.target.value)}
                        className="w-full bg-[#222424] border-2 border-[#e87a50] rounded-xl px-3 py-2 text-xs font-extrabold text-white tabular-nums focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                        Unidad
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={selectedInvItem.unitLabel}
                        className="w-full bg-[#1a1c1c] border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-[#c8c6c5] cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1 text-xs">
                    <span className="text-[#c8c6c5]">Subtotal a sumar:</span>
                    <span className="font-extrabold text-[#ffb59b] tabular-nums">
                      {formatARS(
                        (parseFloat(newBomQty) || 0) * selectedInvItem.unitPriceArs
                      )}{' '}
                      ARS
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBomModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                >
                  Incorporar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: + Nuevo Diseño */}
      {showNewDesignModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-4 border border-white/15">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-white">
                Nuevo Diseño de Catálogo J&amp;L
              </h3>
              <button
                onClick={() => setShowNewDesignModal(false)}
                className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDesign} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                  Nombre del Mueble
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mesa Ratona Nórdica Elevable"
                  value={newDesignTitle}
                  onChange={(e) => setNewDesignTitle(e.target.value)}
                  className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    Código de Serie
                  </label>
                  <input
                    type="text"
                    value={newDesignCode}
                    onChange={(e) => setNewDesignCode(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c5] mb-1">
                    PVP Sugerido (ARS)
                  </label>
                  <input
                    type="number"
                    value={newDesignPvp}
                    onChange={(e) => setNewDesignPvp(e.target.value)}
                    className="w-full bg-[#222424] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewDesignModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer"
                >
                  Crear Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
