import { useEffect, useState } from 'react';
import { request } from '../api.js';
import PaymentCard from './PaymentCard.jsx';
import PaymentRequestForm from './PaymentRequestForm.jsx';
import ReviewForm from './ReviewForm.jsx';

export default function Chat({ id, conversation, user }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [orderForm, setOrderForm] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [products, setProducts] = useState([]);

  function load() {
    request(`/conversations/${id}/messages`)
      .then(setMessages)
      .catch((requestError) => setError(requestError.message));
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    if (user.role === 'artisan') request(`/artisans/${conversation.artisanId}`).then((data) => setProducts(data.products));
    return () => clearInterval(timer);
  }, [id]);

  async function send(event) {
    event.preventDefault();
    if (!body.trim() && !imageUrl) return;
    try {
      await request(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body, imageUrl }) });
      setBody('');
      setImageUrl('');
      setError('');
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function attach(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result);
    reader.readAsDataURL(file);
  }

  async function reportMessage(messageId) {
    const reason = prompt('Why are you reporting this message?');
    if (!reason) return;
    try {
      await request(`/messages/${messageId}/report`, { method: 'POST', body: JSON.stringify({ reason }) });
      setError('Message reported.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="chat">
      <div className="chat-head">
        <strong>{user.role === 'artisan' ? conversation.customerName : conversation.artisanName}</strong>
        <small>Refreshes automatically · Pay only inside SkillConnectHUB to be protected.</small>
      </div>
      <div className="messages">
        {messages.map((message) => message.type === 'payment_request' ? (
          <PaymentCard key={message.id} message={message} user={user} onReview={() => setReviewOrder(message.orderId)} />
        ) : (
          <div className={`message ${message.senderId === user.id ? 'mine' : ''}`} key={message.id}>
            {message.body}
            {message.imageUrl && <img src={message.imageUrl} alt="Attached" />}
            <button className="link report" onClick={() => reportMessage(message.id)}>Report</button>
          </div>
        ))}
      </div>
      {error && <p className="error chat-error">{error}</p>}
      {user.role === 'artisan' && (orderForm ? (
        <PaymentRequestForm conversationId={id} products={products} onDone={() => { setOrderForm(false); load(); }} onCancel={() => setOrderForm(false)} />
      ) : <button className="link payment-link" onClick={() => setOrderForm(true)}>+ Payment request</button>)}
      <form className="chat-form" onSubmit={send}>
        <input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message..." />
        <label className="attach">Photo<input type="file" accept="image/*" onChange={attach} /></label>
        <button className="primary">Send</button>
      </form>
      {reviewOrder && <ReviewForm orderId={reviewOrder} onDone={() => { setReviewOrder(null); load(); }} onCancel={() => setReviewOrder(null)} />}
    </section>
  );
}
