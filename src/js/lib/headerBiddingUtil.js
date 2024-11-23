const BIDDING_TIMEOUT = 1500
const DEBUG_ENABLED = 'PS_GOOGLE_DFP_DEBUG'
let apstagInitialized = false

function log (message, data = null) {
  if (localStorage.getItem(DEBUG_ENABLED)) {
    if (data) {
      console.log(message, data)
    } else {
      console.log(message)
    }
  }
}

function initializeApsTag () {
  if (!apstagInitialized) {
    window.apstag.init({
      pubID: '5116',
      adServer: 'googletag',
      bidTimeout: 1000,
      deals: true,
      params: { si_section: 'News' }
    })
    apstagInitialized = true
  }
}

function resetHeaderBiddingVars () {
  // If we don't reset these they'll pile up on every page transition and I think this might potentially cause clashes
  // @see https://github.com/PubMatic/OpenWrap/blob/master/src_new/controllers/custom.js#L293
  if (window.PWT) {
    window.PWT.bidIdMap = {}
    window.PWT.adUnits = {}
  }
}

/**
 * @param {AdModel[]} adModels
 */
function requestBids (adModels) {
  return new Promise((resolve, reject) => {
    setTimeout(
      () => reject('Header bidding call blocked or timed out'),
      BIDDING_TIMEOUT
    )
    const configs = createSlotConfigs(adModels)
    // keep track of which bids are completed
    const completed = {
      openwrap: false,
      aps: false
    }
    let openWrapBidData = []

    /**
     * @param {'aps'|'openwrap'} vendorName
     * @param {[]|null} [bidData] bidData only applies to openwrap
     */
    const onBiddingCompleted = (vendorName, bidData = null) => {
      log(
        `HeaderBidding: bidding completed for ${vendorName}`,
        new Date().toISOString()
      )
      completed[vendorName] = true
      if (vendorName === 'openwrap' && bidData) {
        openWrapBidData = bidData
      }
      if (completed.aps && completed.openwrap) {
        resolve(openWrapBidData)
      }
    }

    requestApsBids(configs.aps)
      .then(() => onBiddingCompleted('aps'))
      .catch(e => reject('aps bidding failed:', e))

    const onOpenWrapReady = () => {
      document.removeEventListener('npr:OpenWrapReady', onOpenWrapReady)
      requestOpenwrapBids(configs.openwrap)
        .then(data => onBiddingCompleted('openwrap', data))
        .catch(e => reject('openwrap bidding failed:', e))
    }

    if (window.PWT && window.PWT.OpenWrapReady) {
      onOpenWrapReady()
    } else {
      log('HeaderBidding: waiting for openwrap')
      document.addEventListener('npr:OpenWrapReady', onOpenWrapReady)
    }
  })
}

/**
 * @param {AdModel[]} adModels
 * @returns {{aps: *[], openwrap: *[]}}
 */
function createSlotConfigs (adModels) {
  const slotConfigs = {
    openwrap: [],
    aps: []
  }
  adModels.forEach((model, index) => {
    // pubmatic openwrap
    slotConfigs.openwrap.push({
      code: model.id,
      divId: model.id,
      adUnitId: model.slotName,
      adUnitIndex: `${index + 1}`,
      mediaTypes: {
        banner: {
          sizes: model.adSizesForHeaderBidding
        }
      },
      sizes: model.adSizesForHeaderBidding
    })

    // amazon aps
    let apsConfig = {
      slotID: model.id,
      slotName: model.slotName
    }
    if (model.isOutstreamVideoEnabled) {
      apsConfig = {
        ...apsConfig,
        mediaType: 'multi-format',
        multiFormatProperties: {
          display: {
            sizes: model.adSizesForHeaderBidding
          },
          video: {
            sizes: [[320, 240]]
          }
        }
      }
    } else {
      apsConfig = { ...apsConfig, sizes: model.adSizesForHeaderBidding }
    }
    slotConfigs.aps.push(apsConfig)
  })
  return slotConfigs
}

/**
 * @param {Object} configs - openwrap configs
 */
function requestOpenwrapBids (configs) {
  log('HeaderBidding: bidding started for openwrap', new Date().toISOString())
  return new Promise((resolve, reject) => {
    if (configs.length) {
      if (typeof window.PWT.requestBids === 'function') {
        window.PWT.requestBids(configs, adUnitsArray => {
          resolve(adUnitsArray)
        })
      } else {
        reject('requestBids not a function', window.PWT)
      }
    } else {
      reject('invalid or non-existent openwrap configs')
    }
  })
}

/**
 * @param {Object} configs - aps configs
 */
function requestApsBids (configs) {
  log('HeaderBidding: bidding started for aps', new Date().toISOString())
  return new Promise((resolve, reject) => {
    if (configs.length) {
      window.apstag.fetchBids(
        {
          slots: configs
        },
        () => resolve()
      )
    } else {
      reject('invalid or non-existent aps configs')
    }
  })
}

module.exports = {
  initializeApsTag,
  resetHeaderBiddingVars,
  requestBids
}