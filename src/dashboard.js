class HeatmapDashboard {
  constructor(options = {}) {
    this.options = {
      apiEndpoint: options.apiEndpoint || '/api/heatmap',
      container: options.container || document.getElementById('heatmap-dashboard'),
      ...options
    };
    
    this.viewer = null;
    this.currentUrl = '';
    this.dateRange = {
      start: null,
      end: null
    };
    
    this.init();
  }
  
  init() {
    this.createControls();
    this.viewer = new HeatmapViewer({
      container: this.options.container
    });
    
    this.loadUrls();
  }
  
  createControls() {
    const controls = document.createElement('div');
    controls.className = 'heatmap-controls';
    
    // URL selector
    const urlSelect = document.createElement('select');
    urlSelect.id = 'heatmap-url-select';
    urlSelect.addEventListener('change', () => {
      this.currentUrl = urlSelect.value;
      this.loadHeatmapData();
    });
    
    // Date range
    const dateFrom = document.createElement('input');
    dateFrom.type = 'date';
    dateFrom.id = 'heatmap-date-from';
    dateFrom.addEventListener('change', () => {
      this.dateRange.start = dateFrom.value;
      this.loadHeatmapData();
    });
    
    const dateTo = document.createElement('input');
    dateTo.type = 'date';
    dateTo.id = 'heatmap-date-to';
    dateTo.addEventListener('change', () => {
      this.dateRange.end = dateTo.value;
      this.loadHeatmapData();
    });
    
    // Add all controls
    controls.appendChild(this.createLabel('URL:', urlSelect));
    controls.appendChild(this.createLabel('From:', dateFrom));
    controls.appendChild(this.createLabel('To:', dateTo));
    
    this.options.container.appendChild(controls);
  }
  
  createLabel(text, element) {
    const label = document.createElement('div');
    label.className = 'heatmap-control-group';
    
    const labelText = document.createElement('label');
    labelText.textContent = text;
    
    label.appendChild(labelText);
    label.appendChild(element);
    
    return label;
  }
  
  loadUrls() {
    fetch(`${this.options.apiEndpoint}/urls`)
      .then(res => res.json())
      .then(urls => {
        const select = document.getElementById('heatmap-url-select');
        urls.forEach(url => {
          const option = document.createElement('option');
          option.value = url;
          option.textContent = url;
          select.appendChild(option);
        });
        
        if (urls.length > 0) {
          this.currentUrl = urls[0];
          this.loadHeatmapData();
        }
      });
  }
  
  loadHeatmapData() {
    let url = `${this.options.apiEndpoint}?url=${encodeURIComponent(this.currentUrl)}`;
    
    if (this.dateRange.start) {
      url += `&startDate=${encodeURIComponent(this.dateRange.start)}`;
    }
    if (this.dateRange.end) {
      url += `&endDate=${encodeURIComponent(this.dateRange.end)}`;
    }
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        this.viewer.setData(data);
      });
  }
}

export default HeatmapDashboard; 