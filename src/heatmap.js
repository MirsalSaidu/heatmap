class Heatmap {
  constructor(options = {}) {
    this.options = {
      endpoint: options.endpoint || '/api/heatmap',
      sampleRate: options.sampleRate || 1, // capture all clicks
      maxBufferSize: options.maxBufferSize || 10, // events before sending
      ...options
    };
    
    this.buffer = [];
    this.sessionId = this.generateSessionId();
    this.init();
  }

  init() {
    document.addEventListener('click', this.handleClick.bind(this));
    window.addEventListener('beforeunload', this.flush.bind(this));
  }

  handleClick(event) {
    if (Math.random() > this.options.sampleRate) return;
    
    const data = {
      timestamp: Date.now(),
      x: event.clientX,
      y: event.clientY,
      pageX: event.pageX,
      pageY: event.pageY,
      path: window.location.pathname,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      sessionId: this.sessionId
    };
    
    this.buffer.push(data);
    
    if (this.buffer.length >= this.options.maxBufferSize) {
      this.flush();
    }
  }

  flush() {
    if (this.buffer.length === 0) return;
    
    const payload = {
      events: [...this.buffer],
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    fetch(this.options.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      // Using beacon for beforeunload events
      keepalive: true
    }).catch(e => console.error('Error sending heatmap data:', e));
    
    this.buffer = [];
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}

// Add this specific export statement for ES modules
export default Heatmap;

// Add this for non-module environments
if (typeof window !== 'undefined') {
  window.Heatmap = Heatmap;
} 