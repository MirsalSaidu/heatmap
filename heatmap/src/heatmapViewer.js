class HeatmapViewer {
  constructor(options = {}) {
    this.options = {
      container: options.container || document.body,
      radius: options.radius || 25,
      maxOpacity: options.maxOpacity || 0.6,
      minOpacity: options.minOpacity || 0.05,
      blur: options.blur || 15,
      ...options
    };
    
    this.canvas = null;
    this.ctx = null;
    this.data = [];
    this.init();
  }

  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    
    this.options.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  }

  resize() {
    this.canvas.width = this.options.container.offsetWidth;
    this.canvas.height = this.options.container.offsetHeight;
    this.render();
  }

  setData(data) {
    this.data = data;
    this.render();
  }

  render() {
    if (!this.ctx) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Create gradient
    const intensityMap = this.createIntensityMap();
    
    // Draw heatmap
    this.ctx.globalAlpha = this.options.maxOpacity;
    this.ctx.putImageData(intensityMap, 0, 0);
  }

  createIntensityMap() {
    const intensityData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    const pixels = intensityData.data;
    
    // Initialize all pixels transparent
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 0;     // R
      pixels[i + 1] = 0; // G
      pixels[i + 2] = 0; // B
      pixels[i + 3] = 0; // A
    }
    
    // Add points
    this.data.forEach(point => {
      this.drawPoint(pixels, point.x, point.y);
    });
    
    // Apply blur
    if (this.options.blur > 0) {
      this.applyBlur(pixels);
    }
    
    // Apply color gradient
    this.applyColorGradient(pixels);
    
    return intensityData;
  }

  drawPoint(pixels, x, y) {
    const radius = this.options.radius;
    const diameter = radius * 2;
    
    for (let i = -radius; i < radius; i++) {
      for (let j = -radius; j < radius; j++) {
        const distance = Math.sqrt(i * i + j * j);
        
        if (distance > radius) continue;
        
        const intensity = (radius - distance) / radius;
        const pixelX = x + i;
        const pixelY = y + j;
        
        if (pixelX < 0 || pixelX >= this.canvas.width || pixelY < 0 || pixelY >= this.canvas.height) continue;
        
        const pos = (pixelY * this.canvas.width + pixelX) * 4;
        pixels[pos + 3] += intensity * 255; // Add to alpha channel
      }
    }
  }

  applyBlur(pixels) {
    // Simple box blur implementation
    const blurRadius = this.options.blur;
    // Simplified blur implementation would go here
  }

  applyColorGradient(pixels) {
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha > 0) {
        // Apply color based on intensity (red-yellow-green gradient)
        const intensity = alpha / 255;
        pixels[i] = 255;                          // R
        pixels[i + 1] = Math.round(intensity * 255); // G
        pixels[i + 2] = 0;                        // B
      }
    }
  }

  destroy() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    window.removeEventListener('resize', this.resize);
  }
}

export default HeatmapViewer; 