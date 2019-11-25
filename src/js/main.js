var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");
var dot = require("./lib/dot");

var channel = require("./pubsub");

// components
var { getFilters, setFilters, enableFilters } = require("./filters");

var hash = require("./hash");
hash.define({
  year: Number,
  book: String,
  years: [Number],
  tags: [String]
});

var bookService = require("./bookService");
var { renderBook, renderList, renderCovers, createCover } = require("./catalog");

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

  // single book rendering
  if (params.book) {
    document.body.setAttribute("data-mode", "book");
    return renderBook(params, previous);
  } else {
    // filtered view rendering
    document.body.classList.add("loading");
    // disable filtering during load to prevent spamming
    enableFilters(false);

    var { year, tags, view } = params;

    // did the year change? If so, remove those books
    if (params.year != previous.year) {
      $(".book-container").forEach(el => el.parentElement.removeChild(el));
    }

    var books = await bookService.getYear(year);

    if (view == "list") {
      await renderList(books, year, tags);
    } else {
      books.sort((a, b) => a.shuffle < b.shuffle ? 1 : -1);
      await renderCovers(books, year, tags);
    }

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
    document.body.classList.remove("loading");
    enableFilters(true);
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