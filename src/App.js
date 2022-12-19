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
  const [values, setValues] = useState({
    isAuthencated: false,
    selected_image: null,
    selected_product: {
      item_title: '',
      is_most_wanted: false,
      item_url: '',
      item_price: '',
      item_description: '',
    },
    product: null,
  });
  const [product, setProduct] = useState(null);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    const checkTokenValid = async () => {
      setLoading(true);
      const token = await checkToken();
      const refresh_token = localStorage.getItem('@refresh_token');
      if (token) {
        setValues({ ...values, isAuthencated: true });
      } else {
        if (refresh_token) {
          await refreshToken();
          setValues({ ...values, isAuthencated: true });
        }
      }
      setLoading(false);
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
          <Home data={product} />
        }
      </Router>
    </ProductContext.Provider>
  );
}

export default App;
