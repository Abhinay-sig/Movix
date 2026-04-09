export function indexToRowLabel(idx) {
  let n = idx
  let label = ''
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label
    n = Math.floor(n / 26) - 1
  }
  return label
}

export function seatCode(rowIdx, colIdx) {
  return `${indexToRowLabel(rowIdx)}${colIdx + 1}`
}

export function hasSeat(segmentsByRow, rowIdx, colIdx) {
  const row = segmentsByRow?.[rowIdx]
  if (!Array.isArray(row)) return false
  for (let i = 0; i < row.length; i += 2) {
    const start = row[i]
    const end = row[i + 1]
    if (colIdx >= start && colIdx <= end) return true
  }
  return false
}

export function seatTypeAt(typedSegmentsByRow, rowIdx, colIdx) {
  const row = typedSegmentsByRow?.[rowIdx]
  if (!Array.isArray(row)) return null

  for (const segment of row) {
    if (!segment) continue
    const start = Number(segment.start)
    const end = Number(segment.end)
    if (Number.isInteger(start) && Number.isInteger(end) && colIdx >= start && colIdx <= end) {
      return segment.type || null
    }
  }

  return null
}

export function getLayoutBounds(layout) {
  const rows = Number(layout?.rows || 0)
  const cols = Number(layout?.cols || 0)
  const segmentsByRow = layout?.segmentsByRow || []

  let minRow = rows
  let maxRow = -1
  let minCol = cols
  let maxCol = -1

  for (let rowIdx = 0; rowIdx < rows; rowIdx += 1) {
    const row = segmentsByRow[rowIdx]
    if (!Array.isArray(row) || row.length === 0) continue

    minRow = Math.min(minRow, rowIdx)
    maxRow = Math.max(maxRow, rowIdx)

    for (let i = 0; i < row.length; i += 2) {
      minCol = Math.min(minCol, Number(row[i]))
      maxCol = Math.max(maxCol, Number(row[i + 1]))
    }
  }

  if (maxRow === -1 || maxCol === -1) {
    return {
      minRow: 0,
      maxRow: 0,
      minCol: 0,
      maxCol: 0,
      visibleRows: 0,
      visibleCols: 0,
    }
  }

  return {
    minRow,
    maxRow,
    minCol,
    maxCol,
    visibleRows: maxRow - minRow + 1,
    visibleCols: maxCol - minCol + 1,
  }
}

export function buildVisibleSeatRows(layout) {
  const bounds = getLayoutBounds(layout)
  const rows = []

  if (bounds.visibleRows === 0 || bounds.visibleCols === 0) {
    return { bounds, rows }
  }

  for (let rowIdx = bounds.minRow; rowIdx <= bounds.maxRow; rowIdx += 1) {
    const cells = []

    for (let colIdx = bounds.minCol; colIdx <= bounds.maxCol; colIdx += 1) {
      if (!hasSeat(layout?.segmentsByRow, rowIdx, colIdx)) {
        cells.push(null)
        continue
      }

      cells.push({
        rowIdx,
        colIdx,
        displayRowIdx: rowIdx - bounds.minRow,
        displayColIdx: colIdx - bounds.minCol,
        seatCode: seatCode(rowIdx - bounds.minRow, colIdx - bounds.minCol),
        seatNumber: colIdx - bounds.minCol + 1,
        seatTypeCode: seatTypeAt(layout?.typedSegmentsByRow, rowIdx, colIdx) || 'standard',
      })
    }

    rows.push({
      rowIdx,
      rowLabel: indexToRowLabel(rowIdx - bounds.minRow),
      cells,
    })
  }

  return { bounds, rows }
}
