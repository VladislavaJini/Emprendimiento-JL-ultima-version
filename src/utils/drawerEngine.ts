import { DrawerSpec, BomMaterialItem, CutPiece } from '../types/atelier';

export const BOARD_THICKNESS_MM = 18;
export const BACK_PANEL_THICKNESS_MM = 3;
export const SLIDE_CLEARANCE_PER_SIDE_MM = 12.7;
export const DRAWER_GAP_MM = 3;
export const DEFAULT_LEGS_HEIGHT_MM = 120;
export const MIN_DRAWER_FRONT_HEIGHT_MM = 75;

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

  return Array.from({ length: safeCount }, (_, idx) => ({
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
    edgeMeters: Number(
      ((frontWidthMm * 2 + individualFrontHeight * 2) / 1000).toFixed(2)
    ),
    edgeType: 'Filo PVC 22mm × 0.45mm',
    slideType: standardSlideSize,
    slideQty: 1,
    handleType: 'Tirador Perfil Oculto / Pomo Nórdico',
    handleQty: 1,
    screwType: 'Tornillos Fix 3.5×16mm / 4×40mm',
    screwsCount: 16,
  }));
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
      edgeMeters: Number(existing.edgeMeters) || def.edgeMeters,
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
    const internalHeight = getInternalAvailableHeight(cabinetHeightMm, legsHeightMm);
    return { valid: true, totalDrawerHeight: 0, internalHeight };
  }
  const internalHeight = getInternalAvailableHeight(cabinetHeightMm, legsHeightMm);
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
export function getDrawerBomItems(drawers: DrawerSpec[]): BomMaterialItem[] {
  if (!Array.isArray(drawers) || drawers.length === 0) return [];
  const count = drawers.length;

  const totalFrontMeters = drawers.reduce(
    (acc, d) => acc + (Number(d?.edgeMeters) || 1.2),
    0
  );
  const totalSlides = drawers.reduce(
    (acc, d) => acc + (Number(d?.slideQty) || 1),
    0
  );
  const totalHandles = drawers.reduce(
    (acc, d) => acc + (Number(d?.handleQty) || 1),
    0
  );
  const totalScrews = drawers.reduce(
    (acc, d) => acc + (Number(d?.screwsCount) || 16),
    0
  );

  return [
    {
      id: `bom-drw-slides-${count}`,
      code: 'HER-CORR-TEL',
      name: `Par Correderas (${drawers[0]?.slideType || 'Telescópicas 350mm'})`,
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
      name: drawers[0]?.handleType || 'Tirador Perfil Oculto / Pomo Nórdico',
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
      name: drawers[0]?.screwType || 'Tornillos Autoperforantes 3.5×16mm',
      subtitle: `Fijación correderas y fondos (${totalScrews} u.)`,
      unitPriceArs: 45,
      unitLabel: 'unid',
      quantity: totalScrews,
      step: 4,
      iconType: 'screw',
      cadQuantityLabel: `${totalScrews} u.`,
    },
    {
      id: `bom-drw-edge-${count}`,
      code: 'INS-FILO-PVC',
      name: drawers[0]?.edgeType || 'Filo PVC 22×0.45mm (Frentes de Cajón)',
      subtitle: `Sellado de cantos frentes de cajones`,
      unitPriceArs: 650,
      unitLabel: 'm',
      quantity: Math.max(1, Number(totalFrontMeters.toFixed(1))),
      step: 0.5,
      iconType: 'edge',
      cadQuantityLabel: `${totalFrontMeters.toFixed(1)} m`,
    },
  ];
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
    pieces.push({
      name: d.frontPieceName || `Frente Cajón #${idx + 1}`,
      subtitle: `Melamina 18mm • ${d.frontWidthMm} × ${d.frontHeightMm} mm`,
      widthMm: Number(d.frontWidthMm) || 400,
      heightMm: Number(d.frontHeightMm) || 150,
      quantity: Number(d.frontQty) || 1,
      unitPriceArs: 4800,
      edgesLabel: '4 Lados (2L + 2A)',
      edgesType: '4L',
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
      edgesLabel: '1 Canto Superior',
      edgesType: '1L',
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
      edgesLabel: '1 Canto Superior',
      edgesType: '1L',
      allowRotation: true,
      mandatoryGrain: false,
    });
  });

  return pieces;
}
