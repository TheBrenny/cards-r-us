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
    roommate.send("createroom", {});
}

function joinRoom(roommate, roomId) {
    roommate.once("cards:roomexists", ({data}) => {
        if(data.success) {
            notifier.notify("Loading room now...", "success");
            document.location.pathname = `/game/${data.roomID}`;
        } else {
            notifier.notify(data.message, "error");
        }
    });

    roommate.send("roomexists", {id: room.id});
}