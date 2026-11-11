import { useEffect, useState } from 'react';
import { go, request } from '../api.js';
import { productNaira } from '../format.js';

export default function Home() {
  const [filters, setFilters] = useState({ service: '', area: '' });
  const [sort, setSort] = useState('');
  const [artisans, setArtisans] = useState([]);
  const [products, setProducts] = useState([]);

  async function search(event) {
    event?.preventDefault();
    const query = new URLSearchParams({ ...filters, ...(sort ? { sort } : {}) });
    const [artisanResults, productResults] = await Promise.all([
      request(`/artisans?${query}`),
      request(`/products?search=${encodeURIComponent(filters.service)}&area=${encodeURIComponent(filters.area)}`),
    ]);
    setArtisans(artisanResults);
    setProducts(productResults);
  }

  useEffect(() => { search(); }, [sort]);

  return (
    <main>
      <section className="hero"><div className="container"><p className="eyebrow">Local skills. Direct conversations.</p><h1>Find an artisan. Send a message.</h1><p className="lead">Talk directly, share details and photos, and pay safely inside SkillConnectHUB.</p></div></section>
      <section className="container search-section">
        <form className="search-box" onSubmit={search}>
          <label>Skill or product<input value={filters.service} onChange={(event) => setFilters({ ...filters, service: event.target.value })} placeholder="Tailor, phone repair..." /></label>
          <label>Area<input value={filters.area} onChange={(event) => setFilters({ ...filters, area: event.target.value })} placeholder="Yaba, Lagos" /></label>
          <label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="">Newest</option><option value="top">Top rated</option></select></label>
          <button className="primary">Search</button>
        </form>
      </section>
      <section className="container content">
        <div className="section-heading"><div><p className="eyebrow">Artisans</p><h2>Find people near you</h2></div><span>{artisans.length} found</span></div>
        <div className="cards">{artisans.map((artisan) => <article className="card" key={artisan.id}><img src={artisan.imageUrl || '/placeholder.svg'} alt="" /><div className="card-body"><h3>{artisan.name}</h3><p className="muted">{artisan.skill} · {artisan.area}</p><p className="trust-line">{artisan.reviewCount ? `★ ${artisan.averageRating} (${artisan.reviewCount})` : 'New'} {artisan.topRated && <span className="badge">Top rated</span>} {artisan.reliable && <span className="badge">Reliable</span>}</p><p>{artisan.bio || 'Open to messages about services and products.'}</p><button className="primary full" onClick={() => go(`artisan/${artisan.id}`)}>View profile</button></div></article>)}</div>
        <div className="section-heading products-heading"><div><p className="eyebrow">Shop</p><h2>Products from artisans</h2></div><span>{products.length} found</span></div>
        <div className="product-grid">{products.map((product) => <article className="product card" key={product.id}><img src={product.imageUrl} alt="" /><div className="card-body"><h3>{product.name}</h3><p className="muted">{product.artisanName} · {product.area}</p><strong>{productNaira(product.price)}</strong><button className="primary full" onClick={() => go(`product/${product.id}`)}>View product</button></div></article>)}</div>
        {!artisans.length && !products.length && <div className="empty">No artisans or products yet. Create an artisan account to add yours.</div>}
      </section>
    </main>
  );
}
