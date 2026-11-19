import { useState } from 'react';
import { request, uploadFile } from '../api.js';
import { naira } from '../format.js';

export default function PaymentCard({ message, user, onReview }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [disputeOpen, setDisputeOpen] = useState(false);

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

  async function deliver() {
    if (!proofFile) { setNotice('Upload a finished-work photo or short video first.'); return; }
    setBusy(true);
    try { const proof = await uploadFile(proofFile, 'proof'); await request(`/orders/${message.orderId}/proofs`, { method: 'POST', body: JSON.stringify({ proofType: 'artisan_completion', publicId: proof.assetId, url: proof.url, fileType: proof.fileType }) }); await request(`/orders/${message.orderId}/deliver`, { method: 'POST' }); window.location.reload(); } catch (error) { setNotice(error.message); setBusy(false); }
  }

  async function dispute(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget); const file = form.get('proof');
    if (!file?.name) { setNotice('Upload a photo or short video showing the problem.'); return; }
    setBusy(true);
    try { const proof = await uploadFile(file, 'proof'); await request(`/orders/${message.orderId}/proofs`, { method: 'POST', body: JSON.stringify({ proofType: 'customer_dispute', publicId: proof.assetId, url: proof.url, fileType: proof.fileType }) }); await request(`/orders/${message.orderId}/dispute`, { method: 'POST', body: JSON.stringify({ reason: form.get('reason'), explanation: form.get('explanation') }) }); window.location.reload(); } catch (error) { setNotice(error.message); setBusy(false); }
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
      {(Number(message.depositPercent) > 0 || Number(message.freeChanges) > 0) && <p className="muted">Materials deposit: {message.depositPercent || 0}% · Free changes: {message.freeChanges || 0}. {message.cancellationPolicy}</p>}
      <p className="muted">Platform protection fee included. Pay only inside SkillConnectHUB to be protected. <a href="#rules">Read the rules</a></p>
      <span className={`status status-${message.orderStatus}`}>{message.orderStatus}</span>

      {message.orderStatus === 'paid' && <p className="success">Payment secured.</p>}
      {message.orderStatus === 'requested' && user.role === 'customer' && (
        <>
          <button className="primary full" disabled={busy} onClick={pay}>{busy ? 'Opening Paystack...' : message.paymentUrl ? 'Continue payment' : 'Accept and pay'}</button>
          {message.paymentUrl && <button className="link full" disabled={busy} onClick={verify}>Check payment status</button>}
        </>
      )}
      {message.orderStatus === 'requested' && user.role === 'artisan' && <button className="link danger" disabled={busy} onClick={cancel}>Cancel request</button>}
      {message.orderStatus === 'paid' && user.role === 'artisan' && <><label className="proof-upload">Finished-work photo or short video<input type="file" accept="image/*,video/mp4,video/quicktime,video/webm" onChange={(event) => setProofFile(event.target.files[0])} required /></label><button className="primary full" disabled={busy} onClick={deliver}>{busy ? 'Saving proof…' : 'Mark as done or delivered'}</button></>}
      {message.orderStatus === 'delivered' && user.role === 'customer' && (
        <>
          <button className="primary full" disabled={busy} onClick={() => action('confirm')}>Confirm and release payment</button>
          <button className="link danger full" disabled={busy} onClick={() => setDisputeOpen((open) => !open)}>Report a problem</button>
          {disputeOpen && <form className="dispute-form" onSubmit={dispute}><select name="reason" required><option value="">Choose a reason</option><option value="not_done">Not done</option><option value="not_as_agreed">Not as agreed</option><option value="damaged">Damaged</option><option value="wrong_item">Wrong item</option></select><textarea name="explanation" minLength="30" maxLength="4000" required placeholder="Explain exactly what is wrong (at least 30 characters)" /><input name="proof" type="file" accept="image/*,video/mp4,video/quicktime,video/webm" required /><button className="primary full" disabled={busy}>Open evidence-based dispute</button></form>}
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
