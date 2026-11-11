import { useEffect, useState } from 'react';
import { request } from '../api.js';
import { naira } from '../format.js';

const tabs = ['overview', 'artisans', 'disputes', 'reviews', 'messages', 'users', 'payouts'];

export default function AdminPage({ user }) {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { if (user?.role === 'admin') loadTab(tab); }, [tab, user]);

  async function loadTab(nextTab) {
    try {
      const path = {
        overview: '/admin/dashboard',
        artisans: '/admin/artisans',
        disputes: '/admin/disputes',
        reviews: '/admin/reviews/reported',
        messages: '/admin/messages/reported',
        users: '/admin/users',
        payouts: '/admin/payouts/failed',
      }[nextTab];
      setData(await request(path));
      setError('');
    } catch (requestError) { setError(requestError.message); }
  }

  if (user?.role !== 'admin') return <main className="container content"><h1>Admin</h1><p>Admin access required.</p></main>;

  const reload = (override) => override ? setData(override) : loadTab(tab);

  return <main className="container content admin-page">
    <p className="eyebrow">Administration</p>
    <h1>SkillConnectHUB admin</h1>
    <div className="admin-tabs">{tabs.map((item) => <button className={tab === item ? 'primary' : 'link'} key={item} onClick={() => { setTab(item); setData(null); }}>{item}</button>)}</div>
    {error && <p className="error">{error}</p>}
    {!data && !error && <p>Loading...</p>}
    {tab === 'overview' && data && <Overview data={data} />}
    {tab === 'artisans' && data && <ArtisanVerification artisans={data} reload={reload} />}
    {tab === 'disputes' && data && <Disputes disputes={data} reload={reload} />}
    {tab === 'reviews' && data && <ReportedReviews reviews={data} reload={reload} />}
    {tab === 'messages' && data && <ReportedMessages messages={data} />}
    {tab === 'users' && data && <Users users={data} reload={reload} />}
    {tab === 'payouts' && data && <FailedPayouts payouts={data} reload={reload} />}
  </main>;
}

function Overview({ data }) {
  return <><div className="admin-counts">{Object.entries(data.counts).map(([key, value]) => <div className="admin-stat" key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{key.includes('paid') || key.includes('fees') ? naira(value) : value}</strong></div>)}</div><h2>Newest orders</h2><AdminTable headers={['Order', 'Customer', 'Artisan', 'Amount', 'Status']} rows={data.newestOrders.map((order) => [order.id, order.customerName, order.artisanName, naira(order.amount), order.status])} /></>;
}

function ArtisanVerification({ artisans, reload }) {
  async function decide(id, decision) { const reason = decision === 'rejected' ? prompt('Reason for rejection') : ''; await request(`/admin/artisans/${id}/decision`, { method: 'POST', body: JSON.stringify({ decision, reason }) }); reload(); }
  async function viewPrivate(id) { const files = await request(`/admin/artisans/${id}/private-images`); if (files.idPhotoUrl) window.open(files.idPhotoUrl, '_blank', 'noopener'); if (files.selfieUrl) window.open(files.selfieUrl, '_blank', 'noopener'); }
  return <><h2>Pending verification</h2><AdminTable headers={['Artisan', 'Skill', 'Area', 'ID', 'Files', 'Action']} rows={artisans.map((artisan) => [<><strong>{artisan.name}</strong><br /><small>{artisan.email}</small></>, artisan.skill, artisan.area, `${artisan.idType || '—'} · ${artisan.idLast4 || '—'}`, <button className="link" disabled={!artisan.hasIdPhoto && !artisan.hasSelfie} onClick={() => viewPrivate(artisan.id)}>View private documents</button>, <><button className="primary" onClick={() => decide(artisan.id, 'approved')}>Approve</button><button className="link danger" onClick={() => decide(artisan.id, 'rejected')}>Reject</button></>])} /></>;
}

function Disputes({ disputes, reload }) {
  const [messages, setMessages] = useState({});
  async function resolve(id, action) { const amount = action === 'refund_partial' ? prompt('Refund amount in ₦') : null; const note = prompt('Decision note'); await request(`/admin/orders/${id}/resolve`, { method: 'POST', body: JSON.stringify({ action, amount, note }) }); reload(); }
  async function showMessages(id) { const data = await request(`/admin/orders/${id}/messages`); setMessages({ ...messages, [id]: data.messages }); }
  return <><h2>Open disputes</h2>{disputes.map((dispute) => <article className="admin-card" key={dispute.id}><div className="admin-card-head"><strong>Order #{dispute.id} · {dispute.description}</strong><span>{naira(dispute.amount)}</span></div><p>{dispute.customerName} ↔ {dispute.artisanName}</p><button className="link" onClick={() => showMessages(dispute.id)}>Read order chat</button><div className="admin-actions"><button className="primary" onClick={() => resolve(dispute.id, 'refund_full')}>Full refund</button><button className="primary" onClick={() => resolve(dispute.id, 'refund_partial')}>Partial refund</button><button className="primary" onClick={() => resolve(dispute.id, 'release')}>Release money</button><button className="link" onClick={() => resolve(dispute.id, 'fix_on_hold')}>Keep on hold</button></div>{messages[dispute.id]?.map((message) => <p className="admin-message" key={message.id}><strong>{message.senderName}:</strong> {message.body}</p>)}</article>)}{!disputes.length && <p className="muted">No open disputes.</p>}</>;
}

function ReportedReviews({ reviews, reload }) { async function action(id, nextAction) { const reason = nextAction === 'hide' ? prompt('Reason') : ''; await request(`/admin/reviews/${id}/action`, { method: 'POST', body: JSON.stringify({ action: nextAction, reason }) }); reload(); } return <><h2>Reported reviews</h2>{reviews.map((review) => <article className="admin-card" key={review.id}><strong>{review.customerName} → {review.artisanName}</strong><p>{'★'.repeat(review.rating)} {review.comment}</p><p className="muted">Reasons: {review.reasons.join(', ')}</p><button className="link" onClick={() => action(review.id, 'keep')}>Keep</button><button className="link danger" onClick={() => action(review.id, 'hide')}>Hide</button><button className="link" onClick={() => action(review.id, 'warn')}>Warn user</button></article>)}{!reviews.length && <p className="muted">No reported reviews.</p>}</>; }

function ReportedMessages({ messages }) { return <><h2>Reported messages</h2><AdminTable headers={['Message', 'Reason', 'Conversation', 'Reported by', 'Date']} rows={messages.map((message) => [message.body || 'Photo message', message.reason, message.conversationId, message.reportedBy || 'Anonymous', new Date(message.createdAt).toLocaleString()])} /></>; }

function Users({ users, reload }) { const [query, setQuery] = useState(''); async function search(event) { event.preventDefault(); const result = await request(`/admin/users?q=${encodeURIComponent(query)}`); reload(result); } async function suspend(user) { const reason = user.suspended ? '' : prompt('Suspension reason'); await request(`/admin/users/${user.id}/suspension`, { method: 'POST', body: JSON.stringify({ suspended: !user.suspended, reason }) }); reload(); } return <><form className="admin-search" onSubmit={search}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone" /><button className="primary">Search</button></form><AdminTable headers={['Name', 'Email', 'Role', 'Warnings', 'Action']} rows={users.map((user) => [user.name, user.email, user.role, user.warnings, <button className="link" onClick={() => suspend(user)}>{user.suspended ? 'Unsuspend' : 'Suspend'}</button>])} /></>; }

function FailedPayouts({ payouts, reload }) { async function retry(id) { await request(`/admin/orders/${id}/retry-payout`, { method: 'POST' }); reload(); } return <><h2>Failed payouts</h2><AdminTable headers={['Order', 'Artisan', 'Amount', 'Error', 'Action']} rows={payouts.map((payout) => [payout.id, payout.artisanName, naira(payout.artisanAmount), payout.payoutError, <button className="primary" onClick={() => retry(payout.id)}>Retry transfer</button>])} /></>; }

function AdminTable({ headers, rows }) { return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>; }
