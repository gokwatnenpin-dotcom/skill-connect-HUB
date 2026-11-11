import { useEffect, useState } from 'react';
import { request } from '../api.js';

export default function Dashboard({ user }) {
  const [profile, setProfile] = useState({});
  const [products, setProducts] = useState([]);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);

  function load() {
    request('/me').then((data) => {
      setProfile({ ...data.user, ...(data.artisan || {}) });
      if (data.artisan) request(`/artisans/${data.artisan.id}`).then((artisan) => setProducts(artisan.products));
    });
  }

  useEffect(() => { if (user) load(); }, [user]);

  async function saveProfile(event) {
    event.preventDefault();
    try { await request('/artisan/profile', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); setNotice('Profile saved.'); load(); } catch (error) { setNotice(error.message); }
  }

  async function savePayout(event) {
    event.preventDefault();
    try { await request('/artisan/payout-details', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); setNotice('Payout details saved.'); } catch (error) { setNotice(error.message); }
  }

  async function saveVerification(event) {
    event.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      values.idPhotoUrl = await fileData(values.idPhotoUrl);
      values.selfieUrl = await fileData(values.selfieUrl);
      await request('/artisan/verification', { method: 'POST', body: JSON.stringify(values) });
      setNotice('Verification submitted.');
      load();
    } catch (error) { setNotice(error.message); }
  }

  function fileData(file) {
    if (!file || !file.name) return '';
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function saveProduct(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try { await request(editing ? `/products/${editing.id}` : '/products', { method: editing ? 'PUT' : 'POST', body: JSON.stringify({ ...values, price: Number(values.price), inStock: values.inStock === 'true' }) }); event.currentTarget.reset(); setEditing(null); setNotice(editing ? 'Product updated.' : 'Product added.'); load(); } catch (error) { setNotice(error.message); }
  }

  async function removeProduct(id) {
    if (!confirm('Delete this product?')) return;
    await request(`/products/${id}`, { method: 'DELETE' });
    load();
  }

  if (!user || user.role !== 'artisan') return <main className="container content"><h1>Artisan dashboard</h1><p>Log in with an artisan account to continue.</p></main>;

  return <main className="container content dashboard">
    <p className="eyebrow">Artisan dashboard</p>
    <h1>Your profile and products</h1>
    <div className="dashboard-grid">
      <form className="form panel" key={profile.id || 'profile'} onSubmit={saveProfile}>
        <h2>Profile</h2>
        <label>Name<input name="name" defaultValue={profile.name || ''} required /></label>
        <label>Skill<input name="skill" defaultValue={profile.skill || ''} required /></label>
        <label>Area<input name="area" defaultValue={profile.area || ''} required /></label>
        <label>Short bio<textarea name="bio" defaultValue={profile.bio || ''} /></label>
        <label>Profile photo URL<input name="imageUrl" defaultValue={profile.image_url || ''} placeholder="https://..." /></label>
        <label>Starting price<input name="startingPrice" type="number" defaultValue={profile.starting_price || ''} /></label>
        <button className="primary">Save profile</button>
      </form>

      <form className="form panel" onSubmit={saveVerification}>
        <h2>Identity verification</h2>
        <p className="muted">Status: {profile.verification_status || 'unverified'}</p>
        {profile.verification_rejection_reason && <p className="error">{profile.verification_rejection_reason}</p>}
        <label>ID type<input name="idType" placeholder="NIN, passport..." required /></label>
        <label>ID number<input name="idNumber" required /></label>
        <label>ID photo<input name="idPhotoUrl" type="file" accept="image/*" required /></label>
        <label>Selfie<input name="selfieUrl" type="file" accept="image/*" required /></label>
        <button className="primary">Submit verification</button>
      </form>

      <form className="form panel" onSubmit={savePayout}>
        <h2>Payout bank details</h2>
        <p className="muted">These details are private and never shown to customers.</p>
        <label>Bank name<input name="bankName" defaultValue={profile.bank_name || ''} required /></label>
        <label>Bank code<input name="bankCode" defaultValue={profile.bank_code || ''} required /></label>
        <label>Account number<input name="accountNumber" inputMode="numeric" pattern="[0-9]{10}" maxLength="10" defaultValue={profile.account_number || ''} required /></label>
        <button className="primary">Save payout details</button>
      </form>

      <form className="form panel" key={editing?.id || 'new-product'} onSubmit={saveProduct}>
        <h2>{editing ? 'Edit product' : 'Add product'}</h2>
        <label>Product name<input name="name" defaultValue={editing?.name || ''} required /></label>
        <label>Photo URL<input name="imageUrl" defaultValue={editing?.imageUrl || ''} placeholder="https://..." required /></label>
        <label>Price<input name="price" type="number" defaultValue={editing?.price || ''} required /></label>
        <label>Description<textarea name="description" defaultValue={editing?.description || ''} /></label>
        <label className="check"><input name="inStock" type="checkbox" value="true" defaultChecked={editing ? editing.inStock : true} /> In stock</label>
        <button className="primary">{editing ? 'Save changes' : 'Add product'}</button>
        {editing && <button type="button" className="link" onClick={() => setEditing(null)}>Cancel editing</button>}
      </form>
    </div>
    {notice && <p className="success">{notice}</p>}
    <div className="my-products"><h2>Your products</h2>{products.map((product) => <div className="product-row" key={product.id}><img src={product.imageUrl} alt="" /><span>{product.name}</span><strong>₦{Number(product.price).toLocaleString()}</strong><button className="link" onClick={() => setEditing(product)}>Edit</button><button className="link danger" onClick={() => removeProduct(product.id)}>Delete</button></div>)}</div>
  </main>;
}
