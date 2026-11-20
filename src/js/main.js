var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");
var dot = require("./lib/dot");
var track = require("./lib/tracking");
require("./lazyLoading");
require("./analytics");

var channel = require("./pubsub");
var bookService = require("./bookService");
var {
  renderBook,
  renderReviewer,
  renderList,
  renderCovers,
  createCover,
  filterBooks
} = require("./catalog");
var { getFilters, setFilters, enableFilters, tagFitsYear, tagLabel } = require("./filters");

var hash = require("./hash");
hash.define({
  year: Number,
  book: String,
  years: [Number],
  tags: [String],
  view: String,
  reset: Boolean,
  reviewer: String
});

/*

State flow:
mobile filters -> filters -> hash -> rendering

The hash is always the source of truth.

*/

var defaults = {
  view: "covers",
  year: 2026
};

//breadcrumb state
var lastShelf = null;
var viaReviewer = null;
var cameFrom = null;
var pickedFromList = false;

var shelfCrumb = function(year, view) {
  var shelf = lastShelf || { year, view, reset: true};
  return { label: "Back to shelf", href: hash.serialize(shelf)}
}

// hashes update filters (usually redundant) and render the main panel
channel.on("hashchange", async function(params, pastParams = {}) {
  var bodyData = document.body.dataset;
  var existing = getFilters();
  // hash params override existing filters override defaults
  var merged = Object.assign({}, defaults, existing, params);
  merged.tags = (merged.tags || []).filter(t => tagFitsYear(t, merged.year));
  bodyData.mode = merged.view;
  bodyData.year = merged.year;
  bodyData.tags = (merged.tags || []).length;

  setFilters(merged);

  if (merged.reviewer) {
    var reviewed = await bookService.getReviewer(merged.reviewer);
    if (reviewed) {
      var profile = window.conciergeData.reviewers[merged.reviewer] || {};
      var crumbs = [shelfCrumb(defaults.year, merged.view)];
      cameFrom = pastParams.book && !pastParams.reviewer
        ? { year: pastParams.year, book: pastParams.book, via: viaReviewer }
        : null;
      if (cameFrom) {
        var from = await bookService.getDetail(cameFrom.year, cameFrom.book);
        if (from) {
          crumbs.push({
            label: "Back to book",
            href: hash.serialize({ year: cameFrom.year, book: cameFrom.book })
          });
        }
      }
      track("reviewer-selected", merged.reviewer, reviewed.length);
      renderReviewer({
        name: merged.reviewer,
        title: profile.title,
        link: profile.link,
        books: reviewed,
        crumbs
      });
      return;
    }
  }

  // single book rendering
  if (merged.book) {
    // coming from a year or a reviewer?
    if (pastParams.reviewer) {
      var returning = !pickedFromList && cameFrom && cameFrom.year == merged.year && cameFrom.book == merged.book;
      viaReviewer = returning ? cameFrom.via : pastParams.reviewer;
    } else if (!pastParams.book) {
      viaReviewer = null;
    }
    // get book data
    var [book, books, counts] = await Promise.all([
      bookService.getDetail(merged.year, merged.book),
      viaReviewer
        ? bookService.getReviewer(viaReviewer)
        : bookService.getYear(merged.year, merged.view),
      bookService.getReviewerCounts().catch(() => ({}))
    ]);
    // find the location of this book in reviewers picks or the current filter view
    var shelf = viaReviewer ? books || [] : filterBooks(books, merged.tags);
    var index = shelf.findIndex(b => b.year == merged.year && b.id == book.id);
    if (viaReviewer && index == -1) {
      //somehow not a pick by this reviewer, fallback to year
      viaReviewer = null;
      shelf = filterBooks(await bookService.getYear(merged.year, merged.view), merged.tags);
      index = shelf.findIndex(b => b.id == book.id);
    }
    
    // generate next and previous links
    var previous = shelf[index > 0 ? index - 1 : shelf.length - 1];
    var next = shelf[(index + 1) % shelf.length];
    previous = hash.serialize({ year: previous.year, book: previous.id });
    next = hash.serialize({ year: next.year, book: next.id });
    
    var crumbs = [shelfCrumb(merged.year, merged.view)];
    if (viaReviewer) {
      crumbs.push({ label: "Back to reviewer", href: hash.serialize({ reviewer: viaReviewer }) });
    }
    var noun = viaReviewer ? "review" : "book";

    // look up the reviewer from the table - inclues entries with two reviewers
    var all_rev = [];
    book.reviewers.forEach(function(rev){
      var one_rev = window.conciergeData.reviewers[rev] || {};
      all_rev.push(Object.assign({}, one_rev, { picks: counts[rev] || 0 }))
    });
    var reviewers = all_rev || {};

    track("book-selected", `${book.title} by ${book.author}`);
    // scroll into view if this is an internal navigation
    // not on page load
    var scrollToBook = !!pastParams.year;
    renderBook({ book, next, previous, crumbs, noun, hash, reviewers, tagLabel }, scrollToBook);
    document.body.setAttribute("data-mode", "book");

  } else {
    // filtered view rendering
    document.body.classList.add("loading");
    // disable filtering during load to prevent spamming
    enableFilters(false);

    var { year, tags, view } = merged;
    lastShelf = { year, view, tags };
    viaReviewer = null;

    // did the year change? If so, remove those books
    if (merged.year != pastParams.year) {
      $(".book-container").forEach(el => el.parentElement.removeChild(el));
    }

    var books = await bookService.getYear(year, view);

    if (view == "list") {
      await renderList(books, year, tags);
    } else {
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
if (startup.year || startup.tags || startup.reviewer) {
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

channel.on("hashchange", function() {
  var url = window.location.href;
  if (window.tp && tp.experience) tp.experience.execute();
})

document.body.addEventListener("click", function(e) {
  var target = e.target;
  pickedFromList = !!target.closest(".reviewer-books a");
  if (target.dataset.track) {
    track("clicked-link", target.dataset.track, target.href);
  }
});

var here = new URL(window.location);
if (here.searchParams.has("screenshot")) {
  document.body.classList.add("screenshot");
}

window.addEventListener("load", function() {
  if (window.tp && tp.experience) tp.experience.execute();
})