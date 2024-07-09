// Copyright Joyent, Inc. and other Node contributors.

//

// Permission is hereby granted, free of charge, to any person obtaining a

// copy of this software and associated documentation files (the

// "Software"), to deal in the Software without restriction, including

// without limitation the rights to use, copy, modify, merge, publish,

// distribute, sublicense, and/or sell copies of the Software, and to permit

// persons to whom the Software is furnished to do so, subject to the

// following conditions:

//

// The above copyright notice and this permission notice shall be included

// in all copies or substantial portions of the Software.

//

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS

// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF

// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN

// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,

// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR

// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE

// USE OR OTHER DEALINGS IN THE SOFTWARE.

"use strict";

var R = typeof Reflect === "object" ? Reflect : null;

var ReflectApply =
  R && typeof R.apply === "function"
    ? R.apply
    : function ReflectApply(target, receiver, args) {
        return Function.prototype.apply.call(target, receiver, args);
      };

var ReflectOwnKeys;

if (R && typeof R.ownKeys === "function") {
  ReflectOwnKeys = R.ownKeys;
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target).concat(
      Object.getOwnPropertySymbols(target)
    );
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN =
  Number.isNaN ||
  function NumberIsNaN(value) {
    return value !== value;
  };

function EventEmitter() {
  EventEmitter.init.call(this);
}

module.exports = EventEmitter;

module.exports.once = once;

// Backwards-compat with node 0.10.x

EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;

EventEmitter.prototype._eventsCount = 0;

EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are

// added to it. This is a useful default which helps finding memory leaks.

var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== "function") {
    throw new TypeError(
      'The "listener" argument must be of type Function. Received type ' +
        typeof listener
    );
  }
}

Object.defineProperty(EventEmitter, "defaultMaxListeners", {
  enumerable: true,

  get: function () {
    return defaultMaxListeners;
  },

  set: function (arg) {
    if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError(
        'The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' +
          arg +
          "."
      );
    }

    defaultMaxListeners = arg;
  },
});

EventEmitter.init = function () {
  if (
    this._events === undefined ||
    this._events === Object.getPrototypeOf(this)._events
  ) {
    this._events = Object.create(null);

    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows

// that to be increased. Set to zero for unlimited.

EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
    throw new RangeError(
      'The value of "n" is out of range. It must be a non-negative number. Received ' +
        n +
        "."
    );
  }

  this._maxListeners = n;

  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined) return EventEmitter.defaultMaxListeners;

  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];

  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);

  var doError = type === "error";

  var events = this._events;

  if (events !== undefined) doError = doError && events.error === undefined;
  else if (!doError) return false;

  // If there is no 'error' event listener then throw.

  if (doError) {
    var er;

    if (args.length > 0) er = args[0];

    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show

      // up in Node's output if this results in an unhandled exception.

      throw er; // Unhandled 'error' event
    }

    // At least give some kind of context to the user

    var err = new Error(
      "Unhandled error." + (er ? " (" + er.message + ")" : "")
    );

    err.context = er;

    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined) return false;

  if (typeof handler === "function") {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;

    var listeners = arrayClone(handler, len);

    for (var i = 0; i < len; ++i) ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;

  var events;

  var existing;

  checkListener(listener);

  events = target._events;

  if (events === undefined) {
    events = target._events = Object.create(null);

    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before

    // adding it to the listeners, first emit "newListener".

    if (events.newListener !== undefined) {
      target.emit(
        "newListener",
        type,

        listener.listener ? listener.listener : listener
      );

      // Re-assign `events` because a newListener handler could have caused the

      // this._events to be assigned to a new object

      events = target._events;
    }

    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.

    existing = events[type] = listener;

    ++target._eventsCount;
  } else {
    if (typeof existing === "function") {
      // Adding the second element, need to change to array.

      existing = events[type] = prepend
        ? [listener, existing]
        : [existing, listener];

      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak

    m = _getMaxListeners(target);

    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;

      // No error code for this since it is a Warning

      // eslint-disable-next-line no-restricted-syntax

      var w = new Error(
        "Possible EventEmitter memory leak detected. " +
          existing.length +
          " " +
          String(type) +
          " listeners " +
          "added. Use emitter.setMaxListeners() to " +
          "increase limit"
      );

      w.name = "MaxListenersExceededWarning";

      w.emitter = target;

      w.type = type;

      w.count = existing.length;

      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener = function prependListener(
  type,
  listener
) {
  return _addListener(this, type, listener, true);
};

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);

    this.fired = true;

    if (arguments.length === 0) return this.listener.call(this.target);

    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = {
    fired: false,
    wrapFn: undefined,
    target: target,
    type: type,
    listener: listener,
  };

  var wrapped = onceWrapper.bind(state);

  wrapped.listener = listener;

  state.wrapFn = wrapped;

  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);

  this.on(type, _onceWrap(this, type, listener));

  return this;
};

EventEmitter.prototype.prependOnceListener = function prependOnceListener(
  type,
  listener
) {
  checkListener(listener);

  this.prependListener(type, _onceWrap(this, type, listener));

  return this;
};

// Emits a 'removeListener' event if and only if the listener was removed.

EventEmitter.prototype.removeListener = function removeListener(
  type,
  listener
) {
  var list, events, position, i, originalListener;

  checkListener(listener);

  events = this._events;

  if (events === undefined) return this;

  list = events[type];

  if (list === undefined) return this;

  if (list === listener || list.listener === listener) {
    if (--this._eventsCount === 0) this._events = Object.create(null);
    else {
      delete events[type];

      if (events.removeListener)
        this.emit("removeListener", type, list.listener || listener);
    }
  } else if (typeof list !== "function") {
    position = -1;

    for (i = list.length - 1; i >= 0; i--) {
      if (list[i] === listener || list[i].listener === listener) {
        originalListener = list[i].listener;

        position = i;

        break;
      }
    }

    if (position < 0) return this;

    if (position === 0) list.shift();
    else {
      spliceOne(list, position);
    }

    if (list.length === 1) events[type] = list[0];

    if (events.removeListener !== undefined)
      this.emit("removeListener", type, originalListener || listener);
  }

  return this;
};

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
  var listeners, events, i;

  events = this._events;

  if (events === undefined) return this;

  // not listening for removeListener, no need to emit

  if (events.removeListener === undefined) {
    if (arguments.length === 0) {
      this._events = Object.create(null);

      this._eventsCount = 0;
    } else if (events[type] !== undefined) {
      if (--this._eventsCount === 0) this._events = Object.create(null);
      else delete events[type];
    }

    return this;
  }

  // emit removeListener for all listeners on all events

  if (arguments.length === 0) {
    var keys = Object.keys(events);

    var key;

    for (i = 0; i < keys.length; ++i) {
      key = keys[i];

      if (key === "removeListener") continue;

      this.removeAllListeners(key);
    }

    this.removeAllListeners("removeListener");

    this._events = Object.create(null);

    this._eventsCount = 0;

    return this;
  }

  listeners = events[type];

  if (typeof listeners === "function") {
    this.removeListener(type, listeners);
  } else if (listeners !== undefined) {
    // LIFO order

    for (i = listeners.length - 1; i >= 0; i--) {
      this.removeListener(type, listeners[i]);
    }
  }

  return this;
};

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined) return [];

  var evlistener = events[type];

  if (evlistener === undefined) return [];

  if (typeof evlistener === "function")
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap
    ? unwrapListeners(evlistener)
    : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function (emitter, type) {
  if (typeof emitter.listenerCount === "function") {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;

function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === "function") {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);

  for (var i = 0; i < n; ++i) copy[i] = arr[i];

  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++) list[index] = list[index + 1];

  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);

  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }

  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);

      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === "function") {
        emitter.removeListener("error", errorListener);
      }

      resolve([].slice.call(arguments));
    }

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });

    if (name !== "error") {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === "function") {
    eventTargetAgnosticAddListener(emitter, "error", handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === "function") {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === "function") {
    // EventTarget does not have `error` event semantics like Node

    // EventEmitters, we do not listen for `error` events here.

    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we

      // have to do it manually.

      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }

      listener(arg);
    });
  } else {
    throw new TypeError(
      'The "emitter" argument must be of type EventEmitter. Received type ' +
        typeof emitter
    );
  }
}

class WebSocketTransport extends EventEmitter {
  constructor(client) {
    super();

    this.client = client;

    this.ws = null;

    this.tries = 0;
  }

  async connect() {
    const port = 6463 + (this.tries % 10);

    this.tries += 1;

    this.ws = new WebSocket(
      `ws://127.0.0.1:${port}/?v=1&client_id=${this.client.clientId}`,

      { origin: this.client.options.origin }
    );

    this.ws.onopen = this.onOpen.bind(this);

    this.ws.onclose = this.onClose.bind(this);

    this.ws.onerror = this.onError.bind(this);

    this.ws.onmessage = this.onMessage.bind(this);
  }

  onOpen() {
    this.emit("open");
  }

  onClose(event) {
    if (!event.wasClean) {
      return;
    }

    this.emit("close", event);
  }

  onError(event) {
    try {
      this.ws.close();
    } catch {} // eslint-disable-line no-empty

    if (this.tries > 20) {
      this.emit("error", event.error);
    } else {
      setTimeout(() => {
        this.connect();
      }, 250);
    }
  }

  onMessage(event) {
    this.emit("message", JSON.parse(event.data));
  }

  send(data) {
    this.ws.send(JSON.stringify(data));
  }

  ping() {} // eslint-disable-line no-empty-function

  close() {
    return new Promise((r) => {
      this.once("close", r);

      this.ws.close();
    });
  }
}

function subKey(event, args) {
  return `${event}${JSON.stringify(args)}`;
}

/**

 * @typedef {RPCClientOptions}

 * @extends {ClientOptions}

 * @prop {string} transport RPC transport. one of `ipc` or `websocket`

 */

/**

 * The main hub for interacting with Discord RPC

 * @extends {BaseClient}

 */

class RPCClient extends EventEmitter {
  /**

   * @param {RPCClientOptions} [options] Options for the client.

   * You must provide a transport

   */

  constructor(options = {}) {
    super();

    this.options = options;

    this.accessToken = null;

    this.clientId = null;

    /**

     * Application used in this client

     * @type {?ClientApplication}

     */

    this.application = null;

    /**

     * User used in this application

     * @type {?User}

     */

    this.user = null;

    const Transport = transports[options.transport];

    if (!Transport) {
      throw new TypeError("RPC_INVALID_TRANSPORT", options.transport);
    }

    this.fetch = (method, path, { data, query } = {}) =>
      fetch(
        `${this.fetch.endpoint}${path}${
          query ? new URLSearchParams(query) : ""
        }`,
        {
          method,

          body: data,

          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      ).then(async (r) => {
        const body = await r.json();

        if (!r.ok) {
          const e = new Error(r.status);

          e.body = body;

          throw e;
        }

        return body;
      });

    this.fetch.endpoint = "https://discord.com/api";

    /**

     * Raw transport userd

     * @type {RPCTransport}

     * @private

     */

    this.transport = new WebSocketTransport(this);

    this.transport.on("message", this._onRpcMessage.bind(this));

    /**

     * Map of nonces being expected from the transport

     * @type {Map}

     * @private

     */

    this._expecting = new Map();

    this._connectPromise = undefined;
  }

  /**

   * Search and connect to RPC

   */

  connect(clientId) {
    if (this._connectPromise) {
      return this._connectPromise;
    }

    this._connectPromise = new Promise((resolve, reject) => {
      this.clientId = clientId;

      const timeout = setTimeout(
        () => reject(new Error("RPC_CONNECTION_TIMEOUT")),
        10e3
      );

      timeout.unref();

      this.once("connected", () => {
        clearTimeout(timeout);

        resolve(this);
      });

      this.transport.once("close", () => {
        this._expecting.forEach((e) => {
          e.reject(new Error("connection closed"));
        });

        this.emit("disconnected");

        reject(new Error("connection closed"));
      });

      this.transport.connect().catch(reject);
    });

    return this._connectPromise;
  }

  /**

   * @typedef {RPCLoginOptions}

   * @param {string} clientId Client ID

   * @param {string} [clientSecret] Client secret

   * @param {string} [accessToken] Access token

   * @param {string} [rpcToken] RPC token

   * @param {string} [tokenEndpoint] Token endpoint

   * @param {string[]} [scopes] Scopes to authorize with

   */

  /**

   * Performs authentication flow. Automatically calls Client#connect if needed.

   * @param {RPCLoginOptions} options Options for authentication.

   * At least one property must be provided to perform login.

   * @example client.login({ clientId: '1234567', clientSecret: 'abcdef123' });

   * @returns {Promise<RPCClient>}

   */

  async login(options = {}) {
    let { clientId, accessToken } = options;

    await this.connect(clientId);

    if (!options.scopes) {
      this.emit("ready");

      return this;
    }

    if (!accessToken) {
      accessToken = await this.authorize(options);
    }

    return this.authenticate(accessToken);
  }

  /**

   * Request

   * @param {string} cmd Command

   * @param {Object} [args={}] Arguments

   * @param {string} [evt] Event

   * @returns {Promise}

   * @private

   */

  request(cmd, args, evt) {
    return new Promise((resolve, reject) => {
      const nonce = uuid();

      this.transport.send({ cmd, args, evt, nonce });

      this._expecting.set(nonce, { resolve, reject });
    });
  }

  /**

   * Message handler

   * @param {Object} message message

   * @private

   */

  _onRpcMessage(message) {
    if (message.cmd === "DISPATCH" && message.evt === RPCEvents.READY) {
      if (message.data.user) {
        this.user = message.data.user;
      }

      this.emit("connected");
    } else if (this._expecting.has(message.nonce)) {
      const { resolve, reject } = this._expecting.get(message.nonce);

      if (message.evt === "ERROR") {
        const e = new Error(message.data.message);

        e.code = message.data.code;

        e.data = message.data;

        reject(e);
      } else {
        resolve(message.data);
      }

      this._expecting.delete(message.nonce);
    } else {
      this.emit(message.evt, message.data);
    }
  }

  /**

   * Authorize

   * @param {Object} options options

   * @returns {Promise}

   * @private

   */

  async authorize({
    scopes,
    clientSecret,
    rpcToken,
    redirectUri,
    prompt,
  } = {}) {
    if (clientSecret && rpcToken === true) {
      const body = await this.fetch("POST", "/oauth2/token/rpc", {
        data: new URLSearchParams({
          client_id: this.clientId,

          client_secret: clientSecret,
        }),
      });

      rpcToken = body.rpc_token;
    }

    const { code } = await this.request("AUTHORIZE", {
      scopes,

      client_id: this.clientId,

      prompt,

      rpc_token: rpcToken,
    });

    const response = await this.fetch("POST", "/oauth2/token", {
      data: new URLSearchParams({
        client_id: this.clientId,

        client_secret: clientSecret,

        code,

        grant_type: "authorization_code",

        redirect_uri: redirectUri,
      }),
    });

    return response.access_token;
  }

  /**

   * Authenticate

   * @param {string} accessToken access token

   * @returns {Promise}

   * @private

   */

  authenticate(accessToken) {
    return this.request("AUTHENTICATE", { access_token: accessToken }).then(
      ({ application, user }) => {
        this.accessToken = accessToken;

        this.application = application;

        this.user = user;

        this.emit("ready");

        return this;
      }
    );
  }

  /**

   * Sets the presence for the logged in user.

   * @param {object} args The rich presence to pass.

   * @param {number} [pid] The application's process ID. Defaults to the executing process' PID.

   * @returns {Promise}

   */

  setActivity(args = {}) {
    let timestamps;

    let assets;

    let party;

    let secrets;

    if (args.startTimestamp || args.endTimestamp) {
      timestamps = {
        start: args.startTimestamp,

        end: args.endTimestamp,
      };

      if (timestamps.start instanceof Date) {
        timestamps.start = Math.round(timestamps.start.getTime());
      }

      if (timestamps.end instanceof Date) {
        timestamps.end = Math.round(timestamps.end.getTime());
      }

      if (timestamps.start > 2147483647000) {
        throw new RangeError("timestamps.start must fit into a unix timestamp");
      }

      if (timestamps.end > 2147483647000) {
        throw new RangeError("timestamps.end must fit into a unix timestamp");
      }
    }

    if (
      args.largeImageKey ||
      args.largeImageText ||
      args.smallImageKey ||
      args.smallImageText
    ) {
      assets = {
        large_image: args.largeImageKey,

        large_text: args.largeImageText,

        small_image: args.smallImageKey,

        small_text: args.smallImageText,
      };
    }

    if (args.partySize || args.partyId || args.partyMax) {
      party = { id: args.partyId };

      if (args.partySize || args.partyMax) {
        party.size = [args.partySize, args.partyMax];
      }
    }

    if (args.matchSecret || args.joinSecret || args.spectateSecret) {
      secrets = {
        match: args.matchSecret,

        join: args.joinSecret,

        spectate: args.spectateSecret,
      };
    }

    return this.request("SET_ACTIVITY", {
      pid: 2094112,

      activity: {
        state: args.state,

        details: args.details,

        timestamps,

        assets,

        party,

        secrets,

        buttons: args.buttons,

        instance: !!args.instance,
      },
    });
  }

  /**

   * Clears the currently set presence, if any. This will hide the "Playing X" message

   * displayed below the user's name.

   * @param {number} [pid] The application's process ID. Defaults to the executing process' PID.

   * @returns {Promise}

   */

  clearActivity() {
    return this.request("SET_ACTIVITY", {
      pid: 2094112,
    });
  }

  /**

   * Destroy the client

   */

  async destroy() {
    await this.transport.close();
  }
}

exports = RPCClient;
