<!DOCTYPE html>
<html lang="en">

    <head>
        <meta charset="UTF-8">
        <title>Card Games Are Fun!</title>
        <link rel="stylesheet" href="/assets/css/normalize.css">
        <link rel="stylesheet" href="/assets/css/main.css">
        <link rel="stylesheet" href="/assets/notifier/notifier.css">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>

    <body>
        <div class="darkmodeToggle"></div>
        <script src="/assets/js/util.js"></script>
        <script nonce="[[nonce]]">
            // Set the roommate
            globalThis.roommate = "[[roommate]]";

            // Set the default darkmode
            if(localStorage.getItem("darkmode") === "true") document.body.classList.add("darkmode");

            // Add the click trigger
            $(".darkmodeToggle").addEventListener("click", () => {
                const darkmode = localStorage.getItem("darkmode");
                if(darkmode === "true") {
                    localStorage.setItem("darkmode", "false");
                    document.body.classList.remove("darkmode");
                } else {
                    localStorage.setItem("darkmode", "true");
                    document.body.classList.add("darkmode");
                }
            });
        </script>
        <script src="/assets/js/roommate.js"></script>
        <script src="/assets/js/gsc.js"></script>