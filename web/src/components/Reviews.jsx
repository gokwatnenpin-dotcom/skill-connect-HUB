import { useState } from 'react';
import { request } from '../api.js';

export default function Reviews({ reviews, user, artisan, onRefresh }) {
  const [replyId, setReplyId] = useState(null);
  const [reply, setReply] = useState('');

  async function report(id) {
    const entered = prompt('Reason: fake, rude, or wrong person');
    if (!entered) return;
    const reason = entered.trim().toLowerCase().replace(/\s+/g, '_');

    try {
      await request(`/reviews/${id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      alert('Review reported.');
    } catch (error) {
      alert(error.message);
    }
  }

  async function sendReply(id) {
    try {
      await request(`/reviews/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply }),
      });
      setReplyId(null);
      setReply('');
      onRefresh();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="reviews">
      {reviews.map((review) => (
        <article className="review" key={review.id}>
          <div className="review-top">
            <strong>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</strong>
            <span className="muted">
              {review.customerFirstName} · {new Date(review.createdAt).toLocaleDateString()}
            </span>
          </div>
          {review.comment && <p>{review.comment}</p>}
          {review.photoUrl && <img className="review-photo" src={review.photoUrl} alt="Finished work" />}
          {review.artisanReply && (
            <p className="reply"><strong>Artisan reply:</strong> {review.artisanReply}</p>
          )}

          {user?.role === 'artisan' && user.id === artisan.userId && !review.artisanReply && (
            replyId === review.id ? (
              <div className="reply-form">
                <input value={reply} onChange={(event) => setReply(event.target.value)} maxLength="500" placeholder="Write a public reply" />
                <button className="primary" onClick={() => sendReply(review.id)}>Reply</button>
              </div>
            ) : <button className="link" onClick={() => setReplyId(review.id)}>Reply</button>
          )}
          <button className="link report" onClick={() => report(review.id)}>Report</button>
        </article>
      ))}
      {!reviews.length && <p className="muted">No reviews yet.</p>}
    </div>
  );
}
