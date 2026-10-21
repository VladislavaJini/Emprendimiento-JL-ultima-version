import {
  DrawerSpec,
  BomMaterialItem,
  CutPiece,
  DesignCutPiece,
} from '../types/atelier';

export const BOARD_THICKNESS_MM = 18;
export const BACK_PANEL_THICKNESS_MM = 3;
export const SLIDE_CLEARANCE_PER_SIDE_MM = 12.7;
export const DRAWER_GAP_MM = 3;
export const MIN_DRAWER_FRONT_HEIGHT_MM = 75;

/**
 * Calculates the internal available height inside a cabinet for drawers
 */
export function getInternalAvailableHeight(cabinetHeightMm: number): number {
  const safeH = Number(cabinetHeightMm) || 550;
  return Math.max(0, safeH - BOARD_THICKNESS_MM * 2);
}

/**
 * Calculates how many drawers physically fit inside the given cabinet height
 */
export function getMaxDrawersAllowed(cabinetHeightMm: number): number {
  const internalH = getInternalAvailableHeight(cabinetHeightMm);
  if (internalH < MIN_DRAWER_FRONT_HEIGHT_MM) return 0;
  const maxByHeight = Math.floor(
    (internalH + DRAWER_GAP_MM) / (MIN_DRAWER_FRONT_HEIGHT_MM + DRAWER_GAP_MM)
  );
  return Math.min(6, Math.max(0, maxByHeight));
}

/**
 * Calculates linear meters of edge banding (filo) for a rectangular piece
 * given the number of sides with filo (0, 1, 2, 3, or 4 sides).
 * - 0 sides: 0
 * - 1 side: 1 Largo
 * - 2 sides: 1 Largo + 1 Profundidad
 * - 3 sides: 2 Largos + 1 Profundidad
 * - 4 sides: 2 Largos + 2 Profundidades (full perimeter)
 */
export function calcPieceEdgeMetersBySides(
  lengthMm: number,
  depthMm: number,
  sidesCount: 0 | 1 | 2 | 3 | 4,
  qty = 1
): number {
  const l = Math.max(0, Number(lengthMm) || 0);
  const p = Math.max(0, Number(depthMm) || 0);
  const q = Math.max(0, Number(qty) || 1);
  let mm = 0;
  if (sidesCount === 1) {
    mm = l;
  } else if (sidesCount === 2) {
    mm = l + p;
  } else if (sidesCount === 3) {
    mm = l * 2 + p;
  } else if (sidesCount === 4) {
    mm = (l + p) * 2;
  }
  return Number(((mm * q) / 1000).toFixed(2));
}

/**
 * Calculates linear meters of edge banding for an array of individual structure cuts
 * where each cut has its own `edgeSidesCount` (0, 1, 2, 3, or 4 sides).
 */
export function calcStructureCutsEdgeMeters(
  cuts: DesignCutPiece[] = []
): number {
  if (!Array.isArray(cuts) || cuts.length === 0) return 0;
  const total = cuts.reduce((sum, c) => {
    const sides = (c.edgeSidesCount !== undefined ? c.edgeSidesCount : 2) as
      | 0
      | 1
      | 2
      | 3
      | 4;
    return (
      sum +
      calcPieceEdgeMetersBySides(
        Number(c.lengthMm) || 0,
        Number(c.depthMm) || 0,
        sides,
        Number(c.quantity) || 1
      )
    );
  }, 0);
  return Number(total.toFixed(2));
}

/**
 * Legacy helper when structureCuts array is not provided
 */
export function calcCabinetStructureEdgeMeters(
  widthMm: number,
  heightMm: number,
  depthMm: number,
  sidesCount: 0 | 1 | 2 | 3 | 4 = 1
): number {
  const topAndFloorM = calcPieceEdgeMetersBySides(
    widthMm,
    depthMm,
    sidesCount,
    2
  );
  const sidesM = calcPieceEdgeMetersBySides(
    heightMm - BOARD_THICKNESS_MM * 2,
    depthMm,
    sidesCount,
    2
  );
  return Number((topAndFloorM + sidesM).toFixed(2));
}

/**
 * Calculates linear meters of edge banding (filo) for a single drawer
 * based on how many sides have filo on the Front, Sides, and Back.
 */
export function calcDrawerEdgeMeters(
  d: Pick<
    DrawerSpec,
    | 'frontWidthMm'
    | 'frontHeightMm'
    | 'frontQty'
    | 'sidesDepthMm'
    | 'sidesHeightMm'
    | 'sidesQty'
    | 'backWidthMm'
    | 'backHeightMm'
    | 'backQty'
    | 'edgeSidesCount'
    | 'sidesEdgeCount'
    | 'backEdgeCount'
  >
): number {
  const frontSides = (
    d.edgeSidesCount !== undefined ? d.edgeSidesCount : 4
  ) as 0 | 1 | 2 | 3 | 4;
  const sideSides = (
    d.sidesEdgeCount !== undefined ? d.sidesEdgeCount : 1
  ) as 0 | 1 | 2 | 3 | 4;
  const backSides = (
    d.backEdgeCount !== undefined ? d.backEdgeCount : sideSides
  ) as 0 | 1 | 2 | 3 | 4;

  const fQty = Math.max(1, Number(d.frontQty) || 1);
  const sQty = Math.max(1, Number(d.sidesQty) || 2);
  const bQty = Math.max(1, Number(d.backQty) || 1);

  const frontM = calcPieceEdgeMetersBySides(
    d.frontWidthMm,
    d.frontHeightMm,
    frontSides,
    fQty
  );
  const sidesM = calcPieceEdgeMetersBySides(
    d.sidesDepthMm,
    d.sidesHeightMm,
    sideSides,
    sQty
  );
  const backM = calcPieceEdgeMetersBySides(
    d.backWidthMm,
    d.backHeightMm,
    backSides,
    bQty
  );

  // Add 10% workshop trim safety margin if > 0
  const rawTotal = frontM + sidesM + backM;
  return Number((rawTotal > 0 ? rawTotal * 1.05 : 0).toFixed(2));
}

/**
 * Generates default DrawerSpec items using the workshop's standard cuts:
 * Frente: 395 × 160 mm
 * Cajones (Laterales / Contrafrente): 301.5 × 83 mm
 */
export function generateDefaultDrawers(
  drawerCount: number,
  cabinetWidthMm = 400,
  cabinetHeightMm = 550,
  cabinetDepthMm = 335
): DrawerSpec[] {
  const safeCount = Math.max(0, Math.min(6, Math.round(Number(drawerCount) || 0)));
  if (safeCount <= 0) return [];

  const frontWidthMm = cabinetWidthMm === 400 ? 395 : Math.max(100, cabinetWidthMm - 5);
  const frontHeightMm = safeCount === 1 ? 160 : Math.max(80, Math.floor((getInternalAvailableHeight(cabinetHeightMm) - (safeCount - 1) * DRAWER_GAP_MM) / safeCount));
  const sidesDepthMm = cabinetDepthMm === 335 ? 301.5 : Math.max(150, Number((cabinetDepthMm - 33.5).toFixed(1)));
  const sidesHeightMm = 83;
  const backWidthMm = 301.5;
  const backHeightMm = 83;

  const bottomWidthMm = Number((backWidthMm + 12).toFixed(1));
  const bottomDepthMm = Number((sidesDepthMm - 10).toFixed(1));

  const result: DrawerSpec[] = [];
  for (let i = 0; i < safeCount; i++) {
    const partialSpec = {
      frontWidthMm,
      frontHeightMm,
      frontQty: 1,
      sidesDepthMm,
      sidesHeightMm,
      sidesQty: 2,
      backWidthMm,
      backHeightMm,
      backQty: 1,
      edgeSidesCount: 4 as const,
      sidesEdgeCount: 1 as const,
      backEdgeCount: 1 as const,
    };
    const edgeMeters = calcDrawerEdgeMeters(partialSpec);
    const edgePricePerMeterArs = 650;

    result.push({
      id: `drw-${i + 1}`,
      index: i + 1,
      frontPieceName: 'Frente',
      frontWidthMm,
      frontHeightMm,
      frontQty: 1,
      sidesPieceName: 'Cajones',
      sidesDepthMm,
      sidesHeightMm,
      sidesQty: 2,
      backPieceName: 'Contrafrente Cajón',
      backWidthMm,
      backHeightMm,
      backQty: 1,
      bottomWidthMm,
      bottomDepthMm,
      bottomQty: 1,
      bottomMaterial: 'Fibroplus Blanco 3mm',
      edgeSidesCount: 4,
      sidesEdgeCount: 1,
      backEdgeCount: 1,
      edgeMeters,
      edgePricePerMeterArs,
      edgeCostArs: Math.round(edgeMeters * edgePricePerMeterArs),
      edgeType: 'Filo PVC 22mm × 0.45mm',
      slideType: '',
      slideQty: 1,
      handleType: '',
      handleQty: 1,
      screwType: 'Tornillos Fix 4×30 / 3.5×16',
      screwsCount: 16,
      customHardware: [],
    });
  }
  return result;
}

/**
 * Ensures any partial or legacy drawersConfig array has all required fields
 */
export function normalizeDrawersConfig(
  drawersConfig: DrawerSpec[] | undefined,
  drawerCount: number,
  cabinetWidthMm = 400,
  cabinetHeightMm = 550,
  cabinetDepthMm = 335
): DrawerSpec[] {
  const safeCount = Math.max(0, Math.min(6, Math.round(Number(drawerCount) || 0)));
  if (safeCount === 0) return [];

  const defaults = generateDefaultDrawers(
    safeCount,
    cabinetWidthMm,
    cabinetHeightMm,
    cabinetDepthMm
  );

  if (!Array.isArray(drawersConfig) || drawersConfig.length === 0) {
    return defaults;
  }

  return defaults.map((def, idx) => {
    const existing = drawersConfig[idx];
    if (!existing) return def;
    const fSides = (
      existing.edgeSidesCount !== undefined ? existing.edgeSidesCount : 4
    ) as 0 | 1 | 2 | 3 | 4;
    const sSides = (
      existing.sidesEdgeCount !== undefined ? existing.sidesEdgeCount : 1
    ) as 0 | 1 | 2 | 3 | 4;
    const bSides = (
      existing.backEdgeCount !== undefined ? existing.backEdgeCount : sSides
    ) as 0 | 1 | 2 | 3 | 4;
    const pricePerM = Number(existing.edgePricePerMeterArs) || 650;

    const merged: DrawerSpec = {
      ...def,
      ...existing,
      index: idx + 1,
      frontWidthMm: Number(existing.frontWidthMm) || def.frontWidthMm,
      frontHeightMm: Number(existing.frontHeightMm) || def.frontHeightMm,
      frontQty: Number(existing.frontQty) || 1,
      sidesDepthMm: Number(existing.sidesDepthMm) || def.sidesDepthMm,
      sidesHeightMm: Number(existing.sidesHeightMm) || def.sidesHeightMm,
      sidesQty: Number(existing.sidesQty) || 2,
      backWidthMm: Number(existing.backWidthMm) || def.backWidthMm,
      backHeightMm: Number(existing.backHeightMm) || def.backHeightMm,
      backQty: Number(existing.backQty) || 1,
      bottomWidthMm: Number(existing.bottomWidthMm) || def.bottomWidthMm,
      bottomDepthMm: Number(existing.bottomDepthMm) || def.bottomDepthMm,
      bottomQty: Number(existing.bottomQty) || 1,
      edgeSidesCount: fSides,
      sidesEdgeCount: sSides,
      backEdgeCount: bSides,
      edgePricePerMeterArs: pricePerM,
      screwsCount: Number(existing.screwsCount) || 16,
      slideQty: Number(existing.slideQty) || 1,
      handleQty: Number(existing.handleQty) || 1,
      customHardware: Array.isArray(existing.customHardware)
        ? existing.customHardware
        : [],
    };

    const computedMeters =
      Number(existing.edgeMeters) > 0
        ? Number(existing.edgeMeters)
        : calcDrawerEdgeMeters(merged);
    merged.edgeMeters = computedMeters;
    merged.edgeCostArs = Math.round(computedMeters * pricePerM);

    return merged;
  });
}

/**
 * Validates whether a custom array of DrawerSpecs physically fits inside the cabinet height
 */
export function validateDrawersFit(
  drawers: DrawerSpec[],
  cabinetHeightMm: number
): {
  valid: boolean;
  totalFrontsHeightMm: number;
  availableHeightMm: number;
  errorMsg?: string;
} {
  const safeList = Array.isArray(drawers) ? drawers : [];
  if (safeList.length === 0) {
    return {
      valid: true,
      totalFrontsHeightMm: 0,
      availableHeightMm: getInternalAvailableHeight(cabinetHeightMm),
    };
  }
  const availableHeightMm = getInternalAvailableHeight(cabinetHeightMm);
  const gapsTotal = Math.max(0, safeList.length - 1) * DRAWER_GAP_MM;
  const frontsSum = safeList.reduce(
    (acc, d) => acc + (Number(d?.frontHeightMm) || 0) * (Number(d?.frontQty) || 1),
    0
  );
  const totalRequired = frontsSum + gapsTotal;

  if (totalRequired > availableHeightMm) {
    return {
      valid: false,
      totalFrontsHeightMm: totalRequired,
      availableHeightMm,
      errorMsg: `Exceso de altura: Los ${safeList.length} frentes de cajón suman ${totalRequired} mm (incluyendo luces de ${DRAWER_GAP_MM} mm), pero el vano interno útil de la mesa (Alto ${cabinetHeightMm} mm) es de ${availableHeightMm} mm.`,
    };
  }

  return {
    valid: true,
    totalFrontsHeightMm: totalRequired,
    availableHeightMm,
  };
}

/**
 * Converts a DrawerSpec[] configuration into CutPieces for the 2D Guillotine
 */
export function getDrawerCutPieces(
  drawers: DrawerSpec[],
  furnitureTitle: string
): Omit<CutPiece, 'id' | 'numberLabel'>[] {
  const safeList = Array.isArray(drawers) ? drawers : [];
  if (safeList.length === 0) return [];
  const cuts: Omit<CutPiece, 'id' | 'numberLabel'>[] = [];

  const mapSidesToEdgeType = (
    s?: 0 | 1 | 2 | 3 | 4
  ): { type: '0L' | '1L' | '2L' | '3L' | '4L'; label: string } => {
    if (s === 0) return { type: '0L', label: 'Sin Tapacantos' };
    if (s === 1) return { type: '1L', label: '1 Lado con filo' };
    if (s === 2) return { type: '2L', label: '2 Lados con filo' };
    if (s === 3) return { type: '3L', label: '3 Lados con filo' };
    return { type: '4L', label: '4 Lados con filo' };
  };

  safeList.forEach((d, i) => {
    const num = d?.index || i + 1;
    const frontEdge = mapSidesToEdgeType(d.edgeSidesCount ?? 4);
    const sideEdge = mapSidesToEdgeType(d.sidesEdgeCount ?? 1);
    const backEdge = mapSidesToEdgeType(d.backEdgeCount ?? d.sidesEdgeCount ?? 1);

    cuts.push({
      name: `${d.frontPieceName || `Frente Cajón #${num}`} (${furnitureTitle})`,
      subtitle: `Frente ${d.frontWidthMm}×${d.frontHeightMm}mm • Melamina 18mm`,
      widthMm: Number(d.frontWidthMm) || 395,
      heightMm: Number(d.frontHeightMm) || 160,
      quantity: Number(d.frontQty) || 1,
      unitPriceArs: 3600,
      edgesLabel: frontEdge.label,
      edgesType: frontEdge.type,
      allowRotation: false,
      mandatoryGrain: true,
    });

    cuts.push({
      name: `${d.sidesPieceName || `Laterales Cajón #${num}`} (${furnitureTitle})`,
      subtitle: `Lateral ${d.sidesDepthMm}×${d.sidesHeightMm}mm • Melamina 18mm`,
      widthMm: Number(d.sidesDepthMm) || 301.5,
      heightMm: Number(d.sidesHeightMm) || 83,
      quantity: Number(d.sidesQty) || 2,
      unitPriceArs: 2800,
      edgesLabel: sideEdge.label,
      edgesType: sideEdge.type,
      allowRotation: true,
      mandatoryGrain: false,
    });

    cuts.push({
      name: `${d.backPieceName || `Contrafrente Cajón #${num}`} (${furnitureTitle})`,
      subtitle: `Contrafrente ${d.backWidthMm}×${d.backHeightMm}mm • Melamina 18mm`,
      widthMm: Number(d.backWidthMm) || 301.5,
      heightMm: Number(d.backHeightMm) || 83,
      quantity: Number(d.backQty) || 1,
      unitPriceArs: 2400,
      edgesLabel: backEdge.label,
      edgesType: backEdge.type,
      allowRotation: true,
      mandatoryGrain: false,
    });
  });

  return cuts;
}

/**
 * Builds dynamic BOM material lines from the configured drawers + structure filo + inventory hardware
 */
export function getDrawerBomItems(
  drawers: DrawerSpec[],
  structureEdgeMeters = 0,
  edgePricePerMeterArs = 650
): BomMaterialItem[] {
  const safeList = Array.isArray(drawers) ? drawers : [];

  const drawersEdgeMeters = safeList.reduce(
    (acc, d) => acc + (Number(d?.edgeMeters) || 0),
    0
  );
  const totalEdgeMeters = Number(
    (drawersEdgeMeters + (Number(structureEdgeMeters) || 0)).toFixed(2)
  );
  const safeEdgePrice = Math.max(0, Number(edgePricePerMeterArs) || 650);

  const bom: BomMaterialItem[] = [];

  if (totalEdgeMeters > 0) {
    bom.push({
      id: 'bom-drw-edge',
      code: 'F01',
      name: safeList[0]?.edgeType || 'Filo PVC 22mm × 0.45mm',
      subtitle: `Estructura (${structureEdgeMeters.toFixed(2)}m) + Cajones (${drawersEdgeMeters.toFixed(2)}m)`,
      unitPriceArs: safeEdgePrice,
      unitLabel: 'm',
      quantity: totalEdgeMeters,
      step: 0.5,
      iconType: 'edge',
    });
  }

  if (safeList.length === 0) return bom;

  const totalSlides = safeList.reduce(
    (acc, d) => acc + (Number(d?.slideQty) || 0),
    0
  );
  const totalHandles = safeList.reduce(
    (acc, d) => acc + (Number(d?.handleQty) || 0),
    0
  );
  const totalScrews = safeList.reduce(
    (acc, d) => acc + (Number(d?.screwsCount) || 16),
    0
  );
  const totalBottomAreaM2 = Number(
    safeList
      .reduce(
        (acc, d) =>
          acc +
          ((Number(d?.bottomWidthMm) || 300) *
            (Number(d?.bottomDepthMm) || 300) *
            (Number(d?.bottomQty) || 1)) /
            1_000_000,
        0
      )
      .toFixed(2)
  );

  const slideLabel = safeList[0]?.slideType;
  const handleLabel = safeList[0]?.handleType;

  if (slideLabel && totalSlides > 0) {
    bom.push({
      id: 'bom-drw-slides',
      code: 'C01',
      name: slideLabel,
      subtitle: `${totalSlides} par(es) para ${safeList.length} cajón(es)`,
      unitPriceArs: 6800,
      unitLabel: 'par',
      quantity: totalSlides,
      step: 1,
      iconType: 'slide',
    });
  }

  if (handleLabel && totalHandles > 0) {
    bom.push({
      id: 'bom-drw-handles',
      code: 'C02',
      name: handleLabel,
      subtitle: `Herraje frontal asignado (${totalHandles} u.)`,
      unitPriceArs: 2900,
      unitLabel: 'un',
      quantity: totalHandles,
      step: 1,
      iconType: 'leg',
    });
  }

  // Include all custom hardware items selected from Inventory across the drawers
  safeList.forEach((d, dIdx) => {
    if (Array.isArray(d.customHardware)) {
      d.customHardware.forEach((hw, hIdx) => {
        bom.push({
          id: `bom-drw-hw-${dIdx}-${hIdx}`,
          code: `H${dIdx + 1}${hIdx + 1}`,
          name: hw.name,
          subtitle: `Herraje Cajón #${dIdx + 1} (Inventario)`,
          unitPriceArs: hw.unitPriceArs,
          unitLabel: 'un',
          quantity: hw.quantity,
          step: 1,
          iconType: 'screw',
          inventoryItemId: hw.inventoryItemId,
        });
      });
    }
  });

  bom.push(
    {
      id: 'bom-drw-bottom',
      code: 'C03',
      name: safeList[0]?.bottomMaterial || 'Fondo Fibroplus 3mm',
      subtitle: `${safeList.length} fondo(s) de cajón ranurado`,
      unitPriceArs: 14500,
      unitLabel: 'm²',
      quantity: Math.max(0.1, totalBottomAreaM2),
      step: 0.1,
      iconType: 'board',
    },
    {
      id: 'bom-drw-screws',
      code: 'C04',
      name: safeList[0]?.screwType || 'Tornillos Fix Armado de Cajón',
      subtitle: `${totalScrews} tornillos totales para ${safeList.length} cajón(es)`,
      unitPriceArs: 45,
      unitLabel: 'un',
      quantity: totalScrews,
      step: 4,
      iconType: 'screw',
    }
  );

  return bom;
}
