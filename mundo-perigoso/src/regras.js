/* ============================================================
   AS REGRAS DO PERSONAGEM
   ------------------------------------------------------------
   Atributos, o disco de pericias, as especializacoes e suas arvores, as
   fatias caidas, a curva de experiencia, a morte e o mago da memoria. Tudo
   que da numero ao personagem mora aqui: o simulador de build le este
   arquivo hoje, e o jogo vai ler o mesmo arquivo quando o personagem
   existir.

   Puro, sem DOM, como o formato de mapa.

   O que isto implementa, do DESIGN.md:
   - Sem classe fixa. Duas moedas por nivel: atributo e habilidade.
   - Atributo sobe cada vez mais caro, e nenhum decide se o golpe acerta.
   - Uma arvore so, em disco. Todo mundo comeca no centro, e cada ponto
     compra um no encostado num que o personagem ja tem. O custo e o
     caminho.
   - Seis fatias alternando marcial e magica. Toda combinacao de duas
     fatias tem uma especializacao, as de tres tambem existem, e o
     personagem carrega uma so.
   - Cada especializacao abre uma arvore propria, por fora do disco. Entra-se
     nela pela ponta do ramo que da para a outra fatia.
   - Uma fatia pode cair numa traicao: o necromante toma o lugar do clerigo
     no disco, e as combinacoes mudam junto.
   - Curva do Tibia. Morrer custa 5%, o mago da memoria 3% e ouro que
     dobra a cada uso.

   Nomes, efeitos e exigencias das pericias sao a proposta do DESIGN, para
   testar o formato do disco. Nao sao o equilibrio final.
   ============================================================ */
const REGRAS = {
  nivelMax: 100,
  atributoInicial: 5,
  atributoMax: 60,
  pontosCriacao: 10,
  pontosAtributoPorNivel: 3,
  pontosHabilidadeCriacao: 1,
  pontosHabilidadePorNivel: 1,

  morte: 0.05,
  mago: 0.03,
  /* ouro do mago em minutos de caca no nivel de quem paga: a economia
     ainda nao existe */
  magoMinutosBase: 20,

  /* o disco */
  tamanhoRamo: 20,
  notaveisEm: [5, 10, 15, 20],
  cruzamentos: [7, 13, 19],        // onde os ramos da mesma fatia se ligam
  pontes: [12],                    // onde a fatia se liga a vizinha
  aberturaRamos: 18,               // graus entre ramos de uma fatia
  exigenciaPorDistancia: [0, 15, 18, 20],
  exigenciaTrio: 15,

  atributos: [
    {id:"FOR", nome:"For\u00e7a",        faz:"dano corpo a corpo e carga; a armadura pesa menos"},
    {id:"AGI", nome:"Agilidade",    faz:"velocidade de movimento e de ataque"},
    {id:"VIT", nome:"Vitalidade",   faz:"vida, f\u00f4lego e regenera\u00e7\u00e3o"},
    {id:"INT", nome:"Intelig\u00eancia", faz:"mana e poder das magias"},
    {id:"DES", nome:"Destreza",     faz:"dano \u00e0 dist\u00e2ncia, alcance e puxar o arco"},
    {id:"SOR", nome:"Sorte",        faz:"chance e dano do cr\u00edtico"}
  ],

  equipamentos: [
    {id:"roupa",  nome:"Roupa",         penalidade:0},
    {id:"couro",  nome:"Couro",         penalidade:0.05},
    {id:"malha",  nome:"Cota de malha", penalidade:0.12},
    {id:"placas", nome:"Placas",        penalidade:0.22}
  ],
  escudo: 0.03
};

/* ---------- as seis fatias ----------
   Na ordem da volta, no sentido do relogio. Os ramos de cada fatia vao do
   lado da fatia anterior para o lado da seguinte: e por isso que a
   armadura do guerreiro fica encostada no clerigo, perto do paladino. */
const FATIAS = [
  {id:"guerreiro", codigo:"G", nome:"Guerreiro", tipo:"marcial",
   entrada:{nome:"Per\u00edcia com armas de corpo a corpo", ef:{danoCorpo:5}},
   ramos:[
     {nome:"Armas", pequeno:{danoCorpo:2}, notaveis:[
       {nome:"Golpe pesado", ef:{danoCorpo:8}}, {nome:"Arma de duas m\u00e3os", ef:{danoCorpo:10}},
       {nome:"Mestre de armas", ef:{danoCorpo:10, critDano:15}}, {nome:"Carnificina", ef:{danoCorpo:20}}]},
     {nome:"Vigor", pequeno:{vida:8}, notaveis:[
       {nome:"F\u00f4lego de soldado", ef:{folego:25}}, {nome:"Pele grossa", ef:{vida:40}},
       {nome:"Segundo f\u00f4lego", ef:{folego:30, vida:20}}, {nome:"Inquebr\u00e1vel", ef:{vida:80}}]},
     {nome:"Armadura", pequeno:{alivio:2}, notaveis:[
       {nome:"Per\u00edcia com escudo", ef:{bloqueio:10}}, {nome:"Armadura pesada", ef:{alivio:12}},
       {nome:"Muralha", ef:{bloqueio:15, vida:40}}, {nome:"A\u00e7o vivo", ef:{alivio:16}}]}
   ]},
  {id:"clerigo", codigo:"C", nome:"Cl\u00e9rigo", tipo:"m\u00e1gica",
   entrada:{nome:"Per\u00edcia com magia sagrada", ef:{poderMagia:3, cura:5}},
   ramos:[
     {nome:"Prote\u00e7\u00e3o", pequeno:{vida:5}, notaveis:[
       {nome:"B\u00ean\u00e7\u00e3o", ef:{vida:25}}, {nome:"Escudo de f\u00e9", ef:{bloqueio:10}},
       {nome:"Aura sagrada", ef:{vida:40}}, {nome:"Santu\u00e1rio", ef:{vida:60, bloqueio:10}}]},
     {nome:"Cura", pequeno:{cura:3}, notaveis:[
       {nome:"M\u00e3os que curam", ef:{cura:10}}, {nome:"Prece", ef:{cura:10, mana:20}},
       {nome:"Milagre", ef:{cura:20}}, {nome:"Ressurrei\u00e7\u00e3o", ef:{cura:25}}]},
     {nome:"Luz", pequeno:{poderMagia:2}, notaveis:[
       {nome:"Luz que queima", ef:{poderMagia:8}}, {nome:"Expulsar mortos", ef:{poderMagia:10}},
       {nome:"Julgamento", ef:{poderMagia:14}}, {nome:"Sol interior", ef:{poderMagia:20}}]}
   ]},
  {id:"ladino", codigo:"L", nome:"Ladino", tipo:"marcial",
   entrada:{nome:"Per\u00edcia com adagas", ef:{danoCorpo:3, critChance:2}},
   ramos:[
     {nome:"Golpes", pequeno:{critDano:3}, notaveis:[
       {nome:"Pelas costas", ef:{critDano:15}}, {nome:"Ponto fraco", ef:{critChance:4}},
       {nome:"L\u00e2mina dupla", ef:{danoCorpo:10}}, {nome:"Golpe fatal", ef:{critDano:30}}]},
     {nome:"Furtividade", pequeno:{critChance:0.5}, notaveis:[
       {nome:"Passos leves", ef:{velocidade:1.5}}, {nome:"Sombra", ef:{critChance:3}},
       {nome:"Sumir", ef:{velocidade:1.5}}, {nome:"Invis\u00edvel", ef:{critChance:5}}]},
     {nome:"Mobilidade", pequeno:{velocidade:0.25}, notaveis:[
       {nome:"Rolamento", ef:{folego:20}}, {nome:"Acrobata", ef:{velocidade:1.5}},
       {nome:"Vento", ef:{velocidade:2, folego:20}}, {nome:"Intoc\u00e1vel", ef:{velocidade:2}}]}
   ]},
  {id:"mago", codigo:"M", nome:"Mago", tipo:"m\u00e1gica",
   entrada:{nome:"Per\u00edcia com magia arcana", ef:{poderMagia:5}},
   ramos:[
     {nome:"Gelo e controle", pequeno:{poderMagia:1, mana:4}, notaveis:[
       {nome:"Raio de gelo", ef:{poderMagia:6}}, {nome:"Prender", ef:{mana:30}},
       {nome:"Nevasca", ef:{poderMagia:10}}, {nome:"Tempo parado", ef:{mana:60}}]},
     {nome:"Fogo", pequeno:{poderMagia:2}, notaveis:[
       {nome:"Bola de fogo", ef:{poderMagia:8}}, {nome:"Chama viva", ef:{poderMagia:8}},
       {nome:"Tempestade de fogo", ef:{poderMagia:12}}, {nome:"Inferno", ef:{poderMagia:18}}]},
     {nome:"Mana", pequeno:{mana:10}, notaveis:[
       {nome:"Concentra\u00e7\u00e3o", ef:{mana:40}}, {nome:"Fonte", ef:{mana:40}},
       {nome:"Palavra r\u00e1pida", ef:{mana:50}}, {nome:"Arquimago", ef:{mana:80, poderMagia:10}}]}
   ]},
  {id:"arqueiro", codigo:"A", nome:"Arqueiro", tipo:"marcial",
   entrada:{nome:"Per\u00edcia com arcos", ef:{danoDistancia:5}},
   ramos:[
     {nome:"Pontaria", pequeno:{puxar:1.5}, notaveis:[
       {nome:"Olho de \u00e1guia", ef:{critChance:3}}, {nome:"Puxada r\u00e1pida", ef:{puxar:8}},
       {nome:"Tiro na cabe\u00e7a", ef:{critDano:25}}, {nome:"Mira perfeita", ef:{critChance:5}}]},
     {nome:"Arcos", pequeno:{danoDistancia:2}, notaveis:[
       {nome:"Tiro firme", ef:{danoDistancia:8}}, {nome:"Flecha dupla", ef:{danoDistancia:10}},
       {nome:"Arco longo", ef:{danoDistancia:12}}, {nome:"Chuva de flechas", ef:{danoDistancia:20}}]},
     {nome:"Mobilidade", pequeno:{velocidade:0.25}, notaveis:[
       {nome:"Atirar correndo", ef:{velocidade:1.5}}, {nome:"Recuo", ef:{folego:20}},
       {nome:"Passo de ca\u00e7ador", ef:{velocidade:2}}, {nome:"Vento nas costas", ef:{velocidade:2}}]}
   ]},
  {id:"druida", codigo:"D", nome:"Druida", tipo:"m\u00e1gica",
   entrada:{nome:"Per\u00edcia com magia da natureza", ef:{poderMagia:3, cura:3}},
   ramos:[
     {nome:"Feras", pequeno:{poderMagia:1, vida:3}, notaveis:[
       {nome:"Companheiro animal", ef:{vida:20}}, {nome:"Matilha", ef:{danoCorpo:8}},
       {nome:"Voz das feras", ef:{poderMagia:8}}, {nome:"Rei da mata", ef:{poderMagia:12, vida:40}}]},
     {nome:"Plantas", pequeno:{cura:2}, notaveis:[
       {nome:"Ra\u00edzes", ef:{poderMagia:6}}, {nome:"Espinhos", ef:{poderMagia:6}},
       {nome:"Seiva", ef:{cura:12}}, {nome:"Floresta viva", ef:{poderMagia:12, cura:12}}]},
     {nome:"Formas", pequeno:{vida:6}, notaveis:[
       {nome:"Forma de lobo", ef:{velocidade:1.5, danoCorpo:6}}, {nome:"Forma de urso", ef:{vida:60}},
       {nome:"Forma de \u00e1guia", ef:{velocidade:2}}, {nome:"Forma primal", ef:{danoCorpo:15, vida:40}}]}
   ]}
];

/* ---------- as fatias caidas ----------
   Numa traicao a fatia inteira troca: o clerigo some e o necromante toma o
   lugar dele no disco, com a mesma forma, e os ramos na mesma ordem -- os
   ossos encostados no guerreiro, onde ficava a protecao, e a maldicao no
   ladino. So o necromante existe por enquanto. */
const CAIDAS = [
  {id:"necromante", codigo:"N", nome:"Necromante", tipo:"m\u00e1gica", substitui:"clerigo",
   entrada:{nome:"Per\u00edcia com magia da morte", ef:{poderMagia:4, vida:10}},
   ramos:[
     {nome:"Ossos", pequeno:{vida:5}, notaveis:[
       {nome:"Armadura de ossos", ef:{vida:25}}, {nome:"Esqueleto servo", ef:{bloqueio:10}},
       {nome:"Muralha de ossos", ef:{vida:40}}, {nome:"Ex\u00e9rcito dos mortos", ef:{vida:60, bloqueio:10}}]},
     {nome:"Drenar", pequeno:{cura:3}, notaveis:[
       {nome:"Toque vampiro", ef:{cura:10}}, {nome:"Beber a alma", ef:{cura:10, mana:20}},
       {nome:"Pacto de sangue", ef:{cura:20}}, {nome:"N\u00e3o morrer", ef:{cura:25}}]},
     {nome:"Maldi\u00e7\u00e3o", pequeno:{poderMagia:2}, notaveis:[
       {nome:"Praga", ef:{poderMagia:8}}, {nome:"Definhar", ef:{poderMagia:10}},
       {nome:"Marca da morte", ef:{poderMagia:14}}, {nome:"Palavra de morte", ef:{poderMagia:20}}]}
   ]}
];

const FATIA_POR_CODIGO = {};
FATIAS.forEach(function(f, i){ FATIA_POR_CODIGO[f.codigo] = i; });
CAIDAS.forEach(function(c){
  FATIAS.forEach(function(f, i){ if (f.id === c.substitui) FATIA_POR_CODIGO[c.codigo] = i; });
});

function distanciaFatias(a, b){
  const n = FATIAS.length, d = Math.abs(a - b) % n;
  return Math.min(d, n - d);
}
function somaEfeitos(lista, fator){
  const s = {};
  for (const ef of lista) for (const k in ef) s[k] = (s[k] || 0) + ef[k];
  for (const k in s) s[k] = Math.round(s[k] * fator * 2) / 2;
  return s;
}
function minuscula(texto){ return texto.charAt(0).toLowerCase() + texto.slice(1); }

/* ---------- o disco gerado ----------
   anel 0 e o centro, anel 1 as entradas, e o no p de um ramo fica no anel
   p + 1. O angulo e em graus, com a fatia 0 embaixo. A tela so converte
   isso em pixels. */
function montarDisco(fatias){
  const R = REGRAS, nos = [], viz = {}, porId = {};
  const add = function(no){ nos.push(no); viz[no.id] = []; porId[no.id] = no; };
  const liga = function(a, b){ viz[a].push(b); viz[b].push(a); };
  const idRamo = function(cod, b, p){ return cod + b + "-" + p; };

  add({id:"centro", fatia:-1, ramo:-1, pos:0, anel:0, angulo:0, nome:"Centro", ef:{}, tipo:"centro"});
  fatias.forEach(function(f, i){
    const ang = 90 + i * 60;
    add({id:f.codigo, fatia:i, ramo:-1, pos:0, anel:1, angulo:ang,
         nome:f.entrada.nome, ef:f.entrada.ef, tipo:"entrada"});
    liga("centro", f.codigo);
    f.ramos.forEach(function(r, b){
      for (let p=1; p<=R.tamanhoRamo; p++){
        const k = R.notaveisEm.indexOf(p);
        const id = idRamo(f.codigo, b, p);
        add({id:id, fatia:i, ramo:b, pos:p, anel:p + 1, angulo:ang + (b - 1) * R.aberturaRamos,
             nome: k >= 0 ? r.notaveis[k].nome : r.nome, ef: k >= 0 ? r.notaveis[k].ef : r.pequeno,
             tipo: k >= 0 ? "notavel" : "pequeno", ramoNome:r.nome});
        liga(id, p === 1 ? f.codigo : idRamo(f.codigo, b, p - 1));
      }
    });
    for (const p of R.cruzamentos)
      for (let b=0; b<2; b++) liga(idRamo(f.codigo, b, p), idRamo(f.codigo, b + 1, p));
  });
  fatias.forEach(function(f, i){
    const g = fatias[(i + 1) % fatias.length];
    for (const p of R.pontes) liga(idRamo(f.codigo, 2, p), idRamo(g.codigo, 0, p));
  });
  return {nos:nos, viz:viz, porId:porId, arvores:{}};
}

/* ---------- especializacoes ----------
   Uma por par de fatias e uma por trio. Os pares das fatias caidas ficam na
   mesma lista, com a especializacao que eles espelham; cada mundo pega os
   pares cujas duas fatias ele tem. O efeito de uma especializacao e a soma
   das entradas das fatias -- num trio, dois tercos disso. */
const PARES = [
  ["guerreiro","clerigo","paladino","Paladino"],
  ["clerigo","ladino","inquisidor","Inquisidor"],
  ["ladino","mago","ilusionista","Ilusionista"],
  ["mago","arqueiro","arqueiro-arcano","Arqueiro arcano"],
  ["arqueiro","druida","patrulheiro","Patrulheiro"],
  ["druida","guerreiro","metamorfo","Metamorfo"],
  ["guerreiro","ladino","duelista","Duelista"],
  ["clerigo","mago","teurgo","Teurgo"],
  ["ladino","arqueiro","franco-atirador","Franco-atirador"],
  ["mago","druida","elementalista","Elementalista"],
  ["arqueiro","guerreiro","sentinela","Sentinela"],
  ["druida","clerigo","xama","Xam\u00e3"],
  ["guerreiro","mago","guerreiro-mistico","Guerreiro m\u00edstico"],
  ["clerigo","arqueiro","cacador-de-demonios","Ca\u00e7ador de dem\u00f4nios"],
  ["ladino","druida","espreitador","Espreitador"],
  ["guerreiro","necromante","cavaleiro-da-morte","Cavaleiro da morte","paladino"],
  ["necromante","ladino","carrasco","Carrasco","inquisidor"],
  ["necromante","mago","lich","Lich","teurgo"],
  ["necromante","arqueiro","cacador-de-almas","Ca\u00e7ador de almas","cacador-de-demonios"],
  ["druida","necromante","semeador-da-praga","Semeador da praga","xama"]
];
function montarEspecializacoes(fatias){
  const R = REGRAS, lista = [];
  const idx = function(id){ for (let i=0; i<fatias.length; i++) if (fatias[i].id === id) return i; return -1; };
  for (const p of PARES){
    const a = idx(p[0]), b = idx(p[1]);
    if (a < 0 || b < 0) continue;
    const d = distanciaFatias(a, b);
    lista.push({id:p[2], nome:p[3], tipo:"par", fatias:[a, b], distancia:d, espelha:p[4] || null,
                exige:R.exigenciaPorDistancia[d],
                ef:somaEfeitos([fatias[a].entrada.ef, fatias[b].entrada.ef], 1)});
  }
  for (let a=0; a<6; a++) for (let b=a+1; b<6; b++) for (let c=b+1; c<6; c++){
    const fs = [a, b, c];
    lista.push({id:"trio-" + fs.map(function(i){ return fatias[i].codigo.toLowerCase(); }).join(""),
                nome: fatias[a].nome + ", " + fatias[b].nome + " e " + fatias[c].nome,
                tipo:"trio", semNome:true, fatias:fs, distancia:0, espelha:null, exige:R.exigenciaTrio,
                ef:somaEfeitos(fs.map(function(i){ return fatias[i].entrada.ef; }), 2/3)});
  }
  return lista;
}

/* ---------- a arvore propria ----------
   Cada especializacao abre uma arvore desenhada por fora do disco, no arco
   entre as fatias dela pelo lado mais curto. Todas tem a mesma forma:

     porta        uma em cada fatia, na ponta do ramo que da para a outra.
                  O trio tem uma terceira, na ponta do ramo do meio da fatia
                  do meio
     coracao      o no com o nome da especializacao, ligado a todas as portas
     trilha e     um galho para fora de cada porta das pontas, com o sabor
     heranca      daquela fatia
     trilha e     um galho para fora do coracao, que termina a arvore
     maestria

   Um par tem 9 nos e um trio 10. Pisar na arvore pede a especializacao
   aberta e a ponta de um ramo das portas ja comprada; dentro dela vale a
   regra do disco, cada no encostado num comprado. Os ids seguem a ordem da
   lista abaixo: +paladino-1 e a primeira porta. */
const ANEIS_ARVORE = {porta:23, meio:25, fora:27, fim:29};
function montarArvore(esp, fatias, disco){
  const R = REGRAS, T = R.tamanhoRamo;
  const ang = function(i){ return 90 + i * 60; };
  let A, B, Mf = -1, dir = 1, angA, angB, angM = 0;
  if (esp.fatias.length === 2){
    A = esp.fatias[0]; B = esp.fatias[1];
    let delta = ((ang(B) - ang(A)) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;
    dir = delta > 0 ? 1 : -1;
    angA = ang(A); angB = angA + delta;
  } else {
    /* o trio fica no menor arco que cobre as tres fatias: comeca logo depois
       do maior vao entre elas */
    const f = esp.fatias.slice().sort(function(x, y){ return x - y; });
    const vaos = [f[1] - f[0], f[2] - f[1], f[0] + 6 - f[2]];
    let j = 2;
    if (vaos[0] > vaos[j]) j = 0;
    if (vaos[1] > vaos[j]) j = 1;
    const ordem = j === 2 ? [f[0], f[1], f[2]] : j === 0 ? [f[1], f[2], f[0]] : [f[2], f[0], f[1]];
    A = ordem[0]; Mf = ordem[1]; B = ordem[2];
    angA = ang(A);
    angM = angA + ((Mf - A + 6) % 6) * 60;
    angB = angA + ((B - A + 6) % 6) * 60;
  }
  const centro = (angA + angB) / 2;
  const pontaA = fatias[A].codigo + (dir > 0 ? 2 : 0) + "-" + T;
  const pontaB = fatias[B].codigo + (dir > 0 ? 0 : 2) + "-" + T;
  const tipA = angA + dir * R.aberturaRamos, tipB = angB - dir * R.aberturaRamos;
  const daEsp = esp.semNome ? "das tr\u00eas fatias" : "do " + minuscula(esp.nome);
  const daFatia = function(i){ return "do " + minuscula(fatias[i].nome); };
  const entrada = function(i, fator){ return somaEfeitos([fatias[i].entrada.ef], fator); };

  const lista = [
    {tipo:"porta",   anel:"porta", angulo:tipA,          nome:"Caminho " + daFatia(A),       ef:entrada(A, 1),   ponta:pontaA},
    {tipo:"notavel", anel:"meio",  angulo:centro,        nome:"Cora\u00e7\u00e3o " + daEsp,  ef:esp.ef},
    {tipo:"pequeno", anel:"meio",  angulo:tipA - dir*8,  nome:"Trilha " + daFatia(A),        ef:entrada(A, 0.5)},
    {tipo:"notavel", anel:"fora",  angulo:tipA - dir*14, nome:"Heran\u00e7a " + daFatia(A),  ef:entrada(A, 2)},
    {tipo:"pequeno", anel:"fora",  angulo:centro,        nome:"Trilha " + daEsp,             ef:somaEfeitos([esp.ef], 0.5)},
    {tipo:"notavel", anel:"fim",   angulo:centro,        nome:"Maestria " + daEsp,           ef:somaEfeitos([esp.ef], 2)},
    {tipo:"porta",   anel:"porta", angulo:tipB,          nome:"Caminho " + daFatia(B),       ef:entrada(B, 1),   ponta:pontaB},
    {tipo:"pequeno", anel:"meio",  angulo:tipB + dir*8,  nome:"Trilha " + daFatia(B),        ef:entrada(B, 0.5)},
    {tipo:"notavel", anel:"fora",  angulo:tipB + dir*14, nome:"Heran\u00e7a " + daFatia(B),  ef:entrada(B, 2)}
  ];
  const ligacoes = [[1,"ponta"], [1,2], [1,3], [3,4], [2,5], [5,6], [7,"ponta"], [7,2], [7,8], [8,9]];
  if (Mf >= 0){
    lista.push({tipo:"porta", anel:"porta", angulo:angM, nome:"Caminho " + daFatia(Mf),
                ef:entrada(Mf, 1), ponta:fatias[Mf].codigo + "1-" + T});
    ligacoes.push([10,"ponta"], [10,2]);
  }

  const nos = lista.map(function(n, k){
    return {id:idPericiaUnica(esp.id, k + 1), esp:esp.id, k:k + 1, fatia:-1, ramo:-1, pos:0,
            anel:ANEIS_ARVORE[n.anel], angulo:n.angulo, tipo:n.tipo, nome:n.nome, ef:n.ef,
            ponta:n.ponta || null};
  });
  for (const n of nos){ disco.porId[n.id] = n; disco.viz[n.id] = []; }
  for (const l of ligacoes){
    const a = nos[l[0] - 1];
    const b = l[1] === "ponta" ? a.ponta : nos[l[1] - 1].id;
    disco.viz[a.id].push(b); disco.viz[b].push(a.id);
  }
  disco.arvores[esp.id] = nos;
}

/* ---------- o mundo ----------
   O disco, as especializacoes e as arvores dependem de quais fatias cairam.
   Cada combinacao e montada uma vez e guardada. mundo() sem nada e o mundo
   de antes de qualquer traicao. */
const MUNDOS = {};
function mundo(caidas){
  const lista = CAIDAS.filter(function(c){ return (caidas || []).indexOf(c.id) >= 0; })
                      .map(function(c){ return c.id; });
  const chave = lista.join(" ");
  if (MUNDOS[chave]) return MUNDOS[chave];
  const fatias = FATIAS.map(function(f){
    for (const c of CAIDAS) if (c.substitui === f.id && lista.indexOf(c.id) >= 0) return c;
    return f;
  });
  const disco = montarDisco(fatias);
  const especializacoes = montarEspecializacoes(fatias);
  const espPorId = {};
  for (const e of especializacoes){ espPorId[e.id] = e; montarArvore(e, fatias, disco); }
  MUNDOS[chave] = {caidas:lista, fatias:fatias, disco:disco, especializacoes:especializacoes, espPorId:espPorId};
  return MUNDOS[chave];
}
const MUNDO = mundo([]);
const DISCO = MUNDO.disco, ESPECIALIZACOES = MUNDO.especializacoes;
/* todas as especializacoes de todos os mundos, para ler e escrever builds */
const ESP_POR_ID = {};
[MUNDO].concat(CAIDAS.map(function(c){ return mundo([c.id]); })).forEach(function(m){
  m.especializacoes.forEach(function(e){ ESP_POR_ID[e.id] = e; });
});

function especializacaoAberta(esp, porFatia){
  return !!esp && esp.fatias.every(function(f){ return porFatia[f] >= esp.exige; });
}
function idPericiaUnica(espId, k){ return "+" + espId + "-" + k; }
function lerPericiaUnica(id){
  const m = /^\+([a-z-]+)-(\d+)$/.exec(id);
  return m && ESP_POR_ID[m[1]] ? {esp:m[1], k:Number(m[2])} : null;
}
function efeitoDoNo(id, caidas){
  const n = mundo(caidas).disco.porId[id];
  return n ? n.ef : {};
}

/* ---------- experiencia ---------- */
function xpDoNivel(n){ return Math.round(50/3 * (n*n*n - 6*n*n + 17*n - 12)); }
function xpTotal(nivel, progresso){
  const a = xpDoNivel(nivel), b = xpDoNivel(nivel + 1);
  return a + (b - a) * progresso;
}
function nivelDaXp(xp){
  let n = 1;
  while (n < REGRAS.nivelMax && xpDoNivel(n + 1) <= xp) n++;
  const a = xpDoNivel(n), b = xpDoNivel(n + 1);
  return {nivel:n, progresso: Math.max(0, Math.min(0.999, (xp - a) / (b - a)))};
}
function perderXp(nivel, progresso, fracao){ return nivelDaXp(xpTotal(nivel, progresso) * (1 - fracao)); }
function magoMinutos(usos){ return REGRAS.magoMinutosBase * Math.pow(2, usos); }

/* ---------- pontos ---------- */
function pontosDeAtributo(nivel){ return REGRAS.pontosCriacao + REGRAS.pontosAtributoPorNivel * (nivel - 1); }
function pontosDeHabilidade(nivel){ return REGRAS.pontosHabilidadeCriacao + REGRAS.pontosHabilidadePorNivel * (nivel - 1); }
function custoAtributo(valor){ return 1 + Math.floor(valor / 10); }
function custoAtributoAte(de, ate){
  let c = 0;
  for (let v=de; v<ate; v++) c += custoAtributo(v);
  return c;
}

/* ---------- o plano e o que ele compra ----------
   Uma build e um PLANO: duas filas de compra, na ordem. O que cabe na verba
   do nivel esta comprado; o resto espera. A morte tira os ultimos da fila.

   Cada no so vale se, na hora da compra, estava encostado num no ja
   comprado -- e cada no de arvore propria, se a especializacao dele era a
   escolhida e ja estava aberta. Compra que nao vale nao gasta ponto e
   aparece em `invalidos`. Como a morte tira da ponta da fila, ela nunca
   produz uma. */
function motivoInvalido(id, donos, porFatia, esp, disco){
  if (donos[id]) return "repetido";
  const n = disco.porId[id];
  if (!n) return "desconhecido";
  if (n.esp){
    if (!esp || esp.id !== n.esp) return "outra especializa\u00e7\u00e3o";
    if (!especializacaoAberta(esp, porFatia)) return "fechada";
  }
  if (!disco.viz[id].some(function(v){ return donos[v]; })) return "sem caminho";
  return null;
}
function montar(plano, nivel, opcoes){
  const R = REGRAS, o = opcoes || {}, M = mundo(o.caidas);
  const atributos = {};
  for (const a of R.atributos) atributos[a.id] = R.atributoInicial;
  const verbaAtr = pontosDeAtributo(nivel), verbaHab = pontosDeHabilidade(nivel);

  let gastoAtr = 0, i = 0;
  for (; i<plano.atributos.length; i++){
    const id = plano.atributos[i], v = atributos[id];
    if (v === undefined || v >= R.atributoMax) continue;
    const c = custoAtributo(v);
    if (gastoAtr + c > verbaAtr) break;
    atributos[id] = v + 1;
    gastoAtr += c;
  }

  const esp = o.especializacao ? M.espPorId[o.especializacao] || null : null;
  const donos = {centro:true}, ordem = [], invalidos = [];
  const porFatia = FATIAS.map(function(){ return 0; });
  let gastoHab = 0, espComprados = 0, j = 0;
  for (; j<plano.nos.length; j++){
    const id = plano.nos[j];
    const motivo = motivoInvalido(id, donos, porFatia, esp, M.disco);
    if (motivo){ invalidos.push({id:id, motivo:motivo}); continue; }
    if (gastoHab + 1 > verbaHab) break;
    donos[id] = true;
    ordem.push(id);
    gastoHab++;
    const n = M.disco.porId[id];
    if (n.esp) espComprados++;
    else porFatia[n.fatia]++;
  }

  return {nivel:nivel, atributos:atributos, verbaAtr:verbaAtr, gastoAtr:gastoAtr,
          sobraAtr:verbaAtr - gastoAtr, esperaAtr:plano.atributos.length - i,
          donos:donos, ordem:ordem, porFatia:porFatia, invalidos:invalidos,
          verbaHab:verbaHab, gastoHab:gastoHab, sobraHab:verbaHab - gastoHab,
          esperaNos:plano.nos.length - j, mundo:M,
          especializacao:esp, espAberta:especializacaoAberta(esp, porFatia), espComprados:espComprados,
          tamanhoArvore: esp ? M.disco.arvores[esp.id].length : 0};
}

/* Devolver um no que sustenta outros deixaria compra sem caminho. Confere
   no plano inteiro, como se o nivel nao tivesse limite. */
function podeDevolver(plano, id, opcoes){
  const k = plano.nos.lastIndexOf(id);
  if (k < 0 || id === "centro") return false;
  const antes = montar(plano, 1e6, opcoes);
  const sem = {atributos: plano.atributos, nos: plano.nos.slice(0, k).concat(plano.nos.slice(k + 1))};
  return montar(sem, 1e6, opcoes).invalidos.length <= antes.invalidos.length;
}

/* ---------- a traicao ----------
   A fatia troca sem mexer no que foi comprado: cada no do clerigo vira o no
   do necromante no mesmo lugar, e a especializacao vira a caida que espelha
   a dela -- o paladino vira cavaleiro da morte, e um trio com o clerigo, o
   mesmo trio com o necromante. `trair` falso faz o caminho de volta, que no
   jogo nao existe; o simulador usa para comparar. */
function converter(plano, especializacao, caida, trair){
  let c = null, base = null;
  for (const x of CAIDAS) if (x.id === caida) c = x;
  if (c) for (const f of FATIAS) if (f.id === c.substitui) base = f;
  if (!c || !base) return {plano:plano, especializacao:especializacao};
  const de = trair ? base.codigo : c.codigo, para = trair ? c.codigo : base.codigo;
  const espelho = {};
  for (const p of PARES) if (p[4]){ if (trair) espelho[p[4]] = p[2]; else espelho[p[2]] = p[4]; }
  const trocaEsp = function(id){
    if (!id) return id;
    if (espelho[id]) return espelho[id];
    if (id.indexOf("trio-") === 0) return "trio-" + id.slice(5).replace(de.toLowerCase(), para.toLowerCase());
    return id;
  };
  const trocaNo = function(id){
    if (id === de) return para;
    if (id.charAt(0) === de && /^.\d-\d+$/.test(id)) return para + id.slice(1);
    const u = /^\+([a-z-]+)-(\d+)$/.exec(id);
    return u ? "+" + trocaEsp(u[1]) + "-" + u[2] : id;
  };
  return {plano:{atributos:plano.atributos.slice(), nos:plano.nos.map(trocaNo)},
          especializacao:trocaEsp(especializacao)};
}

/* ---------- o que tudo isso da ----------
   Vida, mana, velocidade e critico sao as regras combinadas. Os bonus de
   dano e cura sao PROVISORIOS: nao existe formula de combate ainda. */
function critico(sor){
  const chance = 40 * sor / (sor + 40);
  return {chance:chance, dano:150 + sor};
}
function derivar(estado, equipamento, escudo){
  const R = REGRAS, A = estado.atributos, disco = (estado.mundo || MUNDO).disco;
  const s = {vida:0, mana:0, folego:0, alivio:0, bloqueio:0, critChance:0, critDano:0,
             danoCorpo:0, danoDistancia:0, poderMagia:0, cura:0, velocidade:0, puxar:0};
  for (const id in estado.donos){
    const n = disco.porId[id], ef = n ? n.ef : {};
    for (const k in ef) s[k] += ef[k];
  }
  let eq = R.equipamentos[0];
  for (const q of R.equipamentos) if (q.id === equipamento) eq = q;
  const peso = eq.penalidade + (escudo ? R.escudo : 0);
  const penalidade = peso * (1 - Math.min(A.FOR, R.atributoMax) / 120) * (1 - Math.min(0.8, s.alivio / 100));
  const c = critico(A.SOR);
  const chance = c.chance + s.critChance, dano = c.dano + s.critDano;
  return {
    vida: 60 + 5*estado.nivel + 10*A.VIT + s.vida,
    mana: 20 + 3*estado.nivel + 8*A.INT + s.mana,
    folego: 50 + 3*A.VIT + 2*A.AGI + s.folego,
    carga: 20 + 2*A.FOR,
    velocidade: 100 * (1 + (A.AGI - R.atributoInicial) * 0.004 + s.velocidade / 100) * (1 - penalidade),
    penalidade: penalidade,
    bloqueio: escudo ? s.bloqueio : 0,
    critChance: chance, critDano: dano, critGanho: chance * (dano - 100) / 100,
    danoCorpo: (A.FOR - R.atributoInicial) * 1.5 + s.danoCorpo,
    danoDistancia: (A.DES - R.atributoInicial) * 1.5 + s.danoDistancia,
    poderMagia: (A.INT - R.atributoInicial) * 1.5 + s.poderMagia,
    cura: s.cura,
    puxarArco: (1 - A.DES / 150) * (1 - Math.min(0.5, s.puxar / 100))
  };
}
const ROTULOS_EFEITO = {
  vida:["+", " de vida"], mana:["+", " de mana"], folego:["+", " de f\u00f4lego"],
  alivio:["\u2212", "% do peso da armadura"], bloqueio:["+", "% de bloqueio com escudo"],
  critChance:["+", "% de chance de cr\u00edtico"], critDano:["+", "% de dano do cr\u00edtico"],
  danoCorpo:["+", "% de dano corpo a corpo"], danoDistancia:["+", "% de dano \u00e0 dist\u00e2ncia"],
  poderMagia:["+", "% de poder das magias"], cura:["+", "% de cura"],
  velocidade:["+", "% de velocidade"], puxar:["\u2212", "% do tempo de puxar o arco"]
};
function textoDoEfeito(ef){
  return Object.keys(ef).map(function(k){
    const r = ROTULOS_EFEITO[k];
    return r[0] + String(ef[k]).replace(".", ",") + r[1];
  }).join(", ");
}

/* ---------- receitas ----------
   Cada passo e [fatia, ramo, ate onde] ou ["ESP", quantos nos da arvore
   propria]. A ordem dos passos e a ordem de compra: a receita no nivel 30 e
   a mesma pessoa, so que mais nova. Todas cabem inteiras no nivel 100.

   As hibridas levam antes um ramo ate a ponta que da na porta da arvore: o
   paladino abre no nivel 30 e so pisa na arvore no 37. */
const RECEITAS = [
  {id:"guerreiro", nome:"Guerreiro", especializacao:null, equipamento:"placas", escudo:true,
   atributos:{FOR:50, VIT:45, AGI:25},
   passos:[["G",0,6],["G",2,6],["G",1,4],["G",0,14],["G",2,14],["G",1,10],["G",0,20],["G",2,20],["G",1,20],["C",0,20],["D",2,17]]},
  {id:"clerigo", nome:"Cl\u00e9rigo", especializacao:null, equipamento:"malha", escudo:true,
   atributos:{INT:50, VIT:45, AGI:25},
   passos:[["C",1,6],["C",0,6],["C",2,4],["C",1,14],["C",0,14],["C",2,10],["C",1,20],["C",0,20],["C",2,20],["G",1,20],["L",1,17]]},
  {id:"ladino", nome:"Ladino", especializacao:null, equipamento:"couro", escudo:false,
   atributos:{AGI:45, FOR:35, SOR:40, VIT:16},
   passos:[["L",0,6],["L",1,6],["L",2,4],["L",0,14],["L",1,14],["L",2,10],["L",0,20],["L",1,20],["L",2,20],["M",2,20],["C",2,17]]},
  {id:"mago", nome:"Mago", especializacao:null, equipamento:"roupa", escudo:false,
   atributos:{INT:55, VIT:40, AGI:24},
   passos:[["M",1,6],["M",2,6],["M",0,4],["M",1,14],["M",2,14],["M",0,10],["M",1,20],["M",2,20],["M",0,20],["L",2,20],["A",0,17]]},
  {id:"arqueiro", nome:"Arqueiro", especializacao:null, equipamento:"couro", escudo:false,
   atributos:{DES:50, AGI:45, VIT:25},
   passos:[["A",1,6],["A",0,6],["A",2,4],["A",1,14],["A",0,14],["A",2,10],["A",1,20],["A",0,20],["A",2,20],["D",0,20],["M",2,17]]},
  {id:"druida", nome:"Druida", especializacao:null, equipamento:"couro", escudo:false,
   atributos:{INT:45, VIT:45, FOR:30, AGI:13},
   passos:[["D",1,6],["D",2,6],["D",0,4],["D",1,14],["D",2,14],["D",0,10],["D",1,20],["D",2,20],["D",0,20],["G",1,20],["A",2,17]]},
  {id:"paladino", nome:"Paladino", especializacao:"paladino", equipamento:"placas", escudo:true,
   atributos:{VIT:50, FOR:40, INT:33},
   passos:[["G",2,14],["C",0,14],["G",2,20],["ESP",5],["G",1,8],["C",0,20],["ESP",9],["C",1,16],["G",1,20],["G",0,13]]},
  {id:"arqueiro-arcano", nome:"Arqueiro arcano", especializacao:"arqueiro-arcano", equipamento:"couro", escudo:false,
   atributos:{DES:45, INT:40, AGI:35, VIT:16},
   passos:[["A",0,20],["M",2,14],["ESP",5],["A",1,12],["M",1,12],["ESP",9],["A",1,20],["M",1,20],["M",2,20],["A",2,9]]},
  {id:"guerreiro-mistico", nome:"Guerreiro m\u00edstico", especializacao:"guerreiro-mistico", equipamento:"malha", escudo:false,
   atributos:{FOR:45, INT:40, VIT:35, AGI:16},
   passos:[["G",2,19],["M",0,19],["G",2,20],["ESP",5],["G",0,12],["M",1,12],["ESP",9],["M",0,20],["G",0,20],["M",1,20],["G",1,9]]},
  {id:"cavaleiro-da-morte", nome:"Cavaleiro da morte", especializacao:"cavaleiro-da-morte", caidas:["necromante"],
   equipamento:"placas", escudo:true,
   atributos:{VIT:50, FOR:40, INT:33},
   passos:[["G",2,14],["N",0,14],["G",2,20],["ESP",5],["G",1,8],["N",0,20],["ESP",9],["N",1,16],["G",1,20],["G",0,13]]}
];

/* ["ESP", n] compra nos da arvore ate a especializacao ter n: sempre o
   primeiro, na ordem da arvore, que ja esteja encostado em algo comprado.
   Assim a receita entra pela porta que o caminho dela alcancou. */
function planoDaReceita(rec){
  const R = REGRAS, atual = {}, alvo = rec.atributos, ids = Object.keys(alvo);
  for (const id of ids) atual[id] = R.atributoInicial;
  const atributos = [];
  for (;;){
    let melhor = null, razao = 2;
    for (const id of ids){
      if (atual[id] >= alvo[id]) continue;
      const r = (atual[id] - R.atributoInicial) / (alvo[id] - R.atributoInicial);
      if (r < razao){ razao = r; melhor = id; }
    }
    if (melhor === null) break;
    atributos.push(melhor);
    atual[melhor]++;
  }
  const M = mundo(rec.caidas), nos = [], tem = {centro:true};
  const compra = function(id){ if (!tem[id]){ tem[id] = true; nos.push(id); } };
  for (const p of rec.passos){
    if (p[0] === "ESP"){
      const arvore = M.disco.arvores[rec.especializacao];
      let feitos = arvore.filter(function(n){ return tem[n.id]; }).length;
      while (feitos < p[1]){
        const prox = arvore.find(function(n){
          return !tem[n.id] && M.disco.viz[n.id].some(function(v){ return tem[v]; });
        });
        if (!prox) break;
        compra(prox.id);
        feitos++;
      }
      continue;
    }
    compra(p[0]);
    for (let q=1; q<=p[2]; q++) compra(p[0] + p[1] + "-" + q);
  }
  return {atributos:atributos, nos:nos};
}

/* ---------- a build em texto ---------- */
function comprimir(lista){
  const out = [];
  for (let k=0; k<lista.length; ){
    let n = 1;
    while (k + n < lista.length && lista[k + n] === lista[k]) n++;
    out.push(n > 1 ? lista[k] + "*" + n : String(lista[k]));
    k += n;
  }
  return out.join(" ");
}
function expandir(texto){
  const out = [];
  for (const tok of texto.trim().split(/\s+/)){
    if (!tok) continue;
    const m = tok.match(/^([^*]+)(?:\*(\d+))?$/);
    if (!m) return null;
    for (let k=0; k<(m[2] ? Number(m[2]) : 1); k++) out.push(m[1]);
  }
  return out;
}
function escreverBuild(b){
  return [
    "BUILD 2",
    "nivel " + b.nivel + " " + Math.round(b.progresso * 100),
    "especializacao " + (b.especializacao || "-"),
    "caidas " + (b.caidas && b.caidas.length ? b.caidas.join(" ") : "-"),
    "equipamento " + b.equipamento + " " + (b.escudo ? "escudo" : "sem-escudo"),
    "esquecimentos " + (b.esquecimentos || 0),
    "atributos " + comprimir(b.plano.atributos),
    "nos " + b.plano.nos.join(" ")
  ].join("\n") + "\n";
}
function lerBuild(texto){
  const R = REGRAS;
  const b = {nivel:1, progresso:0, especializacao:null, caidas:[], equipamento:"roupa", escudo:false,
             esquecimentos:0, plano:{atributos:[], nos:[]}};
  const linhas = String(texto).replace(/\r/g, "").split("\n");
  if (/^BUILD\s+1\s*$/.test(linhas[0] || ""))
    return {build:null, erro:"esta build \u00e9 da roda antiga, de antes do disco"};
  if (!/^BUILD\s+2\s*$/.test(linhas[0] || "")) return {build:null, erro:"o texto n\u00e3o come\u00e7a com BUILD 2"};
  let linhaEsp = 0, linhaNos = 0;
  for (let k=1; k<linhas.length; k++){
    const l = linhas[k].trim();
    if (!l) continue;
    const esp = l.indexOf(" "), chave = esp < 0 ? l : l.slice(0, esp), resto = esp < 0 ? "" : l.slice(esp + 1).trim();
    const partes = resto.split(/\s+/);
    if (chave === "nivel"){
      b.nivel = Math.max(1, Math.min(R.nivelMax, parseInt(partes[0], 10) || 1));
      b.progresso = Math.max(0, Math.min(99, parseInt(partes[1], 10) || 0)) / 100;
    }
    else if (chave === "especializacao"){
      if (partes[0] && partes[0] !== "-"){
        if (!ESP_POR_ID[partes[0]]) return {build:null, erro:"linha " + (k+1) + ": especializa\u00e7\u00e3o desconhecida " + partes[0]};
        b.especializacao = partes[0];
        linhaEsp = k + 1;
      }
    }
    else if (chave === "caidas"){
      const ids = resto && resto !== "-" ? resto.split(/\s+/) : [];
      const ruim = ids.find(function(id){ return !CAIDAS.some(function(c){ return c.id === id; }); });
      if (ruim) return {build:null, erro:"linha " + (k+1) + ": fatia ca\u00edda desconhecida " + ruim};
      b.caidas = mundo(ids).caidas.slice();
    }
    else if (chave === "equipamento"){
      if (R.equipamentos.some(function(q){ return q.id === partes[0]; })) b.equipamento = partes[0];
      b.escudo = partes[1] === "escudo";
    }
    else if (chave === "esquecimentos") b.esquecimentos = Math.max(0, parseInt(partes[0], 10) || 0);
    else if (chave === "atributos"){
      const ids = expandir(resto);
      if (!ids) return {build:null, erro:"linha " + (k+1) + ": atributos mal escritos"};
      const ruim = ids.find(function(id){ return !R.atributos.some(function(a){ return a.id === id; }); });
      if (ruim) return {build:null, erro:"linha " + (k+1) + ": atributo desconhecido " + ruim};
      b.plano.atributos = ids;
    }
    else if (chave === "nos"){
      b.plano.nos = resto ? resto.split(/\s+/) : [];
      linhaNos = k + 1;
    }
  }
  /* no e especializacao so fazem sentido no mundo da build: o no do
     necromante nao existe sem a traicao */
  const M = mundo(b.caidas);
  const ruim = b.plano.nos.find(function(id){ return !M.disco.porId[id]; });
  if (ruim) return {build:null, erro:"linha " + linhaNos + ": n\u00f3 desconhecido " + ruim};
  if (b.especializacao && !M.espPorId[b.especializacao])
    return {build:null, erro:"linha " + linhaEsp + ": " + ESP_POR_ID[b.especializacao].nome + " n\u00e3o existe " +
                            (b.caidas.length ? "depois da trai\u00e7\u00e3o" : "sem a trai\u00e7\u00e3o")};
  return {build:b, erro:null};
}

/* ---------- classes por quest (DESIGN.md, 27/9) ----------
   Aceito como ponto de partida; substitui o disco unico. Aqui fica so o que
   ja foi decidido: os talentos, as primeiras classes, o caminho
   secundario, a segunda classe e a queda. Os nos de cada circulo (o do
   aprendiz, o de cada classe) ainda nao existem -- ver PLANEJAMENTO.md, por
   decidir --, e o disco acima continua servindo o simulador ate la.

   O aprendiz escolhe um talento na criacao; na quest de classe vira a
   classe do talento (adaga e arco deixa escolher arqueiro ou ladino) e
   escolhe o secundario, um dos outros talentos. Cada nivel da 1 ponto no
   principal; depois da quest, a cada dois niveis, 1 no secundario, que so
   vai ate a metade do circulo dele. Classe e secundario dao a segunda
   classe, e a ordem importa. Quem tem magia sagrada, principal ou
   secundaria, pode cair. */
const CLASSES_POR_QUEST = {
  nivelDaQuest: 20,              // a saida da ilha; 20 e chute (por decidir)
  pontosPrincipalPorNivel: 1,
  niveisPorPontoSecundario: 2,
  secundarioAte: 0.5             // o secundario vai ate a metade do circulo dele
};
const TALENTOS = [
  {id:"adaga-e-arco",     nome:"Adaga e arco",          classes:["arqueiro", "ladino"]},
  {id:"uma-mao-e-escudo", nome:"Uma m\u00e3o e escudo", classes:["guerreiro"]},
  {id:"duas-maos",        nome:"Duas m\u00e3os",        classes:["barbaro"]},
  {id:"arcana",           nome:"Magia arcana",          classes:["mago"]},
  {id:"sagrada",          nome:"Magia sagrada",         classes:["clerigo"]},
  {id:"natureza",         nome:"Natureza",              classes:["druida"]}
];
/* a primeira classe e, por talento de secundario, a segunda: [id, nome] */
const CLASSES = [
  {id:"arqueiro", nome:"Arqueiro", talento:"adaga-e-arco", segundas:{
    "uma-mao-e-escudo":["besteiro", "Besteiro"], "duas-maos":["monteiro", "Monteiro"],
    "arcana":["arqueiro-arcano", "Arqueiro arcano"], "sagrada":["cacador-de-demonios", "Ca\u00e7ador de dem\u00f4nios"],
    "natureza":["patrulheiro", "Patrulheiro"]}},
  {id:"ladino", nome:"Ladino", talento:"adaga-e-arco", segundas:{
    "uma-mao-e-escudo":["duelista", "Duelista"], "duas-maos":["salteador", "Salteador"],
    "arcana":["ilusionista", "Ilusionista"], "sagrada":["penitente", "Penitente"],
    "natureza":["espreitador", "Espreitador"]}},
  {id:"guerreiro", nome:"Guerreiro", talento:"uma-mao-e-escudo", segundas:{
    "adaga-e-arco":["sentinela", "Sentinela"], "duas-maos":["ferreiro", "Ferreiro"],
    "arcana":["guerreiro-mistico", "Guerreiro m\u00edstico"], "sagrada":["paladino", "Paladino"],
    "natureza":["cavaleiro-verde", "Cavaleiro verde"]}},
  {id:"barbaro", nome:"B\u00e1rbaro", talento:"duas-maos", segundas:{
    "adaga-e-arco":["saqueador", "Saqueador"], "uma-mao-e-escudo":["gladiador", "Gladiador"],
    "arcana":["runico", "R\u00fanico"], "sagrada":["zelote", "Zelote"],
    "natureza":["berserker", "Berserker"]}},
  {id:"mago", nome:"Mago", talento:"arcana", segundas:{
    "adaga-e-arco":["encantador", "Encantador"], "uma-mao-e-escudo":["guardiao-arcano", "Guardi\u00e3o arcano"],
    "duas-maos":["mago-de-batalha", "Mago de batalha"], "sagrada":["oraculo", "Or\u00e1culo"],
    "natureza":["elementalista", "Elementalista"]}},
  {id:"clerigo", nome:"Cl\u00e9rigo", talento:"sagrada", segundas:{
    "adaga-e-arco":["inquisidor", "Inquisidor"], "uma-mao-e-escudo":["templario", "Templ\u00e1rio"],
    "duas-maos":["cruzado", "Cruzado"], "arcana":["teurgo", "Teurgo"],
    "natureza":["alquimista", "Alquimista"]}},
  {id:"druida", nome:"Druida", talento:"natureza", segundas:{
    "adaga-e-arco":["mateiro", "Mateiro"], "uma-mao-e-escudo":["guardiao-da-mata", "Guardi\u00e3o da Mata"],
    "duas-maos":["metamorfo", "Metamorfo"], "arcana":["invocador", "Invocador"],
    "sagrada":["xama", "Xam\u00e3"]}}
];
/* a queda: a sagrada vira profana */
const QUEDAS = {
  "clerigo":["necromante", "Necromante"], "paladino":["cavaleiro-da-morte", "Cavaleiro da morte"],
  "inquisidor":["carrasco", "Carrasco"], "teurgo":["lich", "Lich"],
  "cacador-de-demonios":["cacador-de-almas", "Ca\u00e7ador de almas"], "xama":["semeador-da-praga", "Semeador da praga"],
  "templario":["profanador", "Profanador"], "cruzado":["flagelo", "Flagelo"],
  "alquimista":["mestre-dos-venenos", "Mestre dos venenos"], "penitente":["apostata", "Ap\u00f3stata"],
  "zelote":["carniceiro", "Carniceiro"], "oraculo":["agourento", "Agourento"]
};
const CLASSE_POR_ID = {};
CLASSES.forEach(function(c){ CLASSE_POR_ID[c.id] = c; });
/* a segunda classe de uma primeira com um secundario; null se nao pode */
function segundaClasse(classe, talento){
  const c = CLASSE_POR_ID[classe];
  if (!c || !c.segundas[talento]) return null;
  return {id:c.segundas[talento][0], nome:c.segundas[talento][1], classe:classe, secundario:talento};
}
/* os secundarios que uma classe pode pegar: todo talento menos o dela */
function secundariosDe(classe){
  const c = CLASSE_POR_ID[classe];
  return c ? TALENTOS.filter(function(t){ return t.id !== c.talento; }).map(function(t){ return t.id; }) : [];
}
/* quem pode cair, e no que: a primeira classe clerigo, ou a segunda com
   magia sagrada de principal ou de secundario */
function queda(id){
  const q = QUEDAS[id];
  return q ? {id:q[0], nome:q[1]} : null;
}
function temSagrada(classe, talento){
  const c = CLASSE_POR_ID[classe];
  return !!c && (c.talento === "sagrada" || talento === "sagrada");
}
/* os pontos de cada circulo num nivel: o principal ganha em todo nivel (os
   do aprendiz contam nele), o secundario so depois da quest */
function pontosDeCaminho(nivel){
  const Q = CLASSES_POR_QUEST, depois = Math.max(0, nivel - Q.nivelDaQuest);
  return {principal: Q.pontosPrincipalPorNivel*nivel,
          secundario: Math.floor(depois/Q.niveisPorPontoSecundario),
          aprendiz: nivel <= Q.nivelDaQuest};
}
function limiteDoSecundario(tamanhoDoCirculo){ return Math.floor(tamanhoDoCirculo*CLASSES_POR_QUEST.secundarioAte); }

if (typeof module !== "undefined") module.exports = {
  CLASSES_POR_QUEST, TALENTOS, CLASSES, CLASSE_POR_ID, QUEDAS,
  segundaClasse, secundariosDe, queda, temSagrada, pontosDeCaminho, limiteDoSecundario,
  REGRAS, FATIAS, CAIDAS, FATIA_POR_CODIGO, PARES, DISCO, ESPECIALIZACOES, ESP_POR_ID, RECEITAS, MUNDO,
  mundo, converter, distanciaFatias, especializacaoAberta, idPericiaUnica, lerPericiaUnica, efeitoDoNo,
  xpDoNivel, xpTotal, nivelDaXp, perderXp, magoMinutos,
  pontosDeAtributo, pontosDeHabilidade, custoAtributo, custoAtributoAte,
  montar, podeDevolver, critico, derivar, textoDoEfeito, planoDaReceita, escreverBuild, lerBuild
};
