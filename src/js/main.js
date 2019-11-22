var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");
var dot = require("./lib/dot");

var channel = require("./pubsub");

// components
var { getFilters, setFilters } = require("./filters");

var hash = require("./hash");
hash.define({
  year: Number,
  book: String,
  years: [Number],
  tags: [String]
});

var { renderBook, renderCatalog } = require("./catalog");

/*

State flow:
mobile filters -> filters -> hash -> rendering

The hash is always the source of truth.

*/

// hashes update filters (usually redundant) and render the main panel
channel.on("hashchange", async function(params, previous) {
  var bodyData = document.body.dataset;
  bodyData.mode = params.view || "covers";
  bodyData.year = params.year || "2019";
  bodyData.tags = params.tags ? params.tags.length : 0;
  setFilters(params);
  if (params.book) {
    document.body.setAttribute("data-mode", "book");
    return renderBook(params, previous);
  } else {
    var { year, tags, view } = params;
    view = view || "covers";
    await renderCatalog(year, tags, view);
    if (previous && previous.book) {
      var clicked = $.one(`.catalog-${view} [data-id="${previous.book}"] a`);
      if (clicked) {
        // give it a frame to do layout
        requestAnimationFrame(() => {
          clicked.focus();
          clicked.scrollIntoView({ block: "center", behavior: "smooth" });
        });
      }
    }
  }
});

// on startup, check for a pre-existing hash
var startup = hash.parse();
// years is guaranteed to be an array because of the define() above
if (startup.year || startup.years.length) {
  // if found, force a render from the hash, which will update filters accordingly
  hash.force();
} else {
  // otherwise, set the hash from the initial filter state to kick off a render
  var filter = getFilters();
  hash.replace(filter);
}

// filters update the hash
channel.on("filterchange", function(state) {
  hash.replace(state);
});