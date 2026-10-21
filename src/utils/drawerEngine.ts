import { DrawerSpec, BomMaterialItem, CutPiece } from '../types/atelier';

export const BOARD_THICKNESS_MM = 18;
export const BACK_PANEL_THICKNESS_MM = 3;
export const SLIDE_CLEARANCE_PER_SIDE_MM = 12.7;
export const DRAWER_GAP_MM = 3;
export const DEFAULT_LEGS_HEIGHT_MM = 120;
export const MIN_DRAWER_FRONT_HEIGHT_MM = 75;

/**
 * Calculates linear edge banding meters for a rectangular piece given 0, 1, 2, 3, or 4 sides.
 * dim1Mm = Largo (mm), dim2Mm = Profundidad o Alto (mm)
 */
export function calcPieceEdgeMetersBySides(
  dim1Mm: number,
  dim2Mm: number,
  sidesCount: 0 | 1 | 2 | 3 | 4,
  qty = 1
): number {
  const l = Math.max(0, Number(dim1Mm) || 0);
  const d = Math.max(0, Number(dim2Mm) || 0);
  const q = Math.max(1, Number(qty) || 1);
  let mmPerUnit = 0;

  switch (sidesCount) {
    case 1:
      mmPerUnit = l;
      break;
    case 2:
      mmPerUnit = l * 2;
      break;
    case 3:
      mmPerUnit = l * 2 + d;
      break;
    case 4:
      mmPerUnit = l * 2 + d * 2;
      break;
    case 0:
    default:
      mmPerUnit = 0;
      break;
  }

  return Number(((mmPerUnit * q) / 1000).toFixed(2));
}

/**
 * Calculates total linear edge banding meters for the 4 main cabinet structure pieces
 * (Tapa: Largo×Prof, Piso: Largo×Prof, 2 Laterales: Alto×Prof) according to chosen sides (0..4).
 */
export function calcCabinetStructureEdgeMeters(
  widthMm: number,
  heightMm: number,
  depthMm: number,
  sidesCount: 0 | 1 | 2 | 3 | 4
): number {
  const w = Math.max(0, Number(widthMm) || 450);
  const h = Math.max(0, Number(heightMm) || 550);
  const d = Math.max(0, Number(depthMm) || 380);

  // Tapa (1) + Piso (1)
  const horizontalMeters = calcPieceEdgeMetersBySides(w, d, sidesCount, 2);
  // Laterales (2)
  const verticalMeters = calcPieceEdgeMetersBySides(h, d, sidesCount, 2);

  return Number((horizontalMeters + verticalMeters).toFixed(2));
}

/**
 * Calculates total linear edge meters for a single drawer based on its front sides (0..4)
 * and lateral/back sides (0..4).
 */
export function calcDrawerEdgeMeters(drawer: {
  frontWidthMm?: number;
  frontHeightMm?: number;
  frontQty?: number;
  sidesDepthMm?: number;
  sidesHeightMm?: number;
  sidesQty?: number;
  backWidthMm?: number;
  backHeightMm?: number;
  backQty?: number;
  edgeSidesCount?: 0 | 1 | 2 | 3 | 4;
  sidesEdgeCount?: 0 | 1 | 2 | 3 | 4;
}): number {
  const frontSides = (
    drawer.edgeSidesCount !== undefined ? drawer.edgeSidesCount : 4
  ) as 0 | 1 | 2 | 3 | 4;
  const innerSides = (
    drawer.sidesEdgeCount !== undefined ? drawer.sidesEdgeCount : 1
  ) as 0 | 1 | 2 | 3 | 4;

  const frontM = calcPieceEdgeMetersBySides(
    Number(drawer.frontWidthMm) || 400,
    Number(drawer.frontHeightMm) || 150,
    frontSides,
    Number(drawer.frontQty) || 1
  );

  const sidesM = calcPieceEdgeMetersBySides(
    Number(drawer.sidesDepthMm) || 350,
    Number(drawer.sidesHeightMm) || 120,
    innerSides,
    Number(drawer.sidesQty) || 2
  );

  const backM = calcPieceEdgeMetersBySides(
    Number(drawer.backWidthMm) || 350,
    Number(drawer.backHeightMm) || 120,
    innerSides,
    Number(drawer.backQty) || 1
  );

  return Number((frontM + sidesM + backM).toFixed(2));
}

/**
 * Calculates internal available height for drawers in the cabinet.
 * totalHeight - (top + bottom melamine boards: 36mm) - (patas/zócalo: 120mm, or 60mm for lower cabinets)
 */
export function getInternalAvailableHeight(
  cabinetHeightMm: number,
  legsHeightMm?: number
): number {
  const safeH = Number(cabinetHeightMm) || 550;
  const effectiveLegs =
    legsHeightMm !== undefined
      ? legsHeightMm
      : safeH <= 420
      ? 60
      : DEFAULT_LEGS_HEIGHT_MM;
  const structureThickness = BOARD_THICKNESS_MM * 2; // 36mm
  const usable = safeH - structureThickness - effectiveLegs;
  return Math.max(0, usable);
}

/**
 * Calculates maximum number of functional drawers that can physically fit (up to 6).
 */
export function getMaxDrawersAllowed(
  cabinetHeightMm: number,
  legsHeightMm?: number
): number {
  const internalH = getInternalAvailableHeight(cabinetHeightMm, legsHeightMm);
  if (internalH <= 0) return 0;
  const max = Math.floor(
    (internalH + DRAWER_GAP_MM) / (MIN_DRAWER_FRONT_HEIGHT_MM + DRAWER_GAP_MM)
  );
  return Math.max(0, Math.min(6, max));
}

/**
 * Generates default parametric drawers and their individual piece specifications.
 */
export function generateDefaultDrawers(
  count: number,
  cabinetWidthMm: number,
  cabinetHeightMm: number,
  cabinetDepthMm: number,
  legsHeightMm?: number
): DrawerSpec[] {
  const safeCount = Math.max(0, Math.min(6, Number(count) || 0));
  if (safeCount <= 0) return [];

  const safeW = Number(cabinetWidthMm) || 450;
  const safeH = Number(cabinetHeightMm) || 550;
  const safeD = Number(cabinetDepthMm) || 380;

  const internalH = getInternalAvailableHeight(safeH, legsHeightMm);
  const totalGaps = (safeCount - 1) * DRAWER_GAP_MM;
  const individualFrontHeight = Math.max(
    MIN_DRAWER_FRONT_HEIGHT_MM,
    Math.floor((internalH - totalGaps) / safeCount)
  );

  const internalWidthMm = Math.max(100, safeW - BOARD_THICKNESS_MM * 2);
  const drawerBoxWidthMm = Math.max(
    80,
    Math.floor(internalWidthMm - SLIDE_CLEARANCE_PER_SIDE_MM * 2)
  );

  const frontWidthMm = Math.max(100, safeW - 4);
  const sidesDepthMm = Math.max(150, Math.floor((safeD - 50) / 50) * 50);
  const sidesHeightMm = Math.max(60, individualFrontHeight - 25);

  const backWidthMm = Math.max(60, drawerBoxWidthMm - BOARD_THICKNESS_MM * 2);
  const backHeightMm = sidesHeightMm;

  const bottomWidthMm = drawerBoxWidthMm;
  const bottomDepthMm = sidesDepthMm;

  const standardSlideSize =
    sidesDepthMm >= 400
      ? 'Correderas Telescópicas 400mm H45'
      : 'Correderas Telescópicas 350mm H45';

  const defaultEdgeSidesCount: 0 | 1 | 2 | 3 | 4 = 4;
  const defaultSidesEdgeCount: 0 | 1 | 2 | 3 | 4 = 1;
  const defaultPricePerM = 650;

  return Array.from({ length: safeCount }, (_, idx) => {
    const calculatedEdgeMeters = calcDrawerEdgeMeters({
      frontWidthMm,
      frontHeightMm: individualFrontHeight,
      frontQty: 1,
      sidesDepthMm,
      sidesHeightMm,
      sidesQty: 2,
      backWidthMm,
      backHeightMm,
      backQty: 1,
      edgeSidesCount: defaultEdgeSidesCount,
      sidesEdgeCount: defaultSidesEdgeCount,
    });

    return {
      id: `drw-${idx + 1}-${Date.now()}-${idx}`,
      index: idx + 1,
      frontPieceName: 'Frente de Cajón Melamina 18mm',
      frontWidthMm,
      frontHeightMm: individualFrontHeight,
      frontQty: 1,
      sidesPieceName: 'Laterales de Cajón 18mm',
      sidesDepthMm,
      sidesHeightMm,
      sidesQty: 2,
      backPieceName: 'Contrafrente de Cajón 18mm',
      backWidthMm,
      backHeightMm,
      backQty: 1,
      bottomWidthMm,
      bottomDepthMm,
      bottomQty: 1,
      bottomMaterial: 'Fondo Fibroplus 3mm Blanco',
      edgeSidesCount: defaultEdgeSidesCount,
      sidesEdgeCount: defaultSidesEdgeCount,
      edgeMeters: calculatedEdgeMeters,
      edgePricePerMeterArs: defaultPricePerM,
      edgeCostArs: Math.round(calculatedEdgeMeters * defaultPricePerM),
      edgeType: 'Filo PVC 22mm × 0.45mm',
      slideType: standardSlideSize,
      slideQty: 1,
      handleType: 'Tirador Perfil Oculto / Pomo Nórdico',
      handleQty: 1,
      screwType: 'Tornillos Fix 3.5×16mm / 4×40mm',
      screwsCount: 16,
    };
  });
}

/**
 * Safely normalizes an existing array of DrawerSpec so older saved items never crash the UI.
 */
export function normalizeDrawersConfig(
  drawers: DrawerSpec[] | undefined,
  count: number,
  cabinetWidthMm: number,
  cabinetHeightMm: number,
  cabinetDepthMm: number
): DrawerSpec[] {
  const safeCount = Math.max(0, Math.min(6, Number(count) || 0));
  if (safeCount === 0) return [];
  const defaults = generateDefaultDrawers(
    safeCount,
    cabinetWidthMm,
    cabinetHeightMm,
    cabinetDepthMm
  );
  if (!Array.isArray(drawers) || drawers.length === 0) {
    return defaults;
  }
  return defaults.map((def, idx) => {
    const existing = drawers[idx];
    if (!existing) return def;
    const edgeSidesCount = (
      existing.edgeSidesCount !== undefined ? existing.edgeSidesCount : 4
    ) as 0 | 1 | 2 | 3 | 4;
    const sidesEdgeCount = (
      existing.sidesEdgeCount !== undefined ? existing.sidesEdgeCount : 1
    ) as 0 | 1 | 2 | 3 | 4;
    const pricePerM = Number(existing.edgePricePerMeterArs) || 650;
    const computedMeters =
      Number(existing.edgeMeters) ||
      calcDrawerEdgeMeters({
        ...def,
        ...existing,
        edgeSidesCount,
        sidesEdgeCount,
      });

    return {
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
      edgeSidesCount,
      sidesEdgeCount,
      edgeMeters: computedMeters,
      edgePricePerMeterArs: pricePerM,
      edgeCostArs: Math.round(computedMeters * pricePerM),
      slideQty: Number(existing.slideQty) || 1,
      handleQty: Number(existing.handleQty) || 1,
      screwsCount: Number(existing.screwsCount) || 16,
    };
  });
}

/**
 * Validates that custom or configured drawers don't physically exceed available internal height.
 */
export function validateDrawersFit(
  drawers: DrawerSpec[],
  cabinetHeightMm: number,
  legsHeightMm?: number
): {
  valid: boolean;
  totalDrawerHeight: number;
  internalHeight: number;
  errorMsg?: string;
} {
  const safeDrawers = Array.isArray(drawers) ? drawers : [];
  if (safeDrawers.length === 0) {
    const internalHeight = getInternalAvailableHeight(
      cabinetHeightMm,
      legsHeightMm
    );
    return { valid: true, totalDrawerHeight: 0, internalHeight };
  }
  const internalHeight = getInternalAvailableHeight(
    cabinetHeightMm,
    legsHeightMm
  );
  const totalFrontHeight = safeDrawers.reduce(
    (sum, d) => sum + (Number(d?.frontHeightMm) || MIN_DRAWER_FRONT_HEIGHT_MM),
    0
  );
  const totalGaps = Math.max(0, safeDrawers.length - 1) * DRAWER_GAP_MM;
  const totalNeeded = totalFrontHeight + totalGaps;

  if (totalNeeded > internalHeight) {
    const maxDrawers = getMaxDrawersAllowed(cabinetHeightMm, legsHeightMm);
    return {
      valid: false,
      totalDrawerHeight: totalNeeded,
      internalHeight,
      errorMsg: `Límite físico alcanzado: En una altura útil de ${internalHeight} mm caben máximo ${maxDrawers} cajones (Total requerido: ${totalNeeded} mm).`,
    };
  }

  return {
    valid: true,
    totalDrawerHeight: totalNeeded,
    internalHeight,
  };
}

/**
 * Converts drawers into BOM materials and wood cut pieces for Guillotine.
 */
export function getDrawerBomItems(
  drawers: DrawerSpec[],
  structureEdgeMeters = 0,
  edgePricePerMeterArs = 650
): BomMaterialItem[] {
  const safeDrawers = Array.isArray(drawers) ? drawers : [];
  const count = safeDrawers.length;

  const totalDrawerMeters = safeDrawers.reduce(
    (acc, d) => acc + (Number(d?.edgeMeters) || 0),
    0
  );
  const totalCombinedEdgeMeters = Number(
    (totalDrawerMeters + Math.max(0, Number(structureEdgeMeters) || 0)).toFixed(
      2
    )
  );
  const effectiveEdgePrice =
    Number(edgePricePerMeterArs) ||
    Number(safeDrawers[0]?.edgePricePerMeterArs) ||
    650;

  const items: BomMaterialItem[] = [];

  if (count > 0) {
    const totalSlides = safeDrawers.reduce(
      (acc, d) => acc + (Number(d?.slideQty) || 1),
      0
    );
    const totalHandles = safeDrawers.reduce(
      (acc, d) => acc + (Number(d?.handleQty) || 1),
      0
    );
    const totalScrews = safeDrawers.reduce(
      (acc, d) => acc + (Number(d?.screwsCount) || 16),
      0
    );

    items.push(
      {
        id: `bom-drw-slides-${count}`,
        code: 'HER-CORR-TEL',
        name: `Par Correderas (${
          safeDrawers[0]?.slideType || 'Telescópicas 350mm'
        })`,
        subtitle: `${totalSlides} pares para los ${count} cajones del módulo`,
        unitPriceArs: 8400,
        unitLabel: 'par',
        quantity: totalSlides,
        step: 1,
        iconType: 'slide',
        cadQuantityLabel: `${totalSlides} pares`,
      },
      {
        id: `bom-drw-handles-${count}`,
        code: 'HER-TIR-PERF',
        name:
          safeDrawers[0]?.handleType || 'Tirador Perfil Oculto / Pomo Nórdico',
        subtitle: `Tiradores para frentes de cajón`,
        unitPriceArs: 3200,
        unitLabel: 'unid',
        quantity: totalHandles,
        step: 1,
        iconType: 'slide',
        cadQuantityLabel: `${totalHandles} u.`,
      },
      {
        id: `bom-drw-screws-${count}`,
        code: 'INS-TORN-3516',
        name:
          safeDrawers[0]?.screwType || 'Tornillos Autoperforantes 3.5×16mm',
        subtitle: `Fijación correderas y fondos (${totalScrews} u.)`,
        unitPriceArs: 45,
        unitLabel: 'unid',
        quantity: totalScrews,
        step: 4,
        iconType: 'screw',
        cadQuantityLabel: `${totalScrews} u.`,
      }
    );
  }

  if (totalCombinedEdgeMeters > 0) {
    items.push({
      id: `bom-drw-edge-${count}`,
      code: 'INS-FILO-PVC',
      name:
        safeDrawers[0]?.edgeType ||
        'Filo PVC 22×0.45mm (Estructura + Cajones)',
      subtitle: `Cálculo automático según lados con filo (${totalCombinedEdgeMeters.toFixed(
        2
      )} m)`,
      unitPriceArs: effectiveEdgePrice,
      unitLabel: 'm',
      quantity: totalCombinedEdgeMeters,
      step: 0.5,
      iconType: 'edge',
      cadQuantityLabel: `${totalCombinedEdgeMeters.toFixed(2)} m`,
    });
  }

  return items;
}

/**
 * Extracts wood cut pieces for Guillotine from drawers.
 */
export function getDrawerWoodCutPieces(
  drawers: DrawerSpec[]
): Omit<CutPiece, 'id' | 'numberLabel'>[] {
  const pieces: Omit<CutPiece, 'id' | 'numberLabel'>[] = [];
  if (!Array.isArray(drawers)) return pieces;

  drawers.forEach((d, idx) => {
    const frontSides = d.edgeSidesCount !== undefined ? d.edgeSidesCount : 4;
    const innerSides = d.sidesEdgeCount !== undefined ? d.sidesEdgeCount : 1;

    const mapSidesToCode = (
      s: number
    ): { type: '0L' | '1L' | '2L' | '3L' | '4L'; label: string } => {
      if (s === 0) return { type: '0L', label: '0 Lados (Sin filo)' };
      if (s === 1) return { type: '1L', label: '1 Lado con filo' };
      if (s === 2) return { type: '2L', label: '2 Lados con filo' };
      if (s === 3) return { type: '3L', label: '3 Lados con filo' };
      return { type: '4L', label: '4 Lados con filo' };
    };

    const frontEdge = mapSidesToCode(frontSides);
    const innerEdge = mapSidesToCode(innerSides);

    pieces.push({
      name: d.frontPieceName || `Frente Cajón #${idx + 1}`,
      subtitle: `Melamina 18mm • ${d.frontWidthMm} × ${d.frontHeightMm} mm`,
      widthMm: Number(d.frontWidthMm) || 400,
      heightMm: Number(d.frontHeightMm) || 150,
      quantity: Number(d.frontQty) || 1,
      unitPriceArs: 4800,
      edgesLabel: frontEdge.label,
      edgesType: frontEdge.type,
      allowRotation: true,
      mandatoryGrain: false,
    });

    pieces.push({
      name: d.sidesPieceName || `Laterales Cajón #${idx + 1}`,
      subtitle: `Melamina 18mm • ${d.sidesDepthMm} × ${d.sidesHeightMm} mm`,
      widthMm: Number(d.sidesDepthMm) || 350,
      heightMm: Number(d.sidesHeightMm) || 120,
      quantity: Number(d.sidesQty) || 2,
      unitPriceArs: 3200,
      edgesLabel: innerEdge.label,
      edgesType: innerEdge.type,
      allowRotation: true,
      mandatoryGrain: false,
    });

    pieces.push({
      name: d.backPieceName || `Contrafrente Cajón #${idx + 1}`,
      subtitle: `Melamina 18mm • ${d.backWidthMm} × ${d.backHeightMm} mm`,
      widthMm: Number(d.backWidthMm) || 350,
      heightMm: Number(d.backHeightMm) || 120,
      quantity: Number(d.backQty) || 1,
      unitPriceArs: 2900,
      edgesLabel: innerEdge.label,
      edgesType: innerEdge.type,
      allowRotation: true,
      mandatoryGrain: false,
    });
  });

  return pieces;
}
