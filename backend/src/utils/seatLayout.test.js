const {
  getLayoutBounds,
  indexToRowLabel,
  rowLabelToIndex,
  seatCode,
  parseSeatCode,
  parseSeatCodeForLayout,
  layoutHasSeat,
  seatTypeForSeat,
  toPublicSeatCode,
} = require('./seatLayout');

describe('backend seatLayout utils', () => {
  const layout = {
    rows: 5,
    cols: 8,
    segmentsByRow: [
      [],
      [2, 4],
      [2, 4],
      [2, 5],
      [],
    ],
    typedSegmentsByRow: [
      [],
      [{ start: 2, end: 3, type: 'premium' }, { start: 4, end: 4, type: 'vip' }],
      [{ start: 2, end: 4, type: 'standard' }],
      [{ start: 2, end: 5, type: 'recliner' }],
      [],
    ],
  };

  test('converts row indexes and labels in both directions', () => {
    expect(indexToRowLabel(0)).toBe('A');
    expect(indexToRowLabel(27)).toBe('AB');
    expect(rowLabelToIndex('A')).toBe(0);
    expect(rowLabelToIndex('AB')).toBe(27);
    expect(rowLabelToIndex('ab')).toBe(null);
  });

  test('parses and formats seat codes', () => {
    expect(seatCode(1, 2)).toBe('B3');
    expect(parseSeatCode(' b3 ')).toEqual({ rowIdx: 1, colIdx: 2 });
    expect(parseSeatCode('3B')).toBe(null);
  });

  test('computes visible layout bounds from sparse rows', () => {
    expect(getLayoutBounds(layout)).toEqual({
      minRow: 1,
      maxRow: 3,
      minCol: 2,
      maxCol: 5,
      visibleRows: 3,
      visibleCols: 4,
    });
  });

  test('checks seat existence and seat types against layout intervals', () => {
    expect(layoutHasSeat(layout, 1, 2)).toBe(true);
    expect(layoutHasSeat(layout, 1, 1)).toBe(false);
    expect(seatTypeForSeat(layout, 1, 2)).toBe('premium');
    expect(seatTypeForSeat(layout, 1, 4)).toBe('vip');
    expect(seatTypeForSeat(layout, 0, 0)).toBe(null);
  });

  test('maps absolute seat positions back to public seat codes', () => {
    expect(toPublicSeatCode(layout, 1, 2)).toBe('A1');
    expect(toPublicSeatCode(layout, 3, 5)).toBe('C4');
  });

  test('parses both already-absolute and public seat codes for a layout', () => {
    expect(parseSeatCodeForLayout(layout, 'B3')).toEqual({
      rowIdx: 1,
      colIdx: 2,
      absoluteSeatCode: 'B3',
      publicSeatCode: 'A1',
    });

    expect(parseSeatCodeForLayout(layout, 'A1')).toEqual({
      rowIdx: 1,
      colIdx: 2,
      absoluteSeatCode: 'B3',
      publicSeatCode: 'A1',
    });

    expect(parseSeatCodeForLayout(layout, 'D9')).toBe(null);
  });
});
