(function() {
  /*
    Adds OneTrust scripts to the document head.
  */
  const isTesting = ['stage-apps.npr.org','localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  let autoBlock = document.createElement("script");
  autoBlock.src = `https://cdn.cookielaw.org/consent/82089dfe-410c-4e1b-a7f9-698174b62a86${isTesting ? '-test': ''}/OtAutoBlock.js`;
  autoBlock.type = 'text/javascript';
  document.head.appendChild(autoBlock);

  let sdkStub = document.createElement("script");
  sdkStub.src = "https://cdn.cookielaw.org/scripttemplates/otSDKStub.js";
  sdkStub.type = 'text/javascript';
  sdkStub.setAttribute('charset', 'UTF-8');
  sdkStub.setAttribute('data-domain-script', `82089dfe-410c-4e1b-a7f9-698174b62a86${isTesting ? '-test' : ''}`);
  document.head.appendChild(sdkStub);

  let optanonWrapper = document.createElement("script")
  optanonWrapper.type = 'text/javascript'
  optanonWrapper.innerHTML = `function OptanonWrapper() {
    console.log('gdpr-compliance -> OptanonWrapper loaded');
    window.NPR = window.NPR || {};
    window.NPR.OptanonWrapperLoaded = true;
    document.dispatchEvent(new CustomEvent('npr:DataConsentAvailable'));
    OneTrust.OnConsentChanged(function() {
      document.dispatchEvent(new CustomEvent(\'npr:DataConsentChanged\'));
    });
  }`
  document.head.appendChild(optanonWrapper);

  let otCCPAiab = document.createElement("script");
  otCCPAiab.src = "https://cdn.cookielaw.org/opt-out/otCCPAiab.js";
  otCCPAiab.type = 'text/javascript';
  otCCPAiab.setAttribute('charset', 'UTF-8');
  otCCPAiab.setAttribute('ccpa-opt-out-ids', 'C0004');
  otCCPAiab.setAttribute('ccpa-opt-out-geo', 'us');
  otCCPAiab.setAttribute('ccpa-opt-out-lspa', 'false');
  document.head.appendChild(otCCPAiab);
})();
