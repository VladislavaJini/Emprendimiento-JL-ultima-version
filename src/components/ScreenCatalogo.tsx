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
} from 'lucide-react';
import {
  FurnitureDesign,
  InventoryItem,
  DrawerSpec,
  CutPiece,
  PredefinedCut,
} from '../types/atelier';
import {
  generateDefaultDrawers,
  normalizeDrawersConfig,
  validateDrawersFit,
  getDrawerBomItems,
} from '../utils/drawerEngine';
import { DrawerConfiguratorBar } from './DrawerConfiguratorBar';

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

  // Edit design modal state
  const [editingDesign, setEditingDesign] = useState<FurnitureDesign | null>(
    null
  );
  const [editTitle, setEditTitle] = useState('');
  const [editWidthCm, setEditWidthCm] = useState('45');
  const [editHeightCm, setEditHeightCm] = useState('55');
  const [editDepthCm, setEditDepthCm] = useState('38');
  const [editPriceArs, setEditPriceArs] = useState('85000');
  const [editDrawerCount, setEditDrawerCount] = useState<number>(1);
  const [editDrawersConfig, setEditDrawersConfig] = useState<DrawerSpec[]>([]);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState<string>('');
  const [geometricError, setGeometricError] = useState<string | null>(null);

  // New design modal state
  const [showNewDesignModal, setShowNewDesignModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWidthCm, setNewWidthCm] = useState('45');
  const [newHeightCm, setNewHeightCm] = useState('55');
  const [newDepthCm, setNewDepthCm] = useState('38');
  const [newPriceArs, setNewPriceArs] = useState('85000');
  const [newDrawerCount, setNewDrawerCount] = useState<number>(1);
  const [newDrawersConfig, setNewDrawersConfig] = useState<DrawerSpec[]>(() =>
    generateDefaultDrawers(1, 450, 550, 380)
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

  // Defensive readiness helper
  const getReadinessForDesign = (
    design: FurnitureDesign | null,
    drawerCountOverride?: number
  ) => {
    const safeW = Number(design?.widthMm) || 450;
    const safeH = Number(design?.heightMm) || 550;
    const safeD = Number(design?.depthMm) || 380;
    const titleLabel =
      design?.catalogTitle || design?.name || 'Mesa de Luz J&L';

    const drwCount =
      drawerCountOverride !== undefined
        ? drawerCountOverride
        : design?.drawerCount !== undefined
        ? Number(design.drawerCount)
        : 1;

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

    const missingWoodPieces: Omit<CutPiece, 'id' | 'numberLabel'>[] = [];
    let missingWoodCount = 0;

    woodChecks.forEach((wc) => {
      const match = inventoryItems.find(
        (it) =>
          it &&
          it.category === 'pieza_cortada' &&
          (it.name || '').toLowerCase().includes(wc.name.toLowerCase())
      );
      const stock = match ? Number(match.stockQty) || 0 : 0;
      if (stock < wc.needed) {
        const diff = wc.needed - stock;
        missingWoodCount += diff;
        missingWoodPieces.push({
          name: `${wc.name} (${titleLabel})`,
          subtitle: `Pieza faltante de Escandallo BOM • Melamina 18mm`,
          widthMm: wc.name === 'Tapa' ? safeW : safeD,
          heightMm: wc.name === 'Lateral' ? safeH : 180,
          quantity: diff,
          unitPriceArs: 4800,
          edgesLabel: 'Cantos 2L Frontal',
          edgesType: '2L',
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

  // Safe defensive opener for Edit Modal (fixes any black screen crash on old items)
  const handleOpenEdit = (design: FurnitureDesign) => {
    if (!design) return;
    const safeW = Number(design?.widthMm) || 450;
    const safeH = Number(design?.heightMm) || 550;
    const safeD = Number(design?.depthMm) || 380;
    const drwCount =
      design?.drawerCount !== undefined
        ? Math.max(0, Math.min(6, Number(design.drawerCount) || 0))
        : 1;

    setEditingDesign(design);
    setEditTitle(design?.catalogTitle || design?.name || 'Mesa Blanca Común');
    setEditWidthCm(String(Math.max(10, Math.round(safeW / 10))));
    setEditHeightCm(String(Math.max(10, Math.round(safeH / 10))));
    setEditDepthCm(String(Math.max(10, Math.round(safeD / 10))));
    setEditPriceArs(String(Number(design?.suggestedPvpArs) || 85000));
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
    const wMm = Math.max(150, (parseInt(editWidthCm, 10) || 45) * 10);
    const hMm = Math.max(150, (parseInt(editHeightCm, 10) || 55) * 10);
    const dMm = Math.max(150, (parseInt(editDepthCm, 10) || 38) * 10);
    const pvpArs = Math.max(5000, parseInt(editPriceArs, 10) || 85000);

    const fitCheck = validateDrawersFit(editDrawersConfig, hMm);
    if (!fitCheck.valid) {
      setGeometricError(
        fitCheck.errorMsg ||
          'La suma de alturas de cajón excede la altura útil de la mesa.'
      );
      return;
    }

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
        bomItems: getDrawerBomItems(editDrawersConfig),
        cutPiecesCount: 6 + editDrawerCount * 4,
        thumbnailUrl: editThumbnailUrl || undefined,
      });
    }
    setEditingDesign(null);
    onShowToast(
      `Diseño actualizado (${editDrawerCount} cajones): ${editWidthCm}×${editHeightCm}×${editDepthCm} cm`
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
    const wMm = Math.max(150, (parseInt(newWidthCm, 10) || 45) * 10);
    const hMm = Math.max(150, (parseInt(newHeightCm, 10) || 55) * 10);
    const dMm = Math.max(150, (parseInt(newDepthCm, 10) || 38) * 10);
    const pvpArs = Math.max(5000, parseInt(newPriceArs, 10) || 85000);
    const codeNum = 4560 + safeDesigns.length;

    const fitCheck = validateDrawersFit(newDrawersConfig, hMm);
    if (!fitCheck.valid) {
      setNewGeometricError(
        fitCheck.errorMsg ||
          'La suma de alturas de cajón excede la altura útil de la mesa.'
      );
      return;
    }

    onAddDesign({
      code: `MN-${codeNum}`,
      name: newTitle.trim() || 'Mesita Nórdica Nueva',
      shortTitle: (newTitle.trim() || 'MESITA NÓRDICA').toUpperCase(),
      catalogTitle: newTitle.trim() || 'Mesita Nórdica Nueva',
      description: 'Mesa de luz con cajón ensamblado y corredera telescópica.',
      widthMm: wMm,
      heightMm: hMm,
      depthMm: dMm,
      materialSummary: 'Melamina Carvalho Mezzo 18mm',
      cutPiecesCount: 6 + newDrawerCount * 4,
      suggestedPvpArs: pvpArs,
      baseCostArs: Math.round(pvpArs * 0.45),
      activeInWorkshop: true,
      bodyTexture: 'Blanco Puro',
      frontTexture: 'Carvalho',
      drawerCount: newDrawerCount,
      drawersConfig: newDrawersConfig,
      bomItems: getDrawerBomItems(newDrawersConfig),
      thumbnailUrl: newThumbnailUrl || undefined,
    });

    setNewTitle('');
    setNewThumbnailUrl('');
    setShowNewDesignModal(false);
    onShowToast(`Nuevo diseño creado con ${newDrawerCount} cajones`);
  };

  return (
    <div className="space-y-4">
      {/* Top Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setNewTitle('');
            setNewWidthCm('45');
            setNewHeightCm('55');
            setNewDepthCm('38');
            setNewPriceArs('85000');
            setNewDrawerCount(1);
            setNewDrawersConfig(generateDefaultDrawers(1, 450, 550, 380));
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
          placeholder="Buscar mueble por nombre, serie o cota"
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
        <h2 className="text-base font-bold font-display text-white">Diseños</h2>
        <span className="bg-[#222424] border border-white/5 text-[#a1a1a1] text-[11px] font-medium px-2.5 py-0.5 rounded-md tabular-nums">
          {filteredDesigns.length} items visible
        </span>
      </div>

      {/* 2-Column Catalog Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredDesigns.map((design, idx) => {
          const safeW = Number(design?.widthMm) || 450;
          const safeH = Number(design?.heightMm) || 550;
          const safeD = Number(design?.depthMm) || 380;
          const widthCm = Math.round(safeW / 10);
          const heightCm = Math.round(safeH / 10);
          const depthCm = Math.round(safeD / 10);
          const drwCount =
            design?.drawerCount !== undefined ? Number(design.drawerCount) : 1;

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

                {/* Direct Thumbnail Image Upload Button (top-left of card thumbnail) */}
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
                  {drwCount} {drwCount === 1 ? 'caj.' : 'caj.'}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xs font-bold text-white leading-snug truncate mt-2">
                {design?.catalogTitle || design?.name || 'Mesa de Luz'}
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
                  type="button"
                  onClick={() => handleOpenEdit(design)}
                  title="Editar medidas y cajones"
                  className="bg-[#242626] hover:bg-[#2c2e2e] border border-white/10 text-white text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer tabular-nums"
                >
                  <span>{depthCm} cm</span>
                  <Pencil className="w-2.5 h-2.5 text-[#a1a1a1]" />
                </button>
              </div>

              {/* Action Buttons: [Editar] [Eliminar] */}
              <div className="grid grid-cols-2 gap-2 mt-2.5">
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

      {/* Edit Design Modal with Defensive Guards & Drawer Bar (0 al 6) */}
      {editingDesign &&
        (() => {
          const wMm = Math.max(150, (parseInt(editWidthCm, 10) || 45) * 10);
          const hMm = Math.max(150, (parseInt(editHeightCm, 10) || 55) * 10);
          const dMm = Math.max(150, (parseInt(editDepthCm, 10) || 38) * 10);
          const readiness = getReadinessForDesign(
            editingDesign,
            editDrawerCount
          );

          return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3.5 overflow-y-auto">
              <div className="atelier-card rounded-2xl max-w-md w-full p-5 space-y-4 border border-white/15 my-auto max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-bold font-display text-white">
                      Editar Mueble &amp; Cajones (0 al 6)
                    </h3>
                    <p className="text-[11px] text-[#c8c6c5]">
                      Escandallo paramétrico vinculado con Inventario
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
                          const newW =
                            Math.max(15, parseInt(e.target.value, 10) || 45) *
                            10;
                          setEditDrawersConfig(
                            generateDefaultDrawers(
                              editDrawerCount,
                              newW,
                              hMm,
                              dMm
                            )
                          );
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
                          const newH =
                            Math.max(15, parseInt(e.target.value, 10) || 55) *
                            10;
                          setEditDrawersConfig(
                            generateDefaultDrawers(
                              editDrawerCount,
                              wMm,
                              newH,
                              dMm
                            )
                          );
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
                          const newD =
                            Math.max(15, parseInt(e.target.value, 10) || 38) *
                            10;
                          setEditDrawersConfig(
                            generateDefaultDrawers(
                              editDrawerCount,
                              wMm,
                              hMm,
                              newD
                            )
                          );
                        }}
                        className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Barra Numérica de Cajones (0 al 6) 100% Editable */}
                  <DrawerConfiguratorBar
                    drawerCount={editDrawerCount}
                    drawersConfig={editDrawersConfig}
                    cabinetWidthMm={wMm}
                    cabinetHeightMm={hMm}
                    cabinetDepthMm={dMm}
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

      {/* New Design Modal with Numeric Drawer Bar (0 al 6) */}
      {showNewDesignModal &&
        (() => {
          const wMm = Math.max(150, (parseInt(newWidthCm, 10) || 45) * 10);
          const hMm = Math.max(150, (parseInt(newHeightCm, 10) || 55) * 10);
          const dMm = Math.max(150, (parseInt(newDepthCm, 10) || 38) * 10);

          return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3.5 overflow-y-auto">
              <div className="atelier-card rounded-2xl max-w-md w-full p-5 space-y-4 border border-white/15 my-auto max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h3 className="text-base font-bold font-display text-white">
                    Nuevo Diseño en Catálogo
                  </h3>
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
                          const newW =
                            Math.max(15, parseInt(e.target.value, 10) || 45) *
                            10;
                          setNewDrawersConfig(
                            generateDefaultDrawers(
                              newDrawerCount,
                              newW,
                              hMm,
                              dMm
                            )
                          );
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
                          const newH =
                            Math.max(15, parseInt(e.target.value, 10) || 55) *
                            10;
                          setNewDrawersConfig(
                            generateDefaultDrawers(
                              newDrawerCount,
                              wMm,
                              newH,
                              dMm
                            )
                          );
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
                          const newD =
                            Math.max(15, parseInt(e.target.value, 10) || 38) *
                            10;
                          setNewDrawersConfig(
                            generateDefaultDrawers(
                              newDrawerCount,
                              wMm,
                              hMm,
                              newD
                            )
                          );
                        }}
                        className="w-full bg-[#222424] border border-[#e87a50] rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Barra Numérica de Cajones (0 al 6) 100% Editable */}
                  <DrawerConfiguratorBar
                    drawerCount={newDrawerCount}
                    drawersConfig={newDrawersConfig}
                    cabinetWidthMm={wMm}
                    cabinetHeightMm={hMm}
                    cabinetDepthMm={dMm}
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
