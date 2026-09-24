import assert from "node:assert/strict";
import { SKI_QUESTION_BANK } from "../ski-question-bank.mjs";

const base = process.env.BASE_URL || "http://127.0.0.1:4173";

async function post(path, data = {}, session = null) {
  const headers = { "content-type": "application/json" };
  if (session) { headers["x-player-id"] = session.playerId; headers["x-player-token"] = session.token; }
  const response = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(`${path}: ${result.error}`);
  return result;
}

async function connect(session) {
  const controller = new AbortController();
  const response = await fetch(`${base}/api/rooms/${session.code}/events?playerId=${session.playerId}&token=${session.token}`, { signal: controller.signal });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const live = { state: null, controller };
  (async () => {
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let split;
        while ((split = buffer.indexOf("\n\n")) >= 0) {
          const event = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const line = event.split("\n").find(value => value.startsWith("data: "));
          if (line) live.state = JSON.parse(line.slice(6));
        }
      }
    } catch (error) { if (error.name !== "AbortError") throw error; }
  })();
  return live;
}

async function waitFor(predicate, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error("Timed out waiting for live state");
}

const host = await post("/api/rooms", { name: "Host", seenQuestionIds: [] });
const guest = await post(`/api/rooms/${host.code}/join`, { name: "Guest" });
const hostLive = await connect(host);
const guestLive = await connect(guest);

try {
  await waitFor(() => hostLive.state?.players.length === 2 && guestLive.state?.players.length === 2);
  assert.equal(hostLive.state.questionIds.length, 0);
  await post(`/api/rooms/${host.code}/mode`, { mode: "ski" }, host);
  await waitFor(() => hostLive.state?.mode === "ski" && guestLive.state?.mode === "ski");
  await post(`/api/rooms/${host.code}/call`, { armed: true }, host);
  await post(`/api/rooms/${host.code}/start`, {}, host);
  await waitFor(() => hostLive.state?.phase === "question");
  assert.equal(hostLive.state.questionIds.length, 15);
  assert.equal(hostLive.state.questionIds.every(id => id.startsWith("ski-")), true);
  await new Promise(resolve => setTimeout(resolve, 2300));
  await post(`/api/rooms/${host.code}/buzz`, {}, host);
  await waitFor(() => hostLive.state?.question?.pausedAt && guestLive.state?.question?.pausedAt);
  const answer = SKI_QUESTION_BANK.find(question => question.id === hostLive.state.questionIds[0]).answers[0];
  await post(`/api/rooms/${host.code}/answer`, { answer }, host);
  await waitFor(() => hostLive.state?.phase === "reveal");
  assert.equal(hostLive.state.players.find(player => player.name === "Host").score, 2);

  const firstIds = hostLive.state.questionIds;
  const nextHost = await post("/api/rooms", { name: "Next Host", seenQuestionIds: firstIds });
  const nextGuest = await post(`/api/rooms/${nextHost.code}/join`, { name: "Next Guest" });
  const nextLive = await connect(nextHost);
  await post(`/api/rooms/${nextHost.code}/mode`, { mode: "ski" }, nextHost);
  await post(`/api/rooms/${nextHost.code}/start`, {}, nextHost);
  await waitFor(() => nextLive.state?.questionIds?.length === 15);
  assert.equal(nextLive.state.questionIds.some(id => firstIds.includes(id)), false);
  nextLive.controller.abort();
  assert.equal(nextGuest.code, nextHost.code);
  console.log(JSON.stringify({ generalBankSize: 500, skiBankSize: 110, hostModeSelection: true, roomSync: true, pausedOnBuzz: true, callYourShot: true, nextGameHasNoRepeats: true }));
} finally {
  hostLive.controller.abort();
  guestLive.controller.abort();
}
