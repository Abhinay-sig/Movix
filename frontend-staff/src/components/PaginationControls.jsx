function buildPageNumbers(currentPage, totalPages) {
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  const pages = []

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  return pages
}

export default function PaginationControls({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null

  const pages = buildPageNumbers(pagination.page, pagination.totalPages)

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-500">
        Page {pagination.page} of {pagination.totalPages} • {pagination.total} items
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.hasPrevPage}
          className="inline-flex items-center justify-center rounded-2xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-medium transition-all duration-200 ${
              page === pagination.page
                ? 'border-blue-800 bg-blue-800 text-white'
                : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.hasNextPage}
          className="inline-flex items-center justify-center rounded-2xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
