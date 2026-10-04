/* ============================================================
   SONDAGEM 6 -- O FORNO NUM WORKER
   ------------------------------------------------------------
   Entra DENTRO do jogo montado (costura-forno.js), antes do laco comecar.

   O personagem e assado aos poucos na linha principal: 3 ms por quadro,
   tarefa por tarefa (novaFornada). Aqui a mesma fornada roda num Worker,
   que e outra linha de execucao, e a linha principal so recebe os quadros
   prontos. O worker nasce de um Blob com o proprio codigo do jogo (o texto
   do <script> desta pagina) e uma casca de mentira no lugar do documento --
   o mesmo truque do harness dos testes --, entao funciona abrindo direto do
   disco (file://), sem servidor.

   Na pagina: __FORNO.fornada(escolha, nevoa) devolve um objeto com a mesma
   cara do de novaFornada (quadros, poses, pronta, trabalhar), que se enche
   sozinho, pose por pose, conforme o worker manda. E o que medir.js usa para
   comparar os dois jeitos.
   ============================================================ */
var __FORNO = (function(){
  /* ---------- dentro do worker ---------- */
  if (typeof __FORNO_NO_WORKER !== "undefined"){
    self.onmessage = function(m){
      const o = m.data, t0 = performance.now();
      const f = novaFornada(o.escolha, o.nevoa || 0);
      let enviadas = 0, maior = 0;
      while (!f.pronta()){
        const a = performance.now();
        f.trabalhar(0);                                   // uma tarefa
        maior = Math.max(maior, performance.now() - a);
        /* pose com os rumos todos assados vai embora; os buffers sao
           transferidos, nao copiados, e o worker fica sem eles */
        while (enviadas < f.quadros.length && f.quadros[enviadas].every(Boolean)){
          const lista = f.quadros[enviadas].map(function(q){
            return {px: q.px, w: q.w, h: q.h, longe: {px: q.longe.px, w: q.longe.w, h: q.longe.h}};
          });
          const buffers = [];
          for (const q of lista) buffers.push(q.px.buffer, q.longe.px.buffer);
          self.postMessage({id: o.id, pose: enviadas, quadros: lista}, buffers);
          enviadas++;
        }
      }
      self.postMessage({id: o.id, fim: true, ms: performance.now() - t0, maiorTarefa: maior});
    };
    self.postMessage({pronto: true});
    return null;
  }

  /* ---------- na pagina ---------- */
  /* a casca do worker: o bastante do documento para o jogo carregar sem tela */
  const CASCA = [
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
    "  addEventListener: __nada, querySelector: function(){ return null; }, pointerLockElement: null};",
    "var __win = {devicePixelRatio: 1, addEventListener: __nada};",
    "var __ls = {getItem: function(){ return null; }, setItem: __nada, removeItem: __nada};",
    "var __mm = function(){ return {matches: false, addEventListener: __nada, addListener: __nada}; };"
  ].join("\n");
  let fonte = null;
  function fonteDoWorker(){
    if (!fonte){
      const s = document.querySelector("script").textContent;
      fonte = CASCA + "\n(function(document, window, location, localStorage, requestAnimationFrame, matchMedia){\n" + s +
              "\n})(__doc, __win, {search: '?mapa=cripta'}, __ls, function(){ return 0; }, __mm);\n";
    }
    return fonte;
  }

  const workers = [], pedidos = new Map();
  let proximo = 1, vez = 0, ligados = null;
  const medida = {msMensagens: 0, mensagens: 0, maiorMensagem: 0, msLigar: 0};
  /* sobe n workers (um so, por padrao); resolve quando todos carregaram o jogo */
  function ligar(n){
    if (ligados) return ligados;
    const url = URL.createObjectURL(new Blob([fonteDoWorker()], {type: "text/javascript"}));
    const t0 = performance.now();
    const promessas = [];
    for (let i = 0; i < (n || 1); i++){
      const w = new Worker(url);
      workers.push(w);
      promessas.push(new Promise(function(ok, falha){
        w.onerror = function(e){ falha(new Error("worker: " + e.message)); };
        w.onmessage = function(m){ if (m.data.pronto){ w.onmessage = receber; ok(); } };
      }));
    }
    ligados = Promise.all(promessas).then(function(){ medida.msLigar = performance.now() - t0; });
    return ligados;
  }
  function receber(m){
    const t0 = performance.now(), d = m.data, f = pedidos.get(d.id);
    if (!f) return;
    if (d.fim){ f.feita = true; f.msNoWorker = d.ms; f.maiorTarefa = d.maiorTarefa; f.prontaEm = performance.now(); pedidos.delete(d.id); }
    else {
      /* a tabela de cores e a mesma dos dois lados: nao precisa viajar */
      const cm = tabelaDaPaleta(P_PERSONAGEM, f.nevoa).cm;
      f.quadros[d.pose] = d.quadros.map(function(q){ q.cm = cm; q.longe.cm = cm; return q; });
    }
    const ms = performance.now() - t0;
    medida.msMensagens += ms; medida.mensagens++;
    if (ms > medida.maiorMensagem) medida.maiorMensagem = ms;
  }
  /* a mesma cara de novaFornada; os quadros chegam sozinhos */
  function fornada(escolha, nevoa){
    const id = proximo++;
    const f = {id: id, nevoa: nevoa || 0, feita: false, pedidaEm: performance.now(),
               quadros: TODAS_AS_POSES.map(function(){ return new Array(ROTACOES).fill(null); }), poses: TODAS_AS_POSES,
               pronta: function(){ return f.feita; }, trabalhar: function(){ return f.feita; }, presas: function(){ return 0; }};
    pedidos.set(id, f);
    ligar().then(function(){ workers[vez++ % workers.length].postMessage({id: id, escolha: escolha, nevoa: f.nevoa}); });
    return f;
  }
  return {ligar: ligar, fornada: fornada, medida: medida, fonteDoWorker: fonteDoWorker};
})();
if (typeof window !== "undefined" && __FORNO) (function(){
  /* ---------- as medidas (medir.js chama) ---------- */
  const esperarQuadro = function(){ return new Promise(function(ok){ requestAnimationFrame(ok); }); };
  const resumo = function(v){
    const s = v.slice().sort(function(a, b){ return a - b; }), q = function(p){ return s.length ? s[Math.min(s.length - 1, Math.floor(p*s.length))] : 0; };
    return {n: s.length, p50: q(0.5), p95: q(0.95), max: s.length ? s[s.length - 1] : 0, soma: s.reduce(function(a, b){ return a + b; }, 0)};
  };
  /* os quadros da tela enquanto `pronto()` nao diz que acabou; `porQuadro` roda em cada um */
  async function medirQuadros(pronto, porQuadro){
    const intervalos = [], trabalho = [];
    let antes = await esperarQuadro();
    const t0 = performance.now();
    while (!pronto()){
      const agora = await esperarQuadro();
      intervalos.push(agora - antes); antes = agora;
      if (porQuadro){ const a = performance.now(); porQuadro(); trabalho.push(performance.now() - a); }
      if (performance.now() - t0 > 120000) throw new Error("demorou demais");
    }
    return {ms: performance.now() - t0, intervalos: resumo(intervalos), trabalho: resumo(trabalho)};
  }
  window.__FORNO_DBG = {
    escolha: function(e){ return escolhaDoPersonagem(e); },
    /* a linha principal, como o jogo faz hoje: FORNO_MS por quadro, uma fornada de cada vez */
    principal: async function(escolhas){
      const fs = escolhas.map(function(e){ return novaFornada(escolhaDoPersonagem(e), 0); });
      const tarefas = [];
      const r = await medirQuadros(function(){ return fs.every(function(f){ return f.pronta(); }); }, function(){
        const f = fs.find(function(f){ return !f.pronta(); });
        if (!f) return;
        /* uma tarefa por vez, para saber a maior: e ela que faz o quadro passar do tempo */
        const t0 = performance.now();
        do { const a = performance.now(); f.trabalhar(0); tarefas.push(performance.now() - a); } while (!f.pronta() && performance.now() - t0 < FORNO_MS);
      });
      r.tarefas = resumo(tarefas);
      return r;
    },
    /* o worker: pede todas de uma vez e so desenha enquanto elas chegam */
    worker: async function(escolhas, n){
      await __FORNO.ligar(n);
      const m = __FORNO.medida; m.msMensagens = 0; m.mensagens = 0; m.maiorMensagem = 0;
      const fs = escolhas.map(function(e){ return __FORNO.fornada(escolhaDoPersonagem(e), 0); });
      const r = await medirQuadros(function(){ return fs.every(function(f){ return f.pronta(); }); });
      r.msLigar = m.msLigar; r.msMensagens = m.msMensagens; r.mensagens = m.mensagens; r.maiorMensagem = m.maiorMensagem;
      r.noWorker = fs.map(function(f){ return {ms: f.msNoWorker, maiorTarefa: f.maiorTarefa}; });
      return r;
    },
    /* nada assando: a referencia */
    parado: async function(ms){ const t0 = performance.now(); return medirQuadros(function(){ return performance.now() - t0 > ms; }); },
    /* o worker e a linha principal assam o mesmo personagem igual, byte a byte? */
    comparar: async function(e){
      const esc = escolhaDoPersonagem(e), a = novaFornada(esc, 0);
      a.trabalhar(Infinity);
      const b = __FORNO.fornada(esc, 0);
      while (!b.pronta()) await esperarQuadro();
      let iguais = 0, diferentes = 0;
      const mesmo = function(x, y){ if (x.w !== y.w || x.h !== y.h || x.px.length !== y.px.length) return false; for (let i = 0; i < x.px.length; i++) if (x.px[i] !== y.px[i]) return false; return x.cm === y.cm; };
      a.quadros.forEach(function(pose, ip){ pose.forEach(function(q, r){
        const o = b.quadros[ip][r];
        if (o && mesmo(q, o) && mesmo(q.longe, o.longe)) iguais++; else diferentes++;
      }); });
      return {iguais: iguais, diferentes: diferentes};
    },
    tamanhoDaFonte: function(){ return __FORNO.fonteDoWorker().length; },
    msLigar: function(){ return __FORNO.medida.msLigar; }
  };
})();
