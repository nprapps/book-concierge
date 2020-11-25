var { promisify } = require("util");
var imageSize = promisify(require("image-size"));
var { typogrify } = require("typogr");

var normalizeTags = function(tags) {
  return tags
    .toLowerCase()
    .replace(/['’]/g, "’")
    .split(/\s*\|\s*/)
    .map(t => t.trim())
    .filter(s => s);
};

var shelve = async function(grunt) {
  var shelf = [];

  var oneYear = grunt.option("year");

  for (var row of grunt.data.json.years) {
    var { year, sheet } = row;
    if (oneYear && year != oneYear) continue;
    console.log("Shelving " + year);
    var collection = grunt.data.json[sheet];
    var index = [];
    var lookup = {};
    var links = grunt.data.json.links.filter(l => l.year == year);
    for (var book of collection) {
      // normalize and trim
      book.year = year;
      book.tags = normalizeTags(book.tags || "");
      book.text = grunt.template.renderMarkdown(book.text || "");
      "title author reviewers text".split(" ").forEach(p => book[p] = book[p].toString().trim());
      if (book.isbn) {
        var isbn = String(book.isbn).trim();
        if (isbn.length == 9) isbn = "0" + isbn;
        book.isbn = isbn;

        // create 13-digit ISBN
        if (book.isbn.length == 13) {
          book.isbn13 = book.isbn;
          var isbn = book.isbn.slice(3, 12)
          var digits = isbn.split("").map(Number);
          var check = 0;
          for (var i = 0; i < digits.length; i++) {
            check += (i + 1) * digits[i];
          }
          book.isbn10 = isbn + (check % 11);
        } else {
          var isbn10 = book.isbn;
          var isbn13 = "978" + isbn10.slice(0, 9);
          var odds = [1, 3, 5, 7, 9, 11].map(n => Number(isbn13[n])).reduce((acc, n) => n + acc) * 3;
          var evens = [0, 2, 4, 6, 8, 10].map(n => Number(isbn13[n])).reduce((acc, n) => n + acc);
          var remainder = (odds + evens) % 10;
          var check = remainder ? 10 - remainder : 0;
          book.isbn13 = isbn13 + check;
          book.isbn10 = isbn10;
        }
      }

      // covers are usually--but not always--an ISBN
      // for non-ISBN covers, name them as `${year}${id}X.jpg`
      var cover = String(book.cover).trim();
      if (cover.length == 9) cover = "0" + cover;
      book.cover = cover;

      // formats multiple reviewers into a comma seperated array
      book.reviewers = book.reviewers.split(/,\s*/);

      // join against links, reviewers
      book.links = links.filter(l => l.id == book.id);

      // add smart quotes to the link text
      book.links.forEach(l => l.text = typogrify(l.text));

      var indexEntry = {
        title: book.title,
        author: book.author,
        dimensions: {},
        cover: book.cover,
        tags: book.tags,
        id: book.id
      };
      try {
        var size = await imageSize(`src/assets/covers/${book.cover}.jpg`);
        indexEntry.dimensions = {
          width: size.width,
          height: size.height
        };
      } catch (_) { }
      shelf.push(book);
      index.push(indexEntry);
      lookup[book.id] = book;
    };
    grunt.file.write(`build/${year}.json`, JSON.stringify(index, null, 2));
    grunt.file.write(`build/${year}-detail.json`, JSON.stringify(lookup, null, 2));
  }

  grunt.data.shelf = shelf;

  grunt.file.write("build/shelf.json", JSON.stringify(shelf, null, 2));
}


module.exports = function(grunt) {

  grunt.registerTask("shelve", "Assemble books from individual years", function() {

    grunt.task.requires("json");

    var done = this.async();

    shelve(grunt).then(done);

  });

}