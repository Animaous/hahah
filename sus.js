const form = document.getElementById("cultForm");
if (form) {
    form.addEventListener("submit", function(event) {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const contribution = document.getElementById("contribution").value.trim();
        if (!name) {
            alert("Enter your name first!");
            return;
        }
        const gameUrl =
            "game.html?name=" + encodeURIComponent(name)+
            "&contribution=" + encodeURIComponent(contribution);
        window.location.href = gameUrl;
    });
}
