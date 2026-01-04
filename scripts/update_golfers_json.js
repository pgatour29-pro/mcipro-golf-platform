const fs = require('fs');
const path = require('path');

const januaryFile = path.join(__dirname, '..', 'TRGGplayers', 'trgghcpjanuary', 'TRGG_Handicap_List.json');
const golfersFile = path.join(__dirname, '..', 'TRGGplayers', 'golfers.json');

// Read January data
const januaryData = JSON.parse(fs.readFileSync(januaryFile, 'utf8'));

// Convert to golfers.json format
const golfersData = {
  golfers: januaryData.players
};

// Write to golfers.json
fs.writeFileSync(golfersFile, JSON.stringify(golfersData, null, 2), 'utf8');

console.log('Updated golfers.json with', januaryData.players.length, 'players');

// Verify Pete Park
const pete = januaryData.players.find(p => p.name.includes('Park, Peter'));
console.log('Pete Park:', pete);
