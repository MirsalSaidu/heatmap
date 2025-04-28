class HeatmapViewer {
  constructor(options = {}) {
    this.container = options.container;
    this.options = {
      radius: 25,
      maxOpacity: 0.6,
      minOpacity: 0,
      blur: 0.85,
      ...options
    };
    this.data = [];
    this.initialize();
  }

  initialize() {
    this.container.innerHTML = '<div class="heatmap-placeholder">Select a URL and apply filters to view heatmap data</div>';
  }

  setData(data) {
    this.data = data;
    if (!data || data.length === 0) {
      this.container.innerHTML = '<div class="heatmap-placeholder">No data available for the selected criteria</div>';
      return;
    }
    
    this.render();
  }

  render() {
    // Simple placeholder implementation
    this.container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = this.container.clientWidth;
    canvas.height = this.container.clientHeight;
    this.container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw heatmap points
    this.data.forEach(point => {
      const x = (point.x / point.viewport_width) * canvas.width;
      const y = (point.y / point.viewport_height) * canvas.height;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.options.radius);
      gradient.addColorStop(0, `rgba(255, 0, 0, ${this.options.maxOpacity})`);
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, this.options.radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
}

export default HeatmapViewer; 