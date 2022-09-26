chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "popup-modal") {
    chrome.storage.sync.get(["giftlist_access_token"], async function (result) {
      if (result) {
        result = await checkTokenValid();
      }
      showModal(result);
    });
  }
});

const BASE_URL = "https://giftlist.dedicateddevelopers.us/api";

let product = null;
let selected_image = null;
let listData = [];

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
} catch (e) {}

var wheelOpt = supportsPassive ? { passive: false } : false;
var wheelEvent =
  "onwheel" in document.createElement("div") ? "wheel" : "mousewheel";

// call this to Disable
function disableScroll() {
  window.addEventListener("DOMMouseScroll", preventDefault, false); // older FF
  window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
  window.addEventListener("touchmove", preventDefault, wheelOpt); // mobile
  window.addEventListener("keydown", preventDefaultForScrollKeys, false);
}

// call this to Enable
function enableScroll() {
  window.removeEventListener("DOMMouseScroll", preventDefault, false);
  window.removeEventListener(wheelEvent, preventDefault, wheelOpt);
  window.removeEventListener("touchmove", preventDefault, wheelOpt);
  window.removeEventListener("keydown", preventDefaultForScrollKeys, false);
}

const getShareFeedbackModal = () => {
  const thumbUpIcon = chrome.runtime.getURL("/public/images/thumb_up.png");
  const thumbDownIcon = chrome.runtime.getURL("/public/images/thumb_down.png");
  const raiseHandsIcon = chrome.runtime.getURL(
    "/public/images/raise_hands.png"
  );
  return `
		<div class="giftlist-extension-share-feedback-content">
			<h2>Share your feedback</h2>
			<p>
				We hope you are enjoying our Add to GiftList button.
			</p>
			<p>
				Please rate your experience by picking an emoji.
			</p>
			<div class="giftlist-extension-buttons-row">
				<div class="giftlist-extension-success-icon-container" id="thumb_up_btn">
					<img src="${thumbUpIcon}" class="selected-item-image" />
				</div>
				<div class="giftlist-extension-success-icon-container" id="thumb_down_btn">
					<img src="${thumbDownIcon}" class="selected-item-image" />
				</div>
			</div>
			<div id="thumbup_content_container">
				<div style="display: flex; flex-direction: row; margin-top: 20px; margin-bottom: 15px;align-items: center;">
					<h3 style="font-size: 20px;line-height: 24px;color: #101A34;">We love that you love it</h3>
					<img src="${raiseHandsIcon}" class="selected-item-image" style="width: 32px; height: 32px;" />
				</div>
				<p>
					Have a moment to rate us?
				</p>
				<div class="giftlist-extension-buttons-row">
					<button class="btn" id="giftlist_extension_leave_good_feedback">Let's do it!</button>
					<button class="btn btn-outline" id="giftlist_extension_leave_feedback">Maybe later</button>
				</div>
			</div>
			<div id="thumbdown_content_container">
				<h3 style="font-size: 20px;line-height: 24px;color: #101A34;">We love that you love it</h3>
				<textarea rows="5" class="form-control" placeholder="I would like to improve the following..." style="margin-top: 20px;"></textarea>
				<div class="giftlist-extension-buttons-row">
					<button class="btn btn-outline" id="giftlist_extension_go_back">Go Back</button>
					<button class="btn" id="giftlist_extension_leave_bad_feedback">Submit</button>
				</div>
			</div>
		</div>
	`;
};

const getSuccessAddedModal = () => {
  const giftIcon = chrome.runtime.getURL("/public/images/gift_box.png");
  return `
		<div class="giftlist-extension-success-added-content">
			<div class="giftlist-extension-success-icon-container">
				<img src="${giftIcon}" class="selected-item-image" />
			</div>
			<h2>Your item has been added to the list!</h2>
			<p>
				It can take up 30 seconds for your gift details to appear on your list.
			</p>
			<p>
				Feel free to continue adding items using the Giftlist button
			</p>
			<div class="giftlist-extension-buttons-row">
				<button class="btn">View list</button>
				<button class="btn btn-outline" id="giftlist_extension_leave_feedback">Continue adding items</button>
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
				${product[0].product.images.reduce((acc, item) => {
          return (
            acc +
            `
						<div class="giftlist-extension-item-image">
							<img src="${item}" class="selected-item-image" />
						</div>
					`
          );
        }, "")}
			</div>
		</div>
	`;
};

const getAddGiftModal = (data) => {
  return `
		<div class="giftlist-extension-add-gift-content">
			<div class="giftlist-extension-image-container">
				<img src="${
          selected_image ?? product[0].product.images[0]
        }" class="selected-item-image" />
				<button id="giftlist_extension_view_more_images" class="btn btn-link">View more images</button>
			</div>
			<div class="giftlist-extension-add-gift-form">
				<h2>Add gift</h2>
				<hr>
				<div class="form-group">
					<label>Add to List</label>
					<select class="form-control">
						<option>Favourite</option>
						${(data || []).map(
              (item) =>
                '<option value="' + item.id + '">' + item.name + "</option>"
            )}
					</select>
				</div>
				<div class="form-group">
					<label>Item name</label>
					<input type="text" placeholder="Item Name" value="${product[0].product.name}" />
				</div>
				<div class="form-group" style="display: flex;">
					<input type="checkbox" value="" id="most_wanted" />
					<label style="margin-left: 8px;">Most wanted gift</label>
				</div>
				<div class="form-group">
					<label>Item URL</label>
					<input type="text" placeholder="Item URL" value="${
            window.location.href
          }" readonly />
				</div>
				<div class="form-group">
					<label>Price<span style="color: #A8ACB3">(optional)</span></label>
					<input type="text" placeholder="Price" value="${
            product[0].product.offers[0].currency
          } ${product[0].product.offers[0].price}" />
				</div>
				<div class="form-group">
					<label>Other details<span style="color: #A8ACB3">(optional)</span></label>
					<textarea class="form-control" rows="3" placeholder="Other important details: Size, Colour etc.">${
            product[0].product.description
          }</textarea>
				</div>
				<div class="form-actions">
					<button class="btn" id="giftlist_extension_add_btn">Add gift</button>
				</div>
			<div>
		</div>
	`;
};

const getLoginModal = () => {
  const eyeIcon = chrome.runtime.getURL("/public/images/eye.png");
  return `
		<div class="giftlist-extension-login-content">
			<h2>Please login to add this item to your list</h2>
			<hr>
			<div class="form-group">
				<label>Your email</label>
				<input type="text" placeholder="Enter your email" id="giftlist-extension-login-email" />
			</div>
			<div class="form-group" style="position: relative">
				<label>Password</label>
				<input type="password" placeholder="Enter password" id="giftlist-extension-login-input" style="padding-right: 20px;" />
				<div style="position: absolute; right: 12px; bottom: 12px;" id="show_password_btn">
					<img src="${eyeIcon}" style="width: 18px; height: 18px;" />
				</div>
			</div>
			<div class="form-actions" style="margin-top: 24px;">
				<button class="btn" id="giftlist_sign_in">Sign in</button>
				<a href="#" class="btn btn-link">Forgot password?</a>
				<span>New to giftlist? <a href="#">Sign up</a></span>
			</div>
		</div>
	`;
};

const showModal = async (exist_token) => {
  const isLogin = false;
  const shakeHandIcon = chrome.runtime.getURL("/public/images/shake_hand.png");
  const closeIcon = chrome.runtime.getURL("/public/images/close.png");

  const mask = document.createElement("div");
  mask.setAttribute("id", "giftlist_extension_popup_container");
  const modal = document.createElement("div");
  modal.setAttribute(
    "style",
    `
		min-height:300px;
		min-width: 350px;
		border: none;
		border-radius:20px;
		background-color:white;
		position: fixed; box-shadow: 0px 12px 48px rgba(29, 5, 64, 0.32);
		z-index: 9999;
		`
  );

  modal.innerHTML = `<div id="giftlist_extension_popup_content"; style="height:100%">
					<div class="giftlist_extension_popup_header">
						<h3>GIFTLIST</h3>
					</div>
					<div id="giftlist_extension_popup_main_content" style="display: flex; justify-content: center; align-items: center;">
						<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
						<div class="success-checkmark" style="display: none">
							<div class="check-icon">
								<span class="icon-line line-tip"></span>
								<span class="icon-line line-long"></span>
								<div class="icon-circle"></div>
								<div class="icon-fix"></div>
							</div>
						</div>
					</div>
				</div>
				<div style="position:absolute; top:22px; right:5px;">
				<button id="close_dialog_btn" style="padding: 8px 12px; font-size: 16px; border: none; border-radius: 20px;">
					<img src="${closeIcon}" style="width: 18px; height: 18px;" />
				</button>
			</div>`;

  mask.innerHTML = modal.outerHTML;

  document.body.appendChild(mask);

  if (!exist_token) {
    modal.innerHTML = `<div id="giftlist_extension_popup_content"; style="height:100%">
					<div class="giftlist_extension_popup_header" style="border: none;">
						<h3>GIFTLIST</h3>
						<div id="giftlist_extension_authenticated_header">
							<div style="display: flex;margin-right: 10px;">
								<span style="font-size: 15px; line-height: 20px; color: #101A34;margin-right: 5px;">Hey <span id="giftlist_extension_logged_in_username"></span></span>
								<img src="${shakeHandIcon}" class="selected-item-image" />
							</div>
							<a href="#" style="font-weight: 600;font-size: 15px;line-height: 18px;color: #50BCD9;">Logout</a>
						</div>
					</div>
					<div id="giftlist_extension_popup_main_content">
						${getLoginModal()}
					</div>
				</div>
				<div style="position:absolute; top:22px; right:5px;">
				<button id="close_dialog_btn" style="padding: 8px 12px; font-size: 16px; border: none; border-radius: 20px;background-color: #fff;">
					<img src="${closeIcon}" style="width: 18px; height: 18px;" />
				</button>
			</div>`;
  } else {
    modal.innerHTML = `<div id="giftlist_extension_popup_content"; style="height:100%">
			<div class="giftlist_extension_popup_header">
				<h3>GIFTLIST</h3>
				<div id="giftlist_extension_authenticated_header">
					<div style="display: flex;margin-right: 10px;">
						<span style="font-size: 15px; line-height: 20px; color: #101A34;margin-right: 5px;">Hey <span id="giftlist_extension_logged_in_username"></span></span>
						<img src="${shakeHandIcon}" class="selected-item-image" />
					</div>
					<a href="#" style="font-weight: 600;font-size: 15px;line-height: 18px;color: #50BCD9;">Logout</a>
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
				</div>
			</div>
		</div>
		<div style="position:absolute; top:22px; right:5px;">
		<button id="close_dialog_btn" style="padding: 8px 12px; font-size: 16px; border: none; border-radius: 20px;">
			<img src="${closeIcon}" style="width: 18px; height: 18px;" />
		</button>
	</div>`;
    document.querySelector("#giftlist_extension_popup_container").innerHTML =
      modal.outerHTML;
    document.querySelector(
      "#giftlist_extension_popup_loading_container"
    ).style.display = "flex";

    const productData = await getProductData();

    if (productData.status !== 200) {
      return;
    }
    product = productData.data;
    document.querySelector(
      "#giftlist_extension_popup_loading_container .lds-ellipsis"
    ).style.display = "none";
    document.querySelector(
      "#giftlist_extension_popup_loading_container .success-checkmark"
    ).style.display = "block";

    listData = await getAllList(exist_token);
    chrome.storage.sync.get(["giftlist_user"], async function (result) {
      mask.querySelector(
        "#giftlist_extension_authenticated_header #giftlist_extension_logged_in_username"
      ).innerHTML = result.first_name + " " + result.last_name;
    });
    modal.innerHTML = `<div id="giftlist_extension_popup_content"; style="height:100%">
					<div class="giftlist_extension_popup_header">
						<h3>GIFTLIST</h3>
						<div id="giftlist_extension_authenticated_header">
							<div style="display: flex;margin-right: 10px;">
								<span style="font-size: 15px; line-height: 20px; color: #101A34;margin-right: 5px;">Hey <span id="giftlist_extension_logged_in_username"></span></span>
								<img src="${shakeHandIcon}" class="selected-item-image" />
							</div>
							<a href="#" style="font-weight: 600;font-size: 15px;line-height: 18px;color: #50BCD9;">Logout</a>
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
						</div>
						${getAddGiftModal(listData)}
					</div>
				</div>
				<div style="position:absolute; top:22px; right:5px;">
				<button id="close_dialog_btn" style="padding: 8px 12px; font-size: 16px; border: none; border-radius: 20px;">
					<img src="${closeIcon}" style="width: 18px; height: 18px;" />
				</button>
			</div>`;
  }

  document.querySelector("#giftlist_extension_popup_container").innerHTML =
    modal.outerHTML;

  disableScroll();

  const initInnerEvents = () => {
    if (mask.querySelector("#giftlist_extension_add_btn")) {
      mask
        .querySelector("#giftlist_extension_add_btn")
        .addEventListener("click", () => {
          const postData = {
			gift_title: '',
			image_url: '',
			image_file: '',
			price: '',
			details: '',
			isMostWanted: '',
			product_url: '',
			shop_product_id: '',
		  };
		  postData.giftlist_id = 1;
		  postData.secretsanta_id = 1;
          mask.querySelector(
            "#giftlist_extension_popup_main_content"
          ).innerHTML = getSuccessAddedModal();

          mask
            .querySelector("#giftlist_extension_leave_feedback")
            .addEventListener("click", () => {
              mask.querySelector(
                "#giftlist_extension_popup_main_content"
              ).innerHTML = getAddGiftModal(listData);
              initInnerEvents();

              mask
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
                });

              mask
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
                });
            });

          mask
            .querySelector("#giftlist_extension_leave_good_feedback")
            .addEventListener("click", () => {
              window.open(
                "https://chrome.google.com/webstore/detail/add-to-myregistrycom-butt/cnofkjmkojconhdimlkamdckmidfmoio?hl=en-US",
                "_blank"
              );
              mask.querySelector(
                "#giftlist_extension_popup_main_content"
              ).innerHTML = getAddGiftModal(listData);
              initInnerEvents();
            });
          mask
            .querySelector("#giftlist_extension_leave_bad_feedback")
            .addEventListener("click", () => {
              window.open(
                "https://chrome.google.com/webstore/detail/add-to-myregistrycom-butt/cnofkjmkojconhdimlkamdckmidfmoio?hl=en-US",
                "_blank"
              );
              mask.querySelector(
                "#giftlist_extension_popup_main_content"
              ).innerHTML = getAddGiftModal(listData);
              initInnerEvents();
            });
        });
    }
    if (mask.querySelector("#giftlist_extension_view_more_images")) {
      mask
        .querySelector("#giftlist_extension_view_more_images")
        .addEventListener("click", () => {
          mask.querySelector(
            "#giftlist_extension_popup_main_content"
          ).innerHTML = getShowMoreImageModal();

          mask
            .querySelectorAll(".giftlist-extension-item-image img")
            .forEach((item) => {
              item.addEventListener("click", (evt) => {
                selected_image = evt.target.src;
                mask.querySelector(
                  "#giftlist_extension_popup_main_content"
                ).innerHTML = getAddGiftModal(listData);
                initInnerEvents();
              });
            });
        });
    }
  };

  /** Event list */
  mask.querySelector("#close_dialog_btn").addEventListener("click", () => {
    mask.setAttribute("style", "display: none");
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

  mask
    .querySelector("#giftlist_sign_in")
    .addEventListener("click", async () => {
      mask.querySelector("#giftlist_sign_in").disabled = true;
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
      if (result.status === 200) {
        const listData = await getAllList(result.token);
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
            ).innerHTML = result.data.first_name + " " + result.data.last_name;
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
				</div>
			`;

            document.querySelector(
              "#giftlist_extension_popup_loading_container"
            ).style.display = "flex";
            document.querySelector(
              "#giftlist_extension_popup_loading_container .success-checkmark"
            ).style.display = "block";

            const productData = await getProductData();

            if (productData.status !== 200) {
              return;
            }
            product = productData.data;

            mask.querySelector(
              "#giftlist_extension_popup_main_content"
            ).innerHTML = getAddGiftModal(listData);

            initInnerEvents();
          }
        );
      }
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
              { giftlist_refresh_token: res.token },
              function (result) {}
            );
            resolve(res.token);
          } else {
            chrome.storage.sync.set(
              {
                giftlist_refresh_token: "",
                giftlist_access_token: "",
                user: null,
              },
              function (result) {}
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
  const listData = await fetch(BASE_URL + "/occasion/list", {
    method: "GET",
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
  return [
    ...listData,
    santaListData.map((item) => ({ id: item.id, name: item.event_name })),
  ];
}

async function getProductData() {
  const postData = {
    product_url: window.location.href,
  };
  const productData = await fetch(BASE_URL + "/scrape/url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  }).then((res) => res.json());
  return productData;
}
