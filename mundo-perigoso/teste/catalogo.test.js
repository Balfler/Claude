/* Testes do catalogo de pecas.

   Todo tipo, em todo estilo, girado e espelhado, tem que sair com geometria
   que o motor aceita: faces planas e convexas de ate 8 cantos, solidos
   convexos no sentido anti-horario, materiais que existem. Um tipo novo que
   quebre isso aparece aqui, e nao como um buraco no telhado de alguem.

   No fim, com o motor montado: a miniatura de cada tipo sai desenhada pelo
   proprio motor, sem mexer no mundo aberto.

   Uso: node mundo-perigoso/teste/catalogo.test.js [caminho-do-html] */
const path = require("path");
const Pc = require("../src/pecas.js");
const E = require("../src/estilos.js");
const { carregar, placar } = require("./harness");
const { check, fim } = placar();

const tipos = Object.keys(Pc.TIPOS_DE_PECA), estilos = Object.keys(Pc.ESTILOS);

/* ---------- o catalogo pedido esta todo aqui ---------- */
const PEDIDO = {
  casa: ["parede", "meia-parede", "parede-janela", "parede-veneziana", "parede-porta", "porta", "arco",
         "canto-fora", "canto-dentro", "fim-de-parede", "pilar", "coluna", "piso", "laje", "forro", "degrau",
         "escada", "escada-caracol", "guarda-corpo", "sacada", "telhado-agua", "telhado-beiral",
         "telhado-cumeeira", "telhado-espigao", "telhado-empena", "chamine"],
  castelo: ["muralha", "ameias", "muralha-adarve", "seteira", "portao", "grade-levadica", "ponte-levadica",
            "torre-quadrada", "torre-redonda", "guarita", "escada-muralha"],
  dungeon: ["nicho", "sarcofago", "estalagmite"],
  natureza: ["rocha-pequena", "rocha", "rocha-grande", "penhasco", "laje-de-pedra"],
  infra: ["rampa", "pier", "cais", "ponte", "ponte-arco", "muro", "cerca", "portao-cerca", "poco", "fonte"],
  interior: ["mesa", "cadeira", "cama", "estante", "balcao", "lareira", "bau", "barril", "altar"],
  luz: ["tocha", "lampiao", "vela", "braseiro"]
};
for (const cat in PEDIDO){
  const falta = PEDIDO[cat].filter(function(t){ return !Pc.TIPOS_DE_PECA[t] || Pc.TIPOS_DE_PECA[t].categoria !== cat; });
  check("o catalogo tem tudo de " + cat + " (" + PEDIDO[cat].length + ")", falta.length === 0, "falta: " + falta.join(", "));
}
check("todo tipo tem nome, categoria conhecida e tamanho",
  tipos.every(function(t){
    const d = Pc.TIPOS_DE_PECA[t];
    return d.nome && Pc.CATEGORIAS_DE_PECA.indexOf(d.categoria) >= 0 && (typeof d.tamanho === "function" || d.tamanho.length === 2);
  }));
check("toda luz diz a cor, o raio e o tremor dela",
  tipos.filter(function(t){ return Pc.TIPOS_DE_PECA[t].categoria === "luz"; })
       .every(function(t){ const l = Pc.TIPOS_DE_PECA[t].luz; return l && /^#[0-9a-f]{6}$/.test(l.cor) && l.raio > 0 && l.tremor >= 0; }));
check("todo tipo que sobe diz onde se sai la em cima",
  tipos.filter(function(t){ return Pc.TIPOS_DE_PECA[t].andar === "sobe"; })
       .every(function(t){ return typeof Pc.TIPOS_DE_PECA[t].saida === "function"; }));

/* ---------- a geometria de todo tipo em todo estilo ---------- */
function normal(pts){
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++){
    const a = pts[i], b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1])*(a[2] + b[2]); ny += (a[2] - b[2])*(a[0] + b[0]); nz += (a[0] - b[0])*(a[1] + b[1]);
  }
  return [nx, ny, nz];
}
/* o problema da face, ou "" se ela serve */
function problemaDaFace(f){
  const p = f.pts;
  if (p.length < 3 || p.length > 8) return p.length + " cantos";
  const n = normal(p), L = Math.hypot(n[0], n[1], n[2]);
  if (L < 1e-9) return "sem area";
  const u = [n[0]/L, n[1]/L, n[2]/L], d = u[0]*p[0][0] + u[1]*p[0][1] + u[2]*p[0][2];
  for (const q of p) if (Math.abs(u[0]*q[0] + u[1]*q[1] + u[2]*q[2] - d) > 1e-5) return "torta";
  /* convexa: toda quina vira para o mesmo lado da normal */
  for (let i = 0; i < p.length; i++){
    const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length];
    const e1 = [b[0]-a[0], b[1]-a[1], b[2]-a[2]], e2 = [c[0]-b[0], c[1]-b[1], c[2]-b[2]];
    const cr = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]];
    if (cr[0]*u[0] + cr[1]*u[1] + cr[2]*u[2] < -1e-9) return "concava";
  }
  if (!f.uv || f.uv.length !== p.length) return "sem textura em algum canto";
  if (E.MATERIAIS_DO_ESTILO.indexOf(f.mat) < 0 && !E.MATERIAIS_UNIVERSAIS[f.mat] && !E.MATERIAIS_DERIVADOS[f.mat]) return "material " + f.mat;
  return "";
}
function problemaDoSolido(s){
  const p = s.pts;
  if (p.length < 3) return "poligono de " + p.length;
  if (!(s.z1 > s.z0)) return "sem altura";
  let area = 0;
  for (let i = 0; i < p.length; i++){
    const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length];
    area += a[0]*b[1] - b[0]*a[1];
    if ((b[0]-a[0])*(c[1]-b[1]) - (b[1]-a[1])*(c[0]-b[0]) < -1e-9) return "nao convexo ou no sentido horario";
  }
  if (area <= 1e-9) return "no sentido horario";
  if (s.topo && !(isFinite(s.topo.a) && isFinite(s.topo.b) && isFinite(s.topo.c))) return "topo quebrado";
  return "";
}
{
  const ruins = [];
  let feitas = 0;
  for (const t of tipos) for (const est of estilos){
    const giros = Pc.TIPOS_DE_PECA[t].diagonal ? [0, 45, 90, 180, 270] : [0, 90, 180, 270];
    for (const giro of giros) for (const espelho of [0, 1]){
      const inst = {tipo: t, estilo: est, x: 20.25, y: 30.5, z: 1.25, giro: giro, espelho: espelho};
      const g = Pc.geometriaDaPeca(inst);
      feitas++;
      if (!g || !g.faces.length){ ruins.push(t + " sem geometria"); continue; }
      for (const f of g.faces){ const r = problemaDaFace(f); if (r){ ruins.push(t + "/" + est + "/" + giro + (espelho ? "e" : "") + ": face " + r); break; } }
      for (const s of g.solidos){ const r = problemaDoSolido(s); if (r){ ruins.push(t + "/" + est + "/" + giro + (espelho ? "e" : "") + ": solido " + r); break; } }
      for (const k of g.encaixes) if (!k.em.every(isFinite)){ ruins.push(t + ": encaixe sem lugar"); break; }
    }
  }
  check("todo tipo, em todo estilo, girado e espelhado, sai com face e solido que o motor aceita (" + feitas + " pecas)",
    ruins.length === 0, ruins.slice(0, 6).join("; ") + (ruins.length > 6 ? " ... e mais " + (ruins.length - 6) : ""));
}
{
  /* a mesma peca no mesmo lugar sai igual -- a rocha sorteia pelo lugar */
  const a = JSON.stringify(Pc.geometriaDaPeca({tipo: "rocha", x: 5, y: 7, z: 1, giro: 0}));
  const b = JSON.stringify(Pc.geometriaDaPeca({tipo: "rocha", x: 5, y: 7, z: 1, giro: 0}));
  const c = JSON.stringify(Pc.geometriaDaPeca({tipo: "rocha", x: 6, y: 7, z: 1, giro: 0}));
  check("a mesma peca no mesmo lugar sai igual, e a rocha do lado sai diferente", a === b && a !== c);
}
{
  /* o estilo muda a espessura e a altura da parede, e a forma acompanha */
  const casa = Pc.geometriaDaPeca({tipo: "parede", estilo: "madeira-pescador", x: 0, y: 0, z: 0, giro: 0});
  const forte = Pc.geometriaDaPeca({tipo: "parede", estilo: "fortaleza-humana", x: 0, y: 0, z: 0, giro: 0});
  const esp = function(g){ const s = g.solidos[0]; return Math.max.apply(null, s.pts.map(function(p){ return p[1]; })) - Math.min.apply(null, s.pts.map(function(p){ return p[1]; })); };
  check("a parede de fortaleza sai grossa (0,5) e a de casa fina (0,125)",
    Math.abs(esp(forte) - 0.5) < 1e-9 && Math.abs(esp(casa) - 0.125) < 1e-9);
}
{
  /* os encaixes saem das formas: a ponta da parede e onde a proxima comeca */
  const g = Pc.geometriaDaPeca({tipo: "parede", x: 3, y: 4, z: 1, giro: 90});
  const pontas = g.encaixes.filter(function(k){ return k.tipo === "ponta"; }).map(function(k){ return k.em.map(function(v){ return +v.toFixed(6); }).join(","); });
  check("a parede girada tem as pontas onde ela comeca e acaba", pontas.indexOf("3,4,1") >= 0 && pontas.indexOf("3,5,1") >= 0, pontas.join(" | "));
  const esc = Pc.geometriaDaPeca({tipo: "escada", x: 0, y: 0, z: 0, giro: 0});
  const topo = esc.encaixes.find(function(k){ return k.tipo === "topo"; });
  check("a escada diz onde e o alto dela", topo && Math.abs(topo.em[2] - Pc.ANDAR) < 1e-9);
}
{
  /* a grade levadica erguida nao barra */
  const baixa = Pc.geometriaDaPeca({tipo: "grade-levadica", x: 0, y: 0, z: 0, giro: 0});
  const erguida = Pc.geometriaDaPeca({tipo: "grade-levadica", x: 0, y: 0, z: 0, giro: 0, campos: {aberta: "1"}});
  check("a grade levadica descida barra, e erguida (aberta=1) nao", baixa.solidos.length > 0 && erguida.solidos.length === 0);
}

/* ---------- a miniatura, pelo motor ---------- */
{
  const arquivo = process.argv[2] || path.join(__dirname, "..", "..", "cripta-vhalgorn.html");
  const { D, frames } = carregar(arquivo, {busca: "?mapa=cripta"});
  D.G.mode = "play";
  frames(2);
  const antes = Uint32Array.from(D.buf);
  const vazias = [];
  for (const t of tipos){
    const px = D.miniaturaDaPeca(t, "madeira-pescador", 48);
    let cheios = 0;
    if (px) for (const v of px) if (v) cheios++;
    if (cheios < 40) vazias.push(t + " (" + cheios + ")");
  }
  check("toda peca sai na miniatura desenhada pelo motor", vazias.length === 0, vazias.join(", "));
  check("assar a miniatura nao mexe na tela do jogo", D.buf.length === antes.length && D.buf.every(function(v, i){ return v === antes[i]; }));
  frames(1);
  check("e o jogo continua desenhando depois", D.nQuads() > 0 && D.RW === antes.length/D.buf.length*D.RW);
  const a = D.miniaturaDaPeca("torre-redonda", "fortaleza-humana", 48), b = D.miniaturaDaPeca("torre-redonda", "fortaleza-humana", 48);
  check("a miniatura sai igual toda vez", a.every(function(v, i){ return v === b[i]; }));
}

fim();
