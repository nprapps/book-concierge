/*
Scrape endpoints for additional book metadata, storing this as a CSV for upload to the sheet.

You must run this task with a year parameter, it doesn't run for all sheets:

`grunt content scrape --year=2019`

You can also specify a particular scraper to run:

`grunt content scrape --year-2019 --source=goodreads`
*/

var axios = require("axios");
var cheerio = require("cheerio");
var csv = require("csv");
var fs = require("fs").promises;
var util = require("util");
var csvStringify = util.promisify(csv.stringify);

var wait = delay => new Promise(ok => setTimeout(ok, delay));

var goodreads = async function(books) {
  var output = {};
  var endpoint = "https://www.goodreads.com/search/index.xml";
  for (var book of books) {
    var url = new URL(endpoint);
    var params = {
      key: process.env.GOODREADS_API_KEY,
      q: book.isbn
    };
    for (var k in params) {
      url.searchParams.set(k, params[k]);
    }
    console.log(`Searching for "${book.title}" (${book.isbn}) on Goodreads...`);
    try {
      var response = await axios.get(url.toString());
      var $ = cheerio.load(response.data);
      var id = $("best_book id").eq(0).text();
      output[book.id] = id;
    } catch (err) {
      console.log(`Unable to find ${book.title}.`, err.message);
    }
  }
  return output;
};

var itunes = async function(books) {
  var output = {};
  var endpoint = "https://itunes.apple.com/search";
  for (var book of books) {
    await wait(5000);
    var url = new URL(endpoint);
    var params = {
      term: book.title.split(":")[0],
      country: "US",
      media: "ebook",
      attribute: "titleTerm",
      explicit: "No"
    };
    for (var k in params) {
      url.searchParams.set(k, params[k]);
    }
    console.log(`Searching for "${params.term}" on iTunes...`);
    try {
      var response = await axios.get(url.toString());
    } catch (err) {
      console.log(`Request to API failed: `, err.message);
      continue;
    }
    var idMatcher = /id(\d+)/;
    if (!response.data.resultCount) {
      console.log(`No iTunes results found for "${params.term}"`);
      continue;
    }
    var topResult = response.data.results[0];
    var itunesURL = topResult.trackViewUrl;
    var matched = itunesURL.match(idMatcher);
    if (!matched || !matched[1]) {
      console.log(`Unable to find an iTunes ID for "${params.term}" in "${topResult.trackViewUrl}`);
      continue;
    }
    output[book.id] = matched[1];
  }
  return output;
};

// different kind of scraper--finds links and excerpts
var seamus = async function(books) {
  var endpoint = "http://www.npr.org/";
  var source = "NPR.org";
  var output = [];
  for (var book of books) {
    var { title, seamus, id, year } = book;
    console.log(`Requesting "${title}" (${seamus}) from Seamus...`);
    if (!seamus) continue;
    var url = endpoint + seamus;
    try {
      var response = await axios.get(url);
      var $ = cheerio.load(response.data);
      var links = $(".storylist article.item .title a");
      links.each(function() {
        var link = this;
        var href = link.attribs.href;
        var text = $(link).text();
        if (text.match(/concierge/i) || href.match(/apps\.npr\.org/i)) return;
        output.push({
          year,
          id,
          book: title,
          source,
          text,
          url: href
        });
      });
    } catch (err) {
      console.log(`Request for ${seamus} failed.`)
    }
  }
  return output;
};

var scrape = async function(books, year, sources) {
  // load a CSV containing the existing scraped data
  // call each scraper, passing in the set of books
  // call the Seamus scraper to get its particular metadata
  // update and output CSVs with the updated metadata
  var scrapers = { goodreads, itunes };
  var results = {};

  sources = sources || Object.keys(scrapers);

  // the results object contains hashes of book IDs matched to resulting metadata
  for (var s of sources) {
    console.log(`Scraping source: ${s}`);
    results[s] = await scrapers[s](books)
  }

  // add IDs from scrapers that fetch those
  var ids = books.map(function(book) {
    var row = {
      id: book.id,
      isbn: book.isbn
    };
    ["goodreads", "itunes"].forEach(function(f) {
      if (results[f]) {
        row[f] = results[f][book.id];
      }
    });
    return row;
  });

  var idCSV = await csvStringify(ids, { header: true });
  await fs.writeFile(`data/ids-${year}.generated.csv`, idCSV);

  // output links and excerpts from seamus
  if (results.seamus) {
    var linksCSV = await csvStringify(results.seamus, { header: true });
    await fs.writeFile(`data/links-${year}.generated.csv`, linksCSV);
  }
};

module.exports = function(grunt) {

  grunt.registerTask("scrape", function() {
    grunt.task.requires("shelve");

    var done = this.async();

    var year = grunt.option("year");
    var sources = grunt.option("source");
    if (typeof sources == "string") {
      sources = [sources];
    }

    if (!year) {
      grunt.fail.fatal("Please provide a --year parameter to scrape");
    }

    var books = grunt.data.shelf.filter(b => b.year == year);

    scrape(books, year, sources).then(done);

  })
}