var $ = require("./lib/qsa");
var bookService = require("./bookService");
var dot = require("./lib/dot");
var hash = require("./hash");
var lazyload = require("./lazyLoading");

var bookTemplate = dot.compile(require("./_book.html"));
var listTemplate = dot.compile(require("./_list.html"));

var coverContainer = $.one(".catalog-covers");
var listContainer = $.one(".catalog-list");
var bookPanel = $.one(".book-detail");

// single book rendering
var renderBook = async function(year, isbn) {
  var book = await bookService.getDetail(year, isbn);
  bookPanel.innerHTML = bookTemplate(book);
  document.body.setAttribute("data-mode", "book");
  var h2 = $.one("h2", bookPanel);
  h2.focus();
};

// check a given book against the filters
var checkVisibility = function(b, years, tags) {
  var visible = true;
  if (years.length && years.indexOf(b.year) == -1) visible = false;
  if (tags.length) {
    var matches = tags.some(t => b.tags.has(t));
    if (!matches) visible = false;
  }
  return visible;
};

var renderCovers = function(books, years, tags) {
  // get first
  var firstPositions = new Map();
  books.forEach(b => firstPositions.set(b, b.element.getBoundingClientRect()));
  // mutate - change visibility
  var remaining = books.filter(function(b) {
    b.element.classList.remove("shuffling");
    var visibility = checkVisibility(b, years, tags);
    b.element.classList.toggle("hidden", !visibility);
    return visibility;
  });
  // get last from the survivors
  var lastPositions = new Map();
  remaining.forEach(b => lastPositions.set(b, b.element.getBoundingClientRect()));
  // visible set:
  // - was in the viewport then
  // - is the viewport now
  var visibleSet = new Set();
  [firstPositions, lastPositions].forEach(map => map.forEach(function(bounds, b) {
    if (bounds.top < window.innerHeight && bounds.bottom > 0) {
      visibleSet.add(b);
    }
  }));
  // invert
  visibleSet.forEach(function(book) {
    var { element } = book;
    var first = firstPositions.get(book);
    var last = lastPositions.get(book);
    if (!last) return;
    if (first.top == last.top && first.left == last.left) return;
    if (first.width == 0 && first.height == 0) return;
    var dx = first.left - last.left;
    var dy = first.top - last.top;
    element.style.transform = `translateX(${dx}px) translateY(${dy}px) translateZ(0)`;
  });
  // play
  requestAnimationFrame(() => visibleSet.forEach(function(b) {
    b.element.classList.add("shuffling");
    b.element.style.transform = ""
    // force distant covers to reload
    setTimeout(lazyload.reset, 100);
    setTimeout(lazyload.reset, 500);
    setTimeout(lazyload.reset, 1000);
  }));
};

// this should probably be moved to module that owns its container
var renderCatalog = async function(years, tags, view = "covers") {
  var books = await bookService.getCatalog(years);

  // clear out placeholders
  $(".placeholder", coverContainer).forEach(e => e.parentElement.removeChild(e));

  // add new books (if any)
  books.forEach(function(b) {
    if (!b.element.parentElement) coverContainer.appendChild(b.element);
  });

  // render lazily
  if (view == "covers") {
    renderCovers(books, years, tags);
  } else {
    // list view just renders in bulk
    var filtered = books.filter(b => checkVisibility(b, years, tags));
    listContainer.innerHTML = listTemplate({ books: filtered });
    lazyload.reset();
  }

};

module.exports = { renderCatalog, renderBook };