/*

This expects the sheet to have metadata for "image" (meaning the Amazon image
endpoint) and "cover" (meaning the filename to save).

*/

var fetch = require("node-fetch");
var fs = require("fs").promises;

module.exports = function(grunt) {

  var wait = function(delay) {
    return new Promise(ok => setTimeout(ok, delay));
  };

  // grunt doesn't like top-level async functions
  var getCovers = async function(books, year) {

    var limit = 10;

    grunt.file.mkdir(`temp/${year}`)

    for (var i = 0; i < books.length; i += limit) {
      console.log(`Requesting books ${i}-${i + limit}`);
      var batch = books.slice(i, i + limit);
      var requests = batch.map(async function(book) {
        var { image, cover } = book;
        if (!image) return;
        var path = `temp/${year}/${cover}.jpg`
        if (grunt.file.exists(path)) return true;
        var response = await fetch(image);
        var contents = await response.buffer();
        await fs.writeFile(path, contents);
        await wait(1000);
      });
      await Promise.all(requests);
    }
  };

  grunt.registerTask("covers", "Get cover images from Amazon", function() {

    var done = this.async();

    grunt.task.requires("shelve");

    grunt.file.mkdir("src/assets/covers");

    // get all books from all sheets
    var books = grunt.data.shelf;
    var year = grunt.option("year");
    if (!year) {
      grunt.fail.fatal("Please specify --year");
    }
    getCovers(books, year).then(done);
    
  });
};