let currentLeague = 'cfb';

function switchLeague(league) {
  currentLeague = league;
  
  // Update Tab Button Styles
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${league}`).classList.add('active');

  // Update Page Title
  document.getElementById('page-title').innerText = league === 'cfb' 
    ? 'College Football Scoreboard' 
    : 'NFL Scoreboard';

  loadGames();
}

async function loadGames() {
  const container = document.getElementById('scoreboard-grid');
  container.innerHTML = '<p style="text-align: center;">Loading games...</p>';

  const dataFile = currentLeague === 'cfb' ? 'cfb.json' : 'nfl.json';

  try {
    const response = await fetch(`${dataFile}?v=${new Date().getTime()}`);
    
    if (!response.ok) {
      throw new Error(`Data fetch failed (${response.status})`);
    }

    const data = await response.json();
    let events = data.events || [];

    if (events.length === 0) {
      container.innerHTML = `<p style="text-align: center;">No ${currentLeague.toUpperCase()} games scheduled for this week.</p>`;
      return;
    }

    const isGameFinished = (event) => {
      const state = event.status?.type?.state;
      const completed = event.status?.type?.completed;
      return state === 'post' || completed === true;
    };

    // Sort: Upcoming/Live games at the top, Completed games at the bottom
    events.sort((a, b) => {
      const aDone = isGameFinished(a);
      const bDone = isGameFinished(b);

      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return new Date(a.date) - new Date(b.date);
    });

    container.innerHTML = events.map(event => {
      const competition = event.competitions[0];
      const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
      const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
      
      const finished = isGameFinished(event);
      const inProgress = event.status?.type?.state === 'in';

      const broadcast = competition.broadcasts?.[0]?.names?.[0] || 'TV TBD';
      
      const odds = competition.odds?.[0];
      const spread = odds?.details || 'Line: N/A';
      const overUnder = odds?.overUnder ? `O/U ${odds.overUnder}` : '';

      let statusText = new Date(event.date).toLocaleString([], {
        weekday: 'short', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      if (finished) {
        statusText = 'FINAL';
      } else if (inProgress) {
        statusText = event.status?.type?.detail || 'LIVE';
      }

      const homeDisplay = (finished || inProgress)
        ? `<span class="score" style="font-weight: 800; font-size: 1.1rem; color: #000;">${homeTeam.score ?? 0}</span>`
        : `<span class="record">${homeTeam.records?.[0]?.summary || ''}</span>`;

      const awayDisplay = (finished || inProgress)
        ? `<span class="score" style="font-weight: 800; font-size: 1.1rem; color: #000;">${awayTeam.score ?? 0}</span>`
        : `<span class="record">${awayTeam.records?.[0]?.summary || ''}</span>`;

      return `
        <div class="game-card ${finished ? 'completed-card' : ''}" style="${finished ? 'opacity: 0.8; background-color: #fafafa;' : ''}">
          <div class="time-tv">
            <span class="time" style="${finished ? 'color: #d97706; font-weight: 700;' : ''}">${statusText}</span>
            <span class="tv-badge">${broadcast}</span>
          </div>
          
          <div class="team home">
            <img src="${homeTeam.team.logo || ''}" alt="${homeTeam.team.displayName}" class="logo" style="width: 32px; height: 32px; object-fit: contain;">
            <div class="team-details">
              <span class="team-name">${homeTeam.team.displayName}</span>
            </div>
            ${homeDisplay}
          </div>

          <div class="team away">
            <img src="${awayTeam.team.logo || ''}" alt="${awayTeam.team.displayName}" class="logo" style="width: 32px; height: 32px; object-fit: contain;">
            <div class="team-details">
              <span class="team-name">${awayTeam.team.displayName}</span>
            </div>
            ${awayDisplay}
          </div>

          <div class="odds-bar">
            <span>${finished ? 'Final Score' : `Odds: ${spread}`}</span>
            <span>${finished ? '' : overUnder}</span>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Failed to load scoreboard data:', error);
    container.innerHTML = `<p style="color: red; text-align: center;">Unable to load ${currentLeague.toUpperCase()} game data.</p>`;
  }
}

loadGames();
