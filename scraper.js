const fs = require('fs');
const cheerio = require('cheerio');

async function scrapeTexasHighSchoolScores() {
  console.log('Fetching Texas Football scores...');
  
  try {
    const response = await fetch('https://www.texasfootball.com/scores/?ref=nav', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const events = [];

    // Selectors targeting score cards on texasfootball.com
    $('.game-card, .scoreboard-matchup, tr').each((index, element) => {
      const el = $(element);

      const teamNames = el.find('.team-name, td:first-child').map((_, t) => $(t).text().trim()).get();
      const scores = el.find('.score, td:nth-child(2)').map((_, s) => $(s).text().trim()).get();
      const statusText = el.find('.status, .game-status').text().trim() || 'FINAL';

      if (teamNames.length >= 2) {
        events.push({
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
                score: scores[1] || '0',
                team: { displayName: teamNames[1], logo: '' }
              },
              {
                homeAway: 'away',
                score: scores[0] || '0',
                team: { displayName: teamNames[0], logo: '' }
              }
            ],
            broadcasts: [{ names: ['TXHS Stream'] }],
            odds: [{ details: 'Line: N/A', overUnder: '' }]
          }]
        });
      }
    });

    const outputData = {
      events: events.length > 0 ? events : []
    };

    fs.writeFileSync('txhs-scores.json', JSON.stringify(outputData, null, 2));
    console.log(`Successfully scraped and saved ${events.length} games to txhs-scores.json`);

  } catch (error) {
    console.error('Error fetching Texas Football scores:', error);
    fs.writeFileSync('txhs-scores.json', JSON.stringify({ events: [] }, null, 2));
  }
}

scrapeTexasHighSchoolScores();
