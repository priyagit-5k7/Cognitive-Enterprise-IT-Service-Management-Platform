import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BookOpen, Search, ChevronDown, ChevronUp, Tag, AlertTriangle } from 'lucide-react';

const KnowledgeBase = () => {
  const { authFetch, API_BASE } = useContext(AuthContext);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const categories = [
    'All Categories',
    'Hardware Support',
    'Software Issues',
    'Network & Internet',
    'Account & Access',
    'General Request'
  ];

  const categoryColors = {
    'Hardware Support': { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
    'Software Issues': { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' },
    'Network & Internet': { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
    'Account & Access': { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
    'General Request': { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }
  };

  const categoryEmojis = {
    'Hardware Support': '🖥️',
    'Software Issues': '💻',
    'Network & Internet': '🌐',
    'Account & Access': '🔐',
    'General Request': '📋'
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter && categoryFilter !== 'All Categories') {
        params.append('category', categoryFilter);
      }

      const res = await authFetch(`${API_BASE}/ai/knowledge-base?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load knowledge base');
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line
  }, [categoryFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchArticles();
  };

  const toggleArticle = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Group articles by category
  const groupedArticles = categories
    .filter(c => c !== 'All Categories')
    .reduce((acc, cat) => {
      const catArticles = articles.filter(a => a.category === cat);
      if (catArticles.length > 0) acc[cat] = catArticles;
      return acc;
    }, {});

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <BookOpen size={26} color="#fff" />
          </div>
          <div>
            <h1 style={styles.headerTitle}>Knowledge Base</h1>
            <p style={styles.headerSubtitle}>Browse common IT issues and step-by-step resolutions</p>
          </div>
        </div>
        <div style={styles.statsChip}>
          <BookOpen size={14} color="#6366F1" />
          {articles.length} articles
        </div>
      </div>

      {/* Search and Filters */}
      <div style={styles.controlBar}>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <div style={styles.searchWrapper}>
            <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search issues, keywords, solutions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <button type="submit" style={styles.searchBtn}>Search</button>
        </form>

        <div style={styles.categoryTabs}>
          {categories.map(cat => (
            <button
              key={cat}
              style={{
                ...styles.categoryTab,
                ...(categoryFilter === cat || (cat === 'All Categories' && !categoryFilter)
                  ? styles.categoryTabActive
                  : {})
              }}
              onClick={() => setCategoryFilter(cat === 'All Categories' ? '' : cat)}
            >
              {cat !== 'All Categories' && (categoryEmojis[cat] || '📁')}{' '}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner} />
          <p style={styles.loadingText}>Loading knowledge base...</p>
        </div>
      ) : error ? (
        <div style={styles.errorContainer}>
          <AlertTriangle size={36} color="#EF4444" />
          <p style={styles.errorText}>{error}</p>
          <button style={styles.retryBtn} onClick={fetchArticles}>Retry</button>
        </div>
      ) : articles.length === 0 ? (
        <div style={styles.emptyState}>
          <BookOpen size={48} color="#D1D5DB" />
          <p style={styles.emptyTitle}>No articles found</p>
          <p style={styles.emptySubtext}>Try adjusting your search or category filter</p>
        </div>
      ) : (
        <div style={styles.articlesContainer}>
          {Object.entries(groupedArticles).map(([category, catArticles]) => {
            const catColor = categoryColors[category] || { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
            return (
              <div key={category} style={styles.categorySection}>
                <div style={styles.categorySectionHeader}>
                  <span style={styles.categorySectionEmoji}>{categoryEmojis[category]}</span>
                  <h2 style={styles.categorySectionTitle}>{category}</h2>
                  <span style={{ ...styles.categoryCount, background: catColor.bg, color: catColor.text }}>
                    {catArticles.length} article{catArticles.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div style={styles.articlesList}>
                  {catArticles.map(article => {
                    const isExpanded = expandedId === article.id;
                    return (
                      <div key={article.id} style={styles.articleCard}>
                        <button
                          style={styles.articleHeader}
                          onClick={() => toggleArticle(article.id)}
                        >
                          <div style={styles.articleHeaderLeft}>
                            <span style={styles.articleTitle}>{article.title}</span>
                            <div style={styles.articleKeywords}>
                              {(article.keywords || []).slice(0, 4).map(kw => (
                                <span key={kw} style={styles.keywordTag}>{kw}</span>
                              ))}
                            </div>
                          </div>
                          <div style={styles.articleHeaderRight}>
                            <span style={{ ...styles.categoryBadge, background: catColor.bg, color: catColor.text }}>
                              {category}
                            </span>
                            {isExpanded
                              ? <ChevronUp size={18} color="#6B7280" />
                              : <ChevronDown size={18} color="#6B7280" />
                            }
                          </div>
                        </button>

                        {isExpanded && (
                          <div style={styles.articleBody}>
                            <div style={styles.problemSection}>
                              <h4 style={styles.sectionLabel}>🔍 Problem Description</h4>
                              <p style={styles.problemText}>{article.problem}</p>
                            </div>
                            <div style={styles.solutionSection}>
                              <h4 style={styles.sectionLabel}>✅ Resolution Steps</h4>
                              <div style={styles.solutionText}>
                                {article.solution.split('\n').map((line, i) => (
                                  <p key={i} style={styles.solutionLine}>{line}</p>
                                ))}
                              </div>
                            </div>
                            {article.keywords && article.keywords.length > 0 && (
                              <div style={styles.tagsSection}>
                                <Tag size={13} color="#9CA3AF" />
                                {article.keywords.map(kw => (
                                  <span key={kw} style={styles.fullKeywordTag}>{kw}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    padding: '28px 32px',
    maxWidth: '1100px',
    margin: '0 auto',
    fontFamily: "'Inter', 'Segoe UI', sans-serif"
  },
  loadingContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '300px', gap: '16px'
  },
  loadingSpinner: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '4px solid #E5E7EB', borderTop: '4px solid #6366F1',
    animation: 'spin 1s linear infinite'
  },
  loadingText: { color: '#6B7280', fontSize: '14px' },
  errorContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '300px', gap: '12px'
  },
  errorText: { color: '#EF4444', fontSize: '14px' },
  retryBtn: {
    padding: '8px 18px', background: '#6366F1', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '24px', flexWrap: 'wrap', gap: '12px'
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  headerIcon: {
    width: '50px', height: '50px', borderRadius: '14px',
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
  },
  headerTitle: { fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 },
  headerSubtitle: { fontSize: '13px', color: '#6B7280', margin: '4px 0 0' },
  statsChip: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '6px 14px', background: '#F5F3FF', border: '1px solid #DDD6FE',
    borderRadius: '20px', fontSize: '13px', fontWeight: 500, color: '#6366F1'
  },
  controlBar: { marginBottom: '28px' },
  searchForm: { display: 'flex', gap: '10px', marginBottom: '16px' },
  searchWrapper: {
    flex: 1, position: 'relative', display: 'flex', alignItems: 'center'
  },
  searchIcon: { position: 'absolute', left: '12px', pointerEvents: 'none' },
  searchInput: {
    width: '100%', paddingLeft: '38px', paddingRight: '14px',
    paddingTop: '10px', paddingBottom: '10px',
    border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '14px',
    color: '#111827', background: '#fff', outline: 'none',
    boxSizing: 'border-box'
  },
  searchBtn: {
    padding: '10px 20px', background: '#6366F1', color: '#fff',
    border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px',
    fontWeight: 500, flexShrink: 0
  },
  categoryTabs: {
    display: 'flex', flexWrap: 'wrap', gap: '8px'
  },
  categoryTab: {
    padding: '7px 14px', background: '#fff', border: '1px solid #E5E7EB',
    borderRadius: '20px', cursor: 'pointer', fontSize: '13px', color: '#6B7280',
    fontWeight: 500, transition: 'all 0.15s'
  },
  categoryTabActive: {
    background: '#6366F1', color: '#fff', borderColor: '#6366F1'
  },
  articlesContainer: { display: 'flex', flexDirection: 'column', gap: '32px' },
  categorySection: {},
  categorySectionHeader: {
    display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px'
  },
  categorySectionEmoji: { fontSize: '20px' },
  categorySectionTitle: {
    fontSize: '17px', fontWeight: 700, color: '#111827', margin: 0
  },
  categoryCount: {
    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600
  },
  articlesList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  articleCard: {
    background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px',
    overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.2s'
  },
  articleHeader: {
    width: '100%', display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: '12px', padding: '16px 20px',
    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left'
  },
  articleHeaderLeft: { flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' },
  articleTitle: { fontSize: '15px', fontWeight: 600, color: '#111827', lineHeight: 1.4 },
  articleKeywords: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
  keywordTag: {
    padding: '2px 8px', background: '#F9FAFB', border: '1px solid #E5E7EB',
    borderRadius: '10px', fontSize: '11px', color: '#6B7280'
  },
  articleHeaderRight: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
  categoryBadge: {
    padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 500
  },
  articleBody: {
    borderTop: '1px solid #F3F4F6', padding: '20px',
    background: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '16px'
  },
  problemSection: {},
  sectionLabel: { fontSize: '13px', fontWeight: 700, color: '#374151', margin: '0 0 8px' },
  problemText: { fontSize: '14px', color: '#6B7280', lineHeight: 1.6, margin: 0 },
  solutionSection: {},
  solutionText: { display: 'flex', flexDirection: 'column', gap: '4px' },
  solutionLine: {
    fontSize: '14px', color: '#374151', lineHeight: 1.6, margin: 0,
    paddingLeft: line => line.match(/^\d\./) ? '0' : '0'
  },
  tagsSection: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px',
    paddingTop: '8px', borderTop: '1px solid #E5E7EB'
  },
  fullKeywordTag: {
    padding: '2px 8px', background: '#EEF2FF', border: '1px solid #DDD6FE',
    borderRadius: '10px', fontSize: '11px', color: '#6366F1', fontWeight: 500
  },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '60px 20px', gap: '8px'
  },
  emptyTitle: { fontSize: '16px', fontWeight: 600, color: '#6B7280', margin: '10px 0 0' },
  emptySubtext: { fontSize: '13px', color: '#9CA3AF', margin: 0 }
};

export default KnowledgeBase;
