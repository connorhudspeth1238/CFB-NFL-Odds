const fs = require('fs');
const puppeteer = require('puppeteer');

async function scrapeTexasHighSchoolScores() {
  console.log('Launching headless browser for Texas Football...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  
  try {
    // Go to the scores page and wait for network/websocket activity to settle
    await page.goto('https://www.texasfootball.com/scores/?ref=nav', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Give the SignalR websocket a few seconds to populate the DOM elements
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extract game items rendered by the page's scripts
    const events = await page.evaluate(() => {
      const parsedEvents = [];
      
      // Look for score card elements rendered on the page
      // (Adjust selector if inspecting reveals a more precise container class)
      const gameCards = document.querySelectorAll('.game-card, .scoreboard-matchup, .matchup-item, tr');

      gameCards.forEach((card, index) => {
        const textLines = card.innerText ? card.innerText.split('\n').map(l => l.trim()).filter(Boolean) : [];
        
        if (textLines.length >= 4) {
          // Typically contains away team, away score, home team, home score, status
          const awayTeam = textLines[0];
          const awayScore = textLines[1];
          const homeTeam = textLines[2];
          const homeScore = textLines[3];
          const statusText = textLines[4] || 'FINAL';

          parsedEvents.push({
            id: `txhs-${index}-${Date.now()}`,
            date: new Date().toISOString(),
            status: {
              type: {
                state: statusText.toLowerCase().includes('final') ? 'post' : 'in',
                detail: statusText
              }
            },
            competitions: [{
              competitors: [
                {
                  homeAway: 'home',
                  score: homeScore || '0',
                  team: { displayName: homeTeam, logo: '' }
                },
                {
                  homeAway: 'away',
                  score: awayScore || '0',
                  team: { displayName: awayTeam, logo: '' }
                }
              ],
              broadcasts: [{ names: ['TXHS Stream'] }],
              odds: [{ details: 'Line: N/A', overUnder: '' }]
            }]
          });
        }
      });

      return parsedEvents;
    });

    const outputData = {
      events: events.length > 0 ? events : []
    };

    fs.writeFileSync('txhs-scores.json', JSON.stringify(outputData, null, 2));
    console.log(`Successfully scraped and saved ${events.length} games to txhs-scores.json`);

  } catch (error) {
    console.error('Error during Puppeteer scrape:', error);
    fs.writeFileSync('txhs-scores.json', JSON.stringify({ events: [] }, null, 2));
  } finally {
    await browser.close();
  }
}

scrapeTexasHighSchoolScores();
