class Heatmap {
  constructor(options = {}) {
    this.options = {
      endpoint: options.endpoint,
      sampleRate: options.sampleRate || 1.0,
      url: options.url || window.location.href,
      batchSize: options.batchSize || 10,
      batchInterval: options.batchInterval || 5000, // 5 seconds
    };

    this.events = [];
    this.sessionId = this.generateSessionId();
    this.init();
  }

  generateSessionId() {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, () => {
      return Math.floor(Math.random() * 16).toString(16);
    });
  }

  init() {
    // Gather initial user data
    this.userData = {
      browserInfo: this.getBrowserInfo(),
      deviceInfo: this.getDeviceInfo(),
      locationInfo: null,
      referrer: document.referrer || 'direct',
      initialUrl: window.location.href,
      entryTimestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language || navigator.userLanguage,
      cookiesEnabled: navigator.cookieEnabled
    };

    // Try to get geolocation if available and user permits
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userData.locationInfo = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
        },
        (error) => {
          console.log('Geolocation not available or denied:', error.message);
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    }
    
    // Track page navigation time
    this.trackPageVisibility();
    this.trackPageLoadTime();
    
    // Track clicks
    document.addEventListener('click', this.recordClick.bind(this));
    
    // Set up batch sending
    this.startBatchSending();
  }

  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName = "Unknown";
    let browserVersion = "Unknown";
    let osName = "Unknown";
    let osVersion = "Unknown";
    
    // Extract browser info
    if (ua.indexOf("Firefox") > -1) {
      browserName = "Firefox";
      browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)[1];
    } else if (ua.indexOf("Chrome") > -1 && ua.indexOf("Edg") === -1 && ua.indexOf("OPR") === -1) {
      browserName = "Chrome";
      browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)[1];
    } else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) {
      browserName = "Safari";
      browserVersion = ua.match(/Version\/(\d+\.\d+)/)[1];
    } else if (ua.indexOf("Edg") > -1) {
      browserName = "Edge";
      browserVersion = ua.match(/Edg\/(\d+\.\d+)/)[1];
    } else if (ua.indexOf("OPR") > -1) {
      browserName = "Opera";
      browserVersion = ua.match(/OPR\/(\d+\.\d+)/)[1];
    }
    
    // Extract OS info
    if (ua.indexOf("Windows") > -1) {
      osName = "Windows";
      osVersion = ua.indexOf("Windows NT 10.0") > -1 ? "10" : 
                 ua.indexOf("Windows NT 6.3") > -1 ? "8.1" :
                 ua.indexOf("Windows NT 6.2") > -1 ? "8" :
                 ua.indexOf("Windows NT 6.1") > -1 ? "7" : "Unknown";
    } else if (ua.indexOf("Mac") > -1) {
      osName = "macOS";
      const macMatch = ua.match(/Mac OS X (\d+[._]\d+)/);
      osVersion = macMatch ? macMatch[1].replace('_', '.') : "Unknown";
    } else if (ua.indexOf("Android") > -1) {
      osName = "Android";
      osVersion = ua.match(/Android (\d+\.\d+)/)[1];
    } else if (ua.indexOf("iOS") > -1 || ua.indexOf("iPhone") > -1 || ua.indexOf("iPad") > -1) {
      osName = "iOS";
      const iosMatch = ua.match(/OS (\d+_\d+)/);
      osVersion = iosMatch ? iosMatch[1].replace('_', '.') : "Unknown";
    } else if (ua.indexOf("Linux") > -1) {
      osName = "Linux";
    }
    
    return {
      browserName,
      browserVersion,
      osName,
      osVersion,
      userAgent: ua,
      isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(ua),
      isTablet: /Tablet|iPad/i.test(ua)
    };
  }

  getDeviceInfo() {
    return {
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: screen.orientation ? screen.orientation.type : window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };
  }

  trackPageVisibility() {
    let startTime = Date.now();
    let totalVisibleTime = 0;
    let isVisible = !document.hidden;
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is now hidden, calculate visible time
        if (isVisible) {
          totalVisibleTime += Date.now() - startTime;
          isVisible = false;
        }
      } else {
        // Page is now visible, reset timer
        startTime = Date.now();
        isVisible = true;
      }
    });
    
    // Track time spent on page before leaving
    window.addEventListener('beforeunload', () => {
      if (isVisible) {
        totalVisibleTime += Date.now() - startTime;
      }
      this.userData.visibleTime = totalVisibleTime;
      this.sendEvents(true); // Force send on page exit
    });
  }

  trackPageLoadTime() {
    if (window.performance) {
      window.addEventListener('load', () => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        const domReadyTime = perfData.domComplete - perfData.domLoading;
        
        this.userData.performanceMetrics = {
          pageLoadTime,
          domReadyTime,
          networkLatency: perfData.responseEnd - perfData.requestStart,
          redirectTime: perfData.redirectEnd - perfData.redirectStart,
          domContentLoadedTime: perfData.domContentLoadedEventEnd - perfData.navigationStart
        };
      });
    }
  }

  recordClick(e) {
    if (Math.random() > this.options.sampleRate) return;
    
    const timestamp = new Date().toISOString();
    const { clientX, clientY, pageX, pageY, target } = e;
    const path = this.getElementPath(target);
    const clickDetails = {
      elementType: target.tagName.toLowerCase(),
      elementClasses: target.className.toString(),
      elementId: target.id,
      elementContent: this.getElementContent(target),
      linkDestination: target.tagName === 'A' ? target.href : null
    };
    
    this.events.push({
      sessionId: this.sessionId,
      timestamp,
      x: clientX,
      y: clientY,
      pageX,
      pageY,
      path,
      url: window.location.href,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      clickDetails
    });
    
    // If we've reached the batch size, send immediately
    if (this.events.length >= this.options.batchSize) {
      this.sendEvents();
    }
  }

  getElementPath(element) {
    if (!element || element === document.body) return '';
    
    let path = element.tagName.toLowerCase();
    if (element.id) {
      path += `#${element.id}`;
      return path; // If element has ID, that's unique enough
    }
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/);
      if (classes.length > 0) {
        path += `.${classes.join('.')}`;
      }
    }
    
    // Add element position among siblings
    const siblings = Array.from(element.parentNode.children);
    if (siblings.length > 1) {
      const index = siblings.indexOf(element) + 1;
      path += `:nth-child(${index})`;
    }
    
    return path;
  }

  getElementContent(element) {
    // Get meaningful content, prioritizing text and alt attributes
    if (element.tagName === 'IMG' && element.alt) {
      return `Image: ${element.alt.substring(0, 50)}`;
    }
    
    const text = element.innerText || element.textContent;
    if (text) {
      return text.trim().substring(0, 50) + (text.length > 50 ? '...' : '');
    }
    
    return '';
  }

  startBatchSending() {
    this.batchInterval = setInterval(() => {
      if (this.events.length > 0) {
        this.sendEvents();
      }
    }, this.options.batchInterval);
  }

  sendEvents(forceSync = false) {
    if (this.events.length === 0) return;
    
    const eventsToSend = [...this.events];
    this.events = [];
    
    const payload = {
      events: eventsToSend,
      url: this.options.url, 
      userAgent: navigator.userAgent,
      userData: this.userData
    };
    
    const sendData = () => {
      fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(error => {
        console.error('Error sending heatmap data:', error);
      });
    };
    
    if (forceSync && navigator.sendBeacon) {
      // Use sendBeacon for more reliable data sending on page unload
      navigator.sendBeacon(
        this.options.endpoint,
        new Blob([JSON.stringify(payload)], { type: 'application/json' })
      );
    } else {
      sendData();
    }
  }
}

// Make Heatmap available globally
window.Heatmap = Heatmap;

// Export for ES modules (remove this line or make it conditional)
// export default Heatmap;

// Use this pattern instead to support both module and non-module contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Heatmap;
} else if (typeof define === 'function' && define.amd) {
  define([], function() { return Heatmap; });
} 