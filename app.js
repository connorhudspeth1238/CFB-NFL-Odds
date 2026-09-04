async function loadGames() {
  const container = document.getElementById('scoreboard-grid');

  try {
    // ESPN public endpoint for FBS college football odds & schedule
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard');
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const events = data.events || [];

    if (events.length === 0) {
      container.innerHTML = '<p>No games found for this week.</p>';
      return;
    }

    container.innerHTML = events.map(event => {
      const competition = event.competitions[0];
      const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
      const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
      
      // Extract TV broadcast name
      const broadcast = competition.broadcasts?.[0]?.names?.[0] || 'TV TBD';
      
      // Extract betting details
      const odds = competition.odds?.[0];
      const spread = odds?.details || 'N/A';
      const overUnder = odds?.overUnder ? `O/U ${odds.overUnder}` : '';

      // Format game time
      const gameDate = new Date(event.date).toLocaleString([], {
        weekday: 'short', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      return `
        <div class="game-card">
          <div class="time-tv">
            <span class="time">${gameDate}</span>
            <span class="tv-badge">${broadcast}</span>
          </div>
          
          <div class="team home">
            <img src="${homeTeam.team.logo}" alt="${homeTeam.team.displayName}" class="logo">
            <div class="team-details">
              <span class="team-name">${homeTeam.team.displayName}</span>
            </div>
            <span class="record">${homeTeam.records?.[0]?.summary || ''}</span>
          </div>

          <div class="team away">
            <img src="${awayTeam.team.logo}" alt="${awayTeam.team.displayName}" class="logo">
            <div class="team-details">
              <span class="team-name">${awayTeam.team.displayName}</span>
            </div>
            <span class="record">${awayTeam.records?.[0]?.summary || ''}</span>
          </div>

          <div class="odds-bar">
            <span>Odds: ${spread}</span>
            <span>${overUnder}</span>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Failed to load scoreboard data:', error);
    container.innerHTML = `<p style="color: red; text-align: center;">Unable to load game data. Check browser console for details.</p>`;
  }
}

loadGames();
