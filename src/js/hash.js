var channel = require("./pubsub");

var definitions = {};
var previous = {};

/*
define() lets you set the shape of hash parameters:

`key: []` will force the parameter to be returned as an array
`key: Type` casts the key to a constructor of Type (i.e., Number, String)
`key: [Type]` casts to an array of Type
*/

var define = function(defs) {
  Object.assign(definitions, defs);
};

// turn a URL hash into an object based on the defined types
var parse = function() {
  var hash = window.location.hash.replace(/^#/, "");
  var parts = hash.split("&").map(p => p.split("="));
  var params = {};
  parts
    .filter(d => d[1])
    .forEach(
      ([k, v]) =>
        (params[k] = decodeURIComponent(v.replace(/\+/g, " ")) || true)
    );
  for (var k in definitions) {
    var def = definitions[k];
    var value = params[k];
    if (!value) continue;
    if (def instanceof Array) {
      var [cast = String] = def;
      params[k] = value ? value.split("|").map(cast) : [];
    } else if (value) {
      var cast = def || String;
      params[k] = cast(value);
    }
  }
  return params;
};

// turn an object into a URL hash
var serialize = function(state) {
  var hash = [];
  Object.keys(state)
    .sort()
    .forEach(function(k) {
      var v = state[k];
      if (!v || (v instanceof Array && !v.length)) return;
      if (v instanceof Array) {
        v = v.join("|");
      }
      hash.push([k, encodeURIComponent(v).replace(/\s|%20/g, "+")].join("="));
    });
  return hash.join("&");
};

var subscribers = [];
var listen = function(callback) {
  subscribers.push(callback);
};

var onChange = function(e) {
  var params = parse();
  channel.send("hashchange", params, previous);
};

// only update previous when the change event actual fires
channel.on("hashchange", params => (previous = params));

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
  window.location.hash = serialize(state);
};

window.addEventListener("hashchange", onChange);
// setTimeout(onChange);

module.exports = {
  parse,
  serialize,
  listen,
  update,
  replace,
  define,
  force: onChange
};
