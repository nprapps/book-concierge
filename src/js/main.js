var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");
var dot = require("./lib/dot");

var coverTemplate = dot.compile(require("./_cover.html"));
var listTemplate = dot.compile(require("./_list.html"));
var bookTemplate = dot.compile(require("./_book.html"));

var hash = require("./hash");
var bookService = require("./bookService");

var filterList = $.one("form.filters");
var mainPanel = $.one(".catalog");
var coverContainer = $.one(".catalog-covers");
var listContainer = $.one(".catalog-list");
var bookPanel = $.one(".book-detail")

var lazyload = require("./lazyLoading");

var renderBook = async function(year, isbn) {
  var book = await bookService.getDetail(year, isbn);
  bookPanel.innerHTML = bookTemplate(book);
  document.body.setAttribute("data-mode", "book");
  var h2 = $.one("h2", bookPanel);
  h2.focus();
};

var renderCatalog = async function() {
  var view = $.one(".view-controls input:checked").value;
  document.body.setAttribute("data-mode", view);

  var years = $(".filters .years input:checked").map(el => el.value * 1);
  var tags = $(".filters .tags input:checked").map(el => el.value);

  hash.update({
    view,
    book: false,
    year: false,
    tags: tags.join(","),
    years: years.join(",")
  })

  var books = await bookService.getCatalog(years);

  // clear out placeholders
  $(".placeholder", coverContainer).forEach(e => e.parentElement.removeChild(e));

  // add new books (if any)
  books.forEach(function(b) {
    if (!b.element.parentElement) coverContainer.appendChild(b.element);
  });

  // check a given book against the filters
  var checkVisibility = function(b) {
    var visible = true;
    if (years.length && years.indexOf(b.year) == -1) visible = false;
    if (tags.length) {
      var matches = tags.some(t => b.tags.has(t));
      if (!matches) visible = false;
    }
    return visible;
  };

  // render lazily
  if (view == "covers") {
    // get first
    var firstPositions = new Map();
    books.forEach(b => firstPositions.set(b, b.element.getBoundingClientRect()));
    // mutate - change visibility
    books.forEach(function(b) {
      b.element.classList.remove("shuffling");
      b.element.classList.toggle("hidden", !checkVisibility(b));
    });
    // get last
    var lastPositions = new Map();
    books.forEach(b => lastPositions.set(b, b.element.getBoundingClientRect()));
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
      if (first.top == last.top && first.left == last.left) return;
      if (first.width == 0 && first.height == 0) return;
      element.style.transform = `translateX(${first.left - last.left}px) translateY(${first.top - last.top}px)`;
    });
    // play
    var reflow = coverContainer.offsetWidth;
    visibleSet.forEach(function(b) {
      b.element.classList.add("shuffling");
      b.element.style.transform = ""
    });
  } else {
    // list view just renders in bulk
    var filtered = books.filter(checkVisibility);
    listContainer.innerHTML = listTemplate({ books: filtered });
  }

  lazyload.reset();
};

//update years if necessary
var params = hash.parse();
if (params.years) {
  $(".filters .years input").forEach(input => input.checked = params.years.indexOf(input.value) > -1);
}

var debouncedRender = debounce(renderCatalog);
filterList.addEventListener("change", debouncedRender);

var viewToggle = $.one(".view-controls");
viewToggle.addEventListener("change", debouncedRender);

// handle changes from the hash router
var reroute = function(params, previous) {
  var { view, tags, years, book, year } = params;
  if (book) {
    // show the book dialog
    renderBook(year, book);
  } else {
    // update form and render books
    if (years) {
      years = new Set(years.split(","));
      $(".filters .years input").forEach(input => input.checked = years.has(input.value));
    }

    if (tags) {
      tags = new Set(tags.split(","));
      $(".filters .tags input").forEach(input => input.checked = tags.has(input.value));
    }

    if (view) {
      $.one(`.view-controls input[value="${view}"]`).checked = true;
    }

    debouncedRender();
    // restore scroll position if necessary?
  }
};

// trigger first render/update from the hash params
hash.listen(reroute);