import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAnswer, scoreOrder, isAccepted, buildQuestionLineup, QUESTION_BANK, QUESTION_POOLS, SKI_QUESTION_BANK, server } from "../server.mjs";

test.after(() => server.close());

test("curated bank contains exactly 500 uniquely identified questions", () => {
  assert.equal(QUESTION_BANK.length, 500);
  assert.equal(new Set(QUESTION_BANK.map(question => question.id)).size, 500);
  assert.deepEqual(Object.fromEntries(Object.entries(QUESTION_POOLS).map(([type, questions]) => [type, questions.length])), { buzz: 200, connection: 100, order: 100, slider: 100 });
});

test("bank contains no book-and-author questions", () => {
  assert.equal(QUESTION_BANK.some(question => /^(book|author)-/.test(question.id)), false);
  assert.equal(QUESTION_BANK.some(question => /name the (book|author)/i.test(question.prompt)), false);
});

test("ski and snowboard mode contains all 110 supplied questions", () => {
  assert.equal(SKI_QUESTION_BANK.length, 110);
  assert.equal(new Set(SKI_QUESTION_BANK.map(question => question.id)).size, 110);
  assert.equal(SKI_QUESTION_BANK.every(question => question.type === "buzz" && question.prompt && question.answers.length), true);
});

test("lineups preserve the 5/5/5 rounds and approved format mix", () => {
  const questions = buildQuestionLineup([]);
  assert.equal(questions.length, 15);
  assert.deepEqual([1, 2, 3].map(round => questions.filter(question => question.round === round).length), [5, 5, 5]);
  assert.deepEqual(Object.fromEntries(["buzz", "connection", "order", "slider"].map(type => [type, questions.filter(question => question.type === type).length])), { buzz: 6, connection: 3, order: 3, slider: 3 });
});

test("33 complete matches contain no repeated question IDs", () => {
  const seen = [];
  for (let match = 0; match < 33; match++) {
    const questions = buildQuestionLineup(seen);
    assert.ok(questions, `match ${match + 1} should be available`);
    for (const question of questions) {
      assert.equal(seen.includes(question.id), false);
      seen.push(question.id);
    }
  }
  assert.equal(seen.length, 495);
  assert.equal(new Set(seen).size, 495);
  assert.equal(buildQuestionLineup(seen), null);
});

test("seven complete ski-mode matches contain no repeats", () => {
  const seen = [];
  for (let match = 0; match < 7; match++) {
    const questions = buildQuestionLineup(seen, "ski");
    assert.ok(questions, `ski match ${match + 1} should be available`);
    assert.equal(questions.length, 15);
    assert.deepEqual([1, 2, 3].map(round => questions.filter(question => question.round === round).length), [5, 5, 5]);
    for (const question of questions) {
      assert.equal(seen.includes(question.id), false);
      seen.push(question.id);
    }
  }
  assert.equal(seen.length, 105);
  assert.equal(buildQuestionLineup(seen, "ski"), null);
});

test("answer normalization and fuzzy matching work", () => {
  assert.equal(normalizeAnswer("  GARCÍA-MÁRQUEZ!! "), "garcia marquez");
  assert.equal(isAccepted("Pacfic Ocean", ["pacific ocean"]), true);
  assert.equal(isAccepted("potato", ["pacific ocean"]), false);
});

test("order scoring counts exact positions", () => {
  assert.equal(scoreOrder(["A", "C", "B"], ["A", "B", "C"]), 1);
  assert.equal(scoreOrder(["A", "B", "C"], ["A", "B", "C"]), 3);
});
