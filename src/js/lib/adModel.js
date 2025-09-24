const Debug = require('./../lib/debug');

const GAMNetworkId = '6735';
const zone = 'arts___life_books/book_concierge'

class AdModel {
  /**
   * @param {HTMLElement} adElement
   */
  constructor (adElement) {
    this.id = adElement.id;
    this.isOutstreamVideoEnabled = true;
    this.renderableSizes = [];
    this.headerBiddingSizes = {aps: [], openwrap: []};
    /** @type {googletag.Slot|null} */
    this.slot = null;
    this.constructFromHtml(adElement);
    this.defineGoogleAdSlot()
  }

  /**
   * @param {HTMLElement} adElement
   */
  constructFromHtml (adElement) {
    const data = JSON.parse(adElement.dataset.adConfig);
    this.location = data.location;

    if (window.innerWidth <= 650) {
      this.adUnitName = data.mobile_ad_unit;
    } else {
      this.adUnitName = data.desktop_ad_unit;
    }
    this.slotName = `/${GAMNetworkId}/${this.adUnitName}/${zone}`;

    const elementWidth = adElement.offsetWidth;
    data.gam_sizes.forEach(size => {
      if (elementWidth >= size[0] || size[0] === 'fluid') {
        this.renderableSizes.push(size);
      }
    });
    Object.keys(data.header_bidding_sizes).forEach(vendor => {
      data.header_bidding_sizes[vendor].forEach(size => {
        if (elementWidth >= size[0]) {
          this.headerBiddingSizes[vendor].push(size);
        }
      });
    });
  }

  defineGoogleAdSlot () {
    googletag.cmd.push(() => {
      this.slot = googletag
        .defineSlot(this.slotName, this.renderableSizes, this.id)
        .addService(googletag.pubads());
      Debug.log(`adModel -> defineSlot() ad slot: '${this.id}'`);
    });
  }
}

module.exports = AdModel;
