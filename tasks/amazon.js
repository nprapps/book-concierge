
var { searchProductAPI } = require("./lib/amazon-product");

module.exports = function(grunt) {

  var wait = delay => new Promise(ok => setTimeout(ok, delay));

  // using this instead of optional chaining in case of older Node versions
  // after v14, easier to just write result.ItemInfo?.Title?.DisplayValue
  var prop = function(target, key, fallback) {
    var path = key.split(".");
    while (path.length) {
      var segment = path.shift();
      if (!(segment in target)) return fallback;
      target = target[segment];
    }
    return target;
  }

  var flattenAmazon = function(result) {
    var p = prop.bind(null, result);
    return {
      title: p("ItemInfo.Title.DisplayValue"),
      isbn: p("ItemInfo.ExternalIds.ISBNs.DisplayValues", [])[0],
      image: p("Images.Primary.Large.URL"),
      author: p("ItemInfo.ByLineInfo.Contributors", []).map(d => d.Name),
      publisher: p("ItemInfo.ByLineInfo.Brand.DisplayValue") || p("ByLineInfo.Manufacturer.DisplayValue"),
      language: p("ItemInfo.ContentInfo.Languages.DisplayValues", []).map(d => d.DisplayValue)[0],
      published: new Date(p("ItemInfo.ContentInfo.PublicationDate.DisplayValue")),
      released: new Date(p("ItemInfo.ProductInfo.ReleaseDate.DisplayValue")),
      asin: result.ASIN,
      url: result.DetailPageURL
    }
  }

  var amazon = async function(books) {
    var output = [];

    for (var book of books) {
      var attempts = 0;
      while (attempts < 10) {
        attempts++;
        console.log(`Product search: ${book.title}...`);
        try {
          var results = await searchProductAPI({
            Keywords: book.title,
            Author: book.author
          });
          if (results) {
            console.log(results.map(flattenAmazon));
          }
          break;
        } catch (err) {
          console.log(`Retrying...`);
        }
        await wait(1000);
      }
    }
  }

  grunt.registerTask("amazon", function() {

    grunt.task.requires("shelve");

    var year = grunt.option("year");
    if (!year) {
      grunt.fail.fatal("Please specify --year");
    }

    var shelf = grunt.data.shelf.filter(b => b.year == year);

    shelf = shelf.slice(0, 3);

    var done = this.async();

    amazon(shelf).then(done);

  });

}