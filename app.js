// VEIL / ONE — Pure vanilla JS, minimal snake game and layer control
(() => {
  const revealBtn = document.getElementById('revealBtn');
  const systemLayer = document.getElementById('systemLayer');
  const closeBtn = document.getElementById('closeBtn');
  const resetBtn = document.getElementById('resetBtn');
  const scoreEl = document.getElementById('score');
  const canvas = document.getElementById('gameCanvas');
  const mobileDirs = Array.from(document.querySelectorAll('.dir'));

  // Focus management
  const previouslyFocused = {el: null};

  function openLayer(){
    previouslyFocused.el = document.activeElement;
    systemLayer.setAttribute('aria-hidden','false');
    closeBtn.focus();
    startGame();
  }
  function closeLayer(){
    systemLayer.setAttribute('aria-hidden','true');
    stopGame();
    if(previouslyFocused.el) previouslyFocused.el.focus();
  }

  revealBtn.addEventListener('click', openLayer);
  closeBtn.addEventListener('click', closeLayer);

  // keyboard accessible: close on Escape
  window.addEventListener('keydown', (e)=>{
    if(e.key==='Escape' && systemLayer.getAttribute('aria-hidden')==='false') closeLayer();
  });

  // --- Snake game ---
  const ctx = canvas.getContext('2d');
  let rafId = null;
  let lastTime = 0;
  const targetUPS = 8; // moves per second
  let accumulator = 0;
  const step = 1 / targetUPS;

  let gridCount = 20;
  let cellSize = 20;

  let snake = [];
  let dir = {x:1,y:0};
  let nextDir = null;
  let apple = {x:10,y:10};
  let score = 0;
  let running = false;

  function resizeCanvas(){
    // make canvas square and responsive within its CSS
    const rect = canvas.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, 600));
    canvas.width = size;
    canvas.height = size;
    cellSize = Math.floor(size / gridCount);
    // snap gridCount to keep cell size integer for crispness
    // (we keep gridCount constant for predictable gameplay)
  }

  function randCell(){
    return {
      x: Math.floor(Math.random()*gridCount),
      y: Math.floor(Math.random()*gridCount)
    };
  }

  function placeApple(){
    let p;
    do{ p = randCell(); } while(snake.some(s=>s.x===p.x&&s.y===p.y));
    apple = p;
  }

  function reset(){
    snake = [ {x:Math.floor(gridCount/2), y:Math.floor(gridCount/2)} ];
    dir = {x:1,y:0}; nextDir = null;
    score = 0; updateScore(); placeApple();
  }

  function updateScore(){ scoreEl.textContent = `Score: ${score}`; }

  function startGame(){
    if(running) return;
    resizeCanvas();
    reset();
    running = true;
    lastTime = performance.now();
    accumulator = 0;
    rafId = requestAnimationFrame(loop);
  }
  function stopGame(){
    running = false;
    if(rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function gameStep(){
    // update direction
    if(nextDir){ dir = nextDir; nextDir = null; }
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
    // wrap-around
    if(head.x < 0) head.x = gridCount - 1;
    if(head.x >= gridCount) head.x = 0;
    if(head.y < 0) head.y = gridCount - 1;
    if(head.y >= gridCount) head.y = 0;

    // collision with self
    if(snake.some(s=>s.x===head.x && s.y===head.y)){
      // end: simple reset but keep layer open
      reset();
      return;
    }

    snake.unshift(head);
    if(head.x === apple.x && head.y === apple.y){
      score += 1; updateScore(); placeApple();
    } else {
      snake.pop();
    }
  }

  function draw(){
    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // background
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // compute cell pixel size
    const cs = cellSize;

    // draw apple
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(apple.x*cs + 1, apple.y*cs + 1, cs-2, cs-2);

    // draw snake (head brighter)
    for(let i=0;i<snake.length;i++){
      const s = snake[i];
      ctx.fillStyle = i===0 ? '#ffffff' : 'rgba(255,255,255,0.85)';
      ctx.fillRect(s.x*cs + 1, s.y*cs + 1, cs-2, cs-2);
    }

    // subtle grid lines optional (very faint)
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for(let i=0;i<=gridCount;i++){
      const p = i*cs + 0.5;
      ctx.beginPath(); ctx.moveTo(p,0); ctx.lineTo(p, cs*gridCount); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,p); ctx.lineTo(cs*gridCount, p); ctx.stroke();
    }
  }

  function loop(now){
    if(!running) return;
    const delta = (now - lastTime)/1000;
    lastTime = now;
    accumulator += delta;
    // fixed-step updates
    while(accumulator >= step){
      gameStep();
      accumulator -= step;
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  // input handling
  window.addEventListener('keydown', (e)=>{
    if(systemLayer.getAttribute('aria-hidden')==='true') return;
    const map = {ArrowUp: {x:0,y:-1}, ArrowDown:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0}};
    if(map[e.key]){
      const nd = map[e.key];
      // prevent reverse
      if((nd.x === -dir.x && nd.y === -dir.y) || (nd.x === dir.x && nd.y === dir.y)) return;
      nextDir = nd;
      e.preventDefault();
    }
  });

  // mobile dir buttons
  mobileDirs.forEach(btn => btn.addEventListener('click', ()=>{
    const d = btn.dataset.dir;
    const map = {up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
    const nd = map[d];
    if((nd.x === -dir.x && nd.y === -dir.y) || (nd.x === dir.x && nd.y === dir.y)) return;
    nextDir = nd;
  }));

  // touch swipe support
  let touchStart = null;
  canvas.addEventListener('touchstart', (e)=>{ if(e.touches.length===1) touchStart = e.touches[0]; });
  canvas.addEventListener('touchend', (e)=>{
    if(!touchStart) return; const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.clientX; const dy = t.clientY - touchStart.clientY;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    if(Math.max(absX,absY) < 20) { touchStart = null; return; }
    let nd = null;
    if(absX > absY){ nd = dx>0 ? {x:1,y:0} : {x:-1,y:0}; }
    else { nd = dy>0 ? {x:0,y:1} : {x:0,y:-1}; }
    if((nd.x === -dir.x && nd.y === -dir.y) || (nd.x === dir.x && nd.y === dir.y)) { touchStart = null; return; }
    nextDir = nd; touchStart = null;
  });

  // reset
  resetBtn.addEventListener('click', ()=>{ reset(); });

  // resize handling
  let resizeObserver = new ResizeObserver(()=>{ if(running) resizeCanvas(); });
  resizeObserver.observe(canvas);
  window.addEventListener('orientationchange', ()=> resizeCanvas());

  // respect prefers-reduced-motion
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced){ /* lower UPS for reduced motion */ }

  // close layer when clicking overlay background
  systemLayer.addEventListener('click', (e)=>{
    if(e.target === systemLayer) closeLayer();
  });

  // expose some controls to window for debugging (non-essential)
  window.VEILONE = { open: openLayer, close: closeLayer };
})();
