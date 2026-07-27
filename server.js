const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const PORT = process.env.PORT || 3000;
const PALITOS_INICIAIS = 3;
const ADM_ID = 'adm';

app.get('/', (req, res) => {
  res.send('TentaSorte server rodando ✅');
});

app.get('/jogar', (req, res) => {
  res.send(paginaJogadorHtml());
});

function paginaJogadorHtml() {
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>TentaSorte</title>
<script src="/socket.io/socket.io.js"></script>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;background:#0F5FA6;color:#fff;min-height:100vh;padding:20px;
font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:460px;margin:0 auto}
.tit{font-size:28px;font-weight:900;text-align:center;margin-bottom:4px}
.tit b{color:#FFD166}
.sub{font-size:13px;color:#CDE6FF;text-align:center;margin-bottom:24px}
.campo{width:100%;padding:14px;border-radius:14px;border:1.5px solid rgba(255,255,255,.15);
background:rgba(255,255,255,.08);color:#fff;font-size:16px;margin-bottom:14px}
.campo::placeholder{color:#CDE6FF}
.campoCodigo{text-align:center;font-size:22px;font-weight:900;letter-spacing:4px;text-transform:uppercase}
.btn{width:100%;padding:16px;border:none;border-radius:16px;color:#2A1C0C;font-size:16px;font-weight:800;
margin-bottom:10px;background:#FFB627}
.eyebrow{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#FFD166;font-weight:700;
text-align:center;margin-bottom:4px}
.card{text-align:center;margin-top:10px}
.fist{width:120px;height:120px;border-radius:60px;background:#E3B482;margin:20px auto;
display:flex;align-items:center;justify-content:center;font-size:52px;box-shadow:0 8px 16px rgba(0,0,0,.35)}
.choices{display:flex;justify-content:center;gap:10px;margin-bottom:20px;flex-wrap:wrap}
.choice{width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,.08);
border:2px solid rgba(255,255,255,.15);color:#fff;font-size:18px;font-weight:800}
.wait{background:rgba(255,255,255,.06);border-radius:16px;padding:24px;text-align:center;margin-top:16px;
color:#CDE6FF;font-size:14px;line-height:1.5}
.wait.safe{border:1.5px solid #2ECC71}
.guessRow{display:flex;gap:12px;justify-content:center;align-items:center;margin:20px 0}
.guessBox{width:80px;height:80px;border-radius:18px;background:rgba(255,255,255,.08);
border:2px solid #FFB627;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900}
.stepBtn{width:42px;height:42px;border-radius:21px;border:1.5px solid rgba(255,255,255,.2);
background:rgba(255,255,255,.06);color:#fff;font-size:20px;font-weight:800}
.sumCard{text-align:center;background:rgba(255,182,39,.12);border:1px solid rgba(255,182,39,.3);
border-radius:16px;padding:16px;margin:10px 0 16px}
.sumLabel{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#FFD166}
.sumValue{font-size:48px;font-weight:900}
.revRow{display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.05);
border-radius:12px;padding:14px 16px;margin-bottom:10px}
.revRow.hit{background:rgba(46,204,113,.15);border:1px solid rgba(46,204,113,.4)}
.revName{font-weight:700;font-size:16px}
.revGuess{font-size:14px;color:#CDE6FF;margin-top:2px}
.revTentos{font-weight:800;color:#FFD166;font-size:19px}
.palitosRow{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:10px 0 16px}
.palitosChip{background:rgba(255,255,255,.08);border-radius:20px;padding:6px 12px;font-size:12px}
.hint{font-size:11px;color:#CDE6FF;text-align:center;margin-top:8px}
.oculto{display:none}
</style></head><body>

<div class="tit">Tenta<b>Sorte</b></div>
<div class="sub">esconda, chute e zere os palitos primeiro</div>

<div id="entrada">
  <input id="codigo" class="campo campoCodigo" placeholder="CÓDIGO DA SALA" maxlength="6">
  <input id="nome" class="campo" placeholder="Seu nome" maxlength="20">
  <button class="btn" onclick="entrar()">Entrar na sala</button>
</div>

<div id="jogo" class="oculto">
  <div style="text-align:center;margin-bottom:14px">
    <a href="#" onclick="location.reload();return false;" style="color:#CDE6FF;font-size:13px;text-decoration:none">‹ Sair da sala</a>
  </div>
  <div id="conteudoJogo"></div>
</div>

<script>
var socket = io();
var meuId = null, meuNome = '';
var meuPalpiteValor = 0, ultimoEstado = { jogadores: [] };

var params = new URLSearchParams(window.location.search);
if (params.get('codigo')) document.getElementById('codigo').value = params.get('codigo').toUpperCase();

function entrar(){
  var codigo = document.getElementById('codigo').value.trim().toUpperCase();
  var nome = document.getElementById('nome').value.trim();
  if(!codigo){ alert('Digite o código da sala'); return; }
  if(!nome){ alert('Digite seu nome'); return; }
  meuNome = nome;
  socket.emit('entrar_sala', { codigo: codigo, nome: nome }, function(resposta){
    if(!resposta.ok){
      var msgs = { sala_nao_encontrada: 'Não achei essa sala. Confere o código.', sala_cheia: 'Sala cheia!' };
      alert(msgs[resposta.erro] || 'Não consegui entrar.');
      return;
    }
    meuId = resposta.meuId;
    document.getElementById('entrada').classList.add('oculto');
    document.getElementById('jogo').classList.remove('oculto');
    document.getElementById('conteudoJogo').innerHTML = '<div class="wait">Você está na sala!<br>Aguardando o Adm iniciar a partida…</div>';
  });
}

function palitosRowHtml(jogadores){
  var h = '<div class="palitosRow">';
  jogadores.forEach(function(j){
    h += '<div class="palitosChip">'+(j.id===meuId?'EU':j.nome)+': '+j.palitos+' 🥢</div>';
  });
  h += '</div>';
  return h;
}

function enviarTentos(n){
  socket.emit('esconder_tentos', { valor: n });
}
function ajustarPalpite(delta, max, usados){
  var novo = meuPalpiteValor + delta;
  while(novo>=0 && novo<=max && usados.indexOf(novo)!==-1){ novo += delta; }
  if(novo>=0 && novo<=max) meuPalpiteValor = novo;
  desenharPalpite(ultimoEstado);
}
function enviarPalpite(){
  socket.emit('palpite', { valor: meuPalpiteValor }, function(resposta){
    if(!resposta.ok){
      var msgs = {numero_usado:'Alguém já chutou esse número. Escolhe outro.', fora_de_turno:'Não é sua vez ainda.', fora_do_alcance:'Número fora do intervalo.'};
      alert(msgs[resposta.motivo] || 'Palpite não aceito.');
    }
  });
}

function desenharPalpite(d){
  var el = document.getElementById('conteudoJogo');
  var souEuAVez = d.turnoAtualId === meuId;
  var usados = d.numerosUsados || [];
  var usadosTxt = usados.length ? ('Já usados: '+usados.join(', ')) : 'Nenhum número usado ainda';
  if(!souEuAVez){
    var nomeVez = '';
    d.jogadores.forEach(function(j){ if(j.id===d.turnoAtualId) nomeVez = j.nome; });
    el.innerHTML = '<div class="eyebrow">Rodada '+d.rodadaNum+'</div><div class="wait">Aguardando '+nomeVez+' escolher um palpite…<br><span style="font-size:11px">'+usadosTxt+'</span></div>'+palitosRowHtml(d.jogadores);
  } else {
    var h2 = '<div class="eyebrow">Rodada '+d.rodadaNum+'</div>';
    h2 += '<div class="hint">Sua vez! Chute a soma total (não repita um número já usado)</div>';
    h2 += '<div class="hint">'+usadosTxt+'</div>';
    h2 += '<div class="guessRow"><button class="stepBtn" onclick="ajustarPalpite(-1,'+d.somaMaxima+',['+usados+'])">–</button>';
    h2 += '<div class="guessBox">'+meuPalpiteValor+'</div>';
    h2 += '<button class="stepBtn" onclick="ajustarPalpite(1,'+d.somaMaxima+',['+usados+'])">+</button></div>';
    h2 += '<button class="btn" onclick="enviarPalpite()">Confirmar palpite: '+meuPalpiteValor+'</button>';
    h2 += '<div class="hint">Vale de 0 a '+d.somaMaxima+'</div>';
    el.innerHTML = h2 + palitosRowHtml(d.jogadores);
  }
}

socket.on('rodada_iniciada', function(msg){
  var meuAtivo = true;
  msg.jogadores.forEach(function(j){ if(j.id===meuId) meuAtivo = j.ativo; });
  ultimoEstado = msg;
  var el = document.getElementById('conteudoJogo');
  if(!meuAtivo){
    el.innerHTML = '<div class="eyebrow">Rodada '+msg.rodadaNum+'</div><div class="wait safe">Você já tirou todos os palitos e está seguro 🛡️<br>Aguardando o resultado dos outros…</div>'+palitosRowHtml(msg.jogadores);
    return;
  }
  var meuRegistro = msg.jogadores.find(function(j){ return j.id===meuId; });
  var meusPalitos = meuRegistro ? meuRegistro.palitos : 3;
  var h = '<div class="eyebrow">Rodada '+msg.rodadaNum+'</div><div class="card"><div class="fist">✊</div><div class="choices">';
  for(var n=0;n<=meusPalitos;n++){ h += '<button class="choice" onclick="enviarTentos('+n+')">'+n+'</button>'; }
  h += '</div><div class="hint">Você tem '+meusPalitos+' palito(s)</div></div>'+palitosRowHtml(msg.jogadores);
  el.innerHTML = h;
});

socket.on('fase_palpite', function(msg){
  meuPalpiteValor = 0;
  ultimoEstado = msg;
  desenharPalpite(msg);
});

socket.on('proxima_vez', function(msg){
  meuPalpiteValor = 0;
  ultimoEstado.turnoAtualId = msg.turnoAtualId;
  ultimoEstado.numerosUsados = msg.numerosUsados;
  desenharPalpite(ultimoEstado);
});

socket.on('revelacao', function(msg){
  var el = document.getElementById('conteudoJogo');
  var h3 = '<div class="sumCard"><div class="sumLabel">Soma real da mesa</div><div class="sumValue">'+msg.somaReal+'</div></div>';
  msg.detalhes.forEach(function(det){
    var souEu = det.id===meuId;
    var sufixo = det.acertou ? ' · tirou 1! 🎯' : '';
    h3 += '<div class="revRow'+(det.acertou?' hit':'')+'"><div><div class="revName">'+(souEu?'EU':det.nome)+'</div>';
    h3 += '<div class="revGuess">chutou '+(det.palpite===null?0:det.palpite)+sufixo+'</div></div>';
    h3 += '<div class="revTentos">'+det.tentos+' 🥢</div></div>';
  });
  h3 += palitosRowHtml(msg.jogadores);
  if(msg.perdedor){
    h3 += '<div class="wait" style="border:1.5px solid #FFB627"><b>'+msg.perdedor+'</b> ficou com os palitos... perdeu! 😅</div>';
  } else {
    h3 += '<div class="hint">Aguardando o Adm iniciar a próxima rodada…</div>';
  }
  el.innerHTML = h3;
});

socket.on('voltar_lobby', function(){
  document.getElementById('conteudoJogo').innerHTML = '<div class="wait">Você está na sala!<br>Aguardando o Adm iniciar a partida…</div>';
});

socket.on('sala_encerrada', function(){
  document.getElementById('conteudoJogo').innerHTML = '<div class="wait">A sala foi encerrada pelo Adm.</div>';
});
</script></body></html>`;
}


// ── Estado das salas em memória ──
// salas[codigo] = {
//   codigo, quantidadeJogadores, nomeAdm,
//   jogadores: [{ id, nome, socketId, palitos, ativo }],
//   faseJogo: 'lobby'|'esconder'|'palpite'|'revelacao',
//   numeroRodada, inicioRodadaIndex,
//   tentos: {}, palpites: {}, numerosUsados: [],
//   ordemJogadores: [], ordemAtualIndex: 0, somaMaxima: 0,
//   ultimaRevelacao: null, perdedorFinal: null,
// }
const salas = {};

function gerarCodigoSala() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0/I/1 pra evitar confusão
  let codigo;
  do {
    codigo = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (salas[codigo]);
  return codigo;
}

function getAtivos(sala) {
  return sala.jogadores.filter((j) => j.ativo);
}

function getOrdemRodada(sala, ativos) {
  const n = ativos.length;
  const start = sala.inicioRodadaIndex % n;
  return [...ativos.slice(start), ...ativos.slice(0, start)];
}

function broadcastSala(sala, evento, payload) {
  const room = io.sockets.adapter.rooms.get(sala.codigo);
  const totalNaSala = room ? room.size : 0;
  console.log(`[broadcast] evento=${evento} sala=${sala.codigo} sockets_na_sala=${totalNaSala}`);
  io.to(sala.codigo).emit(evento, payload);
}

function estadoPublico(sala) {
  return {
    codigo: sala.codigo,
    quantidadeJogadores: sala.quantidadeJogadores,
    jogadores: sala.jogadores.map((j) => ({ id: j.id, nome: j.nome, palitos: j.palitos, ativo: j.ativo })),
    faseJogo: sala.faseJogo,
  };
}

function iniciarPartida(sala) {
  sala.jogadores.forEach((j) => {
    j.palitos = PALITOS_INICIAIS;
    j.ativo = true;
  });
  sala.inicioRodadaIndex = 0;
  sala.numeroRodada = 1;
  sala.tentos = {};
  sala.palpites = {};
  sala.numerosUsados = [];
  sala.faseJogo = 'esconder';
  sala.ultimaRevelacao = null;
  sala.perdedorFinal = null;

  broadcastSala(sala, 'rodada_iniciada', {
    rodadaNum: 1,
    jogadores: sala.jogadores.map((j) => ({ id: j.id, nome: j.nome, palitos: j.palitos, ativo: j.ativo })),
  });
}

function receberEsconderTentos(sala, jogadorId, valor) {
  const ativos = getAtivos(sala);
  const registro = ativos.find((j) => j.id === jogadorId);
  if (!registro) return;
  const valorValido = Math.max(0, Math.min(valor, registro.palitos));

  sala.tentos[jogadorId] = valorValido;

  const todosEsconderam = ativos.every((j) => sala.tentos[j.id] !== undefined);
  if (todosEsconderam) {
    const max = ativos.reduce((soma, j) => soma + j.palitos, 0);
    sala.somaMaxima = max;
    sala.palpites = {};
    sala.numerosUsados = [];
    sala.ordemJogadores = getOrdemRodada(sala, ativos);
    sala.ordemAtualIndex = 0;
    const primeiroId = sala.ordemJogadores[0].id;
    sala.turnoAtualId = primeiroId;
    sala.faseJogo = 'palpite';

    broadcastSala(sala, 'fase_palpite', {
      somaMaxima: max,
      turnoAtualId: primeiroId,
      numerosUsados: [],
      jogadores: sala.jogadores.map((j) => ({ id: j.id, nome: j.nome, palitos: j.palitos, ativo: j.ativo })),
    });
  }
}

function receberPalpite(sala, jogadorId, valor) {
  const ordem = sala.ordemJogadores || [];
  const jogadorDaVez = ordem[sala.ordemAtualIndex];
  if (!jogadorDaVez || jogadorDaVez.id !== jogadorId) return 'fora_de_turno';
  if (sala.numerosUsados.includes(valor)) return 'numero_usado';
  if (valor < 0 || valor > sala.somaMaxima) return 'fora_do_alcance';

  sala.palpites[jogadorId] = valor;
  sala.numerosUsados.push(valor);

  const proximoIndex = sala.ordemAtualIndex + 1;
  if (proximoIndex >= ordem.length) {
    processarRevelacao(sala);
  } else {
    sala.ordemAtualIndex = proximoIndex;
    const proximoId = ordem[proximoIndex].id;
    sala.turnoAtualId = proximoId;
    broadcastSala(sala, 'proxima_vez', { turnoAtualId: proximoId, numerosUsados: sala.numerosUsados });
  }
  return 'ok';
}

function processarRevelacao(sala) {
  const ativos = getAtivos(sala);
  const somaReal = ativos.reduce((soma, j) => soma + (sala.tentos[j.id] || 0), 0);

  const detalhes = ativos.map((j) => ({
    id: j.id,
    nome: j.nome,
    tentos: sala.tentos[j.id] || 0,
    palpite: sala.palpites[j.id] ?? null,
    acertou: sala.palpites[j.id] === somaReal,
  }));

  const vencedorRodada = detalhes.find((d) => d.acertou) || null;

  if (vencedorRodada) {
    const jogador = sala.jogadores.find((j) => j.id === vencedorRodada.id);
    if (jogador) {
      jogador.palitos = Math.max(0, jogador.palitos - 1);
      jogador.ativo = jogador.palitos > 0;
    }
  }

  sala.ultimaRevelacao = { somaReal, detalhes };
  sala.faseJogo = 'revelacao';

  const aindaAtivos = sala.jogadores.filter((j) => j.ativo);
  let nomePerdedor = null;
  if (aindaAtivos.length <= 1) {
    nomePerdedor = aindaAtivos[0]?.nome || null;
    if (nomePerdedor) sala.perdedorFinal = nomePerdedor;
  }

  broadcastSala(sala, 'revelacao', {
    somaReal,
    detalhes,
    jogadores: sala.jogadores.map((j) => ({ id: j.id, nome: j.nome, palitos: j.palitos, ativo: j.ativo })),
    perdedor: nomePerdedor,
  });
}

function proximaRodada(sala) {
  const n = getAtivos(sala).length || 1;
  sala.inicioRodadaIndex = (sala.inicioRodadaIndex + 1) % n;
  sala.numeroRodada += 1;
  sala.tentos = {};
  sala.palpites = {};
  sala.numerosUsados = [];
  sala.ultimaRevelacao = null;
  sala.faseJogo = 'esconder';

  broadcastSala(sala, 'rodada_iniciada', {
    rodadaNum: sala.numeroRodada,
    jogadores: sala.jogadores.map((j) => ({ id: j.id, nome: j.nome, palitos: j.palitos, ativo: j.ativo })),
  });
}

// ── Conexões Socket.io ──
function gerarToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function estadoCompleto(sala) {
  return {
    fase: sala.faseJogo,
    rodadaNum: sala.numeroRodada,
    jogadores: sala.jogadores.map((j) => ({ id: j.id, nome: j.nome, palitos: j.palitos, ativo: j.ativo })),
    somaMaxima: sala.somaMaxima,
    turnoAtualId: sala.turnoAtualId,
    numerosUsados: sala.numerosUsados,
    ultimaRevelacao: sala.ultimaRevelacao,
    perdedorFinal: sala.perdedorFinal,
  };
}

io.on('connection', (socket) => {
  let codigoSalaAtual = null;
  let meuJogadorId = null;

  socket.on('criar_sala', ({ nomeAdm, quantidadeJogadores }, callback) => {
    const codigo = gerarCodigoSala();
    const token = gerarToken();
    const adm = { id: ADM_ID, nome: nomeAdm || 'Adm', socketId: socket.id, palitos: PALITOS_INICIAIS, ativo: true, token };

    salas[codigo] = {
      codigo,
      quantidadeJogadores: quantidadeJogadores || 4,
      jogadores: [adm],
      faseJogo: 'lobby',
      numeroRodada: 1,
      inicioRodadaIndex: 0,
      tentos: {},
      palpites: {},
      numerosUsados: [],
      ordemJogadores: [],
      ordemAtualIndex: 0,
      somaMaxima: 0,
      ultimaRevelacao: null,
      perdedorFinal: null,
      turnoAtualId: null,
      timersRemocao: {},
    };

    codigoSalaAtual = codigo;
    meuJogadorId = ADM_ID;
    socket.join(codigo);

    console.log(`[criar_sala] sala ${codigo} criada por ${nomeAdm}, socketId=${socket.id}`);
    callback({ ok: true, codigo, meuId: ADM_ID, token, estado: estadoPublico(salas[codigo]) });
  });

  socket.on('reconectar', ({ codigo, token }, callback) => {
    const sala = salas[codigo];
    if (!sala) {
      if (callback) callback({ ok: false, erro: 'sala_nao_encontrada' });
      return;
    }
    const jogador = sala.jogadores.find((j) => j.token === token);
    if (!jogador) {
      if (callback) callback({ ok: false, erro: 'jogador_nao_encontrado' });
      return;
    }

    // Cancela remoção pendente, se houver
    if (sala.timersRemocao[jogador.id]) {
      clearTimeout(sala.timersRemocao[jogador.id]);
      delete sala.timersRemocao[jogador.id];
    }

    jogador.socketId = socket.id;
    codigoSalaAtual = codigo;
    meuJogadorId = jogador.id;
    socket.join(codigo);

    if (callback) callback({ ok: true, codigo, meuId: jogador.id, estado: estadoCompleto(sala) });
  });

  socket.on('entrar_sala', ({ codigo, nome }, callback) => {
    console.log(`[entrar_sala] tentativa: codigo=${codigo} nome=${nome} socketId=${socket.id}`);
    const sala = salas[codigo];
    if (!sala) {
      console.log(`[entrar_sala] sala ${codigo} não encontrada. Salas existentes: ${Object.keys(salas).join(', ')}`);
      callback({ ok: false, erro: 'sala_nao_encontrada' });
      return;
    }
    if (sala.jogadores.length >= sala.quantidadeJogadores) {
      callback({ ok: false, erro: 'sala_cheia' });
      return;
    }

    const id = `p_${socket.id}`;
    const token = gerarToken();
    const jogador = { id, nome: nome || 'Jogador', socketId: socket.id, palitos: PALITOS_INICIAIS, ativo: true, token };
    sala.jogadores.push(jogador);

    codigoSalaAtual = codigo;
    meuJogadorId = id;
    socket.join(codigo);

    console.log(`[entrar_sala] ${nome} entrou na sala ${codigo}. Total jogadores agora: ${sala.jogadores.length}. Emitindo jogadores_atualizados pra sala ${codigo}...`);

    callback({ ok: true, codigo, meuId: id, token, estado: estadoPublico(sala) });
    broadcastSala(sala, 'jogadores_atualizados', estadoPublico(sala));
  });

  socket.on('iniciar_partida', () => {
    const sala = salas[codigoSalaAtual];
    if (!sala || meuJogadorId !== ADM_ID) return;
    iniciarPartida(sala);
  });

  socket.on('esconder_tentos', ({ valor }) => {
    const sala = salas[codigoSalaAtual];
    if (!sala || !meuJogadorId) return;
    receberEsconderTentos(sala, meuJogadorId, valor);
  });

  socket.on('palpite', ({ valor }, callback) => {
    const sala = salas[codigoSalaAtual];
    if (!sala || !meuJogadorId) return;
    const resultado = receberPalpite(sala, meuJogadorId, valor);
    if (callback) callback({ ok: resultado === 'ok', motivo: resultado });
  });

  socket.on('proxima_rodada', () => {
    const sala = salas[codigoSalaAtual];
    if (!sala || meuJogadorId !== ADM_ID) return;
    proximaRodada(sala);
  });

  socket.on('voltar_lobby', () => {
    const sala = salas[codigoSalaAtual];
    if (!sala || meuJogadorId !== ADM_ID) return;
    sala.faseJogo = 'lobby';
    sala.ultimaRevelacao = null;
    sala.perdedorFinal = null;
    broadcastSala(sala, 'voltar_lobby', {});
  });

  socket.on('disconnect', () => {
    const sala = salas[codigoSalaAtual];
    if (!sala || !meuJogadorId) return;

    const jogadorId = meuJogadorId;
    const codigo = codigoSalaAtual;

    // Dá 25s de tolerância pra reconectar antes de encerrar/remover de vez
    sala.timersRemocao[jogadorId] = setTimeout(() => {
      const salaAtual = salas[codigo];
      if (!salaAtual) return;

      if (jogadorId === ADM_ID) {
        broadcastSala(salaAtual, 'sala_encerrada', {});
        delete salas[codigo];
      } else {
        salaAtual.jogadores = salaAtual.jogadores.filter((j) => j.id !== jogadorId);
        broadcastSala(salaAtual, 'jogadores_atualizados', estadoPublico(salaAtual));
      }
    }, 25000);
  });
});

server.listen(PORT, () => {
  console.log(`TentaSorte server rodando na porta ${PORT}`);
});