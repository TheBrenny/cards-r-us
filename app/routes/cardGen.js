const router = require("express").Router();
const fs = require("fs");

const suitColors = {
    "diamond": "red",
    "heart": "red",
    "spade": "black",
    "club": "black",
    "joker": "black"
};
const suitPaths = {
    "diamond": "M 40,10 a 80,150 0,00 33,50 a 80,150 0,00 -33,50 a 80,150 0,00 -33,-50 a 80,150 0,00 33,-50 Z",
    "heart": "M 10,40 a 1,1.2 0,0,1 30,-5 a 1,1.2 0,0,1 30,5 q -5,30 -30,66 q -25,-36 -30,-66 Z",
    "spade": "M 40,105 h -12 q 5,-10 7,-20 a 10,10 0,0,1 -20,-27 q 20,-20 25,-45 q 5,20 25,45 a 10,10 0,0,1 -20,27 q 2,10 7,20 h -12 Z",
    "club": "M 40,105 h -12 q 5,-10 7,-25 A 17.4,18 0,1,1 25,50 A 20.2,20.2 0,1,1 55,50 A 17.4,18 0,1,1 45,80 Q 47,95 52,105 h -12 Z",
    "joker": "Z"
};
const valueFace = {
    "ace": "A",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "10": "10",
    "jack": "J",
    "queen": "Q",
    "king": "K",
    "joker": "🤡"
};

router.get("/card/back", (req, res) => {
    res.header("Content-Type", "image/svg+xml").sendFile(`${__dirname}/util/cardBack.svg`);
});

router.get("/card/:suit/:value", (req, res) => {
    let suit = req.params.suit;
    let value = req.params.value;
    if(value?.startsWith("joker")) value = "joker";

    let color = suitColors[suit];
    let face = valueFace[value];
    let path = suitPaths[suit];

    let card = fs.readFileSync(`${__dirname}/util/cardFront.svg`)
        .toString()
        .replaceAll("{{path}}", path)
        .replaceAll("{{color}}", color)
        .replaceAll("{{face}}", face);

    res.header("Content-Type", "image/svg+xml").send(card).end();
});

module.exports = router;