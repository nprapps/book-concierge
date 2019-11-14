var cache = {};
var request = function(endpoint) {
  if (!cache[endpoint]) {
    cache[endpoint] = fetch(endpoint).then(response => response.json());
  }
  return cache[endpoint];
};

var processBook = function(book, year) {
  book.shuffle = Math.random();
  book.year = year;
  book.tags = new Set(book.tags.split(/\s*\|\s*/g).map(t => t.trim()));
}

var indices = {};
var details = {};
var catalog = [];

var facade = {
  getYear: function(year) {
    if (!indices[year]) {
      var pending = request(`./${year}.json`);
      document.body.classList.add("loading");
      // preload the detail for this year
      request(`./${year}-detail.json`);

      indices[year] = pending.then(function(index) {
        document.body.classList.remove("loading");
        // process the data
        index.forEach(book => processBook(book, year));
        //randomize elements
        index = index.sort((a, b) => a.shuffle - b.shuffle);
        catalog = catalog.concat(index);
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

  getDetail: async function(year, id) {
    var lookup = details[year];
    // if we came straight from a book, prep the index
    request(`./${year}.json`);
    if (!lookup) {
      lookup = await request(`${year}-detail.json`);
      for (var k in lookup) {
        processBook(lookup[k], year);
      }
      details[year] = lookup;
    }
    return lookup[id];
  }
};

module.exports = facade;