var fetch = require("node-fetch");
var fs = require("fs");
var qs = require("querystring");

var getEndpoint = query => `http://imagesa.btol.com/ContentCafe/Jacket.aspx?${qs.stringify(query)}`;

module.exports = function(grunt) {
  grunt.registerTask("covers", "Get cover images from Baker & Taylor", async function() {
    var done = this.async();
    grunt.file.mkdir("src/assets/covers");

    var books = ["9780345521859"];

    for (var isbn of books) {
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
    }

    done();
  });
};