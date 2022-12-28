book-concierge
======================================================

This news app is built on our `interactive template <https://github.com/nprapps/interactive-template>`_. Check the readme for that template for more details about the structure and mechanics of the app, as well as how to start your own project.

Getting started
---------------

To run this project you will need:

* Node installed (preferably with NVM or another version manager)
* The Grunt CLI (install globally with ``npm i -g grunt-cli``)
* Git

With those installed, you can then set the project up using your terminal:

1. Pull the code - ``git clone git@github.com:nprapps/book-concierge``
2. Enter the project folder - ``cd book-concierge``
3. Install dependencies from NPM - ``npm install``
4. Pull data and covers: ``grunt update``
5. Start the server - ``grunt``

**Optional flags**

* `port` - By default, this project runs on port 8000. Use this to specify a different port.
* `year` - Limit data processing to just a single year's worth of book data when developing locally

To start the local server and just include 2022's data, you would run `grunt --year=2022`


Running tasks
-------------

Like all interactive-template projects, this application uses the Grunt task runner to handle various build steps and deployment processes. To see all tasks available, run ``grunt --help``. ``grunt`` by itself will run the "default" task, which processes data and starts the development server. However, you can also specify a list of steps as arguments to Grunt, and it will run those in sequence. For example, you can just update the JavaScript and CSS assets in the build folder by using ``grunt bundle less``.

Common tasks that you may want to run include:

* ``sheets`` - updates local data from Google Sheets
* ``docs`` - updates local data from Google Docs
* ``google-auth`` - authenticates your account against Google for private files
* ``static`` - rebuilds files but doesn't start the dev server
* ``cron`` - runs builds and deploys on a timer (see ``tasks/cron.js`` for details)
* ``shelve`` - puts books into a common data structure, and builds out .json files in /build for AJAX
* ``publish`` - uploads files to the staging S3 bucket

  * ``publish:live`` uploads to production
  * ``publish:simulated`` does a dry run of uploaded files and their compressed sizes

* ``sync`` - gets/sets cover files from S3 (publish will not push them)
* ``validate`` - runs various integrity tests on the data. You can specify specific tests with the ``--check`` argument:

  * ``integrity`` - checks internal data on the book (IDs and other required fields)
  * ``tags`` - counts tags that have relatively few matches (i.e., are probably typos)
  * ``badCovers`` - finds cover images that are probably "NO IMAGE AVAILABLE"
  * ``missingCovers`` - identifies books that have no cover image at all
  * ``reviewers`` - checks that all reviewers have a book on the shelf somewhere
  * ``reviewed`` - checks that all books have a matching reviewer
  * ``links`` - identifies orphan links (no book on the shelf matches its metadata)

* ``amazon`` - downloads book metadata from Amazon
* ``scrape`` - downloads book metadata from Goodreads, iTunes and Bookshop
* ``covers`` - downloads book covers

#### Useful NPR-specific combinations of tasks:

**Book metadata**

Each of these tasks outputs a CSV in the `/temp/` folder in your project. Upload this file to a scratch sheet in the main project spreadsheet. Link it up to the main datasheet for this year via VLOOKUP. (Use the `id` column as the key to match them up.)

Neither of these tasks will return information for all of the books on the list. The Books team will need to fill in what's missing and validate what's returned.

* ``grunt content catalog amazon --year=2022`` - Pull ISBN, cover and image information
* ``grunt content catalog scrape --year=2022`` - Scrape book IDs for Goodreads, iTunes and Bookshop (run the `amazon` task first and link up the scratch sheets so you have the ISBNs to work with)

**Book covers**

This task will not be useful until you've completed the Amazon scrape and pulled the resulting info into this year's data sheet.

* ``grunt sheets content catalog covers --year=2022`` - Pull the latest data from the sheet, then download all the image files in the `image` column of this year's sheet. Images are stored in a `/temp/YYYY/` folder in your project. Copy these images to `/src/assets/synced/covers/`, then run ``grunt sync`` (or ``grunt sync:live``) to push them to the server.

Troubleshooting: If you sync up a cover and then it turns out to be the wrong cover, you may need to go into S3 and delete the old incorrect cover for the new one to sync up correctly. Sync sometimes doesn’t recognize it needs to push a file if a file already exists on S3 that is the same size/name.

Not a task, but related to this:

**Generating a book cover tile promo image**

Add `?screenshot=1` to the URL before the hash params (so, for example: https://apps.npr.org/best-books/?screenshot=1#view=covers&year=2020) to get a dense view of the photo grid. Take a screenshot using a Retina display, for maximum pixels.

You can adjust the density of the grid in [seed.less](https://github.com/nprapps/book-concierge/blob/master/src/css/seed.less#L40-L53).

Analytics
---------

The concierge tracks the following events:

* ``book-selected`` - user clicked through to book details
* ``view-mode`` - should be "cover" or "list"
* ``year-selected``
* ``tag-selected``
* ``clear-filters``
* ``fab-select`` - logs the number of selected tags in the mobile filter
* ``clicked-link`` - tracks links with a ``[data-track]`` attribute

Schema
------

The application expects to have access to a Google Doc with the text for the about page, as well as a workbook containing book data. There are four named sheets that the app expects to exist, with the following columns:

* **copy** - contains template text strings as key/value pairs

  * ``key``
  * ``value``

* **links** - related story links for each book

  * ``year`` - year for the book
  * ``id`` - id for the book
  * ``source`` - human-readable text for the link origin
  * ``text`` - link contents
  * ``url`` - link href value

* **reviewers** - reviewer metadata for all blurbs

  * ``key`` - reviewer name
  * ``title`` - reviewer title
  * ``link`` - reviewer home page or profile link

* **years** - index for actual book data

  * ``year`` - calendar year value
  * ``sheet`` - name of sheet containing books for that year
  * ``current`` - flag value to mark this as "checked" by default on page load

* Within the sheet for each year of book data, the following columns are expected:

  * ``id`` - primary key for the book, used for permalinks and table relationships
  * ``title``
  * ``reviewers`` - an array of comma separated names should match keys in the reviewer sheet
  * ``text`` - recommendation blurb
  * ``tags`` - filter categories, separated by ``|`` characters
  * ``isbn``
  * ``seamus``
  * ``itunes``
  * ``goodreads``
  * ``bookshop``

Troubleshooting
---------------

**Fatal error: Port 35739 is already in use by another process.**

The live reload port is shared between this and other applications. If you're running another interactive-template project or Dailygraphics Next, they may collide. If that's the case, use ``--reload-port=XXXXX`` to set a different port for the live reload server. You can also specify a port for the webserver with ``--port=XXXX``, although the app will automatically find the first available port after 8000 for you.
