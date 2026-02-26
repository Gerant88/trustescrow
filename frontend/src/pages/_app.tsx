import React, { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../lib/api';
import '../styles/global.css';

function MyApp({ Component, pageProps }: any) {
  const { setUser, setInitialized } = useAuthStore();

  useEffect(() => {
    authApi.me()
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setInitialized(true);
      });
  }, [setUser, setInitialized]);

  return <Component {...pageProps} />;
}

export default MyApp;
