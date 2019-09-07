var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");
var dot = require("./lib/dot");

var coverTemplate = dot.compile(require("./_cover.html"));
var bookTemplate = dot.compile(require("./_book.html"));

var hash = require("./hash");
var bookService = require("./bookService");

var filterList = $.one("form.filters");
var bookPanel = $.one(".book-detail");


var renderBook = async function(year, isbn) {
  var book = await bookService.getDetail(year, isbn);
  bookPanel.innerHTML = bookTemplate(book);
  document.body.setAttribute("data-mode", "book");
  var h2 = $.one("h2", bookPanel);
  h2.focus();
};

//update years if necessary
var params = hash.parse();
if (params.years) {
  $(".filters .years input").forEach(input => input.checked = params.years.indexOf(input.value) > -1);
}

var { renderCatalog } = require("./catalog");
var debouncedRender = debounce(renderCatalog);
filterList.addEventListener("change", debouncedRender);

var viewToggle = $.one(".view-controls");
viewToggle.addEventListener("change", debouncedRender);

// handle changes from the hash router
var reroute = async function(params, previous) {
  var { view, tags, years, book, year } = params;
  if (book) {
    // show the book dialog
    renderBook(year, book);
  } else {
    // update form and render books
    if (years) {
      years = new Set(years.split("|"));
      $(".filters .years input").forEach(input => input.checked = years.has(input.value));
    }

    tags = new Set(tags ? tags.split("|") : undefined);
    $(".filters .tags input").forEach(input => input.checked = tags.has(input.value));

    if (view) {
      $.one(`.view-controls input[value="${view}"]`).checked = true;
    }

    await debouncedRender();

    // restore scroll position if necessary?
    if (previous && previous.book) {
      var clicked = $.one(`[data-isbn="${previous.book}"]`);
      if (clicked) clicked.focus();
    }
  }
};

// trigger first render/update from the hash params
hash.listen(reroute);