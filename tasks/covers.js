var fetch = require("node-fetch");
var fs = require("fs").promises;
var qs = require("querystring");
var cheerio = require("cheerio");

var getEndpoint = query => `http://images.btol.com/ContentCafe/Jacket.aspx?${qs.stringify(query)}`;

module.exports = function(grunt) {

  var wait = function(delay) {
    return new Promise(ok => setTimeout(ok, delay));
  };

  // grunt doesn't like top-level async functions
  var getCovers = async function(books) {

    var limit = 10;

    for (var i = 0; i < books.length; i += limit) {
      console.log(`Requesting books ${i}-${i + limit}`);
      var batch = books.slice(i, i + limit);
      var requests = batch.map(async function(book) {
        var { isbn, seamus } = book;
        if (!isbn) return;
        var path = `src/assets/covers/${isbn}.jpg`
        if (grunt.file.exists(path)) return true;
        var params = {
          Value: isbn,
          UserID: process.env.BAKER_TAYLOR_API_USERID,
          Password: process.env.BAKER_TAYLOR_API_PASSWORD,
          Return: "T",
          Type: "L"
        }
        var response = await fetch(getEndpoint(params));
        var contents = await response.buffer();
        // if it's too small, let's get it from Seamus instead
        if (contents.length < 5000) {
          console.log(`Baker & Taylor bailed on ${isbn}, pulling Seamus image...`);
          response = await fetch(`https://npr.org/books/titles/${seamus}`);
          var page = await response.text();
          var $ = cheerio.load(page);
          var tag = $(".bucketwrap.book .img, .bucketwrap.bookedition .img");
          if (!tag.length) {
            console.log(`Unable to load an image from Seamus for "${book.title}" (${book.year})`);
            return;
          }
          var src = tag[0].attribs["data-original"] || tag[0].attribs.src;
          var image = await fetch(src);
          contents = await image.buffer();
        }
        await fs.writeFile(path, contents);
        await wait(1000);
      });
      await Promise.all(requests);
    }
  };

  grunt.registerTask("covers", "Get cover images from Baker & Taylor", function() {

    var done = this.async();

    grunt.task.requires("shelve");

    grunt.file.mkdir("src/assets/covers");

    // get all books from all sheets
    var books = grunt.data.shelf;
    getCovers(books).then(done);
    
  });
};