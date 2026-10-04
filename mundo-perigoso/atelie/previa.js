/* ============================================================
   ATELIE -- A PREVIA DO JOGO
   ------------------------------------------------------------
   Roda dentro de um iframe do atelie. Recebe o .personagem exportado (texto)
   por postMessage, carrega o src/p3e.js DO JOGO por cima e assa com o
   assador do jogo: a mesma paleta, a mesma luz, o mesmo contorno, as mesmas
   pecas de roupa, armadura e arma. O que aparece aqui e o que o jogo mostra.

   Mensagens:
     do atelie: {tipo: "assar", personagem: texto, escolha: {...}, poses: [indices], escala, animar}
     para o atelie: {tipo: "pronta"} ao carregar; {tipo: "assado", ms} ao terminar; {tipo: "erro", mensagem}
   ============================================================ */
(function(){
  const estado = document.getElementById("estado"), folha = document.getElementById("folha");
  const RUMOS = ["frente", "3/4", "lado", "costas-lado", "costas", "costas-lado", "lado", "3/4"];
  function avisar(m){ try { parent.postMessage(m, "*"); } catch(e){} }

  function pintar(canvas, q, escala){
    canvas.width = q.w; canvas.height = q.h;
    canvas.style.width = q.w*escala + "px"; canvas.style.height = q.h*escala + "px";
    const g = canvas.getContext("2d"), id = g.createImageData(q.w, q.h), saida = new Uint32Array(id.data.buffer);
    for (let i = 0; i < q.px.length; i++) saida[i] = q.cm[q.px[i]];
    g.putImageData(id, 0, 0);
  }

  function assar(msg){
    const t0 = performance.now();
    window.PERSONAGENS_EMBUTIDOS = {humano: msg.personagem};
    const s = document.createElement("script");
    s.src = "../src/p3e.js";
    s.onerror = function(){ avisar({tipo: "erro", mensagem: "nao consegui carregar src/p3e.js"}); };
    s.onload = function(){
      try {
        if (!CORPO_DESENHADO){ estado.textContent = "o jogo recusou o arquivo"; avisar({tipo: "erro", mensagem: "o jogo nao aceitou o .personagem (faltam poses ou juntas)"}); return; }
        const poses = msg.poses && msg.poses.length ? msg.poses : TODAS_AS_POSES, escala = msg.escala || 2;
        const escolha = escolhaDoPersonagem(msg.escolha || {});
        const fornada = novaFornada(escolha, 0, poses);
        folha.style.gridTemplateColumns = "auto repeat(" + ROTACOES + ", auto)";
        folha.innerHTML = "";
        folha.appendChild(document.createElement("div"));
        for (let r = 0; r < ROTACOES; r++){ const d = document.createElement("div"); d.className = "rot"; d.textContent = RUMOS[r]; folha.appendChild(d); }
        const telas = poses.map(function(p){
          const n = document.createElement("div"); n.className = "nome"; n.textContent = NOMES_DAS_POSES[p]; folha.appendChild(n);
          const l = [];
          for (let r = 0; r < ROTACOES; r++){ const c = document.createElement("canvas"); folha.appendChild(c); l.push(c); }
          return l;
        });
        let feitos = 0;
        (function passo(){
          fornada.trabalhar(24);
          poses.forEach(function(p, ip){
            for (let r = 0; r < ROTACOES; r++){
              const q = fornada.quadros[ip][r];
              if (q && !telas[ip][r].pronto){ pintar(telas[ip][r], q, escala); telas[ip][r].pronto = true; feitos++; }
            }
          });
          estado.textContent = "assando " + feitos + " de " + poses.length*ROTACOES;
          if (!fornada.pronta()) return requestAnimationFrame(passo);
          const ms = Math.round(performance.now() - t0);
          estado.textContent = poses.length*ROTACOES + " quadros em " + ms + " ms";
          avisar({tipo: "assado", ms: ms});
          if (msg.animar) animar(poses, fornada, escala);
        })();
      } catch(e){ estado.textContent = e.message; avisar({tipo: "erro", mensagem: e.message}); }
    };
    document.body.appendChild(s);
  }
  /* uma linha a mais que passa pelos quadros da animacao no ritmo do jogo */
  function animar(poses, fornada, escala){
    const linha = [];
    const n = document.createElement("div"); n.className = "nome"; n.textContent = "no ritmo"; folha.appendChild(n);
    for (let r = 0; r < ROTACOES; r++){ const c = document.createElement("canvas"); folha.appendChild(c); linha.push(c); }
    let k = 0;
    setInterval(function(){
      k = (k + 1) % poses.length;
      for (let r = 0; r < ROTACOES; r++) pintar(linha[r], fornada.quadros[k][r], escala);
    }, poses.length >= 4 ? 110 : 220);
  }

  addEventListener("message", function(ev){
    const m = ev.data;
    if (m && m.tipo === "assar") assar(m);
  });
  avisar({tipo: "pronta"});
})();
