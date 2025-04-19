var DataConsent = require("./lib/data-consent");
const { setAdSlots } = require("./loadHeaderBidding");
const { initializeAdConfigVariables } = require("./lib/adUtil");
const { registerPSGoogleDfpAd } = require("./lib/googleDfp");

var headerBiddingAlreadyInitialized = false;

var setupHeaderBidding = function () {
  var headerBiddingAlreadyInitialized = true;
  console.log(window.OnetrustActiveGroups);

  if (DataConsent.hasConsentedTo(DataConsent.TARGETING_AND_SPONSOR)) {
    console.log("Setting up header bidding");
    const headEl = document.getElementsByTagName("head")[0];

    // google
    !(function (a9, a, p, s, t, A, g) {
      if (a[a9]) return;
      function q(c, r) {
        a[a9]._Q.push([c, r]);
      }
      a[a9] = {
        init: function () {
          q("i", arguments);
        },
        fetchBids: function () {
          q("f", arguments);
        },
        setDisplayBids: function () {},
        targetingKeys: function () {
          return [];
        },
        _Q: [],
      };
      A = p.createElement(s);
      A.classList.add("header-bidding", "remove-embedded");
      A.async = !0;
      A.src = t;
      g = p.getElementsByTagName(s)[0];
      console.log("Inserting: ", A);
      headEl.insertBefore(A, null);
    })(
      "apstag",
      window,
      document,
      "script",
      "//c.amazon-adsystem.com/aax2/apstag.js"
    );

    // pubmatic
    !(function (globalWindow, globalDocument) {
      if (globalWindow.PWT && globalWindow.PWT.jsLoaded) {
        return;
      }
      globalWindow.PWT = {};
      globalWindow.PWT.isSyncAuction = true;
      globalWindow.PWT.jsLoaded = () => {
        // this callback is called from the pwt.js vendor script when it's ready.
        // We can't do any bidding until then.
        if (localStorage.getItem("PS_GOOGLE_DFP_DEBUG")) {
          console.log(
            "HeaderBidding: openwrap is ready ",
            new Date().toISOString()
          );
        }
        globalWindow.PWT.OpenWrapReady = true;
        globalDocument.dispatchEvent(new CustomEvent("npr:OpenWrapReady"));
      };
      const url = `https://ads.pubmatic.com/AdServer/js/pwt/162268/7835`;
      const el = globalDocument.createElement("script");
      el.classList.add("header-bidding", "remove-embedded");
      el.async = true;
      el.type = "text/javascript";
      const urlParams = new URLSearchParams(globalWindow.location.search);
      const profileVersionId = parseInt(urlParams.get("pwtv"), 10);
      el.src = `${url}${profileVersionId ? `/${profileVersionId}` : ""}/pwt.js`;
      console.log("Inserting: ", el);
      headEl.insertBefore(el, null);
      if (localStorage.getItem("PS_GOOGLE_DFP_DEBUG")) {
        console.log("HeaderBidding: injected pwt.js", new Date().toISOString());
      }
    })(window, document);

    // geoedge
    !(function (w, d) {
      // GeoEdge is a vendor that blocks blacklisted ads
      if (w.grumi) {
        return;
      }
      w.grumi = {
        cfg: {
          pbGlobal: "owpbjs",
          advs: {
            19566752: true, // Google Inc
            4952276315: true, // IntowowBillable
            88382072: true, // NPR - Programmatic
            5056504790: true, // Pubmatic
            5116496584: true, // Index Exchange
            5212620189: true, // Pubmatic
            5255949102: true, // Amazon
          },
        },
        key: "880a45f2-0015-49d2-b38f-2d26be44ae09",
      };
      const script = d.createElement("script");
      script.classList.add("header-bidding", "remove-embedded");
      script.async = true;
      script.type = "text/javascript";
      script.src =
        "https://rumcdn.geoedge.be/880a45f2-0015-49d2-b38f-2d26be44ae09/grumi-ip.js";
      console.log("Inserting: ", script);
      headEl.insertBefore(script, null);
    })(window, document);
  }
};

const removeAds = function () {
  const ads = document.getElementsByClassName("has-sponsorship");

  for (let i = 0; i < ads.length; i++) {
    ads[i].remove();
  }
};

async function headerBiddingSequence() {
  if (DataConsent.hasConsentedTo(DataConsent.TARGETING_AND_SPONSOR)) {
    await setupHeaderBidding();
    await setAdSlots();
    await initializeAdConfigVariables();
    await registerPSGoogleDfpAd();
  } else {
    removeAds();
  }
}

window.addEventListener("load", () => {
  setTimeout(headerBiddingSequence, 50);
});

// Listen for DataConsentChanged event
document.addEventListener("npr:DataConsentChanged", () => {
  console.log("Consent changed!");
  console.log(DataConsent);

  if (
    headerBiddingAlreadyInitialized &&
    DataConsent.hasConsentedTo(DataConsent.TARGETING_AND_SPONSOR)
  )
    return;

  if (DataConsent.hasConsentedTo(DataConsent.TARGETING_AND_SPONSOR)) {
    console.log("adding header bidding!");
    headerBiddingSequence();
  }

  if (!DataConsent.hasConsentedTo(DataConsent.TARGETING_AND_SPONSOR)) {
    console.log("removing header bidding!");
    function removeHeaderBidding() {
      document.querySelectorAll(".header-bidding").forEach(el => el.remove());
    }

    removeHeaderBidding();
  }
});
