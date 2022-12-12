import { useEffect } from 'react';
import { useState } from 'react';
import { goTo } from 'react-chrome-extension-router';
import Header from '../components/Header';
import { CRY, NONE_IMAGE } from '../constant';
import { useProductContext } from '../contexts/ProductContext';
import { instance } from '../store/api';
import MoreImages from './MoreImages';
import Success from './Success';

const Home = () => {
  const [context, setContext] = useProductContext();
  const [product, setProduct] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const [is_most_wanted, setMostWanted] = useState(false);
  const [selected_list_id, setSelected] = useState('');
  const [data, setListData] = useState([]);
  const [selected_item, setSelectedItem] = useState({});
  const selected_image = context.selected_image || '';

  const changeItemName = (value) => {
    setSelectedItem({ ...selected_item, item_title: value });
  };

  const handleCategory = (e) => {
    setContext({ ...context, selected_list_id: e.target.value });
    setSelected(e.target.value);
    localStorage.setItem('@last_selected', e.target.value);
  }

  const handleViewMoreImages = () => {
    goTo(MoreImages)
  };

  const getAllList = async () => {
    const mainListData = await instance.post("/giftlist/my/list/all").then(res => res.data);
    const santaListData = await instance.post("/secret_santa/all/list").then(res => res.data);

    const lists = [
      ...mainListData.map((item) => ({
        id: item.id,
        name: item.list_name,
      })),
      ...santaListData.map((item) => ({
        id: item.id,
        name: item.event_name,
        isSanta: true,
      })),
    ];
    setListData(lists);
    return lists;
  };

  const handleAddGift = () => {
    let url = "giftitem/add/favorite";
    const postData = {
      gift_title: selected_item.item_title,
      image_url: selected_image,
      price: selected_item.item_price,
      details: selected_item.item_description,
      isMostWanted: is_most_wanted === true ? true : false,
      product_url: selected_item.item_url,
      shop_product_id: null,
    };

    if (selected_list_id && selected_list_id.indexOf("_list") > -1) {
      url = "giftitem/create";
      postData.giftlist_id = selected_list_id.split("_")[0];
      delete postData.shop_product_id;
    } else if (selected_list_id && selected_list_id.indexOf("_santa") > -1) {
      url = "giftitem/add/secret-santa/wish";
      postData.secretsanta_id = selected_list_id.split("_")[0];
      delete postData.shop_product_id;
    }
    setLoading(true);
    instance
      .post(url, postData)
      .then(res => {
        if (res.status === 200) {
          let isFirst = localStorage.getItem('@is_first') || 0;
          localStorage.setItem('@is_first', isFirst * 1 + 1);
          goTo(Success);
        }
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
      })
  };

  useEffect(() => {
    getAllList();
  }, []);

  return (
    <div className="App" id="giftlist_extension_popup_container">
      <div id="giftlist_extension_popup_content">
        <Header isAuthenticated={context.isAuthencated} />
        <div id="giftlist_extension_popup_main_content">
          <div style={{ position: 'relative' }}>
            <h2>Add gift</h2>
            {(!product || ((product && product.length > 0) && !product[0].product)) &&
              <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', top: -2 }}>
                <div id="giftlist_extension_add_gift_error_message">
                  <div id="giftlist_extension_add_gift_error_message_icon">
                    <img src={CRY} style={{ width: 25, height: 25 }} alt={''} />
                  </div>
                  <div id="giftlist_extension_add_gift_error_title">
                    <p>Sorry, we couldn’t fetch item details from this site.</p>
                    <p>Please add your item details manually.</p>
                  </div>
                </div>
              </div>
            }
          </div>
          <hr />
          <div className="giftlist-extension-add-gift-content">
            <div className="giftlist-extension-image-container">
              {product && product[0] && product[0].product
                ?
                <div>
                  <img src={selected_image ?? (product[0].product && product[0].product.mainImage ? product[0].product.mainImage : "")} className="selected-item-image" alt={''} />
                  {product[0].product &&
                    product[0].product.images &&
                    product[0].product.images.length > 0
                    ? <button id="giftlist_extension_view_more_images" className="extension-btn extension-btn-link" onClick={handleViewMoreImages}>View more images</button>
                    : ""
                  }
                </div>
                :
                <div>
                  <img src={NONE_IMAGE} className="selected-item-image" alt={''} />
                  <p style={{ color: '#818694', textAlign: 'center', fontSize: 15, lineHeight: '20px', fontWeight: 400 }}>You can add an image manually from the GiftList website.</p>
                </div>
              }
            </div>
            <div className="giftlist-extension-add-gift-form">
              <div className="extension-form-group">
                <label>Add to List</label>
                <select className="extension-form-control" id="giftlist_extension_list_id" value={selected_list_id} onChange={handleCategory}>
                  <option value="favourite">Favorites</option>
                  {(data || []).map(
                    (item) =>
                      <option value={item.id + "_" + (item.isSanta ? "santa" : "list")} key={item.id + "_" + (item.isSanta ? "santa" : "list")}>
                        {item.name}
                      </option>
                  )}
                </select>
              </div>
              <div className="extension-form-group">
                <label>Item name</label>
                <input
                  type="text"
                  placeholder="Item Name"
                  value={selected_item.item_title || (product && product[0].product ? product[0].product.name.replace(/"/g, "'") : "")}
                  onChange={(e) => changeItemName(e.target.value)}
                  id="giftlist_extension_selected_product_name"
                />
              </div>
              <div className="extension-form-group" style={{ display: 'flex' }}>
                <input type="checkbox" value="" id="giftlist_extension_most_wanted" checked={is_most_wanted} onChange={() => setMostWanted(!is_most_wanted)} />
                <label style={{ marginLeft: 8, fontWeight: 400, fontSize: 15, lineHeight: '20px', marginBottom: -1 }} htmlFor="giftlist_extension_most_wanted">Most wanted gift</label>
              </div>
              <div className="extension-form-group">
                <label>Item URL</label>
                <input type="text" placeholder="Item URL" value={selected_item.item_url || window.location.href} onChange={(e) => setSelectedItem({ ...selected_item, item_url: e.target.value })} id="giftlist_extension_selected_product_url" />
              </div>
              <div className="extension-form-group">
                <label>Price<span style={{ color: '#A8ACB3', marginLeft: 6 }}>(optional)</span></label>
                <input type="text" placeholder="Price" value={(selected_item.item_price ? (selected_item.item_price * 1).toFixed(2) : "") || (product && product[0].product && product[0].product.offers ? (product[0].product.offers[0].price * 1).toFixed(2) : "")} onChange={(e) => setSelectedItem({ ...selected_item, item_price: e.target.value })} id="giftlist_extension_selected_product_price" />
              </div>
              <div className="extension-form-group">
                <label>Other details<span style={{ color: '#A8ACB3', marginLeft: 6 }}>(optional)</span></label>
                <textarea className="extension-form-control" rows="3" placeholder="Other important details: size, color, etc." id="giftlist_extension_selected_product_others" onChange={(e) => setSelectedItem({ ...selected_item, item_description: e.target.value })}>{selected_item.item_description}</textarea>
              </div>
              <div className="form-actions">
                <button className="extension-btn" id="giftlist_extension_add_btn" onClick={handleAddGift} disabled={isLoading}>
                  {isLoading &&
                    <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
                  }
                  Add gift
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home;