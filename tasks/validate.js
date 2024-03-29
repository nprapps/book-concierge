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
  var yearOption = grunt.option("year");

  var header = title => console.log(`\n======== ${title} ========\n`);

  var tags = async function() {

    // count tag usage and note items with only a few items
    var counts = {};
    for (var book of grunt.data.shelf) {
      for (var t of book.tags) {
        if (!counts[t]) counts[t] = [];
        counts[t].push(book.year);
      }
    }
    var rareTags = Object.keys(counts).filter(t => counts[t].length < 20);
    if (!rareTags.length) return true;
    for (var t of rareTags) {
      console.log(`Tag "${t}" has very few books (used: ${counts[t].join(", ")})`);
    }
  };

  var integrity = async function() {
    var yearIDs = {};
    var passed = true;
    for (var book of grunt.data.shelf) {
      if (!book.id) {
        passed = false;
        console.log(`"${book.title}" (${book.year}) lacks an ID`);
        continue;
      }
      if (!yearIDs[book.year]) yearIDs[book.year] = new Set();
      if (yearIDs[book.year].has(book.id)) {
        passed = false;
        console.log(`Book #${book.id} in ${book.year} ("${book.title}") has a duplicate ID`);
      }
      yearIDs[book.year].add(book.id);
      "title text reviewers tags cover".split(" ").forEach(function(p) {
        if (!book[p]) {
          passed = false;
          console.log(`Book #${book.id} (${book.year}) is missing property "${p}"`);
        }
      })
    }
    return passed;
  };

  var missingCovers = async function() {
    // Check which books are missing a cover image
    var passed = true;
    for (var book of grunt.data.shelf) {
      var { cover, title, year } = book;
      var coverPath = `src/assets/synced/covers/${year}/${cover}.jpg`;
      try {
        await asyncFS.stat(coverPath);
      } catch (err) {
        passed = false;
        console.error(`"${title}" (${year}) is missing its cover file.`);
      }
    }
    return passed;
  };

  var reviewers = async function() {
    // Are all reviewers used somewhere?
    var passed = true;
    Object.keys(grunt.data.json.reviewers).forEach(function(reviewer) {
      var matched = grunt.data.shelf.some(book => (book.reviewers.includes(reviewer)));
      if (!matched) {
        console.log(`Reviewer ${reviewer} has no reviewed books.`);
        passed = false;
      }
    });
    return passed;
  };

  var reviewed = async function() {
    // Do all books have a valid reviewer?
    var noReviewer = grunt.data.shelf.filter(b => !(b.reviewers.every(r => r in grunt.data.json.reviewers)));
    noReviewer.forEach(b => console.log(`Book "${b.title}" (${b.year}) doesn't have a valid reviewer (${b.reviewers}).`));
    return !noReviewer.length;
  };

  var links = async function() {
    // Are all links accounted for?
    var unreferencedLinks = grunt.data.json.links.filter(link => !(grunt.data.shelf.some(b => b.id == link.id && b.year == link.year))) 
      // Only find unreferenced links from the specified year 
      .filter(link => yearOption ? link.year == yearOption : true);
    unreferencedLinks.forEach(link => console.log(`Unreferenced link: ${link.source} on ${link.book} (${link.year}).`))
    return !unreferencedLinks.length;
  };

  var validate = async function(tasks = null) {

    var validation = { integrity, tags, missingCovers, reviewers, reviewed, links };

    for (var k in validation) {
      if (!tasks || tasks.indexOf(k) > -1) {
        header(k);
        var pass = await validation[k]();
        if (pass) console.log(`Tests passed for ${k}`);
      }
    }

  };

  grunt.registerTask("validate", "Checks book data for issues", function() {

    grunt.task.requires("shelve");

    var done = this.async();
    validate(grunt.option("check")).then(done);

  });

}