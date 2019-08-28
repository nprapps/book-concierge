var previous = {};

var parse = function() {
  var hash = window.location.hash.replace(/^#/, "");
  var parts = hash.split("&").map(p => p.split("="));
  var params = {};
  parts.filter(d => d[1]).forEach(([k, v]) => params[k] = decodeURIComponent(v) || true);
  return params;
};

var serialize = function(state) {
  var hash = [];
  for (var k in state) {
    var v = state[k];
    if (!v || (v instanceof Array && !v.length)) continue;
    hash.push([k, encodeURIComponent(v)].join("="));
  }
  return hash.join("&");
};

var subscribers = [];
var listen = function(callback) {
  subscribers.push(callback);
};

var onChange = function(e) {
  var params = parse();
  // quick diff to see if we should update listeners
  if (e && JSON.stringify(params) == JSON.stringify(previous)) return;
  subscribers.forEach(f => f(params, previous));
  previous = params;
}

window.addEventListener("hashchange", onChange);

setTimeout(onChange);

var update = function(state) {
  var merged = Object.assign({}, previous, state);
  // remove empty keys
  for (var k in merged) {
    if (!merged[k] || !merged[k].length) {
      delete merged[k];
    }
  }
  replace(merged);
};

var replace = function(state) {
  previous = state;
  window.location.hash = serialize(state);
};

module.exports = { parse, serialize, listen, update, replace };