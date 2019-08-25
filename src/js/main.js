/*
TODO

- add transitions on filtering
- add the modal on click
- fix a11y issues that have been introduced by lazy development
- add URL hash routing

*/

var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");

var yearsLoaded = new Set();
var books = [];

var controls = $.one("form.filters");
var container = $.one(".book-shelf");

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

var processFilters = async function() {
  var years = $(".filters .years input:checked").map(el => el.value * 1);
  var tags = $(".filters .tags input:checked").map(el => el.value);

  // lazy-load individual years
  await getBooks(years, processFilters);

  books.forEach(function(b) {
    var visible = true;
    if (years.length && years.indexOf(b.year) == -1) visible = false;
    if (tags.length) {
      var matches = tags.some(t => b.tags.has(t));
      if (!matches) visible = false;
    }
    b.element.classList.toggle("hidden", !visible);
  });

  if (!nativeLazy) onScroll();
};

var getBooks = async function(years) {
  var pending = years.filter(y => !yearsLoaded.has(y)).map(async function(y) {
    var response = await fetch(`./${y}.json`);
    var data = await response.json();

    // clear out placeholders
    $(".placeholder", container).forEach(e => e.parentElement.removeChild(e));

    yearsLoaded.add(y);

    // process the data
    data.forEach(function(book) {
      book.tags = new Set(book.tags.split(/\|\s/g).map(t => t.trim()));
      var element = document.createElement("div");
      element.className = "book-container";
      var aspect = "";
      if (book.dimensions.height) {
        aspect = `padding-bottom: ${book.dimensions.height / book.dimensions.width * 100}%`;
      }
      element.innerHTML = `
  <div class="cover-container" style="${aspect}">
    <img 
      ${nativeLazy ? "src" : "data-src"}="./assets/covers/${book.isbn}.jpg"
      class="cover"
      alt="${book.title}"
      decoding="async"
      loading="lazy"
      width="${book.dimensions.width}"
      height="${book.dimensions.height}"
      intrinsicsize="${book.dimensions.width}x${book.dimensions.height}"
    >
    </div>
  <div class="hover-data">
    <div class="cover-text">
      <b>${book.title}</b>
      <br>by ${book.author}
    </div>

    <div class="read-more">
      Read more &raquo;
    </div>
  </div>
      `;
      book.element = element;
      container.appendChild(element);
    });

    //reset lazy-loading images
    if (!nativeLazy) {
      lazyImages = $("[data-src]");
      onScroll();
    }

    return data;
  });
  
  var nested = await Promise.all(pending);
  books = books.concat(...nested);

};

processFilters();
controls.addEventListener("change", processFilters);
