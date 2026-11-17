/*
Yield Manager defines, sizes, targets and refreshes the slots. All that's left here is
collapsing a slot when the ad comes back empty.
*/

window.googletag = window.googletag || {};
window.googletag.cmd = window.googletag.cmd || [];

googletag.cmd.push(function () {
  googletag.pubads().addEventListener("slotRenderEnded", event => {
    // Yield Manager renames the slot div to `ad-secondary__ayManagerEnv__1_xxx`, so the
    // suffix has to come off before it will match our wrapper's id.
    const id = event.slot.getSlotElementId().replace(/__ayManagerEnv__.+$/, "");
    const adWrap = document.querySelector(`#${id}-wrap`);
    if (adWrap) {
      adWrap.classList.toggle("unfilled", event.isEmpty);
    }
  });
});