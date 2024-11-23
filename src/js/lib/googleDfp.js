/* global customElements HTMLElement */
/* eslint-disable no-undef */

// import { EVENT_HISTORY_RENDERED } from '../util/HistoryManager'
const { removeAd, shouldRenderAd, slotAlreadyExists } = require('./adUtil')
const AdModel = require('./adModel')

const AD_SELECTOR = '.GoogleDfpAd'

class GoogleDfp extends HTMLElement {
  connectedCallback () {
    const self = this
    this.historyRenderedSetUp = function (event) {
      self.init()
    }
    // this.addHistoryListener()
    this.init()
  }

  init () {
    // select the google ad in this custom element
    this.ad = this.querySelector(AD_SELECTOR)

    // bail if ad div is already associated with another slot
    if (!slotAlreadyExists(this.ad.id)) {
      this.processAd(this.ad)
    }
  }

//   disconnectedCallback () {
//     document.body.removeEventListener(
//       EVENT_HISTORY_RENDERED,
//       this.historyRenderedSetUp
//     )
//   }

//   addHistoryListener () {
//     document.body.addEventListener(
//       EVENT_HISTORY_RENDERED,
//       this.historyRenderedSetUp
//     )
//   }

  /**
   * @param {HTMLElement} ad
   */
  processAd (ad) {
    if (!shouldRenderAd(ad)) {
      removeAd(ad)
      return
    }
    const adModel = new AdModel(ad)
    // Only the sizes need to be set at this stage. Everything else: defining the slot, setting targeting, defining
    // google size mapping, calling display()... will happen after header bidding is completed
    adModel.configureSizeMapping()
    window.dispatchEvent(
      new CustomEvent('npr:GoogleDfpSlotProcessed', { detail: adModel })
    )
  }
}

function registerPSGoogleDfpAd () {
  customElements.define('ps-google-dfp-ad', GoogleDfp)
}

module.exports = {registerPSGoogleDfpAd,GoogleDfp}