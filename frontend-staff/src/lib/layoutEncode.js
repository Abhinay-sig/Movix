export function segmentsFromSelected(selected, rows = 50, cols = 80) {
  const byRow = Array.from({ length: rows }, () => [])
  for (const key of selected) {
    const [rStr, cStr] = key.split(':')
    const r = Number(rStr)
    const c = Number(cStr)
    if (Number.isFinite(r) && Number.isFinite(c) && r >= 0 && r < rows && c >= 0 && c < cols) {
      byRow[r].push(c)
    }
  }
  const segmentsByRow = Array.from({ length: rows }, () => [])
  for (let r = 0; r < rows; r++) {
    const colsSel = Array.from(new Set(byRow[r])).sort((a, b) => a - b)
    let i = 0
    while (i < colsSel.length) {
      let start = colsSel[i]
      let end = start
      i++
      while (i < colsSel.length && colsSel[i] === end + 1) {
        end = colsSel[i]
        i++
      }
      segmentsByRow[r].push(start, end)
    }
  }
  return segmentsByRow
}

export function typedSegmentsFromMaps(typeByCell, rows = 50, cols = 80) {
  // typeByCell: Map<"r:c", typeCode>
  const typed = Array.from({ length: rows }, () => [])
  for (let r = 0; r < rows; r++) {
    // collect per type
    const perType = new Map()
    for (let c = 0; c < cols; c++) {
      const k = `${r}:${c}`
      const t = typeByCell.get(k)
      if (!t) continue
      if (!perType.has(t)) perType.set(t, [])
      perType.get(t).push(c)
    }
    for (const [type, colsSel] of perType.entries()) {
      const sorted = Array.from(new Set(colsSel)).sort((a, b) => a - b)
      let i = 0
      while (i < sorted.length) {
        let start = sorted[i]
        let end = start
        i++
        while (i < sorted.length && sorted[i] === end + 1) {
          end = sorted[i]
          i++
        }
        typed[r].push({ start, end, type })
      }
    }
    typed[r].sort((a, b) => a.start - b.start)
  }
  return typed
}

