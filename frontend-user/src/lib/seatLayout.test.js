import { describe, expect, test } from '@jest/globals'
import {
  buildVisibleSeatRows,
  getLayoutBounds,
  hasSeat,
  indexToRowLabel,
  seatCode,
  seatTypeAt,
} from './seatLayout'

describe('frontend-user seatLayout', () => {
  const layout = {
    rows: 4,
    cols: 7,
    segmentsByRow: [
      [],
      [1, 3],
      [1, 4],
      [],
    ],
    typedSegmentsByRow: [
      [],
      [{ start: 1, end: 2, type: 'premium' }, { start: 3, end: 3, type: 'vip' }],
      [{ start: 1, end: 4, type: 'standard' }],
      [],
    ],
  }

  test('computes bounds for visible seats', () => {
    expect(getLayoutBounds(layout)).toEqual({
      minRow: 1,
      maxRow: 2,
      minCol: 1,
      maxCol: 4,
      visibleRows: 2,
      visibleCols: 4,
    })
  })

  test('detects seat presence and seat types', () => {
    expect(hasSeat(layout.segmentsByRow, 1, 1)).toBe(true)
    expect(hasSeat(layout.segmentsByRow, 0, 0)).toBe(false)
    expect(seatTypeAt(layout.typedSegmentsByRow, 1, 1)).toBe('premium')
    expect(seatTypeAt(layout.typedSegmentsByRow, 1, 3)).toBe('vip')
  })

  test('builds visible seat rows with public display codes', () => {
    const { rows } = buildVisibleSeatRows(layout)

    expect(rows).toHaveLength(2)
    expect(rows[0].rowLabel).toBe('A')
    expect(rows[0].cells[0]).toEqual({
      rowIdx: 1,
      colIdx: 1,
      displayRowIdx: 0,
      displayColIdx: 0,
      seatCode: 'B2',
      displaySeatCode: 'A1',
      seatNumber: 1,
      seatTypeCode: 'premium',
    })
    expect(rows[0].cells[3]).toBeNull()
  })

  test('formats row labels and seat codes', () => {
    expect(indexToRowLabel(0)).toBe('A')
    expect(indexToRowLabel(26)).toBe('AA')
    expect(seatCode(2, 4)).toBe('C5')
  })
})
