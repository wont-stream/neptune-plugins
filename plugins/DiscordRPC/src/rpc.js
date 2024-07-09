//https://github.com/saucesteals/discord-auto-rpc

let DiscordRPC;

import("./discord-rpc-revamp.js").then((pkg) => {
  DiscordRPC = pkg;
});

export class AutoClient extends DiscordRPC.Client {
  closeinterval;
  clientId;
  transport;
  authenticate;
  authorize;

  constructor(options) {
    super(options);

    if (options.transport == "ipc") {
      this.transport.on("close", this.onClose.bind(this));
    }
  }

  onClose() {
    if (!this.closeinterval) {
      this.closeinterval = setInterval(() => {
        this.transport
          .connect()
          .then(() => {
            this.closeinterval && clearInterval(this.closeinterval);
            this.closeinterval = undefined;
          })
          .catch(() => {});
      }, 15e3);
      this.closeinterval.unref();
    }
  }

  endlessConnect(clientId) {
    return new Promise((res) => {
      this.clientId = clientId;
      const fn = () => {
        this.transport
          .connect(this.clientId)
          .then(() => {
            clearInterval(interval);
          })
          .catch(() => {});
      };
      const interval = setInterval(fn, 15e3);
      interval.unref();
      fn();

      this.once("connected", () => {
        res();
      });
    });
  }

  async endlessLogin(options) {
    if (this.options.transport != "ipc")
      throw new Error(
        "Endless login is currently only supported on the IPC transport"
      );

    await this.endlessConnect(options.clientId);

    if (!options.scopes) {
      this.emit("ready");
      return this;
    }
    if (!options.accessToken) {
      options.accessToken = await this.authorize(options);
    }
    return this.authenticate(options.accessToken);
  }
}

export * from "./discord-rpc-revamp.js";
