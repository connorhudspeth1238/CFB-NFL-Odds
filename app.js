let currentLeague = 'cfb';
let currentCfbGroup = '81'; // Default to Top 25

// Complete and accurate conference team mapping
const conferenceTeams = {
  '8': [ // SEC
    'Alabama', 'Arkansas', 'Auburn', 'Florida', 'Georgia', 'Kentucky', 
    'LSU', 'Mississippi State', 'Missouri', 'Oklahoma', 'Ole Miss', 
    'South Carolina', 'Tennessee', 'Texas', 'Texas A&M', 'Vanderbilt'
  ],
  '4': [ // Big Ten
    'Illinois', 'Indiana', 'Iowa', 'Maryland', 'Michigan', 'Michigan State', 
    'Minnesota', 'Nebraska', 'Northwestern', 'Ohio State', 'Oregon', 
    'Penn State', 'Purdue', 'Rutgers', 'UCLA', 'USC', 'Washington', 'Wisconsin'
  ],
  '12': [ // Big 12
    'Arizona', 'Arizona State', 'Baylor', 'BYU', 'UCF', 'Cincinnati', 
    'Colorado', 'Houston', 'Iowa State', 'Kansas', 'Kansas State', 
    'Oklahoma State', 'TCU', 'Texas Tech', 'Utah', 'West Virginia'
  ],
  '1': [ // ACC
    'Boston College', 'California', 'Clemson', 'Duke', 'Florida State', 
    'Georgia Tech', 'Louisville', 'Miami', 'North Carolina', 'NC State', 
    'Pittsburgh', 'SMU', 'Stanford', 'Syracuse', 'Virginia', 'Virginia Tech', 'Wake Forest'
  ],
  '15': [ // AAC
    'Army', 'Charlotte', 'East Carolina', 'FAU', 'Memphis', 'Navy', 
    'North Texas', 'Rice', '1337', 'South Florida', 'Temple', 'Tulane', 'Tulsa', 'UAB', 'UTSA'
  ],
  '17': [ // Mountain West
    'Air Force', 'Boise State', 'Colorado State', 'Fresno State', 'Hawaii', 
    'Nevada', 'New Mexico', 'San Diego State', 'San Jose State', 'UNLV', 'Utah State', 'Wyoming'
  ],
  '18': [ // Sun Belt
    'Appalachian State', 'Arkansas State', 'Coastal Carolina', 'Georgia Southern', 
    'Georgia State', 'James Madison', 'Louisiana', 'Louisiana Tech', 'Marshall', 
    'Old Dominion', 'South Alabama', 'Southern Miss', 'Texas State', 'Troy', 'UL Monroe'
  ],
  '20': [ // MAC
    'Akron', 'Ball State', 'Bowling Green', 'Buffalo', 'Central Michigan', 
    'Eastern Michigan', 'Kent State', 'Miami (OH)', 'Northern Illinois', 
    'Ohio', 'Toledo', 'Western Michigan'
  ]
};

function switchLeague(league) {
  currentLeague = league;
  
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-${league}`);
  if (activeBtn) activeBtn.classList.add('active');

  const filterContainer = document.getElementById('cfb-filter-container');
  if (filterContainer) {
    filterContainer.style.display = league === 'cfb' ? 'block' : 'none';
  }

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

  let events = [];

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

  try {
    const dataFile = currentLeague === 'nfl' ? 'nfl.json' : 'cfb.json';
    const response = await fetch(`${dataFile}?v=${new Date().getTime()}`);
    
    if (response.ok) {
      const data = await response.json();
      events = data.events || [];
    }

    // Filter CFB games securely based on user selection
    if (currentLeague === 'cfb') {
      if (currentCfbGroup === '81') {
        // TOP 25: Matchups featuring at least one ranked team
        events = events.filter(event => {
          const competitors = event.competitions?.[0]?.competitors || [];
          return competitors.some(c => getRank(c) !== null);
        });
      } else if (currentCfbGroup !== '80' && conferenceTeams[currentCfbGroup]) {
        // CONFERENCE FILTER: Keep game if AT LEAST ONE team matches the conference school list exactly
        const allowedTeams = conferenceTeams[currentCfbGroup];
        events = events.filter(event => {
          const competitors = event.competitions?.[0]?.competitors || [];
          return competitors.some(c => {
            const teamName = c.team?.name || '';
            const displayName = c.team?.displayName || '';
            const shortDisplayName = c.team?.shortDisplayName || '';
            
            return allowedTeams.some(t => 
              teamName.toLowerCase() === t.toLowerCase() || 
              displayName.toLowerCase() === t.toLowerCase() ||
              shortDisplayName.toLowerCase() === t.toLowerCase()
            );
          });
        });
      }
    }

    if (events.length === 0) {
      container.innerHTML = `<p style="text-align: center; font-size: 1.1rem; color: #666; margin-top: 20px;">No games found for this selection.</p>`;
      return;
    }

    const isGameFinished = (event) => {
      const state = event.status?.type?.state;
      const completed = event.status?.type?.completed;
      return state === 'post' || completed === true;
    };

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
              <img src="${awayTeam.team?.logo| ''}" alt="" class="logo" style="width: 28px; height: 28px; object-fit: contain;">
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
    container.innerHTML = `<p style="color: red; text-align: center;">Unable to load scoreboard data.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadGames);
