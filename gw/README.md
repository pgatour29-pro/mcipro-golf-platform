# Glass Whiteboard Starter

A minimal, premium “glass whiteboard” scaffold you can drop into your Cloud Code app.
- Stationary graphite background + optional golf hero image
- Optional glass frame + sheen + subtle grain
- Foreground container for your UI (only foreground moves)
- Tiny JS API: `setFrame(on)`, `setBackground(url)`, `destroy()`

## Quick start
1. Serve the folder or open `index.html` locally.
2. Put your UI inside the `gw.root` container (see `index.html` example).
3. Customize the background image or keep graphite only.

## Files
- `index.html` – demo bootstrapping the shell
- `css/glass-whiteboard.css` – all visuals for background/frame/foreground
- `js/glass-whiteboard.js` – shell controller + API

## API
```js
const gw = createGlassWhiteboard({
  mount: document.getElementById('app'), // default: document.body
  backgroundImage: 'URL',                // default golf ball image
  withFrame: true                        // default true
});
gw.setFrame(false);                      // toggle frame + sheen
gw.setBackground('your-image.jpg');      // swap stationary background image
gw.destroy();                            // remove listeners + DOM nodes
```

## Notes
- Works without any frameworks.
- If your runtime blocks external images, swap the URL in CSS or call `gw.setBackground()` with an allowed asset.
