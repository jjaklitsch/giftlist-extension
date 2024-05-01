import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import { useEffect, useState } from "react";
import { Router } from "react-chrome-extension-router";

import './App.css';

import { AuthProvider } from "./contexts/AuthenticationContext";
import { ProductContext } from "./contexts/ProductContext";

import Header from "./components/Header";
import Loading from "./components/Loading";

import Home from "./pages/Home";
import Login from "./pages/Login";

function App() {
  const last_selected = localStorage.getItem('@last_selected');
  const [values, setValues] = useState({
    authorized_token: '',
    categories: [],
    isAuthencated: false,
    selected_image: null,
    selected_product: {
      item_title: '',
      is_most_wanted: false,
      item_url: '',
      item_price: '',
      item_description: '',
    },
    selected_list_id: last_selected || 'favourite',
    product: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);


  useEffect(() => onAuthStateChanged(auth, async (authUser) => {
    console.info('App onAuthStateChanged', authUser);
    if (!authUser || authUser.isAnonymous) {
      // User is not signed in
      setIsLoggedIn(false);
    } else {
      // User is signed in
      setIsLoggedIn(true);
    }

    setIsLoading(false);
    window.parent.postMessage({ type: 'loaded' }, "*");

    return;
  }));

  const storeAllValues = (val) => {
    setValues(val);
  };

  return (
    <AuthProvider>
      <ProductContext.Provider value={[values, storeAllValues]}>
        <Router>
          {isLoading &&
            <div className="App" id="giftlist_extension_popup_container">
              <div id="giftlist_extension_popup_content">
                <Header />
                <Loading />
              </div>
            </div>
          }
          {(!isLoading && !isLoggedIn) &&
            <Login />
          }
          {(!isLoading && isLoggedIn) &&
            <Home />
          }
        </Router>
      </ProductContext.Provider>
    </AuthProvider>
  );
}

export default App;
