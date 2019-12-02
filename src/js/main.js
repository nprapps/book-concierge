var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");
var dot = require("./lib/dot");
var track = require("./lib/tracking");
require("./lazyLoading");

var channel = require("./pubsub");
var bookService = require("./bookService");
var {
  renderBook,
  renderList,
  renderCovers,
  createCover,
  filterBooks
} = require("./catalog");
var { getFilters, setFilters, enableFilters } = require("./filters");

var hash = require("./hash");
hash.define({
  year: Number,
  book: String,
  years: [Number],
  tags: [String],
  view: String,
  reset: Boolean
});

/*

State flow:
mobile filters -> filters -> hash -> rendering

The hash is always the source of truth.

*/

var tagMemory = [];
var viewMemory = "covers";

var defaults = {
  view: "covers",
  year: 2019
};

// hashes update filters (usually redundant) and render the main panel
channel.on("hashchange", async function(params, pastParams = {}) {
  var bodyData = document.body.dataset;
  var existing = getFilters();
  // hash params override existing filters override defaults
  var merged = Object.assign({}, defaults, existing, params);
  bodyData.mode = merged.view;
  bodyData.year = merged.year;
  bodyData.tags = (merged.tags || []).length;

  setFilters(merged);
  if (merged.tags) {
    tagMemory = merged.tags;
  }

  if (merged.view) {
    viewMemory = merged.view;
  }

  // single book rendering
  if (merged.book) {
    document.body.setAttribute("data-mode", "book");
    // get book data
    var [book, books] = await Promise.all([
      bookService.getDetail(merged.year, merged.book),
      bookService.getYear(merged.year)
    ]);
    // find the location of this book in the current filter view
    var shelf = filterBooks(books, tagMemory);
    var shelved = shelf.filter(b => b.id == book.id).pop();
    var index = shelf.indexOf(shelved);
    // generate next and previous links
    var previous = shelf[index > 0 ? index - 1 : shelf.length - 1];
    var next = shelf[(index + 1) % shelf.length];
    previous = hash.serialize({ year: merged.year, book: previous.id });
    next = hash.serialize({ year: merged.year, book: next.id });
    // generate a back link from the year
    var back = hash.serialize({
      year: merged.year,
      view: viewMemory,
      tags: tagMemory
    });
    // look up the reviewer from the table
    var reviewer = window.conciergeData.reviewers[book.reviewer] || {};
    track("book-selected", `${book.title} by ${book.author}`);
    return renderBook({ book, next, previous, back, hash, reviewer });
  } else {
    // filtered view rendering
    document.body.classList.add("loading");
    // disable filtering during load to prevent spamming
    enableFilters(false);

    var { year, tags, view } = merged;

    // did the year change? If so, remove those books
    if (merged.year != pastParams.year) {
      $(".book-container").forEach(el => el.parentElement.removeChild(el));
    }

    var books = await bookService.getYear(year);

    if (view == "list") {
      await renderList(books, year, tags);
    } else {
      books.sort((a, b) => (a.shuffle < b.shuffle ? 1 : -1));
      await renderCovers(books, year, tags);
    }

    if (!merged.reset && pastParams.book && pastParams.year == merged.year) {
      var clicked = $.one(`[data-id="${pastParams.book}"] a`);
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
if (startup.year) {
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

document.body.addEventListener("click", function(e) {
  var target = e.target;
  if (target.dataset.track) {
    track("clicked-link", target.dataset.track, target.href);
  }
});
