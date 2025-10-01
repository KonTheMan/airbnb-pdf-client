// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

const app = express();

// =======================
// Middleware
// =======================
app.use(cors({
  origin: 'https://airbnb-pdf-client-render.onrender.com', // your front-end URL
}));
app.use(bodyParser.json());

// =======================
// POST /scrape
// =======================
app.post('/scrape', async (req, res) => {
  const { location, checkIn, checkOut, guests, filters, maxItems } = req.body;

  if (!location || !checkIn || !checkOut || !guests) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const results = await runPuppeteerScraper(location, checkIn, checkOut, guests, filters, maxItems || 20);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// =======================
// Puppeteer Scraper
// =======================
async function runPuppeteerScraper(location, checkIn, checkOut, guests, filters, maxItems) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Go to Airbnb search page
  const searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(location)}/homes?checkin=${checkIn}&checkout=${checkOut}&adults=${guests}`;
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });

  // Wait for listings to load (selector may need adjustment)
  await page.waitForSelector('[itemprop="itemListElement"]');

  // Scrape listings
  const listings = await page.evaluate((filters, maxItems) => {
    const elements = Array.from(document.querySelectorAll('[itemprop="itemListElement"]'));
    const results = [];

    for (let el of elements) {
      const title = el.querySelector('._bzh5lkq')?.innerText || '';
      const price = el.querySelector('._olc9rf0')?.innerText || '';
      const image = el.querySelector('img')?.src || '';

      // TODO: filter by pool, pickleball, private gym if possible
      results.push({ title, price, image });
      if (results.length >= maxItems) break;
    }

    return results;
  }, filters, maxItems);

  await browser.close();
  return listings;
}

// =======================
// Start server
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Scraper API running on port ${PORT}`));
