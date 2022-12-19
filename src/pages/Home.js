import { useCallback, useEffect } from 'react';
import { useState } from 'react';
import { goTo } from 'react-chrome-extension-router';
import Header from '../components/Header';
import Loading from '../components/Loading';
import { CRY, NONE_IMAGE } from '../constant';
import { useProductContext } from '../contexts/ProductContext';
import { instance } from '../store/api';
import MoreImages from './MoreImages';
import Success from './Success';

const Home = ({ selected_image }) => {
  const [context, setContext] = useProductContext();
  const [product, setProduct] = useState({});
  const [isGetting, setGetting] = useState(true);
  const [isLoading, setLoading] = useState(false);
  const [is_most_wanted, setMostWanted] = useState(false);
  const [selected_list_id, setSelected] = useState('');
  const [lists, setListData] = useState([]);
  const [selected_item, setSelectedItem] = useState({});

  const changeItemName = (value) => {
    setSelectedItem({ ...selected_item, item_title: value });
  };

  const handleCategory = (e) => {
    setContext({ ...context, selected_list_id: e.target.value });
    setSelected(e.target.value);
    localStorage.setItem('@last_selected', e.target.value);
  }

  const handleViewMoreImages = useCallback(() => {
    goTo(MoreImages, { product })
  }, [product]);

  const getAllList = async () => {
    if (context.authorized_token) {
      instance.defaults.headers.common['x-access-token'] = context.authorized_token;
    } else {
      instance.defaults.headers.common['x-access-token'] = await localStorage.getItem('@access_token');
    }
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
    const last_selected = localStorage.getItem('@last_selected');
    setSelected(last_selected);
    return lists;
  };

  const handleAddGift = () => {
    let url = "giftitem/add/favorite";
    const postData = {
      gift_title: selected_item.item_title,
      image_url: selected_item.selected_image,
      price: selected_item.item_price,
      details: selected_item.item_description,
      isMostWanted: is_most_wanted === true ? true : false,
      product_url: selected_item.item_url.split('/ref=')[0],
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

  useEffect(() => {
    var eventMethod = window.addEventListener
      ? "addEventListener"
      : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    // Listen to message from child window
    eventer(messageEvent, async function (e) {
      if (e.data.type === 'product_data') {
        const tempProduct = e.data.data;
        if (selected_image) {
          tempProduct[0].product.mainImage = selected_image;
        }
        setSelectedItem({
          selected_image: tempProduct && tempProduct[0].product && tempProduct[0].product.mainImage ? tempProduct[0].product.mainImage : "",
          item_title: tempProduct && tempProduct[0].product ? tempProduct[0].product.name.replace(/"/g, "'") : "",
          item_price: tempProduct && tempProduct[0].product && tempProduct[0].product.offers ? (tempProduct[0].product.offers[0].price * 1).toFixed(2) : "",
          item_description: "",
          item_url: tempProduct && tempProduct[0].product ? tempProduct[0].product.url.replace(/"/g, "'") : "",
          images: tempProduct && tempProduct[0].product ? tempProduct[0].product.images : [],
        });
        setProduct({ ...tempProduct });
        setGetting(false);
      }
    });
  }, []);

  useEffect(() => {
    window.parent.postMessage({ type: 'resize-modal', width: '800px', height: '750px' }, "*");
    window.parent.postMessage({ type: 'require_product' }, "*");
  }, []);


  return (
    <div className="App" id="giftlist_extension_popup_container">
      <div id="giftlist_extension_popup_content">
        <Header isAuthenticated={context.isAuthencated} />
        {isGetting &&
          <Loading />
        }
        {!isGetting &&
          <div id="giftlist_extension_popup_main_content">
            <div style={{ position: 'relative' }}>
              <h2>Add gift</h2>
              {(!selected_item || (!Object.keys(selected_item).length)) &&
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
                {selected_item && selected_item.images && selected_item.images.length > 0
                  ?
                  <div>
                    <img src={selected_item?.selected_image ?? (product[0].product && product[0].product.mainImage ? product[0].product.mainImage : "")} className="selected-item-image" alt={''} />
                    {selected_item.images.length > 0
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
                    {(lists || []).map(
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
                  <input type="text" placeholder="Price" value={selected_item.item_price || (product && product[0].product && product[0].product.offers ? (product[0].product.offers[0].price * 1) : "")} onChange={(e) => setSelectedItem({ ...selected_item, item_price: e.target.value })} onBlur={() => setSelectedItem({ ...selected_item, item_price: selected_item.item_price.toFixed(2) })} id="giftlist_extension_selected_product_price" />
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
        }
      </div>
    </div>
  )
}

export default Home;