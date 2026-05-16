import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Database, ChevronLeft, ChevronRight, Settings, X, Plus, GripVertical, Save, Columns, Sun, Moon, RefreshCw } from 'lucide-react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { TAB_ICONS, SCHEMAS, VIEW_SCHEMAS } from '../config/schemas';
import DataTable from '../components/DataTable';
import type { ColumnDef } from '../types';

export default function Dashboard() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNavMinimized, setIsNavMinimized] = useState(false);
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);
  
  // --- URL Routing Hooks ---
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Route URL Tab -> Capitalized Internal Schema Key
  const activeTab = Object.keys(SCHEMAS).find(k => k.toLowerCase() === tab?.toLowerCase()) || 'Chambers';

  // Check URL for Detail Entity Route
  const detailId = searchParams.get('detailId');
  const detailEntity = detailId ? { tab: activeTab, id: detailId } : null;

  // Data State
  const [databases, setDatabases] = useState<Record<string, any[]>>({
    Chambers: [], Locations: [], Products: [], Stocks: [],
    Users: [], PickLists: [], Tasks: [], Transactions: []
  });

  // --- REAL-TIME DATA FETCHING ---
  const fetchAllData = useCallback(async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const endpoints = ['chambers', 'locations', 'products', 'stocks', 'users', 'picklists', 'tasks', 'transactions'];
      
      const responses = await Promise.all(
        endpoints.map(endpoint => fetch(`${API_URL}/${endpoint}`).then(res => res.json()))
      );
      
      setDatabases({
        Chambers: responses[0], Locations: responses[1], Products: responses[2], Stocks: responses[3],
        Users: responses[4], PickLists: responses[5], Tasks: responses[6], Transactions: responses[7]
      });
    } catch (error) {
      console.error("Error fetching backend data:", error);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, activeTab, searchParams.get('page'), searchParams.get('limit')]);

  // --- PERSISTENT SAVED VIEWS (Local Storage) ---
  const [savedViews, setSavedViews] = useState(() => {
    const stored = localStorage.getItem('wms_saved_views');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { console.error("Error parsing saved views", e); }
    }
    return Object.keys(VIEW_SCHEMAS).reduce((acc: any, t) => {
      acc[t] = [{ id: 'default', name: 'Default', columns: VIEW_SCHEMAS[t] }];
      return acc;
    }, {});
  });

  const [selectedViewId, setSelectedViewId] = useState(() => {
    const stored = localStorage.getItem('wms_selected_view_ids');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { console.error("Error parsing selected views", e); }
    }
    return Object.keys(VIEW_SCHEMAS).reduce((acc: any, t) => {
      acc[t] = 'default';
      return acc;
    }, {});
  });

  // Sync state changes back to local storage
  useEffect(() => {
    localStorage.setItem('wms_saved_views', JSON.stringify(savedViews));
  }, [savedViews]);

  useEffect(() => {
    localStorage.setItem('wms_selected_view_ids', JSON.stringify(selectedViewId));
  }, [selectedViewId]);

  const [newViewName, setNewViewName] = useState("");
  const [columnToAdd, setColumnToAdd] = useState("");
  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);

  // --- ENSURE URL INTEGRITY ---
  useEffect(() => {
    if (detailEntity) return; 

    let needsUpdate = false;
    const nextParams = new URLSearchParams(searchParams);

    if (!nextParams.has('page')) { nextParams.set('page', '1'); needsUpdate = true; }
    if (!nextParams.has('limit')) { nextParams.set('limit', '10'); needsUpdate = true; }
    
    if (!nextParams.has('cols')) {
      const viewId = selectedViewId[activeTab] || 'default';
      const view = savedViews[activeTab]?.find((v: any) => v.id === viewId) || savedViews[activeTab]?.[0];
      const defaultCols = (view ? view.columns : VIEW_SCHEMAS[activeTab]).map((c: ColumnDef) => c.key).join(',');
      nextParams.set('cols', defaultCols);
      needsUpdate = true;
    }

    if (needsUpdate) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams, selectedViewId, savedViews, detailEntity]);

  // --- SYNCHRONIZED COLUMNS (Prevents UI Flashing) ---
  const activeColumns = useMemo(() => {
    const colsParam = searchParams.get('cols');
    const schemaCols = VIEW_SCHEMAS[activeTab] || [];
    
    if (!colsParam) return schemaCols; 
    
    const colKeys = colsParam.split(',');
    return colKeys.map(k => schemaCols.find(c => c.key === k)).filter(Boolean) as ColumnDef[];
  }, [searchParams, activeTab]);

  const updateColsInUrl = (cols: ColumnDef[]) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('cols', cols.map(c => c.key).join(','));
    setSearchParams(nextParams);
  };

  useEffect(() => {
    setIsRightMenuOpen(false);
  }, [activeTab]);

  // Derived View Data
  const viewData = useMemo(() => {
    const data = databases[activeTab];
    if (!data) return [];
    
    if (activeTab === 'Locations') {
      return data.map(row => ({
        ...row, chamber: databases.Chambers.find(c => c.id === row.chamberId)?.name || null
      }));
    }

    if (activeTab === 'Products') {
      return data.map(row => ({
        ...row, pickFaceLocation: databases.Locations.find(l => l.id === row.pickFaceLocationId)?.code || null
      }));
    }
    
    if (activeTab === 'Stocks') {
      return data.map(row => {
        const product = databases.Products.find(p => p.id === row.productId);
        const location = databases.Locations.find(l => l.id === row.locationId);
        const pickList = databases.PickLists.find(pl => pl.id === row.pickListId);
        return {
          ...row, productCode: product?.code || null, productDescription: product?.description || null,
          location: location?.code || null, pickList: pickList?.ref || null
        };
      });
    }
    
    if (activeTab === 'Tasks') {
      return data.map(row => {
        const stock = databases.Stocks.find(s => s.id === row.stockId);
        const product = stock ? databases.Products.find(p => p.id === stock.productId) : null;
        const locationFrom = stock ? databases.Locations.find(l => l.id === stock.locationId) : null;
        const locationTo = databases.Locations.find(l => l.id === row.locationToId);
        const pickListIdToUse = stock?.pickListId || row.pickListId;
        const pickList = databases.PickLists.find(pl => pl.id === pickListIdToUse);
        const user = databases.Users.find(u => u.id === row.assignedUserId);
        
        return {
          ...row, _productId: product?.id || null, _locationFromId: locationFrom?.id || null,
          _pickListIdToUse: pickListIdToUse || null, productCode: product?.code || null,
          productDescription: product?.description || null, locationFrom: locationFrom?.code || null,
          locationTo: locationTo?.code || null, palletRefFrom: stock?.palletRef || null,
          pickList: pickList?.ref || null, dispatchDate: pickList?.dispatchDate || null,
          assignedUser: user?.name || null
        };
      });
    }
    
    if (activeTab === 'Transactions') {
      return data.map(row => {
        const stock = databases.Stocks.find(s => s.id === row.stockId);
        const product = stock ? databases.Products.find(p => p.id === stock.productId) : null;
        const locationFrom = stock ? databases.Locations.find(l => l.id === stock.locationId) : null;
        const locationTo = databases.Locations.find(l => l.id === row.locationToId);
        const pickList = databases.PickLists.find(pl => pl.id === row.pickListId);
        const user = databases.Users.find(u => u.id === row.completedByUser);

        return {
          ...row,
          _productId: product?.id || null,
          _locationFromId: locationFrom?.id || null,
          _locationToId: locationTo?.id || null,
          _stockId: stock?.id || null,
          _pickListId: pickList?.id || null,
          _completedByUser: user?.id || null,

          productCode: product?.code || null,
          productDescription: product?.description || null,
          locationFrom: locationFrom?.code || null,
          locationTo: locationTo?.code || null,
          palletRefFrom: stock?.palletRef || null,
          palletRefTo: row.palletRefTo || null,
          pickList: pickList?.ref || null,
          quantity: row.quantity || null,
          type: row.type || null,
          completedByUser: user?.name || null,
          createdAt: row.createdAt || null
        };
      });
    }
    
    return data;
  }, [databases, activeTab]);

  // --- Manage Columns via URL ---
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedColIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedColIdx === null || draggedColIdx === idx) return;
    const newCols = [...activeColumns];
    const [removed] = newCols.splice(draggedColIdx, 1);
    newCols.splice(idx, 0, removed);
    updateColsInUrl(newCols);
    setDraggedColIdx(null);
  };
  
  const handleRemoveColumn = (keyToRemove: string) => updateColsInUrl(activeColumns.filter(c => c.key !== keyToRemove));
  const handleAddColumn = () => {
    if (!columnToAdd) return;
    const colDef = VIEW_SCHEMAS[activeTab].find(c => c.key === columnToAdd);
    if (colDef && !activeColumns.find(c => c.key === columnToAdd)) updateColsInUrl([...activeColumns, colDef]);
    setColumnToAdd("");
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) return;
    const newId = newViewName.toLowerCase().replace(/\s+/g, '-');
    setSavedViews((prev: any) => ({ ...prev, [activeTab]: [...(prev[activeTab] || []), { id: newId, name: newViewName, columns: [...activeColumns] }] }));
    setSelectedViewId((prev: any) => ({ ...prev, [activeTab]: newId }));
    setNewViewName("");
    setIsRightMenuOpen(false);
  };
  
  const availableColumnsToAdd = VIEW_SCHEMAS[activeTab].filter(c => !activeColumns.some(ac => ac.key === c.key));

  return (
    <div className={`min-h-screen flex font-sans overflow-hidden relative transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      
      {/* Sidebar Navigation */}
      <aside className={`${isNavMinimized ? 'w-16' : 'w-64'} flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out shadow-xl z-10 relative ${isDarkMode ? 'bg-slate-950 border-r border-slate-800 text-gray-200' : 'bg-slate-800 text-white'}`}>
        <div className={`h-16 flex items-center justify-center border-b ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-700 bg-slate-900'}`}>
          {isNavMinimized ? <Database className="text-blue-400 flex-shrink-0" /> : (
            <div className="flex items-center gap-3 px-4 w-full overflow-hidden">
              <Database className="text-blue-400 flex-shrink-0" />
              <h1 className="text-lg font-bold tracking-wide whitespace-nowrap">WMS System</h1>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-2 px-2 overflow-y-auto">
          {Object.keys(SCHEMAS).map((t) => {
            const Icon = TAB_ICONS[t];
            const isActive = activeTab === t;
            
            let btnClasses = 'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ';
            if (isActive) btnClasses += 'bg-blue-600 text-white shadow';
            else btnClasses += isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white';

            return (
              <button
                key={t}
                onClick={() => {
                  const viewId = selectedViewId[t] || 'default';
                  const view = savedViews[t]?.find((v: any) => v.id === viewId) || savedViews[t]?.[0];
                  const cols = (view ? view.columns : VIEW_SCHEMAS[t]).map((c: ColumnDef) => c.key).join(',');
                  navigate(`/${t.toLowerCase()}?page=1&limit=10&cols=${cols}`);
                }}
                title={isNavMinimized ? t : ''}
                className={btnClasses}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!isNavMinimized && <span className="text-sm font-medium whitespace-nowrap">{t}</span>}
              </button>
            );
          })}
        </nav>

        {/* Lower Sidebar Actions */}
        <div className={`p-2 border-t flex flex-col gap-1 ${isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-700 bg-slate-900'}`}>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-full flex items-center p-2 rounded transition-colors ${isNavMinimized ? 'justify-center' : 'justify-start px-4'} ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}>
            {isDarkMode ? <Sun size={20} className="flex-shrink-0" /> : <Moon size={20} className="flex-shrink-0" />}
            {!isNavMinimized && <span className="ml-3 text-sm whitespace-nowrap">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button onClick={() => setIsNavMinimized(!isNavMinimized)} className={`w-full flex items-center p-2 rounded transition-colors ${isNavMinimized ? 'justify-center' : 'justify-start px-4'} ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}>
            {isNavMinimized ? <ChevronRight size={20} className="flex-shrink-0" /> : <ChevronLeft size={20} className="flex-shrink-0" />}
            {!isNavMinimized && <span className="ml-3 text-sm whitespace-nowrap">Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col h-screen overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        
        {/* Dynamic Header */}
        <header className={`shadow-sm px-6 py-4 flex-shrink-0 flex justify-between items-center border-b ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
          <div>
            <h2 className="text-xl font-bold">{detailEntity ? `${detailEntity.tab} Details` : `${activeTab} Database`}</h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {detailEntity ? `Viewing full properties list for record ID ${detailEntity.id}` : `Viewing schema and records for the ${activeTab.toLowerCase()} relational entity.`}
            </p>
          </div>
          
          {!detailEntity && (
            <div className="flex items-center gap-3">
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Saved View:</label>
              <select 
                value={selectedViewId[activeTab]}
                onChange={(e) => {
                  const newViewId = e.target.value;
                  setSelectedViewId((prev: any) => ({...prev, [activeTab]: newViewId}));
                  const view = savedViews[activeTab]?.find((v: any) => v.id === newViewId);
                  if (view) updateColsInUrl(view.columns);
                }}
                className={`border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px] ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300'}`}
              >
                {savedViews[activeTab]?.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}
        </header>
        
        {/* Routing View (Table vs Detail Entity) */}
        <div className="flex-1 p-6 overflow-auto relative">
          {detailEntity ? (
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              <button 
                onClick={() => {
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.delete('detailId'); 
                  setSearchParams(nextParams);
                }} 
                className={`w-fit flex items-center gap-1 font-medium transition-colors ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
              >
                <ChevronLeft size={18} /> Back to List
              </button>
              
              <div className={`p-6 rounded-lg shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className="text-xl font-bold mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">{detailEntity.tab} Data Record</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {SCHEMAS[detailEntity.tab].map(col => {
                    const record = databases[detailEntity.tab].find(r => String(r.id) === String(detailEntity.id)) || {};
                    const val = record[col.key];
                    return (
                      <div key={col.key} className={`flex flex-col p-3 rounded ${isDarkMode ? 'bg-gray-750/50' : 'bg-gray-50'}`}>
                        <span className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{col.label}</span>
                        <span className={`text-base break-words font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                          {val === null || val === undefined ? <span className="text-gray-400 italic font-normal">null</span> : String(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <button 
                  onClick={fetchAllData}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded shadow-sm border transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' 
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <RefreshCw size={16} />
                  Refresh Table Data
                </button>
              </div>

              <DataTable 
                columns={activeColumns} 
                data={viewData} 
                activeTab={activeTab}
                isDarkMode={isDarkMode}
                onCellClick={(targetTab, targetId) => navigate(`/${targetTab.toLowerCase()}?detailId=${targetId}`)}
              />
            </div>
          )}
        </div>
      </main>

      {/* Right Menu (Manage Columns) */}
      {!detailEntity && (
        <button onClick={() => setIsRightMenuOpen(true)} className={`fixed right-0 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-l-md shadow-lg z-20 hover:bg-blue-700 transition-transform duration-300 ease-in-out ${isRightMenuOpen ? 'translate-x-full' : 'translate-x-0'}`} title="Manage Columns">
          <Columns size={20} />
        </button>
      )}

      <aside className={`fixed right-0 top-0 h-full w-80 shadow-2xl border-l z-30 flex flex-col transform transition-transform duration-300 ease-in-out ${isRightMenuOpen ? 'translate-x-0' : 'translate-x-full'} ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <h3 className={`font-semibold flex items-center gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}><Settings size={18} /> Edit Columns</h3>
          <button onClick={() => setIsRightMenuOpen(false)} className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Visible Columns</h4>
            <div className="flex flex-col gap-2">
              {activeColumns.map((col, idx) => (
                <div key={col.key} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx)} className={`flex items-center justify-between p-2 border rounded text-sm cursor-move transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2 overflow-hidden"><GripVertical size={14} className="text-gray-400 flex-shrink-0" /><span className="truncate">{col.label}</span></div>
                  <button onClick={() => handleRemoveColumn(col.key)} className="text-gray-400 hover:text-red-500 flex-shrink-0" title="Remove column"><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Column Block */}
          {availableColumnsToAdd.length > 0 && (
            <div className={`pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Add Column</h4>
              <div className="flex gap-2">
                <select value={columnToAdd} onChange={(e) => setColumnToAdd(e.target.value)} className={`flex-1 border rounded px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-200' : 'border-gray-300'}`}>
                  <option value="" disabled>Select column...</option>
                  {availableColumnsToAdd.map(col => <option key={col.key} value={col.key}>{col.label}</option>)}
                </select>
                <button onClick={handleAddColumn} disabled={!columnToAdd} className={`p-2 rounded transition-colors disabled:opacity-50 ${isDarkMode ? 'bg-blue-900/50 text-blue-400 hover:bg-blue-900' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}><Plus size={18} /></button>
              </div>
            </div>
          )}

          {/* Save View Block */}
          <div className={`pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Save Current View</h4>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Name this view..." 
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                className={`flex-1 border rounded px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
              />
              <button 
                onClick={handleSaveView} 
                disabled={!newViewName.trim()} 
                title="Save View"
                className={`p-2 rounded transition-colors disabled:opacity-50 ${isDarkMode ? 'bg-green-900/50 text-green-400 hover:bg-green-900' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
              >
                <Save size={18} />
              </button>
            </div>
          </div>

        </div>
      </aside>
    </div>
  );
}