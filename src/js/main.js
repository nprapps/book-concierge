/*
TODO

- add transitions on filtering
- add the modal on click
- fix a11y issues that have been introduced by lazy development
- add URL hash routing - cover/list, modal trigger, filter setup
- do not download covers that we already have

*/

var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");
var dot = require("./lib/dot");

var coverTemplate = dot.compile(require("./_cover.html"));
var listTemplate = dot.compile(require("./_list.html"));

var yearsLoaded = {};
var books = [];

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
    // lazy-load individual years
    await getBooks(years);

    books.forEach(function(b) {
      b.element.classList.toggle("hidden", !checkVisibility(b));
    });

    if (!nativeLazy) onScroll();
  } else {
    // list view just renders in bulk
    var filtered = books.filter(checkVisibility);
    listContainer.innerHTML = listTemplate({ books: filtered });
  }
};

var getBooks = async function(years) {
  var pending = years.map(function(y) {
    if (yearsLoaded[y]) {
      return yearsLoaded[y].then(() => []);
    };

    yearsLoaded[y] = new Promise(async function(ok, fail) {

      var response = await fetch(`./${y}.json`);
      var data = await response.json();

      // clear out placeholders
      $(".placeholder", shelfContainer).forEach(e => e.parentElement.removeChild(e));

      // process the data
      data.forEach(function(book) {
        book.tags = new Set(book.tags.split(/\|\s/g).map(t => t.trim()));
        var element = document.createElement("div");
        element.className = "book-container";
        element.innerHTML = coverTemplate({ book, nativeLazy });
        book.element = element;
        shelfContainer.appendChild(element);
      });

      //reset lazy-loading images
      if (!nativeLazy) {
        lazyImages = $("[data-src]");
        onScroll();
      }

      ok(data);
    });

    return yearsLoaded[y];

  });
  
  var nested = await Promise.all(pending);
  books = books.concat(...nested);
  books.sort(function(a, b) {
    if (a.title < b.title) return -1;
    if (a.title > b.title) return 1;
    return 0;
  });

};

renderBooks();
filterList.addEventListener("change", renderBooks);

var viewToggle = $.one(".view-controls");
viewToggle.addEventListener("change", renderBooks);