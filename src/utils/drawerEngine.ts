import { DrawerSpec, BomMaterialItem, CutPiece } from '../types/atelier';

export const BOARD_THICKNESS_MM = 18;
export const BACK_PANEL_THICKNESS_MM = 3;
export const SLIDE_CLEARANCE_PER_SIDE_MM = 12.7; // Telescopic slides standard clearance (1/2" = 12.7mm each side)
export const DRAWER_GAP_MM = 3; // Clearance between drawer fronts
export const DEFAULT_LEGS_HEIGHT_MM = 120; // Default patas nórdicas / zócalo
export const MIN_DRAWER_FRONT_HEIGHT_MM = 85; // Minimum functional drawer front height

/**
 * Calculates internal available height for drawers in the cabinet.
 * totalHeight - (top + bottom melamine boards: 36mm) - (patas/zócalo: 120mm)
 */
export function getInternalAvailableHeight(cabinetHeightMm: number, legsHeightMm = DEFAULT_LEGS_HEIGHT_MM): number {
  const structureThickness = BOARD_THICKNESS_MM * 2; // 36mm
  const usable = cabinetHeightMm - structureThickness - legsHeightMm;
  return Math.max(0, usable);
}

/**
 * Calculates maximum number of functional drawers that can physically fit.
 */
export function getMaxDrawersAllowed(cabinetHeightMm: number, legsHeightMm = DEFAULT_LEGS_HEIGHT_MM): number {
  const internalH = getInternalAvailableHeight(cabinetHeightMm, legsHeightMm);
  if (internalH <= 0) return 0;
  // Each drawer needs at least MIN_DRAWER_FRONT_HEIGHT_MM plus DRAWER_GAP_MM
  const max = Math.floor((internalH + DRAWER_GAP_MM) / (MIN_DRAWER_FRONT_HEIGHT_MM + DRAWER_GAP_MM));
  return Math.max(0, max);
}

/**
 * Generates default parametric drawers and their individual piece specifications.
 */
export function generateDefaultDrawers(
  count: number,
  cabinetWidthMm: number,
  cabinetHeightMm: number,
  cabinetDepthMm: number,
  legsHeightMm = DEFAULT_LEGS_HEIGHT_MM
): DrawerSpec[] {
  if (count <= 0) return [];

  const internalH = getInternalAvailableHeight(cabinetHeightMm, legsHeightMm);
  const totalGaps = (count - 1) * DRAWER_GAP_MM;
  const individualFrontHeight = Math.max(
    MIN_DRAWER_FRONT_HEIGHT_MM,
    Math.floor((internalH - totalGaps) / count)
  );

  // Cabinet internal width: cabinetWidth - 2 * 18mm
  const internalWidthMm = Math.max(100, cabinetWidthMm - BOARD_THICKNESS_MM * 2);
  // Drawer box width = internalWidth - 2 * 12.7mm (slide clearance) = internalWidth - 25.4mm
  const drawerBoxWidthMm = Math.max(80, Math.floor(internalWidthMm - SLIDE_CLEARANCE_PER_SIDE_MM * 2));

  // Front width covers the internal opening (or full width minus minimal side gap)
  const frontWidthMm = Math.max(100, cabinetWidthMm - 4); // 2mm side reveal

  // Drawer depth standard: cabinet depth minus 50mm clearance (e.g. 350mm, 400mm, etc.)
  const sidesDepthMm = Math.max(150, Math.floor((cabinetDepthMm - 50) / 50) * 50);
  const sidesHeightMm = Math.max(60, individualFrontHeight - 30);
  
  // Drawer box sub-pieces (contrafrente width = drawerBoxWidth - 2 * 18mm for lateral sides)
  const backWidthMm = Math.max(60, drawerBoxWidthMm - BOARD_THICKNESS_MM * 2);
  const backHeightMm = sidesHeightMm;

  // Bottom fibroplus panel (slides into 4mm groove or nailed to bottom)
  const bottomWidthMm = drawerBoxWidthMm;
  const bottomDepthMm = sidesDepthMm;

  const standardSlideSize = sidesDepthMm >= 400 ? 'Correderas Telescópicas 400mm' : 'Correderas Telescópicas 350mm';

  return Array.from({ length: count }, (_, idx) => ({
    id: `drw-${idx + 1}-${Date.now()}`,
    index: idx + 1,
    frontWidthMm,
    frontHeightMm: individualFrontHeight,
    sidesDepthMm,
    sidesHeightMm,
    backWidthMm,
    backHeightMm,
    bottomWidthMm,
    bottomDepthMm,
    slideType: standardSlideSize,
    handleType: 'Tirador Perfil Oculto Aluminio',
    screwsCount: 16, // 8 corredera + 4 ensamble + 4 frente
    edgeMeters: Number(((frontWidthMm * 2 + individualFrontHeight * 2) / 1000).toFixed(2)),
  }));
}

/**
 * Validates that custom or configured drawers don't physically exceed available internal height.
 */
export function validateDrawersFit(
  drawers: DrawerSpec[],
  cabinetHeightMm: number,
  legsHeightMm = DEFAULT_LEGS_HEIGHT_MM
): { valid: boolean; totalDrawerHeight: number; internalHeight: number; errorMsg?: string } {
  const internalHeight = getInternalAvailableHeight(cabinetHeightMm, legsHeightMm);
  const totalFrontHeight = drawers.reduce((sum, d) => sum + d.frontHeightMm, 0);
  const totalGaps = Math.max(0, drawers.length - 1) * DRAWER_GAP_MM;
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
  if (!drawers || drawers.length === 0) return [];
  const count = drawers.length;

  const totalFrontMeters = drawers.reduce((acc, d) => acc + d.edgeMeters, 0);

  return [
    {
      id: `bom-drw-slides-${count}`,
      code: 'HER-CORR-TEL',
      name: `Par Correderas Telescópicas (${drawers[0]?.slideType || '350mm'})`,
      subtitle: `${count} pares para los ${count} cajones del módulo`,
      unitPriceArs: 8400,
      unitLabel: 'par',
      quantity: count,
      step: 1,
      iconType: 'slide',
      cadQuantityLabel: `${count} pares`,
    },
    {
      id: `bom-drw-handles-${count}`,
      code: 'HER-TIR-PERF',
      name: 'Tirador Perfil Oculto / Pomo Nórdico',
      subtitle: `Tiradores metálicos para frentes de cajón`,
      unitPriceArs: 3200,
      unitLabel: 'unid',
      quantity: count,
      step: 1,
      iconType: 'slide',
      cadQuantityLabel: `${count} u.`,
    },
    {
      id: `bom-drw-screws-${count}`,
      code: 'INS-TORN-3516',
      name: 'Tornillos Autoperforantes 3.5×16mm (Cajones)',
      subtitle: `Fijación correderas y fondos (${count * 16} u.)`,
      unitPriceArs: 45,
      unitLabel: 'unid',
      quantity: count * 16,
      step: 4,
      iconType: 'screw',
      cadQuantityLabel: `${count * 16} u.`,
    },
    {
      id: `bom-drw-edge-${count}`,
      code: 'INS-FILO-PVC',
      name: 'Filo PVC 22×0.45mm (Frentes de Cajón)',
      subtitle: `Sellado de cantos frentes de cajones`,
      unitPriceArs: 650,
      unitLabel: 'm',
      quantity: Math.max(1, Math.ceil(totalFrontMeters)),
      step: 1,
      iconType: 'edge',
      cadQuantityLabel: `${totalFrontMeters.toFixed(1)} m`,
    },
  ];
}

/**
 * Extracts wood cut pieces for Guillotine from drawers.
 */
export function getDrawerWoodCutPieces(drawers: DrawerSpec[]): Omit<CutPiece, 'id' | 'numberLabel'>[] {
  const pieces: Omit<CutPiece, 'id' | 'numberLabel'>[] = [];

  drawers.forEach((d, idx) => {
    // 1 Frente
    pieces.push({
      name: `Frente Cajón #${idx + 1}`,
      subtitle: `Melamina 18mm • ${d.frontWidthMm} × ${d.frontHeightMm} mm`,
      widthMm: d.frontWidthMm,
      heightMm: d.frontHeightMm,
      quantity: 1,
      unitPriceArs: 4800,
      edgesLabel: '4 Lados (2L + 2A)',
      edgesType: '4L',
      allowRotation: true,
      mandatoryGrain: false,
    });

    // 2 Laterales
    pieces.push({
      name: `Laterales Cajón #${idx + 1}`,
      subtitle: `Melamina 18mm • ${d.sidesDepthMm} × ${d.sidesHeightMm} mm`,
      widthMm: d.sidesDepthMm,
      heightMm: d.sidesHeightMm,
      quantity: 2,
      unitPriceArs: 3200,
      edgesLabel: '1 Canto Superior',
      edgesType: '1L',
      allowRotation: true,
      mandatoryGrain: false,
    });

    // 1 Contrafrente
    pieces.push({
      name: `Contrafrente Cajón #${idx + 1}`,
      subtitle: `Melamina 18mm • ${d.backWidthMm} × ${d.backHeightMm} mm`,
      widthMm: d.backWidthMm,
      heightMm: d.backHeightMm,
      quantity: 1,
      unitPriceArs: 2900,
      edgesLabel: '1 Canto Superior',
      edgesType: '1L',
      allowRotation: true,
      mandatoryGrain: false,
    });
  });

  return pieces;
}
