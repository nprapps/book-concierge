var $ = require("./lib/qsa");
var debounce = require("./lib/debounce");

var nativeLazy = "loading" in Image.prototype;

var lazyImages = [];
var onScroll = function() {
  if (!lazyImages.length) return;
  var loading = [];
  lazyImages = lazyImages.filter(function(img) {
    var bounds = img.getBoundingClientRect();
    var buffer = window.innerHeight;
    if (bounds.bottom < -buffer || bounds.top > buffer * 2) return true;
    // otherwise, lazy-load it
    // we do this in a separate step to prevent reflow/layout issues
    loading.push(img);
  });
  loading.forEach(function(img) {
    img.src = img.dataset.src;
    img.removeAttribute("data-src");
  });
};

var reset = function() {
  lazyImages = $("[data-src]");
  onScroll();
};

if (nativeLazy) {
  var noop = () => {};
  onScroll = noop;
  reset = noop;
} else {
  window.addEventListener("scroll", debounce(onScroll, 300));
}

module.exports = { onScroll, reset };