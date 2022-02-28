const router = require("express").Router();
const {Room, RoomMate} = require("../../game/room");
const gss = require("../../game/gss");
const {errors} = require("./errors/404");

// This is the home route
router.get(["/"], (req, res) => {
    const roommate = RoomMate.roommateID;

    let rooms = Room.getAllRooms().map(room => ({
        id: room.id,
        players: room.players.length,
        roommate: roommate
    }));

    res.format({
        html: () => res.render("home", {rooms, roommate}),
        json: () => res.json({success: true, rooms, roommate})
    });
});

router.get("/game/" + gss.roommate, (req, res) => {
    let rooms = RoomMate.getAllRooms().map(room => ({
        id: room.id,
        players: room.players.length,
        roommate: gss.roommateID
    }));
});

router.post(["/game/new", "/game/new/:id"], (req, res) => {
    let id = req.params.id ?? Math.random().toString(36).substring(2, 8);
    if(id === gss.roommateID) throw errors.badRequest.fromReq(req);

    let room = new Room(id);
    
    res.format({
        html: () => res.render("game", {id: room.id}),
        json: () => res.json({success: true, id: room.id})
    });
});



module.exports = router;