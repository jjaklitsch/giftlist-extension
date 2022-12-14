import { useEffect } from "react";
import { goTo } from "react-chrome-extension-router";
import Header from "../components/Header";
import { GIFT_BOX } from "../constant";
import { useProductContext } from "../contexts/ProductContext";
import ShareFeedback from "./ShareFeedback";

const Success = () => {
  const [context] = useProductContext();

  const handleLeave = () => {
    goTo(ShareFeedback);
  }

  const handleViewList = () => {
    console.log(context.selected_list_id);
    if (context.selected_list_id !== "favourite" && context.selected_list_id) {
      if (context.selected_list_id.indexOf("_list") > -1) {
        window.parent.postMessage({ type: 'open', link: "https://www.giftlist.com/lists/" + context.selected_list_id.split("_")[0] }, "*");
      } else if (context.selected_list_id.indexOf("_santa") > -1) {
        window.parent.postMessage({ type: 'open', link:  "https://www.giftlist.com/gift-exchange/" + context.selected_list_id.split("_")[0] }, "*");
      }
    } else {
      window.parent.postMessage({ type: 'open', link: 'https://www.giftlist.com/lists/favorites' }, "*");
    }
  }

  const handleContinue = () => {
    const isFirst = localStorage.getItem('@is_first') || 0;
    if (isFirst === 3) {
      goTo(ShareFeedback);
    } else {
      window.parent.postMessage({ type: 'close' }, "*");
    }
  }

  useEffect(() => {
    window.parent.postMessage({ type: 'resize-modal', width: '800px', height: '315px' }, "*");
  }, []);

  return (
    <div className="App" id="giftlist_extension_popup_container">
      <div id="giftlist_extension_popup_content">
        <Header />
        <div id="giftlist_extension_popup_main_content">
          <div className="giftlist-extension-success-added-content">
            <div className="giftlist-extension-success-icon-container">
              <img src={GIFT_BOX} className="selected-item-image" />
            </div>
            <h2>Your item has been added to your list!</h2>
            <div>
              <p>Have feedback? <a href="#" id="giftlist_extension_leave_feedback" onClick={handleLeave}>Let us know!</a></p>
            </div>
            <div className="giftlist-extension-buttons-row" style={{ marginTop: 20 }}>
              <button className="extension-btn" id="giftlist_extension_move_to_list" onClick={handleViewList}>View list</button>
              <button className="extension-btn extension-btn-outline" id="giftlist_extension_continue_adding" onClick={handleContinue}>Continue adding items</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Success;