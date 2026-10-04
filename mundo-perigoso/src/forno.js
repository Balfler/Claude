/* ============================================================
   O FORNO AO FUNDO
   ------------------------------------------------------------
   A fornada (p3e.js) assa o personagem em tarefas, e a primeira tarefa de
   cada pose leva ate uns 30 ms: na linha principal, cada visual assado da
   trancos no jogo, com FORNO_MS e tudo (sondagens/6-forno). Aqui a mesma
   fornada roda num Worker -- outra linha de execucao --, que nasce de um
   Blob com o texto deste mesmo <script> e uma casca de mentira no lugar do
   documento, o truque do harness dos testes. Funciona aberto do disco.

   fornadaAoFundo(escolha, nevoa) tem a cara de novaFornada (quadros, poses,
   pronta, trabalhar), e os quadros chegam sozinhos, pose por pose. O worker
   sobe no primeiro pedido e leva uns 2 s; enquanto isso a fornada comeca
   aqui, na linha principal, do jeito de sempre, e o forno assume o resto
   quando fica pronto. Sem Worker (no node dos testes), ou se ele falhar, e
   tudo aqui. Depois de subir, o worker fica: ele carrega o jogo inteiro de
   novo, uns 40 MB, e sobe-lo outra vez custaria os mesmos 2 s.
   ============================================================ */
const SCRIPT_DO_JOGO = typeof document !== "undefined" && document.currentScript ? document.currentScript : null;

/* Dentro do worker: assa o pedido e manda cada pose quando os rumos todos
   ficam prontos. Os buffers sao transferidos, nao copiados. */
/* o quadro e as copias para longe dele (uma ou duas, pela densidade), so os pixels */
function soOsPixels(q){
  const o = {px:q.px, w:q.w, h:q.h};
  if (q.longe) o.longe = soOsPixels(q.longe);
  return o;
}
function cadaCopia(q, f){ for (; q; q = q.longe) f(q); }
/* os outros corpos que a pagina mandou (o andarilho da vila), pelo nome */
const CORPOS_DO_FORNO = {};
function assarNoForno(pedido, enviar){
  const corpo = pedido.corpoId ? CORPOS_DO_FORNO[pedido.corpoId] : null;
  const f = novaFornada(pedido.escolha, pedido.nevoa || 0, pedido.poses, undefined, corpo, !!pedido.alturas);
  let enviadas = 0;
  const altoEnviado = f.alto ? f.alto.map(function(n){ return n.map(function(){ return false; }); }) : null;
  while (!f.pronta()){
    f.trabalhar(0);                                  // uma tarefa
    /* as alturas da camera (p3e.js): cada pose de cada altura quando os rumos dela ficam prontos */
    if (altoEnviado) f.alto.forEach(function(nivel, k){
      nivel.forEach(function(pose, ip){
        if (altoEnviado[k][ip] || !pose.every(Boolean)) return;
        altoEnviado[k][ip] = true;
        const lista = pose.map(soOsPixels), buffers = [];
        for (const q of lista) cadaCopia(q, function(c){ buffers.push(c.px.buffer); });
        enviar({id:pedido.id, nivel:k + 1, pose:ip, quadros:lista}, buffers);
      });
    });
    while (enviadas < f.quadros.length && f.quadros[enviadas].every(Boolean)){
      const lista = f.quadros[enviadas].map(soOsPixels);
      const buffers = [];
      for (const q of lista) cadaCopia(q, function(c){ buffers.push(c.px.buffer); });
      enviar({id:pedido.id, pose:enviadas, quadros:lista}, buffers);
      enviadas++;
    }
  }
  enviar({id:pedido.id, fim:true}, []);
}
if (typeof __FORNO_NO_WORKER !== "undefined"){
  self.onmessage = function(m){
    /* outro corpo, para os pedidos com o nome dele (o pedido tambem leva corpoId, mas nao o corpo) */
    if (m.data.corpoId && m.data.corpo){ CORPOS_DO_FORNO[m.data.corpoId] = corpoValido(m.data.corpo); return; }
    if (m.data.corpo){ usarCorpoDesenhado(m.data.corpo); return; }     // o corpo trocou na pagina
    assarNoForno(m.data, function(msg, buffers){ self.postMessage(msg, buffers); });
  };
  self.postMessage({pronto:true});       // so e atendido depois do jogo todo carregar
}

/* A casca: o bastante do documento e do canvas para o jogo carregar sem tela.
   O canvas de mentira devolve pixels zerados -- o assador so usa o buffer. */
const CASCA_DO_FORNO = [
  "var __FORNO_NO_WORKER = true;",
  "function __nada(){}",
  "function __ctx(w, h){ return new Proxy({canvas: {width: w, height: h},",
  "  createImageData: function(a, b){ return {data: new Uint8ClampedArray(a*b*4), width: a, height: b}; },",
  "  getImageData: function(x, y, a, b){ return {data: new Uint8ClampedArray(a*b*4), width: a, height: b}; },",
  "  measureText: function(){ return {width: 10}; },",
  "  createLinearGradient: function(){ return {addColorStop: __nada}; }, createRadialGradient: function(){ return {addColorStop: __nada}; }",
  "}, {get: function(t, p){ if (p in t) return t[p]; return typeof p === 'string' ? __nada : undefined; }, set: function(t, p, v){ t[p] = v; return true; }}); }",
  "function __canvas(){ var c = {width: 300, height: 150, style: {}, addEventListener: __nada, focus: __nada, requestPointerLock: __nada,",
  "  getBoundingClientRect: function(){ return {x: 0, y: 0, width: c.width, height: c.height}; }};",
  "  c.getContext = function(){ return c._ctx || (c._ctx = __ctx(c.width, c.height)); }; return c; }",
  "var __tela = __canvas(); __tela.width = 640; __tela.height = 360;",
  "var __doc = {createElement: function(t){ return t === 'canvas' ? __canvas() : {style: {}}; }, getElementById: function(id){ return id === 'screen' ? __tela : null; },",
  "  addEventListener: __nada, querySelector: function(){ return null; }, pointerLockElement: null, currentScript: null};",
  "var __win = {devicePixelRatio: 1, addEventListener: __nada};",
  "var __ls = {getItem: function(){ return null; }, setItem: __nada, removeItem: __nada};",
  "var __mm = function(){ return {matches: false, addEventListener: __nada, addListener: __nada}; };"
].join("\n");
/* o texto do worker: a casca e o jogo, com a cripta, que e o mapa mais leve */
function fonteDoForno(texto){
  return CASCA_DO_FORNO + "\n(function(document, window, location, localStorage, requestAnimationFrame, matchMedia){\n" + texto +
         "\n})(__doc, __win, {search: '?mapa=cripta'}, __ls, function(){ return 0; }, __mm);\n";
}

/* ---------- na pagina ---------- */
const FORNO = {worker:null, estado:"desligado", pedidos:new Map(), proximo:1, corpo:null, corposEnviados:{}};   // desligado, subindo, pronto, falhou
/* O worker nasce com o corpo embutido; se a pagina trocou de corpo (a opcao
   de densidade), ele recebe o novo antes de qualquer pedido. */
function corpoParaOForno(c){
  FORNO.corpo = {versao:c.versao, DX:c.DX, DY:c.DY, DZ:c.DZ, cores:c.cores, g:c.g, poses:c.poses.map(function(p){ return {nome:p.nome, juntas:p.juntas, g:p.g}; })};
  if (FORNO.worker) FORNO.worker.postMessage({corpo:FORNO.corpo});
}
function ligarForno(){
  if (FORNO.estado !== "desligado") return;
  if (!SCRIPT_DO_JOGO || typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined"){ FORNO.estado = "falhou"; return; }
  try {
    const url = URL.createObjectURL(new Blob([fonteDoForno(SCRIPT_DO_JOGO.textContent)], {type:"text/javascript"}));
    const w = new Worker(url);
    FORNO.worker = w; FORNO.estado = "subindo";
    if (CORPO_DE_FORA && !FORNO.corpo) corpoParaOForno(CORPO_DESENHADO);
    else if (FORNO.corpo) w.postMessage({corpo:FORNO.corpo});
    w.onerror = function(){ desligarForno(); };
    w.onmessage = function(m){
      if (m.data.pronto){ FORNO.estado = "pronto"; URL.revokeObjectURL(url); return; }
      receberDoForno(m.data);
    };
  } catch(e){ FORNO.estado = "falhou"; }
}
/* Deu errado: o worker sai, e o que ele devia assar termina aqui. */
function desligarForno(){
  if (FORNO.worker) FORNO.worker.terminate();
  FORNO.worker = null; FORNO.estado = "falhou";
  for (const f of FORNO.pedidos.values()) f.aqui = true;
  FORNO.pedidos.clear();
}
function receberDoForno(d){
  const f = FORNO.pedidos.get(d.id);
  if (!f) return;
  if (d.fim){ f.feita = true; FORNO.pedidos.delete(d.id); return; }
  /* a tabela de cores e a mesma dos dois lados: nao precisa viajar (a de
     outro corpo vem da paleta dele, f.paleta) */
  const cm = tabelaDaPaleta(f.paleta || P_PERSONAGEM, f.nevoa).cm, pose = (d.nivel ? f.alto[d.nivel - 1] : f.quadros)[d.pose];
  d.quadros.forEach(function(q, r){ cadaCopia(q, function(c){ c.cm = cm; }); if (f.porTile) q.porTile = f.porTile; pose[r] = q; });
}
/* Uma fornada ao fundo: assa aqui ate ser pedida ao forno, e dai em diante
   so recebe; se o forno cair, volta a assar aqui. O que ja chegou fica. */
/* `outro` (se vier): {id, corpo, poses} -- outro corpo que nao o do jogador,
   com o nome com que ele vai ao forno, e as poses que se quer dele */
function fornadaDoForno(escolha, nevoa, outro, comAlturas){
  const poses = outro && outro.poses || TODAS_AS_POSES;
  const novaPose = function(){ return new Array(ROTACOES).fill(null); };
  const f = {id:FORNO.proximo++, escolha:escolha, nevoa:nevoa || 0, feita:false, pedida:false, aqui:false, local:null,
             outro:outro || null, paleta:outro ? paletaDoCorpo(outro.corpo) : null, porTile:outro ? 128*outro.corpo.densidade : 0,
             quadros:poses.map(novaPose), poses:poses, comAlturas:!!comAlturas,
             alto:comAlturas ? ALTURAS_DA_CAMERA.slice(1).map(function(){ return poses.map(novaPose); }) : null,
             pronta:function(){ return f.feita; },
             basica:function(){ return f.feita || f.quadros.every(function(p){ return p.every(Boolean); }); },
             trabalhar:function(ms){
               if (f.feita) return true;
               if (!f.pedida && FORNO.estado === "pronto") pedirAoForno(f, function(p){ FORNO.worker.postMessage(p); });
               if (f.pedida && !f.aqui) return false;       // o forno assa
               if (f.outro && FORNO.estado === "subindo") return false;   // outro corpo e pesado (256): espera o forno, sem trancos aqui
               if (!f.local) f.local = novaFornada(f.escolha, f.nevoa, f.outro ? f.poses : undefined, undefined, f.outro ? f.outro.corpo : undefined, f.comAlturas);
               f.feita = f.local.trabalhar(ms);
               f.local.quadros.forEach(function(pose, ip){ pose.forEach(function(q, r){ if (q) f.quadros[ip][r] = q; }); });
               if (f.alto) f.local.alto.forEach(function(nivel, k){ nivel.forEach(function(pose, ip){ pose.forEach(function(q, r){ if (q) f.alto[k][ip][r] = q; }); }); });
               if (f.feita) FORNO.pedidos.delete(f.id);
               return f.feita;
             }};
  return f;
}
function pedirAoForno(f, enviar){
  FORNO.pedidos.set(f.id, f); f.pedida = true;
  if (f.outro){
    /* o corpo vai uma vez so por nome, antes do primeiro pedido com ele */
    if (!FORNO.corposEnviados[f.outro.id]){
      const c = f.outro.corpo;
      enviar({corpoId:f.outro.id, corpo:{versao:c.versao, DX:c.DX, DY:c.DY, DZ:c.DZ, cores:c.cores, g:c.g,
                                         poses:c.poses.map(function(p){ return {nome:p.nome, juntas:p.juntas, g:p.g}; })}});
      FORNO.corposEnviados[f.outro.id] = true;
    }
    enviar({id:f.id, escolha:f.escolha, nevoa:f.nevoa, corpoId:f.outro.id, poses:f.poses, alturas:f.comAlturas});
  } else enviar({id:f.id, escolha:f.escolha, nevoa:f.nevoa, alturas:f.comAlturas});
}
/* uma fornada ja pedida ao forno; `enviar` leva o pedido (os testes olham o caminho todo) */
function novaFornadaDoForno(escolha, nevoa, enviar){
  const f = fornadaDoForno(escolha, nevoa);
  pedirAoForno(f, enviar);
  return f;
}
/* O que o jogo chama no lugar de novaFornada. */
function fornadaAoFundo(escolha, nevoa, outro, comAlturas){
  ligarForno();
  if (FORNO.estado === "falhou") return outro ? novaFornada(escolha, nevoa, outro.poses, undefined, outro.corpo, comAlturas) : novaFornada(escolha, nevoa, undefined, undefined, undefined, comAlturas);
  const f = fornadaDoForno(escolha, nevoa, outro, comAlturas);
  if (FORNO.estado === "pronto") pedirAoForno(f, function(p){ FORNO.worker.postMessage(p); });
  return f;
}
