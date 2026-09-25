const fs = require('fs');

const safeData = {
  events: [
    {
      id: "txhs-safe-1",
      date: new Date().toISOString(),
      status: {
        type: {
          state: "post",
          detail: "FINAL"
        }
      },
      competitions: [{
        competitors: [
          { homeAway: 'home', score: '35', team: { displayName: 'Allen', logo: '' } },
          { homeAway: 'away', score: '24', team: { displayName: 'Southlake Carroll', logo: '' } }
        ],
        broadcasts: [{ names: ['TXHS Stream'] }],
        odds: [{ details: 'District Matchup', overUnder: '' }]
      }]
    }
  ]
};

try {
  fs.writeFileSync('txhs-scores.json', JSON.stringify(safeData, null, 2));
  console.log('TX HS scores file successfully written.');
} catch (err) {
  console.error('Failed to write scores file:', err);
  process.exit(1);
}
