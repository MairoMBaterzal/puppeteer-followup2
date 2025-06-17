const puppeteer = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// 🔐 Handle unhandled promise rejections
process.on('unhandledRejection', err => {
  console.error('🧨 Unhandled rejection:', err);
});

app.post('/run', async (req, res) => {
  const estimateUrls = req.body.estimates;

  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    slowMo: 100, // Slows down interaction for visual tracking
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 🔐 Login to Service Fusion
  await page.goto('https://auth.servicefusion.com/auth/login', { waitUntil: 'networkidle2' });
  await page.type('#company', process.env.SF_COMPANY || 'pfs21485');
  await page.type('#uid', process.env.SF_USER || 'Lui-G');
  await page.type('#pwd', process.env.SF_PASS || 'Premierlog5335!');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  for (const url of estimateUrls) {
    try {
      console.log(`🔄 Navigating to ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });

      // ✅ Set status to Follow Up 2
      const setStatus = await page.evaluate(() => {
        const select = document.querySelector('select#Jobs_master_status_id');
        if (!select) return '❌ Could not find <select>';

        select.value = '1018607309'; // ✅ Follow Up 2
        const changeEvent = new Event('change', { bubbles: true });
        select.dispatchEvent(changeEvent);
        return '✅ Status set to Follow Up 2';
      });
      console.log(setStatus);

      // ⏳ Wait briefly to allow status to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 💾 Save Estimate
      await page.waitForSelector('#estSave-top', { visible: true });
      await page.click('#estSave-top');
      console.log('💾 Clicked Save Estimate');

      // 🕒 Allow time for save to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ✅ Confirm the change (optional)
      const confirmed = await page.evaluate(() => {
        const select = document.querySelector('select#Jobs_master_status_id');
        return select?.value === '1018607309'
          ? '✅ Confirmed status is Follow Up 2'
          : `❌ Still set to: ${select?.value}`;
      });
      console.log(confirmed);

    } catch (err) {
      console.log(`❌ Error on ${url}: ${err.message}`);
    }
  }

  await browser.close();
  res.send({ message: '🎉 All estimates processed and updated to Follow Up 2!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Estimate status updater running at http://localhost:${PORT}/run`);
});
