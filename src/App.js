import { useEffect, useState } from "react";
import {
  Router,
} from "react-chrome-extension-router";
import './App.css';
import Header from "./components/Header";
import Loading from "./components/Loading";
import { ProductContext } from "./contexts/ProductContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { checkToken, refreshToken } from "./store/api";

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
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    const checkTokenValid = async () => {
      setLoading(true);
      const token = await checkToken();
      const refresh_token = localStorage.getItem('@refresh_token');
      if (token) {
        setValues({ ...values, isAuthencated: true, authorized_token: token });
      } else {
        if (refresh_token) {
          const refreshed_token_res = await refreshToken();
          setValues({ ...values, isAuthencated: true, authorized_token: refreshed_token_res.token });
        }
      }
      setLoading(false);
      window.parent.postMessage({ type: 'loaded' }, "*");
    };

    checkTokenValid();
  }, []);

  const storeAllValues = (val) => {
    setValues(val);
  };

  return (
    <ProductContext.Provider value={[values, storeAllValues]}>
      <Router>
        {isLoading &&
          <div className="App" id="giftlist_extension_popup_container">
            <div id="giftlist_extension_popup_content">
              <Header isAuthenticated={values.isAuthencated} />
              <Loading />
            </div>
          </div>
        }
        {(!isLoading && !values.isAuthencated) &&
          <Login />
        }
        {(!isLoading && values.isAuthencated) &&
          <Home />
        }
      </Router>
    </ProductContext.Provider>
  );
}

export default App;
