"use client";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { PAGINATION } from "@/lib/definitions";
import { Pagination as PaginationType } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";

export default function Pager({ initial }: { initial: PaginationType }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const limit = searchParams.get("limit") || String(PAGINATION.PAGE_SIZE);
  const { currentPage = 0 } = initial;

  const paginationLimits = PAGINATION.PAGE_SIZE_OPTIONS.map((i) => ({
    label: i,
    value: i,
  }));
  const pageCount = initial?.totalPages || 0;

  const createPageURL = (e: React.MouseEvent, pageNumber: number) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    router.push(`?${params.toString()}`);
  };

  const handlePageLimit = (pageSize: string | null | undefined) => {
    if (!pageSize) return;
    const params = new URLSearchParams(searchParams);
    params.set("limit", pageSize);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const getVisiblePages = () => {
    const visiblePages = [];
    const maxVisible = useIsMobile() ? 3 : 5; // Maximum visible page numbers

    if (pageCount <= maxVisible) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(pageCount, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      visiblePages.push(1);
      if (start > 2) {
        visiblePages.push(-1); // -1 represents ellipsis
      }
    }

    for (let i = start; i <= end; i++) {
      visiblePages.push(i);
    }

    if (end < pageCount) {
      if (end < pageCount - 1) {
        visiblePages.push(-1); // -1 represents ellipsis
      }
      visiblePages.push(pageCount);
    }

    return visiblePages;
  };
  return (
    <Pagination className="relative md:flex-col md:flex-row gap-2">
      <div className="md:absolute left-0 w-full md:w-auto">
        <Select value={limit} onValueChange={handlePageLimit}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>

          <SelectContent>
            {paginationLimits.map((i) => (
              <SelectItem key={i.value} value={String(i.value)}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <PaginationContent className="justify-center">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={currentPage === 1}
            className={
              currentPage === 1 ? "pointer-events-none opacity-50" : ""
            }
            onClick={(e) => createPageURL(e, Math.max(currentPage - 1, 1))}
            isActive={currentPage !== 1}
          />
        </PaginationItem>
        {getVisiblePages().map((p, index) => (
          <PaginationItem key={index}>
            {p === -1 ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                onClick={(e) => createPageURL(e, p)}
                isActive={p === currentPage}
              >
                {p}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={currentPage === pageCount}
            className={
              currentPage === pageCount ? "pointer-events-none opacity-50" : ""
            }
            onClick={(e) =>
              createPageURL(e, Math.min(currentPage + 1, pageCount))
            }
            isActive={currentPage !== pageCount}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
