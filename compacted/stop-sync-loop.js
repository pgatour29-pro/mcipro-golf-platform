const fs = require('fs');

const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

console.log('Fixing endless sync loop...');

// Find the error handling section (line 31064-31066)
let errorHandlingStart = -1;
for (let i = 31050; i < 31070; i++) {
    if (lines[i] && lines[i].includes('Failed to sync scorecard')) {
        errorHandlingStart = i;
        break;
    }
}

if (errorHandlingStart === -1) {
    console.error('ERROR: Could not find error handling section');
    process.exit(1);
}

console.log(`Found error handling at line ${errorHandlingStart + 1}`);

// Check next few lines
console.log('Line', errorHandlingStart + 1, ':', lines[errorHandlingStart]);
console.log('Line', errorHandlingStart + 2, ':', lines[errorHandlingStart + 1]);

// Replace the error handling to add retry limit
const oldErrorHandling = [
    '                } catch (error) {',
    '                    console.error(`[LiveScorecard] ❌ Failed to sync scorecard ${data.player_name}:`, error);',
    '                    // Leave in localStorage for retry later',
    '                }'
].join('\n');

const newErrorHandling = [
    '                } catch (error) {',
    '                    console.error(`[LiveScorecard] ❌ Failed to sync scorecard ${data.player_name}:`, error);',
    '                    ',
    '                    // Track retry attempts to prevent infinite loop',
    '                    if (!data.sync_attempts) data.sync_attempts = 0;',
    '                    data.sync_attempts++;',
    '                    ',
    '                    if (data.sync_attempts >= 3) {',
    '                        // After 3 failed attempts, remove to prevent groundhog day loop',
    '                        console.warn(`[LiveScorecard] 🗑️ Removing ${data.player_name} after 3 failed sync attempts`);',
    '                        localStorage.removeItem(key);',
    '                        const scoresKey = `scores_${data.id}`;',
    '                        localStorage.removeItem(scoresKey);',
    '                    } else {',
    '                        // Update retry count in localStorage',
    '                        localStorage.setItem(key, JSON.stringify(data));',
    '                        console.log(`[LiveScorecard] 🔄 Will retry sync (attempt ${data.sync_attempts}/3)`);',
    '                    }',
    '                }'
].join('\n');

let result = lines.join('\n');
if (result.includes(oldErrorHandling)) {
    result = result.replace(oldErrorHandling, newErrorHandling);
    fs.writeFileSync('index.html', result, 'utf8');
    console.log('✅ Added retry limit (max 3 attempts) to prevent endless sync loop');
} else {
    console.error('ERROR: Could not find exact error handling pattern');
    console.log('Trying line-by-line replacement...');

    // Alternative: replace just the comment line
    result = result.replace(
        '                    // Leave in localStorage for retry later',
        `                    // Track retry attempts to prevent infinite loop
                    if (!data.sync_attempts) data.sync_attempts = 0;
                    data.sync_attempts++;

                    if (data.sync_attempts >= 3) {
                        // After 3 failed attempts, remove to prevent groundhog day loop
                        console.warn(\`[LiveScorecard] 🗑️ Removing \${data.player_name} after 3 failed sync attempts\`);
                        localStorage.removeItem(key);
                        const scoresKey = \`scores_\${data.id}\`;
                        localStorage.removeItem(scoresKey);
                    } else {
                        // Update retry count in localStorage
                        localStorage.setItem(key, JSON.stringify(data));
                        console.log(\`[LiveScorecard] 🔄 Will retry sync (attempt \${data.sync_attempts}/3)\`);
                    }`
    );
    fs.writeFileSync('index.html', result, 'utf8');
    console.log('✅ Added retry limit using alternative method');
}

console.log('\n📋 Next step: User needs to clear browser localStorage to remove existing failed scorecards');
