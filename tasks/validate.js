var fs = require("fs");
var asyncFS = fs.promises;
var crypto = require("crypto");

var checksum = function(filename, callback) {
  return new Promise(function(ok) {
    var input = fs.createReadStream(filename);
    var hash = crypto.createHash("md5");
    hash.on("data", function(digest) {
      ok(digest.toString("hex"));
    });
    input.pipe(hash);
  });
}

module.exports = function(grunt) {

  var header = function(title) {
    console.log(`\n\n======== ${title} ========\n\n`);
  }

  var validate = async function() {

    header("No image available");

    // Check for book images that read as "NO IMAGE AVAILABLE"
    var coverFiles = await asyncFS.readdir("src/assets/covers");
    for (var f of coverFiles) {
      var file = `src/assets/covers/${f}`
      var stat = await asyncFS.stat(file);
      if (stat.size < 5000) {
        var digest = await checksum(file);
        grunt.log.error(`Cover ${f} is probably broken (MD5: ${digest})`);
      }
    }

    header("Missing covers");

    // Check which books are missing a cover image
    for (var book of grunt.data.shelf) {
      var { isbn, title, year } = book;
      var coverPath = `src/assets/covers/${isbn}.jpg`;
      try {
        await asyncFS.stat(coverPath);
      } catch (err) {
        console.error(`"${title}" (${year}) is missing its cover file.`);
      }
    }

    header("Reviewers");

    // Are all reviewers used somewhere?
    Object.keys(grunt.data.json.reviewers).forEach(function(reviewer) {
      var matched = grunt.data.shelf.some(book => book.reviewer == reviewer);
      if (!matched) grunt.log.error(`Reviewer ${reviewer} has no reviewed books.`);
    });

    header("Reviewed");

    // Do all books have a valid reviewer?
    var noReviewer = grunt.data.shelf.filter(b => !(b.reviewer in grunt.data.json.reviewers));
    noReviewer.forEach(b => grunt.log.error(`Book "${b.title}" (${b.year}) doesn't have a valid reviewer (${b.reviewer}).`));

    header("Links");

    // Are all links matchable against a book?
    grunt.data.json.links.forEach(function(link) {
      var linked = grunt.data.shelf.some(b => b.id == link.id && b.year == link.year);
      if (!linked) grunt.log.error(`Unreferenced link: ${link.source} on ${link.book} (${link.year}).`);
    });

  };

  grunt.registerTask("validate", "Checks book data for issues", function() {

    grunt.task.requires("shelve");

    var done = this.async();
    validate().then(done);

  });

}