const { initializeAdConfigVariables } = require("./lib/adUtil");
const {registerPSGoogleDfpAd} = require("./lib/googleDfp")

var setAdSlots = function() {
    var mobile = false;
    var adIds = ["ad-centerstage", "ad-secondary"]

    var adAttribs = {"ad-centerstage": {"slotID": "n6735.NPR", "mobileSlotID": "n6735.NPRMOBILE"}, "ad-secondary": {"slotID": "NPRSecondary", "mobileSlotID": "NPRMobileSecondary"}}

    if (window.innerWidth <= 650) {
      mobile = true;
    }
    
    adIds.forEach(id => {
      const ad = document.getElementById(id)

      if (mobile) {
        var slotID = adAttribs[id]["mobileSlotID"]
        var slotSizes = "[[320,50],[300, 250]]"
        var slotAdSizeMap = "[[[650,250], [320,50]],[[300,250], [300,250]]]"
      }
      else {
        var slotID = adAttribs[id]["slotID"]
        var slotSizes = "[[970,250], [728, 90], [300, 250]]"
        var slotAdSizeMap = "[[[1024,768], [970,250]], [[769,400],[728,90]], [[300,250], [300,250]]]"
      }

      var slotName = `6735/${slotID}/news_politics_elections`;

      ad.setAttribute("data-slot-name", slotName)
      ad.setAttribute("data-slot-sizes", slotSizes)
      ad.setAttribute("data-slot-adSizeMap", slotAdSizeMap)
    });
        
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setAdSlots()
      initializeAdConfigVariables(document)
      registerPSGoogleDfpAd()

    })
  } else {
    setAdSlots()
    initializeAdConfigVariables(document)
    registerPSGoogleDfpAd()

  }