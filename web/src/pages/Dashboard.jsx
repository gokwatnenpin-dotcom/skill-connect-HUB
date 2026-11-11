import { useEffect, useState } from 'react';
import { request, uploadFile } from '../api.js';

export default function Dashboard({ user, onLogout, onProfileUpdated }) {
  const [profile, setProfile] = useState({});
  const [products, setProducts] = useState([]);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [deletionNotice, setDeletionNotice] = useState('');
  const [deletionBusy, setDeletionBusy] = useState(false);

  function load() {
    request('/me').then((data) => {
      setProfile({ ...data.user, ...(data.artisan || {}) });
      if (data.artisan) request(`/artisans/${data.artisan.id}`).then((artisan) => setProducts(artisan.products));
    });
  }

  useEffect(() => { if (user) load(); }, [user]);

  async function saveProfile(event) {
    event.preventDefault();
    try { const values = Object.fromEntries(new FormData(event.currentTarget)); if (values.imageFile?.name) values.imageUrl = (await uploadFile(values.imageFile, 'profile')).url; delete values.imageFile; const result = await request('/artisan/profile', { method: 'POST', body: JSON.stringify(values) }); onProfileUpdated?.(result.artisan?.image_url || ''); setNotice('Profile saved.'); load(); } catch (error) { setNotice(error.message); }
  }

  async function savePayout(event) {
    event.preventDefault();
    try { await request('/artisan/payout-details', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); setNotice('Payout details saved.'); } catch (error) { setNotice(error.message); }
  }

  async function saveVerification(event) {
    event.preventDefault();
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      values.idPhotoAssetId = (await uploadFile(values.idPhotoUrl, 'id')).assetId;
      values.selfieAssetId = (await uploadFile(values.selfieUrl, 'id')).assetId;
      delete values.idPhotoUrl; delete values.selfieUrl;
      await request('/artisan/verification', { method: 'POST', body: JSON.stringify(values) });
      setNotice('Verification submitted.');
      load();
    } catch (error) { setNotice(error.message); }
  }

  async function saveProduct(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try { if (values.image?.name) values.imageUrl = (await uploadFile(values.image, 'product')).url; else if (editing) values.imageUrl = editing.imageUrl; delete values.image; await request(editing ? `/products/${editing.id}` : '/products', { method: editing ? 'PUT' : 'POST', body: JSON.stringify({ ...values, price: Number(values.price), inStock: values.inStock === 'true' }) }); event.currentTarget.reset(); setEditing(null); setNotice(editing ? 'Product updated.' : 'Product added.'); load(); } catch (error) { setNotice(error.message); }
  }

  async function removeProduct(id) {
    if (!confirm('Delete this product?')) return;
    await request(`/products/${id}`, { method: 'DELETE' });
    load();
  }

  async function deleteAccount() {
    const confirmed = window.confirm('Are you sure you want to delete your account? Your account will be scheduled for deletion after 7 days.');
    if (!confirmed) return;
    setDeletionBusy(true);
    try {
      const result = await request('/me/delete-account', { method: 'POST', body: JSON.stringify({}) });
      localStorage.removeItem('token');
      setDeletionNotice(`Account deletion is scheduled for ${new Date(result.scheduledDeletionAt).toLocaleString()}.`);
      setTimeout(() => onLogout?.(), 2500);
    } catch (error) { setNotice(error.message); setDeletionBusy(false); }
  }

  if (!user) return <main className="container content"><h1>Profile</h1><p>Log in to view your profile.</p></main>;
  if (user.role !== 'artisan') return <main className="container content"><div className="profile-panel"><p className="eyebrow">Your account</p><h1>{user.name}</h1><p className="muted">{user.email}</p><button className="secondary" onClick={onLogout}>Log out</button><AccountDeletion notice={deletionNotice} busy={deletionBusy} onDelete={deleteAccount} /></div></main>;

  return <main className="container content dashboard">
    <p className="eyebrow">Artisan dashboard</p>
    <div className="profile-title-row"><div><h1>Your profile and products</h1><p className="muted">Manage what customers see and sell directly from your profile.</p></div><button className="secondary" onClick={onLogout}>Log out</button></div>
    <div className="dashboard-grid">
      <form className="form panel" key={profile.id || 'profile'} onSubmit={saveProfile}>
        <h2>Profile</h2>
        <label>Name<input name="name" defaultValue={profile.name || ''} required /></label>
        <label>Skill<input name="skill" defaultValue={profile.skill || ''} required /></label>
        <label>Area<input name="area" defaultValue={profile.area || ''} required /></label>
        <label>Short bio<textarea name="bio" defaultValue={profile.bio || ''} /></label>
        <label>Profile photo<input name="imageFile" type="file" accept="image/*" /></label>
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
        <label>Photo<input name="image" type="file" accept="image/*" required={!editing} /></label>
        <label>Price<input name="price" type="number" defaultValue={editing?.price || ''} required /></label>
        <label>Description<textarea name="description" defaultValue={editing?.description || ''} /></label>
        <label className="check"><input name="inStock" type="checkbox" value="true" defaultChecked={editing ? editing.inStock : true} /> In stock</label>
        <button className="primary">{editing ? 'Save changes' : 'Add product'}</button>
        {editing && <button type="button" className="link" onClick={() => setEditing(null)}>Cancel editing</button>}
      </form>
    </div>
    {notice && <p className="success">{notice}</p>}
    <AccountDeletion notice={deletionNotice} busy={deletionBusy} onDelete={deleteAccount} />
    <div className="my-products"><h2>Your products</h2>{products.map((product) => <div className="product-row" key={product.id}><img src={product.imageUrl} alt="" /><span>{product.name}</span><strong>₦{Number(product.price).toLocaleString()}</strong><button className="link" onClick={() => setEditing(product)}>Edit</button><button className="link danger" onClick={() => removeProduct(product.id)}>Delete</button></div>)}</div>
  </main>;
}

function AccountDeletion({ notice, busy, onDelete }) {
  return <section className="account-delete"><h2>Delete account</h2><p className="muted">After you confirm, your account will be scheduled for deletion in 7 days.</p>{notice ? <p className="success">{notice}</p> : <button className="danger-button" disabled={busy} onClick={onDelete}>{busy ? 'Scheduling…' : 'Delete my account'}</button>}</section>;
}
