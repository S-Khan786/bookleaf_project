import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/StatusBadge';
import { showToast } from '../components/Toast';
import {
  Shield,
  LifeBuoy,
  Sparkles,
  Lock,
  Send,
  RefreshCw,
  Filter,
  CheckCircle,
  AlertTriangle,
  User,
  Clock,
  ArrowUpDown
} from 'lucide-react';

function getInitials(name) {
  if (!name) return 'OP';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
];

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export function AdminPortal() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('urgency'); // 'urgency' | 'newest'

  // Edit / Reply states
  const [editableDraft, setEditableDraft] = useState('');
  const [internalNoteContent, setInternalNoteContent] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [sendingNote, setSendingNote] = useState(false);
  const [regeneratingDraft, setRegeneratingDraft] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [statusFilter, categoryFilter, priorityFilter, sortBy]);

  // Polling ticket detail if selected
  useEffect(() => {
    let interval = null;
    if (selectedTicketId) {
      interval = setInterval(async () => {
        try {
          const updated = await api.getTicket(selectedTicketId);
          setTicketDetail(updated);
        } catch (e) {
          // ignore polling errors
        }
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedTicketId]);

  const loadTickets = async () => {
    try {
      const data = await api.getTickets({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        priority: priorityFilter || undefined,
        sort_by: sortBy,
      });
      setTickets(data);
      if (data.length > 0 && !selectedTicketId) {
        handleSelectTicket(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = async (id) => {
    setSelectedTicketId(id);
    try {
      const detail = await api.getTicket(id);
      setTicketDetail(detail);
      setEditableDraft(detail.ai_draft_response || '');
    } catch (err) {
      console.error('Failed to load ticket detail:', err);
    }
  };

  const handleOverrideClassification = async (newCategory, newPriority) => {
    if (!ticketDetail) return;
    try {
      const updated = await api.updateTicket(ticketDetail.id, {
        category: newCategory,
        priority: newPriority,
      });
      setTicketDetail(updated);
      showToast('Classification updated', 'info');
      loadTickets();
    } catch (err) {
      showToast('Failed to update: ' + err.message, 'error');
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!ticketDetail) return;
    try {
      const updated = await api.updateTicket(ticketDetail.id, { status: newStatus });
      setTicketDetail(updated);
      showToast(`Status changed to ${newStatus}`, 'info');
      loadTickets();
    } catch (err) {
      showToast('Failed to update status: ' + err.message, 'error');
    }
  };

  const handleAssignToMe = async () => {
    if (!ticketDetail || !user) return;
    try {
      const updated = await api.updateTicket(ticketDetail.id, { assigned_admin_id: user.id });
      setTicketDetail(updated);
      showToast('Ticket assigned to you', 'success');
      loadTickets();
    } catch (err) {
      showToast('Failed to assign ticket: ' + err.message, 'error');
    }
  };

  const handleSendDraft = async (e) => {
    e.preventDefault();
    if (!editableDraft.trim() || !ticketDetail) return;
    setSendingResponse(true);
    try {
      // 1. Post public message
      await api.postMessage(ticketDetail.id, {
        content: editableDraft,
        is_internal_note: false
      });
      // 2. Mark ticket as In Progress or Resolved
      await api.updateTicket(ticketDetail.id, {
        status: ticketDetail.status === 'Open' ? 'In Progress' : ticketDetail.status
      });
      // Refresh
      const updated = await api.getTicket(ticketDetail.id);
      setTicketDetail(updated);
      loadTickets();
      showToast('Response sent to author successfully!', 'success');
    } catch (err) {
      showToast('Failed to send response: ' + err.message, 'error');
    } finally {
      setSendingResponse(false);
    }
  };

  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!internalNoteContent.trim() || !ticketDetail) return;
    setSendingNote(true);
    try {
      await api.postMessage(ticketDetail.id, {
        content: internalNoteContent,
        is_internal_note: true
      });
      setInternalNoteContent('');
      showToast('Confidential internal note saved', 'success');
      const updated = await api.getTicket(ticketDetail.id);
      setTicketDetail(updated);
    } catch (err) {
      showToast('Failed to save note: ' + err.message, 'error');
    } finally {
      setSendingNote(false);
    }
  };

  const handleRegenerateDraft = async () => {
    if (!ticketDetail) return;
    setRegeneratingDraft(true);
    try {
      const updated = await api.regenerateDraft(ticketDetail.id);
      setTicketDetail(updated);
      setEditableDraft(updated.ai_draft_response || '');
      showToast('AI draft response regenerated!', 'info');
    } catch (err) {
      showToast('Failed to regenerate: ' + err.message, 'error');
    } finally {
      setRegeneratingDraft(false);
    }
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a5f' }}>
            BookLeaf Operations Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            AI-Assisted Author Support Queue & Response Management
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={loadTickets}>
          <RefreshCw size={14} /> Refresh Queue
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>
            <Filter size={16} /> Filters:
          </div>

          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={14} color="#64748b" />
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600 }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="urgency">⚡ Sort: Most Urgent & Oldest First</option>
              <option value="newest">🕒 Sort: Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Queue vs Ticket Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(500px, 2fr)', gap: '20px' }}>
        {/* Left: Ticket Queue */}
        <div className="card" style={{ padding: '16px', maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
          <div className="card-header" style={{ paddingBottom: '8px', marginBottom: '12px' }}>
            <h2 className="card-title" style={{ fontSize: '1rem' }}>
              <LifeBuoy size={16} /> Incoming Queue ({tickets.length})
            </h2>
          </div>

          {loading ? (
            <p style={{ color: '#64748b', padding: '20px' }}>Loading queue...</p>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
              <CheckCircle size={32} color="#059669" style={{ margin: '0 auto 8px' }} />
              <p>Queue is empty! All author tickets are resolved.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tickets.map((t) => {
                const isSelected = selectedTicketId === t.id;
                const isCritical = t.priority === 'Critical';
                const isHigh = t.priority === 'High';

                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t.id)}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#f0f7ff' : '#ffffff',
                      boxShadow: isCritical || isHigh ? '0 0 0 1px rgba(220, 38, 38, 0.2)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e3a5f' }}>
                        {t.ticket_number}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#0f172a', marginBottom: '4px' }}>
                      {t.subject}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                      <span>👤 {t.author_name}</span>
                      <span>📖 {t.book_title || 'General'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Ticket Detail & AI Draft Workspace */}
        <div className="card" style={{ padding: '24px' }}>
          {ticketDetail ? (
            <div>
              {/* Header Bar & Actions */}
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                      {ticketDetail.ticket_number} • Author: <strong>{ticketDetail.author?.name}</strong> ({ticketDetail.author?.email})
                    </span>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e3a5f', marginTop: '2px' }}>
                      {ticketDetail.subject}
                    </h2>
                  </div>

                  {/* Status Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Status:</span>
                    <select
                      className="form-select"
                      style={{ padding: '6px 12px', fontWeight: 600 }}
                      value={ticketDetail.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Classification Controls with Admin Overrides */}
                <div style={{ marginTop: '14px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Category:</span>
                    <select
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                      value={ticketDetail.category}
                      onChange={(e) => handleOverrideClassification(e.target.value, ticketDetail.priority)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Priority:</span>
                    <select
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                      value={ticketDetail.priority}
                      onChange={(e) => handleOverrideClassification(ticketDetail.category, e.target.value)}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={handleAssignToMe}
                  >
                    <User size={14} /> {ticketDetail.assigned_admin_id === user?.id ? 'Assigned to You' : 'Assign to Me'}
                  </button>
                </div>

                {ticketDetail.ai_classification_reason && (
                  <p style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '6px', fontStyle: 'italic' }}>
                    🤖 AI Reasoning: {ticketDetail.ai_classification_reason}
                  </p>
                )}
              </div>

              {/* Message History & Internal Notes */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '10px' }}>
                  Conversation History & Notes
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                  {ticketDetail.messages && ticketDetail.messages.map((m) => {
                    if (m.is_internal_note) {
                      return (
                        <div key={m.id} className="internal-note">
                          <div className="internal-note-badge">
                            <Lock size={12} /> Confidential Internal Note • {m.sender_name} ({new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </div>
                          <p style={{ color: '#713f12', whiteSpace: 'pre-line' }}>{m.content}</p>
                        </div>
                      );
                    }

                    const isAuthor = m.sender_role === 'author';
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                        }}
                      >
                        <div className={`avatar ${isAuthor ? 'avatar-author' : 'avatar-admin'}`} title={m.sender_name}>
                          {isAuthor ? getInitials(m.sender_name) : 'BL'}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            padding: '12px 14px',
                            borderRadius: '10px',
                            backgroundColor: isAuthor ? '#f1f5f9' : '#e0f2fe',
                            borderLeft: isAuthor ? '3px solid #64748b' : '3px solid #0284c7',
                          }}
                        >
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                            <strong>{m.sender_name}</strong> ({isAuthor ? 'Author' : 'BookLeaf Ops'}) • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <p style={{ whiteSpace: 'pre-line', fontSize: '0.92rem' }}>{m.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Drafted Response Editor */}
              <div className="ai-draft-box">
                <div className="ai-draft-header">
                  <span className="ai-badge">
                    <Sparkles size={14} /> AI-Drafted Response (BookLeaf Knowledge Base)
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ background: '#ffffff', fontSize: '0.75rem' }}
                    onClick={handleRegenerateDraft}
                    disabled={regeneratingDraft}
                  >
                    <RefreshCw size={12} /> {regeneratingDraft ? 'Regenerating...' : 'Regenerate Draft'}
                  </button>
                </div>

                <form onSubmit={handleSendDraft}>
                  <textarea
                    rows={6}
                    className="form-textarea"
                    style={{ backgroundColor: '#ffffff', fontSize: '0.9rem' }}
                    value={editableDraft}
                    onChange={(e) => setEditableDraft(e.target.value)}
                    placeholder="AI draft will appear here..."
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#0369a1' }}>
                      Review and tweak this draft before sending directly to the author.
                    </span>
                    <button
                      type="submit"
                      className="btn btn-accent btn-sm"
                      disabled={sendingResponse || !editableDraft.trim()}
                    >
                      <Send size={14} /> {sendingResponse ? 'Sending...' : 'Send Response to Author'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Add Internal Note Accordion/Form */}
              <div style={{ marginTop: '16px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#854d0e', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>
                  <Lock size={14} /> Add Private Internal Note (Visible to Operations Staff Only)
                </div>
                <form onSubmit={handleAddInternalNote} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ backgroundColor: '#ffffff' }}
                    placeholder="e.g. Verified bank IFSC code with finance team; payment in next batch..."
                    value={internalNoteContent}
                    onChange={(e) => setInternalNoteContent(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn btn-secondary btn-sm"
                    style={{ background: '#ca8a04', color: '#ffffff', borderColor: '#ca8a04' }}
                    disabled={sendingNote || !internalNoteContent.trim()}
                  >
                    Save Note
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <LifeBuoy size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>Select a ticket from the queue on the left to inspect and draft an AI-assisted response.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
