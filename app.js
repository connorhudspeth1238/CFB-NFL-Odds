let currentLeague = 'cfb';
let currentCfbGroup = '80'; // Default to All FBS
let refreshInterval = null;
let allEventsCache = []; // Stores the currently loaded games for instant searching

// Cache to remember the latest pregame odds before ESPN drops/clears them mid-game
const persistentOddsCache = {};

// Complete and accurate 10-conference team mapping using exact ESPN display names
const conferenceTeams = {
  '8': [ // SEC
    'Alabama Crimson Tide', 'Arkansas Razorbacks', 'Auburn Tigers', 'Florida Gators', 
    'Georgia Bulldogs', 'Kentucky Wildcats', 'LSU Tigers', 'Mississippi State Bulldogs', 
    'Missouri Tigers', 'Oklahoma Sooners', 'Ole Miss Rebels', 'South Carolina Gamecocks', 
    'Tennessee Volunteers', 'Texas Longhorns', 'Texas A&M Aggies', 'Vanderbilt Commodores'
  ],
  '4': [ // Big Ten
    'Illinois Fighting Illini', 'Indiana Hoosiers', 'Iowa Hawkeyes', 'Maryland Terrapins', 
    'Michigan Wolverines', 'Michigan State Spartans', 'Minnesota Golden Gophers', 
    'Nebraska Cornhuskers', 'Northwestern Wildcats', 'Ohio State Buckeyes', 'Oregon Ducks', 
    'Penn State Nittany Lions', 'Purdue Boilermakers', 'Rutgers Scarlet Knights', 
    'UCLA Bruins', 'USC Trojans', 'Washington Huskies', 'Wisconsin Badgers'
  ],
  '12': [ // Big 12
    'Arizona Wildcats', 'Arizona State Sun Devils', 'Baylor Bears', 'BYU Cougars', 
    'UCF Knights', 'Cincinnati Bearcats', 'Colorado Buffaloes', 'Houston Cougars', 
    'Iowa State Cyclones', 'Kansas Jayhawks', 'Kansas State Wildcats', 'Oklahoma State Cowboys', 
    'TCU Horned Frogs', 'Texas Tech Red Raiders', 'Utah Utes', 'West Virginia Mountaineers'
  ],
  '1': [ // ACC
    'Boston College Eagles', 'California Golden Bears', 'Clemson Tigers', 'Duke Blue Devils', 
    'Florida State Seminoles', 'Georgia Tech Yellow Jackets', 'Louisville Cardinals', 
    'Miami Hurricanes', 'North Carolina Tar Heels', 'NC State Wolfpack', 'Pittsburgh Panthers', 
    'SMU Mustangs', 'Stanford Cardinal', 'Syracuse Orange', 'Virginia Cavaliers', 
    'Virginia Tech Hokies', 'Wake Forest Demon Deacons'
  ],
  '15': [ // AAC
    'Army Black Knights', 'Charlotte 49ers', 'East Carolina Pirates', 'Florida Atlantic Owls', 
    'Memphis Tigers', 'Navy Midshipmen', 'North Texas Mean Green', 'Rice Owls', 
    'South Florida Bulls', 'Temple Owls', 'Tulane Green Wave', 'Tulsa Golden Hurricane', 
    'UAB Blazers', 'UTSA Roadrunners'
  ],
  'cusa': [ // CUSA
    'Delaware Blue Hens', 'Florida International Panthers', 'Jacksonville State Gamecocks', 
    'Kennesaw State Owls', 'Liberty Flames', 'Middle Tennessee Blue Raiders', 
    'Missouri State Bears', 'New Mexico State Aggies', 'Sam Houston Bearkats', 
    'UTEP Miners', 'Western Kentucky Hilltoppers'
  ],
  '20': [ // MAC
    'Akron Zips', 'Ball State Cardinals', 'Bowling Green Falcons', 'Buffalo Bulls', 
    'Central Michigan Chippewas', 'Eastern Michigan Eagles', 'Kent State Golden Flashes', 
    'Miami (OH) RedHawks', 'Northern Illinois Huskies', 'Ohio Bobcats', 'Toledo Rockets', 
    'Massachusetts Minutemen', 'Western Michigan Broncos'
  ],
  '17': [ // Mountain West (MW)
    'Air Force Falcons', 'Hawai\'i Rainbow Warriors', 'Nevada Wolf Pack', 'New Mexico Lobos', 
    'San José State Spartans', 'UNLV Rebels', 'Wyoming Cowboys', 'North Dakota State Bison'
  ],
  'pac12': [ // Pac-12 (Updated Realignment)
    'Oregon State Beavers', 'Washington State Cougars', 'Boise State Broncos', 
    'Colorado State Rams', 'Fresno State Bulldogs', 'San Diego State Aztecs', 
    'Utah State Aggies', 'Texas State Bobcats'
  ],
  '18': [ // Sun Belt
    'App State Mountaineers', 'Arkansas State Red Wolves', 'Coastal Carolina Chanticleers', 
    'Georgia Southern Eagles', 'Georgia State Panthers', 'James Madison Dukes', 
    'Louisiana Ragin\' Cajuns', 'Louisiana Tech Bulldogs', 'Marshall Thundering Herd', 
    'Old Dominion Monarchs', 'South Alabama Jaguars', 'Southern Miss Golden Eagles', 
    'Troy Trojans', 'UL Monroe Warhawks'
  ]
};

function switchLeague(league) {
  currentLeague = league;
  
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-${league}`);
  if (activeBtn) activeBtn.classList.add('active');

  const filterContainer = document.getElementById('cfb-filter-container');
  if (filterContainer) {
    filterContainer.style.display = league === 'cfb' ? 'flex' : 'none';
  }

  const titleEl = document.getElementById('page-title');
  if (titleEl) {
    titleEl.innerText = league === 'cfb' ? 'College Football Scoreboard' : 'NFL Scoreboard';
  }

  const container = document.getElementById('scoreboard-grid');
  if (container) {
    container.innerHTML = `<p style="text-align: center; font-size: 1.1rem; color: #666; grid-column: 1 / -1;">Loading live ${currentLeague.toUpperCase()} games...</p>`;
  }

  loadGames();
}

function changeCfbGroup(groupId) {
  currentCfbGroup = groupId;
  
  const container = document.getElementById('scoreboard-grid');
  if (container) {
    container.innerHTML = `<p style="text-align: center; font-size: 1.1rem; color: #666; grid-column: 1 / -1;">Loading live games...</p>`;
  }

  loadGames();
}

async function loadGames() {
  const container = document.getElementById('scoreboard-grid');
  if (!container) return;

  const groupSelect = document.getElementById('cfb-group-select') || document.getElementById('cfb-group-filter');
  if (groupSelect && groupSelect.value !== currentCfbGroup) {
    groupSelect.value = currentCfbGroup;
  }

  const isInitialLoad = container.querySelector('p') !== null;
  if (isInitialLoad) {
    container.innerHTML = `<p style="text-align: center; font-size: 1.1rem; color: #666; grid-column: 1 / -1;">Loading live ${currentLeague.toUpperCase()} games...</p>`;
  }

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

    // Capture and cache odds dynamically up until kickoff; lock them in once live/cleared
    events.forEach(event => {
      const gameId = event.id;
      const liveOdds = event.competitions?.[0]?.odds?.[0];

      if (liveOdds && liveOdds.details) {
        persistentOddsCache[gameId] = liveOdds;
      } else if (persistentOddsCache[gameId]) {
        if (!event.competitions[0].odds) event.competitions[0].odds = [];
        event.competitions[0].odds[0] = persistentOddsCache[gameId];
      }
    });

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
            const displayName = c.team?.displayName || '';
            return allowedTeams.some(t => displayName.toLowerCase() === t.toLowerCase());
          });
        });
      }
    }

    // Cache the loaded events for local filtering via search box
    allEventsCache = events;
    renderFilteredGames();

  } catch (error) {
    console.error('Failed to load scoreboard data:', error);
    if (isInitialLoad) {
      container.innerHTML = `<p style="color: red; text-align: center; grid-column: 1 / -1;">Unable to load live scoreboard data.</p>`;
    }
  }
}

function filterGamesBySearch() {
  renderFilteredGames();
}

function renderFilteredGames() {
  const container = document.getElementById('scoreboard-grid');
  if (!container) return;

  const searchInput = document.getElementById('team-search-input');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let eventsToRender = allEventsCache;

  if (query !== '') {
    eventsToRender = allEventsCache.filter(event => {
      const competitors = event.competitions?.[0]?.competitors || [];
      return competitors.some(c => {
        const name = (c.team?.name || '').toLowerCase();
        const displayName = (c.team?.displayName || '').toLowerCase();
        const shortName = (c.team?.shortDisplayName || '').toLowerCase();
        const abbreviation = (c.team?.abbreviation || '').toLowerCase();
        
        return name.includes(query) || 
               displayName.includes(query) || 
               shortName.includes(query) || 
               abbreviation.includes(query);
      });
    });
  }

  if (eventsToRender.length === 0) {
    container.innerHTML = `<p style="text-align: center; font-size: 1.1rem; color: #666; margin-top: 20px; grid-column: 1 / -1;">No matching teams found.</p>`;
    return;
  }

  const isGameFinished = (event) => {
    const state = event.status?.type?.state;
    const completed = event.status?.type?.completed;
    return state === 'post' || completed === true;
  };

  eventsToRender.sort((a, b) => {
    const aDone = isGameFinished(a);
    const bDone = isGameFinished(b);

    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;
    return new Date(a.date) - new Date(b.date);
  });

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

  container.innerHTML = eventsToRender.map(event => {
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
        
        <!-- Away Team (Top) -->
        <div class="team away" style="margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; margin-right: 8px;">
            <img src="${awayTeam.team?.logo || ''}" alt="" class="logo" style="flex-shrink: 0;">
            <span class="team-name" style="overflow: hidden; text-overflow: ellipsis;">${awayName}</span>
          </div>
          <div class="score-record-container">${awayDisplay}</div>
        </div>

        <!-- Home Team (Bottom) -->
        <div class="team home" style="margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; margin-right: 8px;">
            <img src="${homeTeam.team?.logo || ''}" alt="" class="logo" style="flex-shrink: 0;">
            <span class="team-name" style="overflow: hidden; text-overflow: ellipsis;">${homeName}</span>
          </div>
          <div class="score-record-container">${homeDisplay}</div>
        </div>

        <div class="odds-bar">
          <span>Odds: ${spread}</span>
          <span>${overUnder}</span>
        </div>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  loadGames();
  
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(loadGames, 30000);
});
