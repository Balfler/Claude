
/* ============================================================
   O PROVADOR
   ------------------------------------------------------------
   A tela do personagem por pecas. Toda regra vem de p3e.js; aqui so se
   escolhe, assa e mostra. A imagem assada e a mesma que o jogo usa: cor
   indexada com a tabela de luz, desenhada no nivel mais claro.

   A escolha fica guardada no navegador, na chave provador:v1 -- e dali
   que o jogador vai sair quando o jogo tiver terceira pessoa.
   ============================================================ */
const CHAVE_PROVADOR = "provador:v1";
const NOMES_ESPACO = {roupa:"Roupa", armadura:"Armadura", cabelo:"Cabelo", elmo:"Elmo", capa:"Capa",
                      escudo:"Escudo", arma:"Arma", enfeite:"Enfeite"};
const NOMES_OPCAO = {tunica:"T\u00fanica", camisa:"Camisa", roupa:"S\u00f3 a roupa", couro:"Couro", malha:"Cota de malha",
                     placas:"Placas", careca:"Careca", curto:"Curto", longo:"Longo", rabo:"Rabo de cavalo",
                     nenhum:"Nenhum", nenhuma:"Nenhuma", capuz:"Capuz", elmo:"Elmo aberto", fechado:"Elmo fechado",
                     capa:"Capa", redondo:"Redondo", adaga:"Adaga", espada:"Espada", cajado:"Cajado", arco:"Arco",
                     grimorio:"Grim\u00f3rio", pena:"Pena", faixa:"Faixa", brasao:"Bras\u00e3o"};
/* os grupos de pose que o provador deixa escolher: uma pose fixa (seq de um
   quadro so) ou um ciclo, com o intervalo entre quadros dele. As mesmas
   poses de POSE, em p3e.js -- ver la o que cada uma quer dizer. */
const GRUPOS_POSE = [
  {id:"parado",   nome:"Parado",   seq:[POSE.PARADO], ms:0},
  {id:"respirar", nome:"Respirar", seq:[POSE.RESPIRAR], ms:0},
  {id:"andar",    nome:"Andar",    seq:POSE.ANDAR, ms:150},
  {id:"correr",   nome:"Correr",   seq:POSE.CORRER, ms:90},
  {id:"pulo",     nome:"Pulo",     seq:[POSE.PULO], ms:0},
  {id:"ataque",   nome:"Ataque",   seq:POSE.ATAQUE, ms:220},
  {id:"conjurar", nome:"Conjurar", seq:POSE.CONJURAR, ms:260},
  {id:"bloquear", nome:"Bloquear", seq:[POSE.BLOQUEAR], ms:0},
  {id:"arco",     nome:"Arco",     seq:POSE.ARCO, ms:300}
];
/* a cor que cada espaco usa, e o nome de cada tom */
const COR_DO_ESPACO = {roupa:"corRoupa", cabelo:"corCabelo", capa:"corCapa", enfeite:"corEnfeite"};
const NOMES_COR = {corRoupa:["azul", "vinho", "oliva", "ocre"], corCabelo:["castanho", "preto", "grisalho", "ruivo"],
                   corCapa:["azul", "vinho", "oliva", "ocre"], corEnfeite:["ouro", "carmesim", "esmeralda", "prata"]};
const RUMOS = ["de frente", "tr\u00eas quartos", "de lado", "costas e lado", "de costas", "costas e lado", "de lado", "tr\u00eas quartos"];

const $p = function(id){ return document.getElementById(id); };
let escolha = PERSONAGEM_PADRAO, quadros = null, fornada = null, rumo = 0, passo = 0, grupo = GRUPOS_POSE[0];
try { escolha = escolhaDoPersonagem(JSON.parse(localStorage.getItem(CHAVE_PROVADOR) || "null")); } catch(e){}

/* imagem indexada -> pixels, no nivel de luz 0 */
function pintar(canvas, q){
  if (!q) return;
  if (canvas.width !== q.w) canvas.width = q.w;
  if (canvas.height !== q.h) canvas.height = q.h;
  const g = canvas.getContext("2d");
  const id = g.createImageData(q.w, q.h), saida = new Uint32Array(id.data.buffer);
  for (let i=0; i<q.px.length; i++) saida[i] = q.cm[q.px[i]];
  g.putImageData(id, 0, 0);
}

const botoesRumo = [], botoesPose = [];
function desenhar(){
  if (!quadros) return;
  pintar($p("vista"), quadroDaPose(quadros, grupo.seq[passo % grupo.seq.length], rumo));
  $p("rumoNome").textContent = RUMOS[rumo];
  botoesRumo.forEach(function(b, r){ b.setAttribute("aria-pressed", String(r === rumo)); });
}
function escolherPose(g){ grupo = g; passo = 0; botoesPose.forEach(function(b){ b.setAttribute("aria-pressed", String(b.grupo === g)); }); desenhar(); }
/* Oito poses em oito rumos e pesado para assar de uma vez sem travar a
   pagina; a fornada assa aos poucos dentro do laco (embaixo), e o rumo
   parado sempre sai primeiro -- e o que preenche as miniaturas de baixo. */
function assar(){
  fornada = novaFornada(escolha, 0);
  quadros = fornada.quadros;
  desenhar();
  try { localStorage.setItem(CHAVE_PROVADOR, JSON.stringify(escolha)); } catch(e){}
}
function girar(d){ rumo = (rumo + d + ROTACOES) % ROTACOES; desenhar(); }

/* ---------- as pecas ---------- */
const botoesOpcao = [];
function construir(){
  const caixa = $p("pecas");
  for (const espaco of ORDEM_PECAS){
    const sec = document.createElement("div");
    sec.className = "espaco";
    const h = document.createElement("h2");
    h.textContent = NOMES_ESPACO[espaco];
    sec.appendChild(h);
    const opcoes = document.createElement("div");
    opcoes.className = "opcoes";
    for (const op of Object.keys(PECAS[espaco])){
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = NOMES_OPCAO[op] || op;
      b.onclick = function(){ escolha = escolhaDoPersonagem(Object.assign({}, escolha, {[espaco]: op})); atualizar(); assar(); };
      botoesOpcao.push({b: b, chave: espaco, valor: op});
      opcoes.appendChild(b);
    }
    sec.appendChild(opcoes);
    const chaveCor = COR_DO_ESPACO[espaco];
    if (chaveCor){
      const cores = document.createElement("div");
      cores.className = "cores";
      CORES_PERSONAGEM[chaveCor].forEach(function(rampa, k){
        const b = document.createElement("button");
        b.type = "button";
        b.style.background = rampa[Math.floor(rampa.length * 0.6)];
        b.title = NOMES_COR[chaveCor][k];
        b.setAttribute("aria-label", NOMES_ESPACO[espaco] + " " + NOMES_COR[chaveCor][k]);
        b.onclick = function(){ escolha = escolhaDoPersonagem(Object.assign({}, escolha, {[chaveCor]: k})); atualizar(); assar(); };
        botoesOpcao.push({b: b, chave: chaveCor, valor: k});
        cores.appendChild(b);
      });
      sec.appendChild(cores);
    }
    caixa.appendChild(sec);
  }
  const poses = $p("poses");
  for (const g of GRUPOS_POSE){
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = g.nome;
    b.grupo = g;
    b.onclick = function(){ escolherPose(g); };
    botoesPose.push(b);
    poses.appendChild(b);
  }
  escolherPose(GRUPOS_POSE[0]);
  const faixa = $p("rumos");
  for (let r=0; r<ROTACOES; r++){
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", RUMOS[r]);
    b.appendChild(document.createElement("canvas"));
    b.onclick = function(){ rumo = r; $p("auto").checked = false; desenhar(); };
    botoesRumo.push(b);
    faixa.appendChild(b);
  }
}
function atualizar(){
  for (const o of botoesOpcao) o.b.setAttribute("aria-pressed", String(escolha[o.chave] === o.valor));
}

/* ---------- girar e andar ---------- */
$p("girarEsq").onclick = function(){ $p("auto").checked = false; girar(-1); };
$p("girarDir").onclick = function(){ $p("auto").checked = false; girar(1); };
addEventListener("keydown", function(ev){
  if (ev.key === "ArrowLeft"){ $p("auto").checked = false; girar(-1); }
  else if (ev.key === "ArrowRight"){ $p("auto").checked = false; girar(1); }
});
/* arrastar na figura gira, um rumo a cada 36 pixels */
(function(){
  const vista = $p("vista");
  let x0 = null;
  vista.addEventListener("pointerdown", function(ev){ x0 = ev.clientX; vista.setPointerCapture(ev.pointerId); $p("auto").checked = false; });
  vista.addEventListener("pointermove", function(ev){
    if (x0 === null) return;
    const d = Math.trunc((ev.clientX - x0) / 36);
    if (d){ girar(-d); x0 += d*36; }
  });
  vista.addEventListener("pointerup", function(){ x0 = null; });
})();

let ultimoGiro = 0, ultimoPasso = 0, thumbsProntas = false;
function laco(t){
  const reduzido = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fornada && !fornada.pronta()){
    fornada.trabalhar(8);
    if (!thumbsProntas && quadroDaPose(quadros, 0, ROTACOES - 1)){    // o rumo parado inteiro assou
      thumbsProntas = true;
      botoesRumo.forEach(function(b, r){ pintar(b.firstChild, quadroDaPose(quadros, 0, r)); });
    }
    desenhar();                                    // repinta enquanto a pose de agora ainda esta assando
  }
  if ($p("auto").checked && !reduzido && t - ultimoGiro > 650){ ultimoGiro = t; girar(1); }
  if (grupo.ms && t - ultimoPasso > grupo.ms){ ultimoPasso = t; passo = (passo + 1) % grupo.seq.length; desenhar(); }
  requestAnimationFrame(laco);
}

construir();
atualizar();
assar();
requestAnimationFrame(laco);
})();
</script>
