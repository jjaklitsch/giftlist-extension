import { useEffect, useState } from "react";

import { RAISE_HANDS, THUMB_DOWN, THUMB_UP } from "../constant";

import Header from "../components/Header";

const ShareFeedback = () => {
  const [status, setStatus] = useState(0);
  const handleFeedback = () => {
    window.parent.postMessage({ type: 'open', link: 'https://chrome.google.com/webstore/detail/add-to-giftlist-button/cndocbccgacbffaddcafekhkdikmamdi/reviews' }, "*");
  }

  const handleLater = () => {
    window.parent.postMessage({ type: 'close' }, "*");
  }

  const handleThumb = (val) => {
    setStatus(val);
    window.parent.postMessage({ type: 'resize-modal', width: '900px', height: '470px' }, "*");
  }

  const handleBadFeedback = () => {
    window.parent.postMessage({ type: 'close' }, "*");
  }

  useEffect(() => {
    window.parent.postMessage({ type: 'resize-modal', width: '900px', height: '315px' }, "*");
  }, []);

  return (
    <div className="App" id="giftlist_extension_popup_container">
      <div id="giftlist_extension_popup_content">
        <Header />
        <div id="giftlist_extension_popup_main_content">
          <div className="giftlist-extension-share-feedback-content">
            <h2 style={{ fontWeight: 500, fontSize: 30, lineHeight: '36px', marginTop: 32 }}>Share your feedback</h2>
            <p style={{ fontSize: 15, lineHeight: '20px', fontWeight: 400, color: '#818694', marginTop: 16, marginBottom: 0 }}>
              We hope you are enjoying our Add to GiftList button.
            </p>
            <p style={{ fontSize: 15, lineHeight: '20px', fontWeight: 400, color: '#818694', marginTop: 5, marginBottom: 0 }}>
              Please rate your experience by picking an emoji.
            </p>
            <div className="giftlist-extension-buttons-row" style={{ marginTop: 32 }}>
              <div className="giftlist-extension-success-icon-container" id="thumb_up_btn" onClick={() => handleThumb(1)} style={{ opacity: status === 1 ? 1 : 0.5 }}>
                <img src={THUMB_UP} className="selected-item-image" />
              </div>
              <div className="giftlist-extension-success-icon-container" id="thumb_down_btn" onClick={() => handleThumb(2)} style={{ opacity: status === 2 ? 1 : 0.5 }}>
                <img src={THUMB_DOWN} className="selected-item-image" />
              </div>
            </div>
            {status === 1 &&
              <div id="thumbup_content_container">
                <div style={{ display: 'flex', flexDirection: 'row', marginTop: 20, marginBottom: 15, alignItems: 'center' }}>
                  <h3 style={{ fontSize: 20, lineHeight: '24px', color: '#101A34', fontWeight: 500 }}>We love that you love it</h3>
                  <img src={RAISE_HANDS} className="selected-item-image" style={{ width: 32, height: 32 }} />
                </div>
                <p style={{ fontWeight: 400, fontSize: 15, lineHeight: '20px', color: '#818694' }}>
                  Have a moment to rate us?
                </p>
                <div className="giftlist-extension-buttons-row" style={{ marginTop: 24 }}>
                  <button className="extension-btn" id="giftlist_extension_leave_good_feedback" onClick={handleFeedback}>Let's do it!</button>
                  <button className="extension-btn extension-btn-outline" id="giftlist_extension_maybe_later" style={{ color: '#0F7B9B' }} onClick={handleLater}>Maybe later</button>
                </div>
              </div>
            }
            {status === 2 &&
              <div id="thumbdown_content_container" style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 20, lineHeight: '24px', color: '#101A34', fontWeight: 500, }}>Let us know how can we improve</h3>
                <p style={{ marginTop: 10, marginBottom: 5, color: '#818694', fontWeight: 400, }}>Send your feedback to <a href="mailto:support@giftlist.com" style={{ marginLeft: 2 }} target="_blank">support@giftlist.com</a></p>
                <div className="giftlist-extension-buttons-row">
                  <button className="extension-btn" id="giftlist_extension_leave_bad_feedback" onClick={handleBadFeedback}>Done</button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShareFeedback;