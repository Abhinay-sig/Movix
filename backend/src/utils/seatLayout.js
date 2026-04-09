// function indexToRowLabel(idx) {
//   // 0 -> A, 25 -> Z, 26 -> AA ... 49 -> AX
//   let n = idx;
//   let label = '';
//   while (n >= 0) {
//     label = String.fromCharCode((n % 26) + 65) + label;
//     n = Math.floor(n / 26) - 1;
//   }
//   return label;
// }

// function rowLabelToIndex(label) {
//   const s = label.toUpperCase();
//   let n = 0;
//   for (let i = 0; i < s.length; i++) {
//     n = n * 26 + (s.charCodeAt(i) - 64);
//   }
//   return n - 1;
// }

// function parseSeatCode(seatCode) {
//   const m = String(seatCode).toUpperCase().trim().match(/^([A-Z]{1,3})(\d{1,3})$/);
//   if (!m) return null;
//   const rowLabel = m[1];
//   const col1 = Number(m[2]);
//   if (!Number.isFinite(col1)) return null;
//   return { rowIdx: rowLabelToIndex(rowLabel), colIdx: col1 - 1 };
// }

// function layoutHasSeat(layout, rowIdx, colIdx) {
//   if (!layout) return false;
//   if (rowIdx < 0 || rowIdx >= layout.rows) return false;
//   if (colIdx < 0 || colIdx >= layout.cols) return false;
//   const rowSegs = layout.segmentsByRow?.[rowIdx];
//   if (!Array.isArray(rowSegs)) return false;
//   for (let i = 0; i < rowSegs.length; i += 2) {
//     const start = rowSegs[i];
//     const end = rowSegs[i + 1];
//     if (typeof start !== 'number' || typeof end !== 'number') continue;
//     if (colIdx >= start && colIdx <= end) return true;
//   }
//   return false;
// }

// function seatTypeForSeat(layout, rowIdx, colIdx) {
//   const typed = layout?.typedSegmentsByRow?.[rowIdx];
//   if (!Array.isArray(typed)) return null;
//   for (const seg of typed) {
//     if (!seg) continue;
//     const { start, end, type } = seg;
//     if (typeof start !== 'number' || typeof end !== 'number') continue;
//     if (colIdx >= start && colIdx <= end) return type ?? null;
//   }
//   return null;
// }

// module.exports = {
//   indexToRowLabel,
//   rowLabelToIndex,
//   parseSeatCode,
//   layoutHasSeat,
//   seatTypeForSeat,
// };




function indexToRowLabel(idx) {
  if (!Number.isInteger(idx) || idx < 0) return null;

  let n = idx;
  let label = '';

  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }

  return label;
}

function rowLabelToIndex(label) {
  if (typeof label !== 'string' || !/^[A-Z]+$/.test(label)) return null;

  let idx = 0;
  for (let i = 0; i < label.length; i += 1) {
    idx = idx * 26 + (label.charCodeAt(i) - 64);
  }

  return idx - 1;
}

function seatCode(rowIdx, colIdx) {
  const rowLabel = indexToRowLabel(rowIdx);
  if (rowLabel == null || !Number.isInteger(colIdx) || colIdx < 0) return null;
  return `${rowLabel}${colIdx + 1}`;
}

function parseSeatCode(code) {
  if (typeof code !== 'string') return null;

  const cleaned = code.trim().toUpperCase();
  const match = cleaned.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;

  const rowIdx = rowLabelToIndex(match[1]);
  const colIdx = Number(match[2]) - 1;

  if (rowIdx == null || !Number.isInteger(colIdx) || colIdx < 0) return null;

  return { rowIdx, colIdx };
}

function getSegmentsByRow(layoutOrSegments) {
  if (Array.isArray(layoutOrSegments)) return layoutOrSegments;
  if (layoutOrSegments && Array.isArray(layoutOrSegments.segmentsByRow)) {
    return layoutOrSegments.segmentsByRow;
  }
  return null;
}

function getTypedSegmentsByRow(layoutOrSegments) {
  if (layoutOrSegments && Array.isArray(layoutOrSegments.typedSegmentsByRow)) {
    return layoutOrSegments.typedSegmentsByRow;
  }
  return null;
}

function getLayoutBounds(layout) {
  const rows = Number(layout?.rows || 0);
  const cols = Number(layout?.cols || 0);
  const segmentsByRow = getSegmentsByRow(layout) || [];

  let minRow = rows;
  let maxRow = -1;
  let minCol = cols;
  let maxCol = -1;

  for (let rowIdx = 0; rowIdx < rows; rowIdx += 1) {
    const row = segmentsByRow[rowIdx];
    if (!Array.isArray(row) || row.length === 0) continue;

    minRow = Math.min(minRow, rowIdx);
    maxRow = Math.max(maxRow, rowIdx);

    for (let i = 0; i < row.length; i += 2) {
      minCol = Math.min(minCol, Number(row[i]));
      maxCol = Math.max(maxCol, Number(row[i + 1]));
    }
  }

  if (maxRow === -1 || maxCol === -1) {
    return {
      minRow: 0,
      maxRow: -1,
      minCol: 0,
      maxCol: -1,
      visibleRows: 0,
      visibleCols: 0,
    };
  }

  return {
    minRow,
    maxRow,
    minCol,
    maxCol,
    visibleRows: maxRow - minRow + 1,
    visibleCols: maxCol - minCol + 1,
  };
}

function layoutHasSeat(layoutOrSegments, rowIdx, colIdx) {
  const segmentsByRow = getSegmentsByRow(layoutOrSegments);
  if (!segmentsByRow) return false;
  if (!Number.isInteger(rowIdx) || !Number.isInteger(colIdx)) return false;
  if (rowIdx < 0 || colIdx < 0) return false;

  const layout = layoutOrSegments && !Array.isArray(layoutOrSegments) ? layoutOrSegments : null;
  if (layout?.rows != null && rowIdx >= Number(layout.rows)) return false;
  if (layout?.cols != null && colIdx >= Number(layout.cols)) return false;

  const row = segmentsByRow[rowIdx];
  if (!Array.isArray(row)) return false;

  for (let i = 0; i < row.length; i += 2) {
    const start = Number(row[i]);
    const end = Number(row[i + 1]);

    if (Number.isInteger(start) && Number.isInteger(end) && colIdx >= start && colIdx <= end) {
      return true;
    }
  }

  return false;
}

function seatTypeForSeat(layoutOrSegments, rowIdx, colIdx) {
  const typedSegmentsByRow = getTypedSegmentsByRow(layoutOrSegments);
  if (!typedSegmentsByRow || !Number.isInteger(rowIdx) || !Number.isInteger(colIdx)) {
    return null;
  }

  const row = typedSegmentsByRow[rowIdx];
  if (!Array.isArray(row)) return null;

  for (const seg of row) {
    if (!seg) continue;

    const start = Number(seg.start);
    const end = Number(seg.end);
    const type = typeof seg.type === 'string' ? seg.type.trim().toLowerCase() : '';

    if (
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      type &&
      colIdx >= start &&
      colIdx <= end
    ) {
      return type;
    }
  }

  return null;
}

function toPublicSeatCode(layout, rowIdx, colIdx) {
  const bounds = getLayoutBounds(layout);
  if (!Number.isInteger(rowIdx) || !Number.isInteger(colIdx)) return null;
  return seatCode(rowIdx - bounds.minRow, colIdx - bounds.minCol);
}

function parseSeatCodeForLayout(layout, code) {
  const parsed = parseSeatCode(code);
  if (!parsed) return null;

  if (layoutHasSeat(layout, parsed.rowIdx, parsed.colIdx)) {
    return {
      rowIdx: parsed.rowIdx,
      colIdx: parsed.colIdx,
      absoluteSeatCode: seatCode(parsed.rowIdx, parsed.colIdx),
      publicSeatCode: toPublicSeatCode(layout, parsed.rowIdx, parsed.colIdx),
    };
  }

  const bounds = getLayoutBounds(layout);
  const shiftedRowIdx = parsed.rowIdx + bounds.minRow;
  const shiftedColIdx = parsed.colIdx + bounds.minCol;

  if (!layoutHasSeat(layout, shiftedRowIdx, shiftedColIdx)) {
    return null;
  }

  return {
    rowIdx: shiftedRowIdx,
    colIdx: shiftedColIdx,
    absoluteSeatCode: seatCode(shiftedRowIdx, shiftedColIdx),
    publicSeatCode: toPublicSeatCode(layout, shiftedRowIdx, shiftedColIdx),
  };
}

module.exports = {
  getLayoutBounds,
  indexToRowLabel,
  rowLabelToIndex,
  seatCode,
  parseSeatCode,
  parseSeatCodeForLayout,
  layoutHasSeat,
  seatTypeForSeat,
  toPublicSeatCode,
};
