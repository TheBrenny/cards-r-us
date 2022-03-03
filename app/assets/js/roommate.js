onReady(() => {
    if(!globalThis.roommate) return; // TODO: Maybe default this?

    // Prepare Roommate
    const roommate = new GameSocketClient(globalThis.roommate);

    // Prepare UI
    $$(".btn").forEach(btn => {
        btn.addEventListener("click", () => {
            let action = btn.getAttribute("action");
            if(action === "createRoom") createRoom(roommate);
            if(action === "joinRoom") joinRoom(roommate, $(`#gameid`).value);
        });
    });
});

function createRoom(roommate) {
    roommate.once("cards:createroom", ({data}) => {
        if(data.success) {
            notifier.notify("Room created!", "success");
            document.location.pathname = `/game/${data.roomID}`;
        } else {
            notifier.notify(data.message, "error");
        }
    });
    let payload = {};
    if($("#createid").value !== "") roomID = $(`#createid`).value;
    if($("#name").value !== "") payload.name = $(`#name`).value;
    if($("#floor").value !== "") payload.floor = $(`#floor`).value;
    if($("#tableshape").value !== "") {
        payload.table = payload.table ?? {};
        payload.table.shape = $(`#tableshape`).value;
    }
    if($("#tablecolor").value !== "") {
        payload.table = payload.table ?? {};
        payload.table.color = $(`#tablecolor`).value;
    }
    if($("#deckcount").value !== "") payload.deckCount = $(`#deckcount`).value;
    if($("#jokers").value !== "") payload.jokers = $(`#jokers`).value;
    roommate.send("createroom", payload);
}

function joinRoom(roommate, roomID) {
    roommate.once("cards:roomexists", ({data}) => {
        if(data.success) {
            notifier.notify("Loading room now...", "success");
            document.location.pathname = `/game/${data.roomID}`;
        } else {
            notifier.notify(data.message, "error");
        }
    });

    roommate.send("roomexists", {id: roomID});
}