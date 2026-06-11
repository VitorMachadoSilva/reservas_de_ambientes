"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationControlsProps = {
  onChange: (value: number) => void;
  page: number;
  pageSize: number;
  total: number;
};

export function PaginationControls({
  onChange,
  page,
  pageSize,
  total,
}: PaginationControlsProps) {
  if (total <= pageSize) return null;

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="pagination-controls">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        title="Pagina anterior"
      >
        <ChevronLeft size={17} />
      </button>
      <span>
        {startItem}-{endItem} de {total} | pag {page}
      </span>
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        title="Proxima pagina"
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
}
