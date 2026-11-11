import { useState } from 'react';
import { request } from '../api.js';
import { naira } from '../format.js';

export default function PaymentCard({ message, user, onReview }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function pay() {
    setBusy(true);
    try {
      const data = await request(`/orders/${message.orderId}/pay`, { method: 'POST' });
      window.location.href = data.authorizationUrl;
    } catch (error) {
      setNotice(error.message);
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    try {
      await request(`/orders/${message.orderId}/verify`);
      window.location.reload();
    } catch (error) {
      setNotice(error.message);
      setBusy(false);
    }
  }

  async function action(path) {
    setBusy(true);
    try {
      await request(`/orders/${message.orderId}/${path}`, { method: 'POST' });
      window.location.reload();
    } catch (error) {
      setNotice(error.message);
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      await request(`/orders/${message.orderId}`, { method: 'DELETE' });
      window.location.reload();
    } catch (error) {
      setNotice(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="payment-card">
      <p className="eyebrow">Payment request</p>
      <strong>{message.orderDescription}</strong>
      <h3>{naira(message.amount)}</h3>
      <p className="muted">Platform protection fee included. Pay only inside SkillConnectHUB to be protected.</p>
      <span className={`status status-${message.orderStatus}`}>{message.orderStatus}</span>

      {message.orderStatus === 'paid' && <p className="success">Payment secured.</p>}
      {message.orderStatus === 'requested' && user.role === 'customer' && (
        <>
          <button className="primary full" disabled={busy} onClick={pay}>{busy ? 'Opening Paystack...' : message.paymentUrl ? 'Continue payment' : 'Accept and pay'}</button>
          {message.paymentUrl && <button className="link full" disabled={busy} onClick={verify}>Check payment status</button>}
        </>
      )}
      {message.orderStatus === 'requested' && user.role === 'artisan' && <button className="link danger" disabled={busy} onClick={cancel}>Cancel request</button>}
      {message.orderStatus === 'paid' && user.role === 'artisan' && <button className="primary full" disabled={busy} onClick={() => action('deliver')}>Mark as done or delivered</button>}
      {message.orderStatus === 'delivered' && user.role === 'customer' && (
        <>
          <button className="primary full" disabled={busy} onClick={() => action('confirm')}>Confirm and release payment</button>
          <button className="link danger full" disabled={busy} onClick={() => action('dispute')}>Report a problem</button>
        </>
      )}
      {message.orderStatus === 'confirmed' && user.role === 'customer' && (
        <>
          <p className="success">Payment confirmed. Payout: {message.payoutStatus}.</p>
          <button className="primary full" onClick={onReview}>How was it? Leave a review</button>
        </>
      )}
      {message.orderStatus === 'confirmed' && user.role === 'artisan' && <p className="success">Payment confirmed. Payout: {message.payoutStatus}.</p>}
      {message.orderStatus === 'disputed' && <p className="error">This order is disputed and payment remains held.</p>}
      {notice && <p className="error">{notice}</p>}
    </div>
  );
}
