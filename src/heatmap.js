class Heatmap {
  constructor(options = {}) {
    this.endpoint = options.endpoint || '/api/heatmap';
    this.url = options.url || window.location.href;
    this.sampleRate = options.sampleRate || 1.0; // 100% by default
    this.sessionId = this.generateSessionId();
    this.events = [];
    this.flushInterval = options.flushInterval || 10000; // 10 seconds
    
    this.init();
  }
  
  init() {
    window.addEventListener('click', this.recordClick.bind(this));
    // Set up periodic flush
    setInterval(() => this.flush(), this.flushInterval);
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }
  
  recordClick(event) {
    // Sample the event based on sample rate
    if (Math.random() > this.sampleRate) return;
    
    const { clientX, clientY, pageX, pageY } = event;
    
    this.events.push({
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      x: clientX,
      y: clientY,
      pageX: pageX,
      pageY: pageY,
      path: window.location.pathname,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });
    
    // Flush if we have a lot of events
    if (this.events.length >= 10) {
      this.flush();
    }
  }
  
  async flush() {
    if (this.events.length === 0) return;
    
    const eventsToSend = [...this.events];
    this.events = [];
    
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events: eventsToSend,
          url: this.url,
          userAgent: navigator.userAgent
        }),
        // Use keepalive to ensure the request completes even if the page is unloading
        keepalive: true
      });
      
      console.log(`Heatmap: ${eventsToSend.length} events sent successfully`);
    } catch (error) {
      console.error('Heatmap: Failed to send events', error);
      // Put the events back in the queue
      this.events = [...eventsToSend, ...this.events];
    }
  }
  
  generateSessionId() {
    // Generate a random session ID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.Heatmap = Heatmap;
}

// Export for ES modules (remove this line or make it conditional)
// export default Heatmap;

// Use this pattern instead to support both module and non-module contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Heatmap;
} else if (typeof define === 'function' && define.amd) {
  define([], function() { return Heatmap; });
} 