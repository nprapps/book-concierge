// temp task that places covers into the correct, dated sync folder
var fs = require("fs").promises;

module.exports = function(grunt) {

  grunt.registerTask("sortcovers", function() {

    grunt.task.requires("shelve");

    for (var book of grunt.data.shelf) {
      var coverPath = `src/assets/covers/${book.cover}.jpg`;
      var sortedPath = `src/assets/synced/covers/${book.year}/${book.cover}.jpg`;
      try {
        console.log(`Copying cover to ${sortedPath}...`)
        grunt.file.copy(coverPath, sortedPath);
      } catch (err) {
        console.log(`Couldn't copy file ${book.cover}.jpg ("${book.title}")`);
      }
    }

  });

};