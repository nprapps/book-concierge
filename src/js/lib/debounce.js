module.exports = function(fn, duration = 100) {
  var pending = null;
  var memo = [];

  return function(...args) {
    memo = args;
    if (pending) return pending;
    return new Promise(function(ok) {
      setTimeout(async function() {
        await fn.apply(null, memo);
        pending = null;
        memo = [];
        ok();
      }, duration);
    });
  }
};