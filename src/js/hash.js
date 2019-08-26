var parse = function() {
  var hash = window.location.hash.replace(/^#/, "");
  var parts = hash.split("&").map(p => p.split("="));
  var params = {};
  parts.forEach(([k, v]) => params[k] = v || true);
  return params;
}

var subscribers = [];
var listen = function(callback) {
  subscribers.push(callback);
};

window.addEventListener("hashchange", function() {
  var params = parse();
  subscribers.forEach(f => f(params));
});

module.exports = { parse, listen };