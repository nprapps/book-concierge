// this is an in-memory cache for fetches
var cache = {};
var request = function(endpoint) {
  if (!cache[endpoint]) {
    cache[endpoint] = fetch(endpoint)
      .then(async function(response) {
        if (response.status >= 400) {
          delete cache[endpoint];
          throw `HTTP ${response.status}`;
        }
        return response.json();
      })
      .catch(function() {
        delete cache[endpoint];
        throw `Failed fetch for ${endpoint}`;
      });
  }
  return cache[endpoint];
};

var details = {};

var facade = {
  getYear: async function(year, sorting) {
    var pending = request(`./${year}.json`);
    // preload the detail for this year
    request(`./${year}-detail.json`);

    var index = await pending;
    index.forEach(function(book) {
      book.year = year;
      if (book.tags instanceof Array) book.tags = new Set(book.tags);
      if (!book.shuffle) book.shuffle = Math.random();
      book.sortingTitle = book.title.replace(/^the\s+/i, "");
    });
    var copy = index.slice();
    if (sorting == "list") {
      copy.sort((a, b) => {
        if (a.sortingTitle < b.sortingTitle) return -1;
        if (b.sortingTitle < a.sortingTitle) return 1;
        return 0;
      });
    } else {
      copy.sort((a, b) => a.shuffle - b.shuffle);
    }
    return copy;
  },

  getCatalog: async function(hint) {
    var pending = hint.map(y => facade.getYear(y));
    var indices = await Promise.all(pending);
    return [].concat(...indices);
  },

  getDetail: async function(year, id) {
    var response = request(`${year}-detail.json`);
    // if we came straight from a book, prep the index
    request(`./${year}.json`);
    var lookup = await response;
    return lookup[id];
  }
};

module.exports = facade;
