/* ============================================================
   OS SOLIDOS
   ------------------------------------------------------------
   O corpo das pecas para a fisica: prismas convexos -- um poligono no chao,
   de z0 a z1, com o topo reto ou inclinado (rampa, escada, agua de
   telhado). Ficam guardados por tile, num mapa esparso: a ilha tem 422 mil
   tiles e quase nenhum tem peca.

   A fisica pergunta tres coisas, sempre com a altura de agora junto:

     bate(x, y, r, z, altura)   o corpo cabe aqui?
     chaoSob(x, y, r, z)        o topo mais alto que da para pisar
     tetoSobre(x, y, r, z)      o fundo mais baixo acima da cabeca

   E a altura junto que faz varios andares funcionarem: embaixo da ponte o
   chao e a estrada, em cima e o tabuado, e a mesma pergunta responde as
   duas coisas conforme quem pergunta esta em cima ou embaixo.

   Medido: 0,32 us para "bate?" e 0,21 us para "que chao?" numa fortaleza de
   416 solidos, uns 0,04 ms por passo de fisica com o jogador e 30
   criaturas.

   Puro: o motor usa, o canteiro usa para validar, e o teste roda no node.
   ============================================================ */
/* A porta, a janela e a grade fechadas sao solido de porta: barram o corpo
   no jogo. A conta de quem alcanca o que -- a grade de andar, a validacao,
   a regua do canteiro -- passa por elas, porque no jogo elas abrem: e o que
   `abertas` liga, enquanto a conta roda (comPortasAbertas, no canteiro). */
const PORTAS_DAS_PECAS = {abertas: false};
function novoIndiceDeSolidos(){
  return {porTile: new Map(), lista: [], visto: [], marca: 0};
}
function porNoIndice(ind, s, dono){
  s.id = ind.lista.length;
  s.dono = dono === undefined ? -1 : dono;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of s.pts){
    if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
  }
  s.caixa = [x0, y0, x1, y1];
  ind.lista.push(s);
  ind.visto.push(0);
  for (let ty = Math.floor(y0); ty <= Math.floor(y1); ty++)
    for (let tx = Math.floor(x0); tx <= Math.floor(x1); tx++){
      const k = ty*100000 + tx;
      let l = ind.porTile.get(k);
      if (!l){ l = []; ind.porTile.set(k, l); }
      l.push(s);
    }
  return s;
}
/* o topo no ponto: inclinado, preso entre o fundo e o alto do solido */
function topoDoSolido(s, x, y){
  if (!s.topo) return s.z1;
  const z = s.topo.a + s.topo.b*x + s.topo.c*y;
  return z < s.z0 ? s.z0 : (z > s.z1 ? s.z1 : z);
}
/* o topo perto de um ponto que pode estar fora do solido -- para a pergunta
   do chao valer na beirada da rampa */
function topoPerto(s, x, y){
  const c = s.caixa;
  return topoDoSolido(s, x < c[0] ? c[0] : (x > c[2] ? c[2] : x), y < c[1] ? c[1] : (y > c[3] ? c[3] : y));
}
/* circulo contra poligono convexo: dentro dele, ou a menos de r de uma
   aresta. Os cantos vem no sentido anti-horario. */
function circuloToca(s, x, y, r){
  const c = s.caixa;
  if (x + r < c[0] || x - r > c[2] || y + r < c[1] || y - r > c[3]) return false;
  const p = s.pts, n = p.length;
  let dentro = true;
  for (let i = 0; i < n; i++){
    const a = p[i], b = p[(i + 1) % n];
    if ((b[0] - a[0])*(y - a[1]) - (b[1] - a[1])*(x - a[0]) < 0){ dentro = false; break; }
  }
  if (dentro) return true;
  for (let i = 0; i < n; i++){
    const a = p[i], b = p[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1];
    const L = ex*ex + ey*ey;
    let t = L > 0 ? ((x - a[0])*ex + (y - a[1])*ey)/L : 0;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    const dx = x - a[0] - ex*t, dy = y - a[1] - ey*t;
    if (dx*dx + dy*dy < r*r) return true;
  }
  return false;
}
/* Roda `fn` uma vez por solido que o circulo alcanca. */
function cadaSolido(ind, x, y, r, fn){
  if (!ind.lista.length) return;
  ind.marca++;
  const m = ind.marca, visto = ind.visto;
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++)
    for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++){
      const l = ind.porTile.get(ty*100000 + tx);
      if (!l) continue;
      for (let i = 0; i < l.length; i++){
        const s = l[i];
        if (visto[s.id] === m) continue;
        visto[s.id] = m;
        if (s.porta && PORTAS_DAS_PECAS.abertas) continue;
        if (circuloToca(s, x, y, r)) fn(s);
      }
    }
}
/* Bate? O solido barra quando o topo dele passa do degrau que se sobe
   andando e o fundo dele esta abaixo da cabeca. */
function solidosBatem(ind, x, y, r, z, altura, degrau){
  let bate = false;
  cadaSolido(ind, x, y, r, function(s){
    if (bate) return;
    if (s.z0 >= z + altura) return;
    if (topoPerto(s, x, y) > z + degrau) bate = true;
  });
  return bate;
}
/* O topo mais alto onde da para pisar estando em z. */
function chaoDosSolidos(ind, x, y, r, z, degrau){
  let melhor = -Infinity;
  cadaSolido(ind, x, y, r, function(s){
    const t = topoPerto(s, x, y);
    if (t <= z + degrau && t > melhor) melhor = t;
  });
  return melhor;
}
/* O fundo mais baixo que esta acima da cabeca. */
function tetoDosSolidos(ind, x, y, r, z){
  let melhor = Infinity;
  cadaSolido(ind, x, y, r, function(s){
    if (s.z0 >= z - 1e-6 && s.z0 < melhor) melhor = s.z0;
  });
  return melhor;
}
/* Um ponto dentro de solido: e o que o tiro e a camera perguntam. */
function pontoNoSolido(ind, x, y, z){
  let dentro = false;
  cadaSolido(ind, x, y, 0.001, function(s){
    if (!dentro && z >= s.z0 && z <= topoDoSolido(s, x, y)) dentro = true;
  });
  return dentro;
}

if (typeof module !== "undefined") module.exports = {
  novoIndiceDeSolidos, porNoIndice, topoDoSolido, topoPerto, circuloToca, cadaSolido,
  solidosBatem, chaoDosSolidos, tetoDosSolidos, pontoNoSolido, PORTAS_DAS_PECAS
};
