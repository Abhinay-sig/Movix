function indexToRowLabel(idx) {
  // 0 -> A, 25 -> Z, 26 -> AA ... 49 -> AX
  let n = idx;
  let label = '';
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function rowLabelToIndex(label) {
  const s = label.toUpperCase();
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n - 1;
}

function parseSeatCode(seatCode) {
  const m = String(seatCode).toUpperCase().trim().match(/^([A-Z]{1,3})(\d{1,3})$/);
  if (!m) return null;
  const rowLabel = m[1];
  const col1 = Number(m[2]);
  if (!Number.isFinite(col1)) return null;
  return { rowIdx: rowLabelToIndex(rowLabel), colIdx: col1 - 1 };
}

function layoutHasSeat(layout, rowIdx, colIdx) {
  if (!layout) return false;
  if (rowIdx < 0 || rowIdx >= layout.rows) return false;
  if (colIdx < 0 || colIdx >= layout.cols) return false;
  const rowSegs = layout.segmentsByRow?.[rowIdx];
  if (!Array.isArray(rowSegs)) return false;
  for (let i = 0; i < rowSegs.length; i += 2) {
    const start = rowSegs[i];
    const end = rowSegs[i + 1];
    if (typeof start !== 'number' || typeof end !== 'number') continue;
    if (colIdx >= start && colIdx <= end) return true;
  }
  return false;
}

function seatTypeForSeat(layout, rowIdx, colIdx) {
  const typed = layout?.typedSegmentsByRow?.[rowIdx];
  if (!Array.isArray(typed)) return null;
  for (const seg of typed) {
    if (!seg) continue;
    const { start, end, type } = seg;
    if (typeof start !== 'number' || typeof end !== 'number') continue;
    if (colIdx >= start && colIdx <= end) return type ?? null;
  }
  return null;
}

module.exports = {
  indexToRowLabel,
  rowLabelToIndex,
  parseSeatCode,
  layoutHasSeat,
  seatTypeForSeat,
};

