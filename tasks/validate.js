module.exports = function(grunt) {

  var validate = async function() {

    // TODO: Check for book images that read as "NO IMAGE"

    // Are all reviewers used somewhere?
    Object.keys(grunt.data.json.reviewers).forEach(function(reviewer) {
      var matched = grunt.data.shelf.some(book => book.reviewer == reviewer);
      if (!matched) grunt.log.error(`Reviewer ${reviewer} has no reviewed books.`);
    });

    // Do all books have a valid reviewer?
    var noReviewer = grunt.data.shelf.filter(b => !(b.reviewer in grunt.data.json.reviewers));
    noReviewer.forEach(b => grunt.log.error(`Book "${b.title}" doesn't have a valid reviewer.`));

    // Are all links matchable against a book?
    grunt.data.json.links.forEach(function(link) {
      var linked = grunt.data.shelf.some(b => b.title == link.book);
      if (!linked) grunt.log.error(`Unreferenced link: ${link.source} on ${link.book}.`);
    });

  };

  grunt.registerTask("validate", "Checks book data for issues", function() {

    grunt.task.requires("shelve");

    var done = this.async();
    validate().then(done);

  });

}