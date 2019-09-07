var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");
var dot = require("./lib/dot");

var channel = require("./pubsub");

// components
var { getFilters, setFilters } = require("./filters");

var hash = require("./hash");
hash.define({
  years: [Number],
  tags: [String]
});

var { renderBook, renderCatalog } = require("./catalog");

/*

State flow:
mobile filters -> filters -> hash -> rendering

The hash is always the source of truth.

*/

// filters update the hash
channel.on("filterchange", function(state) {
  hash.replace(state);
});

// hashes update filters (usually redundant) and render the main panel
channel.on("hashchange", async function(params, previous) {
  if (params.book) {
    document.body.setAttribute("data-mode", "book");
    return renderBook(params.year, params.book);
  } else {
    document.body.setAttribute("data-mode", params.view || "covers")
    setFilters(params);
    var { years, tags, view } = params;
    await renderCatalog(years, tags, view);
    if (previous && previous.book) {
      var clicked = $.one(`[data-isbn="${previous.book}"]`);
      if (clicked) clicked.focus();
    }
  }
});

// on startup, check for a pre-existing hash
var startup = hash.parse();
// years is guaranteed to be an array because of the define() above
if (startup.years.length) {
  // if found, force a render from the hash, which will update filters accordingly
  hash.force();
} else {
  // otherwise, set the hash from the initial filter state to kick off a render
  var filter = getFilters();
  hash.replace(filter);
}