const express = require("express");
const fs = require("fs");
const os = require("os");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 5000);
const DB_HOST = process.env.DB_HOST || "database";
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_NAME = process.env.DB_NAME || "taskdb";
const DB_USER = process.env.DB_USER || "taskuser";
const DB_PASSWORD_FILE = process.env.DB_PASSWORD_FILE;
let DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_PASSWORD && DB_PASSWORD_FILE) {
  try {
    DB_PASSWORD = fs.readFileSync(DB_PASSWORD_FILE, "utf8").trim();
  } catch (error) {
    console.error("Failed to read DB_PASSWORD_FILE:", error.message);
  }
}

if (!DB_PASSWORD) {
  console.error("DB_PASSWORD is required.");
  process.exit(1);
}

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD
});

async function waitForDatabase(maxRetries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      console.log("Database connection established.");
      return;
    } catch (error) {
      console.error(`DB connection attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    hostname: os.hostname(),
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/tasks", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.post("/tasks", async (req, res) => {
  const { title, priority = "medium" } = req.body || {};
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title is required" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO tasks (title, priority, done) VALUES ($1, $2, false) RETURNING *",
      [title.trim(), priority]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create task" });
  }
});

app.put("/tasks/:id/toggle", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "invalid task id" });
  }
  try {
    const result = await pool.query(
      "UPDATE tasks SET done = NOT done WHERE id = $1 RETURNING *",
      [id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: "task not found" });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Failed to toggle task" });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "invalid task id" });
  }
  try {
    const result = await pool.query("DELETE FROM tasks WHERE id = $1 RETURNING id", [id]);
    if (!result.rowCount) {
      return res.status(404).json({ error: "task not found" });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete task" });
  }
});

async function start() {
  try {
    await waitForDatabase();
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start backend after retries.", error.message);
    process.exit(1);
  }
}

start();
