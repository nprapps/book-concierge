var DataConsent = require('./lib/data-consent');

var googleAnalyticsAlreadyInitialized = false;

var setupGoogleAnalytics = function() {
  // Bail early if opted out of Performance and Analytics consent groups
  if (!DataConsent.hasConsentedTo(DataConsent.PERFORMANCE_AND_ANALYTICS)) return;

  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  // embedded analytics
  if (window.top !== window) {
    ga("create", "UA-5828686-75", "auto");
  } else {
    // standalone page analytics
    ga("create", "UA-5828686-4", "auto");
    ga("set", {
      dimension2: window.PROJECT_ANALYTICS.topicIDs || [],
      dimension3: window.PROJECT_ANALYTICS.primaryTopic || "News",
      dimension6: window.PROJECT_ANALYTICS.secondaryTopics || [],
      dimension22: document.title
    });
  }
  ga("send", "pageview");
  googleAnalyticsAlreadyInitialized = true;
}

// Add GA initialization to window.onload
var oldOnload = window.onload;
window.onload = (typeof window.onload != 'function') ? setupGoogleAnalytics : function() { oldOnload(); setupGoogleAnalytics(); };

// Listen for DataConsentChanged event 
document.addEventListener('npr:DataConsentChanged', () => {

  // Bail early if it's already been set up 
  if (googleAnalyticsAlreadyInitialized) return;

  // When a user opts into performance and analytics cookies, initialize GA
  if (DataConsent.hasConsentedTo(DataConsent.PERFORMANCE_AND_ANALYTICS)) {
    setupGoogleAnalytics();
  }  
});