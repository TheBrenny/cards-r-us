// Game Socket Client

class GameSocketClient extends WebSocket {
    constructor(id) {
        // This'll give us the s: from https: and add it to ws, so it becomes wss://
        super(`ws${location.protocol.substring("http".length)}//` + location.host + "/game/" + id);

        this.id = id;

        this.cardEvents = new GameEventEmitter();

        this.on('open', () => {
            notifier.notify("Client connected!", "verbose");
        });
        this.on('close', () => {
            notifier.notify("Client disconnected!", "warning");
        });
        this.on('error', (err) => {
            notifier.notify("Client encountered an error: " + err?.message ?? "unknown", "error");
            console.error('Errored from server');
            console.error(err);
        });
        this.on('message', (event) => {
            let msg = event.data;
            console.log(msg);
            msg = msg.split(":");
            if(msg[0] == "cards") this.cardEvents.emit(msg[1], JSON.parse(msg.slice(2).join(":")));
        });
    }

    on(event, callback) {
        if(event.startsWith("cards:")) this.cardEvents.addEventListener(event.substring("cards:".length), callback);
        else this.addEventListener(event, callback);
        return this;
    }

    once(event, callback) {
        if(event.startsWith("cards:")) this.cardEvents.addEventListener(event.substring("cards:".length), callback, {once: true});
        else this.addEventListener(event, callback, {once: true});
        return this;
    }

    send(messageType, data) {
        if(!(data ?? false)) return super.send(messageType); // If there's no data, just send the messageType because it's probably the message
        super.send(`cards:${messageType}:${JSON.stringify(data)}`);
    }
}

class GameEventEmitter extends EventTarget {
    constructor() {
        super(...arguments);
    }

    emit(event, data) {
        this.dispatchEvent(new GameEvent(event, data));
    }
}

class GameEvent extends Event {
    constructor(event, data) {
        super(event);
        this.data = data;
    }
}