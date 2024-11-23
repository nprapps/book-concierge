const { isValidHeaderBiddingSize } = require ('./adUtil')
const DEBUG_ENABLED = 'PS_GOOGLE_DFP_DEBUG'

class AdModel {
  /**
   * @param {HTMLElement} adElement
   */
  constructor (adElement) {
    this.constructFromHtml(adElement)
  }

  /**
   * @param {HTMLElement} el
   */
  constructFromHtml (el) {
    this.id = el.id
    this.isOutOfPage = el.dataset.outOfPage || false
    this.isFluid = el.hasAttribute('data-is-fluid')
    this.targetingData = JSON.parse(el.dataset.targetingData || '{}')
    this.adSizes = el.dataset.slotSizes || null
    this.adSizesForHeaderBidding = []
    this.adSizeMapString = el.dataset.slotAdsizemap || null
    this.sizeMapping = {}
    this.slotName = `/${el.dataset.slotName}` || ''
    this.isHiddenOnMobile = el.dataset.hideOnmobile || false
    this.isHiddenOnDesktop = el.dataset.hideOndesktop || false
    // This should vary per slot. Defaulting to false until we test the initial impact of header bidding
    this.isOutstreamVideoEnabled = false
    /** @type {googletag.Slot|null} */
    this.slot = null
  }

  get debugEnabled () {
    return localStorage.getItem(DEBUG_ENABLED)
  }

  set debugEnabled (bool) {
    if (bool) {
      localStorage.setItem(DEBUG_ENABLED, true)
    } else {
      localStorage.removeItem(DEBUG_ENABLED)
    }
  }

  /**
   * method call must be wrapped in window.googletag.cmd.push(()=>{})
   */
  createGoogleAdSlot () {
    const adSizesArr = JSON.parse(this.adSizes) || []
    if (this.isOutOfPage) {
      this.slot = window.googletag
        .defineOutOfPageSlot(this.slotName, this.id)
        .addService(window.googletag.pubads())
    } else {
      if (this.isFluid) {
        adSizesArr.unshift('fluid')
      }
      this.slot = window.googletag
        .defineSlot(this.slotName, adSizesArr, this.id)
        .addService(window.googletag.pubads())
    }
  }

  /**
   * A slot must be defined before calling this method
   */
  setGoogleAdTargeting () {
    if (this.targetingData && this.slot) {
      for (const key in this.targetingData) {
        const value = this.targetingData[key]
        if (value) {
          // If it is not an empty array or not array at all
          if (
            (Array.isArray(value) && value.length) ||
            (!Array.isArray(value) && key !== 'additionalData')
          ) {
            this.slot.setTargeting(key, value)
          }
        }
      }
    }
  }

  configureSizeMapping () {
    // Following vars used to determine if module is hidden via ad size maps (used in auto-positioning)
    // The ad size map window size that's closest to - but not larger than - the current window size applies
    // We only care about width, so we ignore height
    // Thus, for window width smaller than the current window width, we only need to track
    // the largest window size width where it's hidden and the largest where it's visible
    // At the end, the larger of those determines if it's visible or hidden
    let closestHiddenWindowWidth = -1 // only applies if greater than zero
    let closestVisibleWindowWidth = -1 // only applies if greater than zero
    let currentWindowWidth = window.innerWidth

    // set width for bottom ad
    if (this.id == "ad-secondary" && currentWindowWidth > 600) {
      currentWindowWidth = window.innerWidth - 220
    }
    
    // Ad Size Mapping. Maps ad sizes to screen sizes to handle responsive ads
    if (
      this.adSizeMapString !== '' &&
      this.adSizeMapString !== undefined &&
      this.adSizeMapString !== null &&
      this.adSizeMapString.length > 0
    ) {
      const sizeMapping = {}
      const adSizeList = JSON.parse(this.adSizeMapString)
      adSizeList.forEach(
        function (adSizeItem) {
          let adSizes = adSizeItem.slice(1)
          const sizeMapWindowWidth = adSizeItem[0][0]
          let isVisibleBySizeMap = true
          // Check if ad is hidden by ad size map
          if (
            adSizes.length === 1 &&
            adSizes[0][0] === 0 &&
            adSizes[0][1] === 0
          ) {
            adSizes = [] // pass empty array instead of 0x0
            isVisibleBySizeMap = false
          }

          if (this.isFluid) {
            adSizes.unshift('fluid')
          }

          // Check if this window width is one the two closest widths we need to track
          if (
            typeof sizeMapWindowWidth !== 'undefined' &&
            sizeMapWindowWidth <= currentWindowWidth
          ) {
            // only applies if smaller than screen size
            if (
              isVisibleBySizeMap &&
              sizeMapWindowWidth > closestVisibleWindowWidth
            ) {
              closestVisibleWindowWidth = sizeMapWindowWidth
              this.adSizesForHeaderBidding = [] // reset this in case we had populated it in a previous iteration
              adSizes.forEach(
                function (size) {
                  
                  if (isValidHeaderBiddingSize(size)) {
                    this.adSizesForHeaderBidding.push(size)
                  }
                }.bind(this)
              )
            } else if (
              !isVisibleBySizeMap &&
              sizeMapWindowWidth > closestHiddenWindowWidth
            ) {
              closestHiddenWindowWidth = sizeMapWindowWidth
            }
            const key = `${adSizeItem[0]}`
            if (!Array.isArray(sizeMapping[key])) {
              sizeMapping[key] = []
            }
            sizeMapping[key].push(adSizes)
          }
        }.bind(this)
      )
      this.sizeMapping = sizeMapping
    }

    this.setSizeMapHiddenAttribute(
      closestHiddenWindowWidth,
      closestVisibleWindowWidth
    )
  }

  setSizeMapHiddenAttribute (
    closestHiddenWindowWidth,
    closestVisibleWindowWidth
  ) {
    // If the hidden width is closer (bigger) than the visible width, it's hidden
    if (
      closestHiddenWindowWidth >= 0 &&
      closestHiddenWindowWidth > closestVisibleWindowWidth
    ) {
      const ad = document.querySelector(`#${this.id}`)
      ad.setAttribute('data-ad-size-map-hidden', true) // to check in DOM
    }
  }

  /**
   * method call must be wrapped in window.googletag.cmd.push(()=>{})
   */
  defineGoogleAdSizeMapping () {
    const mapping = window.googletag.sizeMapping()
    Object.keys(this.sizeMapping).forEach(key => {
      // key is of the form '728x1' and needs to be turned into [728, 1]
      const viewportSize = key.split(',')
      if (viewportSize.length) {
        const viewportSizeArray = viewportSize.map(i => parseInt(i))
        mapping.addSize(viewportSizeArray, ...this.sizeMapping[key])
      }
    })
    this.slot.defineSizeMapping(mapping.build())
  }
}

module.exports = AdModel