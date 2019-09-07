module.exports = function(elements, mutate) {
  if (!(elements instanceof Array)) elements = [elements];
  var first = new Map();
  var last = new Map();

  elements.forEach(el => first.set(el, el.getBoundingClientRect()));
  
  mutate();

  elements.forEach(el => last.set(el, el.getBoundingClientRect()));

  var visibleSet = new Set();
  [last, first].forEach(map => map.forEach(function(bounds, element) {
    if (!bounds.width || !bounds.height) return visibleSet.delete(element);
    if (bounds.top < window.innerHeight && bounds.bottom > 0) visibleSet.add(element);
  }));

  visibleSet.forEach(function(element) {
    var f = first.get(element);
    var l = last.get(element);
    var diff = {
      x: f.left - l.left,
      y: f.top - l.top,
      scaleX: f.width / l.width,
      scaleY: f.height / l.height
    };

    element.style.transition = "none";
    element.style.transformOrigin = "0 0";
    element.style.transform = `translateX(${diff.x}px) translateY(${diff.y}px) translateZ(0) scaleX(${diff.scaleX}) scaleY(${diff.scaleY})`;
  });

  // we shouldn't need to force reflow, but it seems to help
  var reflow = document.body.offsetWidth;
  requestAnimationFrame(function() {
    visibleSet.forEach(function(element) {
      element.style.transition = "transform .2s ease-in-out";
      element.style.transform = "";
      element.style.transformOrigin = "";
    });
  });
};