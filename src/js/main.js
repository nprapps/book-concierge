var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");
var dot = require("./lib/dot");

var coverTemplate = dot.compile(require("./_cover.html"));
var listTemplate = dot.compile(require("./_list.html"));

var bookService = require("./bookService");

var filterList = $.one("form.filters");
var mainPanel = $.one(".books");
var shelfContainer = $.one(".book-shelf");
var listContainer = $.one(".book-list");

var nativeLazy = "loading" in Image.prototype;
var lazyImages = [];
if (!nativeLazy) {
  var onScroll = function() {
    if (!lazyImages.length) return;
    var loading = [];
    lazyImages = lazyImages.filter(function(img) {
      var bounds = img.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight * 2) return true;
      // otherwise, lazy-load it
      // we do this in a separate step to prevent reflow/layout issues
      loading.push(img);
    });
    loading.forEach(function(img) {
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
    });
  };
  window.addEventListener("scroll", debounce(onScroll, 300));
};

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

    if (!nativeLazy) {
      //reset lazy-loading images
      lazyImages = $("[data-src]");
      onScroll();
    }

  } else {
    // list view just renders in bulk
    var filtered = books.filter(checkVisibility);
    listContainer.innerHTML = listTemplate({ books: filtered });
  }
};

renderBooks();
filterList.addEventListener("change", renderBooks);

var viewToggle = $.one(".view-controls");
viewToggle.addEventListener("change", renderBooks);