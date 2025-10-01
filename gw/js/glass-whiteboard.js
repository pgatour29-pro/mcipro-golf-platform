// glass-whiteboard.js
export function createGlassWhiteboard({
  mount = document.body,
  backgroundImage = 'https://images.unsplash.com/photo-1519311965067-363e25d8e09f?q=80&w=2000&auto=format&fit=crop',
  withFrame = true
} = {}) {
  // ensure base layers exist
  const bg   = document.querySelector('.gw-bg');
  const noise= document.querySelector('.gw-noise');
  const frame= document.querySelector('.gw-frame');
  const sheen= document.querySelector('.gw-sheen');

  // inject background image into ::before
  const styleTag = document.createElement('style');
  document.head.appendChild(styleTag);
  function setBg(url){
    if(!url){ styleTag.textContent = `.gw-bg::before{background-image:none;}`; return; }
    styleTag.textContent = `.gw-bg::before{background-image:url("${url}")}`;
  }
  setBg(backgroundImage);

  // toggle frame layers
  function setFrame(on=true){
    frame.classList.toggle('gw-hidden', !on);
    sheen.classList.toggle('gw-hidden', !on);
  }
  setFrame(withFrame);

  // foreground root
  const ui = mount; // use provided mount as foreground root

  return {
    root: ui,
    setFrame,
    setBackground:setBg,
    destroy(){
      styleTag.remove();
    }
  };
}
