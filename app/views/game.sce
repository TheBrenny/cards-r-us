[[i= partials/header ]]
<style>
    body {
        width: 100vw;
        height: 100vh;
        overflow: hidden;
    }
</style>

<canvas id="gameCanvas" width="100%" height="100%"></canvas>

<div id="overlay" class="overlay" style="opacity: 0.5s; opacity: 1">
    <div class="overlayContent">
        <div class="overflowScrollWrapper">
            <div class="overlayTitle">
                <h1 id="roomTitle">[[ room.name ]] (<code>[[room.id]]</code>)</h1>
            </div>
            <hr>
            <!--
                <div class="overlayDescription">
                    <p id="roomDescription">[[ room.description ]]</p>
                </div>
            -->
            <div class="overlayButtons">
                <input id="username" type="text" placeholder="[[ namePlaceholder ]]">
                <div class="btn" action="enterRoom">Join Game!</div>
            </div>
        </div>
    </div>
</div>

<script src="/assets/js/room.js"></script>
[[i= partials/footer ]]