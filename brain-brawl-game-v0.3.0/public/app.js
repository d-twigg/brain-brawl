const app = document.querySelector("#app");
const toastNode = document.querySelector("#toast");
let mode = "create";
let session = null;
let state = null;
let source = null;
let ticker = null;
let orderDraft = [];
let sliderDraft = null;

const esc = value => String(value ?? "").replace(/[&<>'\"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
const roundNames = { 1: "Warm-Up", 2: "Things Get Weird", 3: "Final Frenzy", 4: "Sudden Death" };

function toast(message) {
  toastNode.textContent = message;
  toastNode.classList.add("show");
  setTimeout(() => toastNode.classList.remove("show"), 2600);
}

async function request(path, data = {}) {
  const headers = { "content-type": "application/json" };
  if (session) {
    headers["x-player-id"] = session.playerId;
    headers["x-player-token"] = session.token;
  }
  const response = await fetch(path, { method: "POST", headers, body: JSON.stringify(data) });
  const json = await response.json();
  if (!response.ok) {
    const error = new Error(json.error || "Request failed.");
    error.code = json.code;
    throw error;
  }
  return json;
}

function seenQuestions() {
  try {
    const value = JSON.parse(localStorage.getItem("brainBrawlSeenQuestions") || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function rememberQuestions(ids) {
  const combined = [...new Set([...seenQuestions(), ...ids])];
  localStorage.setItem("brainBrawlSeenQuestions", JSON.stringify(combined));
}

function saveSession(next) {
  session = next;
  localStorage.setItem("brainBrawlSession", JSON.stringify(next));
}

function home() {
  clearInterval(ticker);
  app.innerHTML = `
    <section class="home">
      <div class="hero">
        <div class="eyebrow">A live trivia free-for-all</div>
        <h1>BRAIN <span class="accent">BRAWL</span></h1>
        <p class="lede">Buzz early. Think fast. Regret everything. Choose general knowledge or a dedicated ski-and-snowboard showdown, with no silent repeats.</p>
      </div>
      <div class="card join-card">
        <div class="tabs">
          <button class="tab ${mode === "create" ? "active" : ""}" data-mode="create">Create room</button>
          <button class="tab ${mode === "join" ? "active" : ""}" data-mode="join">Join room</button>
        </div>
        <form id="entry-form">
          <h2>${mode === "create" ? "Start a showdown" : "Enter the arena"}</h2>
          <label for="name">YOUR NAME</label>
          <input id="name" name="name" type="text" maxlength="18" autocomplete="nickname" placeholder="DefinitelyNotCheating" required />
          ${mode === "join" ? `<label for="room">ROOM CODE</label><input id="room" name="room" class="code-input" type="text" maxlength="4" autocomplete="off" placeholder="ABCD" required />` : ""}
          <button class="primary" type="submit">${mode === "create" ? "Create room" : "Join the brawl"}</button>
        </form>
      </div>
    </section>`;
  app.querySelectorAll("[data-mode]").forEach(btn => btn.onclick = () => { mode = btn.dataset.mode; home(); });
  app.querySelector("#entry-form").onsubmit = async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const name = data.get("name");
      let result;
      if (mode === "create") {
        try {
          result = await request("/api/rooms", { name, seenQuestionIds: seenQuestions() });
        } catch (error) {
          if (error.code !== "QUESTION_BANK_EXHAUSTED" || !confirm(`${error.message}\n\nReset your question history?`)) throw error;
          localStorage.removeItem("brainBrawlSeenQuestions");
          result = await request("/api/rooms", { name, resetHistory: true });
        }
      } else result = await request(`/api/rooms/${String(data.get("room")).toUpperCase()}/join`, { name });
      saveSession(result);
      history.replaceState({}, "", `/?room=${result.code}`);
      connect();
    } catch (error) { toast(error.message); button.disabled = false; }
  };
}

function connect() {
  source?.close();
  let receivedState = false;
  const connectionTimeout = setTimeout(() => {
    if (receivedState) return;
    source?.close();
    localStorage.removeItem("brainBrawlSession");
    session = null;
    state = null;
    history.replaceState({}, "", "/");
    home();
    toast("That room expired. Create or join a new one.");
  }, 2500);
  source = new EventSource(`/api/rooms/${session.code}/events?playerId=${encodeURIComponent(session.playerId)}&token=${encodeURIComponent(session.token)}`);
  source.addEventListener("state", event => {
    receivedState = true;
    clearTimeout(connectionTimeout);
    const next = JSON.parse(event.data);
    if (Array.isArray(next.questionIds)) rememberQuestions(next.questionIds);
    const changedQuestion = state?.question?.index !== next.question?.index;
    const sameActiveQuestion = state?.phase === "question" && next.phase === "question" && !changedQuestion;
    const interactionChanged = sameActiveQuestion && (
      state.me.locked !== next.me.locked ||
      state.me.buzzedAt !== next.me.buzzedAt ||
      state.me.submitted !== next.me.submitted ||
      state.question.pausedAt !== next.question.pausedAt
    );
    state = next;
    if (changedQuestion) {
      orderDraft = next.question?.type === "order" ? randomShuffle(next.question.items) : [];
      sliderDraft = next.question?.type === "slider" ? randomSliderStart(next.question) : null;
    }
    if (!sameActiveQuestion || interactionChanged) render();
  });
  source.onerror = () => {
    if (receivedState) toast("Reconnecting…");
  };
}

function randomShuffle(items) {
  let result;
  do {
    result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const random = new Uint32Array(1);
      crypto.getRandomValues(random);
      const j = random[0] % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
  } while (items.length > 1 && result.every((item, index) => item === items[index]));
  return result;
}

function randomSliderStart(q) {
  const lowSide = Math.random() < .5;
  const fraction = lowSide ? .12 + Math.random() * .18 : .70 + Math.random() * .18;
  const raw = q.min + (q.max - q.min) * fraction;
  return Math.max(q.min, Math.min(q.max, q.min + Math.round((raw - q.min) / q.step) * q.step));
}

function layout(content) {
  const players = [...state.players].sort((a, b) => b.score - a.score);
  return `<div class="shell">
    <header class="topbar"><div class="brand">BRAIN <span class="accent">BRAWL</span></div><div class="room-code">${state.code}</div></header>
    <div class="game-grid">
      <section class="card stage">${content}</section>
      <aside class="card sidebar">
        <h3>Scoreboard</h3>
        <div class="player-list">${players.map(p => `<div class="player ${p.connected ? "" : "offline"}">
          <span class="dot" style="background:${p.color}"></span>
          <span class="player-name">${esc(p.name)}${p.id === state.me.id ? " (you)" : ""}<small class="status-mark">${p.submitted ? " ✓" : p.locked ? " ×" : ""}</small></span>
          <span class="score">${p.score}</span>
        </div>`).join("")}</div>
      </aside>
    </div>
  </div>`;
}

function callButton() {
  if (state.me.callUsed) return `<p class="muted">Call Your Shot has been used.</p>`;
  return `<button class="call-btn ${state.me.callArmed ? "armed" : ""}" id="call-shot">${state.me.callArmed ? "⚡ Shot called for next question" : "⚡ Call Your Shot on the next question"}</button>`;
}

function lobby() {
  const modeOptions = state.modes.map(option => {
    const active = option.id === state.mode;
    const unavailable = option.remaining < 15;
    return `<button class="mode-option ${active ? "active" : ""}" data-game-mode="${option.id}" ${!state.me.isHost || unavailable ? "disabled" : ""} aria-pressed="${active}"><strong>${esc(option.name)}</strong><small>${option.remaining} unseen questions</small></button>`;
  }).join("");
  return layout(`<div class="center">
    <div class="eyebrow">Get your people in here</div>
    <div class="lobby-code">${state.code}</div>
    <p class="muted">Join at this address and enter the code above.</p>
    <div class="mode-picker"><h3>Game mode</h3><div class="mode-options">${modeOptions}</div><p class="muted">${state.me.isHost ? "Choose a mode before starting." : `The host selected ${esc(state.modeName)}.`}</p></div>
    ${callButton()}
    ${state.me.isHost ? `<button id="start" class="primary" ${state.players.length < 2 ? "disabled" : ""}>${state.players.length < 2 ? "Waiting for an opponent…" : "Start the brawl"}</button>` : `<div class="waiting">Waiting for the host to start…</div>`}
  </div>`);
}

function questionHeader(q) {
  return `<div class="question-head"><div><div class="round-label">Round ${q.round} · ${roundNames[q.round]}</div><div class="counter">${esc(state.modeName)} · Question ${q.number} of ${q.total} · ${q.type === "connection" ? "Find the Connection" : q.type === "buzz" ? "Buzz In" : "Hands On"}</div></div><div class="timer" id="timer">--</div></div><h2 class="prompt">${esc(q.prompt)}</h2>`;
}

function visibleClues(q) {
  const elapsed = (q.pausedAt || Date.now()) - q.startedAt;
  const shown = elapsed < 0 ? 0 : Math.min(q.clues.length, Math.floor(elapsed / q.clueEvery) + 1);
  return q.clues.map((clue, i) => `<div class="clue ${i < shown ? "" : "hidden"}">${i < shown ? esc(clue) : ""}</div>`).join("");
}

function shownClueCount(q) {
  const elapsed = (q.pausedAt || Date.now()) - q.startedAt;
  return elapsed < 0 ? 0 : Math.min(q.clues.length, Math.floor(elapsed / q.clueEvery) + 1);
}

function buzzUI(q) {
  if (state.me.locked) return `<div class="locked">You're locked out. Time to stare confidently at everyone else.</div>`;
  if (state.me.buzzedAt) return `<div class="answer-countdown" id="answer-countdown">Answer now</div><form id="answer-form" class="answer-box"><input id="answer" type="text" maxlength="60" autocomplete="off" placeholder="Type your answer…" required autofocus><button class="primary">Lock it in</button></form>`;
  if (q.pausedAt) return `<div class="waiting">Someone buzzed. The clock is paused while they answer…</div>`;
  return `<button class="buzz" id="buzz">BUZZ</button>`;
}

function orderUI(q) {
  if (state.me.submitted) return `<div class="waiting">Answer locked. Everyone else is now moving suspiciously slowly.</div>`;
  return `<div class="order-list">${orderDraft.map((item, i) => `<div class="order-item"><span class="rank">${i + 1}</span><span>${esc(item)}</span><span class="move-buttons"><button class="move" data-move="up" data-i="${i}" ${i === 0 ? "disabled" : ""}>↑</button><button class="move" data-move="down" data-i="${i}" ${i === orderDraft.length - 1 ? "disabled" : ""}>↓</button></span></div>`).join("")}</div><button class="primary" id="submit-order">Lock this order</button>`;
}

function sliderUI(q) {
  if (state.me.submitted) return `<div class="waiting">Answer locked at <strong>${sliderDraft}${q.unit ? ` ${esc(q.unit)}` : ""}</strong>.</div>`;
  return `<div class="slider-wrap"><div class="slider-value" id="slider-value">${sliderDraft}${q.unit ? ` ${esc(q.unit)}` : ""}</div><input id="slider" type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${sliderDraft}"><div class="range-labels"><span>${q.min}</span><span>${q.max}</span></div></div><button class="primary" id="submit-slider">Lock it in</button>`;
}

function question() {
  const q = state.question;
  const clueBlock = (q.type === "buzz" || q.type === "connection") ? `<div class="clues" id="clues" data-shown="${shownClueCount(q)}">${visibleClues(q)}</div>` : "";
  const controls = (q.type === "buzz" || q.type === "connection") ? buzzUI(q) : q.type === "order" ? orderUI(q) : sliderUI(q);
  return layout(`${questionHeader(q)}${clueBlock}<div class="action-zone">${controls}</div>`);
}

function reveal() {
  const r = state.result;
  return layout(`<div class="center">
    <div class="eyebrow">The answer was</div>
    <h2 class="reveal-answer">${esc(r.answer)}</h2>
    <div class="winner-banner">${r.winnerName ? `${esc(r.winnerName)} takes ${r.points} point${r.points > 1 ? "s" : ""}!` : "Nobody got it. Spectacular."}</div>
    ${r.accuracy ? `<p class="muted">Winning accuracy: ${esc(r.accuracy)}</p>` : ""}
    ${r.calls.length ? `<div class="call-result">${r.calls.map(c => `${esc(c.name)} called it ${c.success ? "and nailed it! +1" : "and blew it."}`).join("<br>")}</div>` : ""}
    ${callButton()}
    ${state.me.isHost ? `<button class="primary" id="next">${r.sudden && !r.winnerId ? "Next tiebreaker" : r.isLast ? "Continue" : "Next question"}</button>` : `<div class="waiting">Waiting for the host…</div>`}
  </div>`);
}

function finished() {
  const top = state.standings[0];
  return layout(`<div class="center"><div class="eyebrow">We have a winner</div><h2 class="reveal-answer">${esc(top.name)}</h2><p class="winner-banner">Officially the least wrong person in the room.</p><div class="podium">${state.standings.map((p, i) => `<div class="podium-row"><span class="place">${i + 1}</span><span>${esc(p.name)}</span><span class="score">${p.score} pts</span></div>`).join("")}</div>${state.me.isHost ? `<button class="primary" id="rematch">Play again with this room</button>` : `<div class="waiting">The host can start a rematch with the same party.</div>`}<button class="secondary" id="leave">Leave room</button></div>`);
}

function render() {
  if (!state) return;
  clearInterval(ticker);
  if (state.phase === "lobby") app.innerHTML = lobby();
  else if (state.phase === "question") app.innerHTML = question();
  else if (state.phase === "reveal") app.innerHTML = reveal();
  else app.innerHTML = finished();
  bind();
  if (state.phase === "question") {
    updateClock();
    ticker = setInterval(updateClock, 150);
  }
}

function updateClock() {
  const q = state.question;
  const timer = document.querySelector("#timer");
  if (!timer) return;
  const clockNow = q.pausedAt || Date.now();
  const remaining = q.startedAt - clockNow;
  if (remaining > 0) {
    timer.textContent = Math.ceil(remaining / 1000);
  } else {
    const seconds = Math.max(0, Math.ceil((q.endsAt - clockNow) / 1000));
    timer.textContent = seconds;
    timer.classList.toggle("low", seconds <= 5);
    const clues = document.querySelector("#clues");
    const shown = shownClueCount(q);
    if (clues && clues.dataset.shown !== String(shown)) {
      clues.dataset.shown = String(shown);
      clues.innerHTML = visibleClues(q);
    }
  }
  const answerTimer = document.querySelector("#answer-countdown");
  if (answerTimer && state.me.answerDeadline) answerTimer.textContent = `${Math.max(0, Math.ceil((state.me.answerDeadline - Date.now()) / 1000))} seconds to answer`;
}

function bind() {
  document.querySelector("#start")?.addEventListener("click", () => act("start"));
  document.querySelectorAll("[data-game-mode]").forEach(button => button.addEventListener("click", () => act("mode", { mode: button.dataset.gameMode })));
  document.querySelector("#next")?.addEventListener("click", () => act("next"));
  document.querySelector("#rematch")?.addEventListener("click", () => act("rematch"));
  document.querySelector("#call-shot")?.addEventListener("click", () => act("call", { armed: !state.me.callArmed }));
  document.querySelector("#buzz")?.addEventListener("click", () => act("buzz"));
  document.querySelector("#answer-form")?.addEventListener("submit", event => { event.preventDefault(); act("answer", { answer: document.querySelector("#answer").value }); });
  const answerInput = document.querySelector("#answer");
  if (answerInput) requestAnimationFrame(() => { answerInput.focus(); answerInput.select(); });
  document.querySelectorAll("[data-move]").forEach(btn => btn.addEventListener("click", () => {
    const i = Number(btn.dataset.i);
    const j = btn.dataset.move === "up" ? i - 1 : i + 1;
    [orderDraft[i], orderDraft[j]] = [orderDraft[j], orderDraft[i]];
    render();
  }));
  document.querySelector("#submit-order")?.addEventListener("click", () => act("submit", { value: orderDraft }));
  document.querySelector("#slider")?.addEventListener("input", event => { sliderDraft = Number(event.target.value); document.querySelector("#slider-value").textContent = `${sliderDraft}${state.question.unit ? ` ${state.question.unit}` : ""}`; });
  document.querySelector("#submit-slider")?.addEventListener("click", () => act("submit", { value: sliderDraft }));
  document.querySelector("#leave")?.addEventListener("click", () => { localStorage.removeItem("brainBrawlSession"); session = null; state = null; source?.close(); history.replaceState({}, "", "/"); home(); });
}

async function act(action, data = {}) {
  const buttons = [...document.querySelectorAll("button")];
  if (["start", "next", "submit", "answer"].includes(action)) buttons.forEach(b => b.disabled = true);
  try { await request(`/api/rooms/${state.code}/${action}`, data); }
  catch (error) {
    if (action === "rematch" && error.code === "QUESTION_BANK_EXHAUSTED" && confirm(`${error.message}\n\nReset your question history?`)) {
      localStorage.removeItem("brainBrawlSeenQuestions");
      try { await request(`/api/rooms/${state.code}/${action}`, { resetHistory: true }); return; }
      catch (retryError) { toast(retryError.message); }
    } else toast(error.message);
    buttons.forEach(b => b.disabled = false);
  }
}

let stored = null;
try { stored = JSON.parse(localStorage.getItem("brainBrawlSession") || "null"); }
catch { localStorage.removeItem("brainBrawlSession"); }
const roomFromUrl = new URLSearchParams(location.search).get("room")?.toUpperCase();
if (stored && roomFromUrl && stored.code === roomFromUrl) {
  session = stored;
  connect();
} else {
  if (!roomFromUrl) localStorage.removeItem("brainBrawlSession");
  if (roomFromUrl) mode = "join";
  home();
}
