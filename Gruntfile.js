module.exports = function(grunt) {
  //load tasks
  grunt.loadTasks("./tasks");

  grunt.registerTask("update", "Download content from remote services", function(target = "stage") {
    grunt.task.run(["sheets", "docs", `sync:${target}`]);
  });
  grunt.registerTask("content", "Load content from data files", [
    "state",
    "json",
    "csv",
    "markdown",
    "archieml",
    "shelve",
    "validate"
  ]);
  grunt.registerTask("template", "Build HTML from content/templates", [
    "content",
    "build"
  ]);
  grunt.registerTask("static", "Build all files", [
    "copy",
    "bundle",
    "less",
    "template"
  ]);
  grunt.registerTask("default", ["clean", "static", "connect:dev", "watch"]);
  grunt.registerTask("quick", "Build without assets", [
    "clean",
    "bundle",
    "less",
    "template"
  ]);
  grunt.registerTask("unclean", "Start dev server without a clean build", ["connect:dev", "watch"])
};
