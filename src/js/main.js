var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");
var dot = require("./lib/dot");
var track = require("./lib/tracking");

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
var { renderBook, renderList, renderCovers, createCover, filterBooks } = require("./catalog");

/*

State flow:
mobile filters -> filters -> hash -> rendering

The hash is always the source of truth.

*/

var tagMemory = [];
var viewMemory = "covers";

// hashes update filters (usually redundant) and render the main panel
channel.on("hashchange", async function(params, previous) {
  var bodyData = document.body.dataset;
  bodyData.mode = params.view || "covers";
  bodyData.year = params.year || "2019";
  bodyData.tags = params.tags ? params.tags.length : 0;

  if (params.tags.length || params.year != previous.year) {
    setFilters(params);
    tagMemory = params.tags;
  }

  if (params.view) {
    viewMemory = params.view;
  }

  // single book rendering
  if (params.book) {

    document.body.setAttribute("data-mode", "book");
    // get book data
    var [ book, books ] = await Promise.all([
      bookService.getDetail(params.year, params.book),
      bookService.getYear(params.year)
    ]);
    // find the location of this book in the current filter view
    var shelf = filterBooks(books, tagMemory);
    var shelved = shelf.filter(b => b.id == book.id).pop();
    var index = shelf.indexOf(shelved);
    // generate next and previous links
    var previous = shelf[index > 0 ? index - 1 : shelf.length - 1];
    var next = shelf[(index + 1) % shelf.length];
    previous = hash.serialize({ year: params.year, book: previous.id });
    next = hash.serialize({ year: params.year, book: next.id });
    // generate a back link from the year
    var back = hash.serialize({ year: params.year, view: viewMemory });
    // look up the reviewer from the table
    var reviewer = window.conciergeData.reviewers[book.reviewer] || {};
    track("book-selected", `${book.title} by ${book.author}`);
    return renderBook({ book, next, previous, back, hash, reviewer });

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

    if (!params.reset && previous && previous.book) {
      var clicked = $.one(`[data-id="${previous.book}"] a`);
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

document.body.addEventListener("click", function(e) {
  var target = e.target;
  if (target.dataset.track) {
    track("clicked-link", target.dataset.track, target.href);
  }
});