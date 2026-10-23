import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/StatusBadge';
import { showToast } from '../components/Toast';
import {
  BookOpen,
  LifeBuoy,
  PlusCircle,
  Clock,
  Send,
  Paperclip,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  CreditCard,
  MessageSquare,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';

function getInitials(name) {
  if (!name) return 'AU';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function PlatformBadge({ platform }) {
  const p = platform.toLowerCase();
  let cls = 'platform-pill platform-bookleaf';
  if (p.includes('amazon')) cls = 'platform-pill platform-amazon';
  else if (p.includes('flipkart')) cls = 'platform-pill platform-flipkart';

  return (
    <span className={cls}>
      <ShoppingBag size={10} /> {platform}
    </span>
  );
}

export function AuthorPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('books'); // 'books' | 'tickets' | 'new-ticket'
  const [books, setBooks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // New Ticket Form State
  const [formBookId, setFormBookId] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [dummyFile, setDummyFile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // Polling for live ticket updates when viewing a ticket
  useEffect(() => {
    let interval = null;
    if (selectedTicket) {
      interval = setInterval(async () => {
        try {
          const updated = await api.getTicket(selectedTicket);
          setTicketDetail(updated);
        } catch (e) {
          // Ignore background polling errors
        }
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedTicket]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [booksData, ticketsData] = await Promise.all([
        api.getBooks(),
        api.getTickets()
      ]);
      setBooks(booksData);
      setTickets(ticketsData);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = async (id) => {
    setSelectedTicket(id);
    try {
      const detail = await api.getTicket(id);
      setTicketDetail(detail);
    } catch (err) {
      console.error('Failed to fetch ticket detail:', err);
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const payload = {
        book_id: formBookId ? parseInt(formBookId) : null,
        subject: formSubject,
        description: formDescription,
      };
      const created = await api.createTicket(payload);
      showToast(`Ticket ${created.ticket_number} submitted! AI assistant has drafted a response.`, 'success');
      setFeedbackMsg({ type: 'success', text: `Ticket ${created.ticket_number} created successfully! Our team and AI assistant are on it.` });
      setFormBookId('');
      setFormSubject('');
      setFormDescription('');
      setDummyFile(null);
      // Reload tickets and switch to ticket view
      const updatedTickets = await api.getTickets();
      setTickets(updatedTickets);
      handleSelectTicket(created.id);
      setActiveTab('tickets');
    } catch (err) {
      showToast(err.message || 'Failed to submit ticket', 'error');
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to submit ticket' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      await api.postMessage(selectedTicket, {
        content: replyContent,
        is_internal_note: false
      });
      setReplyContent('');
      showToast('Reply sent successfully', 'success');
      const updated = await api.getTicket(selectedTicket);
      setTicketDetail(updated);
    } catch (err) {
      showToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // Financial calculations
  const totalEarned = books.reduce((acc, b) => acc + (b.total_royalty_earned || 0), 0);
  const totalPaid = books.reduce((acc, b) => acc + (b.royalty_paid || 0), 0);
  const totalPending = books.reduce((acc, b) => acc + (b.royalty_pending || 0), 0);
  const totalCopiesSold = books.reduce((acc, b) => acc + (b.total_copies_sold || 0), 0);

  return (
    <div className="main-content">
      {/* Author Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a5f' }}>
          Welcome back, {user?.name}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Author ID: <strong>{user?.author_id || 'N/A'}</strong> | {user?.city || 'India'} | Member since {user?.joined_date || '2023'}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'books' ? 'active' : ''}`}
          onClick={() => setActiveTab('books')}
        >
          <BookOpen size={18} /> My Books & Royalties ({books.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          <LifeBuoy size={18} /> Support Tickets ({tickets.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'new-ticket' ? 'active' : ''}`}
          onClick={() => setActiveTab('new-ticket')}
        >
          <PlusCircle size={18} /> Raise New Ticket
        </button>
      </div>

      {/* Tab 1: Books & Royalties */}
      {activeTab === 'books' && (
        <div>
          {/* Summary Metric Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-title">Total Copies Sold</span>
              <span className="stat-value">{totalCopiesSold.toLocaleString()}</span>
              <span className="stat-sub">Across all platforms</span>
            </div>
            <div className="stat-card">
              <span className="stat-title">Total Royalty Earned</span>
              <span className="stat-value">₹{totalEarned.toLocaleString()}</span>
              <span className="stat-sub">80% author share</span>
            </div>
            <div className="stat-card">
              <span className="stat-title">Royalty Paid Out</span>
              <span className="stat-value" style={{ color: '#059669' }}>₹{totalPaid.toLocaleString()}</span>
              <span className="stat-sub">Transferred to your bank</span>
            </div>
            <div className="stat-card" style={{ borderColor: totalPending > 0 ? '#fde047' : '#e2e8f0', background: totalPending > 0 ? '#fefce8' : '#ffffff' }}>
              <span className="stat-title">Royalty Pending</span>
              <span className="stat-value" style={{ color: totalPending > 0 ? '#b45309' : '#1e3a5f' }}>
                ₹{totalPending.toLocaleString()}
              </span>
              <span className="stat-sub">
                {totalPending >= 1000 ? '✅ Above ₹1,000 threshold (Scheduled for next cycle)' : '⚠️ Rolls over until ₹1,000 threshold'}
              </span>
            </div>
          </div>

          {/* Books Table */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title"><BookOpen size={20} /> Published Catalog & Production Status</h2>
            </div>

            {loading ? (
              <p style={{ color: '#64748b' }}>Loading your catalog...</p>
            ) : books.length === 0 ? (
              <p style={{ color: '#64748b' }}>No books found under your profile.</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title & ISBN</th>
                      <th>Genre</th>
                      <th>Status</th>
                      <th>MRP</th>
                      <th>Royalty / Copy</th>
                      <th>Copies Sold</th>
                      <th>Earned</th>
                      <th>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <strong style={{ fontSize: '0.95rem' }}>{b.title}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {b.isbn ? `ISBN: ${b.isbn}` : 'ISBN: Pending assignment'}
                          </div>
                          {b.available_on && b.available_on.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                              {b.available_on.map((p) => (
                                <PlatformBadge key={p} platform={p} />
                              ))}
                            </div>
                          )}
                        </td>
                        <td>{b.genre || 'N/A'}</td>
                        <td>
                          <span className={`pill ${b.status.includes('Live') ? 'pill-resolved' : 'pill-inprogress'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>{b.mrp ? `₹${b.mrp}` : '—'}</td>
                        <td>{b.author_royalty_per_copy ? `₹${b.author_royalty_per_copy}` : '—'}</td>
                        <td><strong>{b.total_copies_sold}</strong></td>
                        <td>₹{b.total_royalty_earned.toLocaleString()}</td>
                        <td style={{ fontWeight: 600, color: b.royalty_pending > 0 ? '#b45309' : '#059669' }}>
                          ₹{b.royalty_pending.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: My Tickets & Live Discussion */}
      {activeTab === 'tickets' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 1.8fr)', gap: '20px' }}>
          {/* Ticket List Pane */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-header">
              <h2 className="card-title"><LifeBuoy size={18} /> Support Requests</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('new-ticket')}>
                <PlusCircle size={14} /> New
              </button>
            </div>

            {tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                <p>No support tickets raised yet.</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }} onClick={() => setActiveTab('new-ticket')}>
                  Ask a Question
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: selectedTicket === t.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: selectedTicket === t.id ? '#f0f7ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e3a5f' }}>{t.ticket_number}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>{t.subject}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {t.book_title || 'General / Account'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Chat & Details Pane */}
          <div className="card">
            {ticketDetail ? (
              <div>
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{ticketDetail.ticket_number}</span>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e3a5f', marginTop: '2px' }}>
                        {ticketDetail.subject}
                      </h2>
                    </div>
                    <StatusBadge status={ticketDetail.status} />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <CategoryBadge category={ticketDetail.category} />
                    <PriorityBadge priority={ticketDetail.priority} />
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Related Book: <strong>{ticketDetail.book ? ticketDetail.book.title : 'General / Account Level'}</strong>
                    </span>
                  </div>
                </div>

                {/* Message Thread */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '6px' }}>
                  {ticketDetail.messages && ticketDetail.messages.map((m) => {
                    const isMe = m.sender_role === 'author';
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          flexDirection: isMe ? 'row-reverse' : 'row',
                          alignItems: 'flex-start',
                          gap: '10px',
                        }}
                      >
                        <div className={`avatar ${isMe ? 'avatar-author' : 'avatar-admin'}`} title={m.sender_name}>
                          {isMe ? getInitials(m.sender_name) : 'BL'}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '82%',
                          }}
                        >
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '3px' }}>
                            <strong>{m.sender_name}</strong> {isMe ? '(You)' : '(BookLeaf Support)'} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div
                            style={{
                              padding: '12px 16px',
                              borderRadius: '14px',
                              whiteSpace: 'pre-line',
                              fontSize: '0.92rem',
                              backgroundColor: isMe ? '#1e3a5f' : '#f1f5f9',
                              color: isMe ? '#ffffff' : '#0f172a',
                              borderBottomRightRadius: isMe ? '2px' : '14px',
                              borderBottomLeftRadius: isMe ? '14px' : '2px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                          >
                            {m.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input Form */}
                <form onSubmit={handleSendReply} style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type your reply here..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    disabled={sendingReply || ticketDetail.status === 'Closed'}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sendingReply || !replyContent.trim() || ticketDetail.status === 'Closed'}
                  >
                    <Send size={16} /> Send
                  </button>
                </form>
                {ticketDetail.status === 'Closed' && (
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
                    This ticket is closed. Submit a new query if you have further questions.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                <MessageSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p>Select a ticket from the left to view the conversation and updates in real-time.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Raise New Ticket Form */}
      {activeTab === 'new-ticket' && (
        <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="card-header">
            <h2 className="card-title"><PlusCircle size={20} /> Submit a Support Query</h2>
          </div>

          {feedbackMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                backgroundColor: feedbackMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: feedbackMsg.type === 'success' ? '#047857' : '#dc2626',
                border: feedbackMsg.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
              }}
            >
              {feedbackMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmitTicket}>
            <div className="form-group">
              <label className="form-label">Which Book is this about?</label>
              <select
                className="form-select"
                value={formBookId}
                onChange={(e) => setFormBookId(e.target.value)}
              >
                <option value="">General / Account Level Inquiry</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.status})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Select a book so our team and AI assistant have instant context on your royalties and status.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Inquiry regarding delayed Q3 royalty payout"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Description</label>
              <textarea
                required
                rows={5}
                className="form-textarea"
                placeholder="Please describe your question or issue in detail..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            {/* Optional File Attachment (UI only bonus requirement) */}
            <div className="form-group">
              <label className="form-label">Attachments (Optional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  <Paperclip size={14} /> Choose File
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => setDummyFile(e.target.files[0]?.name || null)}
                  />
                </label>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {dummyFile ? `Selected: ${dummyFile}` : 'Attach photos of print defects or screenshots'}
                </span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={submitting}>
              {submitting ? 'Submitting & Running AI Analysis...' : 'Submit Support Ticket'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
