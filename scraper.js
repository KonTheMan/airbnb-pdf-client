const puppeteer = require('puppeteer');

async function scrapeAirbnb({ location, checkin, checkout, guests, pool, pickleball, privateGym, maxItems = 20 }) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Example: Airbnb search URL (unofficial, may need to change)
  const url = `https://www.airbnb.com/s/${encodeURIComponent(location)}/homes?checkin=${checkin}&checkout=${checkout}&adults=${guests}`;

  await page.goto(url, { waitUntil: 'networkidle2' });

  // Wait for listings to load
  await page.waitForSelector('div[data-testid="listing-card"]');

  // Scrape the data
  const listings = await page.evaluate((maxItems) => {
    const cards = Array.from(document.querySelectorAll('div[data-testid="listing-card"]')).slice(0, maxItems);
    return cards.map(card => {
      const title = card.querySelector('div[role="heading"]')?.innerText || '';
      const price = card.querySelector('[data-testid="price"]')?.innerText || '';
      const image = card.querySelector('img')?.src || '';
      const location = card.querySelector('[data-testid="listing-location"]')?.innerText || '';
      return { title, price, location, image };
    });
  }, maxItems);

  await browser.close();
  return listings;
}

module.exports = scrapeAirbnb;
