let isOpen = false;
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "popup-modal" && !isOpen) {
    isOpen = true;
    chrome.storage.sync.get(
      ["giftlist_access_token", "is_first"],
      async function (result) {
        const isFirst = result.is_first;
        if (result) {
          result = await checkTokenValid();
        }
        showModal(result, isFirst);
      }
    );
  }
});

const BASE_URL = "https://admin.giftlist.com/api";

let product = null;
let selected_image = null;
let selected_list_id = "favourite";
let item_title = "";
let item_price = "";
let is_most_wanted = false;
let item_url = "";
let item_description = "";
let listData = [];
let scrappedURL = "";
let scrappedProduct = null;
let isScraped = false;
let tempListData = null;
let tempData = {
  user_token: null,
  lists: [],
};

chrome.storage.sync.get(["last_selected_list_id"], function (result) {
  if (result.last_selected_list_id) {
    selected_list_id = result.last_selected_list_id;
  }
});

// left: 37, up: 38, right: 39, down: 40,
// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
var keys = { 37: 1, 38: 1, 39: 1, 40: 1 };

function preventDefault(e) {
  e.preventDefault();
}

function preventDefaultForScrollKeys(e) {
  if (keys[e.keyCode]) {
    preventDefault(e);
    return false;
  }
}

// modern Chrome requires { passive: false } when adding event
var supportsPassive = false;
try {
  window.addEventListener(
    "test",
    null,
    Object.defineProperty({}, "passive", {
      get: function () {
        supportsPassive = true;
      },
    })
  );
} catch (e) { }

var wheelOpt = supportsPassive ? { passive: false } : false;
var wheelEvent =
  "onwheel" in document.createElement("div") ? "wheel" : "mousewheel";

// call this to Disable
function disableScroll() {
  // window.addEventListener("DOMMouseScroll", preventDefault, false); // older FF
  // window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
  // window.addEventListener("touchmove", preventDefault, wheelOpt); // mobile

  item_title = "";
  item_price = "";
  item_description = "";
  is_most_wanted = false;
  item_url = "";
}

// call this to Enable
function enableScroll() {
  // window.removeEventListener("DOMMouseScroll", preventDefault, false);
  // window.removeEventListener(wheelEvent, preventDefault, wheelOpt);
  // window.removeEventListener("touchmove", preventDefault, wheelOpt);
  isOpen = false;
}

const getShareFeedbackModal = () => {
  const thumbUpIcon = "https://www.giftlist.com/assets/extension-icons/thumb_up.svg";
  const thumbDownIcon = "https://www.giftlist.com/assets/extension-icons/thumb_down.svg";
  const raiseHandsIcon = "https://www.giftlist.com/assets/extension-icons/raise_hands.svg";
  return `
		<div class="giftlist-extension-share-feedback-content">
			<h2 style="font-weight: 500;font-size: 30px;line-height: 36px; margin-top: 32px;">Share your feedback</h2>
			<p style="font-size: 15px;line-height: 20px;font-weight: 400;color: #818694;margin-top: 16px; margin-bottom: 0px">
				We hope you are enjoying our Add to GiftList button.
			</p>
			<p style="font-size: 15px;line-height: 20px;font-weight: 400;color: #818694;margin-top: 5px; margin-bottom: 0px">
				Please rate your experience by picking an emoji.
			</p>
			<div class="giftlist-extension-buttons-row" style="margin-top: 32px;">
				<div class="giftlist-extension-success-icon-container" id="thumb_up_btn">
					<img src="${thumbUpIcon}" class="selected-item-image" />
				</div>
				<div class="giftlist-extension-success-icon-container" id="thumb_down_btn">
					<img src="${thumbDownIcon}" class="selected-item-image" />
				</div>
			</div>
			<div id="thumbup_content_container">
				<div style="display: flex; flex-direction: row; margin-top: 20px; margin-bottom: 15px;align-items: center;">
					<h3 style="font-size: 20px;line-height: 24px;color: #101A34; font-weight: 500;">We love that you love it</h3>
					<img src="${raiseHandsIcon}" class="selected-item-image" style="width: 32px; height: 32px;" />
				</div>
				<p style="font-weight: 400;font-size: 15px;line-height: 20px;color: #818694;">
					Have a moment to rate us?
				</p>
				<div class="giftlist-extension-buttons-row" style="margin-top: 24px;">
					<button class="extension-btn" id="giftlist_extension_leave_good_feedback">Let's do it!</button>
					<button class="extension-btn extension-btn-outline" id="giftlist_extension_maybe_later" style="color: #0F7B9B;">Maybe later</button>
				</div>
			</div>
			<div id="thumbdown_content_container" style="margin-top: 24px;">
        <h3 style="font-size: 20px;line-height: 24px;color: #101A34; font-weight: 500;">Let us know how can we improve</h3>
        <p style="margin-top: 10px; margin-bottom: 5px;color: #818694;font-weight: 400;">Send your feedback to <a href="mailto:support@giftlist.com" style="margin-left: 2px;" target="_blank">support@giftlist.com</a></p>
				<div class="giftlist-extension-buttons-row">
					<button class="extension-btn" id="giftlist_extension_leave_bad_feedback">Done</button>
				</div>
			</div>
		</div>
	`;
};

const getSuccessAddedModal = () => {
  const giftIcon = "https://www.giftlist.com/assets/extension-icons/gift_box.svg";
  return `
		<div class="giftlist-extension-success-added-content">
			<div class="giftlist-extension-success-icon-container">
				<img src="${giftIcon}" class="selected-item-image" />
			</div>
			<h2>Your item has been added to your list!</h2>
      <div>
        <p>Have feedback? <a href="#" id="giftlist_extension_leave_feedback">Let us know!</a></p>
      </div>
			<div class="giftlist-extension-buttons-row" style="margin-top: 20px;">
				<button class="extension-btn" id="giftlist_extension_move_to_list">View list</button>
				<button class="extension-btn extension-btn-outline" id="giftlist_extension_continue_adding">Continue adding items</button>
			</div>
		</div>
	`;
};

const getShowMoreImageModal = () => {
  return `
		<div class="giftlist-extension-show-more-image-content">
			<div style="display: flex;justify-content: space-between;">
				<h2>Select an image for your gift list</h2>
			</div>
			<hr>
			<div class="giftlist-extension-item-image-container">
				${product &&
      product[0] &&
      product[0].product &&
      product[0].product.images &&
      product[0].product.images.length > 0
      ? product[0].product.images.reduce((acc, item) => {
        return (
          acc +
          `
						<div class="giftlist-extension-item-image">
							<img src='${item}' class="selected-item-image" />
						</div>
					`
        );
      }, "")
      : '<p style="margin-top: 10px; text-align: center; font-weight: bold;">No images</p>'
    }
			</div>
		</div>
	`;
};

const getAddGiftModal = (data) => {
  const cryIcon = "https://www.giftlist.com/assets/extension-icons/cry.svg";
  const noneImage = "https://www.giftlist.com/assets/extension-icons/none-image.png";
  return `
    <div style="position: relative;">
      <h2>Add gift</h2>
      ${!product || (product && product.length > 0 && !product[0].product)
      ? `
      <div style="position: absolute;width: 100%; height: 100%;display:flex;justify-content:center; align-items:center;top: 3px;">
        <div id="giftlist_extension_add_gift_error_message">
          <div id="giftlist_extension_add_gift_error_message_icon">
            <img src="${cryIcon}" style="width: 25px; height: 25px;" />
          </div>
          <div id="giftlist_extension_add_gift_error_title">
            <p>Sorry, we couldn’t fetch item details from this site.</p>
            <p>Please add your item details manually.</p>
          </div>
        </div>
      </div>`
      : ""
    }
    </div>
    <hr>
		<div class="giftlist-extension-add-gift-content">
			<div class="giftlist-extension-image-container">
        ${product && product[0] && product[0].product
      ? `
          <img src="${selected_image ??
      (product[0].product && product[0].product.mainImage
        ? product[0].product.mainImage
        : "")
      }" class="selected-item-image" />
          ${product[0].product &&
        product[0].product.images &&
        product[0].product.images.length > 0
        ? '<button id="giftlist_extension_view_more_images" class="extension-btn extension-btn-link">View more images</button>'
        : ""
      }
        `
      : `
          <img src="${noneImage}" class="selected-item-image" />
          <p style="width: 70%;color: #818694;text-align:center;font-size: 15px;line-height:20px;font-weight:400;">You can add an image manually from the GiftList website.</p>
        `
    }
			</div>
			<div class="giftlist-extension-add-gift-form">
				<div class="extension-form-group">
					<label>Add to List</label>
					<select class="extension-form-control" id="giftlist_extension_list_id">
						<option value="favourite" ${selected_list_id === "favourite" ? "selected" : ""
    }>Favorites</option>
						${(data || []).map(
      (item) =>
        '<option value="' +
        item.id +
        "_" +
        (item.isSanta ? "santa" : "list") +
        '" ' +
        (selected_list_id ===
          item.id + "_" + (item.isSanta ? "santa" : "list")
          ? "selected"
          : "") +
        ">" +
        item.name +
        "</option>"
    )}
					</select>
				</div>
				<div class="extension-form-group">
					<label>Item name</label>
					<input type="text" placeholder="Item Name" value="${item_title ||
    (product && product[0].product ? product[0].product.name.replace(/"/g, "'") : "")
    }" id="giftlist_extension_selected_product_name" />
				</div>
				<div class="extension-form-group" style="display: flex;">
					<input type="checkbox" value="" id="giftlist_extension_most_wanted" ${is_most_wanted ? "checked" : ""
    }/>
					<label style="margin-left: 8px;font-weight: 400;font-size: 15px; line-height: 20px;margin-bottom: -1px;" for="giftlist_extension_most_wanted">Most wanted gift</label>
				</div>
				<div class="extension-form-group">
					<label>Item URL</label>
					<input type="text" placeholder="Item URL" value="${item_url || window.location.href
    }" id="giftlist_extension_selected_product_url" />
				</div>
				<div class="extension-form-group">
					<label>Price<span style="color: #A8ACB3; margin-left: 6px;">(optional)</span></label>
					<input type="text" placeholder="Price" value="${(item_price ? (item_price * 1).toFixed(2) : "") ||
    (product && product[0].product && product[0].product.offers
      ? (product[0].product.offers[0].price * 1).toFixed(2)
      : "")
    }" id="giftlist_extension_selected_product_price" />
				</div>
				<div class="extension-form-group">
					<label>Other details<span style="color: #A8ACB3; margin-left: 6px;">(optional)</span></label>
					<textarea class="extension-form-control" rows="3" placeholder="Other important details: size, color, etc." id="giftlist_extension_selected_product_others">${item_description}</textarea>
				</div>
				<div class="form-actions">
					<button class="extension-btn" id="giftlist_extension_add_btn">
            <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
            Add gift
          </button>
				</div>
			</div>
		</div>
	`;
};

const getLoginModal = () => {
  const eyeIcon = "https://www.giftlist.com/assets/extension-icons/eye.svg";
  const errorIcon = "https://www.giftlist.com/assets/extension-icons/error.svg";
  const login_with_google = chrome.runtime.getURL('/public/images/login_with_google.svg');
  const login_with_facebook = chrome.runtime.getURL('/public/images/login_with_facebook.svg');

  return `
		<div class="giftlist-extension-login-content">
      <div style="display: flex; flex-direction: row; gap: 8px;">
        <div style="display: flex; flex: 1;" id="google_login_btn">
          <img src="${login_with_google}" style="width: 100%;" />
        </div>
        <div style="display: flex; flex: 1;" id="facebook_login_btn">
          <img src="${login_with_facebook}" style="width: 100%;" />
        </div>
      </div>
      <div style="display: flex; flex-direction: row; gap: 8px; margin-top: 20px; margin-bottom: 20px; justify-content: center; align-items: center;">
        <div style="display: flex; flex: 1; height: 1px; background-color: rgba(0, 9, 31, 0.08);">
        </div>
        <span style="font-weight: bold;"> OR </span>
        <div style="display: flex; flex: 1; height: 1px; background-color: rgba(0, 9, 31, 0.08);">
        </div>
      </div>
			<div class="extension-form-group">
				<label>Your email</label>
				<input type="text" placeholder="Enter your email" id="giftlist-extension-login-email" autocomplete="on" />
			</div>
			<div class="extension-form-group" style="position: relative;">
				<label>Password</label>
				<input type="password" placeholder="Enter password" id="giftlist-extension-login-input" style="padding-right: 20px;" autocomplete="on" />
				<div style="position: absolute; right: 12px; bottom: 12px;z-index: 2;" id="show_password_btn">
					<img src="${eyeIcon}" style="width: 18px; height: 18px;" />
				</div>
			</div>
      <div class="extension-error-container" style="position: relative;height: 60px;display: none;">
        <div style="position: absolute;width: 100%; height: 100%;display:flex;justify-content:center; align-items:center;top: 3px;">
          <div id="giftlist_extension_add_gift_error_message" style="width: 100%;">
            <div id="giftlist_extension_add_gift_error_message_icon" style="display: flex;">
              <img src="${errorIcon}" style="width: 25px; height: 25px;" />
            </div>
            <div id="giftlist_extension_add_gift_error_title" style="font-size: 12px; color: background: #FF574D;">
              
            </div>
          </div>
        </div>
      </div>
			<div class="form-actions" style="margin-top: 24px;">
				<button class="extension-btn" id="giftlist_sign_in" disabled>
          <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
          Sign in
        </button>
				<a href="https://www.giftlist.com/forgot-password" target="_blank" style="padding-top: 15px; padding-bottom: 20px;font-weight: 500;font-size: 15px;line-height: 20px;">Forgot password?</a>
				<span style="font-size: 13px;line-height: 16px;">New to GiftList? <a href="https://www.giftlist.com/sign-up" style="font-weight: bold;" target="_blank">Sign up</a></span>
			</div>
		</div>
	`;
};

const initFacebookSdk = () => {
  window.fbAsyncInit = function () {
    FB.init({
      appId: '686337189167901',
      cookie: true,
      xfbml: true,
      version: '{api-version}'
    });

    FB.AppEvents.logPageView();

  };

  (function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) { return; }
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
}

function signinWithGoogle() {
  window.open('https://giftlist-31067.firebaseapp.com/__/auth/handler?apiKey=AIzaSyAXdTT8STbQJeVzcOdR0Yf2C0RGHNt_Xgk&appName=%5BDEFAULT%5D&authType=signInViaPopup&redirectUrl=https%3A%2F%2Fwww.giftlist.com%2Flogin&v=9.12.1&eventId=4836865683&providerId=google.com&scopes=profile', '_blank');
}

function signinWithFacebook() {
  window.open('https://giftlist-31067.firebaseapp.com/__/auth/handler?apiKey=AIzaSyAXdTT8STbQJeVzcOdR0Yf2C0RGHNt_Xgk&appName=%5BDEFAULT%5D&authType=signInViaPopup&redirectUrl=https%3A%2F%2Fwww.giftlist.com%2Flogin&v=9.12.1&eventId=8959624613&providerId=facebook.com', '_blank');
}

function authCallback(err, token) {
  console.log(token);
}

const showModal = async (exist_token, isFirst) => {
  const isLogin = false;
  const shakeHandIcon = "https://www.giftlist.com/assets/extension-icons/shake_hand.svg";
  const closeIcon = "https://www.giftlist.com/assets/extension-icons/close.svg";
  const logo = "https://www.giftlist.com/assets/extension-icons/logo.png";

  const mask = document.createElement("div");
  mask.setAttribute("id", "giftlist_extension_popup_container");
  const modal = document.createElement("div");
  modal.setAttribute("id", "giftlist_extension_popup_modal");
  modal.setAttribute(
    "style",
    `
		min-height:300px;
		min-width: 350px;
		border: none;
		border-radius:20px;
		background-color:white;
		position: fixed; box-shadow: 0px 12px 48px rgba(29, 5, 64, 0.32);
		z-index: 10000002;
    max-height: 100vh;
    overflow-y: hidden;
		`
  );

  modal.innerHTML = `<div id="giftlist_extension_popup_content" style="height:100%">
					<div class="giftlist_extension_popup_header">
						<img src="${logo}" style="height: 18px; width: 100px;" />
					</div>
					<div id="giftlist_extension_popup_main_content" style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
						<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
						<div class="success-checkmark" style="display: none">
							<div class="check-icon">
								<span class="icon-line line-tip"></span>
								<span class="icon-line line-long"></span>
								<div class="icon-circle"></div>
								<div class="icon-fix"></div>
							</div>
						</div>
						<h2>Getting product data...</h2>
					</div>
				</div>
				<div style="position:absolute; top: 18px; right:5px;">
				<div id="giftlist_close_dialog_btn">
					<img src="${closeIcon}" style="width: 18px; height: 18px;" />
				</div>
			</div>`;

  mask.innerHTML = modal.outerHTML;

  document.body.appendChild(mask);

  if (!exist_token) {
    modal.innerHTML = `<div id="giftlist_extension_popup_content" style="height:100%">
					<div class="giftlist_extension_popup_header" style="border: none;">
						<img src="${logo}" style="height: 18px; width: 100px;" />
						<div id="giftlist_extension_authenticated_header">
							<div style="display: flex;margin-right: 20px;">
								<span style="font-size: 15px; line-height: 20px; color: #101A34;margin-right: 5px;">Hey <span id="giftlist_extension_logged_in_username"></span></span>
								<img src="${shakeHandIcon}" class="selected-item-image" style="width: 20px;height:20px"/>
							</div>
							<a href="#" style="font-weight: 500;font-size: 15px;line-height: 18px;color: #50BCD9;" id="giftlist_extension_logout_btn">Logout</a>
						</div>
					</div>
					<div id="giftlist_extension_popup_main_content">
						${getLoginModal()}
					</div>
				</div>
				<div style="position:absolute; top: 18px; right:5px;">
				<div id="giftlist_close_dialog_btn">
					<img src="${closeIcon}" style="width: 18px; height: 18px;" />
				</div>
			</div>`;
  } else {
    modal.innerHTML = `<div id="giftlist_extension_popup_content" style="height:100%">
			<div class="giftlist_extension_popup_header">
				<img src="${logo}" style="height: 18px; width: 100px;" />
				<div id="giftlist_extension_authenticated_header">
					<div style="display: flex;margin-right: 20px;">
						<span style="font-size: 15px; line-height: 20px; color: #101A34;margin-right: 5px;">Hey <span id="giftlist_extension_logged_in_username"></span></span>
						<img src="${shakeHandIcon}" class="selected-item-image" style="width: 20px;height:20px"/>
					</div>
					<a href="#" style="font-weight: 500;font-size: 15px;line-height: 18px;color: #50BCD9;" id="giftlist_extension_logout_btn">Logout</a>
				</div>
			</div>
			<div id="giftlist_extension_popup_main_content">
				<div id="giftlist_extension_popup_loading_container">
					<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
					<div class="success-checkmark" style="display: none">
						<div class="check-icon">
							<span class="icon-line line-tip"></span>
							<span class="icon-line line-long"></span>
							<div class="icon-circle"></div>
							<div class="icon-fix"></div>
						</div>
					</div>
					<h2>Getting product data...</h2>
				</div>
			</div>
		</div>
		<div style="position:absolute; top: 18px; right:5px;">
		<div id="giftlist_close_dialog_btn">
			<img src="${closeIcon}" style="width: 18px; height: 18px;" />
		</div>
	</div>`;
    document.querySelector("#giftlist_extension_popup_container").innerHTML =
      modal.outerHTML;
    if (
      !document.querySelector(
        "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
      )
    ) {
      document.querySelector(
        "#giftlist_extension_popup_container #giftlist_extension_popup_modal"
      ).innerHTML += `<div style="position:absolute; top: 18px; right:5px;">
        <div id="giftlist_close_dialog_btn">
          <img src="${closeIcon}" style="width: 18px; height: 18px;" />
        </div>
      </div>`;
    }
    document.querySelector(
      "#giftlist_extension_popup_loading_container"
    ).style.display = "flex";

    mask.querySelector("#giftlist_close_dialog_btn").addEventListener("click", () => {
      if (document.querySelector("#giftlist_extension_popup_container")) {
        document.querySelector("#giftlist_extension_popup_container").remove();
      }
      enableScroll();
    });

    document
      .querySelector("#giftlist_extension_logout_btn")
      .addEventListener("click", () => {
        chrome.storage.sync.set(
          {
            giftlist_access_token: "",
            giftlist_refresh_token: "",
            giftlist_user: null,
          },
          function () {
            if (document.querySelector("#giftlist_extension_popup_container")) {
              document
                .querySelector("#giftlist_extension_popup_container")
                .remove();
            }
            enableScroll();
          }
        );
      });
    let productData = null;
    try {
      productData = await getProductData();
    } catch (err) {
      productData = {
        data: [
          {
            product: null,
          },
        ],
      };
    }
    product = productData.data;

    listData = await getAllList(exist_token);
    if (isScraped) {
      document.querySelector(
        "#giftlist_extension_popup_loading_container .lds-ellipsis"
      ).style.display = "none";
      document.querySelector(
        "#giftlist_extension_popup_loading_container h2"
      ).style.display = "none";
    } else {
      document.querySelector(
        "#giftlist_extension_popup_loading_container"
      ).style.display = "flex";
    }
    modal.innerHTML = `<div id="giftlist_extension_popup_content" style="height:100%">
					<div class="giftlist_extension_popup_header">
						<img src="${logo}" style="height: 18px; width: 100px;" />
						<div id="giftlist_extension_authenticated_header">
							<div style="display: flex;margin-right: 20px;">
								<span style="font-size: 15px; line-height: 20px; color: #101A34;margin-right: 5px;">Hey <span id="giftlist_extension_logged_in_username"></span></span>
								<img src="${shakeHandIcon}" class="selected-item-image" style="width: 20px;height:20px" />
							</div>
							<a href="#" style="font-weight: 500;font-size: 15px;line-height: 18px;color: #50BCD9;" id="giftlist_extension_logout_btn">Logout</a>
						</div>
					</div>
					<div id="giftlist_extension_popup_main_content">
						<div id="giftlist_extension_popup_loading_container">
							<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
							<div class="success-checkmark" style="display: none">
								<div class="check-icon">
									<span class="icon-line line-tip"></span>
									<span class="icon-line line-long"></span>
									<div class="icon-circle"></div>
									<div class="icon-fix"></div>
								</div>
							</div>
							<h2>Getting product data...</h2>
						</div>
						${getAddGiftModal(listData)}
					</div>
				</div>
				<div style="position:absolute; top: 18px; right:5px;">
          <div id="giftlist_close_dialog_btn">
            <img src="${closeIcon}" style="width: 18px; height: 18px;" />
          </div>
        </div>`;
  }

  document.querySelector("#giftlist_extension_popup_container").innerHTML =
    modal.outerHTML;
  disableScroll();
  if (
    !document.querySelector(
      "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
    )
  ) {
    document.querySelector(
      "#giftlist_extension_popup_container #giftlist_extension_popup_modal"
    ).innerHTML += `<div style="position:absolute; top: 18px; right:5px;">
      <div id="giftlist_close_dialog_btn">
        <img src="${closeIcon}" style="width: 18px; height: 18px;" />
      </div>
    </div>`;
  }

  const handleGoodFeedback = () => {
    window.open(
      "https://chrome.google.com/webstore/detail/add-to-giftlist-button/cndocbccgacbffaddcafekhkdikmamdi/reviews",
      "_blank"
    );
    if (
      !document.querySelector(
        "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
      )
    ) {
      document.querySelector(
        "#giftlist_extension_popup_container #giftlist_extension_popup_modal"
      ).innerHTML += `<div style="position:absolute; top: 18px; right:5px;">
          <div id="giftlist_close_dialog_btn">
            <img src="${closeIcon}" style="width: 18px; height: 18px;" />
          </div>
        </div>`;
    }
  };

  const handleMoveToList = () => {
    if (selected_list_id == "favourite") {
      window.open("https://www.giftlist.com/lists/favorites", "_blank");
    } else {
      if (selected_list_id) {
        if (selected_list_id.indexOf("_list") > -1) {
          window.open(
            "https://www.giftlist.com/lists/" + selected_list_id.split("_")[0],
            "_blank"
          );
        } else if (selected_list_id.indexOf("_santa") > -1) {
          window.open(
            "https://www.giftlist.com/gift-exchange/" +
            selected_list_id.split("_")[0],
            "_blank"
          );
        }
      }
    }
  };

  const clickAddButtonHandler = async () => {
    await checkTokenValid();
    let url = "giftitem/add/favorite";
    mask.querySelector("#giftlist_extension_add_btn .lds-ring").style.display =
      "inline-block";
    const postData = {
      gift_title:
        item_title ||
        document.querySelector("#giftlist_extension_selected_product_name")
          .value,
      image_url: selected_image,
      price:
        item_price ||
        document
          .querySelector("#giftlist_extension_selected_product_price")
          .value.replace(/[^0-9.-]+/g, ""),
      details:
        item_description ||
        document.querySelector("#giftlist_extension_selected_product_others")
          .value,
      isMostWanted: is_most_wanted === true ? true : false,
      product_url:
        item_url ||
        document.querySelector("#giftlist_extension_selected_product_url")
          .value,
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
    mask.querySelector("#giftlist_extension_add_btn").disabled = true;
    const data = await addProductToList(url, postData);
    if (mask.querySelector("#giftlist_extension_add_btn")) {
      mask.querySelector("#giftlist_extension_add_btn").disabled = false;
      mask.querySelector(
        "#giftlist_extension_add_btn .lds-ring"
      ).style.display = "none";
    }
    if (data.status === 200) {
      mask.querySelector("#giftlist_extension_popup_main_content").innerHTML =
        getSuccessAddedModal();
      chrome.storage.sync.get(["is_first"], function (result) {
        chrome.storage.sync.set(
          { is_first: (result.is_first || 0) * 1 + 1 },
          function () { }
        );
      });
      if (
        !document.querySelector(
          "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
        )
      ) {
        document.querySelector(
          "#giftlist_extension_popup_container #giftlist_extension_popup_modal"
        ).innerHTML += `<div style="position:absolute; top: 18px; right:5px;">
          <div id="giftlist_close_dialog_btn">
            <img src="${closeIcon}" style="width: 18px; height: 18px;" />
          </div>
        </div>`;
      }

      initInnerEvents();
      if (mask.querySelector("#giftlist_extension_move_to_list")) {
        mask
          .querySelector("#giftlist_extension_move_to_list")
          .removeEventListener("click", handleMoveToList);
        mask
          .querySelector("#giftlist_extension_move_to_list")
          .addEventListener("click", handleMoveToList);
      }

      if (mask.querySelector("#giftlist_extension_leave_feedback")) {
        mask
          .querySelector("#giftlist_extension_leave_feedback")
          .addEventListener("click", () => {
            mask.querySelector(
              "#giftlist_extension_popup_main_content"
            ).innerHTML = getShareFeedbackModal();
            mask
              .querySelector("#thumb_up_btn")
              .addEventListener("click", () => {
                mask.querySelector("#thumbup_content_container").style.display =
                  "flex";
                mask.querySelector(
                  "#thumbdown_content_container"
                ).style.display = "none";
                mask.querySelector("#thumb_down_btn").style.opacity = 0.5;
                mask.querySelector("#thumb_up_btn").style.opacity = 1;

                if (
                  mask.querySelector("#giftlist_extension_leave_good_feedback")
                ) {
                  mask
                    .querySelector("#giftlist_extension_leave_good_feedback")
                    .addEventListener("click", () => {
                      window.open(
                        "https://chrome.google.com/webstore/detail/add-to-giftlist-button/cndocbccgacbffaddcafekhkdikmamdi/reviews",
                        "_blank"
                      );
                      if (
                        !document.querySelector(
                          "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
                        )
                      ) {
                        document.querySelector(
                          "#giftlist_extension_popup_container #giftlist_extension_popup_modal"
                        ).innerHTML += `<div style="position:absolute; top: 18px; right:5px;">
                      <div id="giftlist_close_dialog_btn">
                        <img src="${closeIcon}" style="width: 18px; height: 18px;" />
                      </div>
                    </div>`;
                      }
                    });
                }

                if (mask.querySelector("#giftlist_extension_maybe_later")) {
                  mask
                    .querySelector("#giftlist_extension_maybe_later")
                    .addEventListener("click", () => {
                      if (
                        document.querySelector(
                          "#giftlist_extension_popup_container"
                        )
                      ) {
                        document
                          .querySelector("#giftlist_extension_popup_container")
                          .remove();
                      }
                      enableScroll();
                    });
                }
              });

            mask
              .querySelector("#thumb_down_btn")
              .addEventListener("click", () => {
                mask.querySelector("#thumbup_content_container").style.display =
                  "none";
                mask.querySelector(
                  "#thumbdown_content_container"
                ).style.display = "flex";
                mask.querySelector("#thumb_down_btn").style.opacity = 1;
                mask.querySelector("#thumb_up_btn").style.opacity = 0.5;

                mask
                  .querySelector("#giftlist_extension_leave_bad_feedback")
                  .addEventListener("click", () => {
                    if (
                      document.querySelector(
                        "#giftlist_extension_popup_container"
                      )
                    ) {
                      document
                        .querySelector("#giftlist_extension_popup_container")
                        .remove();
                    }
                    enableScroll();
                  });
              });
            if (
              !document.querySelector(
                "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
              )
            ) {
              document.querySelector(
                "#giftlist_extension_popup_container #giftlist_extension_popup_modal"
              ).innerHTML += `<div style="position:absolute; top: 18px; right:5px;">
                <div id="giftlist_close_dialog_btn">
                  <img src="${closeIcon}" style="width: 18px; height: 18px;" />
                </div>
              </div>`;
            }
            initInnerEvents();

            mask
              .querySelector("#thumb_up_btn")
              .addEventListener("click", () => {
                mask.querySelector("#thumbup_content_container").style.display =
                  "flex";
                mask.querySelector(
                  "#thumbdown_content_container"
                ).style.display = "none";
                mask.querySelector("#thumb_down_btn").style.opacity = 0.5;
                mask.querySelector("#thumb_up_btn").style.opacity = 1;

                if (
                  mask.querySelector("#giftlist_extension_leave_good_feedback")
                ) {
                  mask
                    .querySelector("#giftlist_extension_leave_good_feedback")
                    .addEventListener("click", () => {
                      window.open(
                        "https://chrome.google.com/webstore/detail/add-to-giftlist-button/cndocbccgacbffaddcafekhkdikmamdi/reviews",
                        "_blank"
                      );
                      if (
                        !document.querySelector(
                          "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
                        )
                      ) {
                        document.querySelector(
                          "#giftlist_extension_popup_container #giftlist_extension_popup_modal"
                        ).innerHTML += `<div style="position:absolute; top: 18px; right:5px;">
                          <div id="giftlist_close_dialog_btn">
                            <img src="${closeIcon}" style="width: 18px; height: 18px;" />
                          </div>
                        </div>`;
                      }
                    });
                }

                if (mask.querySelector("#giftlist_extension_maybe_later")) {
                  mask
                    .querySelector("#giftlist_extension_maybe_later")
                    .addEventListener("click", () => {
                      if (
                        document.querySelector(
                          "#giftlist_extension_popup_container"
                        )
                      ) {
                        document
                          .querySelector("#giftlist_extension_popup_container")
                          .remove();
                      }
                      enableScroll();
                    });
                }
              });

            mask
              .querySelector("#thumb_down_btn")
              .addEventListener("click", () => {
                mask.querySelector("#thumbup_content_container").style.display =
                  "none";
                mask.querySelector(
                  "#thumbdown_content_container"
                ).style.display = "flex";
                mask.querySelector("#thumb_down_btn").style.opacity = 1;
                mask.querySelector("#thumb_up_btn").style.opacity = 0.5;

                mask
                  .querySelector("#giftlist_extension_leave_bad_feedback")
                  .addEventListener("click", () => {
                    if (
                      document.querySelector(
                        "#giftlist_extension_popup_container"
                      )
                    ) {
                      document
                        .querySelector("#giftlist_extension_popup_container")
                        .remove();
                    }
                    enableScroll();
                  });
              });
          });
      }

      if (mask.querySelector("#giftlist_extension_continue_adding")) {
        mask
          .querySelector("#giftlist_extension_continue_adding")
          .addEventListener("click", () => {
            if (isFirst == 3) {
              mask.querySelector(
                "#giftlist_extension_popup_main_content"
              ).innerHTML = getShareFeedbackModal();

              document
                .querySelector("#thumb_up_btn")
                .addEventListener("click", () => {
                  mask.querySelector(
                    "#thumbup_content_container"
                  ).style.display = "flex";
                  mask.querySelector(
                    "#thumbdown_content_container"
                  ).style.display = "none";
                  mask.querySelector("#thumb_down_btn").style.opacity = 0.5;
                  mask.querySelector("#thumb_up_btn").style.opacity = 1;

                  if (
                    document.querySelector(
                      "#giftlist_extension_leave_good_feedback"
                    )
                  ) {
                    document
                      .querySelector("#giftlist_extension_leave_good_feedback")
                      .removeEventListener("click", handleGoodFeedback);
                    document
                      .querySelector("#giftlist_extension_leave_good_feedback")
                      .addEventListener("click", handleGoodFeedback);
                  }

                  if (
                    document.querySelector("#giftlist_extension_maybe_later")
                  ) {
                    document
                      .querySelector("#giftlist_extension_maybe_later")
                      .addEventListener("click", () => {
                        if (
                          document.querySelector(
                            "#giftlist_extension_popup_container"
                          )
                        ) {
                          document
                            .querySelector(
                              "#giftlist_extension_popup_container"
                            )
                            .remove();
                        }
                        enableScroll();
                      });
                  }
                });

              document
                .querySelector("#thumb_down_btn")
                .addEventListener("click", () => {
                  mask.querySelector(
                    "#thumbup_content_container"
                  ).style.display = "none";
                  mask.querySelector(
                    "#thumbdown_content_container"
                  ).style.display = "flex";
                  mask.querySelector("#thumb_down_btn").style.opacity = 1;
                  mask.querySelector("#thumb_up_btn").style.opacity = 0.5;

                  mask
                    .querySelector("#giftlist_extension_leave_bad_feedback")
                    .addEventListener("click", () => {
                      if (
                        document.querySelector(
                          "#giftlist_extension_popup_container"
                        )
                      ) {
                        document
                          .querySelector("#giftlist_extension_popup_container")
                          .remove();
                      }
                      enableScroll();
                    });
                });
            } else {
              if (
                document.querySelector("#giftlist_extension_popup_container")
              ) {
                document
                  .querySelector("#giftlist_extension_popup_container")
                  .remove();
              }
              enableScroll();
            }
          });
        document
          .querySelector(
            "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
          )
          .addEventListener("click", () => {
            chrome.storage.sync.get(["is_first"], function (result) {
              if (result.is_first === 3) {
                mask.querySelector(
                  "#giftlist_extension_popup_main_content"
                ).innerHTML = getShareFeedbackModal();

                document
                  .querySelector("#thumb_up_btn")
                  .addEventListener("click", () => {
                    mask.querySelector(
                      "#thumbup_content_container"
                    ).style.display = "flex";
                    mask.querySelector(
                      "#thumbdown_content_container"
                    ).style.display = "none";
                    mask.querySelector("#thumb_down_btn").style.opacity = 0.5;
                    mask.querySelector("#thumb_up_btn").style.opacity = 1;

                    if (
                      document.querySelector(
                        "#giftlist_extension_leave_good_feedback"
                      )
                    ) {
                      document
                        .querySelector(
                          "#giftlist_extension_leave_good_feedback"
                        )
                        .removeEventListener("click", handleGoodFeedback);
                      document
                        .querySelector(
                          "#giftlist_extension_leave_good_feedback"
                        )
                        .addEventListener("click", handleGoodFeedback);
                    }

                    if (
                      document.querySelector("#giftlist_extension_maybe_later")
                    ) {
                      document
                        .querySelector("#giftlist_extension_maybe_later")
                        .addEventListener("click", () => {
                          if (
                            document.querySelector(
                              "#giftlist_extension_popup_container"
                            )
                          ) {
                            document
                              .querySelector(
                                "#giftlist_extension_popup_container"
                              )
                              .remove();
                          }
                          enableScroll();
                        });
                    }
                  });

                document
                  .querySelector("#thumb_down_btn")
                  .addEventListener("click", () => {
                    mask.querySelector(
                      "#thumbup_content_container"
                    ).style.display = "none";
                    mask.querySelector(
                      "#thumbdown_content_container"
                    ).style.display = "flex";
                    mask.querySelector("#thumb_down_btn").style.opacity = 1;
                    mask.querySelector("#thumb_up_btn").style.opacity = 0.5;

                    mask
                      .querySelector("#giftlist_extension_leave_bad_feedback")
                      .addEventListener("click", () => {
                        if (
                          document.querySelector(
                            "#giftlist_extension_popup_container"
                          )
                        ) {
                          document
                            .querySelector(
                              "#giftlist_extension_popup_container"
                            )
                            .remove();
                        }
                        enableScroll();
                      });
                  });
              } else {
                if (
                  document.querySelector("#giftlist_extension_popup_container")
                ) {
                  document
                    .querySelector("#giftlist_extension_popup_container")
                    .remove();
                }
                enableScroll();
              }
            });
          });
      }
    }
  };
  const handleViewMoreImages = () => {
    mask.querySelector("#giftlist_extension_popup_main_content").innerHTML =
      getShowMoreImageModal();

    if (
      !document.querySelector(
        "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
      )
    ) {
      document.querySelector(
        "#giftlist_extension_popup_container #giftlist_extension_popup_modal"
      ).innerHTML += `<div style="position:absolute; top: 18px; right:5px;">
        <div id="giftlist_close_dialog_btn">
          <img src="${closeIcon}" style="width: 18px; height: 18px;" />
        </div>
      </div>`;
    }
    initInnerEvents();

    mask
      .querySelectorAll(".giftlist-extension-item-image img")
      .forEach((item) => {
        item.addEventListener("click", (evt) => {
          selected_image = evt.target.src;
          mask.querySelector(
            "#giftlist_extension_popup_main_content"
          ).innerHTML = getAddGiftModal(listData);
          if (selected_list_id) {
            document.querySelector("#giftlist_extension_list_id").value = selected_list_id;
          }
          if (
            !document.querySelector(
              "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
            )
          ) {
            document.querySelector(
              "#giftlist_extension_popup_container #giftlist_extension_popup_modal"
            ).innerHTML += `<div style="position:absolute; top: 18px; right:5px;">
              <div id="giftlist_close_dialog_btn">
                <img src="${closeIcon}" style="width: 18px; height: 18px;" />
              </div>
            </div>`;
          }
          initInnerEvents();
        });
      });
  };
  const initInnerEvents = () => {
    if (mask.querySelector("#giftlist_extension_add_btn")) {
      mask
        .querySelector("#giftlist_extension_add_btn")
        .removeEventListener("click", clickAddButtonHandler);
      mask
        .querySelector("#giftlist_extension_add_btn")
        .addEventListener("click", clickAddButtonHandler);
    }
    if (mask.querySelector("#giftlist_extension_view_more_images")) {
      mask
        .querySelector("#giftlist_extension_view_more_images")
        .removeEventListener("click", handleViewMoreImages);
      mask
        .querySelector("#giftlist_extension_view_more_images")
        .addEventListener("click", handleViewMoreImages);
    }
    if (mask.querySelector("#giftlist_extension_list_id")) {
      mask
        .querySelector("#giftlist_extension_list_id")
        .addEventListener("change", (evt) => {
          selected_list_id = evt.target.value;
          chrome.storage.sync.set(
            { last_selected_list_id: selected_list_id },
            function () { }
          );
        });
    }
    if (document.querySelector("#giftlist_extension_logout_btn")) {
      document
        .querySelector("#giftlist_extension_logout_btn")
        .addEventListener("click", () => {
          chrome.storage.sync.set(
            {
              giftlist_access_token: "",
              giftlist_refresh_token: "",
              giftlist_user: null,
            },
            function () {
              if (
                document.querySelector("#giftlist_extension_popup_container")
              ) {
                document
                  .querySelector("#giftlist_extension_popup_container")
                  .remove();
              }
              enableScroll();
            }
          );
        });
    }
    document
      .querySelector(
        "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
      )
      .addEventListener("click", () => {
        if (document.querySelector("#giftlist_extension_popup_container")) {
          document
            .querySelector("#giftlist_extension_popup_container")
            .remove();
        }
        enableScroll();
      });
    if (document.querySelector("#giftlist_extension_selected_product_name")) {
      document
        .querySelector("#giftlist_extension_selected_product_name")
        .addEventListener("input", function (evt) {
          item_title = evt.target.value;
        });
    }
    if (document.querySelector("#giftlist_extension_selected_product_url")) {
      document
        .querySelector("#giftlist_extension_selected_product_url")
        .addEventListener("input", function (evt) {
          item_url = evt.target.value;
        });
    }
    if (document.querySelector("#giftlist_extension_selected_product_price")) {
      document
        .querySelector("#giftlist_extension_selected_product_price")
        .addEventListener("input", function (evt) {
          item_price = evt.target.value;
        });
    }
    if (document.querySelector("#giftlist_extension_selected_product_others")) {
      document
        .querySelector("#giftlist_extension_selected_product_others")
        .addEventListener("input", function (evt) {
          item_description = evt.target.value;
        });
    }
    if (document.querySelector("#giftlist_extension_most_wanted")) {
      document
        .querySelector("#giftlist_extension_most_wanted")
        .addEventListener("change", function (evt) {
          is_most_wanted = evt.currentTarget.checked ? true : false;
        });
    }
    if (document.querySelector("#giftlist_extension_support")) {
      document
        .querySelector("#giftlist_extension_support")
        .addEventListener("click", function (evt) {
          window.open("", "_blank");
        });
    }
  };
  if (
    !document.querySelector(
      "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
    )
  ) {
    document.querySelector(
      "#giftlist_extension_popup_container #giftlist_extension_popup_modal"
    ).innerHTML += `<div style="position:absolute; top: 18px; right:5px;">
      <div id="giftlist_close_dialog_btn">
        <img src="${closeIcon}" style="width: 18px; height: 18px;" />
      </div>
    </div>`;
  }
  /** Event list */
  document
    .querySelector(
      "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
    )
    .addEventListener("click", () => {
      if (document.querySelector("#giftlist_extension_popup_container")) {
        document.querySelector("#giftlist_extension_popup_container").remove();
      }
      enableScroll();
    });

  initInnerEvents();

  if (mask.querySelector("#show_password_btn")) {
    mask.querySelector("#show_password_btn").addEventListener("click", () => {
      const currentType = mask.querySelector("#giftlist-extension-login-input")
        .attributes[0].value;
      mask.querySelector(
        "#giftlist-extension-login-input"
      ).attributes[0].value = currentType == "text" ? "password" : "text";
    });
  }
  if (mask.querySelector("#giftlist_sign_in")) {
    mask
      .querySelector("#giftlist_sign_in")
      .addEventListener("click", async () => {
        mask.querySelector("#giftlist_sign_in").disabled = true;
        mask.querySelector("#giftlist_sign_in .lds-ring").style.display =
          "inline-block";
        const result = await fetch(BASE_URL + "/user/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: document.querySelector("#giftlist-extension-login-email")
              .value,
            password: document.querySelector("#giftlist-extension-login-input")
              .value,
          }),
        }).then((res) => res.json());
        mask.querySelector("#giftlist_sign_in").disabled = false;
        mask.querySelector("#giftlist_sign_in .lds-ring").style.display =
          "none";
        if (result.status === 200) {
          mask.querySelector(
            "#giftlist_extension_popup_main_content"
          ).innerHTML = `
            <div id="giftlist_extension_popup_loading_container">
              <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
              <div class="success-checkmark" style="display: none">
                <div class="check-icon">
                  <span class="icon-line line-tip"></span>
                  <span class="icon-line line-long"></span>
                  <div class="icon-circle"></div>
                  <div class="icon-fix"></div>
                </div>
              </div>
              <h2>Getting product data...</h2>
            </div>
          `;
          document.querySelector(
            "#giftlist_extension_popup_loading_container"
          ).style.display = "flex";

          listData = await getAllList(result.token);
          chrome.storage.sync.set(
            {
              giftlist_access_token: result.token,
              giftlist_refresh_token: result.refresh_token,
              giftlist_user: result.data,
            },
            async function () {
              mask.querySelector(
                "#giftlist_extension_authenticated_header"
              ).style.display = "flex";
              mask.querySelector(
                "#giftlist_extension_authenticated_header #giftlist_extension_logged_in_username"
              ).innerHTML =
                result.data.first_name + " " + result.data.last_name;

              let productData = null;
              try {
                productData = await getProductData();
              } catch (err) {
                productData = {
                  data: [
                    {
                      product: null,
                    },
                  ],
                };
              }

              // if (!productData || productData.status !== 200) {
              //   return;
              // }
              product = productData.data;
              document.querySelector(
                "#giftlist_extension_popup_loading_container .lds-ellipsis"
              ).style.display = "none";
              document.querySelector(
                "#giftlist_extension_popup_loading_container h2"
              ).style.display = "none";

              item_title =
                product && product[0].product ? product[0].product.name : "";
              selected_image =
                product && product[0].product
                  ? product[0].product.mainImage
                  : null;
              item_price =
                product && product[0].product
                  ? product[0].product.offers[0].price
                  : "";
              item_url = window.location.href;

              mask.querySelector(
                "#giftlist_extension_popup_main_content"
              ).innerHTML = getAddGiftModal(listData);

              if (
                !document.querySelector(
                  "#giftlist_extension_popup_container #giftlist_extension_popup_modal #giftlist_close_dialog_btn"
                )
              ) {
                document.querySelector(
                  "#giftlist_extension_popup_container #giftlist_extension_popup_modal"
                ).innerHTML += `<div style="position:absolute; top: 18px; right:5px;">
                  <div id="giftlist_close_dialog_btn">
                    <img src="${closeIcon}" style="width: 18px; height: 18px;" />
                  </div>
                </div>`;
              }

              initInnerEvents();
            }
          );
          initInnerEvents();
        } else {
          if (result.message) {
            mask.querySelector('.extension-error-container #giftlist_extension_add_gift_error_title').innerText = result.message;
            mask.querySelector('.extension-error-container').style.display = "block";
          }
        }
      });
  }

  if (mask.querySelector('#google_login_btn')) {
    mask
      .querySelector("#google_login_btn")
      .addEventListener("click", async () => {
        const google_result = await signinWithGoogle();
      });
  }
  if (mask.querySelector('#facebook_login_btn')) {
    mask
      .querySelector("#facebook_login_btn")
      .addEventListener("click", async () => {
        const facebook_result = await signinWithFacebook();
      });
  }
  if (mask.querySelector("#giftlist-extension-login-email")) {
    mask
      .querySelector("#giftlist-extension-login-email")
      .addEventListener("keyup", function (evt) {
        if (evt.keyCode === 13) {
          if (
            mask.querySelector("#giftlist-extension-login-input") &&
            mask.querySelector("#giftlist-extension-login-input").value
          ) {
            document.querySelector("#giftlist_sign_in").click();
          } else {
            mask.querySelector("#giftlist-extension-login-input").focus();
          }
        } else {
          if (
            evt.target.value &&
            mask.querySelector("#giftlist-extension-login-input").value
          ) {
            mask.querySelector("#giftlist_sign_in").disabled = false;
          } else {
            mask.querySelector("#giftlist_sign_in").disabled = true;
          }
        }
      });
    mask
      .querySelector("#giftlist-extension-login-email")
      .addEventListener("input", function (evt) {
        mask.querySelector('.extension-error-container').style.display = "none";
        if (
          evt.target.value &&
          mask.querySelector("#giftlist-extension-login-input").value
        ) {
          mask.querySelector("#giftlist_sign_in").disabled = false;
        } else {
          mask.querySelector("#giftlist_sign_in").disabled = true;
        }
      });
  }

  if (mask.querySelector("#giftlist-extension-login-input")) {
    mask
      .querySelector("#giftlist-extension-login-input")
      .addEventListener("keyup", function (evt) {
        if (evt.keyCode === 13) {
          document.querySelector("#giftlist_sign_in").click();
        } else {
          if (
            evt.target.value &&
            mask.querySelector("#giftlist-extension-login-email").value
          ) {
            mask.querySelector("#giftlist_sign_in").disabled = false;
          } else {
            mask.querySelector("#giftlist_sign_in").disabled = true;
          }
        }
      });
    mask
      .querySelector("#giftlist-extension-login-input")
      .addEventListener("input", function (evt) {
        mask.querySelector('.extension-error-container').style.display = "none";
        if (
          evt.target.value &&
          mask.querySelector("#giftlist-extension-login-email").value
        ) {
          mask.querySelector("#giftlist_sign_in").disabled = false;
        } else {
          mask.querySelector("#giftlist_sign_in").disabled = true;
        }
      });
  }

  chrome.storage.sync.get(["giftlist_user"], async function (result) {
    if (
      mask.querySelector(
        "#giftlist_extension_authenticated_header #giftlist_extension_logged_in_username"
      ) &&
      result.giftlist_user
    ) {
      mask.querySelector(
        "#giftlist_extension_authenticated_header #giftlist_extension_logged_in_username"
      ).innerHTML =
        result.giftlist_user.first_name + " " + result.giftlist_user.last_name;
      mask.querySelector(
        "#giftlist_extension_authenticated_header"
      ).style.display = "flex";
      initInnerEvents();
    }
  });

  const tags = document.querySelectorAll('#giftlist_extension_popup_container img');
  tags.forEach(t => {
    t.addEventListener('mouseover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
    t.addEventListener('mouseenter', function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
  });
};

function refreshToken() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["giftlist_refresh_token"], function (result) {
      fetch(BASE_URL + "/user/refresh/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: result.giftlist_refresh_token,
        }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.status === 200) {
            chrome.storage.sync.set(
              { giftlist_access_token: res.token },
              function (result) { }
            );
            resolve(res.token);
          } else {
            chrome.storage.sync.set(
              {
                giftlist_refresh_token: "",
                giftlist_access_token: "",
                giftlist_user: null,
              },
              function (result) { }
            );
            resolve("");
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  });
}

function checkTokenValid() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["giftlist_access_token"], function (result) {
      fetch(BASE_URL + "/token/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": result.giftlist_access_token,
        },
        body: JSON.stringify({
          refresh_token: result.giftlist_access_token,
        }),
      })
        .then((res) => res.json())
        .then(async (res) => {
          if (res.status !== 200) {
            const token = await refreshToken();
            resolve(token);
          } else {
            resolve(result.giftlist_access_token);
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  });
}

async function getAllList(token) {
  if (tempData.user_token === token && tempListData && tempListData.length > 0) {
    return tempListData;
  }
  const mainListData = await fetch(BASE_URL + "/giftlist/my/list/all", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": token,
    },
  })
    .then((res) => res.json())
    .then((res) => res.data);
  const santaListData = await fetch(BASE_URL + "/secret_santa/all/list", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": token,
    },
  })
    .then((res) => res.json())
    .then((res) => res.data);

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
  tempData = {
    user_token: token,
    lists,
  };
  tempListData = lists;
  return lists;
}

const callback = () => {
  chrome.storage.sync.get(["giftlist_access_token"], async function (result) {
    if (result) {
      result = await checkTokenValid();
    }
    showModal(result);
  });
};

async function getProductData() {
  return new Promise(async (resolve, reject) => {
    window.scrollTo(0, 0);
    const { images, mainImage } = getProductImages();
    if (mainImage) {
      images.unshift(mainImage);
      selected_image = mainImage;
    } else {
      if (images && images.length > 0) {
        selected_image = images[0];
      }
    }
    const productPrice = getProductPrice();

    let productData = {
      status: 200,
      data: [{
        product: {
          name: getProductTitle(),
          description: getProductDescription(),
          mainImage: mainImage ? mainImage : (images && images.length > 0 ? images[0] : null),
          images: images,
          url: window.location.href,
          offers: [{
            price: productPrice.replace(/[^\d\.]*/g, '') * 1,
            currency: productPrice.replace(/[\d\., ]/g, ''),
          }],
        }
      }]
    }

    // if (!productPrice) {
    //   const postData = {
    //     product_url: window.location.href,
    //   };
    //   productData = await fetch(
    //     "https://admin.giftlist.com/api/scrape/url",
    //     {
    //       method: "POST",
    //       headers: {
    //         "Content-Type": "application/json",
    //       },
    //       mode: "cors",
    //       body: JSON.stringify(postData),
    //     }
    //   )
    //   .then((res) => res.json())
    //   .catch((error) => {
    //     scrappedProduct = null;
    //     scrappedURL = "";
    //     resolve(error);
    //   });
    // }

    isScraped = true;
    if (productData && productData.status === 200) {
      scrappedProduct = productData;
      scrappedURL = window.location.href;
    }

    resolve(productData);
  });
}

function addProductToList(url, postData) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["giftlist_access_token"], function (result) {
      fetch(BASE_URL + "/" + url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": result.giftlist_access_token,
        },
        body: JSON.stringify(postData),
      })
        .then((res) => res.json())
        .then(async (res) => {
          if (res.status == 200) {
            resolve(res);
          } else {
            reject(res);
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  });
}

function getProductPrice() {
  let defaultFontSize = 13;
  let defaultHeight = 90;
  let checkFontSize = true;
  let limitHeight = 1300;

  if (window.location.href.indexOf('shoppersdrugmart.') > -1) {
    document.querySelector('h2[aria-label="Price Details"] span').remove();
  }
  elements = [...document.querySelectorAll(" body *")];
  if (window.location.href.indexOf('www.amazon') > -1) {
    elements = [...document.querySelector("#centerCol").querySelectorAll('*')];
  }
  if (window.location.href.indexOf('bedbathandbeyond.com') > -1 || window.location.href.indexOf('buybuybaby.com') > -1) {
    elements = [...document.querySelector("#wmHostPdp").shadowRoot.querySelectorAll('*')];
  }
  if (window.location.href.indexOf('homedepot.com') > -1) {
    elements = [...document.querySelector("div[name='zone-a']").querySelectorAll('*')];
  }
  if (window.location.href.indexOf('goat.com') > -1) {
    elements = [...document.querySelector('div[data-qa="buy_bar_desktop"] .swiper-slide-active').querySelectorAll('*')];
  }
  if (window.location.href.indexOf('somethingnavy.com') > -1) {
    elements = [...document.querySelector(".price").querySelectorAll('*')];
  }
  if (window.location.href.indexOf('lulus.com') > -1) {
    elements = [...document.querySelector(".c-prod-price").querySelectorAll('*')];
  }
  if (window.location.href.indexOf('etsy.com') > -1) {
    elements = [...document.querySelectorAll('div[class="wt-grid__item-xs-12"]')[0].querySelectorAll('*')];
    checkFontSize = false;
  }
  if (window.location.href.indexOf('rh.com') > -1) {
    defaultFontSize = 11;
  }
  if (window.location.href.indexOf('michaelkors.') > -1) {
    defaultFontSize = 12;
  }
  if (window.location.href.indexOf('ssense.com') > -1) {
    defaultFontSize = 11;
  }
  if (window.location.href.indexOf('zitsticka.com') > -1) {
    defaultHeight = 0;
    defaultFontSize = 12;
  }
  if (window.location.href.indexOf('patagonia.com') > -1) {
    limitHeight = 1800;
  }
  function createRecordFromElement(element) {
    const elementStyle = getComputedStyle(element);
    const text = element.textContent;
    if (!text) {
      return false;
    }
    var record = {};
    const bBox = element.getBoundingClientRect();
    if (checkFontSize && text.length <= 30 && !(bBox.x == 0 && bBox.y == 0)) {
      record["fontSize"] = parseInt(getComputedStyle(element)["fontSize"]);
    } else {
      record["fontSize"] = 16;
    }
    record["y"] = bBox.y;
    record["x"] = bBox.x;
    record["text"] = text.trim().replace(/\n        /g, '');
    if (record["text"].indexOf('Sale Price:') > -1 && record["text"].length > 11) {
      record["text"] = record["text"].replace('Sale Price:', '');
    }
    if (record["text"].indexOf('Sale :') > -1) {
      record["text"] = record["text"].replace('Sale :', '');
    }
    if (record["text"].indexOf('Standard Price:') > -1) {
      record["text"] = record["text"].replace('Standard Price:', '');
    }
    if (record["text"].indexOf('Price') > -1) {
      record["text"] = record["text"].replace('Price', '');
    }
    if (record["text"].indexOf('Limited Time Offer') > -1) {
      record["text"] = record["text"].replace('Limited Time Offer', '');
    }
    if (record["text"].indexOf('USD ') > -1) {
      record["text"] = record["text"].replace('USD ', '');
    }
    if (record["text"].indexOf('CAD ') > -1) {
      if (record["text"].indexOf('$') > -1) {
        record["text"] = record["text"].replace('CAD ', '');
      } else {
        record["text"] = record["text"].replace('CAD ', '$');
      }
    }
    if (record["text"].indexOf('Now') > -1) {
      record["text"] = record["text"].replace('Now ', '');
    }
    if (record["text"].indexOf('Save') > -1) {
      record["text"] = record["text"].replace('Save ', '');
    }
    if (record["text"].indexOf('CA$') > -1) {
      record["text"] = record["text"].replace('CA', '');
    }
    if (record["text"].indexOf('CAD$') > -1) {
      record["text"] = record["text"].replace('CAD$', '$');
    }
    if (record["text"].indexOf('AU$') > -1) {
      record["text"] = record["text"].replace('AU$', '$');
    }
    if (record["text"].indexOf('MRP : ') > -1) {
      record["text"] = record["text"].replace('MRP : ', '');
    }
    if (record["text"].includes('Sale \n\n') && record["text"].length > 10) {
      record["text"] = record["text"].replace('Sale \n\n', '');
    }
    if (record["text"].indexOf('off - ') > -1) {
      record["text"] = record["text"].split('off - ')[1];
    }
    if (record["text"].indexOf('-') > -1) {
      record["text"] = record["text"].split('-')[0].trim();
    }
    if (record["text"].indexOf('Add to your cart — ') > -1) {
      record["text"] = record["text"].replace('Add to your cart — ', '');
    }
    if (record["text"].indexOf('FREE delivery') > -1) {
      record["text"] = record["text"].replace('FREE delivery', '');
    }
    if (window.location.href.indexOf('harborfreight.com') > -1 || window.location.href.indexOf('academy.com') > -1 || window.location.href.indexOf('charmit.com') > -1) {
      var len = record["text"].length;
      var x = record["text"].substring(0, len - 2) + "." + record["text"].substring(len - 2);
      record["text"] = x;
    }
    if (window.location.href.indexOf('mercadolibre.com') > -1 && record["text"].indexOf('pesos') > -1) {
      record["text"] = record["text"].split('pesos')[1];
    }
    record["text"] = record["text"].replace("Now        ", '');
    record["text"] = record["text"].split("\n\n")[0];
    record["text"] = record["text"].replace(/\n        /g, '');
    record["text"] = record["text"].replace("Discounted price", '');
    record["text"] = record["text"].replace("Sale ", '');
    record["text"] = record["text"].replace("price", '');
    record["text"] = record["text"].replace("+", '');
    record["text"] = record["text"].replace("1 x ", '');
    record["text"] = record["text"].replace("now:", '');
    if (record["text"].indexOf('$ ') > -1) {
      record["text"] = record["text"].replace(/\s/g, '');
    }
    let scRe = /[\$\xA2-\xA5\u058F\u060B\u09F2\u09F3\u09FB\u0AF1\u0BF9\u0E3F\u17DB\u20A0-\u20BD\uA838\uFDFC\uFE69\uFF04\uFFE0\uFFE1\uFFE5\uFFE6RpCAD]/;
    if (scRe.test(record["text"]) && record["text"].indexOf(" ") > -1 && window.location.href.indexOf('loopearplugs.com') > -1) {
      record["text"] = record["text"].split(" ")[0];
    }
    if (scRe.test(record["text"]) && record["text"].indexOf('USD') > -1) {
      record["text"] = record["text"].replace('USD', '');
    }
    if (record["text"].indexOf(' CAD') > -1) {
      record["text"] = record["text"].replace(' CAD', '');
    }
    if (record["text"].indexOf(',') > -1) {
      const textArys = record["text"].split(',');
      if (textArys.length >= 2 && (parseInt(textArys[textArys.length - 1]) + "").length == 2) {
        record["text"] = record["text"].replace(/,([^,]*)$/, ".$1");
      }
    }
    record["text"] = record["text"].replace(/ *\([^)]*\) */g, "");
    if (elementStyle.textDecorationLine != 'none') {
      record['textDecoration'] = true;
    } else {
      record['textDecoration'] = false;
    }
    return record;
  }
  let records = elements.map(createRecordFromElement).filter(r => r !== false);
  function canBePrice(record) {
    if (!record) {
      return false;
    }
    if (!record['text']) {
      return false;
    }
    if (record["text"].indexOf('Sale :') > -1 && record["text"].length > 6) {
      record["text"] = record["text"].replace('Sale :', '');
    }
    if (record["text"].indexOf(' Standard Price') > -1 && record["text"].length > 15) {
      record["text"] = record["text"].replace(' Standard Price', '');
    }
    if (record["text"].indexOf('Standard ') > -1 && record["text"].length > 9) {
      record["text"] = record["text"].replace('Standard ', '');
    }
    if (record["text"].indexOf('Chewy') > -1 && record["text"].length > 5) {
      record["text"] = record["text"].replace('Chewy', '');
    }
    if (record["text"].indexOf('current price: ') > -1 && record["text"].length > 15) {
      record["text"] = record["text"].replace('current price: ', '');
    }
    if (record["text"].indexOf(' USD') > -1 && record["text"].length > 4) {
      if (record["text"].indexOf('$') > -1) {
        record["text"] = record["text"].replace(' USD', '');
      } else {
        record["text"] = '$' + record["text"].replace(' USD', '');
      }
    }
    if (record["text"].indexOf(' CAD') > -1 && record["text"].length > 4) {
      if (record["text"].indexOf('$') > -1) {
        record["text"] = record["text"].replace(' CAD', '');
      } else {
        record["text"] = '$' + record["text"].replace(' CAD', '');
      }
    }
    if (record["text"].indexOf('Sale \n\n') > -1) {
      record["text"] = record["text"].replace('Sale \n\n', '');
    }
    if (record["text"].indexOf('-') > -1 && record["text"].indexOf('$') > -1) {
      record["text"] = record["text"].split('-')[1].trim();
    }
    if (record["text"].indexOf('Now') > -1) {
      record["text"] = record["text"].replace('Now', '');
    }
    record["text"] = record['text'].trim();

    if (
      record["y"] > limitHeight ||
      record["fontSize"] == undefined ||
      !record["text"].match(
        /(^(US ){0,1}(rs\.|Rs\.|RS\.|\$|€|£|₹|INR|RP|Rp|USD|US\$|CAD|C\$){0,1}(\s){0,1}[\d,]+(\.\d+){0,1}(\s){0,1}(AED){0,1}(€){0,1}(£){0,1}(Rp){0,1}$)/
      ) ||
      record["textDecoration"]
    ) {
      return false;
    } else {
      let scRe = /[\$\xA2-\xA5\u058F\u060B\u09F2\u09F3\u09FB\u0AF1\u0BF9\u0E3F\u17DB\u20A0-\u20BD\uA838\uFDFC\uFE69\uFF04\uFFE0\uFFE1\uFFE5\uFFE6RpCAD]/;
      if (record["y"] > defaultHeight && record['fontSize'] >= defaultFontSize && (scRe.test(record['text']))) return true;
    }
  }
  let possiblePriceRecords = records.filter(canBePrice);
  let priceRecordsSortedByFontSize = possiblePriceRecords.sort(function (a, b) {
    if (a["fontSize"] == b["fontSize"]) return a["y"] > b["y"];
    return a["fontSize"] < b["fontSize"];
  });
  if (window.location.href.indexOf('homedepot.com') > -1) {
    return '$' + (parseFloat(priceRecordsSortedByFontSize[3]['text'].match(/-?(?:\d+(?:\.\d*)?|\.\d+)/)[0]) - parseFloat(priceRecordsSortedByFontSize[4]['text'].match(/-?(?:\d+(?:\.\d*)?|\.\d+)/)[0]));
  }
  if (window.location.href.indexOf('zitsticka.com') > -1 && priceRecordsSortedByFontSize.length > 1) {
    return '$' + (parseFloat(priceRecordsSortedByFontSize[1]['text'].match(/-?(?:\d+(?:\.\d*)?|\.\d+)/)[0]) - parseFloat(priceRecordsSortedByFontSize[0]['text'].match(/-?(?:\d+(?:\.\d*)?|\.\d+)/)[0]));
  }
  if (window.location.href.indexOf('victoriassecret.com') > -1 || window.location.href.indexOf('jcrew.com') > -1 || window.location.href.indexOf('charlottetilbury.com') > -1) {
    return priceRecordsSortedByFontSize && priceRecordsSortedByFontSize[1] ? priceRecordsSortedByFontSize[1]['text'] : (priceRecordsSortedByFontSize && priceRecordsSortedByFontSize[0] ? priceRecordsSortedByFontSize[0]['text'] : '');
  }
  if (window.location.href.indexOf('sears.com') > -1 || window.location.href.indexOf('landsend.com') > -1 || window.location.href.indexOf('tommybahama.com') > -1) {
    return priceRecordsSortedByFontSize && priceRecordsSortedByFontSize[3] ? priceRecordsSortedByFontSize[3]['text'] : (priceRecordsSortedByFontSize && priceRecordsSortedByFontSize[0] ? priceRecordsSortedByFontSize[0]['text'] : '');
  }
  if ((window.location.href.indexOf('unitedbyblue.com') > -1 || window.location.href.indexOf('zitsticka.com') > -1) && priceRecordsSortedByFontSize.length > 1) {
    return priceRecordsSortedByFontSize && priceRecordsSortedByFontSize[1] ? priceRecordsSortedByFontSize[1]['text'] : (priceRecordsSortedByFontSize && priceRecordsSortedByFontSize[0] ? priceRecordsSortedByFontSize[0]['text'] : '');
  }
  if (window.location.href.indexOf('aesop.com') > -1 || window.location.href.indexOf('bedbathandbeyond.com') > -1 || window.location.href.indexOf('prettylittlething.com') > -1 || window.location.href.indexOf('miumiu.com') > -1 || window.location.href.indexOf('princesspolly.com') > -1 || window.location.href.indexOf('heydudeshoesusa.com') > -1 || window.location.href.indexOf('stelladot.com') > -1 || window.location.href.indexOf('loft.com') > -1 || window.location.href.indexOf('michaelkors.com') > -1 || window.location.href.indexOf('coachoutlet.com') > -1 || window.location.href.indexOf('jwpei.com') > -1 || window.location.href.indexOf('underarmour.com') > -1 || window.location.href.indexOf('homebase.co') > -1 || window.location.href.indexOf('toofaced.com') > -1 || window.location.href.indexOf('dainese.com') > -1 || window.location.href.indexOf('kitchenaid.com') > -1 || window.location.href.indexOf('losangelesapparel.') > -1 || window.location.href.indexOf('cricut.com') > -1 || window.location.href.indexOf('lodgecastiron.com') > -1 || window.location.href.indexOf('aestheticroomcore.com') > -1 || window.location.href.indexOf('ecoroots.') > -1 || window.location.href.indexOf('cottonon.com') > -1 || window.location.href.indexOf('levi.com') > -1 || window.location.href.indexOf('mastermindtoys.com') > -1) {
    return priceRecordsSortedByFontSize && priceRecordsSortedByFontSize[priceRecordsSortedByFontSize.length - 1] ? priceRecordsSortedByFontSize[priceRecordsSortedByFontSize.length - 1]['text'] : '';
  }
  if ((window.location.href.indexOf('harrypottershop.com') > -1 || window.location.href.indexOf('microcenter.com') > -1 || window.location.href.indexOf('hosannarevival.com') > -1 || window.location.href.indexOf('homesalive.') > -1) && priceRecordsSortedByFontSize.length > 1) {
    return priceRecordsSortedByFontSize && priceRecordsSortedByFontSize[1] ? priceRecordsSortedByFontSize[1]['text'] : (priceRecordsSortedByFontSize && priceRecordsSortedByFontSize[0] ? priceRecordsSortedByFontSize[0]['text'] : '');
  }
  return priceRecordsSortedByFontSize && priceRecordsSortedByFontSize[0] ? priceRecordsSortedByFontSize[0]['text'] : '';
}

function getProductTitle() {
  if (window.location.href.indexOf('coachoutlet.com') > -1) {
    return document.getElementsByTagName('title')[0].innerText.trim().split('|')[1];
  }
  return document.getElementsByTagName('title')[0].innerText.trim().replace(/\t/g, '').replace(/\s\s/g, '').split('–')[0].split(' - ')[0].replace('/"/g', '\\"').split('|')[0];
}

function getProductDescription() {
  const metas = document.getElementsByTagName('meta');
  let description = "";

  for (let i = 0; i < metas.length; i++) {
    if (metas[i].name === 'description') {
      description = metas[i].content;
      break;
    }
  }
  return description;
}

function getProductImages() {
  let images = document.getElementsByTagName('img');
  let limitHeight = 100;
  let limitWidth = 100;
  let removeQuery = false;
  let httpOnly = false;
  let useSrcset = false;
  let mainImageIndex = 0;
  let defaultMainIndex = -1;
  if (window.location.href.indexOf('chewy.com') > -1 || window.location.href.indexOf('cvs.com') > -1) {
    images = document.querySelectorAll("main img");
  }
  if (window.location.href.indexOf('costco.com') > -1) {
    images = document.querySelectorAll("#product-page img");
  }
  if (window.location.href.indexOf('samsclub.com') > -1) {
    images = document.querySelectorAll(".sc-pc-large-desktop-layout-columns img");
  }
  if (window.location.href.indexOf('suitsupply.com') > -1) {
    images = document.querySelectorAll(".pdp-images img");
  }
  if (window.location.href.indexOf('lulus.com') > -1) {
    images = document.querySelectorAll(".c-prod img");
  }
  if (window.location.href.indexOf('dainese.com') > -1) {
    images = document.querySelectorAll(".tabs_content-wrapper img");
  }
  if (window.location.href.indexOf('12thtribe.com') > -1) {
    images = document.querySelectorAll(".product__main-photos img");
  }
  if (window.location.href.indexOf('tommybahama.com') > -1) {
    images = document.querySelectorAll("#product-details img");
    mainImageIndex = 1;
  }
  if (window.location.href.indexOf('josephjoseph.com') > -1) {
    images = document.querySelectorAll("#template-cart-items img");
  }
  if (window.location.href.indexOf('ao.com') > -1) {
    images = document.querySelectorAll(".product-gallery__slide img");
  }
  if (window.location.href.indexOf('harborfreight.com') > -1) {
    images = document.querySelectorAll("#product-wrap img");
  }
  if (window.location.href.indexOf('potterybarnkids.com') > -1) {
    images = document.querySelectorAll(".hooper-slide .image-magnifier-container img");
    mainImageIndex = 0;
    httpOnly = true;
    useSrcset = true;
  }
  if (window.location.href.indexOf('stanley1913.com') > -1) {
    images = document.querySelectorAll(".product__photos img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('jmpthelabel.com') > -1 || window.location.href.indexOf('charmit.com') > -1 || window.location.href.indexOf('peets.com') > -1 || window.location.href.indexOf('saberspro.com') > -1 || window.location.href.indexOf('goldhingeboutique.com') > -1 || window.location.href.indexOf('ourgeneration.co') > -1 || window.location.href.indexOf('aestheticroomcore.com') > -1 || window.location.href.indexOf('tinylandus.com') > -1 || window.location.href.indexOf('oompa.com') > -1) {
    images = document.querySelectorAll(".flickity-slider img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('ssense.com') > -1) {
    images = document.querySelectorAll(".pdp-images__desktop img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('boysmells.com') > -1) {
    images = document.querySelectorAll(".c-product-slider__track img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('fromourplace.com') > -1) {
    images = document.querySelectorAll(".product-carousel__slider img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('heydudeshoesusa.com') > -1) {
    images = document.querySelectorAll('.bg-image-bg img');
  }
  if (window.location.href.indexOf('thehalara.com') > -1) {
    images = document.querySelectorAll('.swiper-wrapper img');
  }
  if (window.location.href.indexOf('kiwico.com') > -1) {
    images = document.querySelectorAll('.product-image-thumbnail img');
  }
  if (window.location.href.indexOf('theordinary.com') > -1) {
    images = document.querySelectorAll(".product-images source");
    useSrcset = true;
  }
  if (window.location.href.indexOf('neuflora.com') > -1 || window.location.href.indexOf('littlewonderandco.com') > -1) {
    images = document.querySelectorAll(".Product__Slideshow img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('homeschoolartbox.com') > -1) {
    images = document.querySelectorAll(".product-single__media-group img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('youngla.com') > -1) {
    images = document.querySelectorAll(".Product__SlideItem--image img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('bkstr.com') > -1) {
    images = document.querySelectorAll(".product-option-control img");
  }
  if (window.location.href.indexOf('mewaii.com') > -1 || window.location.href.indexOf('alvjewels.com') > -1 || window.location.href.indexOf('mudpuppy.com') > -1 || window.location.href.indexOf('thewhitecompany.com') > -1 || window.location.href.indexOf('hosannarevival.com') > -1 || window.location.href.indexOf('thestyledcollection.com') > -1 || window.location.href.indexOf('dreamersnschemers.com') > -1) {
    images = document.querySelectorAll(".slick-track img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('hobbylobby.com') > -1) {
    images = document.querySelectorAll(".slick-track img");
  }
  if (window.location.href.indexOf('noblecollection.com') > -1) {
    images = document.querySelectorAll("#product-image img");
  }
  if (window.location.href.indexOf('radleylondon.com') > -1) {
    images = document.querySelectorAll(".thumbnailList__root img");
  }
  if (window.location.href.indexOf('glossier.com') > -1) {
    images = document.querySelectorAll(".product-gallery__slider img");
    mainImageIndex = 1;
  }
  if (window.location.href.indexOf('chloe.com') > -1) {
    images = document.querySelectorAll(".swiper-wrapper img");
    mainImageIndex = 2;
  }
  if (window.location.href.indexOf('lakepajamas.com') > -1) {
    images = document.querySelectorAll(".swiper-wrapper source");
    useSrcset = true;
  }
  if (window.location.href.indexOf('loft.com') > -1) {
    images = document.querySelectorAll(".swiper-container img");
    mainImageIndex = 1;
  }
  if (window.location.href.indexOf('fatbraintoys.com') > -1) {
    images = document.querySelectorAll("#owlMain .owl-lazy");
  }
  if (window.location.href.indexOf('hollisterco.com') > -1) {
    images = document.querySelectorAll(".slick-track img");
  }
  if (window.location.href.indexOf('miumiu.com') > -1) {
    images = document.querySelectorAll(".grid-product-details__gallery source");
    useSrcset = true;
  }
  if (window.location.href.indexOf('carhartt.com') > -1) {
    images = document.querySelectorAll(".static-main-image-wrapper img");
  }
  if (window.location.href.indexOf('baublebar.com') > -1) {
    images = document.querySelectorAll(".Product__Wrapper img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('princesspolly.com') > -1) {
    images = document.querySelectorAll(".product__left img");
    mainImageIndex = 3;
  }
  if (window.location.href.indexOf('lonecone.com') > -1 || window.location.href.indexOf('unifclothing.com') > -1) {
    images = document.querySelectorAll("#ProductPhoto img");
    if (window.location.href.indexOf('unifclothing.com') < 0) {
      useSrcset = true;
    }
  }
  if (window.location.href.indexOf('somethingnavy.com') > -1) {
    images = document.querySelectorAll(".block-images source[type='image/jpg']");
    useSrcset = true;
  }
  if (window.location.href.indexOf('ghost-official.com') > -1) {
    images = document.querySelectorAll(".product-single source");
    useSrcset = true;
  }
  if (window.location.href.indexOf('louisvuitton.com') > -1) {
    images = document.querySelectorAll(".lv-product img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('melissaanddoug.com') > -1) {
    images = document.querySelectorAll(".product-main__media img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('williams-sonoma.com') > -1) {
    images = document.querySelectorAll(".sticky-left-river img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('bombas.com') > -1) {
    images = document.querySelectorAll("#react-product img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('gandhi.com') > -1) {
    images = document.querySelectorAll(".kobo_img_container img");
  }
  if (window.location.href.indexOf('zsupplyclothing.com') > -1) {
    images = document.querySelectorAll(".product-media__container img");
  }
  if (window.location.href.indexOf('rangecookers.co') > -1) {
    images = document.querySelectorAll("#thumbnails img");
    removeQuery = true;
    limitHeight = 65;
    limitWidth = 65;
  }
  if (window.location.href.indexOf('rolex.com') > -1) {
    images = document.querySelectorAll("#page source[media='']");
    useSrcset = true;
    mainImageIndex = 1;
  }
  if (window.location.href.indexOf('noodleandboo.com') > -1 || window.location.href.indexOf('bellalunatoys.com') > -1 || window.location.href.indexOf('manhattantoy.com') > -1) {
    images = document.querySelectorAll(".product__photos img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('kytebaby.com') > -1) {
    images = document.querySelectorAll(".product img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('aesop.com') > -1) {
    images = document.querySelectorAll("div[data-component='PDPHeaderSection'] img");
  }
  if (window.location.href.indexOf('oliverbonas.com') > -1) {
    images = document.querySelectorAll(".product-media img");
    httpOnly = true;
  }
  if (window.location.href.indexOf('therealreal.com') > -1) {
    images = document.querySelectorAll(".pdp-desktop-images img");
    httpOnly = true;
  }
  if (window.location.href.indexOf('westelm.com') > -1) {
    images = document.querySelectorAll("#pip-hero-container-WE img");
    httpOnly = true;
  }
  if (window.location.href.indexOf('hillhousehome.com') > -1) {
    images = document.querySelectorAll(".pdpCarousel img");
    useSrcset = true;
  }
  if (window.location.href.indexOf('maisonette.com') > -1) {
    images = document.querySelectorAll("#maincontent img");
    httpOnly = true;
  }
  if (window.location.href.indexOf('charlottetilbury.com') > -1) {
    images = document.querySelectorAll(".PDPCarousel img");
  }
  if (window.location.href.indexOf('risewell.com') > -1) {
    images = document.querySelectorAll(".product-single__photo-wrapper img");
  }
  if (window.location.href.indexOf('kendrascott.com') > -1) {
    images = document.querySelectorAll(".primary-image-slider img");
  }
  if (window.location.href.indexOf('converse.com') > -1) {
    images = document.querySelectorAll("#main img");
    httpOnly = true;
  }
  if (window.location.href.indexOf('jcrew.com') > -1) {
    images = document.querySelectorAll("#c-product__photos img");
    limitHeight = 70;
    limitWidth = 70;
    removeQuery = true;
    httpOnly = true;
  }

  if (window.location.href.indexOf('shop.lululemon.com') > -1) {
    images = document.querySelectorAll(".pdp-carousel-images-offset img");
    limitHeight = 70;
    limitWidth = 70;
    removeQuery = true;
    httpOnly = true;
  }

  if (window.location.href.indexOf('staples.com') > -1) {
    images = document.querySelectorAll("#image_gallery_container img");
    limitHeight = 70;
    limitWidth = 70;
    removeQuery = true;
  }

  if (window.location.href.indexOf('gathre.com') > -1) {
    images = document.querySelectorAll(".main-images img");
  }

  if (window.location.href.indexOf('walmart.com') > -1) {
    defaultMainIndex = 6;
  }
  if (window.location.href.indexOf('mewaii.com') > -1) {
    defaultMainIndex = 3;
  }
  if (window.location.href.indexOf('alvjewels.com') > -1) {
    defaultMainIndex = 5;
  }
  if (window.location.href.indexOf('piccalio.com') > -1) {
    defaultMainIndex = 1;
  }

  if (window.location.href.indexOf('bedbathandbeyond.com') > -1 || window.location.href.indexOf('buybuybaby.com') > -1) {
    const shadowInside = document.querySelector("#wmHostPdp").shadowRoot;
    images = shadowInside.querySelectorAll('img');
  }

  let divs = document.querySelectorAll('div[style]');
  if (window.location.href.indexOf('etsy.com') > -1) {
    divs = document.querySelectorAll('div[class="wt-grid__item-xs-12"] div[style]');
  }
  if (window.location.href.indexOf('gathre.com') > -1) {
    divs = document.querySelectorAll('.main-images .feature-image');
  }
  if (window.location.href.indexOf('kitchenaid.com') > -1) {
    divs = document.querySelectorAll('.s7thumb');
    images = [];
  }
  if (window.location.href.indexOf('fatbraintoys.com') > -1) {
    divs = [];
  }

  let result = [];
  let mainImage = null;

  if (divs && divs.length) {
    for (let i = 0; i < divs.length; i++) {
      const divStyle = getComputedStyle(divs[i]);
      if (divs[i].style.backgroundImage || divStyle.backgroundImage) {
        let imageUrl = divs[i].style.backgroundImage;
        let url = imageUrl.slice(4, -1).replace(/"/g, "");
        const divBox = divs[i].getBoundingClientRect();

        if (divStyle && !imageUrl) {
          imageUrl = divStyle.backgroundImage;
          url = imageUrl.slice(4, -1).replace(/"/g, "");
        }
        if (url && url.indexOf('http') > -1 && url.indexOf('Loading') === -1) {
          if (divBox.height > 300 && divBox.width > 300 && divs[i].style.display != 'none' && divBox.y < 2500) {
            result.push(url);

            if (divBox.height > 300 && divBox.width > 300 && !mainImage && divBox.y < 600) {
              mainImage = url;
            }
          }
        }
      }
    }
  }
  let mainIndex = 0;
  for (let i = 0; i < images.length; i++) {
    const imageElement = images[i];
    const bBox = imageElement.getBoundingClientRect();
    if (!useSrcset && imageElement.naturalHeight >= limitHeight && imageElement.naturalWidth >= limitWidth && imageElement.style.display != 'none' && bBox.y < 2000 && imageElement.src.indexOf('flag') === -1 && imageElement.src.indexOf('transparent') === -1 && imageElement.src.indexOf('chrome-extension') === -1 && imageElement.src.indexOf('giftlist.com') === -1 && imageElement.src.indexOf('Loading') === -1 && imageElement.src) {
      if (httpOnly) {
        if (imageElement.src.indexOf('http') > -1 && imageElement.src.indexOf('http') != 0) {
          continue;
        } else {
          if (imageElement.src.indexOf('http') < 0) {
            continue;
          }
        }
      }
      if (removeQuery) {
        result.push(imageElement.src.split("?")[0]);
      } else {
        result.push(imageElement.src);
      }

      if (imageElement.naturalHeight > 400 && bBox.y < 600 && bBox.y > 80 && !mainImage && imageElement.src.indexOf('null') < 0) {
        if (mainIndex === mainImageIndex) {
          if (removeQuery) {
            mainImage = imageElement.src.split("?")[0];
          } else {
            mainImage = imageElement.src;
          }
        }
        mainIndex++;
      }
    }
  }

  if (!result.length || useSrcset) {
    for (let i = 0; i < images.length; i++) {
      const imageElement = images[i];
      if (imageElement.srcset) {
        if (window.location.href.indexOf('shop.lululemon.com') > -1) {
          result = [...result, imageElement.srcset.split(",\n")[0]];
        } else if (window.location.href.indexOf('potterybarnkids.com') > -1) {
          result = [...result, imageElement.srcset.split(",")[0].split(' ')[0]];
        } else {
          result = [...result, imageElement.srcset.split(", ")[0]];
        }
        result = result.map(item => {
          if (removeQuery) {
            return item.trim().split("?")[0];
          } else {
            return item.trim();
          }
        })
        mainImage = result[mainImageIndex || 0];
      }
    }
  }

  if (result.length && !mainImage) {
    mainImage = result[mainImageIndex || 0];
  }

  if (defaultMainIndex > -1) {
    mainImage = result[defaultMainIndex];
  }

  return { images: result, mainImage };
}
