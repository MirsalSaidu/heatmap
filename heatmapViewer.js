class HeatmapViewer {
  constructor(options = {}) {
    this.container = options.container;
    this.options = {
      radius: 25,
      maxOpacity: 0.6,
      minOpacity: 0,
      blur: 0.85,
      showBackground: true,
      ...options
    };
    this.data = [];
    this.initialize();
  }

  initialize() {
    this.container.innerHTML = '<div class="heatmap-placeholder">Select a URL and apply filters to view heatmap data</div>';
  }

  async loadScreenshot(url) {
    try {
      // For serverless environments, use a placeholder instead
      return null;
    } catch (error) {
      console.error('Error loading screenshot:', error);
      return null;
    }
  }

  setData(data) {
    this.data = data;
    if (!data || data.length === 0) {
      this.container.innerHTML = '<div class="heatmap-placeholder">No data available for the selected criteria</div>';
      return;
    }
    
    this.render();
  }

  async render() {
    this.container.innerHTML = '';
    
    // Create a wrapper for positioning
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    this.container.appendChild(wrapper);
    
    // Create placeholder for website background
    if (this.options.showBackground && this.data.length > 0) {
      const url = this.data[0].url;
      
      // Create placeholder with URL info
      const placeholder = document.createElement('div');
      placeholder.style.width = '100%';
      placeholder.style.height = '600px';
      placeholder.style.backgroundColor = '#f8f9fa';
      placeholder.style.display = 'flex';
      placeholder.style.flexDirection = 'column';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.style.color = '#555';
      placeholder.style.textAlign = 'center';
      placeholder.style.padding = '20px';
      placeholder.innerHTML = `
        <div style="font-size: 1.2rem; margin-bottom: 10px;">Website: ${url}</div>
        <div style="font-style: italic; margin-bottom: 20px;">Heatmap overlay for captured clicks</div>
        <div style="color: #888; font-size: 0.9rem;">Screenshots are not available in this environment</div>
      `;
      wrapper.appendChild(placeholder);
    }
    
    // Create canvas for heatmap
    const canvas = document.createElement('canvas');
    canvas.style.position = this.options.showBackground ? 'absolute' : 'relative';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    wrapper.appendChild(canvas);
    
    // Get dimensions
    const width = wrapper.clientWidth;
    const height = this.options.showBackground ? 600 : 500;
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Draw heatmap
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    
    // Draw heatmap points
    this.data.forEach(point => {
      const x = (point.x / (point.viewport_width || 1000)) * width;
      const y = (point.y / (point.viewport_height || 800)) * height;
      
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