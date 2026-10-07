function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) pages.push(i);

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-1 mt-0 w-full max-w-full">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-2.5 sm:px-3 py-2 rounded-lg text-[13px] sm:text-sm font-medium border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-50 transition shrink-0"
      >
        Prev
      </button>

      {getPageNumbers().map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-1.5 sm:px-3 py-2 text-[13px] sm:text-sm text-gray-500 shrink-0">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-2.5 sm:px-3 py-2 rounded-lg text-[13px] sm:text-sm font-medium border transition shrink-0 min-w-[36px] sm:min-w-[40px] ${
              currentPage === page
                ? 'bg-primary-700 text-white border-primary-700'
                : 'border-gray-300 hover:bg-primary-50'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-2.5 sm:px-3 py-2 rounded-lg text-[13px] sm:text-sm font-medium border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-50 transition shrink-0"
      >
        Next
      </button>
    </div>
  );
}

export default Pagination;
