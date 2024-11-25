const throttle = require ('./throttle.js')
const HeaderBidding = require ('./headerBiddingUtil')

const permutiveWaitTime = 500
const MOBILE_VIEWPORT_WIDTH = '728px'
const VALID_HEADER_BIDDING_SIZES = ['300x250', '320x50', '728x90', '970x250']
const DEBUG_ENABLED = 'PS_GOOGLE_DFP_DEBUG'

/** Total count of the expected ads on initial page load. This includes static ads (right rail, persistent player) and injected ads before new posts are fetched */
let initialExpectedAdCount = 0

/** All the expected ads on initial page load have rendered. (static and injected) */
let initialAdRenderingCompleted = false

let staticLiveBlogPostCount = 0

let processedSlotAdModels = []
let dynamicAdIndex = 0

/** We must only do Header Bidding content whose ownerName is 'NPR' */
let ownerName = ''
let currentMediaQuery

window.addEventListener('npr:GoogleDfpSlotProcessed', e => {
  onAdSlotProcessed(e.detail)
})

function getMediaQuery () {
  const mqValue =
    window
      .getComputedStyle(document.querySelector('body'), '::before')
      .getPropertyValue('content') || false

  if (mqValue) {
    return mqValue.replace(/["']/g, '')
  } else {
    return false
  }
}

var log = function(message, data) {
  if (localStorage.getItem(DEBUG_ENABLED)) {
    if (data) {
      console.log(message, data)
    } else {
      console.log(message)
    }
  }
}

/**
 * Resets ad config variables on page transition. Called from the History Manager before the new body is swapped in.
 * @param {HTMLElement} body
 */
function resetAdConfigVariables (body) {
  initialExpectedAdCount = 0
  initialAdRenderingCompleted = false
  staticLiveBlogPostCount = 0
  processedSlotAdModels = []
  dynamicAdIndex = 0
  ownerName = body.dataset.ownerName
  HeaderBidding.resetHeaderBiddingVars()

  setInitialExpectedAdCount(body)
}

/**
 * This function is only called once at the beginning of the session to set the variables that we need before
 * custom html ad elements get added. Subsequent page transitions use resetAdConfigVariables() to do the same.
 */
function initializeAdConfigVariables () {
  setInitialExpectedAdCount(document)
  currentMediaQuery = getMediaQuery()
  ownerName = 'NPR'

  window.googletag = window.googletag || {}
  window.googletag.cmd = window.googletag.cmd || []
  window.googletag.cmd.push(function () {
    window.googletag
      .pubads()
      .addEventListener('slotRenderEnded', function (event) {
        onSlotRenderEnded(event)
      })
  })

  window.addEventListener(
    'resize',
    throttle(250, () => {
      onWindowResize()
    })
  )

}

/**
 * When you transition from one page to another, History.js will inject a new body along with any new custom ad elements
 * to the page, the respective connectedCallback() will fire for each element and subsequently each ad will be processed in init().
 * History.js also fires an event EVENT_HISTORY_RENDERED when it's done injecting the new body. Each custom ad element
 * will respond to that event by calling init() again.
 *
 * AFAIK this is only useful for making sure we still call init() on the the persistent player ad element
 * which did not get removed from the DOM at page transition. GoogleDfp.js could ignore the EVENT_HISTORY_RENDERED
 * and process the persistent player ad manually on every transition but i kept it this way because i wasn't sure if
 * station sites have weird edge cases with persistent-player-like ads.
 * @param {string} id
 * @returns {boolean}
 */
function slotAlreadyExists (id) {
  // check for defined slots in googletag
  if (window.googletag && window.googletag.apiReady) {
    const adslots = window.googletag.pubads().getSlots()
    for (let i = 0; i < adslots.length; i++) {
      if (adslots[i].getSlotId().getDomId() === id) {
        log(`GoogleDfp: found an existing slot with id '${id}'`)
        return true
      }
    }
  }
  // check every processed slotModel, break the loop and
  // return if the id is found
  return !processedSlotAdModels.every(model => {
    if (model.id === id) {
      log(`GoogleDfp: found an existing slot model with id '${id}'`)
    }
    return model.id !== id
  })
}

/**
 * @param {HTMLElement|Document} targetEl - body or document
 */
function setInitialExpectedAdCount (targetEl) {
  const adElements = targetEl.querySelectorAll('ps-google-dfp-ad')

  // count the number of static ads on the page. Ignore the ad injection placeholder
  adElements.forEach(el => {
    const ancestorEl = el.parentElement.parentElement
    if (!ancestorEl.classList.contains('HiddenPlaceholderAd')) {
      const ad = el.querySelector('.GoogleDfpAd')
      initialExpectedAdCount += shouldRenderAd(ad) ? 1 : 0
    }
  })
  
}

/**
 * @param {AdModel} adModel
 */
function onAdSlotProcessed (adModel) {
    log(`GoogleDfp: slot processed '${adModel.id}'`)

  const doTheBidding = models => {
    if (ownerName === 'NPR') {
      HeaderBidding.initializeApsTag()
      HeaderBidding.requestBids(models)
        .then(bidData => {
          prepareSlotsAndSendRequest(models, bidData)
        })
        .catch(reason => {
          log('HeaderBidding: bidding error: ', reason)
          prepareSlotsAndSendRequest(models)
        })
    } else {
      prepareSlotsAndSendRequest(models)
    }
  }

  // Wait for all expected ad slots to be ready, then bid on all slots and send a
  // single ad request to GAM (SRA). If all expected slot requests have already been sent
  // then send a one time ad request for any newly processed slots --this is expected
  // to happen on liveblog when a new ad is injected after a live update
  if (initialAdRenderingCompleted) {
    log(`GoogleDfp: sending ad request for slot '${adModel.id}'`)
    doTheBidding([adModel])
  } else {
    processedSlotAdModels.push(adModel)
    if (processedSlotAdModels.length === initialExpectedAdCount) {
      log(
        `GoogleDfp: all (${initialExpectedAdCount}) expected slots processed.`
      )
      initialAdRenderingCompleted = true
      doTheBidding(processedSlotAdModels)
    }
  }
}

/**
 * @param {AdModel[]} adModels
 * @param {Array} [bidData]
 */
function prepareSlotsAndSendRequest (adModels, bidData = []) {

  window.googletag.cmd.push(() => {
    // prepare the slots
    adModels.forEach(model => {
      model.createGoogleAdSlot()
      model.setGoogleAdTargeting()
      model.defineGoogleAdSizeMapping()
    })

    // set header bids
    if (window.apstag) {
      try {
        window.apstag.setDisplayBids()
      } catch (e) {
        log('GoogleDfp: Error setting apstag bids: ', e)
      }
    }
    if (bidData.length) {
      try {
        window.PWT.addKeyValuePairsToGPTSlots(bidData)
      } catch (e) {
        log('GoogleDfp: Error setting openwrap bids: ', e)
      }
    }

    // send ad request
    const readySlots = []
    adModels.forEach(model => {
      window.googletag.display(model.id)
      readySlots.push(model.slot)
    })
    sendAdserverRequest(readySlots)
  })
}

function sendAdserverRequest (slots = []) {
  const refreshSlots = () => {
    window.googletag.cmd.push(() => {
      if (slots.length) {
        window.googletag.pubads().refresh(slots)
      } else {
        window.googletag.pubads().refresh()
      }
    })
  }
  if (window.permutive && window.permutive.readyWithTimeout) {
    window.permutive.readyWithTimeout(
      () => {
        refreshSlots()
      },
      'realtime',
      permutiveWaitTime
    )
  } else {
    refreshSlots()
  }
}

function removeBlankTextNode (node) {
  if (
    node &&
    node.nodeType === Node.TEXT_NODE &&
    node.data &&
    !node.data.trim()
  ) {
    node.remove()
  }
}

function isMobile () {
  return window.matchMedia(`(max-width: ${MOBILE_VIEWPORT_WIDTH})`).matches
}

function isDesktop () {
  return window.matchMedia(`(min-width: ${MOBILE_VIEWPORT_WIDTH})`).matches
}

function isValidHeaderBiddingSize (size) {
  if (Array.isArray(size)) {
    return VALID_HEADER_BIDDING_SIZES.includes(`${size[0]}x${size[1]}`)
  }
  return size !== 'fluid'
}

/**
 * Determine if a mobile/desktop inline ad should be rendered at this breakpoint
 * @param {HTMLElement} ad
 * @returns {boolean}
 */
function shouldRenderAd (ad) {
  
  const currentWindowSize = getMediaQuery()
  if (
    ad.id === 'googleAdRR' &&
    (currentWindowSize === 'mq-xs' ||
      currentWindowSize === 'mq-sm' ||
      currentWindowSize === 'mq-md')
  ) {
    return false
  }
  const shouldHideOnMobile = ad.getAttribute('data-hide-on-mobile') || false
  const shouldHideOnDesktop = ad.getAttribute('data-hide-on-desktop') || false

  // if we're on desktop and this ad is marked as hidden on desktop or
  // if we're on mobile and this ad is marked as hidden on mobile, return false otherwise return true
  return !(
    (isDesktop() && shouldHideOnDesktop) ||
    (isMobile() && shouldHideOnMobile)
  )
}

/**
 * @param {HTMLElement} ad
 */
function removeAd (ad) {
  const adModule = ad.parentElement ? ad.parentElement.parentElement : null
  if (adModule) {
    removeBlankTextNode(adModule.previousSibling)
    removeBlankTextNode(adModule.nextSibling)
    adModule.remove()
  }
}

/**
 * Used to assign ids to injected ads. These are easier to track visually in the DOM than random ints.
 * Generally, we will try to add static IDs to known ad locations e.g. googleAdRR & googleAdPersistentPlayer.
 * For now this is only used by liveblog ad injection
 * @returns {string}
 */
function generateDynamicAdId () {
  dynamicAdIndex += 1
  return `googleAdInjected${dynamicAdIndex}`
}

/**
 * @param {googletag.events} event - slotRenderEnded event from googletag
 */
function onSlotRenderEnded (event) {
  
  const slotId = event.slot.getSlotElementId()
  const adSlot = document.getElementById(slotId)

  if (adSlot) {
    const adModule = adSlot.parentElement
      ? adSlot.parentElement.parentElement
      : null

    // If the ad request came back empty, remove the ad module and destroy the ad slot
    if (event.isEmpty && adModule) {
      if (
        window.googletag &&
        typeof window.googletag.destroySlots !== 'undefined'
      ) {
        window.googletag.destroySlots([event.slot])
      }

      removeBlankTextNode(adModule.previousSibling)
      removeBlankTextNode(adModule.nextSibling)
      adModule.remove()
    }
  }
  setTimeout(() => {
    googletag.cmd.push(()=>{
      googletag.pubads().refresh([event.slot])
    });
  }, 60000)
}

function onWindowResize () {
  if (getMediaQuery() !== currentMediaQuery) {
    log('GoogleDfp: Media query changed. Refreshing all ads...')
    currentMediaQuery = getMediaQuery()
    // going to just refresh everything here, including dynamic ad slots
    // there would be too much logic to try to only refresh the visible stuff
    // this is a big edge case anyway as no one resizes their browser
    // like this after opening a webpage
    window.googletag.cmd.push(() => {
      window.googletag.pubads().refresh()
    })
  }
}

module.exports = {
  initializeAdConfigVariables,
  resetAdConfigVariables,
  removeAd,
  shouldRenderAd,
  generateDynamicAdId,
  isValidHeaderBiddingSize,
  slotAlreadyExists
}