var fetch = require("node-fetch");
var fs = require("fs");
var qs = require("querystring");

var getEndpoint = query => `http://imagesa.btol.com/ContentCafe/Jacket.aspx?${qs.stringify(query)}`;

module.exports = function(grunt) {

  // grunt doesn't like top-level async functions
  var getCovers = async function(books) {

    var limit = 10;

    for (var i = 0; i < books.length; i += limit) {
      var batch = books.slice(i, i + limit);
      var requests = batch.map(async function(isbn) {
        var params = {
          Value: isbn,
          UserID: process.env.BAKER_TAYLOR_API_USERID,
          Password: process.env.BAKER_TAYLOR_API_PASSWORD,
          Return: "T",
          Type: "L"
        }
        var response = await fetch(getEndpoint(params));
        var contents = await response.buffer();
        grunt.file.write(`src/assets/covers/${isbn}.jpg`, contents);
      });
      await Promise.all(requests);
    }
  };

  grunt.registerTask("covers", "Get cover images from Baker & Taylor", function() {

    var done = this.async();

    grunt.task.requires("shelve");

    grunt.file.mkdir("src/assets/covers");

    // get all books from all sheets
    var books = grunt.data.shelf.map(b => b.isbn);
    getCovers(books).then(done);
    
  });
};