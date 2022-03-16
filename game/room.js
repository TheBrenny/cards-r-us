const gss = require("./gss");
const WordBuilder = require("mini-word-smith");

class Room {
    constructor(id, options = {}) {
        this.id = id || generateRoomId();
        this.name = options?.name ?? new WordBuilder("aan").toString(" ");
        this.table = {};
        this.table.shape = options?.table?.shape ?? "7";
        this.table.color = options?.table?.color ?? `#${(~~(Math.random() * 0xffffff)).toString(16).padStart(6, "0")}`;
        this.floor = options?.floor ?? `#${(~~(Math.random() * 0xffffff)).toString(16).padStart(6, "0")}`;
        this.jokers = parseInt(options?.jokers ?? 2);
        this.cards = Room.generateDeck(parseInt(options?.deckCount ?? 1), this.jokers);
        this.cards.cardsInDeck = this.cards.cardsInDeck.sort(() => Math.random() - 0.5);
        this._players = {}; // {name: {ws: socket, name: "...", offset: degreeOffset}}
        this._spectators = [];

        let rm = this;
        this.gss = gss.registerNewSocketServer(this.id, {
            onHandleMessage: rm.handleMessage.bind(rm),
            onConnection(ws, req) {
                rm.gss.send(ws, "state", rm.state);
            }
        });
        RoomMate.addRoom(this);

        this._nextOffset = 0;
    }

    get state() {
        return {
            roomID: this.id,
            name: this.name,
            players: this.players,
            spectators: this._spectators.length,
            table: this.table,
            floor: this.floor,
            cards: this.cards
        };
    }

    handleMessage(ws, messageType, message) {
        if(messageType === "spectate") {
            this._spectators.push(ws);
            this.gss.send(ws, "spectate", {success: true});
            this.gss.send(ws, "state", this.state);
        }

        if(message.name == null) {
            this.gss.send(ws, messageType, {success: false, message: "Spectators cannot interact with the game!"});
            return;
        }
        if(messageType === "enterroom") {
            try {
                let player = Object.assign({}, this.addPlayer(ws, message.name));
                delete player.ws;
                this.gss.send(ws, "enterroom", {success: true, player});
                this.gss.sendToAll("state", this.state);
            } catch(e) {
                this.gss.send(ws, "enterroom", {success: false, message: e.message});
            }
        }
        else if(messageType === "cardmove") {
            // update internal state
            // TODO: Move the redraw logic to the client side
            let redraw = this.cards[message.cardID].moving !== message.moving;
            redraw = redraw || this.cards[message.cardID].faceUp !== message.faceUp;
            Object.assign(this.cards[message.cardID], message);
            // propagate the message to all clients
            this.gss.sendToAll("cardmove", {...message, redraw});
        }
        else if(messageType === "drawcard") {
            let cardID = this.cards.cardsInDeck.pop();
            if(cardID === undefined) return this.gss.sendToAll("drawcard", {success: false, message: "No cards left in the deck"});
            this.cards[cardID].x = message.x;
            this.cards[cardID].y = message.y;
            // TODO: set to moving
            this.cards[cardID].owner = message.name;
            this.cards[cardID].faceUp = message.faceUp;
            this.gss.sendToAll("drawcard", this.cards[cardID]);
        }
        else if(messageType === "shuffle") {
            this.cards.cardsInDeck = this.cards.cardsInDeck.sort(() => Math.random() - 0.5);
            this.gss.sendToAll("shuffle", {success: true});
        }
        else {
            console.error(`Unhandled message type: ${messageType}`);
        }
    }

    addPlayer(ws, name) {
        if(!!this._players[name] && !this._players[name].ws.destroyed) throw new Error(`Player ${name} already exists in room ${this.id}`);
        this.fixPlayerOffsets();
        this._players[name] = {ws, name, offset: this.nextOffset};
        return this._players[name];
    }
    removePlayer(name, reason = "") {
        if(!this._players[name]) throw new Error(`Player ${name} does not exist in room ${this.id}`);
        this._players[name].ws.end(reason).destroy();
        let p = this._players[name];
        delete this._players[name];
        this.fixPlayerOffsets();
        return p;
    }
    hasPlayer(name) {
        return this._players[name] !== undefined;
    }

    fixPlayerOffsets() {
        this._nextOffset = 0;
        Object.values(this._players)
            .sort((a, b) => a.offset - b.offset)
            .forEach(p => p.offset = this.nextOffset);
        return this._nextOffset;
    }

    get players() {
        return Object.values(this._players).map(p => ({name: p.name, offset: p.offset})).sort((a, b) => a.offset - b.offset);
    }
    get nextOffset() {
        return this._nextOffset++;
    }

    static generateDeck(deckCount, jokers) {
        let cards = ["ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"];
        let suits = ["club", "diamond", "heart", "spade"];
        let decks = [...Array(deckCount)].map((_, i) => "deck" + (i + 1));
        let ret = {cardsInDeck: []};

        let cardID = "";
        for(let d of decks) {
            for(let s of suits) {
                for(let c of cards) {
                    cardID = `${d}.${s}.${c}`;
                    ret[cardID] = {
                        cardID: cardID,
                        x: 0,
                        y: 0,
                        faceUp: false,
                        owner: null,
                        moving: false,
                        culprint: null
                    };
                    ret.cardsInDeck.push(cardID);
                }
            }
        }
        for(let j = 0; j < jokers; j++) {
            cardID = `deck1.joker.joker${j}`;
            ret[cardID] = {
                cardID: cardID,
                x: 0,
                y: 0,
                faceUp: false,
                owner: null,
                moving: false,
                culprint: null
            };
            ret.cardsInDeck.push(cardID);
        }

        return ret;
    }
}

let roommateInstance;
class RoomMate {
    constructor(options = {}) {
        roommateInstance = this;
        this.options = Object.assign({}, options);
        this.allRooms = {};
        this.cache = {};

        let rm = this;
        this.gss = gss.registerNewSocketServer(RoomMate.roommateID, {
            onHandleMessage: rm.handleMessage.bind(rm),
        });
    }

    handleMessage(ws, messageType, message) {
        if(messageType === "list") this.gss.send(ws, "list", RoomMate.getAllRooms());
        if(messageType === "createroom") {
            let id = message.id;
            let room = new Room(id, message);
            this.gss.send(ws, "createroom", {success: true, roomID: room.id});
        }
        if(messageType === "roomexists") {
            let id = message.id;
            let room = RoomMate.getRoom(id);
            let data = {
                success: !!room,
                roomID: room?.id ?? -1,
            };
            if(!data.success) data.message = "Room does not exist";
            this.gss.send(ws, "roomexists", data);
        }
    }

    static addRoom(room) {
        RoomMate.instance.allRooms[room.id] = room;
        RoomMate.instance.cache.allRooms = null;
    }
    static delRoom(id) {
        delete RoomMate.instance.allRooms[id];
        RoomMate.instance.cache.allRooms = null;
    }
    static getRoom(id) {
        let room = RoomMate.instance.allRooms[id];
        return room;
    }
    static getAllRooms() {
        return RoomMate.instance.cache.allRooms ?? (RoomMate.instance.cache.allRooms = Object.values(RoomMate.instance.allRooms));
    }

    static get instance() {
        return roommateInstance ?? (roommateInstance = new RoomMate());
    }
    static get roommateID() {return "__roommate";}
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8);
}

module.exports = {Room, RoomMate};