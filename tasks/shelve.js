module.exports = function(grunt) {

  grunt.registerTask("shelve", "Assemble books from individual years", function() {

    grunt.task.requires("json");

    var shelf = [];

    for (var row of grunt.data.json.years) {
      var { year, sheet } = row;
      var collection = grunt.data.json[sheet];
      collection.forEach(function(book) {
        book.year = year;
        shelf.push(book);
        var isbn = String(book.isbn).trim();
        if (isbn.length == 9) isbn = "0" + isbn;
        book.isbn = isbn;
      });
      grunt.file.write(`build/${year}.json`, JSON.stringify(grunt.data.json[sheet]));
    }

    grunt.data.shelf = shelf;

    grunt.file.write("build/shelf.json", JSON.stringify(shelf, null, 2));

  });

}