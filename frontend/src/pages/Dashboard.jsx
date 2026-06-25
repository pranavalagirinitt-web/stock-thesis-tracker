import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../lib/api';

const SECTORS = ['ALL', 'TECH', 'FINANCE', 'HEALTHCARE', 'ENERGY', 'CONSUMER', 'INDUSTRIAL', 'REAL_ESTATE', 'OTHER'];
const CAP_SIZES = ['ALL', 'LARGE_CAP', 'MID_CAP', 'SMALL_CAP', 'MICRO_CAP'];
const STRATEGIES = ['ALL', 'LONG_TERM', 'SHORT_TERM', 'SPECULATIVE', 'DIVIDEND'];
const MARKETS = ['ALL', 'US', 'IN'];
const THESIS_STATUSES = ['ALL', 'BUY', 'HOLD', 'SELL', 'UNRESOLVED'];

function evaluateThesis(thesisCases, financials) {
  if (!financials || !thesisCases || thesisCases.length === 0) return {};

  const results = {};
  for (const tc of thesisCases) {
    if (!tc.conditions || tc.conditions.length === 0) {
      results[tc.type] = false;
      continue;
    }
    const allMet = tc.conditions.every(cond => {
      const actual = financials[cond.metric];
      if (actual === null || actual === undefined) return false;
      switch (cond.operator) {
        case '>': return actual > cond.value;
        case '<': return actual < cond.value;
        case '>=': return actual >= cond.value;
        case '<=': return actual <= cond.value;
        case '=': return actual === cond.value;
        default: return false;
      }
    });
    results[tc.type] = allMet;
  }
  return results;
}

function ThesisStatusBadge({ thesisCases, financials }) {
  const results = evaluateThesis(thesisCases, financials);
  const triggered = Object.entries(results).filter(([, v]) => v).map(([k]) => k);

  if (triggered.length === 0) {
    return <span className="px-2 py-1 rounded text-xs font-mono bg-gray-800 text-gray-400">⚪ UNRESOLVED</span>;
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {triggered.map(t => (
        <span key={t} className={`px-2 py-1 rounded text-xs font-mono font-semibold
          ${t === 'BUY' ? 'bg-green-500/20 text-green-400' :
            t === 'SELL' ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'}`}>
          {t === 'BUY' ? '🟢' : t === 'SELL' ? '🔴' : '🟡'} {t}
        </span>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [watchlist, setWatchlist] = useState([]);
  const [financialsMap, setFinancialsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [addForm, setAddForm] = useState({ market: 'US', sector: 'TECH', capSize: 'LARGE_CAP', strategy: 'LONG_TERM' });
  const [adding, setAdding] = useState(false);

  const [filters, setFilters] = useState({ sector: 'ALL', capSize: 'ALL', strategy: 'ALL', market: 'ALL', thesisStatus: 'ALL' });
  const [sortBy, setSortBy] = useState('recently_added');

  useEffect(() => { fetchWatchlist(); }, []);

  const fetchWatchlist = async () => {
    try {
      const res = await api.get('/watchlist');
      setWatchlist(res.data);
      fetchAllFinancials(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFinancials = async (items) => {
    const map = {};
    await Promise.all(items.map(async (item) => {
      try {
        const res = await api.get(`/stock/${item.symbol}/financials?market=${item.market}`);
        map[item.symbol] = res.data;
      } catch { map[item.symbol] = null; }
    }));
    setFinancialsMap(map);
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/stock/search?q=${q}&market=${addForm.market}`);
      setSearchResults(res.data);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleAddStock = async () => {
    if (!selectedStock) return;
    setAdding(true);
    try {
      await api.post('/watchlist', {
        symbol: selectedStock.symbol,
        companyName: selectedStock.companyName,
        market: addForm.market,
        sector: addForm.sector,
        capSize: addForm.capSize,
        strategy: addForm.strategy,
      });
      setShowAddModal(false);
      setSelectedStock(null);
      setSearchQuery('');
      setSearchResults([]);
      fetchWatchlist();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add stock.');
    } finally { setAdding(false); }
  };

  const handleRemoveStock = async (id) => {
    if (!confirm('Remove this stock from your watchlist?')) return;
    try {
      await api.delete(`/watchlist/${id}`);
      fetchWatchlist();
    } catch (err) {
      alert('Failed to remove stock.');
    }
  };

  const getFilteredAndSorted = () => {
    let list = [...watchlist];

    if (filters.sector !== 'ALL') list = list.filter(s => s.sector === filters.sector);
    if (filters.capSize !== 'ALL') list = list.filter(s => s.capSize === filters.capSize);
    if (filters.strategy !== 'ALL') list = list.filter(s => s.strategy === filters.strategy);
    if (filters.market !== 'ALL') list = list.filter(s => s.market === filters.market);

    if (filters.thesisStatus !== 'ALL') {
      list = list.filter(s => {
        const results = evaluateThesis(s.thesisCases, financialsMap[s.symbol]);
        const triggered = Object.entries(results).filter(([, v]) => v).map(([k]) => k);
        if (filters.thesisStatus === 'UNRESOLVED') return triggered.length === 0;
        return triggered.includes(filters.thesisStatus);
      });
    }

    if (sortBy === 'alphabetical_asc') list.sort((a, b) => a.companyName.localeCompare(b.companyName));
    else if (sortBy === 'alphabetical_desc') list.sort((a, b) => b.companyName.localeCompare(a.companyName));

    return list;
  };

  const formatLabel = (str) => str.replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">

      {/* Navbar */}
      <nav className="border-b border-[#1e2d4a] px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          THESIS <span className="text-[#00ff88]">TRACKER</span>
        </h1>
        <div className="flex items-center gap-4">
          {user?.role === 'ADMIN' && (
            <button onClick={() => navigate('/admin')}
              className="text-sm text-gray-400 hover:text-white transition-colors">
              Admin Panel
            </button>
          )}
          <span className="text-gray-400 text-sm font-mono">{user?.name}</span>
          <button onClick={logout}
            className="text-sm text-gray-400 hover:text-red-400 transition-colors">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">My Watchlist</h2>
            <p className="text-gray-400 text-sm mt-1 font-mono">{watchlist.length} stocks tracked</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="bg-[#00ff88] hover:bg-[#00cc6a] text-black font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
            + Add Stock
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-4 mb-6 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-gray-400 text-xs font-mono w-16">MARKET</span>
            {MARKETS.map(m => (
              <button key={m} onClick={() => setFilters(f => ({ ...f, market: m }))}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors
                  ${filters.market === m ? 'bg-[#00ff88] text-black font-semibold' : 'bg-[#1a2440] text-gray-400 hover:text-white'}`}>
                {m}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-gray-400 text-xs font-mono w-16">SECTOR</span>
            {SECTORS.map(s => (
              <button key={s} onClick={() => setFilters(f => ({ ...f, sector: s }))}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors
                  ${filters.sector === s ? 'bg-[#00ff88] text-black font-semibold' : 'bg-[#1a2440] text-gray-400 hover:text-white'}`}>
                {formatLabel(s)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-gray-400 text-xs font-mono w-16">CAP</span>
            {CAP_SIZES.map(c => (
              <button key={c} onClick={() => setFilters(f => ({ ...f, capSize: c }))}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors
                  ${filters.capSize === c ? 'bg-[#00ff88] text-black font-semibold' : 'bg-[#1a2440] text-gray-400 hover:text-white'}`}>
                {formatLabel(c)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-gray-400 text-xs font-mono w-16">THESIS</span>
            {THESIS_STATUSES.map(t => (
              <button key={t} onClick={() => setFilters(f => ({ ...f, thesisStatus: t }))}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors
                  ${filters.thesisStatus === t ? 'bg-[#00ff88] text-black font-semibold' : 'bg-[#1a2440] text-gray-400 hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-gray-400 text-xs font-mono w-16">SORT</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-[#1a2440] border border-[#1e2d4a] text-white text-xs font-mono rounded px-3 py-1.5 focus:outline-none">
              <option value="recently_added">Recently Added</option>
              <option value="alphabetical_asc">A → Z</option>
              <option value="alphabetical_desc">Z → A</option>
            </select>
          </div>
        </div>

        {/* Watchlist */}
        {loading ? (
          <div className="text-center text-gray-400 font-mono py-20">Loading watchlist...</div>
        ) : getFilteredAndSorted().length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 font-mono text-sm">No stocks found.</p>
            <p className="text-gray-600 font-mono text-xs mt-2">Try adjusting your filters or add a new stock.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredAndSorted().map(stock => (
              <div key={stock.id}
                className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-5 hover:border-[#00ff88]/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/stock/${stock.id}`)}>

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold font-mono text-lg">{stock.symbol}</span>
                      <span className="text-xs bg-[#1a2440] text-gray-400 px-2 py-0.5 rounded font-mono">{stock.market}</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-0.5">{stock.companyName}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleRemoveStock(stock.id); }}
                    className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none">
                    ×
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="text-xs bg-[#1a2440] text-gray-400 px-2 py-0.5 rounded font-mono">{formatLabel(stock.sector)}</span>
                  <span className="text-xs bg-[#1a2440] text-gray-400 px-2 py-0.5 rounded font-mono">{formatLabel(stock.capSize)}</span>
                  <span className="text-xs bg-[#1a2440] text-gray-400 px-2 py-0.5 rounded font-mono">{formatLabel(stock.strategy)}</span>
                </div>

                {financialsMap[stock.symbol] && (
                  <div className="flex gap-3 mb-3 font-mono text-xs text-gray-400">
                    <span>PE: <span className="text-white">{financialsMap[stock.symbol]?.peRatio?.toFixed(1) ?? 'N/A'}</span></span>
                    <span>P/B: <span className="text-white">{financialsMap[stock.symbol]?.pbRatio?.toFixed(1) ?? 'N/A'}</span></span>
                    <span>ROE: <span className="text-white">{financialsMap[stock.symbol]?.roe?.toFixed(1) ?? 'N/A'}%</span></span>
                  </div>
                )}

                <div className="border-t border-[#1e2d4a] pt-3">
                  <ThesisStatusBadge
                    thesisCases={stock.thesisCases}
                    financials={financialsMap[stock.symbol]}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-lg">Add Stock to Watchlist</h3>
              <button onClick={() => { setShowAddModal(false); setSelectedStock(null); setSearchQuery(''); setSearchResults([]); }}
                className="text-gray-400 hover:text-white text-xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs font-mono mb-1 block">MARKET</label>
                <div className="flex gap-2">
                  {['US', 'IN'].map(m => (
                    <button key={m} onClick={() => { setAddForm(f => ({ ...f, market: m })); setSearchResults([]); setSearchQuery(''); setSelectedStock(null); }}
                      className={`flex-1 py-2 rounded text-sm font-mono font-semibold transition-colors
                        ${addForm.market === m ? 'bg-[#00ff88] text-black' : 'bg-[#1a2440] text-gray-400'}`}>
                      {m === 'US' ? '🇺🇸 US' : '🇮🇳 IN'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs font-mono mb-1 block">SEARCH STOCK</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#00ff88] transition-colors"
                  placeholder="Search by name or symbol..."
                />
                {searching && <p className="text-gray-400 text-xs font-mono mt-1">Searching...</p>}
                {searchResults.length > 0 && !selectedStock && (
                  <div className="mt-1 bg-[#1a2440] border border-[#1e2d4a] rounded-lg overflow-hidden">
                    {searchResults.map(r => (
                      <button key={r.symbol} onClick={() => { setSelectedStock(r); setSearchQuery(r.companyName); setSearchResults([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#243055] transition-colors border-b border-[#1e2d4a] last:border-0">
                        <span className="text-white font-mono text-sm font-semibold">{r.symbol}</span>
                        <span className="text-gray-400 text-xs ml-2">{r.companyName}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedStock && (
                  <div className="mt-2 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-[#00ff88] text-sm font-mono font-semibold">{selectedStock.symbol} — {selectedStock.companyName}</span>
                    <button onClick={() => { setSelectedStock(null); setSearchQuery(''); }} className="text-gray-400 hover:text-white text-lg">×</button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-gray-400 text-xs font-mono mb-1 block">SECTOR</label>
                <select value={addForm.sector} onChange={e => setAddForm(f => ({ ...f, sector: e.target.value }))}
                  className="w-full bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-4 py-3 text-sm focus:outline-none">
                  {SECTORS.filter(s => s !== 'ALL').map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-xs font-mono mb-1 block">CAP SIZE</label>
                <select value={addForm.capSize} onChange={e => setAddForm(f => ({ ...f, capSize: e.target.value }))}
                  className="w-full bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-4 py-3 text-sm focus:outline-none">
                  {CAP_SIZES.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{formatLabel(c)}</option>)}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-xs font-mono mb-1 block">STRATEGY</label>
                <select value={addForm.strategy} onChange={e => setAddForm(f => ({ ...f, strategy: e.target.value }))}
                  className="w-full bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-4 py-3 text-sm focus:outline-none">
                  {STRATEGIES.filter(s => s !== 'ALL').map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
                </select>
              </div>

              <button onClick={handleAddStock} disabled={!selectedStock || adding}
                className="w-full bg-[#00ff88] hover:bg-[#00cc6a] text-black font-semibold py-3 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {adding ? 'Adding...' : 'Add to Watchlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}