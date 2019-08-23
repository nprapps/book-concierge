/*
TODO

- dynamically load by year
  - find a way to filter once, then again when the year is loaded?
  - alternatively, embrace a streaming model entirely
- add transitions on filtering
- add more precise image placeholder sizes
- add the modal on click
- fix a11y issues that have been introduced by lazy development
- add URL hash routing

*/

var $ = require("./lib/qsa");

var processFilters = async function() {
  var years = $(".filters .years input:checked").map(el => el.value * 1);
  var tags = $(".filters .tags input:checked").map(el => el.value);

  // lazy-load
  var books = await getBooks(years, processFilters);

  books.forEach(function(b) {
    var visible = true;
    if (years.length && years.indexOf(b.year) == -1) visible = false;
    if (tags.length) {
      var matches = tags.some(t => b.tags.has(t));
      if (!matches) visible = false;
    }
    b.element.classList.toggle("hidden", !visible);
  });
};

var bookCache = null;

var getBooks = async function() {
  if (!bookCache) {
    bookCache = new Promise(async function(ok) {
      var response = await fetch("./shelf.json");
      var data = await response.json();

      // process the data
      data.forEach(function(book) {
        book.tags = new Set(book.tags.split(/\|\s/g).map(t => t.trim()));
        var element = document.createElement("div");
        element.className = "book-container loading";
        element.innerHTML = `
    <img src="./assets/covers/${book.isbn}.jpg"
      class="cover"
      alt="${book.title}"
      loading="lazy">
    <div class="hover-data">
      <div class="cover-text">
        <b>${book.title}</b>
        <br>by ${book.author}
      </div>

      <div class="read-more">
        Read the full recommendation from ${book.reviewer}&nbsp;&raquo;
      </div>
    </div>
        `;
        book.element = element;
        container.appendChild(element);

        element.querySelector("img").addEventListener("load", () => element.classList.remove("loading"));
      });

      ok(data);
    });
  }
  return bookCache;
};

var controls = $.one("form.filters");
controls.addEventListener("change", processFilters);
var container = $.one(".book-shelf");
  
processFilters();