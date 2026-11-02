import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, BookOpen, Ticket, User, MessageSquare, ExternalLink, Star, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

const ENTITY_ICONS = {
  ticket: <Ticket size={14} className="text-indigo-400" />,
  knowledge: <BookOpen size={14} className="text-emerald-400" />,
  user: <User size={14} className="text-blue-400" />,
  comment: <MessageSquare size={14} className="text-amber-400" />
};

const ENTITY_COLORS = {
  ticket: 'bg-indigo-500/10 border-indigo-500/20',
  knowledge: 'bg-emerald-500/10 border-emerald-500/20',
  user: 'bg-blue-500/10 border-blue-500/20',
  comment: 'bg-amber-500/10 border-amber-500/20'
};

export default function SearchResultsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [type, setType] = useState(searchParams.get('type') || 'all');
  const [results, setResults] = useState({});
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recent, setRecent] = useState([]);
  const [saved, setSaved] = useState([]);
  const inputRef = useRef(null);
  const suggestTimer = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/search/recent`, { headers });
      const data = await res.json();
      setRecent(data.recent || []);
    } catch (_) {}
  }, [token]);

  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/search/saved`, { headers });
      const data = await res.json();
      setSaved(data.saved || []);
    } catch (_) {}
  }, [token]);

  useEffect(() => {
    fetchRecent();
    fetchSaved();
  }, [fetchRecent, fetchSaved]);

  const doSearch = useCallback(async (q, t = type) => {
    if (!q || q.trim().length < 2) return;
    setLoading(true);
    setShowSuggestions(false);
    setSearchParams({ q, type: t });
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}&type=${t}`, { headers });
      const data = await res.json();
      setResults(data.results || {});
      setTotalResults(data.totalResults || 0);
    } catch (err) {
      console.error('[Search] doSearch error:', err);
    } finally {
      setLoading(false);
    }
  }, [type, token]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); doSearch(q, searchParams.get('type') || 'all'); }
  }, []);

  const handleSuggest = (val) => {
    setQuery(val);
    clearTimeout(suggestTimer.current);
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(val)}`, { headers });
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } catch (_) {}
    }, 300);
  };

  const handleSave = async () => {
    if (!query) return;
    try {
      await fetch(`${API_BASE}/search/saved`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type })
      });
      fetchSaved();
    } catch (_) {}
  };

  const TYPES = ['all', 'tickets', 'knowledge', 'users', 'comments'];

  const renderResult = (item) => {
    const isTicket = item.entity_type === 'ticket';
    const isKb = item.entity_type === 'knowledge';
    const isUser = item.entity_type === 'user';
    const link = isTicket ? `/tickets/${item.id}`
      : isKb ? `/knowledge-base`
      : isUser ? `/users` : null;

    return (
      <div
        key={item.id || `${item.entity_type}-${Math.random()}`}
        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:border-white/20 transition-all group ${ENTITY_COLORS[item.entity_type] || 'bg-white/5 border-white/10'}`}
        onClick={() => link && navigate(link)}
      >
        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          {ENTITY_ICONS[item.entity_type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              {item.entity_type}
            </span>
            {isTicket && item.ticket_number && (
              <span className="text-[10px] font-mono text-indigo-400">TKT-{item.ticket_number}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
            {item.title || item.label || item.name || item.comment?.slice(0, 80) || '—'}
          </p>
          {item.status && (
            <span className="text-xs text-slate-400 mt-1 block">{item.status} · {item.priority}</span>
          )}
          {item.category && !isTicket && (
            <span className="text-xs text-slate-400 mt-1 block">{item.category}</span>
          )}
          {item.email && <span className="text-xs text-slate-400 mt-1 block">{item.email}</span>}
        </div>
        {link && <ExternalLink size={14} className="text-slate-600 group-hover:text-slate-300 transition-colors flex-shrink-0 mt-1" />}
      </div>
    );
  };

  const allItems = Object.values(results).flat();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            <Search size={20} className="text-indigo-400" />
          </div>
          Global Search
        </h1>

        {/* Search Bar */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-[#1A1A2E] border border-white/20 rounded-2xl px-4 py-3 focus-within:border-indigo-500 transition-colors">
            <Search size={18} className="text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleSuggest(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch(query)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search tickets, knowledge base, users, comments..."
              className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
              autoFocus
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults({}); setSuggestions([]); }}
                className="text-slate-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            )}
            <button onClick={() => doSearch(query)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-sm font-medium transition-all flex-shrink-0">
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
            </button>
          </div>

          {/* Autocomplete */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A2E] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(s.label); setShowSuggestions(false); doSearch(s.label); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left border-b border-white/5 last:border-0"
                >
                  {ENTITY_ICONS[s.type]}
                  <span className="text-sm text-white">{s.label}</span>
                  <span className="text-xs text-slate-500 ml-auto">{s.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 mt-3 w-fit flex-wrap">
          {TYPES.map(t => (
            <button
              key={t}
              onClick={() => { setType(t); if (query) doSearch(query, t); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                type === t ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Searches */}
      {!loading && allItems.length === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {recent.length > 0 && (
            <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-4">
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock size={12} /> Recent Searches
              </h3>
              <div className="space-y-1">
                {recent.map((r, i) => (
                  <button key={i} onClick={() => { setQuery(r.query); doSearch(r.query); }}
                    className="w-full flex items-center gap-2 text-sm text-slate-300 hover:text-white py-2 px-2 rounded-lg hover:bg-white/5 transition-all text-left">
                    <Search size={12} className="text-slate-500" />
                    {r.query}
                  </button>
                ))}
              </div>
            </div>
          )}
          {saved.length > 0 && (
            <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-4">
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <Star size={12} /> Saved Searches
              </h3>
              <div className="space-y-1">
                {saved.map((s, i) => (
                  <button key={i} onClick={() => { setQuery(s.query); doSearch(s.query); }}
                    className="w-full flex items-center gap-2 text-sm text-slate-300 hover:text-white py-2 px-2 rounded-lg hover:bg-white/5 transition-all text-left">
                    <Star size={12} className="text-amber-400" />
                    {s.query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="text-indigo-400 animate-spin" />
        </div>
      )}

      {!loading && totalResults > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-400 text-sm">
              <strong className="text-white">{totalResults}</strong> results for "{query}"
            </p>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors">
              <Star size={12} /> Save Search
            </button>
          </div>
          <div className="space-y-2">{allItems.map(renderResult)}</div>
        </div>
      )}

      {!loading && query && totalResults === 0 && (
        <div className="text-center py-16">
          <Search size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No results found</p>
          <p className="text-slate-600 text-sm mt-1">Try different keywords or adjust the filter</p>
        </div>
      )}
    </div>
  );
}
