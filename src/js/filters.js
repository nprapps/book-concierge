var $ = require("./lib/qsa");
var track = require("./lib/tracking");

var channel = require("./pubsub");

var yearFilters = $.one("fieldset.years");
var tagFilters = $.one("fieldset.tags");
var viewToggle = $.one(".view-controls");
var fabSelect = $.one(".fab-form select.tags");
var fabCount = $.one(".fab-count");
var fabClear = $.one(".fab-button.clear");

var yearTags = new Map([["debuts", 2026]]);
var tagFitsYear = (tag, year) => !yearTags.has(tag) || yearTags.get(tag) == year;
var tagLabel = tag => (yearTags.has(tag) ? `${yearTags.get(tag)} ${tag}` : tag);

var yearOptions = [];
$(".filters .tags input").concat($("option", fabSelect)).forEach(function(el) {
  if (!yearTags.has(el.value)) return;
  var label = el.tagName == "OPTION" ? el : el.nextElementSibling;
  label.textContent = `${yearTags.get(el.value)} ${label.textContent}`;
  if (el.tagName == "OPTION") {
    fabSelect.prepend(el);
    yearOptions.push(el);
  };
});

var getFilters = function() {
  var years = $(".years input:checked").map(el => el.value * 1);
  var year = years.pop();
  var tags = $(".tags input:checked", tagFilters).map(el => el.value);
  var view = $.one(".view-controls input:checked").value;

  return { year, tags, view };
};

var setFilters = function(state) {
  var { year, tags, view } = state;

  // update form
  if (year) {
    $("input", yearFilters).forEach(
      input => (input.checked = input.value * 1 == year)
    );

    $(".filters .tags input").forEach(function(input) {
      var display = tagFitsYear(input.value, year) ? "" : "none";
      input.style.display = input.nextElementSibling.style.display = display;
    });
    yearOptions.forEach(o => tagFitsYear(o.value, year) ? fabSelect.prepend(o) : o.remove());
  }
  if (tags) {
    fabCount.innerHTML = tags.length;

    tags = new Set(tags);
    $(".filters .tags input").forEach(
      input => (input.checked = tags.has(input.value))
    );
    $("option", fabSelect).forEach(
      option => (option.selected = tags.has(option.value))
    );
  }

  if (view) {
    $.one(`.view-controls input[value="${view}"]`).checked = true;
  }

  return state;
};

var clearFilters = function(e) {
  if (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
  track("clear-filters");
  setFilters({ tags: [] });
  onChange();
};

var enableFilters = function(enable) {
  [yearFilters, tagFilters].forEach(function(fieldset) {
    var inputs = $("input", fieldset);
    if (enable) {
      inputs.forEach(i => (i.disabled = false));
    } else {
      inputs.filter(i => !i.checked).forEach(i => (i.disabled = true));
    }
  });
};

var onChange = function(e) {
  var state = getFilters();
  channel.send("filterchange", state);
};

yearFilters.addEventListener("change", function(e) {
  var target = e.target;
  track("year-selected", target.value);
  onChange();
});

tagFilters.addEventListener("change", function(e) {
  var target = e.target;
  track("tag-selected", target.value);
  onChange();
});

viewToggle.addEventListener("change", function(e) {
  var target = e.target;
  track("view-mode", target.value);
  onChange();
});

$.one(".clear-filters").addEventListener("click", clearFilters);
fabClear.addEventListener("click", clearFilters);

fabSelect.addEventListener("change", function() {
  var select = event.target;
  var options = select.selectedOptions;
  var values = new Set();
  for (var i = 0; i < options.length; i++) {
    values.add(options[i].value);
  }
  track("fab-select", options.length);
  $(".filters .tags input").forEach(function(input) {
    input.checked = values.has(input.value);
  });
  var change = new Event("change");
  tagFilters.dispatchEvent(change);
});

module.exports = { getFilters, setFilters, enableFilters, tagFitsYear, tagLabel };
