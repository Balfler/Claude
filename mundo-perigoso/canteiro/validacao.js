/* ============================================================
   CANTEIRO -- A VALIDACAO
   ------------------------------------------------------------
   O que se confere antes de um mapa ir para o jogo. Cada problema diz o
   mapa, o lugar e o nivel: "erro" quebra no jogo e impede exportar;
   "aviso" vale olhar, e o jogo aguenta. No canteiro, clicar no problema
   leva ate ele, no macro e no micro.

   Aqui, sem motor:
   - o FORMATO de cada mapa: validarMapa, em src/mapa.js;
   - as LIGACOES entre os mapas: a entrada leva a um mapa que existe, o par
     dela esta la -- quem sobe pela saida nasce ao lado da entrada certa --
     e a ponta de la volta para ca; a chave da porta esta num bau de algum
     mapa; o morador tem conversa propria em src/conversa.js;
   - as PECAS: duas iguais no mesmo lugar; peca solta no ar, que nao
     encosta em chao, rocha, teto nem numa peca que encoste -- a casa
     inteira erguida por engano e um aviso so --; peca enterrada.

   Com o motor, em alcance.js: o que nao se alcanca andando do inicio do
   jogador -- o marco, o chao, o alto da escada -- e o custo do quadro no
   pior lugar.

   O conjunto e a lista dos mapas conhecidos, {nome, mapa, conferir}: os
   com conferir passam por tudo, os outros so respondem pelas ligacoes.
   `completo` diz se o conjunto e todos os mapas que existem -- a linha de
   comando le mapas/ inteiro, o canteiro sabe quando tem a pasta aberta. Sem
   ele, o destino que nao esta no conjunto e aviso de "nao conferi", nao
   erro.

   O mesmo problema em muitos tiles -- a areia abaixo do mar pintada numa
   praia inteira -- vira um problema so, com os lugares todos.

   Puro: sem DOM e sem motor. O canteiro usa, a linha de comando usa, e o
   teste roda no node.
   ============================================================ */
"use strict";
(function(){
  if (typeof module === "undefined") return;
  const usar = function(o){ for (const k in o) if (typeof globalThis[k] === "undefined") globalThis[k] = o[k]; };
  if (typeof validarMapa === "undefined") usar(require("../src/mapa.js"));
  if (typeof geometriaDaPeca === "undefined") usar(require("../src/pecas.js"));
  if (typeof chaveDoMorador === "undefined") usar(require("../src/conversa.js"));
})();

/* a cripta mora no codigo do jogo (p2.js), fora de mapas/ */
const MAPAS_SEM_ARQUIVO = ["cripta"];
/* quanto duas caixas podem ficar sem se tocar e ainda contar como encostadas */
const TOQUE = 0.06;
/* lugares guardados num problema repetido: o bastante para passear por eles */
const LUGARES_MAX = 400;

/* O nome de mapa de um arquivo: "Arte/ilha-650.mapa" e ilha-650 -- o que o
   ?mapa= do jogo aceita, e o nome com que o build embute o de mapas/. */
function nomeDoMapa(arquivo){
  return String(arquivo || "").split(/[\\/]/).pop().replace(/\.mapa$/i, "").toLowerCase().replace(/[^a-z0-9-]/g, "");
}
/* o mapa aonde leva uma entrada ou saida: o mesmo de destinoDaCoisa, em
   src/ilha.js -- o teste confere que os dois dizem igual */
function destinoDoMarco(c){
  return String((c.campos && c.campos.mapa) || c.texto || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
}
function problema(nivel, mapa, x, y, msg, extra){
  return Object.assign({nivel: nivel, mapa: mapa, x: x, y: y, msg: msg}, extra);
}

/* ---------- o conjunto ---------- */
function validarConjunto(conjunto, opcoes){
  opcoes = opcoes || {};
  const out = [], porNome = new Map();
  for (const e of conjunto) porNome.set(e.nome, e.mapa);
  /* as chaves que algum bau de algum mapa guarda */
  const chaves = new Set();
  for (const e of conjunto) for (const c of e.mapa.coisas)
    if (c.tipo === "bau" && c.campos && c.campos.conteudo)
      for (const item of c.campos.conteudo.split(",")){ const kv = item.split(":"); if (kv[0] === "chave" && kv[1]) chaves.add(kv[1]); }

  for (const e of conjunto){
    if (!e.conferir) continue;
    const m = e.mapa, nome = e.nome;
    for (const a of validarMapa(m)){
      if (a.chave && chaves.has(a.chave)) continue;          // o bau esta em outro mapa
      out.push(problema(a.nivel, nome, a.x, a.y, a.msg));
    }
    for (const p of problemasDasLigacoes(m, nome, porNome, opcoes.completo)) out.push(p);
    for (const p of problemasDosMoradores(m, nome)) out.push(p);
    for (const p of problemasDePecas(m, nome, opcoes.cache)) out.push(p);
  }
  return juntarRepetidos(out);
}

/* A entrada e a saida: o mapa de la existe, e tem a ponta com o mesmo id. */
function problemasDasLigacoes(m, nome, porNome, completo){
  const out = [];
  for (const c of m.coisas){
    if (c.tipo !== "entrada" && c.tipo !== "saida") continue;
    const dest = destinoDoMarco(c), par = c.campos && c.campos.id;
    if (!dest) continue;                                      // validarMapa ja disse
    const qual = (c.tipo === "entrada" ? "a entrada" : "a sa\u00edda") + (par ? " " + par : "");
    const la = dest === nome ? m : porNome.get(dest);
    if (!la){
      if (MAPAS_SEM_ARQUIVO.indexOf(dest) >= 0){
        if (par) out.push(problema("aviso", nome, c.x, c.y, qual + " leva \u00e0 " + dest + ", que n\u00e3o tem ponta com id: chega-se no in\u00edcio dela"));
        continue;
      }
      /* o mapa de la que ainda nao existe e aviso: o jogo nao quebra, abre a
         cripta -- e um par novo precisa exportar um dos dois primeiro */
      out.push(completo
        ? problema("aviso", nome, c.x, c.y, qual + " leva a " + dest + ", que n\u00e3o existe em mapas/: o jogo abriria a cripta")
        : problema("aviso", nome, c.x, c.y, qual + " leva a " + dest + ", que n\u00e3o conferi: o mapa n\u00e3o est\u00e1 aberto"));
      continue;
    }
    if (!par) continue;
    const pontas = la.coisas.filter(function(k){
      return k !== c && (k.tipo === "entrada" || k.tipo === "saida") && k.campos && k.campos.id === par;
    });
    if (!pontas.length){
      out.push(problema("erro", nome, c.x, c.y, qual + " leva a " + dest + ", e l\u00e1 n\u00e3o h\u00e1 a ponta " + par + ": quem chega nasce no in\u00edcio"));
      continue;
    }
    const volta = destinoDoMarco(pontas[0]);
    if (volta && volta !== nome)
      out.push(problema("aviso", nome, c.x, c.y, qual + " leva a " + dest + ", mas a ponta de l\u00e1 volta para " + volta + ", n\u00e3o para " + nome));
  }
  return out;
}

/* O morador responde pelo primeiro nome (chaveDoMorador, em conversa.js):
   sem tabela propria, so diz o padrao. */
function problemasDosMoradores(m, nome){
  const out = [];
  for (const c of m.coisas){
    if (c.tipo !== "npc" || !c.texto) continue;
    const k = chaveDoMorador(c.texto);
    if (!Object.prototype.hasOwnProperty.call(MORADORES, k))
      out.push(problema("aviso", nome, c.x, c.y, "o morador " + c.texto + " n\u00e3o tem conversa em conversa.js: s\u00f3 diz o padr\u00e3o"));
  }
  return out;
}

/* ---------- as pecas ----------
   O chao de um tile, como o motor faz (tileDoMotor, em src/ilha.js): a
   agua conta pela superficie -- o que boia na agua esta apoiado --, a rocha
   pelo alto dela. O teto so conta onde o tile tem teto. */
function chaoDoTile(m, i){
  const t = TERRENOS[m.terreno[i]], W = m.larg, x = i % W, y = (i / W) | 0, passo = m.passo;
  if (t.tipo === "agua") return m.mar === null ? m.altura[i]*passo : Math.max(m.altura[i], m.mar)*passo;
  if (t.tipo === "parede"){
    let base = m.altura[i];
    for (const d of [[-1, 0], [1, 0], [0, -1], [0, 1]]){
      const xx = x + d[0], yy = y + d[1];
      if (xx < 0 || yy < 0 || xx >= W || yy >= m.alt) continue;
      const j = yy*W + xx;
      if (TERRENOS[m.terreno[j]].tipo === "chao") base = Math.max(base, m.altura[j]);
    }
    return (base + (m.teto[i] > 0 ? m.teto[i] : (t.alto || 6)))*passo;
  }
  return m.altura[i]*passo;
}
/* o chao firme, para enterrar: a agua conta pelo fundo */
function fundoDoTile(m, i){
  return TERRENOS[m.terreno[i]].tipo === "agua" ? m.altura[i]*m.passo : chaoDoTile(m, i);
}
function tetoDoTile(m, i){
  const t = TERRENOS[m.terreno[i]];
  return t.tipo !== "parede" && t.tipo !== "agua" && m.teto[i] > 0 ? (m.altura[i] + m.teto[i])*m.passo : Infinity;
}
/* A caixa de uma peca, das faces e dos solidos dela. A geometria so sai de
   novo quando a peca mudou: o cache e por id, com a assinatura da peca. */
function caixaDaPeca(p, estilos, cache){
  const estilo = estiloDaPeca(p, estilos);
  const sig = p.tipo + " " + p.x + " " + p.y + " " + p.z + " " + (p.giro || 0) + " " + (p.espelho ? 1 : 0) + " " +
              estilo + " " + (p.campos ? JSON.stringify(p.campos) : "");
  const velho = cache && p.id !== undefined ? cache.get(p.id) : null;
  if (velho && velho.sig === sig) return velho.caixa;
  const g = geometriaDaPeca(p, estilo);
  let caixa = null;
  if (g){
    caixa = {x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity};
    const cabe = function(x, y, z){
      if (x < caixa.x0) caixa.x0 = x; if (x > caixa.x1) caixa.x1 = x;
      if (y < caixa.y0) caixa.y0 = y; if (y > caixa.y1) caixa.y1 = y;
      if (z < caixa.z0) caixa.z0 = z; if (z > caixa.z1) caixa.z1 = z;
    };
    for (const f of g.faces) for (const q of f.pts) cabe(q[0], q[1], q[2]);
    for (const s of g.solidos) for (const q of s.pts){ cabe(q[0], q[1], s.z0); cabe(q[0], q[1], s.z1); }
    if (caixa.x0 === Infinity) caixa = null;
  }
  if (cache && p.id !== undefined) cache.set(p.id, {sig: sig, caixa: caixa});
  return caixa;
}
function encostam(a, b){
  return a.x0 <= b.x1 + TOQUE && b.x0 <= a.x1 + TOQUE && a.y0 <= b.y1 + TOQUE && b.y0 <= a.y1 + TOQUE &&
         a.z0 <= b.z1 + TOQUE && b.z0 <= a.z1 + TOQUE;
}
function problemasDePecas(m, nome, cache){
  const out = [], pecas = m.pecas || [], W = m.larg, H = m.alt;
  const estilos = estilosDasConstrucoes(m);
  const lugar = function(p, extra){ return Object.assign({z: p.z, peca: p.id}, extra); };

  /* duas iguais no mesmo lugar: uma nao se ve, e as duas brigam no z-buffer */
  const vistas = new Map();
  for (const p of pecas){
    const k = p.tipo + " " + p.x + " " + p.y + " " + p.z + " " + (p.giro || 0) + " " + (p.espelho ? 1 : 0);
    if (vistas.has(k)) out.push(problema("aviso", nome, Math.floor(p.x), Math.floor(p.y), "duas pe\u00e7as iguais no mesmo lugar: " + p.tipo, lugar(p)));
    else vistas.set(k, p);
  }

  /* as caixas, e quem encosta em quem, por tile */
  const caixas = pecas.map(function(p){ return TIPOS_DE_PECA[p.tipo] ? caixaDaPeca(p, estilos, cache) : null; });
  const porTile = new Map();
  const tilesDa = function(c, folga){
    const out2 = [];
    const tx0 = Math.max(0, Math.floor(c.x0 - folga)), tx1 = Math.min(W - 1, Math.floor(c.x1 + folga));
    const ty0 = Math.max(0, Math.floor(c.y0 - folga)), ty1 = Math.min(H - 1, Math.floor(c.y1 + folga));
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) out2.push(ty*W + tx);
    return out2;
  };
  caixas.forEach(function(c, n){
    if (!c) return;
    for (const i of tilesDa(c, TOQUE)){ const l = porTile.get(i); if (l) l.push(n); else porTile.set(i, [n]); }
  });
  /* grupos de pecas que se encostam; o grupo que nao toca chao nem teto
     esta solto no ar */
  const pai = pecas.map(function(_, n){ return n; });
  const raiz = function(n){ while (pai[n] !== n){ pai[n] = pai[pai[n]]; n = pai[n]; } return n; };
  const apoiado = new Uint8Array(pecas.length);
  caixas.forEach(function(c, n){
    if (!c) return;
    let noChao = false, enterrada = true, algum = false;
    for (const i of tilesDa(c, TOQUE)){
      if (c.z0 <= chaoDoTile(m, i) + TOQUE || c.z1 >= tetoDoTile(m, i) - TOQUE) noChao = true;
      for (const o of porTile.get(i)) if (o > n && encostam(c, caixas[o])){ const a = raiz(n), b = raiz(o); if (a !== b) pai[a] = b; }
    }
    /* enterrada: debaixo do chao firme de todo tile sob ela */
    for (const i of tilesDa(c, -TOQUE)){ algum = true; if (c.z1 > fundoDoTile(m, i) - 0.05){ enterrada = false; break; } }
    if (algum && enterrada)
      out.push(problema("aviso", nome, Math.floor(pecas[n].x), Math.floor(pecas[n].y), "pe\u00e7a enterrada: " + pecas[n].tipo, lugar(pecas[n])));
    if (noChao) apoiado[n] = 1;
  });
  const grupoApoiado = new Uint8Array(pecas.length), grupos = new Map();
  caixas.forEach(function(c, n){ if (c && apoiado[n]) grupoApoiado[raiz(n)] = 1; });
  caixas.forEach(function(c, n){
    if (!c || grupoApoiado[raiz(n)]) return;
    const r = raiz(n), g = grupos.get(r);
    if (g) g.push(n); else grupos.set(r, [n]);
  });
  grupos.forEach(function(ns){
    const p = pecas[ns[0]];
    const tipos = [...new Set(ns.map(function(n){ return pecas[n].tipo; }))];
    const msg = ns.length === 1 ? "pe\u00e7a solta no ar: " + p.tipo
      : ns.length + " pe\u00e7as soltas no ar, encostadas s\u00f3 entre si: " + tipos.slice(0, 4).join(", ") + (tipos.length > 4 ? "..." : "");
    out.push(problema("aviso", nome, Math.floor(p.x), Math.floor(p.y), msg, lugar(p, {pecas: ns.map(function(n){ return pecas[n].id; })})));
  });
  return out;
}

/* O mesmo problema em muitos lugares vira um so, com a lista dos lugares:
   clicar nele de novo vai para o proximo. Erro vem antes de aviso; dentro
   do nivel, a ordem em que foram achados. */
function juntarRepetidos(lista){
  const out = [], porChave = new Map();
  for (const p of lista){
    const k = p.nivel + "\n" + p.mapa + "\n" + p.msg;
    const j = porChave.get(k);
    if (j === undefined){
      /* o problema que ja vem com os lugares -- o chao ilhado, com os
         pedacos -- fica com eles */
      const novo = Object.assign({vezes: 1, lugares: [lugarDe(p)]}, p);
      porChave.set(k, out.length); out.push(novo);
    } else {
      const q = out[j];
      q.vezes += p.vezes || 1;
      for (const l of p.lugares || [lugarDe(p)]) if (q.lugares.length < LUGARES_MAX) q.lugares.push(l);
    }
  }
  return out.filter(function(p){ return p.nivel === "erro"; }).concat(out.filter(function(p){ return p.nivel !== "erro"; }));
}
function lugarDe(p){
  const l = {x: p.x, y: p.y};
  if (p.z !== undefined) l.z = p.z;
  if (p.peca !== undefined) l.peca = p.peca;
  return l;
}
function contarNiveis(lista){
  let erros = 0, avisos = 0;
  for (const p of lista) if (p.nivel === "erro") erros += p.vezes || 1; else avisos += p.vezes || 1;
  return {erros: erros, avisos: avisos};
}
/* uma linha de texto, para a linha de comando e para o teste */
function textoDoProblema(p){
  return (p.nivel === "erro" ? "ERRO " : "aviso ") + p.mapa + (p.x >= 0 ? " (" + p.x + "," + p.y + ")" : "") + " " + p.msg +
         (p.vezes > 1 ? " [" + p.vezes + " lugares]" : "");
}

if (typeof module !== "undefined") module.exports = {
  MAPAS_SEM_ARQUIVO, nomeDoMapa, destinoDoMarco, validarConjunto, problemasDasLigacoes, problemasDosMoradores,
  problemasDePecas, caixaDaPeca, chaoDoTile, juntarRepetidos, contarNiveis, textoDoProblema
};
