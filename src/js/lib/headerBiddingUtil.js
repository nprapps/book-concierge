const Debug = require('./../lib/debug');

const BIDDING_TIMEOUT = 1500;

/**
 * @param {AdModel[]} adModels
 */
function requestBids (adModels) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject('Header bidding call blocked or timed out'),
      BIDDING_TIMEOUT
    );
    const configs = createSlotConfigs(adModels);
    // keep track of which bids are completed
    const completed = {
      openwrap: false,
      aps: false
    }
    let openWrapBidData = [];

    /**
     * @param {'aps'|'openwrap'} vendorName
     * @param {[]|null} [bidData] bidData only applies to openwrap
     */
    const onBiddingCompleted = (vendorName, bidData = null) => {
      Debug.log(`headerBiddingUtil -> bidding completed for ${vendorName}`);
      completed[vendorName] = true;
      if (vendorName === 'openwrap' && bidData) {
        openWrapBidData = bidData;
      }
      if (completed.aps && completed.openwrap) {
        resolve(openWrapBidData);
      }
    }

    requestApsBids(configs.aps)
      .then(() => onBiddingCompleted('aps'))
      .catch(e => reject('aps bidding failed:', e));

      requestOpenwrapBids(configs.openwrap)
        .then(data => onBiddingCompleted('openwrap', data))
        .catch(e => reject('openwrap bidding failed:', e));
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
          sizes: model.headerBiddingSizes.openwrap
        }
      },
      sizes: model.headerBiddingSizes.openwrap
    });

    // amazon aps
    let apsConfig = {
      slotID: model.id,
      slotName: model.slotName
    };
    if (model.isOutstreamVideoEnabled) {
      apsConfig = {
        ...apsConfig,
        mediaType: 'multi-format',
        multiFormatProperties: {
          display: {
            sizes: model.headerBiddingSizes.aps
          },
          video: {
            sizes: [[320, 240]]
          }
        }
      }
    } else {
      apsConfig = { ...apsConfig, sizes: model.headerBiddingSizes.aps };
    }
    slotConfigs.aps.push(apsConfig);
  })
  return slotConfigs;
}

/**
 * @param {Object} configs - openwrap configs
 */
function requestOpenwrapBids (configs) {
  Debug.log('headerBiddingUtil -> bidding started for openwrap');
  return new Promise((resolve, reject) => {
    if (configs.length) {
      if (typeof window.PWT.requestBids === 'function') {
        window.PWT.requestBids(configs, adUnitsArray => {
          resolve(adUnitsArray);
        })
      } else {
        reject('requestBids not a function', window.PWT);
      }
    } else {
      reject('invalid or non-existent openwrap configs');
    }
  })
}

/**
 * @param {Object} configs - aps configs
 */
function requestApsBids (configs) {
  Debug.log('headerBiddingUtil -> bidding started for aps');
  return new Promise((resolve, reject) => {
    if (configs.length) {
      window.apstag.fetchBids(
        {
          slots: configs
        },
        () => resolve()
      )
    } else {
      reject('invalid or non-existent aps configs');
    }
  })
}

module.exports = {
  requestBids
}