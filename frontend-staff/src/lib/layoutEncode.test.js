import { describe, expect, test } from '@jest/globals'
import { segmentsFromSelected, typedSegmentsFromMaps } from './layoutEncode'

describe('frontend-staff layoutEncode', () => {
  test('converts selected cells into compact row segments', () => {
    const selected = new Set(['0:0', '0:1', '0:3', '1:5', '1:6'])

    expect(segmentsFromSelected(selected, 3, 8)).toEqual([
      [0, 1, 3, 3],
      [5, 6],
      [],
    ])
  })

  test('ignores out-of-range and duplicate cell entries', () => {
    const selected = new Set(['0:0', '0:0', '9:9', '-1:0', '1:2'])

    expect(segmentsFromSelected(selected, 2, 4)).toEqual([
      [0, 0],
      [2, 2],
    ])
  })

  test('groups typed seat segments per row and type', () => {
    const typeByCell = new Map([
      ['0:0', 'standard'],
      ['0:1', 'standard'],
      ['0:3', 'vip'],
      ['1:2', 'premium'],
      ['1:3', 'premium'],
    ])

    expect(typedSegmentsFromMaps(typeByCell, 3, 5)).toEqual([
      [
        { start: 0, end: 1, type: 'standard' },
        { start: 3, end: 3, type: 'vip' },
      ],
      [{ start: 2, end: 3, type: 'premium' }],
      [],
    ])
  })
})
