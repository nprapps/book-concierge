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

var parse = function() {
  var hash = window.location.hash.replace(/^#/, "");
  var parts = hash.split("&").map(p => p.split("="));
  var params = {};
  parts.filter(d => d[1]).forEach(([k, v]) => params[k] = decodeURIComponent(v).replace(/\+/g, " ") || true);
  for (var k in definitions) {
    var def = definitions[k];
    if (def instanceof Array) {
      var [cast = String] = def;
      params[k] = params[k] ? params[k].split("|").map(cast) : [];
    } else {
      var cast = def[k] || String;
      params[k] = cast(params[k]);
    }
  }
  return params;
};

var serialize = function(state) {
  var hash = [];
  for (var k in state) {
    var v = state[k];
    if (!v || (v instanceof Array && !v.length)) continue;
    if (v instanceof Array) {
      v = v.join("|");
    }
    hash.push([k, encodeURIComponent(v.replace(/\s/g, "+"))].join("="));
  }
  return hash.join("&");
};

var subscribers = [];
var listen = function(callback) {
  subscribers.push(callback);
};

var onChange = function(e) {
  var params = parse();
  channel.send("hashchange", params, previous);
  previous = params;
};

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

window.addEventListener("hashchange", onChange);
// setTimeout(onChange);

module.exports = { parse, serialize, listen, update, replace, define, force: onChange };