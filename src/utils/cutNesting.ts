/**
 * 2D Guillotine / Bin-Packing Nesting Algorithm for Melamine & Back-Panel Sheets
 * Supports individual piece rendering, kerf spacing, grain rotation, and multi-board overflow.
 */

export interface NestingItem {
  id: string; // unique instance id, e.g. "cut-123-unit-1"
  pieceId: string;
  unitIndex: number;
  totalUnits: number;
  name: string;
  subtitle: string;
  widthMm: number;
  heightMm: number;
  edgesType: '4L' | '2L' | '1L' | '0L';
  edgesLabel: string;
  allowRotation: boolean;
  mandatoryGrain: boolean;
  unitPriceArs: number;
  colorSwatch?: string;
  numberLabel: string;
}

export interface PlacedPiece {
  id: string;
  pieceId: string;
  unitIndex: number;
  totalUnits: number;
  name: string;
  subtitle: string;
  xMm: number;
  yMm: number;
  widthMm: number; // actual placed width (considering rotation)
  heightMm: number; // actual placed height (considering rotation)
  originalWidthMm: number;
  originalHeightMm: number;
  rotated: boolean;
  edgesType: '4L' | '2L' | '1L' | '0L';
  edgesLabel: string;
  unitPriceArs: number;
  boardIndex: number;
  displayLabel: string;
}

export interface FreeRectangle {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  areaM2: number;
}

export interface BoardNestingResult {
  boardIndex: number;
  boardNumber: number;
  boardWidthMm: number;
  boardHeightMm: number;
  placedPieces: PlacedPiece[];
  boardAreaM2: number;
  usedAreaM2: number;
  wasteAreaM2: number;
  efficiencyPct: number;
  freeRectangles: FreeRectangle[];
}

export interface MultiBoardNestingOutput {
  boards: BoardNestingResult[];
  totalBoardsRequired: number;
  totalPiecesRequested: number;
  totalPiecesPlaced: number;
  totalUsedAreaM2: number;
  totalBoardAreaM2: number;
  overallEfficiencyPct: number;
}

interface RawCutInput {
  id: string;
  name: string;
  subtitle?: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  edgesType?: '4L' | '2L' | '1L' | '0L';
  edgesLabel?: string;
  allowRotation?: boolean;
  mandatoryGrain?: boolean;
  unitPriceArs?: number;
  numberLabel?: string;
}

interface InternalFreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Packs cut pieces onto 1 or more boards using a real Guillotine 2D nesting algorithm.
 */
export function calculate2DGuillotineNesting(
  boardWidthMm: number,
  boardHeightMm: number,
  kerfMm: number,
  grainDirection: 'horizontal' | 'vertical',
  cutInputs: RawCutInput[]
): MultiBoardNestingOutput {
  // 1. Flatten all requests into individual piece units
  const itemsToPack: NestingItem[] = [];

  cutInputs.forEach((cut) => {
    const qty = Math.max(1, cut.quantity || 1);
    for (let i = 1; i <= qty; i++) {
      itemsToPack.push({
        id: `${cut.id}-u${i}`,
        pieceId: cut.id,
        unitIndex: i,
        totalUnits: qty,
        name: cut.name,
        subtitle: cut.subtitle || '',
        widthMm: cut.widthMm,
        heightMm: cut.heightMm,
        edgesType: cut.edgesType || '2L',
        edgesLabel: cut.edgesLabel || 'Cantos 2L Frontal',
        allowRotation: cut.allowRotation ?? true,
        mandatoryGrain: cut.mandatoryGrain ?? false,
        unitPriceArs: cut.unitPriceArs || 0,
        numberLabel:
          qty === 1
            ? `${cut.numberLabel || ''}`
            : `${cut.numberLabel ? `${cut.numberLabel}.` : ''}${i}/${qty}`,
      });
    }
  });

  const totalPiecesRequested = itemsToPack.length;

  if (totalPiecesRequested === 0) {
    const emptyBoardArea = Number(
      ((boardWidthMm * boardHeightMm) / 1_000_000).toFixed(2)
    );
    return {
      boards: [
        {
          boardIndex: 0,
          boardNumber: 1,
          boardWidthMm,
          boardHeightMm,
          placedPieces: [],
          boardAreaM2: emptyBoardArea,
          usedAreaM2: 0,
          wasteAreaM2: emptyBoardArea,
          efficiencyPct: 0,
          freeRectangles: [
            {
              xMm: 0,
              yMm: 0,
              widthMm: boardWidthMm,
              heightMm: boardHeightMm,
              areaM2: emptyBoardArea,
            },
          ],
        },
      ],
      totalBoardsRequired: 1,
      totalPiecesRequested: 0,
      totalPiecesPlaced: 0,
      totalUsedAreaM2: 0,
      totalBoardAreaM2: emptyBoardArea,
      overallEfficiencyPct: 0,
    };
  }

  // 2. Sort items descending by max dimension, then area (Best-Fit Decreasing)
  itemsToPack.sort((a, b) => {
    const maxDimA = Math.max(a.widthMm, a.heightMm);
    const maxDimB = Math.max(b.widthMm, b.heightMm);
    if (maxDimB !== maxDimA) return maxDimB - maxDimA;
    const areaA = a.widthMm * a.heightMm;
    const areaB = b.widthMm * b.heightMm;
    return areaB - areaA;
  });

  const boardResults: BoardNestingResult[] = [];
  const unplacedItems = [...itemsToPack];
  const boardAreaM2 = Number(
    ((boardWidthMm * boardHeightMm) / 1_000_000).toFixed(2)
  );

  let currentBoardIdx = 0;
  const maxBoardsSafety = 20;

  while (unplacedItems.length > 0 && currentBoardIdx < maxBoardsSafety) {
    const placedOnThisBoard: PlacedPiece[] = [];
    let freeRects: InternalFreeRect[] = [
      { x: 0, y: 0, w: boardWidthMm, h: boardHeightMm },
    ];

    const remainingForNextBoards: NestingItem[] = [];

    for (const item of unplacedItems) {
      // Determine allowed orientations
      // If mandatoryGrain is true, or if board grain is vertical and rotation respects grain:
      const canRotate = item.allowRotation && !item.mandatoryGrain;

      let bestFitIdx = -1;
      let bestRotated = false;
      let bestShortSideWaste = Infinity;
      let bestAreaWaste = Infinity;

      for (let rIdx = 0; rIdx < freeRects.length; rIdx++) {
        const fr = freeRects[rIdx];

        // Try standard orientation
        if (item.widthMm <= fr.w && item.heightMm <= fr.h) {
          const shortSideWaste = Math.min(
            fr.w - item.widthMm,
            fr.h - item.heightMm
          );
          const areaWaste = fr.w * fr.h - item.widthMm * item.heightMm;
          if (
            shortSideWaste < bestShortSideWaste ||
            (shortSideWaste === bestShortSideWaste &&
              areaWaste < bestAreaWaste)
          ) {
            bestFitIdx = rIdx;
            bestRotated = false;
            bestShortSideWaste = shortSideWaste;
            bestAreaWaste = areaWaste;
          }
        }

        // Try 90° rotated orientation if allowed
        if (canRotate && item.heightMm <= fr.w && item.widthMm <= fr.h) {
          const shortSideWaste = Math.min(
            fr.w - item.heightMm,
            fr.h - item.widthMm
          );
          const areaWaste = fr.w * fr.h - item.heightMm * item.widthMm;
          if (
            shortSideWaste < bestShortSideWaste ||
            (shortSideWaste === bestShortSideWaste &&
              areaWaste < bestAreaWaste)
          ) {
            bestFitIdx = rIdx;
            bestRotated = true;
            bestShortSideWaste = shortSideWaste;
            bestAreaWaste = areaWaste;
          }
        }
      }

      if (bestFitIdx !== -1) {
        // Place piece in freeRects[bestFitIdx]
        const targetRect = freeRects[bestFitIdx];
        const pw = bestRotated ? item.heightMm : item.widthMm;
        const ph = bestRotated ? item.widthMm : item.heightMm;

        const posX = targetRect.x;
        const posY = targetRect.y;

        placedOnThisBoard.push({
          id: item.id,
          pieceId: item.pieceId,
          unitIndex: item.unitIndex,
          totalUnits: item.totalUnits,
          name: item.name,
          subtitle: item.subtitle,
          xMm: posX,
          yMm: posY,
          widthMm: pw,
          heightMm: ph,
          originalWidthMm: item.widthMm,
          originalHeightMm: item.heightMm,
          rotated: bestRotated,
          edgesType: item.edgesType,
          edgesLabel: item.edgesLabel,
          unitPriceArs: item.unitPriceArs,
          boardIndex: currentBoardIdx,
          displayLabel:
            item.totalUnits > 1
              ? `${item.name} (${item.unitIndex}/${item.totalUnits})`
              : item.name,
        });

        // Guillotine Split of the chosen free rectangle
        // Account for blade kerf spacing
        freeRects.splice(bestFitIdx, 1);

        const wRemaining = targetRect.w - pw - kerfMm;
        const hRemaining = targetRect.h - ph - kerfMm;

        // Guillotine shorter-axis-split heuristic
        if (wRemaining > 0 && hRemaining > 0) {
          if (wRemaining < hRemaining) {
            // Split right rectangle at item height
            freeRects.push({
              x: posX + pw + kerfMm,
              y: posY,
              w: wRemaining,
              h: ph,
            });
            // Split bottom rectangle full width
            freeRects.push({
              x: posX,
              y: posY + ph + kerfMm,
              w: targetRect.w,
              h: hRemaining,
            });
          } else {
            // Split right rectangle full height
            freeRects.push({
              x: posX + pw + kerfMm,
              y: posY,
              w: wRemaining,
              h: targetRect.h,
            });
            // Split bottom rectangle at item width
            freeRects.push({
              x: posX,
              y: posY + ph + kerfMm,
              w: pw,
              h: hRemaining,
            });
          }
        } else if (wRemaining > 0) {
          freeRects.push({
            x: posX + pw + kerfMm,
            y: posY,
            w: wRemaining,
            h: targetRect.h,
          });
        } else if (hRemaining > 0) {
          freeRects.push({
            x: posX,
            y: posY + ph + kerfMm,
            w: targetRect.w,
            h: hRemaining,
          });
        }

        // Clean up zero/negative area rects and sort by area descending
        freeRects = freeRects
          .filter((r) => r.w >= 30 && r.h >= 30)
          .sort((a, b) => b.w * b.h - a.w * a.h);
      } else {
        // Doesn't fit on current board, passes to next board
        remainingForNextBoards.push(item);
      }
    }

    // Calculate metrics for this board
    const usedAreaM2 = Number(
      placedOnThisBoard
        .reduce((sum, p) => sum + (p.widthMm * p.heightMm) / 1_000_000, 0)
        .toFixed(2)
    );
    const wasteAreaM2 = Number(
      Math.max(0, boardAreaM2 - usedAreaM2).toFixed(2)
    );
    const efficiencyPct = Number(
      Math.min(99.4, (usedAreaM2 / Math.max(0.1, boardAreaM2)) * 100).toFixed(1)
    );

    const publicFreeRects: FreeRectangle[] = freeRects
      .filter((r) => (r.w * r.h) / 1_000_000 >= 0.04) // only meaningful scraps (>0.04m²)
      .map((r) => ({
        xMm: r.x,
        yMm: r.y,
        widthMm: Math.round(r.w),
        heightMm: Math.round(r.h),
        areaM2: Number(((r.w * r.h) / 1_000_000).toFixed(2)),
      }));

    boardResults.push({
      boardIndex: currentBoardIdx,
      boardNumber: currentBoardIdx + 1,
      boardWidthMm,
      boardHeightMm,
      placedPieces: placedOnThisBoard,
      boardAreaM2,
      usedAreaM2,
      wasteAreaM2,
      efficiencyPct,
      freeRectangles: publicFreeRects,
    });

    unplacedItems.length = 0;
    unplacedItems.push(...remainingForNextBoards);
    currentBoardIdx++;
  }

  const totalBoardsRequired = Math.max(1, boardResults.length);
  const totalPiecesPlaced = boardResults.reduce(
    (sum, b) => sum + b.placedPieces.length,
    0
  );
  const totalUsedAreaM2 = Number(
    boardResults.reduce((sum, b) => sum + b.usedAreaM2, 0).toFixed(2)
  );
  const totalBoardAreaM2 = Number(
    (totalBoardsRequired * boardAreaM2).toFixed(2)
  );
  const overallEfficiencyPct = Number(
    (
      (totalUsedAreaM2 / Math.max(0.1, totalBoardAreaM2)) *
      100
    ).toFixed(1)
  );

  return {
    boards: boardResults,
    totalBoardsRequired,
    totalPiecesRequested,
    totalPiecesPlaced,
    totalUsedAreaM2,
    totalBoardAreaM2,
    overallEfficiencyPct,
  };
}
