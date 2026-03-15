const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  await page.goto('http://localhost:3000');
  
  // Navigate to UI Testing
  // This app might not need auth if local, but let's see
  console.log('Navigated to app');
  
  // Attempt to wait for the UI tests list
  await page.waitForTimeout(2000);
  
  // Find the run button for Send Invite Email
  // text "Send Invite Email"
  try {
    // Find the row containing "Send Invite Email"
    const row = page.locator('div.glass-card:has-text("Send Invite Email")');
    // Find the button with the Play icon inside that row
    const playBtn = row.locator('button:has(svg.lucide-play)');
    
    // Listen for WebSocket frames to see exactly what we receive
    page.on('websocket', ws => {
      console.log(`WebSocket opened: ${ws.url()}`);
      ws.on('framereceived', frame => {
        console.log(`ws received: ${frame.payload}`);
      });
    });

    // Listen for API responses
    page.on('response', response => {
      if (response.url().includes('/api/tests/execute')) {
        console.log(`API response [${response.status()}]:`, response.url());
        response.json().then(data => console.log('API body:', data)).catch(() => {});
      }
    });

    await playBtn.first().click({ force: true, timeout: 5000 });
    console.log('Clicked Run button!');
    
    // Wait and observe
    await page.waitForTimeout(10000);
  } catch (err) {
    console.log('Could not click run button', err);
  }
  
  await browser.close();
})();
