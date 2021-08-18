var csv = require("csv");
var fs = require("fs").promises;
var util = require("util");

var { searchProductAPI, flattenAmazon } = require("./lib/amazon-product");

var csvStringify = util.promisify(csv.stringify);

module.exports = function(grunt) {

  var wait = delay => new Promise(ok => setTimeout(ok, delay));

  var filterBook = function(npr, amazon) {
    // check for matches in the authors
    var nprAuthorWords = new Set(npr.author.match(/\w+/g).filter(w => w != "and"));
    var amazonAuthorWords = new Set(amazon.author.match(/\w+/g));
    var count = 0;
    for (var word of nprAuthorWords) {
      if (amazonAuthorWords.has(word)) count++;
    }
    // must have at least two common "name" segments
    if (count < 2) return false;

    // check that a title substring matches
    var trimmedTitle = npr.title.toLowerCase().replace(/:.*?$/, "").trim();
    if (!amazon.title.toLowerCase().includes(trimmedTitle)) return false;
    
    // check that the year is the same or later
    if (amazon.published || amazon.released) {
      var d = amazon.published || amazon.released;
      if (d < npr.year) return false;
    }

    // otherwise, let it through
    return true;
  };

  var amazon = async function(books, year) {
    var output = [];

    for (var book of books) {
      console.log(`Product search: ${book.title}...`);
      var attempts = 0;
      while (attempts < 10) {
        attempts++;
        try {
          var results = await searchProductAPI({
            Keywords: book.title.replace(/:.*?$/, ""),
            Author: book.author.replace(/\(.*?\)/g, "")
          });
          console.log(`  ${results ? results.length : 0} results returned`)
          if (results && results.length) {
            results = results.map(flattenAmazon);
            var check = filterBook.bind(null, book);
            var [ passed ] = results.filter(check);
            if (passed) {
              var row = {
                id: book.id,
                ...passed
              }
              output.push(row);
            } else {
              console.log("  No satisfactory results found.");
            }
          }
          break;
        } catch (err) {
          console.log(`  Retrying...`);
        }
      }
      await wait(1000);
    }

    // write the output to a CSV
    var csv = await csvStringify(output, { header: true });
    try {
      await fs.mkdir("temp");
    } catch (err) {
      // fine if it exists
    }
    await fs.writeFile(`temp/amazon-${year}.generated.csv`, csv);
  }

  grunt.registerTask("amazon", function() {

    grunt.task.requires("shelve");

    var year = grunt.option("year");
    if (!year) {
      grunt.fail.fatal("Please specify --year");
    }

    var shelf = grunt.data.shelf.filter(b => b.year == year);

    // shelf = shelf.slice(0, 3);

    var done = this.async();

    amazon(shelf, year).then(done);

  });

}