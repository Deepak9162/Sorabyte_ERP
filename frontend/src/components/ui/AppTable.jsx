import React, { useState, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Check,
  Download,
  Filter,
} from "lucide-react";
import { cn } from "../../utils/cn";
import AppCheckbox from "./AppCheckbox";
import AppPagination from "./AppPagination";
import AppEmptyState from "./AppEmptyState";
import AppSkeleton, { AppTableSkeleton } from "./AppSkeleton";
import AppButton from "./AppButton";
import AppSearch from "./AppSearch";

/**
 * AppTable — Reusable Enterprise Table Component.
 * Features sticky header, sorting, search filter, column customization, row selection, bulk actions, pagination, skeleton, and empty state.
 */
export const AppTable = ({
  columns = [], // Array of { key, header, sortable, render, width, align }
  data = [], // Array of row data objects
  loading = false,
  selectable = false,
  selectedRows = [],
  onSelectRows,
  onRowClick,
  rowKey = "_id",
  searchable = true,
  searchPlaceholder = "Search records...",
  bulkActions, // React node or array of buttons when rows are selected
  pagination, // { currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }
  emptyTitle = "No records found",
  emptyDescription = "There are no entries available to display.",
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc"); // 'asc' | 'desc'

  // Filter data based on search query across searchable string columns
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, columns, searchQuery]);

  // Sort data based on sortColumn and sortDirection
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      return sortDirection === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredData, sortColumn, sortDirection]);

  const handleSort = (key) => {
    if (sortColumn === key) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  // Row selection logic
  const allRowKeys = useMemo(() => {
    return sortedData.map((row, idx) => row[rowKey] ?? idx);
  }, [sortedData, rowKey]);

  const isAllSelected =
    allRowKeys.length > 0 && allRowKeys.every((k) => selectedRows.includes(k));

  const isSomeSelected =
    selectedRows.length > 0 && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onSelectRows?.([]);
    } else {
      onSelectRows?.(allRowKeys);
    }
  };

  const toggleSelectRow = (e, key) => {
    e.stopPropagation();
    if (selectedRows.includes(key)) {
      onSelectRows?.(selectedRows.filter((k) => k !== key));
    } else {
      onSelectRows?.([...selectedRows, key]);
    }
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Header Bar: Search & Bulk Action Toolbar */}
      {(searchable || (selectable && selectedRows.length > 0)) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-gray-200/90 rounded-2xl shadow-2xs">
          {searchable && (
            <div className="w-full sm:w-72">
              <AppSearch
                size="sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
              />
            </div>
          )}

          {selectable && selectedRows.length > 0 && (
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-100 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-indigo-900">
                {selectedRows.length} item{selectedRows.length > 1 ? "s" : ""} selected
              </span>

              {bulkActions ? (
                <div className="flex items-center gap-2">{bulkActions}</div>
              ) : (
                <AppButton
                  size="xs"
                  variant="ghost"
                  onClick={() => onSelectRows?.([])}
                >
                  Deselect all
                </AppButton>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Table Container */}
      <div className="w-full overflow-hidden bg-white border border-gray-200/90 rounded-2xl shadow-2xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            {/* Sticky Table Header */}
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200/90 text-gray-700 font-extrabold uppercase tracking-wider text-[11px] select-none sticky top-0 z-10 backdrop-blur-xs">
                {selectable && (
                  <th className="p-3.5 w-10 text-center">
                    <AppCheckbox
                      checked={isAllSelected}
                      indeterminate={isSomeSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}

                {columns.map((col) => {
                  const isSorted = sortColumn === col.key;
                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      onClick={() => col.sortable && handleSort(col.key)}
                      className={cn(
                        "p-3.5 whitespace-nowrap font-extrabold text-gray-700",
                        col.sortable && "cursor-pointer hover:bg-gray-100/60 transition-colors",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center"
                      )}
                    >
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          col.align === "right" && "justify-end w-full",
                          col.align === "center" && "justify-center w-full"
                        )}
                      >
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-gray-400">
                            {isSorted ? (
                              sortDirection === "asc" ? (
                                <ChevronUp size={14} className="text-indigo-600" />
                              ) : (
                                <ChevronDown size={14} className="text-indigo-600" />
                              )
                            ) : (
                              <ChevronsUpDown size={14} className="opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={`skel-row-${rIdx}`}>
                    {selectable && (
                      <td className="p-3.5 text-center">
                        <AppSkeleton className="h-4 w-4 rounded-md mx-auto" />
                      </td>
                    )}
                    {columns.map((col, cIdx) => (
                      <td key={`skel-cell-${cIdx}`} className="p-3.5">
                        <AppSkeleton className="h-5 rounded-lg w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="p-8 text-center"
                  >
                    <AppEmptyState title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                sortedData.map((row, rIdx) => {
                  const key = row[rowKey] ?? rIdx;
                  const isSelected = selectedRows.includes(key);

                  return (
                    <tr
                      key={key}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        "transition-all duration-150 group",
                        onRowClick && "cursor-pointer hover:bg-indigo-50/40",
                        !onRowClick && "hover:bg-gray-50/60",
                        isSelected && "bg-indigo-50/60 font-semibold"
                      )}
                    >
                      {selectable && (
                        <td
                          className="p-3.5 text-center"
                          onClick={(e) => toggleSelectRow(e, key)}
                        >
                          <AppCheckbox checked={isSelected} readOnly />
                        </td>
                      )}

                      {columns.map((col) => {
                        const cellValue = row[col.key];
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "p-3.5 font-medium text-gray-800",
                              col.align === "right" && "text-right",
                              col.align === "center" && "text-center"
                            )}
                          >
                            {col.render ? col.render(cellValue, row, rIdx) : cellValue ?? "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <AppPagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  );
};

export default AppTable;
