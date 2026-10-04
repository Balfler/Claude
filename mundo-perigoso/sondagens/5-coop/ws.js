/* ============================================================
   SONDAGEM 5 -- WEBSOCKET SEM DEPENDENCIA
   ------------------------------------------------------------
   O bastante do protocolo (RFC 6455) para o co-op: o aperto de mao, quadros
   de texto nos dois sentidos, a mascara que o navegador sempre poe, ping e
   fechar. Sem extensao de compressao: o que o jogo manda e pequeno.
   ============================================================ */
"use strict";
const crypto = require("crypto");
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

/* recebe o pedido de "upgrade" do http e devolve a conexao para aoAbrir:
   {enviar(texto), fechar(), aoMensagem, aoFechar} */
function aceitar(req, socket, aoAbrir){
  const chave = req.headers["sec-websocket-key"];
  if (!chave){ socket.destroy(); return; }
  const aceite = crypto.createHash("sha1").update(chave + GUID).digest("base64");
  socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
               "Sec-WebSocket-Accept: " + aceite + "\r\n\r\n");
  socket.setNoDelay(true);
  const con = {enviar: enviar, fechar: fechar, aoMensagem: null, aoFechar: null};
  let buf = Buffer.alloc(0), partes = [], fechado = false;

  socket.on("data", function(d){ buf = Buffer.concat([buf, d]); ler(); });
  socket.on("close", fim);
  socket.on("error", function(){ socket.destroy(); fim(); });

  function fim(){ if (fechado) return; fechado = true; if (con.aoFechar) con.aoFechar(); }
  function ler(){
    while (buf.length >= 2){
      const b0 = buf[0], b1 = buf[1], op = b0 & 15, final = b0 & 128, mascarado = b1 & 128;
      let n = b1 & 127, i = 2;
      if (n === 126){ if (buf.length < 4) return; n = buf.readUInt16BE(2); i = 4; }
      else if (n === 127){ if (buf.length < 10) return; n = Number(buf.readBigUInt64BE(2)); i = 10; }
      const m = mascarado ? 4 : 0;
      if (buf.length < i + m + n) return;                  // o quadro ainda nao chegou inteiro
      let dados = Buffer.from(buf.subarray(i + m, i + m + n));
      if (mascarado){ const k = buf.subarray(i, i + 4); for (let j = 0; j < n; j++) dados[j] ^= k[j & 3]; }
      buf = buf.subarray(i + m + n);
      if (op === 8){ fechar(); return; }
      if (op === 9){ quadro(10, dados); continue; }        // ping: devolve pong
      if (op === 10) continue;
      partes.push(dados);
      if (final){
        const texto = Buffer.concat(partes).toString("utf8");
        partes = [];
        if (con.aoMensagem) con.aoMensagem(texto);
      }
    }
  }
  function quadro(op, dados){
    if (socket.destroyed) return;
    const n = dados.length;
    let cab;
    if (n < 126) cab = Buffer.from([128 | op, n]);
    else if (n < 65536){ cab = Buffer.alloc(4); cab[0] = 128 | op; cab[1] = 126; cab.writeUInt16BE(n, 2); }
    else { cab = Buffer.alloc(10); cab[0] = 128 | op; cab[1] = 127; cab.writeBigUInt64BE(BigInt(n), 2); }
    socket.write(Buffer.concat([cab, dados]));
  }
  function enviar(texto){ quadro(1, Buffer.from(texto, "utf8")); }
  function fechar(){ try { quadro(8, Buffer.alloc(0)); } catch (e){} socket.end(); fim(); }
  aoAbrir(con);
}

module.exports = { aceitar };
