/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Menu,
  CloudCheck,
  Bell,
  User,
  Scissors,
  Layers,
  Disc,
  Package,
  Wallet,
  Truck,
  Box,
  BookOpen,
  Trophy,
  Download,
  Wifi,
  BatteryCharging,
  Signal,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  ScreenId,
  MelaminaBoard,
  CutPiece,
  EdgeBandingRoll,
  EdgeBandingPiece,
  InventoryItem,
  WorkshopOrder,
  OrderStage,
  CashMovement,
  FurnitureDesign,
  BomMaterialItem,
} from './types/atelier';
import {
  INITIAL_BOARDS,
  INITIAL_CUT_PIECES,
  INITIAL_FONDO_BOARDS,
  INITIAL_FONDO_PIECES,
  INITIAL_EDGE_ROLLS,
  INITIAL_EDGE_PIECES,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_ORDERS,
  INITIAL_CASH_MOVEMENTS,
  INITIAL_DESIGNS,
} from './data/initialData';
import { ScreenGuillotina2D } from './components/ScreenGuillotina2D';
import { ScreenCortesFondo } from './components/ScreenCortesFondo';
import { ScreenCalculadorFilo } from './components/ScreenCalculadorFilo';
import { ScreenInventario } from './components/ScreenInventario';
import { ScreenOperaciones } from './components/ScreenOperaciones';
import { ScreenLogistica } from './components/ScreenLogistica';
import { ScreenAtelierCAD } from './components/ScreenAtelierCAD';
import { ScreenCatalogo } from './components/ScreenCatalogo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const SCREEN_TABS: {
  id: ScreenId;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'guillotina', label: 'Guillotina 2D (Melamina)', icon: Scissors },
  { id: 'fondo', label: 'Cortes Fondo', icon: Layers },
  { id: 'filo', label: 'Calculador de Filo', icon: Disc },
  { id: 'inventario', label: 'Inventario de Taller', icon: Package },
  { id: 'catalogo', label: 'Catálogo & BOM', icon: BookOpen },
  { id: 'cad', label: 'Atelier CAD 3D', icon: Box },
  { id: 'operaciones', label: 'Gestión & Finanzas', icon: Wallet },
  { id: 'logistica', label: 'Logística & Fletes', icon: Truck },
  { id: 'gamificacion', label: 'Gamificación Atelier', icon: Trophy },
];

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('guillotina');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // State: Guillotina 2D (Melamina 18mm)
  const [boards, setBoards] = useState<MelaminaBoard[]>(INITIAL_BOARDS);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('carvalho-mezzo');
  const [cutPieces, setCutPieces] = useState<CutPiece[]>(INITIAL_CUT_PIECES);

  // State: Cortes Fondo (Placas de Fondo 3mm / 5.5mm)
  const [fondoBoards, setFondoBoards] = useState<MelaminaBoard[]>(INITIAL_FONDO_BOARDS);
  const [selectedFondoBoardId, setSelectedFondoBoardId] = useState<string>('fondo-blanco-plus');
  const [fondoCutPieces, setFondoCutPieces] = useState<CutPiece[]>(INITIAL_FONDO_PIECES);

  // State: Calculador de Filo (Tapacantos)
  const [edgeRolls, setEdgeRolls] = useState<EdgeBandingRoll[]>(INITIAL_EDGE_ROLLS);
  const [selectedEdgeRollId, setSelectedEdgeRollId] = useState<string>('filo-carvalho-10m');
  const [edgePieces, setEdgePieces] = useState<EdgeBandingPiece[]>(INITIAL_EDGE_PIECES);

  // State: Inventario de Taller (Herrajes, Piezas Cortadas, Materiales)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(
    INITIAL_INVENTORY_ITEMS
  );

  // State: Operaciones & Pedidos
  const [orders, setOrders] = useState<WorkshopOrder[]>(INITIAL_ORDERS);
  const [selectedFreightOrderId, setSelectedFreightOrderId] = useState<string>('ped-1084');
  const [cashEfectivo, setCashEfectivo] = useState<number>(182500);
  const [cashBancos, setCashBancos] = useState<number>(501700);
  const [movements, setMovements] = useState<CashMovement[]>(INITIAL_CASH_MOVEMENTS);

  // State: Catálogo & CAD 3D
  const [designs, setDesigns] = useState<FurnitureDesign[]>(INITIAL_DESIGNS);
  const [activeDesignIndex, setActiveDesignIndex] = useState<number>(0);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3000);
  };

  const handleInstallAndroidApp = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        showToast('App instalada en pantalla de inicio de Android');
      }
    } else {
      showToast('En Android Chrome: toca el menú (⋮) → "Instalar aplicación"');
    }
    setDrawerOpen(false);
  };

  // Handlers for Guillotina 2D (Melamina)
  const handleUpdateBoardCost = (boardId: string, newCost: number) => {
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, costArs: newCost } : b))
    );
  };

  const handleUpdatePieceQty = (pieceId: string, delta: number) => {
    setCutPieces((prev) =>
      prev.map((p) =>
        p.id === pieceId ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p
      )
    );
  };

  const handleTogglePieceRotation = (pieceId: string) => {
    setCutPieces((prev) =>
      prev.map((p) =>
        p.id === pieceId
          ? {
              ...p,
              allowRotation: !p.allowRotation,
              mandatoryGrain: !p.mandatoryGrain,
            }
          : p
      )
    );
  };

  const handleAddCutPiece = (newPiece: Omit<CutPiece, 'id' | 'numberLabel'>) => {
    const currentTotal = cutPieces.reduce((acc, p) => acc + p.quantity, 0);
    const startNum = currentTotal + 1;
    const endNum = currentTotal + newPiece.quantity;
    const label =
      newPiece.quantity === 1 ? `${startNum}` : `${startNum}-${endNum}`;

    setCutPieces((prev) => [
      ...prev,
      {
        ...newPiece,
        id: `cut-${Date.now()}`,
        numberLabel: label,
      },
    ]);
  };

  const handleResetCleanOrder = () => {
    setCutPieces(INITIAL_CUT_PIECES);
    setSelectedBoardId('carvalho-mezzo');
    showToast('Orden reiniciada con placa Carvalho Mezzo 2750×1830mm limpia');
  };

  // Handlers for Cortes Fondo (Placas de Fondo)
  const handleUpdateFondoBoard = (
    boardId: string,
    updated: Partial<MelaminaBoard>
  ) => {
    setFondoBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, ...updated } : b))
    );
  };

  const handleAddFondoBoardColor = (newBoard: MelaminaBoard) => {
    setFondoBoards((prev) => [...prev, newBoard]);
  };

  const handleUpdateFondoPieceQty = (pieceId: string, delta: number) => {
    setFondoCutPieces((prev) =>
      prev.map((p) =>
        p.id === pieceId ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p
      )
    );
  };

  const handleUpdateFondoPieceDetails = (
    pieceId: string,
    updated: Partial<CutPiece>
  ) => {
    setFondoCutPieces((prev) =>
      prev.map((p) => (p.id === pieceId ? { ...p, ...updated } : p))
    );
  };

  const handleDeleteFondoPiece = (pieceId: string) => {
    if (fondoCutPieces.length <= 1) {
      showToast('Debe permanecer al menos 1 corte de fondo en la lista');
      return;
    }
    setFondoCutPieces((prev) => prev.filter((p) => p.id !== pieceId));
    showToast('Corte de fondo eliminado');
  };

  const handleToggleFondoPieceRotation = (pieceId: string) => {
    setFondoCutPieces((prev) =>
      prev.map((p) =>
        p.id === pieceId
          ? {
              ...p,
              allowRotation: !p.allowRotation,
              mandatoryGrain: !p.mandatoryGrain,
            }
          : p
      )
    );
  };

  const handleAddFondoCutPiece = (
    newPiece: Omit<CutPiece, 'id' | 'numberLabel'>
  ) => {
    const currentTotal = fondoCutPieces.reduce((acc, p) => acc + p.quantity, 0);
    const startNum = currentTotal + 1;
    const endNum = currentTotal + newPiece.quantity;
    const label =
      newPiece.quantity === 1 ? `${startNum}` : `${startNum}-${endNum}`;

    setFondoCutPieces((prev) => [
      ...prev,
      {
        ...newPiece,
        id: `fcut-${Date.now()}`,
        numberLabel: label,
      },
    ]);
  };

  const handleResetCleanFondoOrder = () => {
    setFondoCutPieces(INITIAL_FONDO_PIECES);
    setSelectedFondoBoardId('fondo-blanco-plus');
    showToast('Orden de Fondo Blanco Plus 3mm reiniciada');
  };

  // Handlers for Calculador de Filo
  const handleAddEdgeRoll = (roll: EdgeBandingRoll) => {
    setEdgeRolls((prev) => [...prev, roll]);
  };

  const handleUpdateEdgeRoll = (
    id: string,
    updated: Partial<EdgeBandingRoll>
  ) => {
    setEdgeRolls((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updated } : r))
    );
  };

  const handleDeleteEdgeRoll = (id: string) => {
    if (edgeRolls.length <= 1) {
      showToast('Debe permanecer al menos 1 rollo de filo cargado');
      return;
    }
    setEdgeRolls((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (selectedEdgeRollId === id && next[0]) {
        setSelectedEdgeRollId(next[0].id);
      }
      return next;
    });
    showToast('Color / rollo de filo eliminado');
  };

  const handleAddEdgePiece = (piece: EdgeBandingPiece) => {
    setEdgePieces((prev) => [...prev, piece]);
  };

  const handleUpdateEdgePiece = (
    id: string,
    updated: Partial<EdgeBandingPiece>
  ) => {
    setEdgePieces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
    );
  };

  const handleDeleteEdgePiece = (id: string) => {
    if (edgePieces.length <= 1) {
      showToast('Debe permanecer al menos 1 pieza en el cálculo');
      return;
    }
    setEdgePieces((prev) => prev.filter((p) => p.id !== id));
    showToast('Pieza removida del cálculo de filo');
  };

  // Handlers for Inventario de Taller
  const handleAddInventoryItem = (
    newItem: Omit<InventoryItem, 'id' | 'code'>
  ) => {
    const prefix =
      newItem.category === 'herraje'
        ? 'HER'
        : newItem.category === 'pieza_cortada'
        ? 'MAD'
        : 'MAT';
    const nextCode = `${prefix}-${String(inventoryItems.length + 1).padStart(
      2,
      '0'
    )}`;
    setInventoryItems((prev) => [
      {
        ...newItem,
        id: `inv-${Date.now()}`,
        code: nextCode,
      },
      ...prev,
    ]);
  };

  const handleUpdateInventoryItem = (
    id: string,
    updated: Partial<InventoryItem>
  ) => {
    setInventoryItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...updated } : it))
    );
  };

  const handleDeleteInventoryItem = (id: string) => {
    if (inventoryItems.length <= 1) {
      showToast('El inventario debe conservar al menos 1 ítem');
      return;
    }
    setInventoryItems((prev) => prev.filter((it) => it.id !== id));
    showToast('Objeto eliminado del Inventario de Taller');
  };

  // Handlers for Orders & Cash
  const handleUpdateOrderStage = (orderId: string, stage: OrderStage) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, stage } : o))
    );
  };

  const handleAddOrder = (order: Omit<WorkshopOrder, 'id'>) => {
    const newId = `ped-${Date.now()}`;
    setOrders((prev) => [{ ...order, id: newId }, ...prev]);
  };

  const handleDeleteOrder = (orderId: string) => {
    if (orders.length <= 1) {
      showToast('Debe permanecer al menos 1 orden activa en cola');
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    showToast('Orden eliminada de la cola de producción');
  };

  const handleAddCashMovement = (
    description: string,
    amount: number,
    type: 'ingreso' | 'egreso',
    channel: 'efectivo' | 'bancos'
  ) => {
    const signed = type === 'ingreso' ? amount : -amount;
    if (channel === 'efectivo') {
      setCashEfectivo((prev) => Math.max(0, prev + signed));
    } else {
      setCashBancos((prev) => Math.max(0, prev + signed));
    }
    setMovements((prev) => [
      {
        id: `mov-${Date.now()}`,
        description,
        amountArs: amount,
        type,
        channel,
        timestamp: 'Ahora',
      },
      ...prev,
    ]);
  };

  const handleResetCash = () => {
    setCashEfectivo(182500);
    setCashBancos(501700);
    showToast('Arqueo de caja restaurado a valores iniciales de turno ($684.200 ARS)');
  };

  // Handlers for Catalog & CAD
  const handleUpdateDesignTextures = (
    body: 'Blanco Puro' | 'Negro Grafito',
    front: 'Carvalho' | 'Báltico' | 'Gaudí'
  ) => {
    const currentId = designs[activeDesignIndex % designs.length]?.id || 'mn-4555';
    setDesigns((prev) =>
      prev.map((d) =>
        d.id === currentId ? { ...d, bodyTexture: body, frontTexture: front } : d
      )
    );
  };

  const handleUpdateBomQty = (designId: string, bomId: string, delta: number) => {
    setDesigns((prev) =>
      prev.map((d) => {
        if (d.id !== designId) return d;
        return {
          ...d,
          bomItems: d.bomItems.map((item) =>
            item.id === bomId
              ? {
                  ...item,
                  quantity: Math.max(
                    item.step,
                    Number((item.quantity + delta).toFixed(2))
                  ),
                }
              : item
          ),
        };
      })
    );
  };

  const handleDeleteBomItem = (designId: string, bomId: string) => {
    setDesigns((prev) =>
      prev.map((d) => {
        if (d.id !== designId) return d;
        if (d.bomItems.length <= 1) return d;
        return {
          ...d,
          bomItems: d.bomItems.filter((i) => i.id !== bomId),
        };
      })
    );
    showToast('Insumo removido del escandallo');
  };

  const handleAddBomItem = (
    designId: string,
    newItem: Omit<BomMaterialItem, 'id' | 'code'>
  ) => {
    setDesigns((prev) =>
      prev.map((d) => {
        if (d.id !== designId) return d;
        const nextNum = String(d.bomItems.length + 1).padStart(2, '0');
        return {
          ...d,
          bomItems: [
            ...d.bomItems,
            {
              ...newItem,
              id: `bom-${Date.now()}`,
              code: nextNum,
            },
          ],
        };
      })
    );
  };

  const handleSaveDesignCost = (designId: string, newCostArs: number) => {
    setDesigns((prev) =>
      prev.map((d) =>
        d.id === designId ? { ...d, baseCostArs: newCostArs } : d
      )
    );
  };

  const handleAddDesign = (newDesign: Omit<FurnitureDesign, 'id'>) => {
    setDesigns((prev) => {
      const updated = [...prev, { ...newDesign, id: `des-${Date.now()}` }];
      setActiveDesignIndex(updated.length - 1);
      return updated;
    });
  };

  const activeFreightOrder =
    orders.find((o) => o.id === selectedFreightOrderId) || orders[0];
  const activeDesign =
    designs[activeDesignIndex % Math.max(1, designs.length)] || designs[0];

  return (
    <div className="min-h-screen w-full bg-[#090a0a] flex justify-center">
      {/* ANDROID MOBILE DEVICE CONTAINER */}
      <div className="w-full max-w-[420px] min-h-screen bg-[#121414] text-[#e3e2e2] flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,0.85)] sm:border-x sm:border-white/10">
        {/* ANDROID SYSTEM STATUS BAR */}
        <div className="sticky top-0 z-40 bg-[#121414] px-4 pt-1.5 pb-1 flex items-center justify-between text-[11px] font-semibold text-[#c8c6c5] select-none">
          <div className="flex items-center gap-1.5 tabular-nums">
            <span>15:04</span>
            <span className="text-[9px] text-[#ffb59b] font-bold">J&amp;L</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Signal className="w-3 h-3" />
            <span className="text-[10px] font-bold">5G</span>
            <Wifi className="w-3 h-3" />
            <div className="flex items-center gap-0.5 tabular-nums">
              <BatteryCharging className="w-3.5 h-3.5 text-[#ffb59b]" />
              <span className="text-[10px]">94%</span>
            </div>
          </div>
        </div>

        {/* APP HEADER BAR (Navigation strictly via Hamburger menu) */}
        <header className="sticky top-[24px] z-30 bg-[#121414]/95 backdrop-blur-md border-b border-white/5 px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Hamburger Button + Brand Lockup */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Abrir menú de navegación"
                className="w-10 h-10 rounded-xl bg-[#1a1c1c] hover:bg-[#252727] active:bg-[#292a2a] border border-white/10 flex items-center justify-center text-[#e3e2e2] transition-colors cursor-pointer shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <div className="text-[17px] font-bold font-display text-white leading-tight truncate">
                  Muebles J&amp;L
                </div>
                <div className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-[#ffb59b] mt-0.5 leading-tight">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e87a50] shrink-0" />
                  <span className="truncate">
                    TALLER ACTIVO • VILLA LUZURIAGA
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Cloud Sync, Notifications & User Profile */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() =>
                  showToast('Sincronizado con Nube J&L • Backup en tiempo real activo')
                }
                title="Estado de Sincronización Cloud"
                className="w-9 h-9 rounded-xl active:bg-white/10 flex items-center justify-center text-[#c8c6c5] transition-colors cursor-pointer"
              >
                <CloudCheck className="w-5 h-5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen((n) => !n)}
                  title="Notificaciones de Taller"
                  className="w-9 h-9 rounded-xl active:bg-white/10 flex items-center justify-center text-[#c8c6c5] transition-colors cursor-pointer relative"
                >
                  <Bell className="w-5 h-5" />
                  <span className="w-2 h-2 rounded-full bg-[#e87a50] absolute top-2 right-2" />
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-68 atelier-card rounded-2xl p-3.5 border border-white/15 shadow-2xl z-50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        Avisos de Taller J&amp;L
                      </span>
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="text-[#a1a1a1] hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs bg-[#222424] p-2.5 rounded-xl space-y-1">
                      <div className="font-bold text-[#ffb59b]">
                        #PED-1084 Listo p/ Despacho
                      </div>
                      <div className="text-[#b7b5b4] text-[11px]">
                        3 bultos embalados para Estudio Arq. Rossi (Ramos Mejía).
                      </div>
                    </div>
                    <div className="text-xs bg-[#222424] p-2.5 rounded-xl space-y-1">
                      <div className="font-bold text-white">
                        Inventario Sincronizado
                      </div>
                      <div className="text-[#b7b5b4] text-[11px]">
                        {inventoryItems.length} herrajes y piezas cortadas listas p/ Catálogo.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setDrawerOpen(true)}
                title="Perfil Maestro Carpintero"
                className="w-9 h-9 rounded-xl bg-[#ffb59b] active:scale-95 text-[#380d00] flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                <User className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          </div>
        </header>

        {/* MAIN ANDROID SCROLLABLE CONTENT (No bottom nav bar) */}
        <main className="flex-1 w-full px-3.5 pt-3 pb-8">
          {activeScreen === 'guillotina' && (
            <ScreenGuillotina2D
              boards={boards}
              selectedBoardId={selectedBoardId}
              onSelectBoard={setSelectedBoardId}
              onUpdateBoardCost={handleUpdateBoardCost}
              cutPieces={cutPieces}
              onUpdatePieceQty={handleUpdatePieceQty}
              onTogglePieceRotation={handleTogglePieceRotation}
              onAddCutPiece={handleAddCutPiece}
              onResetCleanOrder={handleResetCleanOrder}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'fondo' && (
            <ScreenCortesFondo
              boards={fondoBoards}
              selectedBoardId={selectedFondoBoardId}
              onSelectBoard={setSelectedFondoBoardId}
              onUpdateBoard={handleUpdateFondoBoard}
              onAddBoardColor={handleAddFondoBoardColor}
              cutPieces={fondoCutPieces}
              onUpdatePieceQty={handleUpdateFondoPieceQty}
              onUpdatePieceDetails={handleUpdateFondoPieceDetails}
              onDeletePiece={handleDeleteFondoPiece}
              onTogglePieceRotation={handleToggleFondoPieceRotation}
              onAddCutPiece={handleAddFondoCutPiece}
              onResetCleanOrder={handleResetCleanFondoOrder}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'filo' && (
            <ScreenCalculadorFilo
              rolls={edgeRolls}
              selectedRollId={selectedEdgeRollId}
              onSelectRoll={setSelectedEdgeRollId}
              onAddRoll={handleAddEdgeRoll}
              onUpdateRoll={handleUpdateEdgeRoll}
              onDeleteRoll={handleDeleteEdgeRoll}
              pieces={edgePieces}
              onAddPiece={handleAddEdgePiece}
              onUpdatePiece={handleUpdateEdgePiece}
              onDeletePiece={handleDeleteEdgePiece}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'inventario' && (
            <ScreenInventario
              items={inventoryItems}
              onAddItem={handleAddInventoryItem}
              onUpdateItem={handleUpdateInventoryItem}
              onDeleteItem={handleDeleteInventoryItem}
              onGoToCatalogo={() => setActiveScreen('catalogo')}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'operaciones' && (
            <ScreenOperaciones
              showGamificacion={false}
              orders={orders}
              onUpdateOrderStage={handleUpdateOrderStage}
              onAddOrder={handleAddOrder}
              onDeleteOrder={handleDeleteOrder}
              onSelectOrderForFreight={(orderId) => {
                setSelectedFreightOrderId(orderId);
                setActiveScreen('logistica');
              }}
              cashEfectivo={cashEfectivo}
              cashBancos={cashBancos}
              movements={movements}
              onAddCashMovement={handleAddCashMovement}
              onResetCash={handleResetCash}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'gamificacion' && (
            <ScreenOperaciones
              showGamificacion={true}
              orders={orders}
              onUpdateOrderStage={handleUpdateOrderStage}
              onAddOrder={handleAddOrder}
              onDeleteOrder={handleDeleteOrder}
              onSelectOrderForFreight={(orderId) => {
                setSelectedFreightOrderId(orderId);
                setActiveScreen('logistica');
              }}
              cashEfectivo={cashEfectivo}
              cashBancos={cashBancos}
              movements={movements}
              onAddCashMovement={handleAddCashMovement}
              onResetCash={handleResetCash}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'logistica' && (
            <ScreenLogistica
              activeOrder={activeFreightOrder}
              orders={orders}
              onSelectOrder={setSelectedFreightOrderId}
              onUpdateOrderStage={handleUpdateOrderStage}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'cad' && (
            <ScreenAtelierCAD
              design={activeDesign}
              onUpdateDesignTextures={handleUpdateDesignTextures}
              onGoToCatalogo={() => setActiveScreen('catalogo')}
              onLaunchToProduction={() => {
                setActiveScreen('guillotina');
                showToast(
                  `${activeDesign.name} (${activeDesign.code}) enviado a Guillotina 2D`
                );
              }}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'catalogo' && (
            <ScreenCatalogo
              designs={designs}
              activeDesignIndex={activeDesignIndex}
              onSelectDesignIndex={setActiveDesignIndex}
              onUpdateBomQty={handleUpdateBomQty}
              onDeleteBomItem={handleDeleteBomItem}
              onAddBomItem={handleAddBomItem}
              onSaveDesignCost={handleSaveDesignCost}
              onAddDesign={handleAddDesign}
              inventoryItems={inventoryItems}
              onGoToInventario={() => setActiveScreen('inventario')}
              onOpenCadViewer={() => setActiveScreen('cad')}
              onShowToast={showToast}
            />
          )}
        </main>

        {/* HAMBURGER SLIDE-OUT DRAWER (Sole navigation menu) */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-center">
            <div className="w-full max-w-[420px] h-full bg-black/75 backdrop-blur-xs flex relative">
              <div className="w-76 max-w-[84%] bg-[#161818] border-r border-white/10 h-full p-4 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold font-display text-white">
                        Muebles J&amp;L
                      </div>
                      <div className="text-[11px] text-[#ffb59b] font-semibold">
                        Menú de Taller • Villa Luzuriaga
                      </div>
                    </div>
                    <button
                      onClick={() => setDrawerOpen(false)}
                      className="p-1.5 rounded-lg bg-[#222424] text-[#c8c6c5] hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1a1] px-2 pb-1">
                      Ventanas del Taller ({SCREEN_TABS.length})
                    </div>
                    {SCREEN_TABS.map((tab, i) => {
                      const Icon = tab.icon;
                      const active = activeScreen === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveScreen(tab.id);
                            setDrawerOpen(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#e87a50] text-[#280b00]'
                              : 'text-[#e3e2e2] hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                          </span>
                          <span className="text-[10px] opacity-70 tabular-nums">
                            0{i + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-2.5 mt-4">
                  <button
                    onClick={handleInstallAndroidApp}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#2c1d17] border border-[#e87a50]/50 text-xs font-bold text-[#ffb59b] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar en Celular Android</span>
                  </button>
                  <div className="text-[10px] text-center text-[#717171]">
                    Taller Central • Garibaldi y Triunvirato
                  </div>
                </div>
              </div>

              <div
                className="flex-1"
                onClick={() => setDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {/* TOAST FEEDBACK BANNER */}
        {toastMessage && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[380px] bg-[#241914] border border-[#e87a50] text-[#ffdbcf] px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#e87a50] shrink-0" />
            <span className="flex-1 leading-snug">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#ffb59b] hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
