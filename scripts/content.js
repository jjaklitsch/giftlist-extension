let isOpen = false;
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "popup-modal" && !isOpen) {
    isOpen = true;
    showModal();
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

var eventMethod = window.addEventListener
  ? "addEventListener"
  : "attachEvent";
var eventer = window[eventMethod];
var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

// Listen to message from child window
eventer(
  messageEvent,
  async function (e) {
    console.log("parent received message!:  ", e.data);
    if (e.data.type === 'open') {
      window.open(e.data.link, '_blank');
    }
    if (e.data.type === 'resize-modal') {
      if (document.querySelector('#giftlist_extension_popup_iframe')) {
        document.querySelector('#giftlist_extension_popup_iframe').style.width = e.data.width;
        document.querySelector('#giftlist_extension_popup_iframe').style.height = e.data.height;
      }
    }
    if (e.data.type === 'close') {
      document.querySelector('#giftlist_extension_popup_container').remove();
      isOpen = false;
    }
    if (e.data.type === 'require_product') {
      const product_data = await getProductData();
      if (product_data) {
        const child_window = document.querySelector('#giftlist_extension_popup_iframe').contentWindow;
        child_window.postMessage({
          type: 'product_data',
          data: product_data.data,
        }, "*");
      }
    }
  },
  false
);

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

const showModal = async () => {
  const closeIcon = "https://www.giftlist.com/assets/extension-icons/close.svg";

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
    max-height: 94vh;
    overflow-y: hidden;
		`
  );

  modal.innerHTML = `<div id="giftlist_extension_popup_content">
          <div style="position:absolute; top: 30px; right:5px;">
            <div id="giftlist_close_dialog_btn">
              <img src="${closeIcon}" style="width: 18px; height: 18px;" />
            </div>
          </div>
          <iframe src="https://giftlist-extension.web.app" id="giftlist_extension_popup_iframe" style="width: 800px; height: 730px; border: none;" />
				</div>`;

  mask.innerHTML = modal.outerHTML;
  
  mask.querySelector("#giftlist_close_dialog_btn").addEventListener("click", () => {
    if (document.querySelector("#giftlist_extension_popup_container")) {
      document.querySelector("#giftlist_extension_popup_container").remove();
    }
    enableScroll();
  });

  document.body.appendChild(mask);
};

const callback = () => {
  chrome.storage.sync.get(["giftlist_access_token"], async function (result) {
    showModal();
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
  if (window.location.href.indexOf('amazon.') > -1) {
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
