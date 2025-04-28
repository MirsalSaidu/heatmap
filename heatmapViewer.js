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
      // Create a URL to fetch a screenshot - you'll need to implement this API endpoint
      const screenshotUrl = `/api/screenshot?url=${encodeURIComponent(url)}`;
      const response = await fetch(screenshotUrl);
      
      if (response.ok) {
        return await response.blob();
      } else {
        console.warn('Failed to load screenshot, using placeholder');
        return null;
      }
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
    
    // Add background image if option is enabled
    if (this.options.showBackground && this.data.length > 0) {
      const url = this.data[0].url;
      const screenshot = await this.loadScreenshot(url);
      
      if (screenshot) {
        const backgroundImg = document.createElement('img');
        backgroundImg.src = URL.createObjectURL(screenshot);
        backgroundImg.style.width = '100%';
        backgroundImg.style.display = 'block';
        wrapper.appendChild(backgroundImg);
      } else {
        // Create placeholder
        const placeholder = document.createElement('div');
        placeholder.style.width = '100%';
        placeholder.style.height = '600px';
        placeholder.style.backgroundColor = '#f8f9fa';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.textContent = 'Page screenshot not available';
        wrapper.appendChild(placeholder);
      }
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
    const height = this.options.showBackground ? wrapper.clientHeight : 500;
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Draw heatmap
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    
    // Scale data points to fit the canvas
    const maxViewportWidth = Math.max(...this.data.map(d => d.viewport_width || 1000));
    const maxViewportHeight = Math.max(...this.data.map(d => d.viewport_height || 800));
    
    // Draw heatmap points
    this.data.forEach(point => {
      const x = (point.x / point.viewport_width) * width;
      const y = (point.y / point.viewport_height) * height;
      
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