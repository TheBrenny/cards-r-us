const dpr = window.devicePixelRatio || 1;

const tableMargin = 40;
const tablePadding = 40;
let tableSize = null;
const playerColor = "#00000033";
const heroColor = "#ffffff33";
let playerRadius = null;

let debugMode = false;
let debugCard = -1;

const cardRatio = 12 / 8;
const cardWidth = 30 * dpr;
const cardHeight = cardWidth * cardRatio;

const halfPi = Math.PI / 2;

let backface;

class Canvas {
    constructor(canvas, gameState) {
        this.canvas = canvas;
        this.storedCanvas = document.createElement("canvas");
        this.storedCanvas.width = this.canvas.width;
        this.storedCanvas.height = this.canvas.height;
        this.storedCanvasRedraw = true;
        this.ctx = canvas.getContext("2d", {alpha: false});
        this.storedCanvasCtx = this.storedCanvas.getContext("2d", {alpha: false});
        this.gameState = gameState;
        this.resize();
        this.renderSplash();
    }

    async renderSplash() {
        if(this.gameState.ready) {
            delete this.color;
            this.storedCanvasRedraw = true;
            return this.render();
        }

        // Clear Screen
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw BG
        this.color = this.color ?? [(Math.random() * 200), (Math.random() * 200), (Math.random() * 200)];
        let rci = ~~(Math.random() * 3);
        this.color[rci] += (Math.random() * 5) - 2.5;
        this.color[rci] = Math.max(0, Math.min(200, this.color[rci]));
        this.ctx.fillStyle = "#" + this.color.map(c => (~~c).toString(16).padStart(2, "0")).join("");
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw splash/loading
        this.ctx.fillStyle = "#fff";
        this.ctx.font = `${30 * dpr}px Rubik`;
        this.ctx.textAlign = "center";
        this.ctx.fillText("Loading...", this.canvas.width / 2, this.canvas.height / 2);

        window.requestAnimationFrame(this.renderSplash.bind(this));
    }

    async render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if(!backface) backface = await getCardImage("back");

        // Floor, Table and static cards
        if(this.storedCanvasRedraw) {
            this.storedCanvasCtx.clearRect(0, 0, this.storedCanvas.width, this.storedCanvas.height);
            // Floor
            this.storedCanvasCtx.fillStyle = gameState.floor;
            this.storedCanvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Table
            this.storedCanvasCtx.fillStyle = this.gameState.table.color;
            this.storedCanvasCtx.beginPath();
            if(gameState.table.shape === "circle") this.storedCanvasCtx.arc(this.canvas.width / 2, this.canvas.height / 2, tableSize / 2 - tableMargin, 0, 2 * Math.PI);
            else {
                let numPoints = Math.max(4, parseInt(this.gameState.table.shape)); // min 4 points
                let angle = 2 * Math.PI / numPoints;
                let radius = tableSize / 2;

                let x = this.canvas.width / 2 + radius * Math.cos(0);
                let y = this.canvas.height / 2 + radius * Math.sin(0);
                this.storedCanvasCtx.moveTo(x, y);
                for(let i = 1; i < numPoints; i++) {
                    x = this.canvas.width / 2 + radius * Math.cos(i * angle);
                    y = this.canvas.height / 2 + radius * Math.sin(i * angle);
                    this.storedCanvasCtx.lineTo(x, y);
                }
            }
            this.storedCanvasCtx.fill();
            this.storedCanvasCtx.save();
            this.storedCanvasCtx.clip();

            // Table cloth
            this.storedCanvasCtx.fillStyle = "#FFFFFF33";
            this.storedCanvasCtx.beginPath();
            this.storedCanvasCtx.arc(this.canvas.width / 2, this.canvas.height / 2, tableSize / 2 - tableMargin - tablePadding, 0, 2 * Math.PI);
            this.storedCanvasCtx.fill();

            // Players
            this.calculatePlayerRadius();
            this.getPlayerPositions();
            let ppEntries = Object.entries(playerPositions);
            let pp;
            let numPlayers = this.gameState.players.length;
            for(let i = 0; i < numPlayers; i++) {
                pp = ppEntries[i][1]; // the {x, y} object
                this.storedCanvasCtx.fillStyle = ppEntries[i][0] === thePlayer?.name ? heroColor : playerColor;
                this.storedCanvasCtx.beginPath();
                this.storedCanvasCtx.arc(pp.x, pp.y, playerRadius, 0, 2 * Math.PI);
                this.storedCanvasCtx.fill();
            }
            this.storedCanvasCtx.restore();
            for(let i = 0; i < numPlayers; i++) {
                pp = ppEntries[i];
                this.storedCanvasCtx.fillStyle = "#fff";
                this.storedCanvasCtx.font = `${15 * dpr}px Rubik`;
                this.storedCanvasCtx.textAlign = "center";
                this.storedCanvasCtx.fillText(pp[0], pp[1].x, pp[1].y);
            }

            // Static cards
            for(let i = 0; i < this.gameState.cardOrder.length; i++) {
                let card = this.gameState.cards[this.gameState.cardOrder[i]];
                if(card.moving) break; // don't draw moving cards

                try {
                    let cardImage;
                    if(canISeeCard(card)) cardImage = await getCardImage(card.cardID);
                    else cardImage = backface;
                    let [cx, cy] = revertCoords(fromPolar(card.r, card.d - getMyOffset()));
                    this.storedCanvasCtx.drawImage(cardImage, cx - cardWidth / 2, cy - cardHeight / 2, cardWidth, cardHeight);
                } catch(e) {
                    notifier.notify("Something went wrong: " + e.message, "error");
                }
            }

            // Redraw complete!
            this.storedCanvasRedraw = false;
        }
        this.ctx.drawImage(this.storedCanvas, 0, 0);

        // Moving Cards
        for(let i = this.gameState.cardOrder.length - 1; i >= 0; i--) {
            let card = this.gameState.cards[this.gameState.cardOrder[i]];
            if(!card.moving) break; // we've already drawn the static cards

            try {
                let cardImage;
                if(canISeeCard(card)) cardImage = await getCardImage(card.cardID);
                else cardImage = backface;
                let [cx, cy] = revertCoords(fromPolar(card.r, card.d - getMyOffset()));
                this.ctx.drawImage(cardImage, cx - cardWidth / 2, cy - cardHeight / 2, cardWidth, cardHeight);
            } catch(e) {
                notifier.notify("Something went wrong: " + e.message, "error");
            }
        }

        if(debugMode) {
            let lines = [];
            lines.push("Debug Mode");
            lines.push("Player: " + thePlayer?.name ?? "Spect8or");
            lines.push("Player Offset: " + thePlayer?.offset ?? 0);
            lines.push("Offset Angle: " + playerOffsetAngle?.toFixed(5) ?? 0);
            lines.push("Table: " + this.gameState.table.shape + " " + this.gameState.table.color);
            lines.push("Table Size: " + tableSize);
            lines.push("Table Margin: " + tableMargin);
            lines.push("Table Padding: " + tablePadding);
            lines.push("Player Radius: " + playerRadius.toFixed(5));
            lines.push("Card Width: " + cardWidth);
            lines.push("Card Height: " + cardHeight);
            lines.push(null);
            lines.push(`Mouse (real):   (${mouse.x}, ${mouse.y})`);
            let [nx, ny] = normaliseCoords(mouse.x, mouse.y);
            lines.push(`Mouse (norm):   (${nx.toFixed(5)}, ${ny.toFixed(5)})`);
            let [rx, ry] = revertCoords(nx, ny);
            lines.push(`Mouse (revert): (${rx.toFixed(0)}, ${ry.toFixed(0)})`);
            lines.push(null);
            if(debugCard === -1) lines.push("Press (c) for cards");
            else {
                let card = this.gameState.cards[this.gameState.cardOrder[debugCard]];
                lines.push("Card: " + card.cardID + ` [${debugCard}]`);
                lines.push(`Card: (${card.r.toFixed(5)}, ${card.d.toFixed(5)})`);
                let offset = (card.d - getMyOffset());
                lines.push(`Offset:       (${offset >= 0 ? " " : ""}${offset.toFixed(5)}) (os)`); // Offset to make it in line with line above
                let [cx, cy] = fromPolar(card.r, card.d);
                lines.push(`Card x:      (${cx.toFixed(5)}, ${cy.toFixed(5)})`);
                [cx, cy] = fromPolar(card.r, card.d - getMyOffset());
                lines.push(`Card x: (os) (${cx.toFixed(5)}, ${cy.toFixed(5)})`);
                lines.push("Card dims (real): " + `[${cardWidth.toFixed(3)}, ${cardHeight.toFixed(3)}]`);
                lines.push("Card dims (norm): " + `[${(cardWidth / tableSize).toFixed(3)}, ${(cardHeight / tableSize).toFixed(3)}]`);
                lines.push("Card faceUp:  " + card.faceUp);
                lines.push("Card moving:  " + card.moving);
                lines.push("Card owner:   " + card.owner);
                lines.push("Card culprit: " + card.culprit);
                lines.push("Card visible: " + canISeeCard(card));
            }

            this.ctx.fillStyle = "#0005";
            this.ctx.fillRect(0, 0, 320 * dpr, (lines.length + 1) * 15 * dpr);

            this.ctx.fillStyle = "#fff";
            this.ctx.font = `${15 * dpr}px Consolas`;
            this.ctx.textAlign = "left";
            for(let line = 0; line < lines.length; line++) {
                if(lines[line] === null) continue;
                this.ctx.fillText(lines[line], 10, (line + 1) * 15 * dpr);
            }
        }

        window.requestAnimationFrame(this.render.bind(this));
    }

    calculatePlayerRadius() {
        let np = this.gameState.players.length;
        let m = Math.min(this.canvas.width, this.canvas.height);
        playerRadius = m / (np + 2.2);
    }
    getPlayerPositions() {
        if(playerPositions !== null) return playerPositions;
        playerPositions = {};
        let organisedPlayers;
        if(thePlayer) {
            let myPlayerIndex = this.gameState.players.findIndex(p => p.name === thePlayer.name);
            organisedPlayers = this.gameState.players.slice(myPlayerIndex).concat(this.gameState.players.slice(0, myPlayerIndex));
        } else {
            organisedPlayers = this.gameState.players.slice().sort((a, b) => a.offset - b.offset);
        }
        const width = this.canvas.width;
        const height = this.canvas.height;
        let numPlayers = organisedPlayers.length;
        let radius = Math.min(width / 2, height / 2) - tableMargin - tablePadding;
        playerOffsetAngle = 2 * Math.PI / numPlayers;
        let x, y;
        for(let i = 0; i < numPlayers; i++) {
            x = width / 2 + radius * Math.cos(i * playerOffsetAngle + halfPi);
            y = height / 2 + radius * Math.sin(i * playerOffsetAngle + halfPi);
            playerPositions[organisedPlayers[i].name] = {x, y};
        }
    }

    redrawStoredCanvas() {
        this.storedCanvasRedraw = true;
    }

    resize() {
        playerPositions = null;
        playerRadius = null;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.storedCanvas.width = this.canvas.width;
        this.storedCanvas.height = this.canvas.height;
        // this.ctx.scale(dpr, dpr);
        // this.storedCanvasCtx.scale(dpr, dpr);
        this.canvas.style.width = window.innerWidth + "px";
        this.canvas.style.height = window.innerHeight + "px";
        this.storedCanvas.style.width = this.canvas.style.width;
        this.storedCanvas.style.height = this.canvas.style.height;
        tableSize = Math.min(this.canvas.width, this.canvas.height);
        this.redrawStoredCanvas();
    }
}

/**
 * CARD SCHEMA!
 *  {
        card.cardID = data.cardID;
        card.r = data.r;            // radius
        card.d = data.d;            // degrees
        card.faceUp = data.faceUp;
        card.owner = data.owner;
        card.moving = data.moving;
        card.culprit = data.culprit;
    }
    inDeck can be calculated by x=y=-Infinity && owner=null
    inHand can be calculated by x=y=-Infinity && owner=playerID
    inPlay can be calculated by x != -Infinity && y != -Infinity
    culprit is the player currently moving the card
    */

const gameState = {
    cardOrder: [],      // A list of all inplay card IDs from bottom to top - a sorted version of Object.keys(cards)
    roomID: null,       // Numerical ID of the room
    name: null,         // Name of the room
    players: [],      // Array of Player Names
    spectators: null,   // Number of specatators in the room
    table: null,        // {shape string, color hex string} of the table
    floor: null,        // Hex String of the floor
    cards: null,        // {cardID: card} of all cards. cardID looks like "deck1.diamond.king"
};

let mouse = {x: 0, y: 0, isDown: false, card: null, onDown() {}, onUp() {}, onClick() {}, onMove() {} };

// TODO: player zones so we can move cards between hands!

let thePlayer;
let playerPositions = null; // {playerID: {x: 0, y: 0}}
let playerOffsetAngle = 0;
let canvas;
let overlayHidden = false;

onReady(() => {
    let roomID = window.location.pathname.split("/")[2];
    canvas = new Canvas($(`#gameCanvas`), gameState);
    window.addEventListener("resize", canvas.resize.bind(canvas));
    canvas.resize();

    // Prepare room and events
    const room = new GameSocketClient(roomID);
    room.on("cards:state", ({data}) => {
        if(data.success === false) {
            console.error(data.message);
            return;
        }
        gameState.roomID = data.roomID;
        gameState.name = data.name;
        if(!isArrayCombination(gameState.players.map(p => p.name), data.players.map(p => p.name))) playerPositions = null;
        gameState.players = data.players;
        gameState.spectators = data.spectators;
        gameState.table = data.table;
        gameState.floor = data.floor;
        gameState.cards = data.cards;

        gameState.cardOrder = gameState.cards.cardsInDeck;

        // if(gameState.players.includes(thePlayer)) gameState.players.unshift(gameState.players.splice(gameState.players.indexOf(thePlayer), 1)[0]);

        gameState.ready = true;
        canvas.redrawStoredCanvas();
    });
    room.on("cards:cardmove", ({data}) => {
        if(data.success === false) {
            console.error(data.message);
            return;
        }
        let card = gameState.cards[data.cardID];
        card.cardID = data.cardID;
        // card.x = data.x ?? card.x;
        // card.y = data.y ?? card.y;
        card.r = data.r ?? card.r;
        card.d = (data.d) ?? card.d;
        card.faceUp = data.faceUp !== undefined ? data.faceUp : card.faceUp;
        card.owner = data.owner !== undefined ? data.owner : card.owner;
        card.moving = data.moving !== undefined ? data.moving : card.moving;
        card.culprit = data.culprit !== undefined ? data.culprit : card.culprit;

        let cardIndex = gameState.cardOrder.indexOf(data.cardID);
        if(cardIndex >= 0) gameState.cardOrder.splice(cardIndex, 1);
        gameState.cardOrder.push(data.cardID);

        if(data.redraw) canvas.redrawStoredCanvas();
    });

    // Prepare interactive events
    document.addEventListener("mousedown", (e) => {
        if(!overlayHidden) return;
        mouse.x = e.offsetX * dpr;
        mouse.y = e.offsetY * dpr;
        mouse.isDown = true;
        mouse.down = {x: mouse.x, y: mouse.y};
        mouse.onDown();
    });
    document.addEventListener("mouseup", (e) => {
        if(!overlayHidden) return;
        if(mouse.isDown && mouse.x === mouse.down.x && mouse.y === mouse.down.y) {
            mouse.onClick();
        } else {
            mouse.x = e.offsetX * dpr;
            mouse.y = e.offsetY * dpr;
            mouse.onUp();
        }
        mouse.isDown = false;
    });
    document.addEventListener("mousemove", (e) => {
        if(!overlayHidden) return;
        let oldPos = {x: mouse.x, y: mouse.y};
        mouse.x = e.offsetX * dpr;
        mouse.y = e.offsetY * dpr;
        mouse.onMove(oldPos);
    });
    document.addEventListener("keydown", (e) => {
        if(!overlayHidden) return;
        if(e.key === "g") {
            e.preventDefault();
            e.stopPropagation();
            debugMode = !debugMode;
        }
        if(e.key === "c" || e.key === "C") {
            e.preventDefault();
            e.stopPropagation();
            let mod = 1;
            if(e.shiftKey) mod = -1;
            debugCard += mod;
            debugCard = debugCard % (gameState.cardOrder.length + 1);
            if(debugCard === gameState.cardOrder.length) debugCard = -1;
            if(debugCard === -2) debugCard = gameState.cardOrder.length - 1;
        }
    });

    mouse.onDown = () => {
        let [card, i] = getCardAtCartesian(mouse.x, mouse.y);
        if(card.culprit === null || card.culprit === thePlayer) {
            mouse.card = card;
            room.send("cardmove", {
                name: thePlayer.name,
                cardID: card.cardID,
                r: card.r,
                d: card.d,
                owner: null,
                moving: true,
                faceUp: card.faceUp,
                culprit: thePlayer.name,
            });
        }
    };
    mouse.onMove = (oldPos) => {
        if(mouse.card && mouse.isDown) {
            let card = mouse.card;
            let [cr, cd] = toPolar(normaliseCoords(mouse.x, mouse.y));
            room.send("cardmove", {
                name: thePlayer.name,
                cardID: card.cardID,
                r: cr,
                d: cd + getMyOffset(),
                owner: null,
                moving: true,
                faceUp: card.faceUp,
                culprit: thePlayer.name,
            });
        }
    };
    mouse.onUp = () => {
        if(mouse.card && mouse.isDown) {
            let card = mouse.card;
            room.send("cardmove", {
                name: thePlayer.name,
                cardID: card.cardID,
                moving: false,
                faceUp: card.faceUp,
                culprit: null,
            });
            mouse.card = null;
        }
    };
    mouse.onClick = () => {
        if(mouse.card) {
            let card = mouse.card;
            room.send("cardmove", {
                name: thePlayer.name,
                cardID: card.cardID,
                moving: false,
                culprit: null,
                faceUp: !card.faceUp,
            });
        }
    };

    // Prepare UI
    $$(".btn").forEach(btn => {
        btn.addEventListener("click", () => {
            let action = btn.getAttribute("action");
            if(action === "enterRoom") enterRoom(room, $(`#username`).value || $(`#username`).placeholder);
            if(action === "spectate") spectate(room);
        });
    });
});

function enterRoom(room, name) {
    room.once("cards:enterroom", ({data}) => {
        if(data.success) {
            notifier.notify("Entering room...", "success");
            thePlayer = data.player;
            hideOverlay();
            canvas.redrawStoredCanvas();
            // gamestate will update
        } else {
            notifier.notify(data.message, "error");
        }
    });
    room.send("enterroom", {name});
}
function spectate(room) {
    room.once("cards:spectate", ({data}) => {
        if(data.success) {
            notifier.notify("Spectating...", "success");
            hideOverlay();
            canvas.redrawStoredCanvas();
        } else {
            notifier.notify(data.message, "error");
        }
    });
    room.send("spectate", {});
}

function hideOverlay() {
    let overlay = $(`#overlay`);
    overlay.style.opacity = "0";
    overlay.addEventListener("transitionend", () => {
        overlay.style.display = "none";
        overlayHidden = true;
    }, {once: true});
}

function showOverlay() {
    let overlay = $(`#overlay`);
    overlay.style.display = "";
    overlay.style.opacity = "1";
    overlayHidden = false;
}

function getCardAtCartesian(x, y, normalised = false) {
    if(!normalised) [x, y] = normaliseCoords(x, y);

    let dims = {w: cardWidth / tableSize, h: cardHeight / tableSize};

    for(let i = gameState.cardOrder.length - 1; i >= 0; i--) {
        let cardID = gameState.cardOrder[i];
        let card = gameState.cards[cardID];
        let [cx, cy] = fromPolar(card.r, card.d - getMyOffset());
        if(inBounds(cx, cy, dims.w, dims.h, x, y)) {
            return [card, i];
        }
    }
    return [null, -1];
}

function getMyOffset() {
    return playerOffsetAngle * (thePlayer?.offset ?? 0);
}

function canISeeCard(card) {
    return canPlayerSeeCard(thePlayer?.name, card);
}

function canPlayerSeeCard(player, card) {
    if(player === null) return true;
    if(playerPositions === null) return false;

    for(let pp of Object.entries(playerPositions)) {
        let [playerName, position] = pp;
        let [cx, cy] = revertCoords(fromPolar(card.r, card.d - getMyOffset()));
        // cx += cardWidth / 2;
        // cy += cardHeight / 2;
        // MAYBE: maybe there's a better way to do this rather than complex math and to/from polar?
        if(Math.sqrt(Math.pow(position.x - cx, 2) + Math.pow(position.y - cy, 2)) < playerRadius) {
            return player === playerName; // Make sure all the cards in my hand are face up, but if in someone else's hand, face down
        }
    }
    return card.faceUp;
}

const cardImages = {};
function getCardImage(cardID) {
    return new Promise((resolve, reject) => {
        cardID = cardID.split(".");
        cardID = cardID.slice(cardID.length - 2);

        let cache = cardImages[cardID.join(".")];
        if(!!cache) return resolve(cache);

        let image = new Image();
        image.src = `/card/${cardID.join("/")}`;

        image.addEventListener("load", () => {
            cardImages[cardID.join(".")] = image;
            resolve(image);
        });
        image.addEventListener("error", (ev) => {
            reject(ev);
        });
    });
}

// Determines if array a is a combination of array b
function isArrayCombination(a, b) {
    if(a.length !== b.length) return false;

    a = a.slice();
    b = b.slice();

    for(let i = 0; i < a.length; i++) {
        let index = b.indexOf(a[i]);
        if(index === -1) return false;
        b.splice(index, 1);
    }

    return true;
}

function normaliseCoords(x, y) {
    if(Array.isArray(x)) [x, y] = x;
    let w = canvas.canvas.width;
    let h = canvas.canvas.height;
    return [
        (x - w / 2) / tableSize,
        (y - h / 2) / tableSize,
    ];
}
function revertCoords(x, y) {
    if(Array.isArray(x)) [x, y] = x;
    let w = canvas.canvas.width;
    let h = canvas.canvas.height;
    return [
        x * tableSize + w / 2,
        y * tableSize + h / 2
    ];
}

function toPolar(x, y) {
    if(Array.isArray(x)) [x, y] = x;
    return [
        Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)),
        Math.atan2(y, x)
    ];
}

function fromPolar(radius, degree) {
    if(Array.isArray(radius)) [radius, degree] = radius;
    return [
        radius * Math.cos(degree),
        radius * Math.sin(degree)
    ];
}

function inBounds(ax, ay, aw, ah, bx, by, type = "center") {
    if(type === "center") {
        ax += aw / 2;
        ay += ah / 2;
    }
    return ax >= bx && ax <= bx + aw && ay >= by && ay <= by + ah;
}