var { promisify } = require("util");
var imageSize = promisify(require("image-size"));

var normalizeTags = function(tags) {
  return tags.toLowerCase().replace(/['’]/g, "’");
};

var shelve = async function(grunt) {
  var shelf = [];

  for (var row of grunt.data.json.years) {
    var { year, sheet } = row;
    console.log("Shelving " + year);
    var collection = grunt.data.json[sheet];
    var index = [];
    var lookup = {};
    var links = grunt.data.json.links.filter(l => l.year == year);
    for (var book of collection) {
      // normalize and trim
      book.year = year;
      book.tags = normalizeTags(book.tags);
      book.text = grunt.template.renderMarkdown(book.text);
      "title author reviewer text".split(" ").forEach(p => book[p] = book[p].trim());
      var isbn = String(book.isbn).trim();
      if (isbn.length == 9) isbn = "0" + isbn;
      book.isbn = isbn;

      // join against links, reviewers
      book.links = links.filter(l => l.id == book.id);

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
      shelf.push(book);
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