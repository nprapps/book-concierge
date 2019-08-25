var { promisify } = require("util");
var imageSize = promisify(require("image-size"));

var shelve = async function(grunt) {
  var shelf = [];

  for (var row of grunt.data.json.years) {
    var { year, sheet } = row;
    var collection = grunt.data.json[sheet];
    for (var book of collection) {
      book.year = year;
      shelf.push(book);
      var isbn = String(book.isbn).trim();
      if (isbn.length == 9) isbn = "0" + isbn;
      book.isbn = isbn;
      try {
        book.dimensions = await imageSize(`src/assets/covers/${book.isbn}.jpg`);
      } catch (err) {
        book.dimensions = {};
      }
    };
    grunt.file.write(`build/${year}.json`, JSON.stringify(grunt.data.json[sheet]));
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