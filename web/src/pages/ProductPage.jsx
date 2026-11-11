import { useEffect, useState } from 'react';
import { go, request } from '../api.js';
import { productNaira } from '../format.js';
import Reviews from '../components/Reviews.jsx';

export default function ProductPage({ id, user, askLogin }) {
  const [product, setProduct] = useState(null);
  useEffect(() => { request(`/products/${id}`).then(setProduct); }, [id]);
  if (!product) return <main className="container content"><p>Product not found.</p></main>;

  async function askAboutProduct() {
    if (!user) return askLogin();
    if (user.role !== 'customer') return alert('Only customer accounts can start a conversation.');
    try {
      const conversation = await request('/conversations', { method: 'POST', body: JSON.stringify({ artisanId: product.artisanId }) });
      await request(`/conversations/${conversation.id}/messages`, { method: 'POST', body: JSON.stringify({ body: `I am asking about: ${product.name} (₦${product.price})`, imageUrl: product.imageUrl }) });
      go(`inbox/${conversation.id}`);
    } catch (error) { alert(error.message); }
  }

  return <main className="container content product-page"><img src={product.imageUrl} alt="" /><div><p className="eyebrow">{product.artisanName} · {product.area}</p><h1>{product.name}</h1><p>{product.description}</p><h2>{productNaira(product.price)}</h2><button className="primary" onClick={askAboutProduct}>Ask about this</button></div><div className="product-reviews"><h2>Reviews</h2><Reviews reviews={product.reviews} user={user} artisan={{ userId: product.artisanUserId }} onRefresh={() => request(`/products/${id}`).then(setProduct)} /></div></main>;
}
