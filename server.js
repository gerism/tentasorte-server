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
io.on('connection', (socket) => {
  let codigoSalaAtual = null;
  let meuJogadorId = null;

  socket.on('criar_sala', ({ nomeAdm, quantidadeJogadores }, callback) => {
    const codigo = gerarCodigoSala();
    const adm = { id: ADM_ID, nome: nomeAdm || 'Adm', socketId: socket.id, palitos: PALITOS_INICIAIS, ativo: true };

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
    };

    codigoSalaAtual = codigo;
    meuJogadorId = ADM_ID;
    socket.join(codigo);

    callback({ ok: true, codigo, meuId: ADM_ID, estado: estadoPublico(salas[codigo]) });
  });

  socket.on('entrar_sala', ({ codigo, nome }, callback) => {
    const sala = salas[codigo];
    if (!sala) {
      callback({ ok: false, erro: 'sala_nao_encontrada' });
      return;
    }
    if (sala.jogadores.length >= sala.quantidadeJogadores) {
      callback({ ok: false, erro: 'sala_cheia' });
      return;
    }

    const id = `p_${socket.id}`;
    const jogador = { id, nome: nome || 'Jogador', socketId: socket.id, palitos: PALITOS_INICIAIS, ativo: true };
    sala.jogadores.push(jogador);

    codigoSalaAtual = codigo;
    meuJogadorId = id;
    socket.join(codigo);

    callback({ ok: true, codigo, meuId: id, estado: estadoPublico(sala) });
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
    if (!sala) return;

    if (meuJogadorId === ADM_ID) {
      // Adm saiu: encerra a sala pra todos
      broadcastSala(sala, 'sala_encerrada', {});
      delete salas[codigoSalaAtual];
    } else {
      sala.jogadores = sala.jogadores.filter((j) => j.id !== meuJogadorId);
      broadcastSala(sala, 'jogadores_atualizados', estadoPublico(sala));
    }
  });
});

server.listen(PORT, () => {
  console.log(`TentaSorte server rodando na porta ${PORT}`);
});