import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from './lib/supabase';
import { setAuth, logout } from './store/userSlice';

import AuthPage from './pages/AuthPage';
import ApiKeySetupPage from './pages/ApiKeySetupPage';

function AuthenticatedLayout() {
  const dispatch = useDispatch();
  
  async function handleLogout() {
    await supabase.auth.signOut();
    dispatch(logout());
  }

  return (
    <div>
      <nav style={{ padding: '15px', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>SkillFit AI</h2>
        <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer' }}>Sign Out</button>
      </nav>
      <main style={{ padding: '20px' }}>
        <ApiKeySetupPage />
      </main>
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const session = useSelector(state => state.user.session);

  useEffect(() => {
    // get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        dispatch(setAuth({ user: session.user, session }));
      }
    });

    // listen for auth changes (like logging in or out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        dispatch(setAuth({ user: session.user, session }));
      } else {
        dispatch(logout());
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return (
    <BrowserRouter>
      {session ? (
        <Routes>
          <Route path="/*" element={<AuthenticatedLayout />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/auth" />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
