import { useEffect, useState } from 'react';
import { request } from '../api.js';
import { naira } from '../format.js';
import ReviewForm from '../components/ReviewForm.jsx';

export default function Orders({ user, askLogin }) {
  const [data, setData] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const load = () => request('/orders').then(setData);
  useEffect(() => { if (user) load(); }, [user]);

  if (!user) return <main className="container content"><h1>My orders</h1><p>You must log in to view orders.</p><button className="primary" onClick={askLogin}>Log in</button></main>;
  if (!data) return <main className="container content"><p>Loading...</p></main>;
  const selected = data.orders.find((order) => order.id === reviewOrder);

  return <main className="container content"><p className="eyebrow">Payment history</p><h1>My orders</h1>{user.role === 'artisan' && <div className="totals"><div><span>Total earned</span><strong>{naira(data.totals.earned)}</strong></div><div><span>Pending</span><strong>{naira(data.totals.pending)}</strong></div></div>}<div className="order-list">{data.orders.map((order) => <article className="order-row" key={order.id}><div><strong>{order.description}</strong><p className="muted">{user.role === 'artisan' ? `Customer: ${order.customerName}` : `Artisan: ${order.artisanName}`}</p></div><strong>{naira(user.role === 'artisan' ? order.artisanAmount : order.amount)}</strong><span className={`status status-${order.status}`}>{order.status}</span>{user.role === 'customer' && order.status === 'confirmed' && (order.reviewId ? <button className="link" onClick={() => setReviewOrder(order.id)}>Edit review</button> : <button className="primary" onClick={() => setReviewOrder(order.id)}>How was it? Leave a review</button>)}</article>)}{!data.orders.length && <p className="muted">No orders yet.</p>}</div>{selected && <ReviewForm orderId={selected.id} existing={selected.reviewId ? { id: selected.reviewId, rating: selected.reviewRating, comment: selected.reviewComment } : null} onDone={() => { setReviewOrder(null); load(); }} onCancel={() => setReviewOrder(null)} />}</main>;
}
