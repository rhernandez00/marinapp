
const estado = {
  datos: null, etapaActual: 0, palabraActual: null, silabasObjetivo: [],
  dificultad: 2, racha: 0, vozActiva: true, sonidosActivos: true, musicaActiva: true,
  slots: [], ttsVoz: null, audioCtx: null, musica: { activo:false, id:null }
};

function decir(texto){
  const burbuja = document.getElementById('burbuja');
  burbuja.textContent = texto;
  if (!estado.vozActiva || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(texto);
  if (estado.ttsVoz) u.voice = estado.ttsVoz;
  u.lang = 'es-MX'; u.rate = 0.95; u.pitch = 1.1; u.volume = 1.0;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

function inicializarVoz(pref='es-MX'){
  if (!('speechSynthesis' in window)) return;
  function setVoz(){
    const voces = speechSynthesis.getVoices();
    estado.ttsVoz = voces.find(v=>v.lang === pref) || voces.find(v=>v.lang.startsWith('es')) || null;
  }
  setVoz();
  speechSynthesis.onvoiceschanged = setVoz;
}

function miau(bien=true){
  if (!estado.sonidosActivos) return;
  if (!estado.audioCtx) estado.audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  const ctx = estado.audioCtx;
  const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
  f.type="bandpass"; f.frequency.value = bien? 800:500; f.Q.value = 3; o.type="triangle"; o.connect(f); f.connect(g); g.connect(ctx.destination);
  const t = ctx.currentTime; o.frequency.setValueAtTime(bien?800:500,t); o.frequency.exponentialRampToValueAtTime(bien?300:250, t+0.35);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.6,t+0.05); g.gain.exponentialRampToValueAtTime(0.0001,t+0.4);
  o.start(t); o.stop(t+0.42);
}

function iniciarMusica(){
  if (!estado.musicaActiva) return;
  if (!estado.audioCtx) estado.audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  const ctx = estado.audioCtx; estado.musica.activo = true; const tempo = 100; const negra = 60/tempo; const escala=[261.63,293.66,329.63,392.0,523.25]; let paso=0;
  function tick(){
    if (!estado.musica.activo) return;
    const t = ctx.currentTime + 0.05;
    const oB = ctx.createOscillator(); const gB = ctx.createGain();
    oB.type="sine"; oB.frequency.value = (paso%4===0)?130.81:98.0; gB.gain.value=0.05; oB.connect(gB).connect(ctx.destination); oB.start(t); oB.stop(t+negra*0.95);
    const oC = ctx.createOscillator(); const gC = ctx.createGain(); oC.type="triangle"; oC.frequency.value = escala[(paso%escala.length)];
    gC.gain.value=0.04; oC.connect(gC).connect(ctx.destination); oC.start(t+0.05); oC.stop(t+0.05+negra*0.6);
    paso=(paso+1)%16; estado.musica.id = setTimeout(tick, negra*1000);
  }
  tick();
}
function detenerMusica(){ estado.musica.activo=false; if (estado.musica.id){ clearTimeout(estado.musica.id); estado.musica.id=null; }}

function barajar(arr){ return arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]); }

function renderBanco(silabas, distractores, nDistract){
  const banco = document.getElementById('banco'); banco.innerHTML="";
  let cand = Array.from(new Set(distractores.filter(d=>!silabas.includes(d))));
  cand = barajar(cand).slice(0,nDistract); const todos = barajar([...silabas, ...cand]);
  for (const s of todos){
    const ficha = document.createElement('button');
    ficha.className='ficha'; ficha.setAttribute('draggable','false'); ficha.setAttribute('aria-label',`Sí­laba ${s}`);
    ficha.innerHTML = `<span class="silaba-texto">${s}</span>`; ficha.dataset.silaba = s; activarArrastre(ficha); banco.appendChild(ficha);
  }
}

function renderSlots(num){
  const objetivo = document.getElementById('objetivo'); objetivo.innerHTML=""; estado.slots=[];
  for (let i=0;i<num;i++){ const slot = document.createElement('div'); slot.className='slot'; slot.dataset.index=i; slot.dataset.ocupado="no"; slot.tabIndex=0;
    objetivo.appendChild(slot); estado.slots.push(slot); }
}

function activarArrastre(elem){
  let arr=false, sx=0, sy=0;
  function down(e){ arr=true; elem.setPointerCapture(e.pointerId); elem.style.position='absolute'; sx=e.clientX; sy=e.clientY; elem.style.zIndex=1000; }
  function move(e){ if(!arr) return; const dx=e.clientX-sx, dy=e.clientY-sy; elem.style.transform=`translate(${dx}px, ${dy}px)`; }
  function up(e){
    if(!arr) return; arr=false; elem.releasePointerCapture(e.pointerId);
    const rect = elem.getBoundingClientRect(); const c={x:rect.left+rect.width/2, y:rect.top+rect.height/2}; let ok=false;
    for (const slot of estado.slots){
      const r=slot.getBoundingClientRect();
      if (c.x>=r.left && c.x<=r.right && c.y>=r.top && c.y<=r.bottom && slot.dataset.ocupado==="no"){
        slot.dataset.ocupado="si"; slot.innerHTML=`<span class="silaba-texto">${elem.dataset.silaba}</span>`; slot.dataset.silaba=elem.dataset.silaba; elem.remove(); ok=true; verificarProgreso(); break;
      }
    }
    if(!ok){ elem.style.transform='translate(0,0)'; elem.style.zIndex=1; elem.style.position='relative'; }
  }
  elem.addEventListener('pointerdown',down); elem.addEventListener('pointermove',move); elem.addEventListener('pointerup',up); elem.addEventListener('pointercancel',up);
}

function verificarProgreso(){
  const colocadas = estado.slots.map(s=> s.dataset.silaba || null);
  if (colocadas.every(Boolean)){
    const correcta = JSON.stringify(colocadas)===JSON.stringify(estado.silabasObjetivo);
    if (correcta){ celebrar(); estado.racha++; estado.dificultad = Math.min(estado.datos.config.dificultad.max_distractores, estado.dificultad + estado.datos.config.dificultad.aumento_por_racha); setTimeout(siguientePalabra, 900); }
    else {
      miau(false); estado.racha=0; estado.dificultad = Math.max(estado.datos.config.dificultad.min_distractores, estado.dificultad - estado.datos.config.dificultad.reduccion_por_error);
      decir("Casi. Escucha y vuelve a intentarlo.");
      const obj = estado.silabasObjetivo;
      for (let i=0;i<estado.slots.length;i++){ if (estado.slots[i].dataset.silaba !== obj[i]){ estado.slots[i].dataset.ocupado="no"; estado.slots[i].dataset.silaba=""; estado.slots[i].innerHTML=""; } }
    }
  } else {
    const idx = colocadas.findIndex(s=>!s);
    if (idx>0 && colocadas[idx-1]===estado.silabasObjetivo[idx-1]){ decir("¡Bien! Ahora busca la siguiente sílaba."); }
  }
}

function celebrar(){
  miau(true); decir(`¡Purr-fecto! ${estado.palabraActual.texto}.`);
  for(let i=0;i<10;i++){ const img=document.createElement('img'); img.src='assets/estrella.svg'; img.className='estrella'; img.style.left=(Math.random()*80+10)+'%'; img.style.top=(Math.random()*30+10)+'%'; document.body.appendChild(img); setTimeout(()=>img.remove(),900); }
}

function prepararRonda(palabra){
  estado.palabraActual = palabra; estado.silabasObjetivo = palabra.silabas;
  renderSlots(palabra.silabas.length);
  const etapa = estado.datos.etapas[estado.etapaActual];
  renderBanco(palabra.silabas, etapa.distractores, estado.dificultad);
  document.getElementById('texto-objetivo').textContent = palabra.texto.toUpperCase();
  decir(`Arrastra las sílabas para formar la palabra. ${palabra.silabas.join(" ... ")}`);
}

function siguientePalabra(){
  const etapa = estado.datos.etapas[estado.etapaActual];
  const palabras = barajar(etapa.palabras);
  prepararRonda(palabras[0]);
}

function prepararControles(){
  document.getElementById('btn-voz').addEventListener('click', e=>{ estado.vozActiva=!estado.vozActiva; e.currentTarget.setAttribute('aria-pressed', String(estado.vozActiva)); if(estado.vozActiva) decir("Voz activada."); });
  document.getElementById('btn-sonidos').addEventListener('click', e=>{ estado.sonidosActivos=!estado.sonidosActivos; e.currentTarget.setAttribute('aria-pressed', String(estado.sonidosActivos)); if(estado.sonidosActivos) miau(true); });
  document.getElementById('btn-musica').addEventListener('click', e=>{ estado.musicaActiva=!estado.musicaActiva; e.currentTarget.setAttribute('aria-pressed', String(estado.musicaActiva)); if(estado.musicaActiva) iniciarMusica(); else detenerMusica(); });
  document.getElementById('btn-siguiente').addEventListener('click', ()=> siguientePalabra());
  window.addEventListener('pointerdown', function initOnce(){ window.removeEventListener('pointerdown', initOnce); if (estado.datos?.config?.musica_activa_por_defecto) iniciarMusica(); });
}

async function iniciar(){
  inicializarVoz('es-MX'); prepararControles();
  try{
    const resp = await fetch('contenido.json'); estado.datos = await resp.json();
    estado.sonidosActivos = estado.datos.config.sonidos_activos_por_defecto; estado.musicaActiva = estado.datos.config.musica_activa_por_defecto;
    document.getElementById('btn-sonidos').setAttribute('aria-pressed', String(estado.sonidosActivos));
    document.getElementById('btn-musica').setAttribute('aria-pressed', String(estado.musicaActiva));
    siguientePalabra();
  }catch(e){ console.error(e); decir("No pude cargar el contenido. Revisa 'contenido.json'."); }
}
window.addEventListener('DOMContentLoaded', iniciar);
