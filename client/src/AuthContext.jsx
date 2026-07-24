import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { setAuthTokenGetter } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Give api.js a way to fetch a fresh ID token for every request without
    // importing React into that plain module.
    setAuthTokenGetter(() => (auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null)));
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(
    (email, password) => signInWithEmailAndPassword(auth, email, password),
    []
  );

  const signup = useCallback(async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    return cred;
  }, []);

  const loginWithGoogle = useCallback(() => signInWithPopup(auth, googleProvider), []);

  const logout = useCallback(() => signOut(auth), []);

  // Returns a fresh Firebase ID token for attaching to API requests. Firebase
  // caches/refreshes automatically; this only forces a network call if the
  // cached token is close to expiry.
  const getToken = useCallback(() => {
    if (!auth.currentUser) return Promise.resolve(null);
    return auth.currentUser.getIdToken();
  }, []);

  const value = { user, loading, login, signup, loginWithGoogle, logout, getToken };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
