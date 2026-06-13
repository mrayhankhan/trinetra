"use strict";

// Catalyst Advanced I/O function. GET/POST ?offender=<name> -> { nodes, links }
// ego-network. Same mock/Catalyst auto-fallback as the agent function.

const { DataStore } = require("./datastore");
const { buildGraph } = require("./graph");

function readBody(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => resolve(d));
    req.on("error", () => resolve(""));
  });
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  let offender = "";
  try {
    if (req.method === "POST") {
      const raw = await readBody(req);
      offender = raw ? (JSON.parse(raw).offender || "") : "";
    } else {
      offender = new URL(req.url, "http://localhost").searchParams.get("offender") || "";
    }
  } catch {
    /* ignore */
  }

  let opts = { mode: "mock" };
  try {
    if (process.env.CATALYST_MODE === "true") {
      const catalyst = require("zcatalyst-sdk-node");
      opts = { mode: "catalyst", app: catalyst.initialize(req) };
    }
  } catch {
    opts = { mode: "mock" };
  }

  try {
    const ds = new DataStore(opts);
    const graph = await buildGraph(ds, offender);
    res.statusCode = 200;
    res.end(JSON.stringify({ ...graph, mode: ds.mode }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err && err.message) }));
  }
};
