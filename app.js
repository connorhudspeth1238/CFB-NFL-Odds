// Replace with your actual free API key from College Football Data
const API_KEY = 'dTZayehggX7ZRMmQCtSjpD8hQDuwwxzMIK+5PInVE2efX3mdNCuCwDmt/jG9pcJC';

async function loadGames() {
  const container = document.getElementById('scoreboard-grid');

  try {
    // 1. Fetch data from the API
    const response = await fetch('https://api.collegefootballdata.com/lines?year=2026&week=1', {
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const games = await response.json();

    // 2. Loop through each game and construct card markup
    container.innerHTML = games.map(game => {
      // Pick the main spread/provider (or default fallback)
      const line = game.lines && game.lines.length > 0 ? game.lines[0] : null;
      const formattedSpread = line ? line.formattedSpread : 'N/A';
      const overUnder = line ? `O/U ${line.overUnder}` : '';

      return `
        <div class="game-card">
          <div class="time-tv">
            <span class="time">${game.startDate ? new Date(game.startDate).toLocaleString([], {weekday: 'short', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'TBD'}</span>
            <span class="tv-badge">${game.outlet || 'TV TBD'}</span>
          </div>
          
          <div class="team home">
            <img src="${game.homeTeamLogo || 'https://a.espncdn.com/i/teamlogos/ncaa/500/default.png'}" alt="${game.homeTeam}" class="logo">
            <div class="team-details">
              <span class="team-name">${game.homeTeam}</span>
            </div>
          </div>

          <div class="team away">
            <img src="${game.awayTeamLogo || 'https://a.espncdn.com/i/teamlogos/ncaa/500/default.png'}" alt="${game.awayTeam}" class="logo">
            <div class="team-details">
              <span class="team-name">${game.awayTeam}</span>
            </div>
          </div>

          <div class="odds-bar">
            <span>Odds: ${formattedSpread}</span>
            <span>${overUnder}</span>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Failed to load scoreboard data:', error);
    container.innerHTML = `<p style="color: red; text-align: center;">Unable to load game data. Check your API key or connection.</p>`;
  }
}

// Execute the fetch function on page load
loadGames();
