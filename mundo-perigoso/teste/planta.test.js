/* Testes da planta do canteiro: a vista de cima em pixels, a mesma cor do
   macro, o PNG da linha de comando.

   Uso: node mundo-perigoso/teste/planta.test.js */
const M = require("../src/mapa.js");
const Pl = require("../canteiro/planta.js");
const PNG = require("../editor/png.js");
const { placar } = require("./harness");
const { check, fim } = placar();

const m = M.novoMapa(20, 12, {nome: "planta", terreno: M.TERRENO_POR_CHAR[","], altura: 4});
m.mar = 4;
for (let y = 0; y < 12; y++) m.terreno[y*20] = M.TERRENOS.findIndex(t => t.id === "funda");
m.altura[5*20 + 10] = 8;                                        // um degrau alto: penhasco
m.pecas.push({tipo: "parede", x: 14, y: 8, z: 1, giro: 0, id: 1});
m.coisas.push({x: 3, y: 3, tipo: "npc", texto: "Tobias"});
const E = 4, p = Pl.planta(m, {escala: E});
const cor = function(x, y){ const o = (y*p.w + x)*4; return [p.rgba[o], p.rgba[o+1], p.rgba[o+2], p.rgba[o+3]]; };
const igual = function(a, b){ return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; };

check("a planta tem o tamanho do mapa vezes a escala", p.w === 80 && p.h === 48 && p.rgba.length === 80*48*4);
check("todo pixel e opaco", (function(){ for (let i = 3; i < p.rgba.length; i += 4) if (p.rgba[i] !== 255) return false; return true; })());
check("o tile de agua tem a cor que o macro pinta", igual(cor(1, 6), Pl.corDoTile(m, 6*20)));
check("a encosta virada para oeste acende, a de leste apaga",
  Pl.corDoTile(m, 5*20 + 10)[1] > Pl.corDoTile(m, 5*20 + 9)[1] && Pl.corDoTile(m, 5*20 + 11)[1] < Pl.corDoTile(m, 5*20 + 12)[1]);
check("o penhasco sai em vermelho na borda do tile", cor(10*E, 5*E + 1)[0] > 200 && cor(10*E, 5*E + 1)[1] < 150, cor(10*E, 5*E + 1).join(","));
const meio = cor(Math.floor(14.5*E), 8*E);
check("a parede aparece em planta, dourada", meio[0] > meio[2] + 40 && !igual(meio, Pl.corDoTile(m, 8*20 + 14)), meio.join(","));
check("o morador e um ponto da cor dele", igual(cor(Math.floor(3.5*E), Math.floor(3.5*E)), [0xf2, 0xd4, 0x5c]));
m.regiao = new Uint16Array(20*12); m.regiao[2*20 + 2] = 3;
check("a regiao tinge o tile so quando se pede", !igual(Pl.corDoTile(m, 2*20 + 2, {regiao: true}), Pl.corDoTile(m, 2*20 + 2)));
const q = Pl.planta(m, {escala: E, problemas: [{nivel: "erro", x: 16, y: 2, msg: "x"}]});
check("o problema ganha um quadrado vermelho em volta", (function(){
  const o = ((2*E + E/2 - E)*q.w + (16*E + E/2))*4; return q.rgba[o] === 255 && q.rgba[o+1] === 40; })());
const a = PNG.codificar(p.w, p.h, p.rgba), b = PNG.codificar(p.w, p.h, Pl.planta(m, {escala: E}).rgba);
check("a mesma planta da o mesmo PNG, byte a byte", Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0 && a.length > 100);

fim();
