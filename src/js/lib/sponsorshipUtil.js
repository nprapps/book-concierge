const HeaderBidding = require("./headerBiddingUtil");
const DataConsent = require('./dataConsent');
const Debug = require('./../lib/debug');

// Creatives under any of these companyIds will be refreshed
const REFRESHABLE_ADV_IDS = [
  5212620189,// "Pubmatic - openwrap"
  5255949102,// "Amazon/a9"
  98183312,// NPR donors
  4467080763,// NPR marketing
];

/** If we block an inappropriate ad, refresh that ad slot this number of times before giving up */
const refreshLimitForBlockedAds = 3;

const adRefreshInterval = 1000 * 60;

/** This variable lets us clear Google's slotRenderEnded 60s timeoutIds in the event that the ad is blocked.
 *
 * It's an object keyed on slotElementId. When an inappropriate ad is blocked by GeoEdge, we have a handler that
 * refreshes that slot immediately. Google's slotRenderEnded handler also sets a timeout to refresh the slot after 60s
 * and it doesn't know if geoedge blocks the rendered ad. If we don't keep track of and clear these, we could have
 * up to refreshLimitForBlockedAds refreshes at the end of the 60s timeout. */
let slotTimeoutIds = {};

/**
 * A count of how many times an ad slot has received ads that were then blocked by geoedge.
 * Said ad slot will be refreshed refreshLimitForBlockedAds times */
let blockedAdsCount = {};

function bidAndFetchAds(models) {
  HeaderBidding.requestBids(models)
    .then(openwrapBidData => {
      if (openwrapBidData.length) {
        try {
          window.PWT.addKeyValuePairsToGPTSlots(openwrapBidData);
        } catch (e) {
          Debug.log(`sponsorshipUtil -> Error setting openwrap kvps: ${e}`);
        }
      }
      fetchAds(models);
    })
    .catch(e => {
      Debug.log(`sponsorshipUtil -> ${e}`);
    })
}

/**
 * @param {AdModel[]} models
 */
function fetchAds(models) {
  googletag.cmd.push(function () {
    models.forEach(model => {
      window.googletag.display(model.id);
      Debug.log(`sponsorshipUtil -> display() slot '${model.id}'`);
    });
    Debug.log('sponsorshipUtil -> fetching ad(s).');
    window.googletag.pubads().refresh(models.map(model => model.slot));
  });
}

/**
 * @param {googletag.events} event
 * @param {AdModel} adModel
 */
function refreshSlotAfterCountdown(event, adModel) {
  Debug.log(`sponsorshipUtil -> Slot '${adModel.id}' will refresh again in ${adRefreshInterval / 1000}s. ${getFormattedTime()}`);
  const timeoutId = window.setTimeout(() => {
    windowVisibilityCheck(() => {
      const innerElement = document.querySelector(`#${adModel.id}`).querySelector('div');
      let innerElId = adModel.id;
      if (innerElement) {
        innerElId = innerElement.id;
      }
      const slotElement = document.querySelector(`#${adModel.id}`);

      if (isElementIdInView(innerElId)) {
        setRefreshKVP(slotElement, adModel);

        if (DataConsent.hasConsentedTo(DataConsent.TARGETING_AND_SPONSOR)) {
          Debug.log(`sponsorshipUtil -> Slot '${adModel.id}' prebidding and refreshing`);
          bidAndFetchAds([adModel]);
        } else {
          fetchAds([adModel]);
        }
      } else {
        Debug.log(`sponsorshipUtil -> Slot '${adModel.id}' will refresh when in view`);
        slotElement.setAttribute('data-is-awaiting-refresh', 'true');
      }
    });
  }, adRefreshInterval);
  (slotTimeoutIds[adModel.id] = slotTimeoutIds[adModel.id] || []).push(timeoutId);
}

/**
 * Decide if a slot should refresh after the 60s countdown
 * @param {googletag.events} event
 * @returns {boolean}
 */
function shouldRefreshSlotAfterCountdown(event) {
  const { isBackfill } = event.slot.getResponseInformation() || false;
  return isBackfill || REFRESHABLE_ADV_IDS.includes(event.advertiserId);
}

/**
 * Contains all slot specific callbacks after slot rendering is complete
 * @see https://developers.google.com/doubleclick-gpt/reference
 * @private
 * @param {googletag.events} event
 * @param {AdModel} adModel
 */
function slotRenderEndedCallback(event, adModel) {
  const slotElement = document.querySelector(`#${adModel.id}`);
  Debug.log(`sponsorshipUtil -> Slot '${adModel.id}' render ended`);
  if (shouldRefreshSlotAfterCountdown(event)) {
    refreshSlotAfterCountdown(event, adModel);
    const refreshCount = parseInt(slotElement.getAttribute('data-refresh-count')) || 0;
    slotElement.setAttribute('data-refresh-count', `${refreshCount + 1}`);
  }
  configureInViewObserver(slotElement, adModel);

  const adWrap = document.querySelector(`#${adModel.id}-wrap`);
  if (event.isEmpty) {
    adWrap.classList.add('hidden');
  } else {
    adWrap.classList.add('visible');
    adWrap.classList.remove('hidden');
  }
}

/**
 * @param {HTMLElement} slotElement
 * @param {AdModel} adModel
 */
function setRefreshKVP(slotElement, adModel) {
  const refreshCount = parseInt(slotElement.getAttribute('data-refresh-count')) || 0;
  if (refreshCount) {
    adModel.slot.clearTargeting('refreshCount');
    adModel.slot.setTargeting('refreshCount', `${refreshCount}`);
  }
}

/**
 * @param {HTMLElement} slotElement
 * @param {AdModel} adModel
 */
function slotInViewHandler(slotElement, adModel) {
  setRefreshKVP(slotElement, adModel);
  Debug.log(`sponsorshipUtil -> Slot ${slotElement.id} is now in view ${getFormattedTime()}`);
  if (DataConsent.hasConsentedTo(DataConsent.TARGETING_AND_SPONSOR)) {
    bidAndFetchAds([adModel]);
  } else {
    fetchAds([adModel]);
  }
}

/**
 * This observer is triggered when the slot has just transitioned to being "in view"
 * based on our definition of that.
 * @param {HTMLElement} slotElement
 * @param {AdModel} adModel
 */
function configureInViewObserver(slotElement, adModel) {
  const innerSlotElement = slotElement.querySelector('div');
  const withinViewObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      Debug.log(`sponsorshipUtil -> Slot '${slotElement.id}' is now in view ${getFormattedTime()}`);
      if (slotElement.dataset.isAwaitingRefresh === 'true') {
        slotElement.setAttribute('data-is-awaiting-refresh', 'false');
        slotInViewHandler(slotElement, adModel);
      }
    }
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.65,
  });
  withinViewObserver.observe(innerSlotElement);
}

/**
 * @param {string} elementId
 */
function isElementIdInView(elementId) {
  const element = document.getElementById(elementId);
  const bounding = element.getBoundingClientRect();
  // above viewport but within 65%
  if (bounding.top < 0) {
    const visibleFraction = (bounding.height + bounding.top) / bounding.height;
    const visiblePercentage = parseInt((visibleFraction * 100).toFixed());
    return visiblePercentage >= 65;
  }
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  // below viewport but within 65%
  if (bounding.bottom > windowHeight && bounding.top < windowHeight) {
    const visibleFraction = (bounding.height - (bounding.bottom - windowHeight)) / bounding.height;
    const visiblePercentage = parseInt((visibleFraction * 100).toFixed());
    return visiblePercentage >= 65;
  }

  // the entire element is visible
  return bounding.top >= 0 && (bounding.bottom <= windowHeight || bounding.top < windowHeight);
}

/**
 * Use the page visibility API to suppress ad rendering (set up by the passed-in callback) if the page
 * is in a background window or tab.
 *
 * It will invoke the callback when we come back to the foreground.
 *
 * @param {function} callback
 */
function windowVisibilityCheck(callback) {
  const debounce = (fn, delay) => {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  const debouncedHandler = debounce(() => {
    if (document.visibilityState === 'visible') {
      callback();
      window.removeEventListener('focus', debouncedHandler);
      document.removeEventListener('visibilitychange', debouncedHandler);
    }
  }, 500);

  if (document.visibilityState === 'visible') {
    callback();
  } else {
    document.addEventListener('visibilitychange', debouncedHandler);
    window.addEventListener('focus', debouncedHandler);
  }
}

/**
 * @param {MessageEvent} event
 * @param {AdModel} adModel
 */
function geoedgeMessageEventCallback(event, adModel) {
  if (adModel && adModel.location) {
    blockedAdsCount[location] = Object.hasOwnProperty.call(blockedAdsCount, location) ? blockedAdsCount[location] + 1 : 1;
    Debug.log(`sponsorshipUtil -> Blocked ad ID '${event.data.el}' ${blockedAdsCount[location]} time(s)`);
    if (blockedAdsCount[location] < refreshLimitForBlockedAds) {
      if (slotTimeoutIds[adModel.id] && slotTimeoutIds[adModel.id].length) {
        Debug.log(`sponsorshipUtil: Slot '${adModel.id}' refresh timer cancelled`);
        (slotTimeoutIds[adModel.id]).forEach((id) => {
          clearTimeout(id);
        });
        slotTimeoutIds[adModel.id] = [];
      }

      if (DataConsent.hasConsentedTo(DataConsent.TARGETING_AND_SPONSOR)) {
        bidAndFetchAds([adModel]);
      } else {
        fetchAds([adModel]);
      }
    }
  } else {
    Debug.log(`sponsorshipUtil -> No adModel found for blocked ad slot '${event.data.el}'`);
    Debug.log(event.data);
  }
}

function getFormattedTime() {
  return (new Date()).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

module.exports = {
  slotRenderEndedCallback,
  geoedgeMessageEventCallback,
  bidAndFetchAds,
  fetchAds,
};