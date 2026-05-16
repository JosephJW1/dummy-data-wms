import React, { useMemo, useEffect, useState, useRef } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Copy, Check } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '../types';

interface DataTableProps {
  columns: ColumnDef[];
  data: any[];
  activeTab: string;
  isDarkMode: boolean;
  onCellClick: (tab: string, id: any) => void;
}

// --- NEW: Isolated Copy Button Component ---
const ActionCopyButton = ({ text, isDarkMode }: { text: string; isDarkMode: boolean }) => {
  const [isCopied, setIsCopied] = useState(false);
  
  // FIX: Using ReturnType<typeof setTimeout> instead of NodeJS.Timeout
  // This works perfectly in browser environments without throwing TS errors.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setIsCopied(true);

    // Clear any existing timer if the user clicks the same button rapidly
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Set a fresh timer for this specific button
    timerRef.current = setTimeout(() => {
      setIsCopied(false);
      timerRef.current = null;
    }, 500);
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1 rounded transition-colors focus:outline-none ${
        isDarkMode 
          ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
          : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'
      }`}
      title="Copy to clipboard"
    >
      {isCopied ? (
        <Check size={14} className="text-green-500" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
};

const DataTable: React.FC<DataTableProps> = ({ columns, data, activeTab, isDarkMode, onCellClick }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Read State from URL ---
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const rowsPerPage = parseInt(searchParams.get('limit') || '10', 10);
  const sortKey = searchParams.get('sort');
  const sortDir = (searchParams.get('dir') || 'asc') as 'asc' | 'desc';

  // Read all filters (keys starting with f_)
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('f_')) f[key.substring(2)] = value;
    });
    return f;
  }, [searchParams]);

  // --- URL Update Helper ---
  const updateParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });
    setSearchParams(nextParams, { replace: true });
  };

  // --- Action Handlers ---
  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortKey === key && sortDir === 'asc') {
      direction = 'desc';
    }
    updateParams({ sort: key, dir: direction, page: '1' });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateParams({ [`f_${key}`]: value || null, page: '1' });
  };

  // --- Data Processing ---
  const filteredData = useMemo(() => {
    if (!columns || !data) return [];
    return data.filter((row) => {
      return columns.every((col) => {
        const filterValue = filters[col.key];
        if (!filterValue) return true;
        const rowValue = row[col.key];
        if (rowValue === null || rowValue === undefined) return false;
        return String(rowValue).toLowerCase().includes(filterValue.toLowerCase());
      });
    });
  }, [data, columns, filters]);

  const sortedData = useMemo(() => {
    const sortableItems = [...filteredData];
    if (sortKey !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        if (aVal === bVal) return 0;
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortKey, sortDir]);

  // --- CSV Export Logic ---
  const exportToCSV = () => {
    if (!sortedData || sortedData.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');

    const csvRows = sortedData.map(row => {
      return columns.map(col => {
        const val = row[col.key];
        if (val === null || val === undefined) return '""';
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      }).join(',');
    });

    const csvContent = [headers, ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTab}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Pagination Calculations ---
  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages); 
  const startIndex = (safePage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  // Auto-correct URL if page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      updateParams({ page: String(totalPages) });
    }
  }, [totalPages, currentPage]);

  if (!columns || columns.length === 0) {
    return (
      <div className={`p-8 rounded-lg shadow border text-center ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
        No columns configured. Open the Columns menu on the right to add some.
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow border flex flex-col ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      
      {/* Table Wrapper */}
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y text-sm text-left ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
          <thead className={isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-semibold uppercase tracking-wider cursor-pointer select-none border-b ${isDarkMode ? 'text-gray-300 border-gray-700 hover:bg-gray-800' : 'text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center justify-between gap-2 whitespace-nowrap">
                    {col.label}
                    <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? <ArrowUp size={14} className="text-blue-500" /> : <ArrowDown size={14} className="text-blue-500" />
                      ) : (
                        <ArrowUpDown size={14} />
                      )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
            <tr>
              {columns.map((col) => (
                <th key={`filter-${col.key}`} className={`px-2 py-2 border-b ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <input
                    type="text"
                    placeholder={`Search...`}
                    className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-normal ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                    value={filters[col.key] || ''}
                    onChange={(e) => handleFilterChange(col.key, e.target.value)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
            {currentData.length > 0 ? (
              currentData.map((row, index) => (
                <tr key={row.id || index} className={isDarkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                  {columns.map((col) => {
                    const val = row[col.key];
                    const isNull = val === null || val === undefined;
                    
                    const targetTab = col.targetTab || activeTab;
                    const targetIdKey = col.targetIdKey || 'id';
                    const targetId = row[targetIdKey];

                    return (
                      <td key={col.key} className={`px-4 py-3 whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {isNull ? (
                          <span className={`italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>null</span>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <button
                              onClick={() => targetId && onCellClick(targetTab, targetId)}
                              className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'} hover:underline focus:outline-none font-medium text-left`}
                              title={`Go to ${targetTab} detail`}
                            >
                              {String(val)}
                            </button>
                            
                            <ActionCopyButton text={String(val)} isDarkMode={isDarkMode} />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className={`px-4 py-8 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Export Footer */}
      <div className={`px-4 py-3 border-t flex flex-col sm:flex-row items-center gap-4 ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} rounded-b-lg`}>
        
        {/* Left: CSV Export */}
        <div className="flex-1 flex justify-start w-full sm:w-auto">
          <button
            onClick={exportToCSV}
            className={`flex items-center justify-center w-full sm:w-auto gap-2 text-sm px-3 py-1.5 rounded transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 border border-gray-600 text-gray-200 hover:bg-gray-700' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            title="Export all matching records to CSV"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Center: Rows per page */}
        <div className={`flex-1 flex justify-center items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <label htmlFor="rows-per-page">Rows per page:</label>
          <select
            id="rows-per-page"
            value={rowsPerPage}
            onChange={(e) => updateParams({ limit: e.target.value, page: '1' })}
            className={`border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'}`}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Right: Pagination Info & Controls */}
        <div className="flex-1 flex justify-end items-center gap-4 w-full sm:w-auto">
          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Showing {sortedData.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length}
          </span>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateParams({ page: String(Math.max(safePage - 1, 1)) })}
              disabled={safePage <= 1}
              className={`p-1 rounded transition-colors ${
                safePage <= 1 
                  ? (isDarkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed')
                  : (isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-200')
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => updateParams({ page: String(Math.min(safePage + 1, totalPages)) })}
              disabled={safePage >= totalPages || totalPages === 0}
              className={`p-1 rounded transition-colors ${
                safePage >= totalPages || totalPages === 0
                  ? (isDarkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed')
                  : (isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-200')
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DataTable;