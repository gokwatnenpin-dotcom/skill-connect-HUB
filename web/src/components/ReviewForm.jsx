import { useState } from 'react';
import { request } from '../api.js';

export default function ReviewForm({ orderId, existing, onDone, onCancel }) {
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await request(existing ? `/reviews/${existing.id}` : `/orders/${orderId}/review`, {
        method: existing ? 'PUT' : 'POST',
        body: JSON.stringify({
          rating: Number(form.get('rating')),
          comment: form.get('comment'),
          photoUrl: form.get('photoUrl'),
        }),
      });
      onDone();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="review-form">
      <h3>{existing ? 'Edit your review' : 'Leave a review'}</h3>
      <form className="form" onSubmit={submit}>
        <label>
          Rating
          <select name="rating" defaultValue={existing?.rating || 5} required>
            <option value="5">★★★★★</option>
            <option value="4">★★★★</option>
            <option value="3">★★★</option>
            <option value="2">★★</option>
            <option value="1">★</option>
          </select>
        </label>
        <label>Comment<textarea name="comment" maxLength="500" defaultValue={existing?.comment || ''} placeholder="Optional, up to 500 characters" /></label>
        <label>Photo URL<input name="photoUrl" defaultValue={existing?.photoUrl || ''} placeholder="https://..." /></label>
        <div>
          <button className="primary">Save review</button>
          <button type="button" className="link" onClick={onCancel}>Cancel</button>
        </div>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
