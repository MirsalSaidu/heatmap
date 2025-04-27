const express = require('express');
const db = require('./db');
const heatmapApi = require('./api');
const path = require('path');
const cors = require('cors');

const app = express();

// Add CORS support
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../src')));
app.use(express.static(path.join(__dirname, '..')));
app.use(heatmapApi);

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard.html'));
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app; 