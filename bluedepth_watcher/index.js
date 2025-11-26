#!/usr/bin/env node
/**
 * Monitora il servizio MPE Server e invia notifiche WebSocket + log in tempo reale.
 */

const  { exec } =require ("child_process");
const fs=require("fs");
const readline =require("readline");
const express =require("express");
const { WebSocketServer }=require("ws");
const path =require("path");

const SERVICE_NAME = "mpe_server";
const SERVICE_TIMER = "mpe_updater.timer";
const LOG_FILE_MPE_SERVER = "/var/log/bluedepth/mpe_server.log";
const LOG_FILE_MPE_UPDATER = "/var/log/bluedepth/mpe_updater.log";

const CHECK_INTERVAL = 5000;
const PORT = 8081; // Porta HTTP e WebSocket

let lastStatus = null;

// --- EXPRESS SERVER ---
const app = express();
app.use(express.static(path.resolve("./public")));

const server = app.listen(PORT, () => {
  console.log(`[HTTP] Server attivo su http://localhost:${PORT}`);
  console.log(`[START] Monitoraggio servizio "${SERVICE_NAME}"`);
});

// --- WEBSOCKET SERVER ---
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on("connection", (ws) => {
  console.log("[WS] Nuovo client connesso");
  clients.add(ws);

  ws.send(JSON.stringify({
    type: "info",
    message: `Monitoraggio del servizio "${SERVICE_NAME}" in corso...`,
  }));

  ws.on("close", () => clients.delete(ws));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

// --- CONTROLLO STATO SERVIZIO ---
function getServiceStatus() {
  return new Promise((resolve) => {
    exec(`systemctl is-active ${SERVICE_NAME}`, (error, stdout) => {
      if (error) {
        resolve("error");
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function getServiceTimer() {
  return new Promise((resolve) => {
    exec(`systemctl list-timers ${SERVICE_TIMER} --plain --no-legend --output=json`, (error, stdout) => {
      if (error) {
        resolve("error");
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

async function monitorLoop() {
  const status = await getServiceStatus();

  if (lastStatus !== status) {
    console.log(`[INFO] Stato ${SERVICE_NAME}: ${lastStatus} → ${status}`);
  }

  if (lastStatus === "inactive" && status === "active") {
    const msg = {
      type: "service_status",
      service: SERVICE_NAME,
      status,
      timestamp: new Date().toISOString(),
      message: `${SERVICE_NAME} è passato da inattivo ad attivo.`,
    };
    console.log(`[NOTIFICA] ${msg.message}`);
    broadcast(msg);
  }



  lastStatus = status;


  const timer = await getServiceTimer();

  const msg_timer = {
      type: "service_timer",
      service: SERVICE_TIMER,
      status,
      timestamp: new Date().toISOString(),
      message: `${timer}`,
    };

  broadcast(msg_timer);
}

setInterval(monitorLoop, CHECK_INTERVAL);

// --- LOG TAILING ---
function tailLogFile(filePath,type="log_line_mpe_server") {
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] File di log non trovato: ${filePath}`);
    return;
  }

  console.log(`[LOG] Monitoraggio file: ${filePath}`);

  // Posiziona il cursore alla fine del file
  const stream = fs.createReadStream(filePath, { encoding: "utf8", start: fs.statSync(filePath).size });

  const rl = readline.createInterface({ input: stream });

  rl.on("line", (line) => {
    broadcast({ type: type, line });
  });

  // Ascolta nuove righe in append
  fs.watch(filePath, (eventType) => {
    if (eventType === "change") {
      const tailStream = fs.createReadStream(filePath, { encoding: "utf8", start: fs.statSync(filePath).size - 1024 });
      const tailRl = readline.createInterface({ input: tailStream });
      tailRl.on("line", (line) => broadcast({ type: type, line }));
    }
  });
}

tailLogFile(LOG_FILE_MPE_SERVER,"log_line_mpe_server");
tailLogFile(LOG_FILE_MPE_UPDATER,"log_line_mpe_updater");