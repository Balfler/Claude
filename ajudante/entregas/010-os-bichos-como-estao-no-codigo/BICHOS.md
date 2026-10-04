# Os bichos como estão no código

Dados extraídos fielmente de `mundo-perigoso/src/p4.js` (linhas 128 a 149), sem inventar valores.

## 1. Tabela de bichos do `EDEF`

| Chave | Nome (`name`) | Modelo (`vox`) | Vida (`hp`) [pts] | Vel (`spd`) [tiles/s] | Raio (`r`) [tiles] | Altura (`hgt`) [tiles] | Largura (`wid`) [tiles] | Visão (`sight`) [tiles] | Alcance Melee (`melee`) [tiles] | Dano Melee (`dmg`) [pts] | Cooldown (`cd`) [s] | Chance Dor (`pain`) [0-1] | Som Alerta (`cry`) | Alcance Dist (`rng`) [tiles] | Projétil (`proj`) | Dano Proj (`pdmg`) [pts] | Vel Proj (`pspd`) [tiles/s] | Grav Proj (`pgrav`) [tiles/s²] | Desvio (`strafe`) [tiles] | Voa (`fly`) | Alt Voo (`flyZ`) [tiles] | Amp Voo (`bobAmp`) [tiles] | Vel Voo (`bobSpd`) [rad/s] | Flutua (`flo`) [tiles] |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `imp` | diabrete | impVox | 30 | 1.85 | 0.30 | 0.86 | 0.645 | 13 | 1.15 | [6, 13] | 0.80 | 0.40 | impCry | - | - | - | - | - | - | - | - | - | - | - |
| `goblin` | goblin | goblinVox | 45 | 1.25 | 0.30 | 0.90 | 0.675 | 15 | 0 | [0, 0] | 1.55 | 0.42 | goblinCry | 12 | arrow | 10 | 8.5 | 6.5 | - | - | - | - | - | - |
| `spider` | aranha | spiderVox | 22 | 2.60 | 0.26 | 0.34 | 0.700 | 14 | 0.85 | [4, 9] | 0.65 | 0.50 | spiderCry | - | - | - | - | - | 0.70 | - | - | - | - | - |
| `bat` | morcego | batVox | 26 | 2.30 | 0.24 | 0.44 | 0.620 | 15 | 0.90 | [5, 10] | 0.90 | 0.55 | batCry | - | - | - | - | - | 0.90 | 1 | 1.30 | 0.34 | 3.4 | - |
| `wraith` | cavaleiro espectral | wraithVox | 100 | 1.05 | 0.34 | 1.00 | 0.750 | 14 | 1.35 | [12, 22] | 1.20 | 0.30 | wraithCry | - | - | - | - | - | - | - | - | - | - | 0.12 |
| `boss` | VHALGORN | bossVox | 560 | 1.20 | 0.46 | 1.55 | 1.050 | 22 | 1.75 | [15, 26] | 1.00 | 0.14 | bossRoar | 17 | dark | 17 | 6.6 | - | - | - | - | - | - | - |

*Nota sobre o campo `preparo`: o código do motor (`src/p4.js`, linha 695) suporta `d.preparo`, mas hoje nenhum bicho do `EDEF` tem o campo definido, usando o padrão de fallback `0.19 s`.*

---

## 2. Quantidade de cada bicho na Cripta (`MAPA_CRIPTA`)

Contagem exata das 20 criaturas posicionadas no mapa da cripta (`mundo-perigoso/src/p2.js`, linhas 13-44):

| Bicho | Chave no mapa | Quantidade | Onde aparecem (principais salas) |
|---|---|---|---|
| **diabrete** | `i` | 7 | Corredor sul (2), Câmara de lava (3), Biblioteca (1), Câmara de Vhalgorn (1) |
| **goblin** | `g` | 4 | Salão dos pilares (1), Biblioteca (1), Câmara de lava (1), Câmara de Vhalgorn (1) |
| **aranha** | `s` | 3 | Corredor sul (1), Salão dos pilares (1), Biblioteca (1) |
| **morcego** | `b` | 3 | Salão dos pilares (1), Câmara de lava (1), Câmara de Vhalgorn (1) |
| **cavaleiro espectral** | `w` | 2 | Biblioteca (1), Câmara de Vhalgorn (1) |
| **VHALGORN** | `Z` | 1 | Câmara de Vhalgorn (chefe final) |
| **TOTAL** | | **20** | |

---

## 3. Bichos prometidos nos documentos e ainda não existentes no código

Bichos citados no `DESIGN.md` e em `PLANEJAMENTO.md`, com as colunas do `EDEF` vazias (aguardando definição de regras e modelo):

| Bicho | Origem / Linha de referência | `vox` | `hp` | `spd` | `r` | `hgt` | `wid` | `sight` | `melee` | `dmg` | `cd` | `pain` | `cry` | `rng` | `proj` | `pdmg` | `pspd` | `pgrav` | `strafe` | `fly` | `flyZ` | `bobAmp` | `bobSpd` | `flo` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **galinha** | `DESIGN.md`: linha 372 | | | | | | | | | | | | | | | | | | | | | | | |
| **cachorro** | `DESIGN.md`: linha 372 | | | | | | | | | | | | | | | | | | | | | | | |
| **gado** | `DESIGN.md`: linha 372 | | | | | | | | | | | | | | | | | | | | | | | |
| **pássaro** | `DESIGN.md`: linha 373 | | | | | | | | | | | | | | | | | | | | | | | |
| **cervo** | `DESIGN.md`: linha 373 | | | | | | | | | | | | | | | | | | | | | | | |
| **rato** | `PLANEJAMENTO.md`: linha 270 (*bichos da ilha*) | | | | | | | | | | | | | | | | | | | | | | | |
| **lobo** | `PLANEJAMENTO.md`: linha 115, 225, 270; `sondagens/4-lobo/RELATORIO.md`: linha 9 | | | | | | | | | | | | | | | | | | | | | | | |
| **cobra** | `PLANEJAMENTO.md`: linha 270 (*bichos da ilha*) | | | | | | | | | | | | | | | | | | | | | | | |
| **caranguejo** | `PLANEJAMENTO.md`: linha 271 (*bichos da ilha*) | | | | | | | | | | | | | | | | | | | | | | | |
