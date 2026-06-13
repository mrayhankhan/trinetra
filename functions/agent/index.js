"use strict";

// Catalyst Advanced I/O function. POST { "q": "..." } -> grounded agent result.
// Falls back to mock mode automatically if the Catalyst SDK / Data Store isn't
// available, so the same code runs locally and in the cloud.

const { answerQuery } = require("./handler");

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  let q = "";
  try {
    if (req.method === "GET") {
      const u = new URL(req.url, "http://localhost");
      q = u.searchParams.get("q") || "";
    } else {
      const raw = await readBody(req);
      q = raw ? (JSON.parse(raw).q || "") : "";
    }
  } catch {
    /* ignore parse errors -> empty query */
  }

  let opts = { mode: "mock" };
  try {
    if (process.env.CATALYST_MODE === "true") {
      const catalyst = require("zcatalyst-sdk-node");
      const app = catalyst.initialize(req);
      opts = { mode: "catalyst", app };
    }
  } catch {
    opts = { mode: "mock" };
  }

  try {
    const result = await answerQuery(q, opts);
    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err && err.message) }));
  }
};
