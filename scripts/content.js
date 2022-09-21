chrome.runtime.onMessage.addListener((request) => {
	if(request.type === 'popup-modal'){
		showModal();
	}
});

// left: 37, up: 38, right: 39, down: 40,
// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
var keys = {37: 1, 38: 1, 39: 1, 40: 1};

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
  window.addEventListener("test", null, Object.defineProperty({}, 'passive', {
    get: function () { supportsPassive = true; } 
  }));
} catch(e) {}

var wheelOpt = supportsPassive ? { passive: false } : false;
var wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';

// call this to Disable
function disableScroll() {
  window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
  window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
  window.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
  window.addEventListener('keydown', preventDefaultForScrollKeys, false);
}

// call this to Enable
function enableScroll() {
  window.removeEventListener('DOMMouseScroll', preventDefault, false);
  window.removeEventListener(wheelEvent, preventDefault, wheelOpt); 
  window.removeEventListener('touchmove', preventDefault, wheelOpt);
  window.removeEventListener('keydown', preventDefaultForScrollKeys, false);
}

const getShareFeedbackModal = () => {
	const thumbUpIcon = chrome.runtime.getURL("/public/images/thumb_up.png");
	const thumbDownIcon = chrome.runtime.getURL("/public/images/thumb_down.png");
	const raiseHandsIcon = chrome.runtime.getURL("/public/images/raise_hands.png");
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
					<button class="btn">Let's do it!</button>
					<button class="btn btn-outline" id="giftlist_extension_leave_feedback">Maybe later</button>
				</div>
			</div>
			<div id="thumbdown_content_container">
				<h3 style="font-size: 20px;line-height: 24px;color: #101A34;">We love that you love it</h3>
				<textarea rows="5" class="form-control" placeholder="I would like to improve the following..." style="margin-top: 20px;"></textarea>
				<div class="giftlist-extension-buttons-row">
					<button class="btn btn-outline" id="giftlist_extension_go_back">Go Back</button>
					<button class="btn">Submit</button>
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
				<div class="giftlist-extension-item-image">
					<img src="https://m.media-amazon.com/images/I/71SCvh0L3OL._AC_SL1500_.jpg" class="selected-item-image" />
				</div>
				<div class="giftlist-extension-item-image">
					<img src="https://m.media-amazon.com/images/I/71SCvh0L3OL._AC_SL1500_.jpg" class="selected-item-image" />
				</div>
				<div class="giftlist-extension-item-image">
					<img src="https://m.media-amazon.com/images/I/71SCvh0L3OL._AC_SL1500_.jpg" class="selected-item-image" />
				</div>
				<div class="giftlist-extension-item-image">
					<img src="https://m.media-amazon.com/images/I/71SCvh0L3OL._AC_SL1500_.jpg" class="selected-item-image" />
				</div>
				<div class="giftlist-extension-item-image">
					<img src="https://m.media-amazon.com/images/I/71SCvh0L3OL._AC_SL1500_.jpg" class="selected-item-image" />
				</div>
				<div class="giftlist-extension-item-image">
					<img src="https://m.media-amazon.com/images/I/71SCvh0L3OL._AC_SL1500_.jpg" class="selected-item-image" />
				</div>
				<div class="giftlist-extension-item-image">
					<img src="https://m.media-amazon.com/images/I/71SCvh0L3OL._AC_SL1500_.jpg" class="selected-item-image" />
				</div>
				<div class="giftlist-extension-item-image">
					<img src="https://m.media-amazon.com/images/I/71SCvh0L3OL._AC_SL1500_.jpg" class="selected-item-image" />
				</div>
			</div>
		</div>
	`;
};

const getAddGiftModal = () => {
	return `
		<div class="giftlist-extension-add-gift-content">
			<div class="giftlist-extension-image-container">
				<img src="https://m.media-amazon.com/images/I/71SCvh0L3OL._AC_SL1500_.jpg" class="selected-item-image" />
				<button id="giftlist_extension_view_more_images" class="btn btn-link">View more images</button>
			</div>
			<div class="giftlist-extension-add-gift-form">
				<h2>Add gift</h2>
				<hr>
				<div class="form-group">
					<label>Add to List</label>
					<input type="text" placeholder="Enter your email" />
				</div>
				<div class="form-group">
					<label>Item URL</label>
					<input type="password" placeholder="Enter password" />
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
				<input type="text" placeholder="Enter your email" />
			</div>
			<div class="form-group" style="position: relative">
				<label>Password</label>
				<input type="password" placeholder="Enter password" id="giftlist-extension-login-input" style="padding-right: 20px;" />
				<div style="position: absolute; right: 12px; bottom: 12px;" id="show_password_btn">
					<img src="${eyeIcon}" style="width: 18px; height: 18px;" />
				</div>
			</div>
			<div class="form-actions">
				<button class="btn" id="giftlist_sign_in">Sign in</button>
				<a href="#" class="btn btn-link">Forgot password?</a>
				<span>New to giftlist? <a href="#">Sign up</a></span>
			</div>
		</div>
	`;
};

const showModal = () => {
	const isLogin = false;
	const shakeHandIcon = chrome.runtime.getURL("/public/images/shake_hand.png");
	const closeIcon = chrome.runtime.getURL("/public/images/close.png");

	const mask = document.createElement("div");
	mask.setAttribute("id", "giftlist_extension_popup_container")
	const modal = document.createElement("div");
	modal.setAttribute(
		"style",`
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
					<div id="giftlist_extension_authenticated_header">
						<div style="display: flex;margin-right: 10px;">
							<span style="font-size: 15px; line-height: 20px; color: #101A34;margin-right: 5px;">Hey Jonathan</span>
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
			<button id="close_dialog_btn" style="padding: 8px 12px; font-size: 16px; border: none; border-radius: 20px;">
				<img src="${closeIcon}" style="width: 18px; height: 18px;" />
			</button>
		</div>`;

	mask.innerHTML = modal.outerHTML;
	document.body.appendChild(mask);
	disableScroll();

	/** Event list */
	mask.querySelector("#close_dialog_btn").addEventListener("click", () => {
		mask.setAttribute("style", "display: none");
		enableScroll();
	});

	mask.querySelector("#show_password_btn").addEventListener("click", () => {
		const currentType = mask.querySelector("#giftlist-extension-login-input").attributes[0].value;
		mask.querySelector("#giftlist-extension-login-input").attributes[0].value = currentType == 'text' ? 'password' : 'text';
	});

	mask.querySelector("#giftlist_sign_in").addEventListener("click", () => {
		mask.querySelector('#giftlist_extension_authenticated_header').style.display = "flex";
		mask.querySelector("#giftlist_extension_popup_main_content").innerHTML = getAddGiftModal();

		mask.querySelector("#giftlist_extension_add_btn").addEventListener("click", () => {
			mask.querySelector("#giftlist_extension_popup_main_content").innerHTML = getSuccessAddedModal();

			mask.querySelector("#giftlist_extension_leave_feedback").addEventListener("click", () => {
				mask.querySelector("#giftlist_extension_popup_main_content").innerHTML = getShareFeedbackModal();

				mask.querySelector("#thumb_up_btn").addEventListener("click", () => {
					mask.querySelector("#thumbup_content_container").style.display = "flex";
					mask.querySelector("#thumbdown_content_container").style.display = "none";
				});

				mask.querySelector("#thumb_down_btn").addEventListener("click", () => {
					mask.querySelector("#thumbup_content_container").style.display = "none";
					mask.querySelector("#thumbdown_content_container").style.display = "flex";
				});
			});
		});

		mask.querySelector("#giftlist_extension_view_more_images").addEventListener("click", () => {
			mask.querySelector("#giftlist_extension_popup_main_content").innerHTML = getShowMoreImageModal();
		});
	});


}