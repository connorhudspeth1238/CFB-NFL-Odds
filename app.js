let currentLeague = 'cfb';
let currentCfbGroup = '80'; // Default to All FBS Scores

function switchLeague(league) {
  currentLeague = league;
  
  // Toggle Active Tab Styles
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-${league}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Toggle CFB Dropdown Visibility
  const filterContainer = document.getElementById('cfb-filter-container');
  if (filterContainer) {
    filterContainer.style.display = league === 'cfb' ? 'block' : 'none';
  }

  // Update Title
  const titleEl = document.getElementById('page-title');
  if (titleEl) {
    titleEl.innerText = league === 'cfb' ? 'College Football Scoreboard' : 'NFL Scoreboard';
  }

  loadGames();
}

function changeCfbGroup(groupId) {
  currentCfbGroup = groupId;
  loadGames();
}

async function loadGames() {
  const container = document.getElementById('scoreboard-grid');
  if (!container) return;

  container.innerHTML = `<p style="text-align: center; font-size: 1.1rem; color: #666;">Loading ${currentLeague.toUpperCase()} games...</p>`;

  let dataFile = 'nfl.json';
  if (currentLeague === 'cfb') {
    dataFile = currentCfbGroup === '80' ? 'cfb.json' : `cfb-${currentCfbGroup}.json`;
  }

  try {
    const response = await fetch(`${dataFile}?v=${new Date().getTime()}`);
    
    if (!response.ok) {
      throw new Error(`Data fetch failed (${response.status})`);
    }

    const data = await response.json();
    let events = data.events || [];

    // Helper: Extract valid 1-25 rank from team JSON structure
    const getRank = (competitor) => {
      if (!competitor) return null;
      
      let rank = competitor.curatedRank?.current 
              || competitor.curatedRank 
              || competitor.ranks?.[0]?.current 
              || competitor.team?.ranks?.[0]?.current
              || competitor.rank;

      if (typeof rank === 'object' && rank !== null) {
        rank = rank.current || rank.rank;
      }

      const num = parseInt(rank, 10);
      return (!isNaN(num) && num > 0 && num <= 25) ? num : null;
    };

    // STRICT TOP 25 FILTER: Keep game ONLY if at least one team is ranked 1-25
    if (currentLeague === 'cfb' && currentCfbGroup === '81') {
      events = events.filter(event => {
        const competitors = event.competitions?.[0]?.competitors || [];
        return competitors.some(c => getRank(c) !== null);
      });
    }

    if (events.length === 0) {
      container.innerHTML = `<p style="text-align: center; font-size: 1.1rem; color: #666; margin-top: 20px;">No Top 25 games found for this slate.</p>`;
      return;
    }

    const isGameFinished = (event) => {
      const state = event.status?.type?.state;
      const completed = event.status?.type?.completed;
      return state === 'post' || completed === true;
    };

    // Sort: Live/Upcoming first, Finished at bottom
    events.sort((a, b) => {
      const aDone = isGameFinished(a);
      const bDone = isGameFinished(b);

      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return new Date(a.date) - new Date(b.date);
    });

    container.innerHTML = events.map(event => {
      const competition = event.competitions?.[0] || {};
      const competitors = competition.competitors || [];
      const homeTeam = competitors.find(c => c.homeAway === 'home') || {};
      const awayTeam = competitors.find(c => c.homeAway === 'away') || {};
      
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

      const homeRank = getRank(homeTeam);
      const awayRank = getRank(awayTeam);

      const homeName = `${homeRank ? `<span style="font-size: 0.85rem; color: #0070f3; font-weight: 800; margin-right: 4px;">(${homeRank})</span>` : ''}${homeTeam.team?.displayName || 'TBD'}`;
      const awayName = `${awayRank ? `<span style="font-size: 0.85rem; color: #0070f3; font-weight: 800; margin-right: 4px;">(${awayRank})</span>` : ''}${awayTeam.team?.displayName || 'TBD'}`;

      const homeDisplay = (finished || inProgress)
        ? `<span class="score" style="font-weight: 800; font-size: 1.1rem; color: #000;">${homeTeam.score ?? 0}</span>`
        : `<span class="record" style="font-size: 0.85rem; color: #666;">${homeTeam.records?.[0]?.summary || ''}</span>`;

      const awayDisplay = (finished || inProgress)
        ? `<span class="score" style="font-weight: 800; font-size: 1.1rem; color: #000;">${awayTeam.score ?? 0}</span>`
        : `<span class="record" style="font-size: 0.85rem; color: #666;">${awayTeam.records?.[0]?.summary || ''}</span>`;

      return `
        <div class="game-card ${finished ? 'completed-card' : ''}" style="border: 1px solid #e5e7eb; padding: 12px; margin-bottom: 12px; border-radius: 8px; ${finished ? 'opacity: 0.8; background-color: #fafafa;' : 'background-color: #fff;'}">
          <div class="time-tv" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem;">
            <span class="time" style="${finished ? 'color: #d97706; font-weight: 700;' : 'color: #374151;'}">${statusText}</span>
            <span class="tv-badge" style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px;">${broadcast}</span>
          </div>
          
          <div class="team home" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${homeTeam.team?.logo || ''}" alt="" class="logo" style="width: 28px; height: 28px; object-fit: contain;">
              <span class="team-name" style="font-weight: 600;">${homeName}</span>
            </div>
            ${homeDisplay}
          </div>

          <div class="team away" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${awayTeam.team?.logo || ''}" alt="" class="logo" style="width: 28px; height: 28px; object-fit: contain;">
              <span class="team-name" style="font-weight: 600;">${awayName}</span>
            </div>
            ${awayDisplay}
          </div>

          <div class="odds-bar" style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 6px;">
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

// Initial Load
document.addEventListener('DOMContentLoaded', loadGames);
