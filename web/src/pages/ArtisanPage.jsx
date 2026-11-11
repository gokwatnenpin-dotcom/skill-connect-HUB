import { useEffect, useState } from 'react';
import { go, request } from '../api.js';
import { productNaira } from '../format.js';
import Reviews from '../components/Reviews.jsx';

export default function ArtisanPage({ id, user, askLogin }) {
  const [data, setData] = useState(null);

  useEffect(() => { request(`/artisans/${id}`).then(setData); }, [id]);
  if (!data) return <main className="container content"><p>Loading...</p></main>;

  const artisan = data.artisan;
  async function message(product = null) {
    if (!user) return askLogin();
    if (user.role !== 'customer') return alert('Only customer accounts can start a conversation.');
    try {
      const conversation = await request('/conversations', { method: 'POST', body: JSON.stringify({ artisanId: artisan.id }) });
      if (product) await request(`/conversations/${conversation.id}/messages`, { method: 'POST', body: JSON.stringify({ body: `I am asking about: ${product.name} (₦${product.price})`, imageUrl: product.imageUrl }) });
      go(`inbox/${conversation.id}`);
    } catch (error) { alert(error.message); }
  }

  return <main className="container content profile">
    <a className="back" href="#home">← Back</a>
    <div className="profile-head"><img src={artisan.imageUrl || '/placeholder.svg'} alt="" /><div><p className="eyebrow">{artisan.skill} · {artisan.area}</p><h1>{artisan.name}</h1><div className="trust-line">{artisan.reviewCount ? `★ ${artisan.averageRating} (${artisan.reviewCount} reviews)` : 'New'} {artisan.topRated && <span className="badge">Top rated</span>} {artisan.reliable && <span className="badge">Reliable</span>}</div><p>{artisan.bio}</p><button className="primary" onClick={() => message()}>Message {artisan.name}</button></div></div>
    <h2>Products</h2>
    <div className="product-grid">{data.products.map((product) => <article className="product card" key={product.id}><img src={product.imageUrl} alt="" /><div className="card-body"><h3>{product.name}</h3><p>{product.description}</p><strong>{productNaira(product.price)}</strong><button className="primary full" onClick={() => message(product)}>Ask about this</button></div></article>)}</div>
    <h2 className="reviews-title">Reviews</h2>
    <Reviews reviews={data.reviews} user={user} artisan={artisan} onRefresh={() => request(`/artisans/${id}`).then(setData)} />
  </main>;
}
