var DataConsent = require("./lib/data-consent");

console.log("Initializing Header Bidding!");

// var googleAnalyticsAlreadyInitialized = false;
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

// var setupGoogleAnalytics = function() {
//   if (window.top !== window) {
// 		var gtagID = "G-LLLW9F9XPC"
// 	}
// 	else
// 	{
// 		var gtagID = "G-XK44GJHVBE"
// 	}
//   // Bail early if opted out of Performance and Analytics consent groups
//   if (!DataConsent.hasConsentedTo(DataConsent.PERFORMANCE_AND_ANALYTICS)) return;

//   var script = document.createElement("script")

//   script.src = "https://www.googletagmanager.com/gtag/js?id=" + gtagID

//   script.async = true;

//   var script_embed = document.createElement("script")

//   script_embed.innerHTML = "window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '" + gtagID + "', {'send_page_view': false });"

//   document.head.append(script, script_embed)

// if (window.top !== window) {

// 		// By default Google tracks the query string, but we want to ignore it.
// 		var here = new URL(window.location);

// 		// Custom dimensions & metrics
// 		var parentUrl = here.searchParams.has("parentUrl") ? new URL(here.searchParams.get("parentUrl")) : "";
// 		var parentHostname = "";

// 		if (parentUrl) {
// 		    parentHostname = parentUrl.hostname;
// 		}

// 		var initialWidth = here.searchParams.get("initialWidth") || "";

// 		var customData = {};
//         customData["dimension1"] = parentUrl;
//         customData["dimension2"] = parentHostname;
//         customData["dimension3"] = initialWidth;
// 		gtag('config', gtagID, {'send_page_view': false, 'custom_map': {'dimension1': 'parentUrl', 'dimension2': 'parentHostname', 'dimension3': 'initialWidth'}});
// 	} else {

// 		// Secondary topics
// 		var dim6 = "";
// 		// Topic IDs
// 		var dim2 = "";

// 		// Google analytics doesn't accept arrays anymore, these must be strings.

// 		try {
// 		  dim6 = window.PROJECT_ANALYTICS.secondaryTopics.join(", ");
// 		} catch (error) {
// 		  console.log("PROJECT_ANALYTICS.secondaryTopics is not an array, check project.json");
// 		}

// 		try {
// 		  dim2 = window.PROJECT_ANALYTICS.topicIDs.join(", ");
// 		} catch (error) {
// 		  console.log("PROJECT_ANALYTICS.topicIDs is not an array, check project.json");
// 		}

// 	var customData = {};
//         customData["dimension2"] = dim2;
//         customData["dimension3"] = window.PROJECT_ANALYTICS.primaryTopic || "News";
//         customData["dimension6"] = dim6;
// 		customData["dimension22"] = document.title;

//     gtag('config', gtagID, {'send_page_view': false, 'custom_map': {'dimension2': '', 'dimension3': '', 'dimension6': '', 'dimension22': ''}});
// 	}
//     gtag('event', 'page_view', customData)
//   googleAnalyticsAlreadyInitialized = true;
// }

// Add GA initialization to window.onload
// var oldOnload = window.onload;
// window.onload = (typeof window.onload != 'function') ? setupGoogleAnalytics : function() { oldOnload(); setupGoogleAnalytics(); };

// Add Header bidding to window.onload
// var oldOnload = window.onload;
// window.onload =
//   typeof window.onload != "function"
//     ? setupHeaderBidding
//     : function () {
//         oldOnload();
//         setupHeaderBidding();
//       };

window.addEventListener("load", () => {
  setTimeout(setupHeaderBidding, 50);
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
    setupHeaderBidding();
  }

  if (!DataConsent.hasConsentedTo(DataConsent.TARGETING_AND_SPONSOR)) {
	console.log("removing header bidding!")
    function removeHeaderBidding() {
      document.querySelectorAll(".header-bidding").forEach(el => el.remove());
    }

    removeHeaderBidding();
	window.location.reload();
  }

  //   // Bail early if it's already been set up
  //   if (googleAnalyticsAlreadyInitialized) return;

  //   // When a user opts into performance and analytics cookies, initialize GA
  //   if (DataConsent.hasConsentedTo(DataConsent.PERFORMANCE_AND_ANALYTICS)) {
  //     setupGoogleAnalytics();
  //   }
});
