# Relatorio da entrega 011 -- Os textos do jogo numa tabela

- numero de say bate com grep: sim (31 ocorrencias: 1 definicao e 30 chamadas)
- conversas dos moradores estao todas: sim (todos os 7 moradores + padrao e loja)
- contagem por arquivo no topo: sim
- desvios: nenhum

## Comando grep executado
```bash
git grep -n "say(" mundo-perigoso/src
```

### Saida completa do grep
```
mundo-perigoso/src/p4.js:156:function say(t){ G.msg = t; G.msgT = 3.2; }
mundo-perigoso/src/p4.js:229:    say("MAPA DO EDITOR: " + String(ILHA.nome).toUpperCase());
mundo-perigoso/src/p4.js:518:    if (daTela){ G.mode = "dead"; G.endTime = G.time; som("die"); say("VOCE MORREU"); }
mundo-perigoso/src/p4.js:532:      say("O SELO DA CRIPTA SE ROMPE. O PORTAL AGUARDA."); }
mundo-perigoso/src/p4.js:792:  say(NOME_DO_LUGAR);
mundo-perigoso/src/p4.js:819:    if (d.locked && !P.key){ som("locked"); say("O SELO EXIGE A CHAVE RUNICA"); return; }
mundo-perigoso/src/p4.js:822:      if (d.secret){ G.secrets++; som("secret"); say("SEGREDO ENCONTRADO!"); }
mundo-perigoso/src/p4.js:823:      else if (d.locked) say("O SELO SE ABRE");
mundo-perigoso/src/p4.js:873:  if (e.type === "potion" && P.hp < 100){ P.hp = Math.min(100, P.hp+25); got = true; say("POCAO DE CURA +25"); }
mundo-perigoso/src/p4.js:875:    P.mana = Math.min(P.maxMana, P.mana+30); got = true; say("CRISTAL DE MANA +30");
mundo-perigoso/src/p4.js:877:  else if (e.type === "shield" && P.armor < 100){ P.armor = Math.min(100, P.armor+50); got = true; say("ESCUDO DE AZO +50"); }
mundo-perigoso/src/p4.js:880:    say("ALMA DE FOGO! GRIMORIO DE CHAMAS OBTIDO"); som("secret");
mundo-perigoso/src/p4.js:882:  else if (e.type === "key"){ P.key = true; got = true; som("key"); say("CHAVE RUNICA OBTIDA"); }
mundo-perigoso/src/p5.js:133:  say(G.terceira ? "TERCEIRA PESSOA" : "PRIMEIRA PESSOA");
mundo-perigoso/src/p5.js:339:    if (P.have[a.i]){ P.wpn = a.i; P.anim = 0; say(WPN[a.i].n); }
mundo-perigoso/src/p5.js:342:  else if (a.tipo === "proxima"){ P.wpn = (P.wpn+1)%3; while (!P.have[P.wpn]) P.wpn = (P.wpn+1)%3; say(WPN[P.wpn].n); }
mundo-perigoso/src/p5.js:365:  if (P.mana < w.cost){ som("empty"); say("MANA INSUFICIENTE"); P.cd = 0.3; return; }
mundo-perigoso/src/p5.js:421:    G.hinted = true; say("ARRASTE COM O MOUSE OU USE AS SETAS PARA OLHAR");
mundo-perigoso/src/p5.js:433:    if (perto && G.falando !== e){ G.falando = e; say(e.fala.toUpperCase()); }
mundo-perigoso/src/p5.js:624:  if (!P.bolsa[id]){ som("empty"); say(id === "pocao" ? "NENHUMA POCAO NA BOLSA" : "NENHUM CRISTAL NA BOLSA"); return; }
mundo-perigoso/src/p5.js:629:  say(id === "pocao" ? "POCAO DE CURA +25" : "CRISTAL DE MANA +30");
mundo-perigoso/src/p5.js:704:    say("AJUSTES DE VOLTA AO PADRAO");
mundo-perigoso/src/p5.js:709:    say(AJUSTE.quadro ? "CONTADOR DE QUADRO LIGADO" : "CONTADOR DE QUADRO DESLIGADO");
mundo-perigoso/src/p5.js:715:    say(textoDoAjuste("esc"));
mundo-perigoso/src/p5.js:724:  say(textoDoAjuste(campo));
mundo-perigoso/src/p5b.js:42:      say(P.god ? "MODO DEUS LIGADO" : "MODO DEUS DESLIGADO");
mundo-perigoso/src/p5b.js:47:      say(P.noclip ? "ATRAVESSAR PAREDES LIGADO" : "ATRAVESSAR PAREDES DESLIGADO");
mundo-perigoso/src/p5b.js:52:      say(G.vitrine ? "MODO VITRINE LIGADO" : "MODO VITRINE DESLIGADO");
mundo-perigoso/src/p5b.js:57:      say("ARSENAL COMPLETO");
mundo-perigoso/src/p5b.js:62:      say(AU.on ? "SOM LIGADO" : "SOM DESLIGADO");
mundo-perigoso/src/p5b.js:118:  say(NOME_DO_LUGAR);
```

## Entregou
- `TEXTOS.md`
- `RELATORIO.md`
- `PRONTO`
