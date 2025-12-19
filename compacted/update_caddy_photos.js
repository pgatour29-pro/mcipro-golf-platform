const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Find all caddy entries - simpler pattern
let photoIndex = 1;
const pattern = /(avatar:\s*'[^']*',)(\s*photo:\s*'[^']*',)?/g;

html = html.replace(pattern, (match, before, existingPhoto) => {
  const photoNum = ((photoIndex - 1) % 25) + 1;
  const newPhoto = ` photo: 'images/caddies/caddy${photoNum}.jpg',`;
  photoIndex++;
  return before + newPhoto;
});

fs.writeFileSync('index.html', html);
console.log(`Updated ${photoIndex - 1} caddies with rotating photos (caddy1.jpg - caddy25.jpg)`);
