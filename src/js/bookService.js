var dot = require("./lib/dot");
var coverTemplate = dot.compile(require("./_cover.html"));

var cache = {};
var request = function(endpoint) {
  if (!cache[endpoint]) {
    cache[endpoint] = fetch(endpoint).then(response => response.json());
  }
  return cache[endpoint];
};

var indices = {};
var details = {};
var catalog = [];

var facade = {
  getYear: function(year) {
    if (!indices[year]) {
      var pending = request(`./${year}.json`);
      // preload the detail for this year
      request(`./${year}-detail.json`);

      indices[year] = pending.then(function(index) {
        // process the data
        index.forEach(function(book) {
          book.year = year;
          book.tags = new Set(book.tags.split(/\|\s/g).map(t => t.trim()));
          var element = document.createElement("div");
          element.className = "book-container";
          element.innerHTML = coverTemplate({ book });
          book.element = element;
          catalog.push(book);
        });
        return index;
      });
    }
    return indices[year];
  },

  getCatalog: async function(hint) {
    var pending = hint.map(y => facade.getYear(y));
    await Promise.all(pending);
    return catalog;
  },

  getDetail: async function(year, isbn) {
    var lookup = await request(`${year}-detail.json`);
    return lookup[isbn];
  }
};

module.exports = facade;