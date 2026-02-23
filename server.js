const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());

// HELPER: Function to read CSV files
const readCSV = (filename) => {
  return new Promise((resolve) => {
    const results = [];
    const filePath = path.join(__dirname, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filename}`);
      resolve([]);
      return;
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results));
  });
};

// --- ROUTES ---

// 1. Matches your App.js fetch('http://localhost:5000/api/daily')
app.get('/api/daily', async (req, res) => {
  console.log("📥 Request received for Daily Data");
  const data = await readCSV('next_day_energy_prediction.csv');
  res.json(data);
});

// 2. Matches your App.js fetch('http://localhost:5000/api/monthly')
app.get('/api/monthly', async (req, res) => {
  console.log("📥 Request received for Monthly Data");
  const data = await readCSV('monthly_price_prediction.csv');
  res.json(data);
});

// Root route just to test if server is alive
app.get('/', (req, res) => {
  res.send("<h1>Server is Running!</h1><p>Try <a href='/api/daily'>/api/daily</a></p>");
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`);
  console.log(`📂 Files should be in: ${__dirname}`);
});