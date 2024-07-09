const net = require("net");
const os = require("os");
const { request } = require("https");
const crypto = require("crypto");

function findIPCPath() {
  if (os.platform == "win32") return "\\\\?\\pipe\\";
  return (
    (process.env.XDG_RUNTIME_DIR ||
      process.env.TMPDIR ||
      process.env.TMP ||
      process.env.TEMP) + "/" || "/tmp/"
  );
}

async function findIPCSocket() {
  for (var i = 0; i < 10; i++) {
    var path = findIPCPath() + "discord-ipc-" + i;
    let sock = await new Promise((resolve) => {
      let s = net
        .connect(path, (_) => resolve(s))
        .on("error", (_) => resolve())
        .on("timeout", (_) => resolve())
        .setTimeout(10000);
    });
    if (sock) return sock;
  }
}

function sendMessage(sock, opcode, data) {
  if (typeof data === "string") data = Buffer.from(data, "utf8");
  let buf = Buffer.alloc(8 + data.length);
  buf.writeUInt32LE(opcode, 0);
  buf.writeUInt32LE(data.length, 4);
  buf.write(data.toString(), 8);
  try {
    sock.write(buf);
  } catch {}
}

function parseMessage(buf) {
  let opcode = buf.readUInt32LE(0);
  let length = buf.readUInt32LE(4);
  let data = buf.slice(8, 8 + length).toString();
  return { opcode, data };
}

function PKCE() {
  let codeVerifier = crypto
    .randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  let codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return { codeVerifier, codeChallenge, challengeMethod: "S256" };
}

function uuid4() {
  let chars = "0123456789abcdef";
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    if (c == "x") return chars[Math.floor(Math.random() * 16)];
    return chars[Math.floor(Math.random() * 4) + 8];
  });
}

class Client extends EventEmitter {
  constructor() {
    super();
    this._socket = null;
    this._waitingRequests = [];
  }

  emit() {}

  _processMessage(msg) {
    let opcode = msg.opcode;
    let data = JSON.parse(msg.data);

    if (opcode == 2) {
      return this._socket.destroy();
    } else if (opcode == 3) {
      return sendMessage(this._socket, 4, msg.data);
    }

    switch (data.cmd) {
      case "DISPATCH":
        if (data.evt == "ERROR") this.emit("error", data.data);
        else this.emit(data.evt, data.data);
        break;
      default:
        if (
          data.nonce &&
          this._waitingRequests.find((x) => x.nonce === data.nonce)
        ) {
          try {
            this._waitingRequests
              .find((x) => x.nonce === data.nonce)
              .callback.call(null, data);
          } catch (_) {}
          this._waitingRequests = this._waitingRequests.filter(
            (x) => x.nonce !== data.nonce
          );
        }
        break;
    }
  }

  async _waitForResponse(nonce) {
    return new Promise((resolve, reject) => {
      this._waitingRequests.push({ nonce, callback: resolve });
      setTimeout((_) => reject(new Error("Request timed out")), 10000);
    });
  }

  subscribe(evt) {
    sendMessage(
      this._socket,
      1,
      JSON.stringify({
        cmd: "SUBSCRIBE",
        evt,
        nonce: uuid4(),
      })
    );
  }

  unsubscribe(evt) {
    sendMessage(
      this._socket,
      1,
      JSON.stringify({
        cmd: "UNSUBSCRIBE",
        evt,
        nonce: uuid4(),
      })
    );
  }

  connect(opts) {
    opts = Object.assign(
      {
        scopes: [],
        clientId: "",
      },
      opts
    );
    if (!opts.clientId) throw new Error("clientId is required");
    this.scopes = opts.scopes;

    return new Promise(async (resolve, reject) => {
      this._socket = await findIPCSocket();
      if (this._socket) {
        this._socket.on("data", (buf) =>
          this._processMessage(parseMessage(buf))
        );
        this._socket.once("close", (_) => this.emit("close"));
        sendMessage(
          this._socket,
          0,
          JSON.stringify({
            v: 1,
            client_id: opts.clientId,
          })
        );
        let timeout = setTimeout(
          (_) => reject(new Error("Connection timed out")),
          10000
        );
        this.once("READY", async (handshakeRes) => {
          clearTimeout(timeout);
          this.user = handshakeRes.user;
          this.config = handshakeRes.config;
          if (opts.scopes.length > 0) {
            let pkce = PKCE();
            let nonce = uuid4();
            sendMessage(
              this._socket,
              1,
              JSON.stringify({
                cmd: "AUTHORIZE",
                args: {
                  client_id: opts.clientId,
                  scopes: opts.scopes,
                  code_challenge: pkce.codeChallenge,
                  code_challenge_method: "S256",
                },
                nonce,
              })
            );
            let data = await this._waitForResponse(nonce).catch(() => {});
            if (!data) return;
            if (data.evt == "ERROR") {
              resolve();
              return this.emit("ready");
            }
            let response = await new Promise((resolve, reject) => {
              let req = request(
                "https://discord.com/api/oauth2/token",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                },
                (res) => {
                  let data = "";
                  res.on("end", (_) => resolve(JSON.parse(data)));
                  res.on("data", (chunk) => (data += chunk));
                }
              ).on("error", (_) => reject());
              req.write(
                new URLSearchParams({
                  client_id: opts.clientId,
                  code: data.data.code,
                  grant_type: "authorization_code",
                  code_verifier: pkce.codeVerifier,
                }).toString()
              );
              req.end();
            }).catch((_) => {}); // Oh well, we tried
            if (response && response.access_token) {
              this.accessToken = response.access_token;
              this.refreshToken = response.refresh_token;
              this.tokenExpiresAt = Date.now() + response.expires_in * 1000;
              await this.authenticate();
              resolve();
              this.emit("ready");
            } else {
              resolve();
              this.emit("ready");
            }
          } else {
            resolve();
            this.emit("ready");
          }
        });
      } else reject(new Error("Could not connect"));
    });
  }

  setActivity(activity) {
    if (!activity) return this.clearActivity();
    let activityToSend = {
      state: activity.state,
      details: activity.details,
      timestamps: {
        start: activity.startTimestamp,
        end: activity.endTimestamp,
      },
      assets: {
        large_image: activity.largeImageKey,
        large_text: activity.largeImageText,
        small_image: activity.smallImageKey,
        small_text: activity.smallImageText,
      },
      party: {
        id: activity.partyId,
        size:
          activity.partySize && activity.partyMax
            ? [activity.partySize, activity.partyMax]
            : undefined,
      },
      secrets: {
        match: activity.matchSecret,
        join: activity.joinSecret,
        spectate: activity.spectateSecret,
      },
      instance: activity.instance,
      buttons: activity.buttons,
    };
    Object.keys(activityToSend).forEach((key) => {
      if (!activityToSend[key]) delete activityToSend[key];
      if (
        activityToSend[key] instanceof Array &&
        activityToSend[key].length == 0
      )
        delete activityToSend[key];
      function recursiveClean(obj) {
        Object.keys(obj).forEach((key) => {
          if (!obj[key]) delete obj[key];
          if (obj[key] instanceof Array && obj[key].length == 0)
            delete obj[key];
          if (obj[key] instanceof Object) recursiveClean(obj[key]);
        });
        return obj;
      }
      if (activityToSend[key] instanceof Object)
        activityToSend[key] = recursiveClean(activityToSend[key]);
      if (
        activityToSend[key] instanceof Object &&
        Object.keys(activityToSend[key]).length == 0
      )
        delete activityToSend[key];
    });

    return new Promise(async (resolve, reject) => {
      let nonce = uuid4();
      sendMessage(
        this._socket,
        1,
        JSON.stringify({
          cmd: "SET_ACTIVITY",
          args: {
            pid: process.pid,
            activity: activityToSend,
          },
          nonce,
        })
      );

      let data = await this._waitForResponse(nonce).catch(() => {});
      if (!data) return reject(new Error("No response received"));
      if (data.data.code) reject(data.data);
      else resolve();
    });
  }

  clearActivity() {
    return new Promise(async (resolve, reject) => {
      let nonce = uuid4();
      sendMessage(
        this._socket,
        1,
        JSON.stringify({
          cmd: "SET_ACTIVITY",
          args: {
            pid: process.pid,
          },
          nonce,
        })
      );

      let data = await this._waitForResponse(nonce).catch(() => {});
      if (!data) return reject(new Error("No response received"));
      if (data.data && data.data.code) reject(data.data);
      else resolve();
    });
  }

  authenticate(token) {
    token = token || this.accessToken;

    return new Promise(async (resolve, reject) => {
      let nonce = uuid4();
      sendMessage(
        this._socket,
        1,
        JSON.stringify({
          cmd: "AUTHENTICATE",
          args: {
            access_token: token,
          },
          nonce,
        })
      );

      let data = await this._waitForResponse(nonce).catch(() => {});
      if (!data) return reject(new Error("No response received"));
      if (data.data && data.data.code) reject(data.data);
      else resolve();
    });
  }

  getGuild(guildID) {
    return new Promise(async (resolve, reject) => {
      let nonce = uuid4();
      sendMessage(
        this._socket,
        1,
        JSON.stringify({
          cmd: "GET_GUILD",
          args: {
            guild_id: guildID,
          },
          nonce,
        })
      );
      let response = await this._waitForResponse(nonce).catch(() => {});
      if (!response) return reject(new Error("No response received"));
      if (response.evt == "ERROR") reject(response.data);
      else resolve(response.data);
    });
  }

  destroy() {
    if (this._socket) this._socket.destroy();
    this._socket = null;
  }
}

module.exports = {
  Client,
  register(clientID) {
    let register;
    try {
      register = require("electron").app.setAsDefaultProtocolClient.bind(app);
    } catch (_) {
      try {
        register = require("register-scheme");
      } catch (_) {} // Oh well, we tried
    }

    if (typeof register !== "function") register = (_) => false;
    register(`discord-${clientID}`);
  },
};
