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
  Home,
  ClipboardList,
  Moon,
  Sun,
  ZoomIn,
  Type,
  ChevronsRight,
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
  PredefinedCut,
} from './types/atelier';
import {
  INITIAL_BOARDS,
  INITIAL_CUT_PIECES,
  INITIAL_FONDO_BOARDS,
  INITIAL_FONDO_PIECES,
  INITIAL_PREDEFINED_CUTS,
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
import { ScreenCatalogo } from './components/ScreenCatalogo';
import { ScreenInicio } from './components/ScreenInicio';
import { ScreenPedidos } from './components/ScreenPedidos';
import { ScreenPresupuesto } from './components/ScreenPresupuesto';
import {
  saveDocToCloud,
  subscribeToWorkshopState,
} from './services/firebase';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const SCREEN_TABS: {
  id: ScreenId;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'presupuesto', label: 'Presupuesto', icon: Box },
  { id: 'guillotina', label: 'Guillotina 2D', icon: Scissors },
  { id: 'fondo', label: 'Cortes Fondo', icon: Layers },
  { id: 'filo', label: 'Calc. Filo', icon: Disc },
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'catalogo', label: 'Catálogo & BOM', icon: BookOpen },
  { id: 'logistica', label: 'Fletes & Ruta', icon: Truck },
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
  { id: 'operaciones', label: 'Finanzas', icon: Wallet },
  { id: 'gamificacion', label: 'Trofeos Taller', icon: Trophy },
];

const BOTTOM_NAV_ITEMS: {
  id: ScreenId;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'guillotina', label: 'Cortes', icon: Scissors },
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'catalogo', label: 'Catálogo', icon: BookOpen },
  { id: 'logistica', label: 'Flete', icon: Truck },
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
];

const AUTO_LOADED_FONTS: { name: string; stack: string; category: string }[] = [
  { name: 'Plus Jakarta Sans', stack: "'Plus Jakarta Sans', sans-serif", category: 'Moderna' },
  { name: 'Cormorant Garamond', stack: "'Cormorant Garamond', serif", category: 'Editorial' },
  { name: 'Playfair Display', stack: "'Playfair Display', serif", category: 'Clásica' },
  { name: 'Montserrat', stack: "'Montserrat', sans-serif", category: 'Geométrica' },
  { name: 'Poppins', stack: "'Poppins', sans-serif", category: 'Limpia' },
  { name: 'Lora', stack: "'Lora', serif", category: 'Artesanal' },
  { name: 'Outfit', stack: "'Outfit', sans-serif", category: 'Minimalista' },
  { name: 'Cinzel', stack: "'Cinzel', serif", category: 'Imperial' },
  { name: 'Merriweather', stack: "'Merriweather', serif", category: 'Lectura' },
  { name: 'Raleway', stack: "'Raleway', sans-serif", category: 'Elegante' },
  { name: 'Oswald', stack: "'Oswald', sans-serif", category: 'Industrial' },
  { name: 'Josefin Sans', stack: "'Josefin Sans', sans-serif", category: 'Vintage' },
  { name: 'Libre Baskerville', stack: "'Libre Baskerville', serif", category: 'Tradicional' },
  { name: 'Quicksand', stack: "'Quicksand', sans-serif", category: 'Suave' },
  { name: 'DM Serif Display', stack: "'DM Serif Display', serif", category: 'Revista' },
  { name: 'Manrope', stack: "'Manrope', sans-serif", category: 'Técnica' },
  { name: 'Bitter', stack: "'Bitter', serif", category: 'Robusta' },
  { name: 'Cabin', stack: "'Cabin', sans-serif", category: 'Humanista' },
  { name: 'Spectral', stack: "'Spectral', serif", category: 'Literaria' },
  { name: 'Syne', stack: "'Syne', sans-serif", category: 'Vanguardia' },
];

const DEFAULT_CUSTOM_PALETTE = {
  dot1Bg: '#BD9774',
  dot2Card: '#59230F',
  dot3Primary: '#8C3F23',
  dot4Subcard: '#4A4327',
};

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('inicio');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isCloudOnline, setIsCloudOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const isApplyingRemoteRef = React.useRef<boolean>(false);

  // Helper to load/save in localStorage with fallback
  const getStored = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (item) return JSON.parse(item);
    } catch {
      // Fallback on error
    }
    return fallback;
  };

  // UI Theme & Accessibility Modes (Dark Mode + Modo Gente Mayor Zoom + 4-Dot Custom Palette)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() =>
    getStored('mjl_dark_mode', false)
  );
  const [isSeniorMode, setIsSeniorMode] = useState<boolean>(() =>
    getStored('mjl_senior_mode', false)
  );
  const [customPalette, setCustomPalette] = useState<{
    dot1Bg: string;
    dot2Card: string;
    dot3Primary: string;
    dot4Subcard: string;
  }>(() => getStored('mjl_custom_palette', DEFAULT_CUSTOM_PALETTE));

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark-mode');
      root.style.removeProperty('--mjl-app-bg');
      root.style.removeProperty('--mjl-outer-bg');
      root.style.removeProperty('--mjl-header-bg');
      root.style.removeProperty('--mjl-card-bg');
      root.style.removeProperty('--mjl-drawer-bg');
      root.style.removeProperty('--mjl-nav-bg');
      root.style.removeProperty('--mjl-primary-btn');
      root.style.removeProperty('--mjl-primary-btn-hover');
      root.style.removeProperty('--mjl-subcard-bg');
      root.style.removeProperty('--mjl-olive');
      root.style.removeProperty('--mjl-accent-camel');
    } else {
      root.classList.remove('dark-mode');
      root.style.setProperty('--mjl-app-bg', customPalette.dot1Bg);
      root.style.setProperty('--mjl-outer-bg', customPalette.dot1Bg);
      root.style.setProperty('--mjl-accent-camel', customPalette.dot1Bg);
      root.style.setProperty('--mjl-header-bg', customPalette.dot2Card);
      root.style.setProperty('--mjl-card-bg', customPalette.dot2Card);
      root.style.setProperty('--mjl-drawer-bg', customPalette.dot2Card);
      root.style.setProperty('--mjl-nav-bg', customPalette.dot2Card);
      root.style.setProperty('--mjl-primary-btn', customPalette.dot3Primary);
      root.style.setProperty('--mjl-primary-btn-hover', customPalette.dot3Primary);
      root.style.setProperty('--mjl-subcard-bg', customPalette.dot4Subcard);
      root.style.setProperty('--mjl-olive', customPalette.dot4Subcard);
    }
    try {
      localStorage.setItem('mjl_dark_mode', JSON.stringify(isDarkMode));
      localStorage.setItem('mjl_custom_palette', JSON.stringify(customPalette));
    } catch {}
  }, [isDarkMode, customPalette]);

  const [selectedFont, setSelectedFont] = useState<string>(() =>
    getStored('mjl_selected_font', 'Plus Jakarta Sans')
  );

  // Swipe-right gesture tracking for opening/closing the left menu drawer
  const swipeStartRef = React.useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const handleTouchStartGlobal = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    swipeStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      active: true,
    };
  };

  const handleTouchMoveGlobal = (e: React.TouchEvent) => {
    if (!swipeStartRef.current.active || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - swipeStartRef.current.x;
    const dy = Math.abs(e.touches[0].clientY - swipeStartRef.current.y);

    // Horizontal swipe right to open menu
    if (!drawerOpen && dx > 48 && dx > dy * 1.35) {
      swipeStartRef.current.active = false;
      setDrawerOpen(true);
    } else if (drawerOpen && dx < -48 && Math.abs(dx) > dy * 1.35) {
      // Horizontal swipe left to close menu
      swipeStartRef.current.active = false;
      setDrawerOpen(false);
    }
  };

  const handleTouchEndGlobal = () => {
    swipeStartRef.current.active = false;
  };

  const handlePointerDownSwipeZone = (e: React.PointerEvent) => {
    swipeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      active: true,
    };
  };

  const handlePointerMoveSwipeZone = (e: React.PointerEvent) => {
    if (!swipeStartRef.current.active) return;
    const dx = e.clientX - swipeStartRef.current.x;
    const dy = Math.abs(e.clientY - swipeStartRef.current.y);
    if (!drawerOpen && dx > 32 && dx > dy) {
      swipeStartRef.current.active = false;
      setDrawerOpen(true);
    } else if (drawerOpen && dx < -32 && Math.abs(dx) > dy) {
      swipeStartRef.current.active = false;
      setDrawerOpen(false);
    }
  };

  const handlePointerUpSwipeZone = () => {
    swipeStartRef.current.active = false;
  };

  useEffect(() => {
    const root = document.documentElement;
    const fontObj =
      AUTO_LOADED_FONTS.find((f) => f.name === selectedFont) ||
      AUTO_LOADED_FONTS[0];
    root.style.setProperty('--mjl-font-family', fontObj.stack);
    root.style.setProperty('--mjl-font-display', fontObj.stack);
    try {
      localStorage.setItem('mjl_selected_font', JSON.stringify(selectedFont));
    } catch {}
  }, [selectedFont]);

  useEffect(() => {
    const root = document.documentElement;
    if (isSeniorMode) {
      root.classList.add('senior-mode');
    } else {
      root.classList.remove('senior-mode');
    }
    try {
      localStorage.setItem('mjl_senior_mode', JSON.stringify(isSeniorMode));
    } catch {}
  }, [isSeniorMode]);

  // State: Guillotina 2D (Melamina 18mm) — Empty by default
  const [boards, setBoards] = useState<MelaminaBoard[]>(() =>
    getStored('mjl_v3_boards', INITIAL_BOARDS)
  );
  const [selectedBoardId, setSelectedBoardId] = useState<string>(() =>
    getStored('mjl_v3_selected_board_id', '')
  );
  const [cutPieces, setCutPieces] = useState<CutPiece[]>(() =>
    getStored('mjl_v3_cut_pieces', INITIAL_CUT_PIECES)
  );
  const [predefinedCuts, setPredefinedCuts] = useState<PredefinedCut[]>(() =>
    getStored('mjl_v3_predefined_cuts', INITIAL_PREDEFINED_CUTS)
  );

  // State: Cortes Fondo (Placas de Fondo 3mm / 5.5mm) — Empty by default
  const [fondoBoards, setFondoBoards] = useState<MelaminaBoard[]>(() =>
    getStored('mjl_v3_fondo_boards', INITIAL_FONDO_BOARDS)
  );
  const [selectedFondoBoardId, setSelectedFondoBoardId] = useState<string>(() =>
    getStored('mjl_v3_selected_fondo_board_id', '')
  );
  const [fondoCutPieces, setFondoCutPieces] = useState<CutPiece[]>(() =>
    getStored('mjl_v3_fondo_cut_pieces', INITIAL_FONDO_PIECES)
  );

  // State: Calculador de Filo (Tapacantos) — Empty by default
  const [edgeRolls, setEdgeRolls] = useState<EdgeBandingRoll[]>(() =>
    getStored('mjl_v3_edge_rolls', INITIAL_EDGE_ROLLS)
  );
  const [selectedEdgeRollId, setSelectedEdgeRollId] = useState<string>(() =>
    getStored('mjl_v3_selected_edge_roll_id', '')
  );
  const [edgePieces, setEdgePieces] = useState<EdgeBandingPiece[]>(() =>
    getStored('mjl_v3_edge_pieces', INITIAL_EDGE_PIECES)
  );

  // State: Inventario de Taller (Herrajes, Piezas Cortadas, Materiales) — Empty by default
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() =>
    getStored('mjl_v3_inventory_items', INITIAL_INVENTORY_ITEMS)
  );

  // State: Operaciones & Pedidos — Empty by default
  const [orders, setOrders] = useState<WorkshopOrder[]>(() =>
    getStored('mjl_v3_orders', INITIAL_ORDERS)
  );
  const [selectedFreightOrderId, setSelectedFreightOrderId] = useState<string>(
    ''
  );
  const [cashEfectivo, setCashEfectivo] = useState<number>(() =>
    getStored('mjl_v3_cash_efectivo', 0)
  );
  const [cashBancos, setCashBancos] = useState<number>(() =>
    getStored('mjl_v3_cash_bancos', 0)
  );
  const [movements, setMovements] = useState<CashMovement[]>(() =>
    getStored('mjl_v3_cash_movements', INITIAL_CASH_MOVEMENTS)
  );

  // KPI & Gamificación states — 0 by default
  const [cobradoMes, setCobradoMes] = useState<number>(() =>
    getStored('mjl_v3_cobrado_mes', 0)
  );
  const [porPercibir, setPorPercibir] = useState<number>(() =>
    getStored('mjl_v3_por_percibir', 0)
  );
  const [metaMensual, setMetaMensual] = useState<number>(() =>
    getStored('mjl_v3_meta_mensual', 0)
  );
  const [extraBillingArs, setExtraBillingArs] = useState<number>(() =>
    getStored('mjl_v3_extra_billing', 0)
  );
  const [salesGoalUnits, setSalesGoalUnits] = useState<number>(() =>
    getStored('mjl_v3_sales_goal_units', 10)
  );
  const [extraSoldUnits, setExtraSoldUnits] = useState<number>(() =>
    getStored('mjl_v3_extra_sold_units', 0)
  );
  const [freightRatePerKm, setFreightRatePerKm] = useState<number>(() =>
    getStored('mjl_v3_freight_rate_km', 0)
  );
  const [preselectedFreightDesignId, setPreselectedFreightDesignId] = useState<
    string | null
  >(null);

  // State: Catálogo — Empty by default
  const [designs, setDesigns] = useState<FurnitureDesign[]>(() =>
    getStored('mjl_v3_designs', INITIAL_DESIGNS)
  );
  const [activeDesignIndex, setActiveDesignIndex] = useState<number>(0);

  // Automatic localStorage sync
  useEffect(() => {
    try {
      localStorage.setItem('mjl_v3_cut_pieces', JSON.stringify(cutPieces));
    } catch {}
  }, [cutPieces]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'mjl_v3_predefined_cuts',
        JSON.stringify(predefinedCuts)
      );
    } catch {}
  }, [predefinedCuts]);

  useEffect(() => {
    try {
      localStorage.setItem('mjl_v3_boards', JSON.stringify(boards));
    } catch {}
  }, [boards]);

  useEffect(() => {
    try {
      localStorage.setItem('mjl_v3_selected_board_id', JSON.stringify(selectedBoardId));
    } catch {}
  }, [selectedBoardId]);

  useEffect(() => {
    try {
      localStorage.setItem('mjl_v3_fondo_cut_pieces', JSON.stringify(fondoCutPieces));
      localStorage.setItem('mjl_v3_fondo_boards', JSON.stringify(fondoBoards));
    } catch {}
  }, [fondoCutPieces, fondoBoards]);

  useEffect(() => {
    try {
      localStorage.setItem('mjl_v3_edge_rolls', JSON.stringify(edgeRolls));
      localStorage.setItem('mjl_v3_edge_pieces', JSON.stringify(edgePieces));
    } catch {}
  }, [edgeRolls, edgePieces]);

  useEffect(() => {
    try {
      localStorage.setItem('mjl_v3_inventory_items', JSON.stringify(inventoryItems));
    } catch {}
  }, [inventoryItems]);

  useEffect(() => {
    try {
      localStorage.setItem('mjl_v3_orders', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem('mjl_v3_cash_efectivo', JSON.stringify(cashEfectivo));
      localStorage.setItem('mjl_v3_cash_bancos', JSON.stringify(cashBancos));
      localStorage.setItem('mjl_v3_cash_movements', JSON.stringify(movements));
      localStorage.setItem('mjl_v3_cobrado_mes', JSON.stringify(cobradoMes));
      localStorage.setItem('mjl_v3_por_percibir', JSON.stringify(porPercibir));
      localStorage.setItem('mjl_v3_meta_mensual', JSON.stringify(metaMensual));
      localStorage.setItem('mjl_v3_extra_billing', JSON.stringify(extraBillingArs));
      localStorage.setItem('mjl_v3_sales_goal_units', JSON.stringify(salesGoalUnits));
      localStorage.setItem('mjl_v3_extra_sold_units', JSON.stringify(extraSoldUnits));
      localStorage.setItem('mjl_v3_freight_rate_km', JSON.stringify(freightRatePerKm));
    } catch {}
  }, [
    cashEfectivo,
    cashBancos,
    movements,
    cobradoMes,
    porPercibir,
    metaMensual,
    extraBillingArs,
    salesGoalUnits,
    extraSoldUnits,
    freightRatePerKm,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem('mjl_v3_designs', JSON.stringify(designs));
    } catch {}
  }, [designs]);

  // Real-Time Multi-Device Sync with Firebase (onSnapshot) + Offline LocalStorage Fallback
  useEffect(() => {
    const handleOnline = () => setIsCloudOnline(true);
    const handleOffline = () => setIsCloudOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = subscribeToWorkshopState(
      (cloudData) => {
        // Only apply remote state if it has the clean v3 schema flag (preventing old pre-populated demo data from overwriting empty defaults)
        if (!cloudData || cloudData.schemaVersion !== 'v3_clean') {
          return;
        }
        isApplyingRemoteRef.current = true;
        if (cloudData.boards && Array.isArray(cloudData.boards)) {
          setBoards(cloudData.boards);
        }
        if (cloudData.fondoBoards && Array.isArray(cloudData.fondoBoards)) {
          setFondoBoards(cloudData.fondoBoards);
        }
        if (cloudData.fondoCutPieces && Array.isArray(cloudData.fondoCutPieces)) {
          setFondoCutPieces(cloudData.fondoCutPieces);
        }
        if (cloudData.inventoryItems && Array.isArray(cloudData.inventoryItems)) {
          setInventoryItems(cloudData.inventoryItems);
        }
        if (cloudData.orders && Array.isArray(cloudData.orders)) {
          setOrders(cloudData.orders);
        }
        if (cloudData.designs && Array.isArray(cloudData.designs)) {
          setDesigns(cloudData.designs);
        }
        if (cloudData.cutPieces && Array.isArray(cloudData.cutPieces)) {
          setCutPieces(cloudData.cutPieces);
        }
        if (cloudData.predefinedCuts && Array.isArray(cloudData.predefinedCuts)) {
          setPredefinedCuts(cloudData.predefinedCuts);
        }
        if (cloudData.edgeRolls && Array.isArray(cloudData.edgeRolls)) {
          setEdgeRolls(cloudData.edgeRolls);
        }
        if (cloudData.edgePieces && Array.isArray(cloudData.edgePieces)) {
          setEdgePieces(cloudData.edgePieces);
        }
        if (typeof cloudData.cashEfectivo === 'number') {
          setCashEfectivo(cloudData.cashEfectivo);
        }
        if (typeof cloudData.cashBancos === 'number') {
          setCashBancos(cloudData.cashBancos);
        }
        if (cloudData.movements && Array.isArray(cloudData.movements)) {
          setMovements(cloudData.movements);
        }
        if (typeof cloudData.cobradoMes === 'number') {
          setCobradoMes(cloudData.cobradoMes);
        }
        if (typeof cloudData.porPercibir === 'number') {
          setPorPercibir(cloudData.porPercibir);
        }
        if (typeof cloudData.extraBillingArs === 'number') {
          setExtraBillingArs(cloudData.extraBillingArs);
        }
        if (typeof cloudData.salesGoalUnits === 'number' && Number.isFinite(cloudData.salesGoalUnits)) {
          setSalesGoalUnits(cloudData.salesGoalUnits);
        }
        if (typeof cloudData.extraSoldUnits === 'number' && Number.isFinite(cloudData.extraSoldUnits)) {
          setExtraSoldUnits(cloudData.extraSoldUnits);
        }
        if (typeof cloudData.freightRatePerKm === 'number' && Number.isFinite(cloudData.freightRatePerKm)) {
          setFreightRatePerKm(cloudData.freightRatePerKm);
        }
        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 300);
      },
      (onlineStatus) => {
        setIsCloudOnline(onlineStatus);
      }
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Sync state to Firebase Firestore on critical updates (debounced)
  useEffect(() => {
    if (isApplyingRemoteRef.current) return;
    const timer = setTimeout(() => {
      saveDocToCloud('workshop_state', 'current', {
        schemaVersion: 'v3_clean',
        boards,
        fondoBoards,
        fondoCutPieces,
        inventoryItems,
        orders,
        designs,
        cutPieces,
        predefinedCuts,
        edgeRolls,
        edgePieces,
        cashEfectivo,
        cashBancos,
        movements,
        cobradoMes,
        porPercibir,
        extraBillingArs,
        salesGoalUnits,
        extraSoldUnits,
        freightRatePerKm,
      }).then((ok) => {
        if (ok && navigator.onLine) setIsCloudOnline(true);
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    boards,
    fondoBoards,
    fondoCutPieces,
    inventoryItems,
    orders,
    designs,
    cutPieces,
    predefinedCuts,
    edgeRolls,
    edgePieces,
    cashEfectivo,
    cashBancos,
    movements,
    cobradoMes,
    porPercibir,
    extraBillingArs,
    salesGoalUnits,
    extraSoldUnits,
    freightRatePerKm,
  ]);


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

  const handleAddBoard = (newBoard: MelaminaBoard) => {
    setBoards((prev) => [...prev, newBoard]);
  };

  const handleUpdateBoard = (boardId: string, updated: Partial<MelaminaBoard>) => {
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, ...updated } : b))
    );
  };

  const handleDeleteBoard = (boardId: string) => {
    setBoards((prev) => {
      const next = prev.filter((b) => b.id !== boardId);
      if (selectedBoardId === boardId) {
        setSelectedBoardId(next[0]?.id || '');
      }
      return next;
    });
    showToast('Placa eliminada');
  };

  const handleUpdatePieceQty = (pieceId: string, delta: number) => {
    setCutPieces((prev) =>
      prev.map((p) =>
        p.id === pieceId ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p
      )
    );
  };

  const handleUpdatePieceDetails = (
    pieceId: string,
    updated: Partial<CutPiece>
  ) => {
    setCutPieces((prev) =>
      prev.map((p) => (p.id === pieceId ? { ...p, ...updated } : p))
    );
  };

  const handleDeletePiece = (pieceId: string) => {
    setCutPieces((prev) => prev.filter((p) => p.id !== pieceId));
    showToast('Corte eliminado de la guillotina');
  };

  const handleClearAllCuts = () => {
    setCutPieces([]);
    showToast('Guillotina en 0 absoluto: 0 cortes, simulador y eficiencia en 0%');
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
    setCutPieces([]);
    showToast('Guillotina reiniciada en 0 absoluto: 0 cortes, simulador y eficiencia en 0%');
  };

  // Handlers for Predefined Cuts (CRUD)
  const handleAddPredefinedCut = (newCut: Omit<PredefinedCut, 'id'>) => {
    const cut: PredefinedCut = {
      ...newCut,
      id: `pre-${Date.now()}`,
    };
    setPredefinedCuts((prev) => [...prev, cut]);
    showToast(`Corte predefinido guardado: ${cut.name}`);
  };

  const handleUpdatePredefinedCut = (
    id: string,
    updated: Partial<PredefinedCut>
  ) => {
    setPredefinedCuts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
    showToast('Corte predefinido actualizado correctamente');
  };

  const handleDeletePredefinedCut = (id: string) => {
    setPredefinedCuts((prev) => prev.filter((c) => c.id !== id));
    showToast('Corte predefinido eliminado de la lista');
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
    setFondoCutPieces([]);
    showToast('Cortes de fondo reiniciados en 0 absoluto: 0 cortes, simulador y eficiencia en 0%');
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
    setEdgeRolls((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (selectedEdgeRollId === id) {
        setSelectedEdgeRollId(next[0]?.id || '');
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
    setEdgePieces((prev) => prev.filter((p) => p.id !== id));
    showToast('Pieza removida del cálculo de filo');
  };

  const handleResetEdgePieces = () => {
    setEdgePieces([]);
    showToast('Calculador de filo reiniciado en 0 absoluto: sin piezas cargadas');
  };

  // Handlers for Inventario de Taller
  const handleAddInventoryItem = (
    newItem: Omit<InventoryItem, 'id' | 'code'>
  ) => {
    // Check if an item with the same name already exists in inventory (Cumulative Stock Update Logic)
    const existingIndex = inventoryItems.findIndex(
      (it) => it.name.trim().toLowerCase() === newItem.name.trim().toLowerCase()
    );

    if (existingIndex >= 0) {
      const existing = inventoryItems[existingIndex];
      const previousStock = existing.stockQty;
      const accumulatedStock = previousStock + newItem.stockQty;

      setInventoryItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex
            ? {
                ...it,
                stockQty: accumulatedStock,
                subtitle: newItem.subtitle || it.subtitle,
                unitPriceArs: newItem.unitPriceArs || it.unitPriceArs,
              }
            : it
        )
      );
      showToast(
        `Stock acumulado: ${existing.name} (${previousStock} + ${newItem.stockQty} = ${accumulatedStock} ${existing.unitLabel})`
      );
      return;
    }

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
    showToast(`Nuevo objeto agregado al Inventario: ${newItem.name}`);
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
    setInventoryItems((prev) => prev.filter((it) => it.id !== id));
    showToast('Objeto eliminado del Inventario de Taller');
  };

  // One-Click "Confirm Saw Cut" Action ("✅ Marcar Placa como Cortada")
  const handleConfirmSawCut = (data: {
    boardType: 'melamina' | 'fondo';
    boardName: string;
    boardsCount: number;
    pieces: { name: string; widthMm: number; heightMm: number; quantity: number }[];
    largestScrap?: { widthMm: number; heightMm: number; areaM2: number };
    saveScrap: boolean;
  }) => {
    setInventoryItems((prev) => {
      let updated = [...prev];

      // 1. Deduct Base Sheet from Insumos / Placas (category 'material')
      const boardKeyword = data.boardType === 'melamina' ? 'Melamina' : 'Fondo';
      const boardIndex = updated.findIndex(
        (it) =>
          it.category === 'material' &&
          (it.name.toLowerCase().includes(data.boardName.toLowerCase()) ||
            it.name.toLowerCase().includes(boardKeyword.toLowerCase()))
      );

      if (boardIndex >= 0) {
        const currentStock = updated[boardIndex].stockQty;
        const newStock = Math.max(0, currentStock - data.boardsCount);
        updated[boardIndex] = { ...updated[boardIndex], stockQty: newStock };
      } else {
        // Fallback: create base sheet entry with standard initial stock - boardsCount
        updated.push({
          id: `inv-mat-${Date.now()}`,
          code: `MAT-${String(updated.length + 1).padStart(2, '0')}`,
          name: `Placa ${data.boardName}`,
          subtitle: `${data.boardType === 'melamina' ? 'Melamina 18mm' : 'Fibroplus 3mm'} estándar`,
          category: 'material',
          unitPriceArs: data.boardType === 'melamina' ? 82000 : 38500,
          unitLabel: 'placa',
          stockQty: Math.max(0, 10 - data.boardsCount),
          step: 1,
          iconType: 'board',
        });
      }

      // 2. Accumulate Cut Pieces into Pieza Madera (category 'pieza_cortada') using cumulative stock logic
      data.pieces.forEach((piece) => {
        const pieceIdx = updated.findIndex(
          (it) =>
            it.category === 'pieza_cortada' &&
            it.name.toLowerCase().trim() === piece.name.toLowerCase().trim()
        );

        if (pieceIdx >= 0) {
          updated[pieceIdx] = {
            ...updated[pieceIdx],
            stockQty: updated[pieceIdx].stockQty + piece.quantity,
          };
        } else {
          updated.push({
            id: `inv-pz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            code: `MAD-${String(updated.length + 1).padStart(2, '0')}`,
            name: piece.name,
            subtitle: `${piece.widthMm} × ${piece.heightMm} mm • ${
              data.boardType === 'melamina' ? 'Melamina 18mm' : 'Fibroplus 3mm'
            } cortada`,
            category: 'pieza_cortada',
            unitPriceArs: 3500,
            unitLabel: 'pieza',
            stockQty: piece.quantity,
            step: 1,
            iconType: 'board',
          });
        }
      });

      // 3. Scrap/Offcut Recovery Prompt (if confirmed)
      if (data.saveScrap && data.largestScrap) {
        updated.push({
          id: `inv-ret-${Date.now()}`,
          code: `RET-${String(updated.length + 1).padStart(2, '0')}`,
          name: `Retazo Útil (${data.largestScrap.widthMm} × ${data.largestScrap.heightMm} mm)`,
          subtitle: `${data.boardName} • ${data.largestScrap.areaM2} m² libre aprovechable`,
          category: 'material',
          unitPriceArs: Math.round(data.largestScrap.areaM2 * 18000),
          unitLabel: 'retazo',
          stockQty: 1,
          step: 1,
          iconType: 'board',
        });
      }

      return updated;
    });

    // Also add saved offcut as a selectable custom base board for future cuts
    if (data.saveScrap && data.largestScrap) {
      const customBoard: MelaminaBoard = {
        id: `retazo-${Date.now()}`,
        name: `Retazo ${data.boardName} (${data.largestScrap.widthMm}×${data.largestScrap.heightMm})`,
        widthMm: data.largestScrap.widthMm,
        heightMm: data.largestScrap.heightMm,
        thicknessMm: data.boardType === 'melamina' ? 18 : 3,
        costArs: Math.round(data.largestScrap.areaM2 * 18000),
        swatchColor: data.boardType === 'melamina' ? '#c99768' : '#f4f4f2',
      };
      if (data.boardType === 'melamina') {
        setBoards((prev) => [...prev, customBoard]);
      } else {
        setFondoBoards((prev) => [...prev, customBoard]);
      }
    }

    const totalCutsCount = data.pieces.reduce((sum, p) => sum + p.quantity, 0);
    showToast(
      `✅ Corte registrado: ${data.boardsCount} placa(s) descontada(s), ${totalCutsCount} piezas acumuladas en inventario${
        data.saveScrap && data.largestScrap
          ? ' (+ retazo útil guardado como placa seleccionable)'
          : ''
      }`
    );
  };

  // Deduct all required pre-cut pieces and hardware from Inventory when an order enters assembly
  const handleDeductOrderAssemblyStock = (order: WorkshopOrder) => {
    const isRack = order.itemsSummary.toLowerCase().includes('rack');
    const woodTargets = [
      { keyword: 'Tapa', qty: 1 },
      { keyword: 'Lateral', qty: 2 },
      { keyword: 'Frente', qty: isRack ? 2 : 1 },
    ];
    const hwTargets = [
      { keyword: 'Corredera', qty: isRack ? 2 : 1 },
      { keyword: 'Tirador', qty: isRack ? 2 : 1 },
      { keyword: 'Pata', qty: 4 },
    ];

    setInventoryItems((prev) =>
      prev.map((it) => {
        if (it.category === 'pieza_cortada') {
          const wt = woodTargets.find((w) =>
            it.name.toLowerCase().includes(w.keyword.toLowerCase())
          );
          if (wt) {
            return { ...it, stockQty: Math.max(0, it.stockQty - wt.qty) };
          }
        }
        if (it.category === 'herraje') {
          const ht = hwTargets.find((h) =>
            it.name.toLowerCase().includes(h.keyword.toLowerCase())
          );
          if (ht) {
            return { ...it, stockQty: Math.max(0, it.stockQty - ht.qty) };
          }
        }
        return it;
      })
    );

    showToast(
      `🔨 Insumos de armado descontados del Inventario para ${order.code} (${order.clientName})`
    );
  };

  // 1-Click Action: Inject missing wood pieces into Guillotine 2D active cut list
  const handleLoadMissingPiecesToCutter = (
    missingPieces: Omit<CutPiece, 'id' | 'numberLabel'>[]
  ) => {
    if (!missingPieces || missingPieces.length === 0) {
      showToast('No hay piezas faltantes que cargar.');
      return;
    }

    setCutPieces((prev) => {
      let updated = [...prev];
      missingPieces.forEach((mp) => {
        const existIdx = updated.findIndex((p) => p.name.toLowerCase() === mp.name.toLowerCase());
        if (existIdx >= 0) {
          updated[existIdx] = {
            ...updated[existIdx],
            quantity: updated[existIdx].quantity + mp.quantity,
          };
        } else {
          updated.push({
            ...mp,
            id: `cut-bom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            numberLabel: `${updated.length + 1}`,
          });
        }
      });
      return updated;
    });

    setActiveScreen('guillotina');
    showToast(`🛠️ ${missingPieces.length} medidas cargadas en la Guillotina 2D lista para corte`);
  };

  // Handlers for Orders & Cash
  const handleUpdateOrder = (orderId: string, updated: Partial<WorkshopOrder>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o))
    );
    showToast('Pedido actualizado');
  };

  const handleUpdateOrderStage = (orderId: string, stage: OrderStage) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              stage,
              inCourse: stage === 'entregado' ? false : o.inCourse,
            }
          : o
      )
    );
  };

  const handleAddOrder = (order: Omit<WorkshopOrder, 'id'>) => {
    const newId = `ped-${Date.now()}`;
    setOrders((prev) => [{ ...order, id: newId }, ...prev]);
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    showToast('Orden eliminada de la cola de producción');
  };

  // Full Order Circuit: Catálogo -> Flete -> Guardar y Enviar a Pedidos
  const handleSubmitFreightToPedidos = (payload: {
    design: FurnitureDesign;
    quantity: number;
    clientName: string;
    address: string;
    distanceKm: number;
    ratePerKm: number;
    freightArs: number;
    totalArs: number;
  }) => {
    const nextNum = 1085 + orders.length;
    const defaultIso = new Date(Date.now() + 2 * 86400000)
      .toISOString()
      .split('T')[0];
    const [yyyy, mm, dd] = defaultIso.split('-').map(Number);
    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const formattedDate = `${dd} ${months[(mm || 1) - 1]}`;
    const shortZone =
      payload.address.split(',')[1]?.trim() || payload.address.split(',')[0];

    const newOrder: WorkshopOrder = {
      id: `ped-${Date.now()}`,
      code: `#PED-${nextNum}`,
      deliveryDate: formattedDate,
      deliveryDateIso: defaultIso,
      clientName: payload.clientName,
      location: `${shortZone} • ${payload.distanceKm} km`,
      distanceKm: payload.distanceKm,
      itemsSummary:
        payload.quantity > 1
          ? `${payload.design.name} x${payload.quantity}`
          : payload.design.name,
      designId: payload.design.id,
      furnitureQty: payload.quantity,
      freightCostArs: payload.freightArs,
      materialSpec: `${payload.design.specLine} • ${payload.design.drawerCount ?? 1} cajón(es)`,
      totalArs: payload.totalArs,
      stage: 'proceso',
      inCourse: true,
      drawerCount: payload.design.drawerCount ?? 1,
      drawersConfig: payload.design.drawersConfig,
      packagesCount: payload.quantity,
      packagingSpec: `${payload.quantity} bulto(s) • Film stretch & esquineros`,
      address: payload.address,
      featured: false,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setSelectedFreightOrderId(newOrder.id);
    setActiveScreen('pedidos');
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
    setCashEfectivo(0);
    setCashBancos(0);
    setMovements([]);
    setOrders([]);
    setCobradoMes(0);
    setPorPercibir(0);
    setExtraBillingArs(0);
    showToast('Todo reiniciado a 0 absoluto: Caja $0, 0 pedidos, Cobrado $0 y Por percibir $0');
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

  const handleDeleteDesign = (id: string) => {
    setDesigns((prev) => prev.filter((d) => d.id !== id));
  };

  const handleUpdateDesign = (
    id: string,
    updated: Partial<FurnitureDesign>
  ) => {
    setDesigns((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updated } : d))
    );
  };

  const activeFreightOrder: WorkshopOrder =
    orders.find((o) => o.id === selectedFreightOrderId) ||
    orders[0] || {
      id: 'ped-empty',
      code: 'SIN-PEDIDO',
      deliveryDate: 'Sin fecha',
      clientName: 'Sin pedido activo en cola',
      location: 'Villa Luzuriaga • 0 km',
      distanceKm: 8.4,
      itemsSummary: 'Sin muebles cargados',
      materialSpec: 'Melamina 18mm',
      totalArs: 0,
      stage: 'proceso',
      packagesCount: 0,
      packagingSpec: '0 bultos en cola',
      address: 'Av. de Mayo 850, Ramos Mejía',
    };
  const activeDesign =
    designs[activeDesignIndex % Math.max(1, designs.length)] || designs[0];

  return (
    <div className="min-h-screen w-full bg-[#090a0a] flex justify-center">
      {/* ANDROID MOBILE DEVICE CONTAINER (With Swipe-Right to Open Left Menu) */}
      <div
        onTouchStart={handleTouchStartGlobal}
        onTouchMove={handleTouchMoveGlobal}
        onTouchEnd={handleTouchEndGlobal}
        onPointerDown={handlePointerDownSwipeZone}
        onPointerMove={handlePointerMoveSwipeZone}
        onPointerUp={handlePointerUpSwipeZone}
        className="w-full max-w-[420px] min-h-screen bg-[#121414] text-[#e3e2e2] flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,0.85)] sm:border-x sm:border-white/10"
      >
        {/* LEFT-EDGE SWIPE SENSOR & VISUAL HANDLE TAB (Slide finger right to open menu) */}
        {!drawerOpen && (
          <div
            onTouchStart={handleTouchStartGlobal}
            onTouchMove={handleTouchMoveGlobal}
            onTouchEnd={handleTouchEndGlobal}
            onPointerDown={handlePointerDownSwipeZone}
            onPointerMove={handlePointerMoveSwipeZone}
            onPointerUp={handlePointerUpSwipeZone}
            title="Deslizá el dedo hacia la derecha para abrir el menú"
            className="fixed left-0 top-16 bottom-20 w-5 z-40 flex items-center justify-start select-none touch-pan-y"
          >
            <div className="w-1.5 h-16 rounded-r-full bg-[#BD9774]/55 border-y border-r border-white/25 shadow-md flex items-center justify-center" />
          </div>
        )}

        {/* ANDROID SYSTEM STATUS BAR */}
        <div
          className="sticky top-0 z-40 px-4 pt-1.5 pb-1 flex items-center justify-between text-[11px] font-semibold text-[#EAD6C0] select-none"
          style={{ backgroundColor: 'var(--mjl-header-bg)' }}
        >
          <div className="flex items-center gap-1.5 tabular-nums">
            <span>15:04</span>
            <span className="text-[9px] text-[#BD9774] font-bold">J&amp;L</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isSeniorMode && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#4A4327] text-[#F0D9C0] font-bold">
                ZOOM +
              </span>
            )}
            <Signal className="w-3 h-3" />
            <span className="text-[10px] font-bold">5G</span>
            <Wifi className="w-3 h-3" />
            <div className="flex items-center gap-0.5 tabular-nums">
              <BatteryCharging className="w-3.5 h-3.5 text-[#BD9774]" />
              <span className="text-[10px]">94%</span>
            </div>
          </div>
        </div>

        {/* APP HEADER BAR (Swipe right to open left menu instead of tapping hamburger icon) */}
        <header
          className="sticky top-[24px] z-30 backdrop-blur-md border-b border-[#BD9774]/30 px-3.5 py-2.5 shadow-md select-none"
          style={{ backgroundColor: 'var(--mjl-header-bg)' }}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Left: Swipe-Right Gesture Pill + Brand Lockup */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                title="Deslizá el dedo hacia la derecha para abrir el menú"
                className="h-10 px-2.5 rounded-xl bg-[#4A4327]/90 border border-[#BD9774]/40 flex items-center gap-1 text-[#FFF9F2] shrink-0 shadow-sm"
              >
                <ChevronsRight className="w-4 h-4 text-[#BD9774] animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#F0D9C0]">
                  Deslizar
                </span>
              </div>

              <div className="min-w-0">
                <div className="text-[20px] font-bold font-display text-white leading-tight truncate tracking-wide">
                  Muebles J&amp;L
                </div>
                <div className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider text-[#F0D9C0] mt-0.5 leading-tight">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isCloudOnline ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className="truncate">
                    {isCloudOnline
                      ? 'Sincronizado en Nube'
                      : 'Modo Local Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Cloud Sync, Notifications & User Profile */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() =>
                  showToast(
                    isCloudOnline
                      ? '🟢 Sincronizado en Nube (3 celulares en tiempo real)'
                      : '🟠 Modo Local Offline • Guardado en caché local'
                  )
                }
                title={
                  isCloudOnline
                    ? '🟢 Sincronizado en Nube'
                    : '🟠 Modo Local Offline'
                }
                className="w-9 h-9 rounded-xl active:bg-white/10 flex items-center justify-center text-[#c8c6c5] transition-colors cursor-pointer"
              >
                <CloudCheck
                  className={`w-5 h-5 ${
                    isCloudOnline ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                />
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

        {/* MAIN ANDROID SCROLLABLE CONTENT (Anti-overlap padding-bottom: 95px) */}
        <main
          className="flex-1 w-full px-3.5 pt-3"
          style={{ paddingBottom: '95px' }}
        >
          {activeScreen === 'inicio' && (
            <ScreenInicio
              orders={orders}
              salesGoalUnits={salesGoalUnits}
              onUpdateSalesGoalUnits={setSalesGoalUnits}
              extraSoldUnits={extraSoldUnits}
              onUpdateExtraSoldUnits={setExtraSoldUnits}
              onGoToPedidos={() => setActiveScreen('pedidos')}
              onGoToPresupuesto={() => setActiveScreen('presupuesto')}
              onSelectOrderForFreight={(orderId) => {
                setSelectedFreightOrderId(orderId);
                setActiveScreen('logistica');
              }}
              onMarkOrderDelivered={(orderId) =>
                handleUpdateOrderStage(orderId, 'entregado')
              }
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'presupuesto' && (
            <ScreenPresupuesto
              onBack={() => setActiveScreen('inicio')}
              boards={boards}
              edgeRolls={edgeRolls}
              inventoryItems={inventoryItems}
              onSendPiecesToGuillotine={handleLoadMissingPiecesToCutter}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'pedidos' && (
            <ScreenPedidos
              orders={orders}
              designs={designs}
              inventoryItems={inventoryItems}
              cutPieces={cutPieces}
              predefinedCuts={predefinedCuts}
              onUpdateOrder={handleUpdateOrder}
              onUpdateOrderStage={handleUpdateOrderStage}
              onAddOrder={handleAddOrder}
              onDeleteOrder={handleDeleteOrder}
              onSelectOrderForFreight={(orderId) => {
                setSelectedFreightOrderId(orderId);
                setActiveScreen('logistica');
              }}
              onLoadMissingPiecesToCutter={handleLoadMissingPiecesToCutter}
              onDeductOrderAssemblyStock={handleDeductOrderAssemblyStock}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'guillotina' && (
            <ScreenGuillotina2D
              boards={boards}
              selectedBoardId={selectedBoardId}
              onSelectBoard={setSelectedBoardId}
              onUpdateBoardCost={handleUpdateBoardCost}
              onAddBoard={handleAddBoard}
              onUpdateBoard={handleUpdateBoard}
              onDeleteBoard={handleDeleteBoard}
              cutPieces={cutPieces}
              onUpdatePieceQty={handleUpdatePieceQty}
              onUpdatePieceDetails={handleUpdatePieceDetails}
              onDeletePiece={handleDeletePiece}
              onClearAllCuts={handleClearAllCuts}
              onTogglePieceRotation={handleTogglePieceRotation}
              onAddCutPiece={handleAddCutPiece}
              onResetCleanOrder={handleResetCleanOrder}
              predefinedCuts={predefinedCuts}
              onAddPredefinedCut={handleAddPredefinedCut}
              onUpdatePredefinedCut={handleUpdatePredefinedCut}
              onDeletePredefinedCut={handleDeletePredefinedCut}
              onConfirmSawCut={handleConfirmSawCut}
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
              onConfirmSawCut={handleConfirmSawCut}
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
              onResetPieces={handleResetEdgePieces}
              cutPieces={cutPieces}
              onSyncWithGuillotine={(imported) => setEdgePieces(imported)}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'inventario' && (
            <ScreenInventario
              items={inventoryItems}
              onAddItem={handleAddInventoryItem}
              onUpdateItem={handleUpdateInventoryItem}
              onDeleteItem={handleDeleteInventoryItem}
              cutPieces={cutPieces}
              predefinedCuts={predefinedCuts}
              onGoToCatalogo={() => setActiveScreen('catalogo')}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'operaciones' && (
            <ScreenOperaciones
              showGamificacion={false}
              orders={orders}
              onUpdateOrderStage={handleUpdateOrderStage}
              onUpdateOrder={handleUpdateOrder}
              onAddOrder={handleAddOrder}
              onDeleteOrder={handleDeleteOrder}
              onSelectOrderForFreight={(orderId) => {
                setSelectedFreightOrderId(orderId);
                setActiveScreen('logistica');
              }}
              cashEfectivo={cashEfectivo}
              cashBancos={cashBancos}
              onUpdateCashBalances={(efectivo, bancos) => {
                setCashEfectivo(efectivo);
                setCashBancos(bancos);
              }}
              cobradoMes={cobradoMes}
              onUpdateCobradoMes={setCobradoMes}
              porPercibir={porPercibir}
              onUpdatePorPercibir={setPorPercibir}
              extraBillingArs={extraBillingArs}
              onUpdateExtraBillingArs={setExtraBillingArs}
              movements={movements}
              onAddCashMovement={handleAddCashMovement}
              onResetCash={handleResetCash}
              inventoryItems={inventoryItems}
              designs={designs}
              onLoadMissingPiecesToCutter={handleLoadMissingPiecesToCutter}
              onDeductOrderAssemblyStock={handleDeductOrderAssemblyStock}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'gamificacion' && (
            <ScreenOperaciones
              showGamificacion={true}
              orders={orders}
              onUpdateOrderStage={handleUpdateOrderStage}
              onUpdateOrder={handleUpdateOrder}
              onAddOrder={handleAddOrder}
              onDeleteOrder={handleDeleteOrder}
              onSelectOrderForFreight={(orderId) => {
                setSelectedFreightOrderId(orderId);
                setActiveScreen('logistica');
              }}
              cashEfectivo={cashEfectivo}
              cashBancos={cashBancos}
              onUpdateCashBalances={(efectivo, bancos) => {
                setCashEfectivo(efectivo);
                setCashBancos(bancos);
              }}
              cobradoMes={cobradoMes}
              onUpdateCobradoMes={setCobradoMes}
              porPercibir={porPercibir}
              onUpdatePorPercibir={setPorPercibir}
              extraBillingArs={extraBillingArs}
              onUpdateExtraBillingArs={setExtraBillingArs}
              movements={movements}
              onAddCashMovement={handleAddCashMovement}
              onResetCash={handleResetCash}
              inventoryItems={inventoryItems}
              designs={designs}
              onLoadMissingPiecesToCutter={handleLoadMissingPiecesToCutter}
              onDeductOrderAssemblyStock={handleDeductOrderAssemblyStock}
              onShowToast={showToast}
            />
          )}

          {activeScreen === 'logistica' && (
            <ScreenLogistica
              activeOrder={activeFreightOrder}
              orders={orders}
              designs={designs}
              preselectedDesignId={preselectedFreightDesignId}
              ratePerKm={freightRatePerKm}
              onUpdateRatePerKm={setFreightRatePerKm}
              onSelectOrder={setSelectedFreightOrderId}
              onUpdateOrderStage={handleUpdateOrderStage}
              onSubmitFreightToPedidos={handleSubmitFreightToPedidos}
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
              onDeleteDesign={handleDeleteDesign}
              onUpdateDesign={handleUpdateDesign}
              onLoadMissingPiecesToCutter={handleLoadMissingPiecesToCutter}
              onSendToFreight={(design) => {
                setPreselectedFreightDesignId(design.id);
                setActiveScreen('logistica');
              }}
              inventoryItems={inventoryItems}
              cutPieces={cutPieces}
              predefinedCuts={predefinedCuts}
              onGoToInventario={() => setActiveScreen('inventario')}
              onShowToast={showToast}
            />
          )}
        </main>

        {/* FIXED BOTTOM NAVIGATION BAR (Minimalist modern icons ONLY, no emojis) */}
        <nav
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] h-[68px] z-40 bg-[#121414]/95 backdrop-blur-md border-t border-white/10 px-1.5 grid grid-cols-6 gap-1 items-center select-none shadow-[0_-8px_24px_rgba(0,0,0,0.75)]"
        >
          {BOTTOM_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveScreen(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer min-w-0 ${
                  isActive
                    ? 'bg-[#e87a50]/15 text-[#ffb59b] border border-[#e87a50]/40 scale-105'
                    : 'text-[#a1a1a1] hover:text-white active:scale-95'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'text-[#e87a50] stroke-[2.2]' : 'stroke-[1.75]'
                  }`}
                />
                <span
                  className={`text-[9.5px] leading-tight tracking-tight truncate w-full text-center ${
                    isActive ? 'font-extrabold text-[#ffb59b]' : 'font-semibold'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* SLIDE-OUT LEFT MENU DRAWER (Opened by swiping right) */}
        {drawerOpen && (
          <div
            onTouchStart={handleTouchStartGlobal}
            onTouchMove={handleTouchMoveGlobal}
            onTouchEnd={handleTouchEndGlobal}
            className="fixed inset-0 z-50 flex justify-center"
          >
            <div className="w-full max-w-[420px] h-full bg-black/75 backdrop-blur-xs flex relative">
              <div
                className="w-84 max-w-[88%] border-r border-[#BD9774]/35 h-full p-4 flex flex-col justify-between overflow-y-auto shadow-2xl"
                style={{ backgroundColor: 'var(--mjl-drawer-bg)' }}
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xl font-bold font-display text-white tracking-wide">
                        Muebles J&amp;L
                      </div>
                      <div className="text-[11px] text-[#F0D9C0] font-semibold">
                        Menú de Taller • Villa Luzuriaga
                      </div>

                      {/* 4 Interactive Color Picker Dots (#BD9774, #59230F, #8C3F23, #4A4327) */}
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {/* DOT 1: Fondo & Acento */}
                        <label
                          className="w-5 h-5 rounded-full border-2 border-white/60 hover:scale-110 transition-transform cursor-pointer relative shadow-sm flex items-center justify-center"
                          style={{ backgroundColor: customPalette.dot1Bg }}
                          title="Punto 1: Cambiar color de Fondo y Acentos"
                        >
                          <input
                            type="color"
                            value={customPalette.dot1Bg}
                            onChange={(e) => {
                              setIsDarkMode(false);
                              setCustomPalette((p) => ({
                                ...p,
                                dot1Bg: e.target.value,
                              }));
                            }}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          />
                        </label>

                        {/* DOT 2: Tarjetas & Cabecera */}
                        <label
                          className="w-5 h-5 rounded-full border-2 border-white/60 hover:scale-110 transition-transform cursor-pointer relative shadow-sm flex items-center justify-center"
                          style={{ backgroundColor: customPalette.dot2Card }}
                          title="Punto 2: Cambiar color de Tarjetas y Cabecera"
                        >
                          <input
                            type="color"
                            value={customPalette.dot2Card}
                            onChange={(e) => {
                              setIsDarkMode(false);
                              setCustomPalette((p) => ({
                                ...p,
                                dot2Card: e.target.value,
                              }));
                            }}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          />
                        </label>

                        {/* DOT 3: Botones Principales */}
                        <label
                          className="w-5 h-5 rounded-full border-2 border-white/60 hover:scale-110 transition-transform cursor-pointer relative shadow-sm flex items-center justify-center"
                          style={{ backgroundColor: customPalette.dot3Primary }}
                          title="Punto 3: Cambiar color de Botones Principales"
                        >
                          <input
                            type="color"
                            value={customPalette.dot3Primary}
                            onChange={(e) => {
                              setIsDarkMode(false);
                              setCustomPalette((p) => ({
                                ...p,
                                dot3Primary: e.target.value,
                              }));
                            }}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          />
                        </label>

                        {/* DOT 4: Sub-tarjetas & Recuadros */}
                        <label
                          className="w-5 h-5 rounded-full border-2 border-white/60 hover:scale-110 transition-transform cursor-pointer relative shadow-sm flex items-center justify-center"
                          style={{ backgroundColor: customPalette.dot4Subcard }}
                          title="Punto 4: Cambiar color de Sub-tarjetas y Recuadros"
                        >
                          <input
                            type="color"
                            value={customPalette.dot4Subcard}
                            onChange={(e) => {
                              setIsDarkMode(false);
                              setCustomPalette((p) => ({
                                ...p,
                                dot4Subcard: e.target.value,
                              }));
                            }}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          />
                        </label>

                        <span className="text-[10px] text-[#EAD6C0] font-semibold ml-1">
                          Paleta Atelier
                        </span>

                        {(customPalette.dot1Bg !== DEFAULT_CUSTOM_PALETTE.dot1Bg ||
                          customPalette.dot2Card !== DEFAULT_CUSTOM_PALETTE.dot2Card ||
                          customPalette.dot3Primary !== DEFAULT_CUSTOM_PALETTE.dot3Primary ||
                          customPalette.dot4Subcard !== DEFAULT_CUSTOM_PALETTE.dot4Subcard) && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomPalette(DEFAULT_CUSTOM_PALETTE);
                              setIsDarkMode(false);
                              showToast('Paleta original restaurada');
                            }}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-black/30 hover:bg-black/50 text-[#F0D9C0] border border-white/20 cursor-pointer"
                            title="Restaurar los 4 colores originales"
                          >
                            Restaurar
                          </button>
                        )}
                      </div>

                      {/* BARRA DEBAJO DE LAS OPCIONES DE COLOR: Selector Desplegable con 20 Fuentes Automáticas */}
                      <div className="mt-2.5 p-2 rounded-xl bg-black/25 border border-[#BD9774]/35 flex items-center gap-2">
                        <Type className="w-4 h-4 text-[#BD9774] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-[#D5BC9F] leading-none mb-1">
                            Fuente de Letra (20 cargadas)
                          </label>
                          <select
                            value={selectedFont}
                            onChange={(e) => {
                              setSelectedFont(e.target.value);
                              showToast(`Fuente aplicada: ${e.target.value}`);
                            }}
                            className="w-full bg-[#4A4327] text-[#FFF9F2] text-xs font-bold px-2 py-1 rounded-lg border border-[#BD9774]/40 focus:outline-none cursor-pointer"
                          >
                            {AUTO_LOADED_FONTS.map((f, idx) => (
                              <option
                                key={f.name}
                                value={f.name}
                                style={{ fontFamily: f.stack }}
                              >
                                {idx + 1}. {f.name} ({f.category})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setDrawerOpen(false)}
                      className="p-1.5 rounded-lg bg-[#4A4327] text-[#F0D9C0] hover:text-white border border-[#BD9774]/30 cursor-pointer shrink-0"
                      title="Cerrar menú (o deslizá a la izquierda)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* MENÚ EN GRILLA 2 POR FILA: Primero Icono Minimalista Moderno Grande y Debajo el Título */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#D5BC9F] px-1">
                      Ventanas del Taller ({SCREEN_TABS.length})
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {SCREEN_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeScreen === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setActiveScreen(tab.id);
                              setDrawerOpen(false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl text-center transition-all cursor-pointer border ${
                              active
                                ? 'bg-[#8C3F23] text-white border-[#BD9774] shadow-lg scale-[1.02]'
                                : 'bg-black/20 text-[#F7EFE6] border-[#BD9774]/25 hover:bg-white/10 active:scale-95'
                            }`}
                          >
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                                active
                                  ? 'bg-black/25 text-[#FFF9F2] border border-[#BD9774]/50'
                                  : 'bg-[#4A4327]/75 text-[#F0D9C0] border border-[#BD9774]/25'
                              }`}
                            >
                              <Icon className="w-6 h-6 stroke-[1.8]" />
                            </div>
                            <span className="text-[11px] font-bold leading-tight tracking-tight line-clamp-1 w-full">
                              {tab.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* BOTTOM SECTION: Install + 2 New Accessibility & Theme Buttons at the very bottom */}
                <div className="pt-3 border-t border-[#BD9774]/25 space-y-2 mt-4">
                  <button
                    onClick={handleInstallAndroidApp}
                    className="w-full py-2 px-3 rounded-xl bg-[#4A4327]/70 hover:bg-[#4A4327] border border-[#BD9774]/40 text-xs font-bold text-[#F0D9C0] flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar en Celular Android</span>
                  </button>

                  <div className="pt-1 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#D5BC9F] px-1">
                      Visualización y Accesibilidad
                    </div>

                    {/* BOTÓN 1: ACTIVAR / DESACTIVAR MODO OSCURO */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsDarkMode((prev) => {
                          const next = !prev;
                          showToast(
                            next
                              ? '🌙 Modo Oscuro activado'
                              : '☀️ Paleta Cálida de Referencia activada'
                          );
                          return next;
                        });
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isDarkMode
                          ? 'bg-[#8C3F23] border-[#BD9774] text-white shadow-md'
                          : 'bg-[#59230F] hover:bg-[#6D2E16] border-[#BD9774]/40 text-[#F0D9C0]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isDarkMode ? (
                          <Moon className="w-4 h-4 text-[#BD9774]" />
                        ) : (
                          <Sun className="w-4 h-4 text-[#BD9774]" />
                        )}
                        <span>Modo Oscuro</span>
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase ${
                          isDarkMode
                            ? 'bg-[#21110A] text-[#BD9774]'
                            : 'bg-[#4A4327] text-[#EAD6C0]'
                        }`}
                      >
                        {isDarkMode ? 'ACTIVO' : 'OFF'}
                      </span>
                    </button>

                    {/* BOTÓN 2: MODO PARA GENTE MAYOR (ZOOM GENERAL DE LA APLICACIÓN) */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSeniorMode((prev) => {
                          const next = !prev;
                          showToast(
                            next
                              ? '🔍 Modo Gente Mayor activado (Zoom general aumentado)'
                              : '🔍 Modo Gente Mayor desactivado (Tamaño estándar)'
                          );
                          return next;
                        });
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isSeniorMode
                          ? 'bg-[#4A4327] border-[#BD9774] text-white shadow-md'
                          : 'bg-[#59230F] hover:bg-[#6D2E16] border-[#BD9774]/40 text-[#F0D9C0]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ZoomIn className="w-4 h-4 text-[#BD9774]" />
                        <span>Modo Gente Mayor (Zoom +)</span>
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase ${
                          isSeniorMode
                            ? 'bg-[#8C3F23] text-white'
                            : 'bg-[#4A4327] text-[#EAD6C0]'
                        }`}
                      >
                        {isSeniorMode ? 'ACTIVO' : 'OFF'}
                      </span>
                    </button>
                  </div>

                  <div className="text-[10px] text-center text-[#D5BC9F]/80 pt-1">
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

        {/* TOAST FEEDBACK BANNER (Elevated above 68px bottom nav bar) */}
        {toastMessage && (
          <div className="fixed bottom-[78px] left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[380px] bg-[#241914] border border-[#e87a50] text-[#ffdbcf] px-3.5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-semibold">
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
