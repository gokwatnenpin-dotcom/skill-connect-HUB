import { useEffect, useState } from 'react';
import { go, request } from '../api.js';
import Chat from '../components/Chat.jsx';

export default function Inbox({ user, askLogin }) {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(window.location.hash.split('/')[1] || null);

  useEffect(() => {
    if (!user) return undefined;
    const load = () => request('/conversations').then(setConversations);
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [user]);

  if (!user) return <main className="container content"><h1>Inbox</h1><p>You must log in to view messages.</p><button className="primary" onClick={askLogin}>Log in</button></main>;
  const selected = conversations.find((conversation) => String(conversation.id) === String(active));

  return <main className="container content inbox"><div><p className="eyebrow">Your messages</p><h1>Inbox</h1>{conversations.map((conversation) => <button className={`conversation ${String(conversation.id) === String(active) ? 'active' : ''}`} key={conversation.id} onClick={() => { setActive(conversation.id); go(`inbox/${conversation.id}`); }}><strong>{user.role === 'artisan' ? conversation.customerName : conversation.artisanName} {Number(conversation.unreadCount) > 0 && <b className="unread">{conversation.unreadCount}</b>}</strong><span>{conversation.lastMessage || 'No messages yet'}</span></button>)}{!conversations.length && <p className="muted">No conversations yet.</p>}</div>{selected && <Chat id={active} conversation={selected} user={user} />}</main>;
}
