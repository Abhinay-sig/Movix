function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parsePagination(query, { defaultLimit = 10, maxLimit = 50 } = {}) {
  const page = parsePositiveInt(query.page) ?? 1;
  const requestedLimit = parsePositiveInt(query.limit);
  const limit = Math.min(Math.max(requestedLimit ?? defaultLimit, 1), maxLimit);
  const hasPagination = requestedLimit !== null || query.page !== undefined;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    hasPagination,
  };
}

function buildPaginationMeta(total, { page = 1, limit = 10, hasPagination = true } = {}) {
  const safeLimit = Math.max(Number(limit) || 1, 1);
  const totalPages = hasPagination ? Math.max(1, Math.ceil(total / safeLimit)) : 1;

  return {
    page: hasPagination ? page : 1,
    limit: hasPagination ? safeLimit : total,
    total,
    totalPages,
    hasNextPage: hasPagination ? page < totalPages : false,
    hasPrevPage: hasPagination ? page > 1 : false,
  };
}

module.exports = {
  parsePagination,
  buildPaginationMeta,
};
