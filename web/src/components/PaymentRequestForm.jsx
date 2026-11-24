import { request } from '../api.js';

export default function PaymentRequestForm({ conversationId, products, onDone, onCancel }) {
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await request(`/conversations/${conversationId}/orders`, {
        method: 'POST',
        body: JSON.stringify({
          amount: form.get('amount'),
          description: form.get('description'),
          productId: form.get('productId') || null,
          depositPercent: form.get('depositPercent'),
          freeChanges: form.get('freeChanges'),
        }),
      });
      onDone();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <form className="payment-form" onSubmit={submit}>
      <strong>Payment request</strong>
      <input name="amount" type="number" min="0.01" max="100000000" step="0.01" placeholder="Amount in ₦" required />
      <input name="description" minLength="2" maxLength="2000" placeholder="What is this payment for?" required />
      <label>Materials deposit percent<input name="depositPercent" type="number" min="0" max="100" step="1" defaultValue="0" /></label>
      <label>Free changes included<input name="freeChanges" type="number" min="0" max="20" step="1" defaultValue="0" /></label>
      <p className="muted">Agree on cancellation terms in chat before payment. Extra changes need a new quote.</p>
      <select name="productId">
        <option value="">No product attached</option>
        {products.map((product) => <option value={product.id} key={product.id}>{product.name} — ₦{Number(product.price).toLocaleString()}</option>)}
      </select>
      <div>
        <button className="primary">Send request</button>
        <button type="button" className="link" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
