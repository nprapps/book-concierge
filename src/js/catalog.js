var $ = require("./lib/qsa");
var dot = require("./lib/dot");
var flip = require("./lib/flip");

var bookTemplate = dot.compile(require("./_book.html"));
var listTemplate = dot.compile(require("./_list.html"));
var coverTemplate = dot.compile(require("./_cover.html"));

var coverContainer = $.one(".catalog-covers");
var listContainer = $.one(".catalog-list");
var bookPanel = $.one(".book-detail");
var bookCounter = $.one(".book-count");

// single book rendering
var renderBook = async function(data) {
  bookPanel.innerHTML = bookTemplate(data);
  document.body.setAttribute("data-mode", "book");
  bookPanel.scrollIntoView();
  var h2 = $.one("h2", bookPanel);
  h2.focus();
};

// check a given book against the filters
var filterBooks = function(books, tags) {
  var checkVisibility = function(b) {
    if (tags && tags.length) {
      var matches = tags.every(t => b.tags.has(t));
      if (!matches) return false;
    }
    return true;
  };

  return books.filter(checkVisibility);
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
  $(".placeholder", coverContainer).forEach(e =>
    e.parentElement.removeChild(e)
  );

  // ensure all books are in the DOM
  books.forEach(function(b) {
    if (!b.coverElement) createCover(b);
    if (!b.coverElement.parentElement)
      coverContainer.appendChild(b.coverElement);
  });
  var visible = filterBooks(books, tags);

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
  var filtered = filterBooks(books, tags);
  filtered.sort((a, b) => (a.sortingTitle < b.sortingTitle ? -1 : 1));
  updateCounts(filtered.length);
  listContainer.innerHTML = listTemplate({ books: filtered });
};

module.exports = { renderBook, renderList, renderCovers, filterBooks };
