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

