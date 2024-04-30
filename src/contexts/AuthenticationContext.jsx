import React, { createContext, useEffect, useState } from 'react';

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  fetchSignInMethodsForEmail,
  FacebookAuthProvider,
} from 'firebase/auth';

import { auth } from '../firebase';

import { legacyLogin } from "../store/api";

const AuthContext = createContext({
  user: null,
  userData: null,
  isLoggedIn: false,
  isAnonymous: false,
  loading: true,
  error: null,
  signIn: async (email, password) => {},
  signOut: async () => {},
  signInWithProvider: async (provider) => {},
  cleanError: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  /**
   * Handle Firebase Auth state changes
   */
  useEffect(() => onAuthStateChanged(auth, async (authUser) => {
    console.info('onAuthStateChanged', authUser);
    if (!authUser || authUser.isAnonymous) {
      // User is not signed in
      setIsLoggedIn(false);
      setUser(null);
      setLoading(false);
      setIsAnonymous(!!authUser?.isAnonymous);
      return;
    }

    try {
        await authUser.getIdToken();
        setUser(authUser);
    } catch (error) {
      console.error("onAuthStateChanged", error);
      setError(error);
    }

    setLoading(false);
  }));

  // Handle error state change
  useEffect(() => {
    if (error) {
      //toast.error(error?.message || "Authentication error");
    }
  }, [error]);

  const signIn = async (email, password) => {
    setError(null);
    setLoading(true);

    return signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed in
        const user = userCredential.user;
        console.info("signIn successful", userCredential);
        return user;
      })
      .catch(async (error) => {
        const errorCode = error.code;
        let errorMessage = error.message;
        console.error(`signInWithEmailAndPassword error ${errorCode}`, error);

        if (errorCode !== 'auth/user-not-found') {
          if (errorCode === 'auth/wrong-password') {
            // First check for existing accounts using the entered email
            const providers = await fetchSignInMethodsForEmail(auth, email);

            if (providers.length > 0) {
              // Account exists with a different provider
              errorMessage = `Your account exists with a different provider. Please sign in with ${providers.join(' or ')}`;
            } else {
              errorMessage = "Invalid password";
            }
          }

          setError(new Error(errorMessage));
          setLoading(false);
          return;
        }

        // auth/user-not-found - try legacy login
        try {
          const data = await legacyLogin(email, password);

          if (!data.uid) {
            console.warn("Legacy login data does not contain uid", email, data);
            const errorMessage = data.message || 'Invalid credentials';
            setError(new Error(errorMessage));
            setLoading(false);
            return;
          }

          if (data.userData) {
            console.info("Legacy login userData", data.userData.id, data.userData.email);
            setUserData(data.userData);
          } else {
            console.warn("Legacy login data does not contain userData", email, data);
          }

          console.info(`Legacy migration successful ${data?.uid}`, data);
          signInWithEmailAndPassword(auth, email, password)
            .catch((err) => {
              console.error(`signInWithEmailAndPassword after Legacy auth failed ${err.code}`, err);

              // Retry after delay
              return new Promise((resolve, reject) => setTimeout(() => {
                signInWithEmailAndPassword(auth, email, password)
                  .then(resolve).catch(reject);
              }, 500));
            });
        } catch (e) {
          console.error("Legacy login error", e);
          setError(e);
          setLoading(false);
        }
      });
  };

  const signInWithProvider = (providerName) => {
    let provider;
    switch (providerName) {
      case 'google':
        provider = new GoogleAuthProvider();
        break;
        case 'facebook':
        provider = new FacebookAuthProvider();
        break;
      default:
        throw new Error(`Provider ${providerName} not supported`);
    }

    setError(null);
    setLoading(true);

    return signInWithPopup(auth, provider)
      .then((result) => {
        console.info("signInWithProvider successful", result);

        // This gives you a Google Access Token.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;

        // IdP data available using getAdditionalUserInfo(result);
        return result;
      })
      .catch(async (error) => {
        const credential = providerName === 'google'
          ? GoogleAuthProvider.credentialFromError(error)
          : FacebookAuthProvider.credentialFromError(error);
        console.error(`signInWithPopup error ${error.code} Credential:`, credential);

        console.error("signInWithProvider", error);
        setError(error);
        setLoading(false);
      });
  }

  const signOutFn = () => {
    signOut(auth)
      .then(() => {
        console.info("signOut successful");
      }).catch((error) => {
      console.error("signOut", error);
    });
  }

  const cleanError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoggedIn,
      isAnonymous,
      loading,
      error,
      signIn,
      signOut: signOutFn,
      signInWithProvider,
      userData,
      cleanError,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
