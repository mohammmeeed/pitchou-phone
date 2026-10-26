import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DatingProvider } from './context/DatingContext';
import F12Blocker from './components/F12Blocker';

// Background Visit Tracker for live dynamic traffic analytics in Admin Dashboard
function VisitTracker() {
  const location = useLocation();

  useEffect(() => {
    // Only track store visitor pages, avoid polling admin routes
    if (location.pathname.startsWith('/admin')) return;

    try {
      let sessId = sessionStorage.getItem('ts_visitor_session');
      if (!sessId) {
        sessId = 'sess_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
        sessionStorage.setItem('ts_visitor_session', sessId);
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const language = navigator.language || navigator.userLanguage || '';
      const screenWidth = window.screen?.width || window.innerWidth || 0;

      fetch('/api/track_visit.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_path: location.pathname,
          session_id: sessId,
          timezone,
          language,
          screen_width: screenWidth
        })
      }).catch(() => {});
    } catch (e) {}
  }, [location.pathname]);

  return null;
}

// Pages
import Auth from './pages/Auth';
import Login from './pages/Login';
import Otp from './pages/Otp';
import FirstName from './pages/FirstName';
import EnterBirthDate from './pages/EnterBirthDate';
import YourGender from './pages/YourGender';
import Orientation from './pages/Orientation';
import Interested from './pages/Interested';
import LookingFor from './pages/LookingFor';
import RecentPics from './pages/RecentPics';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Filter from './pages/Filter';
import Wishlist from './pages/Wishlist';
import ChatList from './pages/ChatList';
import Chat from './pages/Chat';
import MatchScreen from './pages/MatchScreen';
import Profile from './pages/Profile';
import ProfileDetail from './pages/ProfileDetail';
import EditProfile from './pages/EditProfile';
import Setting from './pages/Setting';
import HomeSetting from './pages/HomeSetting';
import Subscription from './pages/Subscription';
import ErrorPage from './pages/ErrorPage';

// Admin Pages (Hospital React Mediqu Design System)
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminProducts from './admin/pages/AdminProducts';
import AdminOrders from './admin/pages/AdminOrders';
import AdminCustomers from './admin/pages/AdminCustomers';
import AdminChat from './admin/pages/AdminChat';
import AdminCashflow from './admin/pages/AdminCashflow';
import AdminParameter from './admin/pages/AdminParameter';
import AdminLogin from './admin/pages/AdminLogin';
import AdminAccount from './admin/pages/AdminAccount';
import { adminApi } from './admin/services/adminApi';

// Route protégée pour l'administration : accès strictement restreint aux administrateurs connectés
function AdminProtectedRoute({ children }) {
  const isAuth = adminApi.isAuthenticated();
  if (!isAuth) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <DatingProvider>
        <BrowserRouter>
          <F12Blocker />
          <VisitTracker />
          <Routes>
            {/* Main & Auth */}
            <Route path="/" element={<Home />} />
            <Route path="/onboarding" element={<Navigate to="/" replace />} />
            <Route path="/onboarding.html" element={<Navigate to="/" replace />} />
            
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login.html" element={<Navigate to="/login" replace />} />
            <Route path="/register" element={<Auth defaultTab="register" />} />
            <Route path="/signup" element={<Auth defaultTab="register" />} />

            <Route path="/otp" element={<Otp />} />
            <Route path="/otp.html" element={<Navigate to="/otp" replace />} />

            {/* Profile Setup Steps */}
            <Route path="/first-name" element={<FirstName />} />
            <Route path="/first-name.html" element={<Navigate to="/first-name" replace />} />

            <Route path="/enter-birth-date" element={<EnterBirthDate />} />
            <Route path="/enter-birth-date.html" element={<Navigate to="/enter-birth-date" replace />} />

            <Route path="/your-gender" element={<YourGender />} />
            <Route path="/your-gender.html" element={<Navigate to="/your-gender" replace />} />

            <Route path="/orientation" element={<Orientation />} />
            <Route path="/orientation.html" element={<Navigate to="/orientation" replace />} />

            <Route path="/intrested" element={<Interested />} />
            <Route path="/intrested.html" element={<Navigate to="/intrested" replace />} />

            <Route path="/looking-for" element={<LookingFor />} />
            <Route path="/looking-for.html" element={<Navigate to="/looking-for" replace />} />

            <Route path="/recent-pics" element={<RecentPics />} />
            <Route path="/recent-pics.html" element={<Navigate to="/recent-pics" replace />} />

            {/* Main App - Redirection /home vers / */}
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/home.html" element={<Navigate to="/" replace />} />

            {/* Catégories & Livres (Clean SEO-friendly URLs: /categories, /categories/:category, /favoris) */}
            <Route path="/categories" element={<Wishlist />} />
            <Route path="/categories/:category" element={<Wishlist />} />
            <Route path="/category/:category" element={<Wishlist />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/wishlist/:category" element={<Wishlist />} />
            <Route path="/wishlist.html" element={<Navigate to="/categories" replace />} />
            <Route path="/favoris" element={<Wishlist defaultCategory="__favorites__" />} />

            {/* Panier & Commandes (/panier au lieu de /explore) */}
            <Route path="/panier" element={<Explore />} />
            <Route path="/cart" element={<Navigate to="/panier" replace />} />
            <Route path="/explore" element={<Navigate to="/panier" replace />} />
            <Route path="/explore.html" element={<Navigate to="/panier" replace />} />

            {/* Fiche Produit / Livre (/livre/:id au lieu de /profile-detail?id=...) */}
            <Route path="/livre/:id" element={<ProfileDetail />} />
            <Route path="/produit/:id" element={<ProfileDetail />} />
            <Route path="/book/:id" element={<ProfileDetail />} />
            <Route path="/profile-detail" element={<ProfileDetail />} />
            <Route path="/profile-detail.html" element={<Navigate to="/categories" replace />} />

            {/* Filtre & Recherche */}
            <Route path="/recherche" element={<Filter />} />
            <Route path="/filter" element={<Filter />} />
            <Route path="/filter.html" element={<Navigate to="/recherche" replace />} />

            {/* Chat & Support */}
            <Route path="/chat-list" element={<Navigate to="/chat" replace />} />
            <Route path="/chat-list.html" element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat.html" element={<Navigate to="/chat" replace />} />

            <Route path="/match-screen" element={<Navigate to="/" replace />} />
            <Route path="/match-screen.html" element={<Navigate to="/" replace />} />

            {/* Compte & Profil */}
            <Route path="/compte" element={<Profile />} />
            <Route path="/commandes" element={<Profile />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile.html" element={<Navigate to="/compte" replace />} />

            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/edit-profile.html" element={<Navigate to="/edit-profile" replace />} />

            <Route path="/setting" element={<Setting />} />
            <Route path="/setting.html" element={<Navigate to="/setting" replace />} />
            <Route path="/parametres" element={<Setting />} />

            <Route path="/home-setting" element={<HomeSetting />} />
            <Route path="/home-setting.html" element={<Navigate to="/home-setting" replace />} />

            <Route path="/subscription" element={<Subscription />} />
            <Route path="/subscription.html" element={<Navigate to="/subscription" replace />} />

            {/* Admin Panel (Hospital React / Mediqu Design System) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/admin/products" element={<AdminProtectedRoute><AdminProducts /></AdminProtectedRoute>} />
            <Route path="/admin/orders" element={<AdminProtectedRoute><AdminOrders /></AdminProtectedRoute>} />
            <Route path="/admin/cashflow" element={<AdminProtectedRoute><AdminCashflow /></AdminProtectedRoute>} />
            <Route path="/admin/journal" element={<Navigate to="/admin/cashflow" replace />} />
            <Route path="/admin/customers" element={<AdminProtectedRoute><AdminCustomers /></AdminProtectedRoute>} />
            <Route path="/admin/chat" element={<AdminProtectedRoute><AdminChat /></AdminProtectedRoute>} />
            <Route path="/admin/parameter" element={<AdminProtectedRoute><AdminParameter /></AdminProtectedRoute>} />
            <Route path="/admin/account" element={<AdminProtectedRoute><AdminAccount /></AdminProtectedRoute>} />

            {/* Fallback 404 */}
            <Route path="/error" element={<ErrorPage />} />
            <Route path="/error.html" element={<Navigate to="/error" replace />} />
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </BrowserRouter>
      </DatingProvider>
    </ThemeProvider>
  );
}

export default App;
