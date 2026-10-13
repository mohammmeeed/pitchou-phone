import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { DatingProvider } from './context/DatingContext';

// Pages
import Onboarding from './pages/Onboarding';
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

function App() {
  return (
    <ThemeProvider>
      <DatingProvider>
        <BrowserRouter>
          <Routes>
            {/* Onboarding & Auth */}
            <Route path="/" element={<Onboarding />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/onboarding.html" element={<Navigate to="/onboarding" replace />} />
            
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

            {/* Main App */}
            <Route path="/home" element={<Home />} />
            <Route path="/home.html" element={<Navigate to="/home" replace />} />

            <Route path="/explore" element={<Explore />} />
            <Route path="/explore.html" element={<Navigate to="/explore" replace />} />

            <Route path="/filter" element={<Filter />} />
            <Route path="/filter.html" element={<Navigate to="/filter" replace />} />

            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/wishlist.html" element={<Navigate to="/wishlist" replace />} />

            <Route path="/chat-list" element={<ChatList />} />
            <Route path="/chat-list.html" element={<Navigate to="/chat-list" replace />} />

            <Route path="/chat" element={<Chat />} />
            <Route path="/chat.html" element={<Navigate to="/chat" replace />} />

            <Route path="/match-screen" element={<Navigate to="/home" replace />} />
            <Route path="/match-screen.html" element={<Navigate to="/home" replace />} />

            <Route path="/profile" element={<Profile />} />
            <Route path="/profile.html" element={<Navigate to="/profile" replace />} />

            <Route path="/profile-detail" element={<ProfileDetail />} />
            <Route path="/profile-detail.html" element={<Navigate to="/profile-detail" replace />} />

            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/edit-profile.html" element={<Navigate to="/edit-profile" replace />} />

            <Route path="/setting" element={<Setting />} />
            <Route path="/setting.html" element={<Navigate to="/setting" replace />} />

            <Route path="/home-setting" element={<HomeSetting />} />
            <Route path="/home-setting.html" element={<Navigate to="/home-setting" replace />} />

            <Route path="/subscription" element={<Subscription />} />
            <Route path="/subscription.html" element={<Navigate to="/subscription" replace />} />

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
