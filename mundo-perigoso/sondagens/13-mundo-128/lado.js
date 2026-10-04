/* junta imagens lado a lado: node lado.js saida.png a.png b.png ... */
const png = require("../../editor/png.js"), fs = require("fs");
const [saida, ...arqs] = process.argv.slice(2), ims = arqs.map(f => png.decodificar(fs.readFileSync(f)));
const W = ims.reduce((s, i) => s + i.largura + 8, -8), H = Math.max(...ims.map(i => i.altura)), o = new Uint8Array(W*H*4).fill(255);
let x0 = 0;
for (const i of ims){ for (let y = 0; y < i.altura; y++) o.set(i.rgba.subarray(y*i.largura*4, (y + 1)*i.largura*4), (y*W + x0)*4); x0 += i.largura + 8; }
fs.writeFileSync(saida, png.codificar(W, H, o));
