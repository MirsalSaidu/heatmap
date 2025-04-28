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
      // Use a real screenshot service with an actual API key
      const screenshotUrl = `https://shot.screenshotapi.net/screenshot?token=SZOCR33-XWKMRS9-GQMETT9-X4NHMN0&url=${encodeURIComponent(url)}&width=1024&height=768&fresh=true&output=image&file_type=png`;
      
      console.log("Fetching screenshot for:", url);
      const response = await fetch(screenshotUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        console.log("Screenshot loaded successfully");
        return blob;
      } else {
        console.warn('Failed to load screenshot, status:', response.status);
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
    console.log("Rendering heatmap with", this.data.length, "data points");
    
    // Create a wrapper for positioning
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    this.container.appendChild(wrapper);
    
    // Try to load screenshot for website background
    if (this.options.showBackground && this.data.length > 0) {
      const url = this.data[0].url;
      console.log("Attempting to load screenshot for:", url);
      
      try {
        // Add loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.textContent = 'Loading screenshot...';
        loadingIndicator.style.padding = '20px';
        loadingIndicator.style.textAlign = 'center';
        wrapper.appendChild(loadingIndicator);
        
        const screenshot = await this.loadScreenshot(url);
        
        // Remove loading indicator
        wrapper.removeChild(loadingIndicator);
        
        if (screenshot) {
          // Create and append the image
          const backgroundImg = document.createElement('img');
          backgroundImg.src = URL.createObjectURL(screenshot);
          backgroundImg.style.width = '100%';
          backgroundImg.style.display = 'block';
          backgroundImg.style.maxHeight = '800px';
          backgroundImg.style.objectFit = 'contain';
          backgroundImg.style.borderRadius = '8px';
          backgroundImg.style.border = '1px solid #ddd';
          wrapper.appendChild(backgroundImg);
          
          // Set up onload handler to adjust canvas dimensions to match image
          backgroundImg.onload = () => {
            // Update canvas dimensions to match image
            const canvas = wrapper.querySelector('canvas');
            if (canvas) {
              canvas.width = backgroundImg.clientWidth;
              canvas.height = backgroundImg.clientHeight;
              this.drawHeatmap(canvas, backgroundImg.clientWidth, backgroundImg.clientHeight);
            }
          };
        } else {
          this.createPlaceholder(wrapper, url);
        }
      } catch (error) {
        console.error("Error in screenshot rendering:", error);
        this.createPlaceholder(wrapper, url);
      }
    } else {
      // If no background needed or no data, just create placeholder
      if (this.data.length > 0) {
        this.createPlaceholder(wrapper, this.data[0].url);
      } else {
        // Display a message when no data is available
        const noDataMsg = document.createElement('div');
        noDataMsg.style.width = '100%';
        noDataMsg.style.height = '400px';
        noDataMsg.style.display = 'flex';
        noDataMsg.style.alignItems = 'center';
        noDataMsg.style.justifyContent = 'center';
        noDataMsg.style.color = '#777';
        noDataMsg.style.fontSize = '1.2rem';
        noDataMsg.style.fontStyle = 'italic';
        noDataMsg.style.backgroundColor = '#f9f9f9';
        noDataMsg.style.border = '1px solid #eee';
        noDataMsg.style.borderRadius = '8px';
        noDataMsg.textContent = 'No click data available for the selected criteria';
        wrapper.appendChild(noDataMsg);
        return;
      }
    }
    
    // Create canvas for heatmap
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';  // Always absolute to overlay properly
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '10';  // Make sure it's above the background
    wrapper.appendChild(canvas);
    
    // Get dimensions
    const width = wrapper.clientWidth;
    const height = this.options.showBackground ? 600 : 500;
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Draw heatmap
    this.drawHeatmap(canvas, width, height);
  }

  // Extract drawing logic to a separate method
  drawHeatmap(canvas, width, height) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    
    if (this.data.length === 0) return;
    
    // Find the maximum viewport dimensions to normalize points
    const maxViewportWidth = Math.max(...this.data.map(d => d.viewport_width || 1000));
    const maxViewportHeight = Math.max(...this.data.map(d => d.viewport_height || 800));
    
    // Draw heatmap points
    this.data.forEach(point => {
      // Handle missing viewport dimensions
      const viewportWidth = point.viewport_width || maxViewportWidth || 1000;
      const viewportHeight = point.viewport_height || maxViewportHeight || 800;
      
      // Calculate position
      const x = (point.x / viewportWidth) * width;
      const y = (point.y / viewportHeight) * height;
      
      // Create heat point
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.options.radius);
      gradient.addColorStop(0, `rgba(255, 0, 0, ${this.options.maxOpacity})`);
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, this.options.radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  // Helper method to create placeholder
  createPlaceholder(wrapper, url) {
    try {
      const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      
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
      placeholder.style.position = 'relative';
      placeholder.style.boxSizing = 'border-box';
      placeholder.style.border = '1px solid #ddd';
      placeholder.style.borderRadius = '8px';
      
      placeholder.innerHTML = `
        <div style="font-size: 1.5rem; margin-bottom: 15px; font-weight: bold;">${hostname}</div>
        <div style="font-size: 1.1rem; margin-bottom: 20px; max-width: 80%;">
          <span style="opacity: 0.7;">${url}</span>
        </div>
        <div style="position: relative; width: 100%; height: 60%; border-top: 1px dashed #ccc; margin-top: 20px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; top: 10px; left: 10px; font-size: 0.8rem; color: #777;">Click Heatmap Overlay</div>
          <div style="font-style: italic; color: #888;">Click data will be displayed here</div>
        </div>
      `;
      wrapper.appendChild(placeholder);
    } catch (e) {
      console.error("Error creating placeholder:", e);
      const errorPlaceholder = document.createElement('div');
      errorPlaceholder.style.padding = '20px';
      errorPlaceholder.style.color = '#721c24';
      errorPlaceholder.style.backgroundColor = '#f8d7da';
      errorPlaceholder.style.border = '1px solid #f5c6cb';
      errorPlaceholder.style.borderRadius = '8px';
      errorPlaceholder.textContent = 'Error displaying URL: ' + url;
      wrapper.appendChild(errorPlaceholder);
    }
  }
}

export default HeatmapViewer; 