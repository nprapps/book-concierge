var { promisify } = require("util");
var imageSize = promisify(require("image-size"));

var normalizeTags = function(tags) {
  return tags.toLowerCase().replace(/['’]/g, "’");
};

var shelve = async function(grunt) {
  var shelf = [];

  for (var row of grunt.data.json.years) {
    var { year, sheet } = row;
    var collection = grunt.data.json[sheet];
    var index = [];
    var lookup = {};
    for (var book of collection) {
      book.year = year;
      book.tags = normalizeTags(book.tags);
      shelf.push(book);
      var isbn = String(book.isbn).trim();
      if (isbn.length == 9) isbn = "0" + isbn;
      book.isbn = isbn;
      var indexEntry = {
        title: book.title,
        author: book.author,
        dimensions: {},
        isbn: book.isbn,
        tags: book.tags
      };
      try {
        var size = await imageSize(`src/assets/covers/${book.isbn}.jpg`);
        indexEntry.dimensions = {
          width: size.width,
          height: size.height
        };
      } catch (_) { }
      index.push(indexEntry);
      lookup[book.isbn] = book;
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