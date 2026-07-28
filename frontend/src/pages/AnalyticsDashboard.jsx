import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { BarChart2, TrendingUp, CheckCircle, AlertTriangle, Clock, Users, Download, RefreshCw, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#06B6D4'];

const KPICard = ({ label, value, icon: Icon, color, sub }) => (
  <div className={`bg-[#1A1A2E] border border-white/10 rounded-2xl p-5 flex items-start gap-4`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`} style={{ background: `${color}22` }}>
      <Icon size={22} style={{ color }} />
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#1A1A2E] border border-white/10 rounded-xl p-3 shadow-xl">
        <p className="text-white font-semibold text-sm mb-2">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="text-xs">{p.name}: <strong>{p.value}</strong></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsDashboard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [engineerData, setEngineerData] = useState([]);
  const [slaData, setSlaData] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [exporting, setExporting] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateRange.start) params.set('startDate', dateRange.start);
    if (dateRange.end) params.set('endDate', dateRange.end);
    const qs = params.toString() ? `?${params}` : '';

    try {
      const [ov, st, pr, cat, mo, eng, sla] = await Promise.all([
        fetch(`${API_BASE}/analytics/overview${qs}`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/analytics/tickets/status${qs}`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/analytics/tickets/priority${qs}`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/analytics/tickets/category${qs}`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/analytics/trends/monthly`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/analytics/engineers${qs}`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/analytics/sla${qs}`, { headers }).then(r => r.json()),
      ]);
      setOverview(ov);
      setStatusData(st.data || []);
      setPriorityData(pr.data || []);
      setCategoryData(cat.data || []);
      setMonthlyData(mo.data || []);
      setEngineerData(eng.data || []);
      setSlaData(sla.data || []);
    } catch (err) {
      console.error('[Analytics] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, dateRange]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleExport = async (type) => {
    setExporting(true);
    const params = new URLSearchParams({ type, format: 'csv' });
    if (dateRange.start) params.set('startDate', dateRange.start);
    if (dateRange.end) params.set('endDate', dateRange.end);
    try {
      const res = await fetch(`${API_BASE}/analytics/export?${params}`, { headers });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${type}-report.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Analytics] Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tickets = overview?.tickets || {};
  const slaInfo = overview?.sla || {};
  const satisfaction = overview?.satisfaction || {};

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <BarChart2 size={20} className="text-indigo-400" />
            </div>
            Analytics Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real-time support metrics and performance insights</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
          <button onClick={fetchAll} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => handleExport('tickets')} disabled={exporting}
            className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 px-3 py-2 rounded-xl text-sm font-medium transition-all">
            <Download size={15} /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Tickets" value={tickets.total_tickets} icon={BarChart2} color="#6366F1"
          sub={`${tickets.open_tickets || 0} open`} />
        <KPICard label="Resolved" value={tickets.resolved_tickets} icon={CheckCircle} color="#10B981"
          sub={`${tickets.closed_tickets || 0} closed`} />
        <KPICard label="SLA Breaches" value={tickets.sla_breaches} icon={AlertTriangle} color="#EF4444"
          sub={`${slaInfo.sla_compliant || 0} compliant`} />
        <KPICard label="Avg Resolution" value={tickets.avg_resolution_hours ? `${tickets.avg_resolution_hours}h` : '—'} icon={Clock} color="#F59E0B"
          sub={`${satisfaction.avg_satisfaction || '—'} ⭐ avg rating`} />
      </div>

      {/* Charts Row 1: Monthly Trend + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1A1A2E] border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-400" /> Monthly Ticket Trends
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }} />
              <Area type="monotone" dataKey="total" name="Total" stroke="#6366F1" fill="url(#gradTotal)" strokeWidth={2} />
              <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10B981" fill="url(#gradResolved)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90}
                label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#334155' }}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Priority + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Tickets by Priority</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis type="number" tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis type="category" dataKey="priority" tick={{ fill: '#94A3B8', fontSize: 12 }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Tickets" radius={[0, 6, 6, 0]}>
                {priorityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Tickets by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="category" tick={{ fill: '#64748B', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Tickets" fill="#6366F1" radius={[6, 6, 0, 0]}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SLA Compliance */}
      <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Clock size={16} className="text-amber-400" /> SLA Compliance by Priority
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={slaData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="priority" tick={{ fill: '#94A3B8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }} />
            <Bar dataKey="compliant" name="Compliant" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="breached" name="Breached" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Engineer Performance Table */}
      {engineerData.length > 0 && (
        <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Users size={16} className="text-indigo-400" /> Engineer Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Engineer', 'Assigned', 'Resolved', 'SLA Breaches', 'Avg Rating', 'Avg Resolution'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {engineerData.map((e, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-white font-medium">{e.engineer}</td>
                    <td className="py-3 px-3 text-slate-300">{e.assigned_tickets}</td>
                    <td className="py-3 px-3 text-emerald-400 font-semibold">{e.resolved_tickets}</td>
                    <td className="py-3 px-3">
                      <span className={`font-semibold ${Number(e.sla_breaches) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {e.sla_breaches}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-amber-400">{e.avg_rating ? `${e.avg_rating} ⭐` : '—'}</td>
                    <td className="py-3 px-3 text-slate-300">{e.avg_resolution_hours ? `${e.avg_resolution_hours}h` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
