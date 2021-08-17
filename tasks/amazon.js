
var { searchProductAPI } = require("./lib/amazon-product");

module.exports = function(grunt) {

  var wait = delay => new Promise(ok => setTimeout(ok, delay));

  var amazon = async function(books) {
    var output = [];

    for (var book of books) {
      var attempts = 0;
      while (attempts < 10) {
        attempts++;
        console.log(`Product search: ${book.title}...`);
        try {
          var results = await searchProductAPI({
            Keywords: book.title,
            Author: book.author
          });
          await wait(1000);
          break;
        } catch (err) {
          console.log(`Retrying...`);
        }
      }
    }
  }

  grunt.registerTask("amazon", function() {

    grunt.task.requires("shelve");

    var year = grunt.option("year");
    if (!year) {
      grunt.fail.fatal("Please specify --year");
    }

    var shelf = grunt.data.shelf.filter(b => b.year == year);

    shelf = shelf.slice(0, 10);

    var done = this.async();

    amazon(shelf).then(done);

  });

}