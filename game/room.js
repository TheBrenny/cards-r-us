const gss = require("./gss");

class Room {
    constructor(id, options = {}) {
        this.id = id;
        this.options = Object.assign({
            // Default options
        }, options);
        this.gss = gss.registerNewSocketServer(this.id);
        allRooms.push(this);

        // Actual room stuff
        this._players = {}; // {name: {ws: socket, name: "..."}}
    }

    addPlayer(ws, name) {
        if(!!this._players[name] && !this._players[name].ws.destroyed) throw new Error(`Player ${name} already exists in room ${this.id}`);

        this._players.push({ws, name});
    }
    kickPlayer(name, reason = "") {
        if(!this._players[name]) throw new Error(`Player ${name} does not exist in room ${this.id}`);

        this._players[name].ws.end(reason).destroy();
        delete this._players[name];
    }

    get players() {
        return Object.values(this._players);
    }
}

let roommateInstance;
class RoomMate {
    constructor(options = {}) {
        roommateInstance = this;
        this.options = Object.assign({}, options);

        this.gss = gss.registerNewSocketServer(this.id);
        this.gss.on("connection", (ws, req) => {
            ws.on("message", (message) => {
                if(message.startsWith("roommate:list")) {
                    this.gss.send(ws, );
                }
            });
        });

        this.allRooms = {};
        this.cache = {};
    }

    addRoom(room) {
        this.allRooms[room.id] = room;
    }
    getRoom(id) {
        let room = this.allRooms[id];
        if(!room) throw new Error(`Room ${id} does not exist`);
        return room;
    }
    getAllRooms() {
        return this.cache.allRooms ?? (this.cache.allRooms = Object.values(this.allRooms));
    }

    static get instance() {
        return roommateInstance ?? (roommateInstance = new RoomMate());
    }
    static get roommateID() {return "__roommate";}
}

module.exports = {Room, RoomMate};