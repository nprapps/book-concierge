var $ = require("./lib/qsa");

var channel = require("./pubsub");

var filterList = $.one("form.filters");
var viewToggle = $.one(".view-controls");

var getFilters = function() {
  var years = $(".years input:checked", filterList).map(el => el.value * 1);
  var tags = $(".tags input:checked", filterList).map(el => el.value);
  var view = $.one(".view-controls input:checked").value;

  return { years, tags, view };
};

var setFilters = function(state) {
  var { years, tags, view} = state;

  // update form
  if (years && years.length) {
    years = new Set(years);
    $(".filters .years input").forEach(input => input.checked = years.has(input.value * 1));
  }

  tags = new Set(tags);
  $(".filters .tags input").forEach(input => input.checked = tags.has(input.value));
  
  if (view) {
    $.one(`.view-controls input[value="${view}"]`).checked = true;
  }

  return state;
}

var onChange = function() {
  var state = getFilters();
  channel.send("filterchange", state);
};

filterList.addEventListener("change", onChange);
viewToggle.addEventListener("change", onChange);

module.exports = { getFilters, setFilters }