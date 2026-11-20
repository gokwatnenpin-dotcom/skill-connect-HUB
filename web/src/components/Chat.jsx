import { useEffect, useRef, useState } from 'react';
import { request, uploadFile } from '../api.js';
import PaymentCard from './PaymentCard.jsx';
import PaymentRequestForm from './PaymentRequestForm.jsx';
import ReviewForm from './ReviewForm.jsx';

export default function Chat({ id, conversation, user }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');
  const [orderForm, setOrderForm] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const lastMessageAtRef = useRef('');

  function load(reset = false) {
    const cursor = reset ? '' : lastMessageAtRef.current;
    request(`/conversations/${id}/messages${cursor ? `?after=${encodeURIComponent(cursor)}` : ''}`)
      .then((incoming) => { if (reset || !cursor) setMessages(incoming); else if (incoming.length) setMessages((current) => [...current, ...incoming.filter((message) => !current.some((item) => item.id === message.id))]); const latest = incoming[incoming.length - 1]; if (latest) lastMessageAtRef.current = latest.createdAt; })
      .catch((requestError) => setError(requestError.message));
  }

  useEffect(() => {
    load(true);
    const timer = setInterval(() => load(), document.hidden ? 15000 : 5000);
    const refreshVisibility = () => load();
    document.addEventListener('visibilitychange', refreshVisibility);
    if (user.role === 'artisan') request(`/artisans/${conversation.artisanId}`).then((data) => setProducts(data.products));
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refreshVisibility); };
  }, [id]);

  async function send(event) {
    event.preventDefault();
    if (!body.trim() && !imageFile) return;
    try {
      const imageUrl = imageFile ? (await uploadFile(imageFile, 'chat')).url : '';
      await request(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body, imageUrl }) });
      setBody('');
      setImageFile(null);
      setError('');
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function attach(event) {
    const file = event.target.files[0];
    if (!file) return;
    setImageFile(file);
  }

  function useQuickReply(text) {
    setBody(text);
    setQuickRepliesOpen(false);
  }

  async function reportMessage(messageId) {
    const reason = prompt('Why are you reporting this message?');
    if (!reason) return;
    try {
      await request(`/messages/${messageId}/report`, { method: 'POST', body: JSON.stringify({ reason }) });
      setError('Report sent to the admin inbox.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="chat">
      <div className="chat-head">
        <strong>{user.role === 'artisan' ? conversation.customerName : conversation.artisanName}</strong>
        {user.role === 'artisan' && <small>{conversation.newCustomer ? 'New customer' : `${conversation.customerCompletedOrders} completed orders · ${conversation.customerStrikes} strikes`}</small>}
        <small>Direct conversation · Refreshes automatically</small>
      </div>
      <div className="chat-actions" aria-label="Conversation actions">
        {user.role === 'artisan' && <button type="button" className="chat-action" onClick={() => setOrderForm((open) => !open)}>＋ Payment request</button>}
        {user.role === 'artisan' && <button type="button" className="chat-action" onClick={() => setQuickRepliesOpen((open) => !open)}>↗ Quick replies</button>}
        <label className="chat-action">＋ Photo<input type="file" accept="image/*" onChange={attach} /></label>
      </div>
      {quickRepliesOpen && <div className="quick-replies"><span>Quick replies</span>{['I am available', 'Please send a photo', 'What is your location?'].map((reply) => <button type="button" key={reply} onClick={() => useQuickReply(reply)}>{reply}</button>)}</div>}
      {imageFile && <div className="attached-file">Photo ready: {imageFile.name}<button type="button" onClick={() => setImageFile(null)}>Remove</button></div>}
      <div className="messages">
        {!messages.length && <div className="chat-empty"><strong>Start the conversation</strong><span>Agree on the details here, then use a payment request to pay safely in SkillConnect-HUB.</span></div>}
        {messages.map((message) => message.type === 'payment_request' ? (
          <PaymentCard key={message.id} message={message} user={user} onReview={() => setReviewOrder(message.orderId)} />
        ) : (
          <div className={`message ${message.senderId === user.id ? 'mine' : ''}`} key={message.id}>
            {message.body}
            {message.imageUrl && <img className="chat-image" src={message.imageUrl} alt="Attached" loading="lazy" onClick={() => setLightboxImage(message.imageUrl)} />}
            <button className="link report" onClick={() => reportMessage(message.id)}>Report to admin</button>
          </div>
        ))}
      </div>
      {error && <p className="error chat-error">{error}</p>}
      {user.role === 'artisan' && (orderForm ? (
        <PaymentRequestForm conversationId={id} products={products} onDone={() => { setOrderForm(false); load(); }} onCancel={() => setOrderForm(false)} />
      ) : null)}
      <form className="chat-form" onSubmit={send}>
        <input value={body} maxLength="4000" onChange={(event) => setBody(event.target.value)} placeholder="Write a message…" aria-label="Message" />
        <button className="primary" disabled={!body.trim() && !imageFile}>Send</button>
      </form>
      {reviewOrder && <ReviewForm orderId={reviewOrder} onDone={() => { setReviewOrder(null); load(); }} onCancel={() => setReviewOrder(null)} />}
      {lightboxImage && <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="Expanded image" onClick={() => setLightboxImage(null)}><button type="button" className="image-lightbox-close" aria-label="Close image" onClick={() => setLightboxImage(null)}>×</button><img src={lightboxImage} alt="Expanded attachment" onClick={(event) => event.stopPropagation()} /></div>}
    </section>
  );
}
