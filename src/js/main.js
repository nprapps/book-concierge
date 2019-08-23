var $ = require("./lib/qsa");

var processFilters = function(books) {
  var years = $(".filters .years input:checked").map(el => el.value * 1);
  books.forEach(function(b) {
    var hidden = false;
    if (years.length) {
      if (years.indexOf(b.year) == -1) hidden = true;
    }
    b.element.classList.toggle("hidden", hidden);
  });
};

var init = async function() {
  var response = await fetch("./shelf.json");
  var data = await response.json();

  var years = new Set();
  var tags = new Set();

  data.forEach(function(item) {
    item.tags = item.tags.split(/\|\s/g).map(t => t.trim());
    item.tags.forEach(t => tags.add(t));
    years.add(item.year);
  });

  var controls = $.one("form.filters");
  $.one(".years", controls).innerHTML = Array.from(years).map(y => `
<input type="checkbox" value="${y}" name="year" id="year-${y}">
<label for="year-${y}">${y}</label>
  `).join("");

  $.one(".tags", controls).innerHTML = Array.from(tags).map(t => `
<input type="checkbox" value="${t}" name="tag" id="tag-${t}">
<label for="tag-${t}">${t}</label>
  `).join("");

  controls.addEventListener("click", () => processFilters(data));

  data = data.slice(0, 10);

  var container = $.one(".book-shelf");
  
  for (var book of data) {
    var element = document.createElement("div");
    element.className = "book-container";
    element.innerHTML = `
<img src="./assets/covers/${book.isbn}.jpg"
  class="cover"
  alt="${book.title}"
  loading="lazy">
<div class="hover-data">
  <div class="cover-text">
    ${book.title}
  </div>

  <div class="read-more">
    Read the full recommendation from ${book.reviewer} &raquo;
  </div>
</div>
    `;
    book.element = element;
    container.appendChild(element);
  }
}

init();