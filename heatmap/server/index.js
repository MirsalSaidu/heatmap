const express = require('express');
const db = require('./db');
const heatmapApi = require('./api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../src')));
app.use(express.static(path.join(__dirname, '..')));
app.use(heatmapApi);

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard.html'));
});

async function start() {
  await db.connect();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(console.error); 