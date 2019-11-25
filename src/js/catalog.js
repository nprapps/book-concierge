var $ = require("./lib/qsa");
var bookService = require("./bookService");
var dot = require("./lib/dot");
var flip = require("./lib/flip");
var hash = require("./hash");
var lazyload = require("./lazyLoading");
var track = require("./lib/tracking");

var bookTemplate = dot.compile(require("./_book.html"));
var listTemplate = dot.compile(require("./_list.html"));
var coverTemplate = dot.compile(require("./_cover.html"));

var coverContainer = $.one(".catalog-covers");
var listContainer = $.one(".catalog-list");
var bookPanel = $.one(".book-detail");
var bookCounter = $.one(".book-count");

// single book rendering
var renderBook = async function(params, previous) {
  var book = await bookService.getDetail(params.year, params.book);
  track("book-selected", `${book.title} by ${book.author}`);
  var back = hash.serialize(previous.year ? previous : { year: params.year });
  var reviewer = window.conciergeData.reviewers[book.reviewer] || {};
  bookPanel.innerHTML = bookTemplate({ book, back, hash, reviewer });
  document.body.setAttribute("data-mode", "book");
  var h2 = $.one("h2", bookPanel);
  h2.focus();
};

// check a given book against the filters
var checkVisibility = function(b, tags) {
  var visible = true;
  if (tags.length) {
    var matches = tags.every(t => b.tags.has(t));
    if (!matches) visible = false;
  }
  return visible;
};

// update book counts
var updateCounts = function(count) {
  bookCounter.innerHTML = count;
  document.body.setAttribute("data-count", count);
};

var createCover = function(book) {
  var element = document.createElement("li");
  element.dataset.id = book.id;
  element.dataset.year = book.year;
  element.className = "book-container";
  element.innerHTML = coverTemplate({ book });
  book.coverElement = element;
};

var renderCovers = function(books, year, tags) {
  // clear out placeholders
  $(".placeholder", coverContainer).forEach(e => e.parentElement.removeChild(e));

  // ensure all books are in the DOM
  books.forEach(function(b) {
    if (!b.coverElement) createCover(b);
    if (!b.coverElement.parentElement) coverContainer.appendChild(b.coverElement);
  });
  var visible = books.filter(b => checkVisibility(b, tags));

  updateCounts(visible.length);

  var elements = books.map(b => b.coverElement);

  flip(elements, function() {
    var visibleSet = new Set(visible);
    books.forEach(function(book) {
      book.coverElement.classList.toggle("hidden", !visibleSet.has(book));
    });
  });
};

var renderList = function(books, year, tags) {
  // list view just renders in bulk
  // we should probably change this at some point
  // but it makes sorting way easier
  var filtered = books.filter(b => checkVisibility(b, tags));
  filtered.sort((a, b) => a.sortingTitle < b.sortingTitle ? -1 : 1);
  updateCounts(filtered.length);
  listContainer.innerHTML = listTemplate({ books: filtered });
  lazyload.reset();
};

module.exports = { renderBook, renderList, renderCovers };