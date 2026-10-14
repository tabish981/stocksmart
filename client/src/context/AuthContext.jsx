import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('stocksmart_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [store, setStore] = useState(() => {
    const saved = localStorage.getItem('stocksmart_store');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('stocksmart_token'));
  const [loading, setLoading] = useState(true);

  // Sync current user and store from server on mount
  useEffect(() => {
    const fetchCurrentAuth = async () => {
      const storedToken = localStorage.getItem('stocksmart_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
          setStore(res.data.store);
          localStorage.setItem('stocksmart_user', JSON.stringify(res.data.user));
          localStorage.setItem('stocksmart_store', JSON.stringify(res.data.store));
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token: newToken, user: newUser, store: newStore } = res.data;
      setToken(newToken);
      setUser(newUser);
      setStore(newStore);
      localStorage.setItem('stocksmart_token', newToken);
      localStorage.setItem('stocksmart_user', JSON.stringify(newUser));
      localStorage.setItem('stocksmart_store', JSON.stringify(newStore));
      return res.data;
    }
  };

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);
    if (res.data.success) {
      const { token: newToken, user: newUser, store: newStore } = res.data;
      setToken(newToken);
      setUser(newUser);
      setStore(newStore);
      localStorage.setItem('stocksmart_token', newToken);
      localStorage.setItem('stocksmart_user', JSON.stringify(newUser));
      localStorage.setItem('stocksmart_store', JSON.stringify(newStore));
      return res.data;
    }
  };

  const logout = () => {
    setUser(null);
    setStore(null);
    setToken(null);
    localStorage.removeItem('stocksmart_token');
    localStorage.removeItem('stocksmart_user');
    localStorage.removeItem('stocksmart_store');
  };

  const updateStoreState = (updatedStore) => {
    setStore(updatedStore);
    localStorage.setItem('stocksmart_store', JSON.stringify(updatedStore));
  };

  const updateUserState = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('stocksmart_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        store,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
        updateStoreState,
        updateUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
