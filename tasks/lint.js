var shell = require("shelljs");

module.exports = function(grunt) {

  grunt.registerTask("lint", "Run the linter on src and tasks", function() {
    shell.exec("eslint src tasks --color");
  });

};