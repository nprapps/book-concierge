var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");
var dot = require("./lib/dot");

var coverTemplate = dot.compile(require("./_cover.html"));
var listTemplate = dot.compile(require("./_list.html"));

var hash = require("./hash");
var bookService = require("./bookService");

var filterList = $.one("form.filters");
var mainPanel = $.one(".books");
var shelfContainer = $.one(".book-shelf");
var listContainer = $.one(".book-list");

var lazyload = require("./lazyLoading");

var renderBooks = async function() {
  var mode = $.one(".view-controls input:checked").value;
  mainPanel.setAttribute("data-mode", mode);

  var years = $(".filters .years input:checked").map(el => el.value * 1);
  var tags = $(".filters .tags input:checked").map(el => el.value);

  var books = await bookService.getCatalog(years);

  // clear out placeholders
  $(".placeholder", shelfContainer).forEach(e => e.parentElement.removeChild(e));
  books.forEach(function(b) {
    if (!b.element.parentElement) shelfContainer.appendChild(b.element);
  });

  var checkVisibility = function(b) {
    var visible = true;
    if (years.length && years.indexOf(b.year) == -1) visible = false;
    if (tags.length) {
      var matches = tags.some(t => b.tags.has(t));
      if (!matches) visible = false;
    }
    return visible;
  };

  if (mode == "covers") {
    books.forEach(function(b) {
      b.element.classList.toggle("hidden", !checkVisibility(b));
    });

    lazyload.reset();

  } else {
    // list view just renders in bulk
    var filtered = books.filter(checkVisibility);
    listContainer.innerHTML = listTemplate({ books: filtered });
  }
};

//update years if necessary
var params = hash.parse();
if (params.years) {
  $(".filters .years input").forEach(input => input.checked = params.years.indexOf(input.value) > -1);
}
renderBooks();
filterList.addEventListener("change", debounce(renderBooks));

var viewToggle = $.one(".view-controls");
viewToggle.addEventListener("change", renderBooks);