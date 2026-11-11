// Amazon Creators API (replaces Product Advertising API, retired 2026)

var fetch = require("node-fetch")

const ID = process.env.AMAZON_CREATORS_ID;
const SECRET = process.env.AMAZON_CREATORS_SECRET;
const TAG = process.env.AMAZON_PRODUCT_ADVERTISING_TAG;

const TOKEN_URL = "https://api.amazon.com/auth/o2/token";
const SEARCH_URL = "https://creatorsapi.amazon/catalog/v1/searchItems";
const MARKETPLACE = "www.amazon.com";

var fatal = function(message) {
  var err = new Error(message);
  err.fatal = true;
  return err;
};

var token = null;

var getToken = async function() {
  if (token && token.expires > Date.now()) return token.value;
  if (!ID || !SECRET || !TAG) {
    throw fatal("Set AMAZON_CREATORS_ID, AMAZON_CREATORS_SECRET and AMAZON_PRODUCT_ADVERTISING_TAG");
  }
  var response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: ID,
      client_secret: SECRET,
      scope: "creatorsapi::default"
    })
  });
  var json = await response.json();
  if (!response.ok) {
    var message = `Token request failed: HTTP ${response.status} ${JSON.stringify(json)}`;
    throw response.status = 429 ? new Error(message) : fatal(message);
  }
  token = {
    value: json.access_token,
    expires: Date.now() + (json.expires_in - 60) * 1000
  };
  return token.value;
}

var searchProductAPI = async function(query) {
  var payload = JSON.stringify({
    ...query,
    partnerTag: TAG,
    marketplace: MARKETPLACE,
    searchIndex: "Books",
    availability: "IncludeOutOfStock",
    itemCount: 10,
    resources: [
      "images.primary.large",
      "itemInfo.title",
      "itemInfo.byLineInfo",
      "itemInfo.externalIds",
      "itemInfo.contentInfo",
      "itemInfo.productInfo"
    ]
  });

  var response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      "Content-Type": "application/json",
      "x-marketplace": MARKETPLACE
    },
    body: payload
  });

  var json = await response.json();
  if (response.ok) {
    return json.searchResult ? json.searchResult.items || [] : [];
  }

  var message = `HTTP ${response.status} ${json.type || ""} ${json.reason || ""} ${json.message || ""}`.trim();
  if (response.status == 404) {
    console.log(`  ${message}`);
    return [];
  }
  if (response.status == 401) token = null;
  if (response.status == 400 || response.status == 403) throw fatal(message);
  throw new Error(message);
};

var prop = function(target, key, fallback) {
  var path = key.split(".");
  while(path.length) {
    var segment = path.shift();
    if (!target || !(segment in target)) return fallback;
    target = target[segment];
  }
  return target;
}

var flattenAmazon = function(result) {
  var p = prop.bind(null, result);

  return {
    title: p("itemInfo.title.displayValue"),
    isbn: p("itemInfo.externalIds.isbns.displayValues", [])[0],
    image: p("itemInfo.images.primary.large.url"),
    author: p("itemInfo.byLineInfo.contributors", []).map(d => d.name).join("; "),
    publisher: p("itemInfo.byLineInfo.brand.displayValue") || p("itemInfo.byLineInfo.manufacturer.displayValue"),
    language: p("itemInfo.contentInfo.languages.displayValues", []).map(d => d.displayValue)[0],
    published: new Date(p("itemInfo.contentInfo.publicationDate.displayValue")).getFullYear(),
    released: new Date(p("itemInfo.productInfo.releaseDate.displayValue")).getFullYear(),
    pages: p("itemInfo.contentInfo.pagesCount.displayValue"),
    asin: result.asin,
    url: result.detailPageURL
  };
};

module.exports = {
  searchProductAPI,
  flattenAmazon
};