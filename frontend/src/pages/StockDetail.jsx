import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const METRICS = [
  { key: 'peRatio', label: 'PE Ratio' },
  { key: 'forwardPE', label: 'Forward PE' },
  { key: 'pbRatio', label: 'Price/Book' },
  { key: 'psRatio', label: 'Price/Sales' },
  { key: 'pegRatio', label: 'PEG Ratio' },
  { key: 'evToEbitda', label: 'EV/EBITDA' },
  { key: 'evToRevenue', label: 'EV/Revenue' },
  { key: 'profitMargin', label: 'Profit Margin %' },
  { key: 'operatingMargin', label: 'Operating Margin %' },
  { key: 'grossMargin', label: 'Gross Margin %' },
  { key: 'ebitdaMargin', label: 'EBITDA Margin %' },
  { key: 'roe', label: 'ROE %' },
  { key: 'roa', label: 'ROA %' },
  { key: 'eps', label: 'EPS' },
  { key: 'forwardEps', label: 'Forward EPS' },
  { key: 'bookValuePerShare', label: 'Book Value/Share' },
  { key: 'revenuePerShare', label: 'Revenue/Share' },
  { key: 'revenueGrowth', label: 'Revenue Growth %' },
  { key: 'earningsGrowth', label: 'Earnings Growth %' },
  { key: 'currentRatio', label: 'Current Ratio' },
  { key: 'quickRatio', label: 'Quick Ratio' },
  { key: 'deRatio', label: 'D/E Ratio' },
  { key: 'dividendYield', label: 'Dividend Yield %' },
  { key: 'beta', label: 'Beta' },
  { key: 'marketCap', label: 'Market Cap' },
  { key: 'fiftyTwoWeekHigh', label: '52W High' },
  { key: 'fiftyTwoWeekLow', label: '52W Low' },
];

const OPERATORS = [
  { value: '>', label: 'Greater than' },
  { value: '>=', label: 'Greater than or equal to' },
  { value: '<', label: 'Less than' },
  { value: '<=', label: 'Less than or equal to' },
  { value: '=', label: 'Equal to' },
  { value: 'between', label: 'Between' },
];

function evaluateCondition(cond, financials) {
  const actual = financials?.[cond.metric];
  if (actual === null || actual === undefined) return null;
  switch (cond.operator) {
    case '>': return actual > cond.value;
    case '<': return actual < cond.value;
    case '>=': return actual >= cond.value;
    case '<=': return actual <= cond.value;
    case '=': return actual === cond.value;
    default: return null;
  }
}

function evaluateCase(thesisCase, financials) {
  if (!thesisCase?.conditions?.length) return false;
  return thesisCase.conditions.every(c => evaluateCondition(c, financials) === true);
}

export default function StockDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [stock, setStock] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [thesisCases, setThesisCases] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeTab, setActiveTab] = useState('thesis');
  const [loading, setLoading] = useState(true);

  // Thesis builder state
  const [editingType, setEditingType] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [saving, setSaving] = useState(false);

  // Notes state
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    try {
      const [watchlistRes, thesisRes, notesRes] = await Promise.all([
        api.get('/watchlist'),
        api.get(`/thesis/${id}`),
        api.get(`/notes/${id}`)
      ]);

      const stockItem = watchlistRes.data.find(w => w.id === parseInt(id));
      setStock(stockItem);
      setThesisCases(thesisRes.data);
      setNotes(notesRes.data);

      if (stockItem) {
        const finRes = await api.get(`/stock/${stockItem.symbol}/financials?market=${stockItem.market}`);
        setFinancials(finRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (type) => {
    const existing = thesisCases.find(tc => tc.type === type);
    setEditingType(type);
    setExplanation(existing?.explanation || '');

    if (existing?.conditions?.length) {
      // Group paired between conditions
      const grouped = [];
      const used = new Set();
      existing.conditions.forEach((c, i) => {
        if (used.has(i)) return;
        if (c.operator === '>=') {
          const pair = existing.conditions.findIndex((c2, j) => j > i && c2.metric === c.metric && c2.operator === '<=');
          if (pair !== -1) {
            grouped.push({ metric: c.metric, operator: 'between', value: c.value, value2: existing.conditions[pair].value });
            used.add(i); used.add(pair); return;
          }
        }
        grouped.push({ metric: c.metric, operator: c.operator, value: c.value, value2: '' });
        used.add(i);
      });
      setConditions(grouped);
    } else {
      setConditions([{ metric: 'peRatio', operator: '>', value: '', value2: '' }]);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, { metric: 'peRatio', operator: '>', value: '', value2: '' }]);
  };

  const removeCondition = (i) => {
    setConditions(conditions.filter((_, idx) => idx !== i));
  };

  const updateCondition = (i, field, val) => {
    const updated = [...conditions];
    updated[i] = { ...updated[i], [field]: val };
    if (field === 'operator' && val !== 'between') updated[i].value2 = '';
    setConditions(updated);
  };

  const saveThesis = async () => {
    if (conditions.length === 0) return alert('Add at least one condition.');
    for (const c of conditions) {
      if (!c.value) return alert('Fill in all condition values.');
      if (c.operator === 'between' && !c.value2) return alert('Fill in both values for Between conditions.');
    }

    // Expand between conditions
    const expanded = [];
    conditions.forEach(c => {
      if (c.operator === 'between') {
        expanded.push({ metric: c.metric, operator: '>=', value: c.value });
        expanded.push({ metric: c.metric, operator: '<=', value: c.value2 });
      } else {
        expanded.push({ metric: c.metric, operator: c.operator, value: c.value });
      }
    });

    setSaving(true);
    try {
      await api.post(`/thesis/${id}`, { type: editingType, explanation, conditions: expanded });
      setEditingType(null);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save thesis.');
    } finally { setSaving(false); }
  };

  const deleteThesis = async (caseId) => {
    if (!confirm('Delete this thesis case?')) return;
    try {
      await api.delete(`/thesis/${caseId}`);
      fetchAll();
    } catch { alert('Failed to delete.'); }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      await api.post(`/notes/${id}`, { content: newNote });
      setNewNote('');
      fetchAll();
    } catch { alert('Failed to add note.'); }
  };

  const updateNote = async (noteId) => {
    if (!editingNoteContent.trim()) return;
    try {
      await api.put(`/notes/${noteId}`, { content: editingNoteContent });
      setEditingNote(null);
      fetchAll();
    } catch { alert('Failed to update note.'); }
  };

  const deleteNote = async (noteId) => {
    if (!confirm('Delete this note?')) return;
    try {
      await api.delete(`/notes/${noteId}`);
      fetchAll();
    } catch { alert('Failed to delete note.'); }
  };

  const formatVal = (val) => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'number') {
      if (val > 1e9) return `${(val / 1e9).toFixed(2)}B`;
      if (val > 1e6) return `${(val / 1e6).toFixed(2)}M`;
      return val.toFixed(2);
    }
    return val;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
      <p className="text-gray-400 font-mono">Loading...</p>
    </div>
  );

  if (!stock) return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
      <p className="text-gray-400 font-mono">Stock not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Navbar */}
      <nav className="border-b border-[#1e2d4a] px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Dashboard
        </button>
        <div className="flex items-center gap-3">
          <span className="text-white font-bold font-mono text-xl">{stock.symbol}</span>
          <span className="text-xs bg-[#1a2440] text-gray-400 px-2 py-0.5 rounded font-mono">{stock.market}</span>
          <span className="text-gray-400 text-sm">{stock.companyName}</span>
        </div>
        {financials?.currentPrice && (
          <span className="ml-auto text-[#00ff88] font-mono font-bold text-lg">
            {financials.currency === 'INR' ? '₹' : '$'}{financials.currentPrice.toFixed(2)}
          </span>
        )}
      </nav>

      {/* Thesis Status Bar */}
      <div className="border-b border-[#1e2d4a] px-6 py-3 flex items-center gap-3">
        <span className="text-gray-400 text-xs font-mono">THESIS STATUS:</span>
        {['BUY', 'HOLD', 'SELL'].map(type => {
          const tc = thesisCases.find(t => t.type === type);
          const triggered = tc ? evaluateCase(tc, financials) : null;
          return (
            <span key={type} className={`px-3 py-1 rounded text-xs font-mono font-semibold
              ${triggered === true
                ? type === 'BUY' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : type === 'SELL' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : triggered === false
                ? 'bg-gray-800 text-gray-600 border border-gray-700'
                : 'bg-gray-800/50 text-gray-600 border border-gray-700/50'}`}>
              {type === 'BUY' ? '🟢' : type === 'SELL' ? '🔴' : '🟡'} {type}
              {triggered === true ? ' ✓' : triggered === false ? ' ✗' : ' —'}
            </span>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1e2d4a] px-6">
        {['thesis', 'financials', 'notes'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-mono uppercase tracking-wider transition-colors border-b-2 mr-2
              ${activeTab === tab ? 'border-[#00ff88] text-[#00ff88]' : 'border-transparent text-gray-400 hover:text-white'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* THESIS TAB */}
        {activeTab === 'thesis' && (
          <div className="space-y-6">
            {['BUY', 'HOLD', 'SELL'].map(type => {
              const tc = thesisCases.find(t => t.type === type);
              const triggered = tc ? evaluateCase(tc, financials) : null;
              const isEditing = editingType === type;

              return (
                <div key={type} className={`bg-[#0f1629] border rounded-xl p-6
                  ${triggered === true
                    ? type === 'BUY' ? 'border-green-500/40' : type === 'SELL' ? 'border-red-500/40' : 'border-yellow-500/40'
                    : 'border-[#1e2d4a]'}`}>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold font-mono
                        ${type === 'BUY' ? 'text-green-400' : type === 'SELL' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {type === 'BUY' ? '🟢' : type === 'SELL' ? '🔴' : '🟡'} {type}
                      </span>
                      {triggered === true && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-mono">TRIGGERED</span>}
                    </div>
                    <div className="flex gap-2">
                      {tc && !isEditing && (
                        <button onClick={() => deleteThesis(tc.id)}
                          className="text-xs text-gray-500 hover:text-red-400 transition-colors font-mono">
                          DELETE
                        </button>
                      )}
                      {!isEditing && (
                        <button onClick={() => startEditing(type)}
                          className="text-xs bg-[#1a2440] hover:bg-[#243055] text-gray-300 px-3 py-1.5 rounded font-mono transition-colors">
                          {tc ? 'EDIT' : '+ SET CONDITIONS'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Existing conditions display */}
                  {!isEditing && tc && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        {/* Group and display conditions */}
                        {(() => {
                          const conds = tc.conditions;
                          const displayed = [];
                          const used = new Set();
                          conds.forEach((c, i) => {
                            if (used.has(i)) return;
                            if (c.operator === '>=') {
                              const pair = conds.findIndex((c2, j) => j > i && c2.metric === c.metric && c2.operator === '<=');
                              if (pair !== -1) {
                                const metricLabel = METRICS.find(m => m.key === c.metric)?.label || c.metric;
                                const result = financials ? (financials[c.metric] >= c.value && financials[c.metric] <= conds[pair].value) : null;
                                displayed.push(
                                  <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-mono
                                    ${result === true ? 'bg-green-500/10 border border-green-500/20' :
                                      result === false ? 'bg-red-500/10 border border-red-500/20' :
                                      'bg-[#1a2440]'}`}>
                                    <span className="text-gray-300">{metricLabel} <span className="text-white">between {c.value} and {conds[pair].value}</span></span>
                                    <span>{result === true ? '✅' : result === false ? '❌' : '—'}</span>
                                  </div>
                                );
                                used.add(i); used.add(pair); return;
                              }
                            }
                            const metricLabel = METRICS.find(m => m.key === c.metric)?.label || c.metric;
                            const result = evaluateCondition(c, financials);
                            displayed.push(
                              <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-mono
                                ${result === true ? 'bg-green-500/10 border border-green-500/20' :
                                  result === false ? 'bg-red-500/10 border border-red-500/20' :
                                  'bg-[#1a2440]'}`}>
                                <span className="text-gray-300">{metricLabel} <span className="text-white">{c.operator} {c.value}</span></span>
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-500">Current: <span className="text-white">{formatVal(financials?.[c.metric])}</span></span>
                                  <span>{result === true ? '✅' : result === false ? '❌' : '—'}</span>
                                </div>
                              </div>
                            );
                            used.add(i);
                          });
                          return displayed;
                        })()}
                      </div>
                      {tc.explanation && (
                        <div className="mt-3 bg-[#1a2440] rounded-lg px-4 py-3">
                          <p className="text-xs text-gray-400 font-mono mb-1">EXPLANATION</p>
                          <p className="text-gray-300 text-sm">{tc.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit mode */}
                  {isEditing && (
                    <div className="space-y-3">
                      {conditions.map((cond, i) => (
                        <div key={i} className="flex items-center gap-2 flex-wrap">
                          <select value={cond.metric} onChange={e => updateCondition(i, 'metric', e.target.value)}
                            className="bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] flex-1 min-w-32">
                            {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                          </select>

                          <select value={cond.operator} onChange={e => updateCondition(i, 'operator', e.target.value)}
                            className="bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88]">
                            {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>

                          <input type="number" value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)}
                            placeholder="Value"
                            className="bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] w-24" />

                          {cond.operator === 'between' && (
                            <>
                              <span className="text-gray-400 text-sm font-mono">and</span>
                              <input type="number" value={cond.value2} onChange={e => updateCondition(i, 'value2', e.target.value)}
                                placeholder="Value"
                                className="bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] w-24" />
                            </>
                          )}

                          <button onClick={() => removeCondition(i)}
                            className="text-gray-500 hover:text-red-400 transition-colors text-xl leading-none">×</button>
                        </div>
                      ))}

                      <button onClick={addCondition}
                        className="text-xs text-[#00ff88] hover:underline font-mono">
                        + Add Condition
                      </button>

                      <div>
                        <label className="text-gray-400 text-xs font-mono mb-1 block">EXPLANATION (optional)</label>
                        <textarea value={explanation} onChange={e => setExplanation(e.target.value)}
                          rows={3}
                          placeholder="Why did you set these conditions?"
                          className="w-full bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#00ff88] resize-none" />
                      </div>

                      <div className="flex gap-2">
                        <button onClick={saveThesis} disabled={saving}
                          className="bg-[#00ff88] hover:bg-[#00cc6a] text-black font-semibold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
                          {saving ? 'Saving...' : 'Save Thesis'}
                        </button>
                        <button onClick={() => setEditingType(null)}
                          className="bg-[#1a2440] hover:bg-[#243055] text-gray-300 px-5 py-2 rounded-lg text-sm transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {!isEditing && !tc && (
                    <p className="text-gray-600 text-sm font-mono">No conditions set yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* FINANCIALS TAB */}
        {activeTab === 'financials' && (
          <div>
            {!financials ? (
              <p className="text-gray-400 font-mono">Loading financials...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {METRICS.map(m => (
                  <div key={m.key} className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-gray-400 text-sm font-mono">{m.label}</span>
                    <span className="text-white font-mono font-semibold">{formatVal(financials[m.key])}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-4">
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                rows={3} placeholder="Add a note about this stock..."
                className="w-full bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#00ff88] resize-none mb-3" />
              <button onClick={addNote}
                className="bg-[#00ff88] hover:bg-[#00cc6a] text-black font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
                Add Note
              </button>
            </div>

            {notes.length === 0 ? (
              <p className="text-gray-600 font-mono text-sm">No notes yet.</p>
            ) : (
              notes.map(note => (
                <div key={note.id} className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-4">
                  {editingNote === note.id ? (
                    <div className="space-y-3">
                      <textarea value={editingNoteContent} onChange={e => setEditingNoteContent(e.target.value)}
                        rows={3}
                        className="w-full bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#00ff88] resize-none" />
                      <div className="flex gap-2">
                        <button onClick={() => updateNote(note.id)}
                          className="bg-[#00ff88] text-black font-semibold px-4 py-1.5 rounded text-sm">Save</button>
                        <button onClick={() => setEditingNote(null)}
                          className="bg-[#1a2440] text-gray-300 px-4 py-1.5 rounded text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-300 text-sm mb-3">{note.content}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-xs font-mono">{new Date(note.updatedAt).toLocaleDateString()}</span>
                        <div className="flex gap-3">
                          <button onClick={() => { setEditingNote(note.id); setEditingNoteContent(note.content); }}
                            className="text-xs text-gray-400 hover:text-white font-mono transition-colors">EDIT</button>
                          <button onClick={() => deleteNote(note.id)}
                            className="text-xs text-gray-400 hover:text-red-400 font-mono transition-colors">DELETE</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}