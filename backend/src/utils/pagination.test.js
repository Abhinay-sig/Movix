const { buildPaginationMeta, parsePagination } = require('./pagination');

describe('pagination utils', () => {
  test('parses valid pagination values and computes offset', () => {
    expect(parsePagination({ page: '3', limit: '5' }, { defaultLimit: 10, maxLimit: 50 })).toEqual({
      page: 3,
      limit: 5,
      offset: 10,
      hasPagination: true,
    });
  });

  test('falls back safely for invalid values and caps limit', () => {
    expect(parsePagination({ page: '-1', limit: '500' }, { defaultLimit: 10, maxLimit: 25 })).toEqual({
      page: 1,
      limit: 25,
      offset: 0,
      hasPagination: true,
    });
  });

  test('builds pagination metadata for paginated and unpaginated responses', () => {
    expect(buildPaginationMeta(23, { page: 2, limit: 10, hasPagination: true })).toEqual({
      page: 2,
      limit: 10,
      total: 23,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });

    expect(buildPaginationMeta(7, { page: 99, limit: 10, hasPagination: false })).toEqual({
      page: 1,
      limit: 7,
      total: 7,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });
});
