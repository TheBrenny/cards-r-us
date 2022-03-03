[[i= partials/header ]]

<div class="homeContainer">
    <div class="wrapper">
        <div class="left">
            <input id="createid" type="text" placeholder="Game ID" />
            <input id="name" type="text" placeholder="Room Name" />
            <input id="floor" type="text" placeholder="Floor Colour" />
            <div class="miniWrap">
                <input id="tableshape" type="text" placeholder="Table Shape" />
                <input id="tablecolor" type="text" placeholder="Table Colour" />
            </div>
            <div class="miniWrap">
                <input id="deckcount" type="text" placeholder="Deck Count" />
                <input id="jokers" type="text" placeholder="Joker Count" />
            </div>
            <div class="btn" action="createRoom">Create Room</div>
            <small><i>These fields are all optional!</i></small>
        </div>
        <vr></vr>
        <div class="right">
            <input id="gameid" type="text" placeholder="Game ID" />
            <div class="btn" action="joinRoom">Join Room</div>
        </div>
    </div>
</div>

[[i= partials/footer ]]