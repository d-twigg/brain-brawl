import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { QUESTION_BANK, QUESTION_POOLS } from "./question-bank.mjs";
import { SKI_QUESTION_BANK } from "./ski-question-bank.mjs";

const PORT = Number(process.env.PORT || 4173);
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const rooms = new Map();
const COLORS = ["#ff5c7a", "#5ce1e6", "#ffd166", "#9b7bff", "#7bea8a", "#ff9f43", "#ff78d2", "#69a7ff"];

const QUESTIONS = [
  { round: 1, type: "buzz", prompt: "Name the ocean", clues: ["I cover more area than all land on Earth combined.", "The Mariana Trench is inside me.", "I touch Asia, Australia, and the Americas.", "I am Earth's largest ocean."], answers: ["pacific", "pacific ocean", "the pacific"], displayAnswer: "The Pacific Ocean", duration: 19000 },
  { round: 1, type: "buzz", prompt: "Name the element", clues: ["I am a naturally yellow metal that resists tarnishing.", "My atomic number is 79.", "My chemical symbol is Au.", "Olympic champions wear me."], answers: ["gold"], displayAnswer: "Gold", duration: 19000 },
  { round: 1, type: "order", prompt: "Order these planets from closest to farthest from the Sun.", items: ["Mars", "Jupiter", "Mercury", "Venus"], correct: ["Mercury", "Venus", "Mars", "Jupiter"], displayAnswer: "Mercury → Venus → Mars → Jupiter", duration: 22000 },
  { round: 1, type: "connection", prompt: "What connects these clues?", clues: ["A Roman messenger god", "A planet", "The symbol Hg", "The singer who fronted Queen"], answers: ["mercury"], displayAnswer: "Mercury", duration: 19000 },
  { round: 1, type: "slider", prompt: "How many bones are in a typical adult human body?", min: 0, max: 400, step: 1, target: 206, unit: "bones", displayAnswer: "206 bones", duration: 18000 },

  { round: 2, type: "buzz", prompt: "Name the scientist", clues: ["My laboratory work made me famous, but long exposure to radiation damaged my health.", "I researched radioactivity.", "I discovered polonium and radium.", "I was the first person to win two Nobel Prizes."], answers: ["marie curie", "curie"], displayAnswer: "Marie Curie", duration: 18000 },
  { round: 2, type: "slider", prompt: "About what percentage of Earth's surface is covered by water?", min: 0, max: 100, step: 1, target: 71, unit: "%", displayAnswer: "About 71%", duration: 16000 },
  { round: 2, type: "connection", prompt: "What connects these clues?", clues: ["A queen", "A worker", "A drone", "A hive"], answers: ["bee", "bees", "honey bee", "honey bees"], displayAnswer: "Bees", duration: 18000 },
  { round: 2, type: "order", prompt: "Order these inventions from earliest to latest.", items: ["Airplane", "Printing press", "World Wide Web", "Telephone"], correct: ["Printing press", "Telephone", "Airplane", "World Wide Web"], displayAnswer: "Printing press → Telephone → Airplane → World Wide Web", duration: 20000 },
  { round: 2, type: "buzz", prompt: "Name the animal", clues: ["I am a stocky Australian marsupial known for digging large burrows.", "My pouch faces backward.", "I can run surprisingly fast.", "My poop is famously cube-shaped."], answers: ["wombat", "wombats"], displayAnswer: "Wombat", duration: 18000 },

  { round: 3, type: "connection", prompt: "Final connection: what material links these clues?", clues: ["An eraser", "A car tire", "A raincoat", "A condom"], answers: ["rubber", "latex"], displayAnswer: "Rubber", duration: 16000 },
  { round: 3, type: "order", prompt: "Final geography: order these continents from smallest to largest.", items: ["South America", "Australia", "Antarctica", "Europe"], correct: ["Australia", "Europe", "Antarctica", "South America"], displayAnswer: "Australia → Europe → Antarctica → South America", duration: 18000 },
  { round: 3, type: "buzz", prompt: "Final clue race: name the city", clues: ["I am a major city split between Europe and Asia.", "The Bosphorus runs through me.", "I was once called Constantinople.", "I am Turkey's largest city."], answers: ["istanbul"], displayAnswer: "Istanbul", duration: 16000 },
  { round: 3, type: "slider", prompt: "About how many kilometers away is the Moon from Earth on average?", min: 0, max: 800000, step: 1000, target: 384000, unit: "km", displayAnswer: "About 384,000 km", duration: 18000 },
  { round: 3, type: "buzz", prompt: "Final clue race: name the body part", clues: ["I am the human body's largest organ and cover roughly two square meters in an adult.", "I help regulate temperature.", "I constantly shed and replace cells.", "Tattoos place ink inside me."], answers: ["skin", "the skin"], displayAnswer: "Skin", duration: 16000 }
];

const REMATCH_QUESTIONS = [
  { round: 1, type: "buzz", prompt: "Name the desert", clues: ["I am a desert larger than Europe and covered almost entirely in ice.", "Most of my surface is ice rather than sand.", "I surround the South Pole.", "I am the world's largest desert."], answers: ["antarctica", "antarctic", "antarctic desert"], displayAnswer: "Antarctica", duration: 19000 },
  { round: 1, type: "buzz", prompt: "Name the element", clues: ["Every breath brings me into your lungs, although I am not the most common gas in air.", "My atomic number is 8.", "I make up about 21% of Earth's atmosphere.", "Humans need me to breathe."], answers: ["oxygen"], displayAnswer: "Oxygen", duration: 19000 },
  { round: 1, type: "order", prompt: "Put these events in chronological order.", items: ["World Wide Web", "Moon landing", "Euro introduced", "Berlin Wall falls"], correct: ["Moon landing", "Berlin Wall falls", "World Wide Web", "Euro introduced"], displayAnswer: "Moon landing → Berlin Wall falls → World Wide Web → Euro introduced", duration: 22000 },
  { round: 1, type: "connection", prompt: "What connects these clues?", clues: ["A book of maps", "A Titan carrying the sky", "The top neck vertebra", "A collection of charts"], answers: ["atlas", "an atlas"], displayAnswer: "Atlas", duration: 19000 },
  { round: 1, type: "slider", prompt: "How many countries are in Africa?", min: 0, max: 100, step: 1, target: 54, unit: "countries", displayAnswer: "54 countries", duration: 18000 },

  { round: 2, type: "buzz", prompt: "Name the mathematician", clues: ["My published notes described an algorithm for a mechanical computer that was never completed.", "My father was the poet Lord Byron.", "I worked with Charles Babbage's Analytical Engine.", "I am often called the first computer programmer."], answers: ["ada lovelace", "lovelace"], displayAnswer: "Ada Lovelace", duration: 18000 },
  { round: 2, type: "slider", prompt: "About how many meters tall is Mount Everest?", min: 0, max: 15000, step: 1, target: 8849, unit: "meters", displayAnswer: "About 8,849 meters", duration: 16000 },
  { round: 2, type: "connection", prompt: "What connects these terms?", clues: ["Tundra", "Taiga", "Savanna", "Tropical rainforest"], answers: ["biome", "biomes", "ecosystem", "ecosystems"], displayAnswer: "Biomes", duration: 18000 },
  { round: 2, type: "order", prompt: "Order these oceans from smallest to largest.", items: ["Atlantic", "Arctic", "Indian", "Southern"], correct: ["Arctic", "Southern", "Indian", "Atlantic"], displayAnswer: "Arctic → Southern → Indian → Atlantic", duration: 20000 },
  { round: 2, type: "buzz", prompt: "Name the animal", clues: ["I am a mammal that lays eggs.", "I have a duck-like bill.", "Males have venomous ankle spurs.", "I am native to eastern Australia."], answers: ["platypus", "duck billed platypus", "duck-billed platypus"], displayAnswer: "Platypus", duration: 18000 },

  { round: 3, type: "connection", prompt: "Final connection: what links these clues?", clues: ["A keyboard key", "Houdini", "A fire route", "A prisoner's goal"], answers: ["escape", "an escape", "escaping"], displayAnswer: "Escape", duration: 16000 },
  { round: 3, type: "order", prompt: "Final space test: order these planets from smallest to largest.", items: ["Earth", "Mercury", "Venus", "Mars"], correct: ["Mercury", "Mars", "Venus", "Earth"], displayAnswer: "Mercury → Mars → Venus → Earth", duration: 18000 },
  { round: 3, type: "buzz", prompt: "Final clue race: name the country", clues: ["I am a volcanic island nation where the Mid-Atlantic Ridge rises above the ocean.", "I use geothermal energy extensively.", "My capital is Reykjavík.", "I am known as the land of fire and ice."], answers: ["iceland"], displayAnswer: "Iceland", duration: 16000 },
  { round: 3, type: "slider", prompt: "How many hearts does an octopus have?", min: 0, max: 10, step: 1, target: 3, unit: "hearts", displayAnswer: "3 hearts", duration: 18000 },
  { round: 3, type: "buzz", prompt: "Final clue race: name the language", clues: ["I use thousands of characters rather than an alphabet and have more native speakers than any other language.", "My writing system includes simplified and traditional forms.", "I use tones to distinguish meaning.", "I am the official language of China."], answers: ["mandarin", "mandarin chinese", "chinese"], displayAnswer: "Mandarin Chinese", duration: 16000 }
];

const QUESTION_SETS = [QUESTIONS, REMATCH_QUESTIONS];

const SUDDEN_DEATH = [
  { round: 4, type: "buzz", prompt: "Sudden death: name the organ", clues: ["I weigh roughly three pounds in an adult.", "I contain two hemispheres.", "I use about 20% of the body's energy."], answers: ["brain", "the brain"], displayAnswer: "The brain", duration: 15000 },
  { round: 4, type: "connection", prompt: "Sudden death: find the connection", clues: ["A fingerprint", "A snowflake", "A QR code", "Your deeply questionable search history"], answers: ["unique", "uniqueness", "one of a kind", "individual"], displayAnswer: "Each is unique", duration: 15000 },
  { round: 4, type: "buzz", prompt: "Sudden death: name the country", clues: ["I have three capital cities.", "I completely surround Lesotho.", "I sit at Africa's southern tip."], answers: ["south africa"], displayAnswer: "South Africa", duration: 15000 }
];

function code() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let value = "";
  do value = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  while (rooms.has(value));
  return value;
}

function token() { return randomBytes(24).toString("hex"); }
function cleanName(value) { return String(value || "").trim().replace(/\s+/g, " ").slice(0, 18); }
function normalizeAnswer(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

function isAccepted(value, answers) {
  const submitted = normalizeAnswer(value);
  return answers.some(answer => {
    const expected = normalizeAnswer(answer);
    if (submitted === expected) return true;
    const allowance = expected.length >= 12 ? 2 : expected.length >= 5 ? 1 : 0;
    return allowance > 0 && editDistance(submitted, expected) <= allowance;
  });
}

function makePlayer(name, index, isHost = false) {
  return { id: randomUUID(), token: token(), name, color: COLORS[index % COLORS.length], score: 0, isHost, connected: true, locked: false, buzzedAt: null, answerDeadline: null, submitted: null, callUsed: false, callArmed: false };
}

const SLOT_TYPES = ["buzz", "buzz", "order", "connection", "slider", "buzz", "slider", "connection", "order", "buzz", "connection", "order", "buzz", "slider", "buzz"];
const GAME_MODES = {
  general: { name: "General Knowledge", bank: QUESTION_BANK },
  ski: { name: "Ski & Snowboard", bank: SKI_QUESTION_BANK }
};
const VALID_QUESTION_IDS = new Set([...QUESTION_BANK, ...SKI_QUESTION_BANK].map(question => question.id));

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = randomBytes(4).readUInt32BE(0) % (index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function buildQuestionLineup(seenQuestionIds = [], mode = "general") {
  const seen = new Set(Array.isArray(seenQuestionIds) ? seenQuestionIds.map(String) : []);
  if (mode === "ski") {
    const available = SKI_QUESTION_BANK.filter(question => !seen.has(question.id));
    if (available.length < 15) return null;
    return shuffled(available).slice(0, 15).map((question, index) => ({ ...question, round: Math.floor(index / 5) + 1 }));
  }
  const needed = { buzz: 6, connection: 3, order: 3, slider: 3 };
  const selected = {};
  for (const [type, count] of Object.entries(needed)) {
    const available = QUESTION_POOLS[type].filter(question => !seen.has(question.id));
    if (available.length < count) return null;
    selected[type] = shuffled(available).slice(0, count);
  }
  return SLOT_TYPES.map((type, index) => ({ ...selected[type].shift(), round: Math.floor(index / 5) + 1 }));
}

function makeRoom(hostName, seenQuestionIds = []) {
  const host = makePlayer(hostName, 0, true);
  let mode = "general";
  let questions = buildQuestionLineup(seenQuestionIds, mode);
  if (!questions) {
    mode = "ski";
    questions = buildQuestionLineup(seenQuestionIds, mode);
  }
  if (!questions) return null;
  const selectedIds = questions.map(question => question.id);
  const room = { code: code(), hostId: host.id, phase: "lobby", mode, questionIds: selectedIds, seenQuestionIds: new Set(seenQuestionIds.map(String)), questions, questionIndex: -1, suddenIndex: -1, suddenQuestion: null, suddenMode: false, tieIds: null, questionStartedAt: null, questionEndsAt: null, pausedAt: null, activeResponderId: null, winnerId: null, result: null, createdAt: Date.now(), players: new Map([[host.id, host]]), clients: new Map(), lastSecond: null };
  rooms.set(room.code, room);
  return { room, host };
}

function auth(room, playerId, playerToken) {
  const player = room?.players.get(playerId);
  return player && player.token === playerToken ? player : null;
}

function publicQuestion(room) {
  if (room.questionIndex < 0) return null;
  const q = currentQuestion(room);
  const base = { index: room.suddenMode ? `s${room.suddenIndex}` : `${room.questionIds[0]}-${room.questionIndex}`, number: room.suddenMode ? "SD" : room.questionIndex + 1, total: questionSet(room).length, round: q.round, type: q.type, prompt: q.prompt, startedAt: room.questionStartedAt, endsAt: room.questionEndsAt, pausedAt: room.pausedAt, responderId: room.activeResponderId, duration: q.duration };
  if (q.type === "buzz" || q.type === "connection") return { ...base, clues: q.clues, clueEvery: Math.floor(q.duration / (q.clues.length + 1)) };
  if (q.type === "order") return { ...base, items: q.items };
  return { ...base, min: q.min, max: q.max, step: q.step, unit: q.unit };
}

function currentQuestion(room) {
  return room.suddenMode ? room.suddenQuestion : questionSet(room)[room.questionIndex];
}

function questionSet(room) {
  return room.questions;
}

function stateFor(room, viewerId) {
  const viewer = room.players.get(viewerId);
  const modeBank = GAME_MODES[room.mode].bank;
  return {
    code: room.code,
    phase: room.phase,
    mode: room.mode,
    modeName: GAME_MODES[room.mode].name,
    modes: Object.entries(GAME_MODES).map(([id, value]) => ({ id, name: value.name, remaining: value.bank.filter(question => !room.seenQuestionIds.has(question.id)).length })),
    questionIds: room.phase === "lobby" ? [] : room.questionIds,
    bankRemaining: modeBank.filter(question => !room.seenQuestionIds.has(question.id)).length,
    hostId: room.hostId,
    now: Date.now(),
    question: publicQuestion(room),
    me: viewer ? { id: viewer.id, name: viewer.name, isHost: viewer.isHost, locked: viewer.locked, buzzedAt: viewer.buzzedAt, answerDeadline: viewer.answerDeadline, submitted: viewer.submitted !== null, callUsed: viewer.callUsed, callArmed: viewer.callArmed } : null,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, color: p.color, score: p.score, isHost: p.isHost, connected: p.connected, locked: room.phase === "question" ? p.locked : false, submitted: room.phase === "question" ? p.submitted !== null : false })),
    result: room.phase === "reveal" ? room.result : null,
    standings: room.phase === "finished" ? [...room.players.values()].sort((a, b) => b.score - a.score).map(p => ({ id: p.id, name: p.name, color: p.color, score: p.score })) : null
  };
}

function sendEvent(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(room) {
  for (const [playerId, clients] of room.clients) {
    for (const res of clients) sendEvent(res, "state", stateFor(room, playerId));
  }
}

function resetQuestionPlayerState(room) {
  for (const p of room.players.values()) {
    p.locked = false;
    p.buzzedAt = null;
    p.answerDeadline = null;
    p.submitted = null;
  }
}

function startQuestion(room, index, sudden = false) {
  room.suddenMode = sudden;
  if (sudden) room.suddenIndex = index;
  room.questionIndex = index;
  room.phase = "question";
  room.winnerId = null;
  room.result = null;
  room.pausedAt = null;
  room.activeResponderId = null;
  resetQuestionPlayerState(room);
  if (sudden && room.tieIds) {
    for (const p of room.players.values()) if (!room.tieIds.includes(p.id)) p.locked = true;
  }
  room.questionStartedAt = Date.now() + 2200;
  room.questionEndsAt = room.questionStartedAt + currentQuestion(room).duration;
  room.lastSecond = null;
  broadcast(room);
}

function startSuddenQuestion(room) {
  const suddenPool = room.mode === "ski" ? SKI_QUESTION_BANK : [...QUESTION_POOLS.buzz, ...QUESTION_POOLS.connection];
  const available = shuffled(suddenPool.filter(question => !room.seenQuestionIds.has(question.id)));
  if (!available.length) return false;
  room.suddenQuestion = { ...available[0], round: 4 };
  room.seenQuestionIds.add(room.suddenQuestion.id);
  room.questionIds.push(room.suddenQuestion.id);
  startQuestion(room, room.suddenIndex + 1, true);
  return true;
}

function resumeQuestion(room) {
  if (!room.pausedAt) return;
  const pausedFor = Date.now() - room.pausedAt;
  room.questionStartedAt += pausedFor;
  room.questionEndsAt += pausedFor;
  room.pausedAt = null;
  room.activeResponderId = null;
}

function scoreOrder(submitted, correct) {
  return submitted.reduce((score, item, index) => score + (item === correct[index] ? 1 : 0), 0);
}

function resolveQuestion(room, forcedWinnerId = null, winningAnswer = null) {
  if (room.phase !== "question") return;
  const q = currentQuestion(room);
  let winner = forcedWinnerId ? room.players.get(forcedWinnerId) : null;
  let response = winningAnswer;
  let accuracy = null;

  if (!winner && (q.type === "order" || q.type === "slider")) {
    const entries = [...room.players.values()].filter(p => p.submitted !== null);
    entries.sort((a, b) => {
      const aa = q.type === "order" ? scoreOrder(a.submitted.value, q.correct) : -Math.abs(a.submitted.value - q.target);
      const bb = q.type === "order" ? scoreOrder(b.submitted.value, q.correct) : -Math.abs(b.submitted.value - q.target);
      return bb - aa || a.submitted.at - b.submitted.at;
    });
    winner = entries[0] || null;
    if (winner) {
      response = winner.submitted.value;
      accuracy = q.type === "order" ? `${scoreOrder(response, q.correct)}/${q.correct.length} positions exact` : `${Math.abs(response - q.target)} away`;
    }
  }

  const points = room.suddenMode ? 1 : q.round === 3 ? 2 : 1;
  const calls = [];
  for (const p of room.players.values()) {
    if (p.callArmed) {
      const success = p.id === winner?.id;
      calls.push({ id: p.id, name: p.name, success });
      p.callArmed = false;
      p.callUsed = true;
      if (success) p.score += 1;
    }
  }
  if (winner) winner.score += points;

  room.phase = "reveal";
  room.winnerId = winner?.id || null;
  room.result = { winnerId: winner?.id || null, winnerName: winner?.name || null, answer: q.displayAnswer, response, points, accuracy, calls, isLast: room.suddenMode ? Boolean(winner) : room.questionIndex === questionSet(room).length - 1, sudden: room.suddenMode };
  broadcast(room);
}

function allPlayersDone(room) {
  return [...room.players.values()].filter(p => p.connected).every(p => p.submitted !== null);
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 100_000) throw new Error("Request too large");
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function json(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}

function fail(res, status, message) { json(res, status, { error: message }); }

async function api(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/rooms") {
    const data = await body(req);
    const name = cleanName(data.name);
    if (!name) return fail(res, 400, "Enter a nickname.");
    const seenQuestionIds = data.resetHistory ? [] : Array.isArray(data.seenQuestionIds) ? data.seenQuestionIds.map(String).filter(id => VALID_QUESTION_IDS.has(id)) : [];
    const created = makeRoom(name, seenQuestionIds);
    if (!created) return json(res, 409, { error: "You've reached the end of both question banks. Reset your question history to play again.", code: "QUESTION_BANK_EXHAUSTED" });
    const { room, host } = created;
    return json(res, 201, { code: room.code, playerId: host.id, token: host.token });
  }

  const match = url.pathname.match(/^\/api\/rooms\/([A-Z]{4})(?:\/(.*))?$/);
  if (!match) return fail(res, 404, "Not found.");
  const room = rooms.get(match[1]);
  if (!room) return fail(res, 404, "That room does not exist.");
  const action = match[2] || "";

  if (req.method === "POST" && action === "join") {
    if (room.phase !== "lobby") return fail(res, 409, "That game has already started.");
    if (room.players.size >= 8) return fail(res, 409, "That room is full.");
    const data = await body(req);
    const name = cleanName(data.name);
    if (!name) return fail(res, 400, "Enter a nickname.");
    if ([...room.players.values()].some(p => p.name.toLowerCase() === name.toLowerCase())) return fail(res, 409, "That nickname is already taken.");
    const player = makePlayer(name, room.players.size);
    room.players.set(player.id, player);
    broadcast(room);
    return json(res, 201, { code: room.code, playerId: player.id, token: player.token });
  }

  const playerId = url.searchParams.get("playerId") || req.headers["x-player-id"];
  const playerToken = url.searchParams.get("token") || req.headers["x-player-token"];
  const player = auth(room, playerId, playerToken);
  if (!player) return fail(res, 401, "Invalid player session.");

  if (req.method === "GET" && action === "events") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "x-accel-buffering": "no" });
    sendEvent(res, "state", stateFor(room, player.id));
    const set = room.clients.get(player.id) || new Set();
    set.add(res);
    room.clients.set(player.id, set);
    player.connected = true;
    broadcast(room);
    req.on("close", () => {
      set.delete(res);
      if (!set.size) {
        room.clients.delete(player.id);
        player.connected = false;
        broadcast(room);
      }
    });
    return;
  }

  if (req.method !== "POST") return fail(res, 405, "Method not allowed.");
  const data = await body(req);

  if (action === "mode") {
    if (!player.isHost) return fail(res, 403, "Only the host can choose the game mode.");
    if (room.phase !== "lobby") return fail(res, 409, "Choose a mode before the game starts.");
    if (!GAME_MODES[data.mode]) return fail(res, 400, "Choose a valid game mode.");
    const questions = buildQuestionLineup([...room.seenQuestionIds], data.mode);
    if (!questions) return json(res, 409, { error: `There are not enough unseen ${GAME_MODES[data.mode].name} questions for another game. Reset your question history to play this mode again.`, code: "QUESTION_BANK_EXHAUSTED" });
    room.mode = data.mode;
    room.questions = questions;
    room.questionIds = questions.map(question => question.id);
    broadcast(room);
    return json(res, 200, { ok: true });
  }

  if (action === "start") {
    if (!player.isHost) return fail(res, 403, "Only the host can start.");
    if (room.phase !== "lobby") return fail(res, 409, "The game has already started.");
    if (room.players.size < 2) return fail(res, 409, "At least two players are required.");
    for (const id of room.questionIds) room.seenQuestionIds.add(id);
    startQuestion(room, 0);
    return json(res, 200, { ok: true });
  }

  if (action === "next") {
    if (!player.isHost) return fail(res, 403, "Only the host can continue.");
    if (room.phase !== "reveal") return fail(res, 409, "The round is not ready.");
    if (room.suddenMode) {
      if (room.winnerId) {
        room.phase = "finished";
        room.result = null;
        broadcast(room);
      } else if (!startSuddenQuestion(room)) return fail(res, 409, "No unseen sudden-death questions remain.");
    } else if (room.questionIndex >= questionSet(room).length - 1) {
      const ranked = [...room.players.values()].sort((a, b) => b.score - a.score);
      const tied = ranked.filter(p => p.score === ranked[0].score);
      if (tied.length > 1) {
        room.tieIds = tied.map(p => p.id);
        if (!startSuddenQuestion(room)) return fail(res, 409, "No unseen sudden-death questions remain.");
      } else {
        room.phase = "finished";
        room.result = null;
        broadcast(room);
      }
    } else startQuestion(room, room.questionIndex + 1);
    return json(res, 200, { ok: true });
  }

  if (action === "rematch") {
    if (!player.isHost) return fail(res, 403, "Only the host can start a rematch.");
    if (room.phase !== "finished") return fail(res, 409, "Finish the current game first.");
    let questions = buildQuestionLineup(data.resetHistory ? [] : [...room.seenQuestionIds], room.mode);
    if (!questions) return json(res, 409, { error: `You've reached the end of the ${GAME_MODES[room.mode].name} question bank. Reset your question history to play again.`, code: "QUESTION_BANK_EXHAUSTED" });
    if (data.resetHistory) room.seenQuestionIds = new Set();
    room.phase = "lobby";
    room.questions = questions;
    room.questionIds = questions.map(question => question.id);
    room.questionIndex = -1;
    room.suddenIndex = -1;
    room.suddenQuestion = null;
    room.suddenMode = false;
    room.tieIds = null;
    room.result = null;
    room.winnerId = null;
    room.pausedAt = null;
    room.activeResponderId = null;
    for (const p of room.players.values()) {
      p.score = 0;
      p.callUsed = false;
      p.callArmed = false;
    }
    resetQuestionPlayerState(room);
    broadcast(room);
    return json(res, 200, { ok: true });
  }

  if (action === "call") {
    if (!(room.phase === "lobby" || room.phase === "reveal")) return fail(res, 409, "Call Your Shot between questions.");
    if (player.callUsed) return fail(res, 409, "You already used Call Your Shot.");
    player.callArmed = Boolean(data.armed);
    broadcast(room);
    return json(res, 200, { ok: true });
  }

  if (room.phase !== "question") return fail(res, 409, "There is no active question.");
  const q = currentQuestion(room);
  if (Date.now() < room.questionStartedAt) return fail(res, 409, "Wait for the countdown.");

  if (action === "buzz") {
    if (!(q.type === "buzz" || q.type === "connection")) return fail(res, 409, "This question does not use the buzzer.");
    if (player.locked || player.buzzedAt) return fail(res, 409, "You already buzzed.");
    if (room.activeResponderId) return fail(res, 409, "Someone else is answering.");
    player.buzzedAt = Date.now();
    player.answerDeadline = Date.now() + 10000;
    room.pausedAt = Date.now();
    room.activeResponderId = player.id;
    broadcast(room);
    return json(res, 200, { ok: true });
  }

  if (action === "answer") {
    if (!player.buzzedAt || player.locked || Date.now() > player.answerDeadline) return fail(res, 409, "Your answer window has closed.");
    if (isAccepted(data.answer, q.answers)) {
      player.submitted = { value: cleanName(data.answer), at: Date.now() };
      resolveQuestion(room, player.id, cleanName(data.answer));
    } else {
      player.locked = true;
      player.answerDeadline = null;
      player.submitted = { value: cleanName(data.answer), at: Date.now() };
      resumeQuestion(room);
      broadcast(room);
    }
    return json(res, 200, { correct: !player.locked });
  }

  if (action === "submit") {
    if (!(q.type === "order" || q.type === "slider")) return fail(res, 409, "This question does not accept that submission.");
    if (player.submitted !== null) return fail(res, 409, "Your answer is locked.");
    let value = data.value;
    if (q.type === "order") {
      if (!Array.isArray(value) || value.length !== q.items.length || value.some(v => !q.items.includes(v))) return fail(res, 400, "Invalid ordering.");
    } else {
      value = Number(value);
      if (!Number.isFinite(value) || value < q.min || value > q.max) return fail(res, 400, "Invalid value.");
    }
    player.submitted = { value, at: Date.now() };
    broadcast(room);
    if (allPlayersDone(room)) setTimeout(() => resolveQuestion(room), 500);
    return json(res, 200, { ok: true });
  }

  return fail(res, 404, "Unknown action.");
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const safe = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
    const file = join(ROOT, safe);
    if (!file.startsWith(ROOT)) return fail(res, 403, "Forbidden.");
    const content = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        const content = await readFile(join(ROOT, "index.html"));
        res.writeHead(200, { "content-type": MIME[".html"], "cache-control": "no-cache" });
        res.end(content);
      } catch { fail(res, 404, "Not found."); }
    } else {
      console.error(error);
      fail(res, 500, "Something went wrong.");
    }
  }
});

const gameClock = setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.phase !== "question") continue;
    const q = currentQuestion(room);
    let changed = false;
    for (const p of room.players.values()) {
      if (p.answerDeadline && now > p.answerDeadline && !p.locked) {
        p.locked = true;
        p.answerDeadline = null;
        if (room.activeResponderId === p.id) resumeQuestion(room);
        changed = true;
      }
    }
    if (!room.pausedAt && now >= room.questionEndsAt) resolveQuestion(room);
    else if ((q.type === "buzz" || q.type === "connection") && [...room.players.values()].filter(p => p.connected).every(p => p.locked)) resolveQuestion(room);
    else {
      const second = Math.ceil((room.questionEndsAt - now) / 1000);
      if (second !== room.lastSecond || changed) {
        room.lastSecond = second;
        broadcast(room);
      }
    }
  }
}, 250);
gameClock.unref();

const cleanupClock = setInterval(() => {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [roomCode, room] of rooms) if (room.createdAt < cutoff && room.clients.size === 0) rooms.delete(roomCode);
}, 30 * 60 * 1000);
cleanupClock.unref();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Brain Brawl is running at http://localhost:${PORT}`);
});

export { server, rooms, QUESTION_BANK, QUESTION_POOLS, SKI_QUESTION_BANK, buildQuestionLineup, normalizeAnswer, scoreOrder, isAccepted };
