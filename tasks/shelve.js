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
      });
    }

    grunt.data.shelf = shelf;

  });

}