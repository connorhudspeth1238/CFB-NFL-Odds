let currentLeague = 'cfb';
let currentCfbGroup = '81'; // Default to Top 25

// Clean, keyword-based conference dictionary mapped to core school identifiers
const conferenceTeams = {
  '8': [ // SEC
    'Alabama', 'Arkansas', 'Auburn', 'Florida', 'Georgia', 'Kentucky', 
    'LSU', 'Mississippi State', 'Mississippi St.', 'Mississippi', 'Missouri', 
    'Oklahoma', 'Ole Miss', 'South Carolina', 'Tennessee', 'Texas', 'Texas A&M', 'Vanderbilt'
  ],
  '4': [ // Big Ten
    'Illinois', 'Indiana', 'Iowa', 'Maryland', 'Michigan State', 'Michigan St.', 
    'Michigan', 'Minnesota', 'Nebraska', 'Northwestern', 'Ohio State', 'Ohio St.', 
    'Oregon', 'Penn State', 'Penn St.', 'Purdue', 'Rutgers', 'UCLA', 'USC', 'Washington', 'Wisconsin'
  ],
  '12': [ // Big 12
    'Arizona State', 'Arizona St.', 'Arizona', 'Baylor', 'BYU', 'UCF', 'Cincinnati', 
    'Colorado', 'Houston', 'Iowa State', 'Iowa St.', 'Kansas State', 'Kansas St.', 'Kansas', 
    'Oklahoma State', 'Oklahoma St.', 'TCU', 'Texas Tech', 'Utah', 'West Virginia'
  ],
  '1': [ // ACC
    'Boston College', 'California', 'Clemson', 'Duke', 'Florida State', 'Florida St.', 
    'Georgia Tech', 'Louisville', 'Miami', 'North Carolina', 'NC State', 'N.C. State', 
    'Pittsburgh', 'SMU', 'Stanford', 'Syracuse', 'Virginia Tech', 'Virginia', 'Wake Forest'
  ],
  '15': [ // AAC
    'Army', 'Charlotte', 'East Carolina', 'FAU', 'Florida Atlantic', 'Memphis', 'Navy', 
    'North Texas', 'Rice', 'South Florida', 'USF', 'Temple', 'Tulane', 'Tulsa', 'UAB', 'UTSA'
  ],
  '17': [ // Mountain West
    'Air Force', 'Boise State', 'Boise St.', 'Colorado State', 'Colorado St.', 'Fresno State', 'Fresno St.', 'Hawaii', 
    'Nevada', 'New Mexico', 'San Diego State', 'San Diego St.', 'San Jose State', 'San Jose St.', 'UNLV', 'Utah State', 'Utah St.', 'Wyoming'
  ],
  '18': [ // Sun Belt
    'Appalachian State', 'Appalachian St.', 'Arkansas State', 'Arkansas St.', 'Coastal Carolina', 'Georgia Southern', 
    'Georgia State', 'Georgia St.', 'James Madison', 'Louisiana Tech', 'Louisiana', 'Marshall', 
    'Old Dominion', 'South Alabama', 'Southern Mississippi', 'Southern Miss', 'Texas State', 'Texas St.', 'Troy', 'UL Monroe'
  ],
  '20': [ // MAC
    'Akron', 'Ball State', 'Ball St.', 'Bowling Green', 'Buffalo', 'Central Michigan', 
    'Eastern Michigan', 'Kent State', 'Kent St.', 'Miami (OH)', 'Northern Illinois', 
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

  container.innerHTML = `<p style="text-align: center; font-size: 1.1rem; color: #666; grid-column: 1 / -1;">Loading live ${currentLeague.toUpperCase()} games...</p>`;

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
    let fetchUrl = '';
    if (currentLeague === 'nfl') {
      fetchUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
    } else {
      fetchUrl = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?limit=300&groups=80&v=${new Date().getTime()}`;
    }

    const response = await fetch(fetchUrl);
    
    if (response.ok) {
      const data = await response.json();
      events = data.events || [];
    }

    // Filter events based on selected view using inclusive substring matching
    if (currentLeague === 'cfb') {
      if (currentCfbGroup === '81') {
        events = events.filter(event => {
          const competitors = event.competitions?.[0]?.competitors || [];
          return competitors.some(c => getRank(c) !== null);
        });
      } else if (currentCfbGroup !== '80' && conferenceTeams[currentCfbGroup]) {
        const allowedTeams = conferenceTeams[currentCfbGroup];
        events = events.filter(event => {
          const competitors = event.competitions?.[0]?.competitors || [];
          return competitors.some(c => {
            const teamName = (c.team?.name || '').toLowerCase();
            const displayName = (c.team?.displayName || '').toLowerCase();
            const shortDisplayName = (c.team?.shortDisplayName || '').toLowerCase();
            
            return allowedTeams.some(t => {
              const target = t.toLowerCase();
              return teamName.includes(target) || displayName.includes(target) || shortDisplayName.includes(target);
            });
          });
        });
      }
    }

    if (events.length === 0) {
      container.innerHTML = `<p style="text-align: center; font-size: 1.1rem; color: #666; margin-top: 20px; grid-column: 1 / -1;">No games found for this selection.</p>`;
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
        ? `<span class="score">${homeTeam.score ?? 0}</span>`
        : `<span class="record">${homeTeam.records?.[0]?.summary || ''}</span>`;

      const awayDisplay = (finished || inProgress)
        ? `<span class="score">${awayTeam.score ?? 0}</span>`
        : `<span class="record">${awayTeam.records?.[0]?.summary || ''}</span>`;

      return `
        <div class="game-card ${finished ? 'completed-card' : ''}">
          <div class="time-tv">
            <span class="time" style="${finished ? 'color: #d97706; font-weight: 700;' : 'color: #374151;'}">${statusText}</span>
            <span class="tv-badge">${broadcast}</span>
          </div>
          
          <div class="team home" style="margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; margin-right: 8px;">
              <img src="${homeTeam.team?.logo || ''}" alt="" class="logo" style="flex-shrink: 0;">
              <span class="team-name" style="overflow: hidden; text-overflow: ellipsis;">${homeName}</span>
            </div>
            <div class="score-record-container">${homeDisplay}</div>
          </div>

          <div class="team away" style="margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; margin-right: 8px;">
              <img src="${awayTeam.team?.logo || ''}" alt="" class="logo" style="flex-shrink: 0;">
              <span class="team-name" style="overflow: hidden; text-overflow: ellipsis;">${awayName}</span>
            </div>
            <div class="score-record-container">${awayDisplay}</div>
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
    container.innerHTML = `<p style="color: red; text-align: center; grid-column: 1 / -1;">Unable to load live scoreboard data.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadGames);
