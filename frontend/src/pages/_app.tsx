import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../lib/api';
import '../styles/global.css';

function MyApp({ Component, pageProps }: any) {
  const { setUser } = useAuthStore();

  useEffect(() => {
    // Check if user is logged in on app load
    authApi.me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, [setUser]);

  return <Component {...pageProps} />;
}

export default MyApp;
