import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, Download, Eye, Trash2, Tag, Search, Folder, BarChart2, Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';

const CATEGORY_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16'];

const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState('files');
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ file: null, description: '', categoryId: '', tags: '', folderPath: '/' });
  const [toast, setToast] = useState(null);
  const [total, setTotal] = useState(0);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: 50 });
      if (search) params.set('search', search);
      if (selectedCategory) params.set('categoryId', selectedCategory);

      const [docsRes, catsRes, statsRes] = await Promise.all([
        api.get(`/documents?${params}`),
        api.get('/documents/meta/categories'),
        api.get('/documents/storage-stats'),
      ]);
      setDocuments(docsRes.data.documents || []);
      setTotal(docsRes.data.total || 0);
      setCategories(catsRes.data.categories || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('[DocumentManagement]', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) return showToast('Please select a file', 'error');
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      if (uploadForm.description) formData.append('description', uploadForm.description);
      if (uploadForm.categoryId) formData.append('categoryId', uploadForm.categoryId);
      if (uploadForm.tags) formData.append('tags', uploadForm.tags);
      if (uploadForm.folderPath) formData.append('folderPath', uploadForm.folderPath);

      await api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('File uploaded successfully');
      setUploadModal(false);
      setUploadForm({ file: null, description: '', categoryId: '', tags: '', folderPath: '/' });
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('Download failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      showToast('Document deleted');
      fetchData();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📧';
    if (mimeType.includes('zip')) return '🗜️';
    if (mimeType.includes('text')) return '📃';
    return '📄';
  };

  const statCards = [
    { label: 'Total Files', value: stats?.stats?.total_files || 0, icon: FileText, color: '#6366F1' },
    { label: 'Storage Used', value: formatBytes(stats?.stats?.total_size_bytes), icon: BarChart2, color: '#10B981' },
    { label: 'Downloads', value: stats?.stats?.total_downloads || 0, icon: Download, color: '#F59E0B' },
    { label: 'Categories', value: stats?.stats?.total_categories || 0, icon: Folder, color: '#8B5CF6' },
  ];

  return (
    <div className="page-wrapper" style={{ padding: '24px' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px',
          background: toast.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
          borderRadius: '12px', padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} color="#EF4444" /> : <CheckCircle size={18} color="#10B981" />}
          <span style={{ fontSize: '14px', fontWeight: 500, color: toast.type === 'error' ? '#991B1B' : '#065F46' }}>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>Document Management</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #94a3b8)', fontSize: '14px' }}>
            {total} files · Enterprise document repository
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setUploadModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Upload size={16} /> Upload File
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {statCards.map((card) => (
          <div key={card.label} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: `${card.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <card.icon size={22} color={card.color} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800 }}>{card.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input" style={{ width: 'auto', minWidth: '160px' }} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Files List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading documents...</div>
        ) : documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <FileText size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', color: '#64748b' }}>No documents found</h3>
            <p style={{ color: '#94a3b8', margin: 0 }}>Upload a file to get started</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                {['File', 'Category', 'Size', 'Downloads', 'Uploaded By', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{getFileIcon(doc.mime_type)}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{doc.file_name}</div>
                        {doc.description && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{doc.description}</div>}
                        {doc.tags?.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {doc.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} style={{ fontSize: '10px', background: '#6366F120', color: '#6366F1', borderRadius: '4px', padding: '1px 6px' }}>
                                <Tag size={9} style={{ marginRight: '3px', verticalAlign: 'middle' }} />{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {doc.category_name ? (
                      <span style={{
                        fontSize: '12px', fontWeight: 600, padding: '3px 10px',
                        borderRadius: '99px', background: `${doc.category_color || '#6366F1'}20`,
                        color: doc.category_color || '#6366F1',
                      }}>{doc.category_name}</span>
                    ) : <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{formatBytes(doc.file_size)}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{doc.download_count || 0}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{doc.uploaded_by_name}</td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8' }}>
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleDownload(doc)} title="Download" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: '#6366F1' }}>
                        <Download size={15} />
                      </button>
                      <button onClick={() => handleDelete(doc.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', color: '#EF4444' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Upload Document</h2>
              <button onClick={() => setUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>File *</label>
                <input
                  type="file"
                  className="form-input"
                  onChange={(e) => setUploadForm(f => ({ ...f, file: e.target.files[0] }))}
                  style={{ padding: '8px 12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Description</label>
                <input className="form-input" placeholder="Brief description..." value={uploadForm.description} onChange={(e) => setUploadForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Category</label>
                <select className="form-input" value={uploadForm.categoryId} onChange={(e) => setUploadForm(f => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">Select category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Tags (comma-separated)</label>
                <input className="form-input" placeholder="security, policy, report..." value={uploadForm.tags} onChange={(e) => setUploadForm(f => ({ ...f, tags: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" disabled={uploading} style={{ flex: 1 }}>
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setUploadModal(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;
