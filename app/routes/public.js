const router = require("express").Router();
const {Room, RoomMate} = require("../../game/room");
const gss = require("../../game/gss");
const {errors} = require("./express-errors/generic");
const WordBuilder = require("mini-word-smith");

router.use((req, res, next) => {
    res.locals.roommate = RoomMate.roommateID;
    next();
});

// This is the home route
router.get(["/", "/game"], (req, res) => {
    res.render("home", {});
});

router.get("/game/:id", (req, res) => {
    let id = req.params.id;
    if(id === RoomMate.roommateID) throw errors.badRequest.fromReq(req, "RoomMate ID is reserved");
    let room = RoomMate.getRoom(id);
    
    // TODO: Maybe don't throw an error but ask to make a room?
    if(!room) throw errors.badRequest.fromReq(req, `Room ${id} does not exist`);

    res.render("game", {
        room: room,
        namePlaceholder: new WordBuilder("an").toString(" "),
    });
});

module.exports = router;