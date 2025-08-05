const DataConsent = require('./lib/dataConsent');
const Debug = require('./lib/debug');

window.NPR = window.NPR || {
  scriptInjectionCompleted: {
    aps: false,
    openwrap: false,
  }
};
let apstagInitialized = false;

/**
 * @param {function} onInjectionCompleted
 */
function injectApstag(onInjectionCompleted) {
  if (document.querySelector('[data-header-bidding-vendor="apstag"]')) {
    onInjectionCompleted('aps')
    return
  }

  !(function (a9, a, p, s, t, A, g) {
    if (a[a9]) return

    function q(c, r) {
      a[a9]._Q.push([c, r])
    }

    a[a9] = {
      init: function () {
        q('i', arguments)
      },
      fetchBids: function () {
        q('f', arguments)
      },
      setDisplayBids: function () {
      },
      targetingKeys: function () {
        return []
      },
      _Q: []
    }
    A = p.createElement(s)
    A.async = !0
    A.src = t
    A.onload = () => onInjectionCompleted('aps')
    A.setAttribute('data-header-bidding-vendor', 'apstag')
    g = p.getElementsByTagName(s)[0]
    g.parentNode.insertBefore(A, g)
  })(
    'apstag',
    window,
    document,
    'script',
    '//c.amazon-adsystem.com/aax2/apstag.js'
  )
}

/**
 * @param {function} onInjectionCompleted
 */
function injectOpenWrap(onInjectionCompleted) {
  if (document.querySelector('[data-header-bidding-vendor="openwrap"]')) {
    onInjectionCompleted('openwrap');
    return;
  }

  !(function (globalWindow, globalDocument) {
    if (globalWindow.PWT && globalWindow.PWT.jsLoaded) {
      return;
    }
    globalWindow.PWT = {};
    globalWindow.PWT.isSyncAuction = true;
    globalWindow.PWT.jsLoaded = () => {
      // jsLoaded is called from the pwt.js vendor script when it's ready.
      // We can't do any openwrap bidding until then.
      onInjectionCompleted('openwrap');
    }

    const url = `https://ads.pubmatic.com/AdServer/js/pwt/162268/7835`;
    const el = globalDocument.createElement('script');
    el.async = true;
    el.type = 'text/javascript';
    el.setAttribute('data-header-bidding-vendor', 'pwt');
    const urlParams = new URLSearchParams(globalWindow.location.search);
    const profileVersionId = parseInt(urlParams.get('pwtv'), 10);
    el.src = `${url}${profileVersionId ? `/${profileVersionId}` : ''}/pwt.js`;
    const node = globalDocument.getElementsByTagName('script')[0];
    node.parentNode.insertBefore(el, node);
  })(window, document);
}

/**
 * @param {function} callback
 */
function initializeApsTag(callback) {
  if (apstagInitialized) {
    return;
  }
  apstagInitialized = true;
  let apsTagConfig = {
    pubID: '5116',
    adServer: 'googletag',
    bidTimeout: 1000,
    deals: true
  }

  let params = {si_section: 'News'};

  if (typeof __uspapi !== 'undefined') {
    __uspapi('getUSPData', 1, (uspdata, success) => {
      if (success) {
        params = {...params, us_privacy: uspdata.uspString};
      }
    });
  }

  if (Object.keys(params).length) {
    apsTagConfig = {
      ...apsTagConfig,
      params
    };
  }

  window.apstag.init(apsTagConfig);
  callback();
}

/**
 * @param {function} onConsentedCallback
 */
function listenForConsent(onConsentedCallback) {
  const onConsentChanged = () => {
    Debug.log('loadHeaderBidding -> consent changed.');
    document.removeEventListener('npr:DataConsentChanged', onConsentChanged);
    onConsentedCallback();
  }

  const onConsentAvailable = () => {
    Debug.log('loadHeaderBidding -> consent available.');
    document.removeEventListener('npr:DataConsentAvailable', onConsentAvailable);
    onConsentedCallback();
  }

  document.addEventListener('npr:DataConsentChanged', onConsentChanged);
  // For some reason sometimes there are no active groups on DataConsentChanged (tested on vpn on localhost).
  // When this happens we should wait for DataConsentAvailable.
  document.addEventListener('npr:DataConsentAvailable', onConsentAvailable);
}

function injectScripts() {
  const onInjectionCompleted = (vendor) => {
    if (vendor === 'aps') {
      initializeApsTag(() => {
        Debug.log(`loadHeaderBidding -> injection completed for ${vendor}`);
        window.NPR.scriptInjectionCompleted['aps'] = true;
        document.dispatchEvent(new CustomEvent('npr:scriptInjectionCompleted', { detail: vendor }));
      })
    } else {
      Debug.log(`loadHeaderBidding -> injection completed for ${vendor}`);
      window.NPR.scriptInjectionCompleted[vendor] = true;
      document.dispatchEvent(new CustomEvent('npr:scriptInjectionCompleted', { detail: vendor }));
    }
  }
  injectApstag(onInjectionCompleted);
  injectOpenWrap(onInjectionCompleted);
}

if (window.NPR && window.NPR.OptanonWrapperLoaded) {
  if (DataConsent.hasConsentedTo(DataConsent.TARGETING_AND_SPONSOR)) {
    Debug.log('loadHeaderBidding -> User consented.');
    injectScripts()
  } else {
    Debug.log('loadHeaderBidding -> User rejected consent.');
  }
} else {
  Debug.log('loadHeaderBidding -> waiting for consent.');
  listenForConsent(injectScripts);
}