import { useEffect } from "react";
import { goTo } from "react-chrome-extension-router";
import Header from "../components/Header";
import { useProductContext } from "../contexts/ProductContext";
import Home from "./Home";

const MoreImages = ({ product }) => {
  const [context, setContext] = useProductContext();
  const handleSelectImage = (val) => {
    context.selected_image = val;
    setContext({ ...context });
    product[0].product.mainImage = val;
    goTo(Home, { data: product });
  };

  useEffect(() => {
    window.parent.postMessage({ type: 'resize-modal', width: '1120px', height: '730px' }, "*");
  }, []);

  return (
    <div className="App" id="giftlist_extension_popup_container">
      <div id="giftlist_extension_popup_content">
        <Header />
        <div id="giftlist_extension_popup_main_content">
          <div className="giftlist-extension-show-more-image-content">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h2>Select an image for your gift list</h2>
            </div>
            <hr />
            <div className="giftlist-extension-item-image-container">
              {product &&
                product[0] &&
                product[0].product &&
                product[0].product.images &&
                product[0].product.images.length > 0
                ? product[0].product.images.map((item) => {
                  return (
                    <div className="giftlist-extension-item-image" onClick={() => handleSelectImage(item)}>
                      <img src={item} className="selected-item-image" />
                    </div>);
                })
                : <p style={{ marginTop: 10, textAlign: 'center', fontWeight: 'bold' }}>No images</p>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MoreImages;