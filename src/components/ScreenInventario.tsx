import React, { useState } from 'react';
import {
  Package,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  Minus,
  Plus,
  LayoutGrid,
  Ruler,
  ArrowLeftRight,
  CircleDot,
  Hammer,
  BookOpen,
  X,
} from 'lucide-react';
import {
  InventoryItem,
  InventoryCategory,
  CutPiece,
  PredefinedCut,
} from '../types/atelier';
import { formatARS } from '../data/initialData';

interface ScreenInventarioProps {
  items: InventoryItem[];
  onAddItem: (item: Omit<InventoryItem, 'id' | 'code'>) => void;
  onUpdateItem: (id: string, updated: Partial<InventoryItem>) => void;
  onDeleteItem: (id: string) => void;
  cutPieces?: CutPiece[];
  predefinedCuts?: PredefinedCut[];
  onGoToCatalogo: () => void;
  onShowToast: (msg: string) => void;
}

export const ScreenInventario: React.FC<ScreenInventarioProps> = ({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  cutPieces = [],
  predefinedCuts = [],
  onGoToCatalogo,
  onShowToast,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'todos' | InventoryCategory>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state for Add / Edit Inventory Item
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemSub, setItemSub] = useState('');
  const [itemCategory, setItemCategory] = useState<InventoryCategory>('herraje');
  const [itemPrice, setItemPrice] = useState('1800');
  const [itemUnit, setItemUnit] = useState('un');
  const [itemStock, setItemStock] = useState('10');

  const filteredItems = items.filter((it) => {
    const matchesCategory =
      categoryFilter === 'todos' || it.category === categoryFilter;
    const matchesSearch =
      it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const countHerrajes = items.filter((i) => i.category === 'herraje').length;
  const countPiezas = items.filter((i) => i.category === 'pieza_cortada').length;
  const countMateriales = items.filter((i) => i.category === 'material').length;

  const totalInventoryValueArs = items.reduce(
    (acc, it) => acc + it.unitPriceArs * it.stockQty,
    0
  );

  const openNewModal = (defaultCat: InventoryCategory = 'herraje') => {
    setEditingItemId(null);
    setItemCategory(defaultCat);
    setItemName('');
    setItemSub(
      defaultCat === 'pieza_cortada'
        ? '450 × 380 mm • Melamina 18mm ya cortada'
        : 'Herraje Taller J&L'
    );
    setItemPrice(defaultCat === 'pieza_cortada' ? '3500' : '1800');
    setItemUnit(defaultCat === 'pieza_cortada' ? 'pieza' : 'un');
    setItemStock('12');
    setShowItemModal(true);
  };

  const openEditModal = (it: InventoryItem) => {
    setEditingItemId(it.id);
    setItemName(it.name);
    setItemSub(it.subtitle);
    setItemCategory(it.category);
    setItemPrice(String(it.unitPriceArs));
    setItemUnit(it.unitLabel);
    setItemStock(String(it.stockQty));
    setShowItemModal(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Math.max(10, parseInt(itemPrice.replace(/\D/g, ''), 10) || 1000);
    const stock = Math.max(0, parseFloat(itemStock) || 0);
    const iconTypeMap: Record<InventoryCategory, InventoryItem['iconType']> = {
      herraje: 'screw',
      pieza_cortada: 'board',
      material: 'edge',
    };

    if (editingItemId) {
      onUpdateItem(editingItemId, {
        name: itemName.trim() || 'Objeto de Inventario',
        subtitle: itemSub.trim() || 'Stock Taller J&L',
        category: itemCategory,
        unitPriceArs: price,
        unitLabel: itemUnit.trim() || 'un',
        stockQty: stock,
      });
      onShowToast(`Inventario actualizado: ${itemName}`);
    } else {
      onAddItem({
        name: itemName.trim() || 'Nuevo Objeto de Taller',
        subtitle: itemSub.trim() || 'Disponible para Catálogo BOM',
        category: itemCategory,
        unitPriceArs: price,
        unitLabel: itemUnit.trim() || 'un',
        stockQty: stock,
        step: itemUnit === 'm²' ? 0.1 : 1,
        iconType: iconTypeMap[itemCategory],
      });
      onShowToast(`Objeto agregado al Inventario y disponible en Catálogo`);
    }
    setShowItemModal(false);
  };

  const renderIcon = (type: InventoryItem['iconType']) => {
    switch (type) {
      case 'board':
        return <LayoutGrid className="w-4 h-4 text-[#ffb59b]" />;
      case 'edge':
        return <Ruler className="w-4 h-4 text-[#ffb59b]" />;
      case 'slide':
        return <ArrowLeftRight className="w-4 h-4 text-[#ffb59b]" />;
      case 'leg':
        return <CircleDot className="w-4 h-4 text-[#ffb59b]" />;
      case 'screw':
      default:
        return <Hammer className="w-4 h-4 text-[#ffb59b]" />;
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#ffb59b]">
            <Package className="w-3.5 h-3.5" />
            <span>STOCK &amp; INSUMOS PARA MODELOS</span>
          </div>
          <button
            onClick={onGoToCatalogo}
            className="bg-[#1e2020] hover:bg-[#292a2a] border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5 text-[11px] font-bold text-[#ffb59b] cursor-pointer"
          >
            <BookOpen className="w-3 h-3" />
            <span>Ir a Catálogo</span>
          </button>
        </div>

        <h1 className="text-2xl font-bold font-display text-white tracking-tight">
          Inventario de Taller
        </h1>
        <p className="text-xs text-[#c8c6c5] leading-relaxed">
          Herrajes, piezas de madera ya cortadas e insumos listos para seleccionar en el escandallo del Catálogo.
        </p>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="atelier-card rounded-2xl p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5]">
              OBJETOS EN INVENTARIO
            </div>
            <div className="text-xl font-bold font-display text-white mt-1 tabular-nums">
              {items.length} ítems
            </div>
            <div className="text-[11px] text-[#ffb59b] mt-0.5">
              Sincronizados c/ Catálogo
            </div>
          </div>

          <div className="atelier-card rounded-2xl p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#c8c6c5]">
              VALORIZACIÓN STOCK
            </div>
            <div className="text-xl font-bold font-display text-white mt-1 tabular-nums">
              {formatARS(totalInventoryValueArs)}
            </div>
            <div className="text-[11px] text-[#c8c6c5] mt-0.5">
              Herrajes + Piezas Cortadas
            </div>
          </div>
        </div>

        {/* Action Buttons to Add Inventory Item */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={() => openNewModal('herraje')}
            className="h-11 rounded-xl bg-[#e87a50] hover:bg-[#f0855c] text-[#280b00] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Agregar Herraje</span>
          </button>

          <button
            onClick={() => openNewModal('pieza_cortada')}
            className="h-11 rounded-xl bg-[#271e1a] hover:bg-[#332620] border border-[#e87a50]/50 text-[#ffb59b] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Pieza Cortada</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filters */}
      <div className="space-y-2.5">
        <div className="bg-[#181a1a] border border-white/10 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[#a1a1a1] shrink-0" />
          <input
            type="text"
            placeholder="Buscar herraje, pieza de madera cortada o código..."
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

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setCategoryFilter('todos')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${
              categoryFilter === 'todos'
                ? 'bg-[#e87a50] text-[#280b00]'
                : 'bg-[#1e2020] text-[#c8c6c5]'
            }`}
          >
            Todos ({items.length})
          </button>
          <button
            onClick={() => setCategoryFilter('pieza_cortada')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${
              categoryFilter === 'pieza_cortada'
                ? 'bg-[#e87a50] text-[#280b00]'
                : 'bg-[#1e2020] text-[#c8c6c5]'
            }`}
          >
            Piezas Cortadas ({countPiezas})
          </button>
          <button
            onClick={() => setCategoryFilter('herraje')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${
              categoryFilter === 'herraje'
                ? 'bg-[#e87a50] text-[#280b00]'
                : 'bg-[#1e2020] text-[#c8c6c5]'
            }`}
          >
            Herrajes ({countHerrajes})
          </button>
          <button
            onClick={() => setCategoryFilter('material')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${
              categoryFilter === 'material'
                ? 'bg-[#e87a50] text-[#280b00]'
                : 'bg-[#1e2020] text-[#c8c6c5]'
            }`}
          >
            Placas &amp; Filos ({countMateriales})
          </button>
        </div>
      </div>

      {/* Inventory Items List */}
      <div className="space-y-3">
        {filteredItems.map((it) => {
          const catBadge =
            it.category === 'pieza_cortada'
              ? 'PIEZA MADERA CORTADA'
              : it.category === 'herraje'
              ? 'HERRAJE'
              : 'INSUMO / MATERIAL';

          return (
            <div
              key={it.id}
              className="atelier-card rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#252727] flex items-center justify-center shrink-0">
                    {renderIcon(it.iconType)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[#ffb59b] bg-[#362119] px-2 py-0.5 rounded uppercase">
                        {catBadge}
                      </span>
                      <span className="text-[10px] font-bold text-[#a1a1a1] tabular-nums">
                        {it.code}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1 leading-snug">
                      {it.name}
                    </h3>
                    <p className="text-xs text-[#c8c6c5] mt-0.5">
                      {it.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(it)}
                    title="Editar objeto del inventario"
                    className="p-1.5 rounded-lg bg-[#252727] text-[#e3e2e2] hover:bg-[#e87a50] hover:text-[#121414] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(it.id)}
                    title="Eliminar objeto del inventario"
                    className="p-1.5 rounded-lg bg-[#252727] text-[#c8c6c5] hover:text-[#ffb4ab] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Price & Stock Bar */}
              <div className="bg-[#202222] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#a1a1a1]">
                    COSTO UNITARIO
                  </div>
                  <div className="text-sm font-bold text-[#ffb59b] tabular-nums">
                    {formatARS(it.unitPriceArs)}{' '}
                    <span className="text-xs font-medium text-[#c8c6c5]">
                      / {it.unitLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#c8c6c5]">
                    Stock:
                  </span>
                  <div className="flex items-center gap-2 bg-[#161818] border border-white/10 rounded-full px-2 py-0.5">
                    <button
                      onClick={() =>
                        onUpdateItem(it.id, {
                          stockQty: Math.max(0, it.stockQty - 1),
                        })
                      }
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-white tabular-nums min-w-[24px] text-center">
                      {it.stockQty} {it.unitLabel}
                    </span>
                    <button
                      onClick={() =>
                        onUpdateItem(it.id, { stockQty: it.stockQty + 1 })
                      }
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: AGREGAR / EDITAR OBJETO DE INVENTARIO */}
      {showItemModal && (() => {
        const existingPieceMatch = items.find(
          (it) =>
            it.name.trim().toLowerCase() === itemName.trim().toLowerCase() &&
            it.id !== editingItemId
        );
        const currentExistingStock = existingPieceMatch
          ? existingPieceMatch.stockQty
          : editingItemId
          ? items.find((i) => i.id === editingItemId)?.stockQty || 0
          : 0;
        const addedQty = Math.max(0, parseFloat(itemStock) || 0);
        const cumulativeTotal = editingItemId
          ? addedQty
          : currentExistingStock + addedQty;

        // Build unified options for Pieza Madera dropdown
        const woodSelectOptions: {
          key: string;
          name: string;
          spec: string;
          price: number;
          group: string;
        }[] = [];

        cutPieces.forEach((p) => {
          woodSelectOptions.push({
            key: `cut::${p.id}`,
            name: p.name,
            spec: `${p.widthMm} × ${p.heightMm} mm • Melamina 18mm`,
            price: p.unitPriceArs || 3500,
            group: 'Cortes Cargados en Guillotina 2D',
          });
        });

        predefinedCuts.forEach((p) => {
          woodSelectOptions.push({
            key: `pre::${p.id}`,
            name: p.name,
            spec: `${p.widthMm} × ${p.heightMm} mm • Melamina 18mm`,
            price: 3500,
            group: 'Plantillas de Cortes Predefinidos',
          });
        });

        items
          .filter((i) => i.category === 'pieza_cortada')
          .forEach((i) => {
            if (
              !woodSelectOptions.some(
                (o) => o.name.trim().toLowerCase() === i.name.trim().toLowerCase()
              )
            ) {
              woodSelectOptions.push({
                key: `inv::${i.id}`,
                name: i.name,
                spec: i.subtitle,
                price: i.unitPriceArs || 3500,
                group: 'Piezas de Madera en Stock',
              });
            }
          });

        const matchedDropdownOption = woodSelectOptions.find(
          (o) => o.name.trim().toLowerCase() === itemName.trim().toLowerCase()
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="atelier-card rounded-2xl max-w-sm w-full p-5 space-y-3.5 border border-white/15 my-auto shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-display text-white">
                  {editingItemId
                    ? 'Editar Objeto de Inventario'
                    : 'Nuevo Objeto en Inventario'}
                </h3>
                <button
                  onClick={() => setShowItemModal(false)}
                  className="p-1 text-[#a1a1a1] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#e3e2e2] mb-1">
                    Categoría del Objeto
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: 'herraje' as const, label: 'Herraje' },
                      { key: 'pieza_cortada' as const, label: 'Pieza Madera' },
                      { key: 'material' as const, label: 'Insumo/Placa' },
                    ].map((c) => (
                      <button
                        type="button"
                        key={c.key}
                        onClick={() => {
                          setItemCategory(c.key);
                          if (c.key === 'pieza_cortada') {
                            setItemUnit('pieza');
                            // Auto-select first cut if name is empty
                            if (!itemName && woodSelectOptions[0]) {
                              setItemName(woodSelectOptions[0].name);
                              setItemSub(woodSelectOptions[0].spec);
                              setItemPrice(String(woodSelectOptions[0].price));
                            }
                          }
                        }}
                        className={`py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                          itemCategory === c.key
                            ? 'bg-[#e87a50] text-[#121414] border-[#e87a50]'
                            : 'bg-[#222424] text-[#c8c6c5] border-white/10'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nombre del Herraje / Pieza Cortada: Dropdown for Pieza Madera + Custom option */}
                <div>
                  <label className="block text-xs font-semibold text-[#ffb59b] mb-1">
                    Nombre del Herraje / Pieza Cortada
                  </label>

                  {itemCategory === 'pieza_cortada' ? (
                    <div className="space-y-2">
                      <select
                        value={
                          matchedDropdownOption
                            ? matchedDropdownOption.key
                            : itemName
                            ? '__custom__'
                            : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__custom__') {
                            setItemName('');
                            setItemSub('400 × 335 mm • Melamina 18mm');
                            return;
                          }
                          const chosen = woodSelectOptions.find(
                            (o) => o.key === val
                          );
                          if (chosen) {
                            setItemName(chosen.name);
                            setItemSub(chosen.spec);
                            setItemPrice(String(chosen.price));
                            setItemUnit('pieza');
                          }
                        }}
                        className="w-full bg-[#222424] border border-[#e87a50]/60 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:border-[#e87a50] focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled>
                          -- Elegir corte de Guillotina / Plantilla --
                        </option>
                        <optgroup label="Cortes Cargados en Guillotina 2D">
                          {woodSelectOptions
                            .filter(
                              (o) =>
                                o.group === 'Cortes Cargados en Guillotina 2D'
                            )
                            .map((o) => (
                              <option key={o.key} value={o.key}>
                                {o.name} ({o.spec.split('•')[0].trim()})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Plantillas de Cortes Predefinidos">
                          {woodSelectOptions
                            .filter(
                              (o) =>
                                o.group === 'Plantillas de Cortes Predefinidos'
                            )
                            .map((o) => (
                              <option key={o.key} value={o.key}>
                                {o.name} ({o.spec.split('•')[0].trim()})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Piezas de Madera en Stock">
                          {woodSelectOptions
                            .filter(
                              (o) => o.group === 'Piezas de Madera en Stock'
                            )
                            .map((o) => (
                              <option key={o.key} value={o.key}>
                                {o.name} ({o.spec.split('•')[0].trim()})
                              </option>
                            ))}
                        </optgroup>
                        <option value="__custom__">
                          ✏️ Escribir otro nombre de pieza nuevo...
                        </option>
                      </select>

                      {/* Always allow editing or typing a custom piece name */}
                      <input
                        type="text"
                        required
                        placeholder="Nombre exacto de la pieza (ej. Frentes, Piso y techo...)"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="w-full bg-[#1b1d1d] border border-white/15 rounded-xl px-3.5 py-2 text-xs font-semibold text-white"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Ej. Corredera Telescópica 400mm H45"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white"
                    />
                  )}
                </div>

                {/* Medidas / Especificación Técnica (100% Editable) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#e3e2e2]">
                      Medidas / Especificación Técnica
                    </label>
                    <span className="text-[10px] text-[#ffb59b] font-semibold">
                      100% Editable
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Ej. 400 × 335 mm • Melamina 18mm"
                    value={itemSub}
                    onChange={(e) => setItemSub(e.target.value)}
                    className="w-full bg-[#222424] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>

                {/* Stock Actual Box + Cantidad a Sumar */}
                <div className="p-3 rounded-xl bg-[#1b1d1d] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#c8c6c5] font-semibold">
                      Stock Actual en Existencia:
                    </span>
                    <span className="font-extrabold text-[#ffb59b] tabular-nums">
                      {currentExistingStock} {itemUnit || 'unidades'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#ffb59b] mb-1">
                        Costo Unit. (ARS)
                      </label>
                      <input
                        type="number"
                        required
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        className="w-full bg-[#222424] border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#e3e2e2] mb-1">
                        Unidad
                      </label>
                      <input
                        type="text"
                        value={itemUnit}
                        onChange={(e) => setItemUnit(e.target.value)}
                        className="w-full bg-[#222424] border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-300 mb-1">
                        {editingItemId ? 'Nuevo Stock' : '+ Cant. a Sumar'}
                      </label>
                      <input
                        type="number"
                        value={itemStock}
                        onChange={(e) => setItemStock(e.target.value)}
                        className="w-full bg-[#222424] border border-emerald-500/50 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-white tabular-nums"
                      />
                    </div>
                  </div>

                  {!editingItemId && (
                    <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-[#a1a1a1]">
                        Suma acumulativa ({currentExistingStock} + {addedQty}):
                      </span>
                      <span className="font-extrabold text-emerald-400 tabular-nums">
                        Total Final: {cumulativeTotal} {itemUnit || 'uds'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowItemModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#222424] text-xs font-semibold text-[#c8c6c5] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#e87a50] text-[#121414] text-xs font-bold cursor-pointer shadow-md"
                  >
                    {editingItemId
                      ? 'Guardar Cambios'
                      : `Sumar al Stock (${cumulativeTotal} total)`}
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
