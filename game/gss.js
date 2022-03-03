const {WebSocketServer} = require("ws");

class GameSocketServer {
    constructor(id, options = {}) {
        this.id = id;
        this.socketServer = new WebSocketServer({noServer: true, clientTracking: true});

        if(!!options.onOpen) this.socketServer.on("listening", options.onOpen.bind(this));
        if(!!options.onConnection) this.socketServer.on("connection", options.onConnection.bind(this));
        if(!!options.onHandleMessage) this.socketServer.on("connection", (ws, req) => {
            ws.on("message", (event) => {
                let msg = event.toString();
                msg = msg.split(":");
                if(msg[0] == "cards") options.onHandleMessage(ws, msg[1], JSON.parse(msg.slice(2).join(":")));
            });
        });
        if(!!options.onError) this.socketServer.on("error", options.onError.bind(this));
        if(!!options.onClose) this.socketServer.on("close", options.onClose.bind(this));
        if(!!options.onHeaders) this.socketServer.on("headers", options.onHeaders.bind(this));
    }

    on(event, callback) {
        this.socketServer.on(event, callback);
    }

    /**
     * @param {import('ws').WebSocket} socket 
     * @param {any} message 
     */
    send(socket, messageType, message) {
        if(message === undefined) {
            message = messageType;
            messageType = "unknown";
            console.trace(`[GameSocketServer:${this.id}] Warning: messageType is undefined, sending as 'unknown'`);
        }
        if(typeof message === "object") message = JSON.stringify(message);
        socket.send(`cards:${messageType}:${message}`);
    }

    sendToAll(messageType, message) {
        this.socketServer.clients.forEach(socket => this.send(socket, messageType, message));
    }

    handleUpgrade(req, sock, head) {
        this.socketServer.handleUpgrade(req, sock, head, (ws, request) => {
            this.socketServer.emit('connection', ws, request);
        });
    }

    close(reason) {
        reason = Object.assign({code: 1000, reason: "Server shutdown"}, reason);
        this.socketServer.clients.forEach(socket => socket.close(reason.code, reason.reason));
        this.socketServer.close();
        this.socketServer = null;
        deregisterSocketServer(this.id, this.path);
    }
}

const registeredListeners = {
    // "gameID": GameSocketServer
};

let expressServer;
let isSetUp = false;

function setup(server, forceRecreate = false) {
    if(isSetUp && !forceRecreate) return;

    isSetUp = true;
    expressServer = server;

    expressServer.on("upgrade", handleUpgrade);
}

function registerNewSocketServer(id, options = {}) {
    const sock = new GameSocketServer(id, options);
    registeredListeners[id] = sock;
    console.log(`Registered new socket server: ${id}`);
    return sock;
}
function deregisterSocketServer(id) {
    delete registeredListeners[id];
}

function getSocketServer(id) {
    return registeredListeners[id];
}

function handleUpgrade(req, sock, head) {
    let socket = registeredListeners[req.url.split("/")[2]]; // "/game/:id"

    if(!!socket) {
        socket.handleUpgrade(req, sock, head);
    } else {
        sock.write("HTTP/1.1 404 Not Found\r\n\r\n");
        sock.end().destroy();
    }
}

module.exports = {
    setup,
    registerNewSocketServer,
    getSocketServer,
    GameSocketServer
};