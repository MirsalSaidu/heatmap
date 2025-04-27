import Heatmap from './heatmap';
import HeatmapViewer from './heatmapViewer';

// Initialize tracking on your website
const heatmap = new Heatmap({
  endpoint: 'https://your-api.com/api/heatmap',
  sampleRate: 1.0
});

// For admin pages - initialize the viewer
function initializeHeatmapViewer() {
  const viewer = new HeatmapViewer();
  
  // Fetch data
  fetch('/api/heatmap?url=' + encodeURIComponent(window.location.href))
    .then(res => res.json())
    .then(data => {
      viewer.setData(data);
    });
} 