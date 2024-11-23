module.exports = function throttle (interval, throttledFunction) {
    if (interval <= 0) {
      return throttledFunction
    }
  
    let lastTrigger = 0
    let timeout
    let lastArguments
  
    return function () {
      lastArguments = arguments
  
      // Already scheduled to run.
      if (timeout) {
        return
      }
  
      const context = this
      const now = +Date.now()
      const delay = interval - now + lastTrigger
  
      // Waited long enough so execute.
      if (delay <= 0) {
        lastTrigger = now
        throttledFunction.apply(context, lastArguments)
  
        // Schedule for later.
      } else {
        timeout = setTimeout(function () {
          lastTrigger = now
          timeout = null
          throttledFunction.apply(context, lastArguments)
        }, delay)
      }
    }
  }