const Debug = require('./lib/debug');
const AdModel = require('./lib/adModel');
const SponsorshipUtil = require('./lib/sponsorshipUtil');
const DataConsent = require('./lib/dataConsent');

window.googletag = window.googletag || {};
window.googletag.cmd = window.googletag.cmd || [];
window.NPR = window.NPR || {
  scriptInjectionCompleted: {
    aps: false,
    openwrap: false,
  }
};

/**
 * @type {AdModel[]} an array of all ad models configured on the page
 */
let allAdModels = [];

const isTesting = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

// @todo: this is duplicated in the geoedge partial
const geoEdgePolicyKey = '880a45f2-0015-49d2-b38f-2d26be44ae09';

googletag.cmd.push(function () {
  googletag.pubads().enableLazyLoad({
    fetchMarginPercent: 100, // fetch and render ads within this % of viewport
    renderMarginPercent: 100,
    mobileScaling: 1, // Same on mobile.
  });

  const storyID = "nx-s1-5075305";
  googletag.pubads().setTargeting("testserver", isTesting ? 'true' : 'false');
  googletag.pubads().setTargeting("storyId", storyID);
  googletag.pubads().enableSingleRequest();
  googletag.pubads().enableAsyncRendering();
  googletag.pubads().collapseEmptyDivs();
  googletag.pubads().disableInitialLoad();
  googletag.enableServices();

  googletag.pubads().addEventListener('slotRenderEnded', (event) => {
    const id = event.slot.getSlotElementId();
    const adModel = allAdModels.find(model => model.id === id);
    SponsorshipUtil.slotRenderEndedCallback(event, adModel);
  });

  // geoedge automatically blocks ads that it flags as inappropriate. It lets us know of such an action via
  // this message event so we can request new bids and refresh that slot.
  window.addEventListener('message', (event) => {
    if (event?.data?.key ?? '' === geoEdgePolicyKey) {
      if (event.data && Object.prototype.hasOwnProperty.call(event.data, 'blocked')) {
        if (event.data.blocked === true) {
          const adModel = allAdModels.find(model => model.id === event.data.el);
          SponsorshipUtil.geoedgeMessageEventCallback(event, adModel)
        } else {
          Debug.log(`sponsorship -> Scanned ad ID '${event.data.el}'. GE data: ${JSON.stringify(event.data)}`);
        }
      }
    }
  }, false);
});

const waitForScriptInjection = () => {
  if (window.NPR.scriptInjectionCompleted.aps && window.NPR.scriptInjectionCompleted.openwrap) {
    Debug.log(`sponsorship -> prebidding and refreshing ads.`);
    SponsorshipUtil.bidAndFetchAds(allAdModels);
  } else {
    const handler = (event) => {
      window.NPR.scriptInjectionCompleted[event.detail] = true;
      if (window.NPR.scriptInjectionCompleted.aps && window.NPR.scriptInjectionCompleted.openwrap) {
        document.removeEventListener('npr:scriptInjectionCompleted', handler);
        Debug.log(`sponsorship -> prebidding and refreshing ads.`);
        SponsorshipUtil.bidAndFetchAds(allAdModels);
      }
    }
    document.addEventListener('npr:scriptInjectionCompleted', handler);
  }
};

/**
 * @param {function} onConsentedCallback
 */
const listenForConsent = (onConsentedCallback) => {
  const onConsentChanged = () => {
    Debug.log('sponsorship -> consent changed.')
    document.removeEventListener('npr:DataConsentChanged', onConsentChanged)
    onConsentedCallback()
  }

  const onConsentAvailable = () => {
    Debug.log('sponsorship -> consent available.')
    document.removeEventListener('npr:DataConsentAvailable', onConsentAvailable)
    onConsentedCallback()
  }

  document.addEventListener('npr:DataConsentChanged', onConsentChanged)
  // For some reason sometimes there are no active groups on DataConsentChanged (tested on vpn on localhost).
  // When this happens we should wait for DataConsentAvailable.
  document.addEventListener('npr:DataConsentAvailable', onConsentAvailable)
}

document.querySelectorAll('.ad-config').forEach((adEl) => {
  const model = new AdModel(adEl);
  allAdModels.push(model);
});

if (window.NPR && window.NPR.OptanonWrapperLoaded) {
  if (DataConsent.hasConsentedTo(DataConsent.TARGETING_AND_SPONSOR)) {
    waitForScriptInjection();
  } else {
    SponsorshipUtil.fetchAds(allAdModels);
  }
} else {
  Debug.log('sponsorship -> waiting for OptanonWrapper');
  listenForConsent(() => {
    if (DataConsent.hasConsentedTo(DataConsent.TARGETING_AND_SPONSOR)) {
      waitForScriptInjection();
    } else {
      Debug.log('sponsorship -> user rejected consent.');
      SponsorshipUtil.fetchAds(allAdModels);
    }
  })
}
