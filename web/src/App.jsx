import { useEffect, useState } from 'react';
import { go, request } from './api.js';
import AuthModal from './components/AuthModal.jsx';
import ArtisanPage from './pages/ArtisanPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Home from './pages/Home.jsx';
import Inbox from './pages/Inbox.jsx';
import Orders from './pages/Orders.jsx';
import ProductPage from './pages/ProductPage.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState(window.location.hash.slice(1) || 'home');
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.slice(1) || 'home');
    window.addEventListener('hashchange', onHashChange);

    if (localStorage.token) {
      request('/me')
        .then((data) => setUser(data.user))
        .catch(() => localStorage.removeItem('token'));
    }

    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    go('home');
  }

  const askLogin = () => setAuthOpen(true);

  return (
    <>
      <header>
        <div className="container nav">
          <a className="logo" href="#home">SkillConnect<span>HUB</span></a>
          <nav>
            {user ? (
              <>
                <a href="#inbox">Inbox</a>
                <a href="#orders">My orders</a>
                {user.role === 'artisan' && <a href="#dashboard">My dashboard</a>}
                {user.role === 'admin' && <a href="#admin">Admin</a>}
                <button className="link" onClick={logout}>Log out</button>
              </>
            ) : (
              <button className="primary small" onClick={askLogin}>Log in / sign up</button>
            )}
          </nav>
        </div>
      </header>

      {route === 'home' && <Home />}
      {route.startsWith('inbox') && <Inbox user={user} askLogin={askLogin} />}
      {route === 'orders' && <Orders user={user} askLogin={askLogin} />}
      {route === 'dashboard' && <Dashboard user={user} />}
      {route === 'admin' && <AdminPage user={user} />}
      {route.startsWith('artisan/') && <ArtisanPage id={route.split('/')[1]} user={user} askLogin={askLogin} />}
      {route.startsWith('product/') && <ProductPage id={route.split('/')[1]} user={user} askLogin={askLogin} />}

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onLogin={(nextUser) => {
            setUser(nextUser);
            setAuthOpen(false);
          }}
        />
      )}
    </>
  );
}
