const API_URL = "http://127.0.0.1:8000";

const urlParams = new URLSearchParams(window.location.search);
const applicantName = urlParams.get("name") || "Anonymous";
const applicantpower = urlParams.get("contribution") || "Unknown";
const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");
const scoreDisplay = document.getElementById("score");
const remainingDisplay = document.getElementById("remaining");
const bulletsDisplay = document.getElementById("bulletsLeft");
const startButton = document.getElementById("startButton");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const winPopup = document.getElementById("winPopup");
let gameStartTime = 0;
let resultSubmitted = false;
let bulletsLeft = 10;
let playerPosition = 375;
let score = 0;
let shipsRemaining = 10;
let gameRunning = false;
let enemies = [];
let bullets = [];
document.addEventListener("keydown", function(event) {
    if (!gameRunning) {
        return;
    }

    if (event.key === "ArrowLeft") {
        playerPosition -= 20;
    }

    if (event.key === "ArrowRight") {
        playerPosition += 20;
    }

    if (playerPosition < 0) {
        playerPosition = 0;
    }

    if (playerPosition > 750) {
        playerPosition = 750;
    }

    player.style.left = playerPosition + "px";

    // Keep the original game's Enter-to-shoot behavior.
    if (event.code === "Enter") {
        shoot();
    }
});

function shoot() {
    if (bulletsLeft <= 0) {
        return;
    }

    const bullet = document.createElement("div");

    bullet.classList.add("bullet");
    bullet.style.left = (playerPosition + 23) + "px";
    bullet.style.bottom = "60px";

    gameArea.appendChild(bullet);
    bullets.push(bullet);

    bulletsLeft--;

    bulletsDisplay.textContent = bulletsLeft;
}

function createEnemies() {
    for (let i = 0; i < 10; i++) {
        const enemy = document.createElement("div");

        enemy.classList.add("enemy");
        enemy.innerHTML = "▼";
        enemy.style.left = Math.random() * 750 + "px";
        enemy.style.top = Math.random() * 200 + "px";

        gameArea.appendChild(enemy);
        enemies.push(enemy);
    }
}

function moveBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const bottom = parseInt(bullet.style.bottom) + 10;
        bullet.style.bottom = bottom + "px";

        if (bottom > 500) {
            bullet.remove();
            bullets.splice(i, 1);
        }
    }
}

function checkCollisions() {
    for (let b = bullets.length - 1; b >= 0; b--) {
        const bulletRect = bullets[b].getBoundingClientRect();

        for (let e = enemies.length - 1; e >= 0; e--) {
            const enemyRect = enemies[e].getBoundingClientRect();

            if (
                bulletRect.left < enemyRect.right &&
                bulletRect.right > enemyRect.left &&
                bulletRect.top < enemyRect.bottom &&
                bulletRect.bottom > enemyRect.top
            ) {
                enemies[e].remove();
                bullets[b].remove();
                enemies.splice(e, 1);
                bullets.splice(b, 1);

                score += 10;
                shipsRemaining--;
                scoreDisplay.textContent = score;
                remainingDisplay.textContent = shipsRemaining;

                if (shipsRemaining === 0) {
                    winGame();
                    return;
                }
                break;
            }
        }
    }
}

function gameLoop() {
    if (!gameRunning) {
        return;
    }

    moveBullets();
    checkCollisions();

    if (!gameRunning) {
        return; 
    }

    if (bulletsLeft === 0 && bullets.length === 0 && shipsRemaining > 0) {
        failGame();
        return;
    }

    requestAnimationFrame(gameLoop);
}

startButton.addEventListener("click", startGame);

function startGame() {
    score = 0;
    shipsRemaining = 10;
    bulletsLeft = 10;
    playerPosition = 375;

    enemies = [];
    bullets = [];

    resultSubmitted = false;
    gameRunning = true;
    gameStartTime = performance.now();

    scoreDisplay.textContent = "0";
    remainingDisplay.textContent = "10";
    bulletsDisplay.textContent = "10";

    player.style.left = playerPosition + "px";

    messageTitle.textContent = "DESTROY THE SHIPS!";
    messageText.textContent =
        "Use ← → to move and Enter to shoot.";

    startButton.style.display = "none";

    createEnemies();
    gameLoop();
}

async function submitResult(passed, completionTime) {
    if (resultSubmitted) {
        return;
    }

    resultSubmitted = true;

    const payload = {
        name: applicantName.trim() || "Anonymous",
        power: applicantpower.trim() || "Unknown",
        passed: passed,
        completion_time: passed ? Number(completionTime.toFixed(2)) : null
    };

    try {
        const response = await fetch(`${API_URL}/cult`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error("Failed to save result.");
        }

        return await response.json();

    } catch (error) {
        console.error(error);
        alert(
            "The test result could not be saved. " +
            "Make sure the FastAPI server is running."
        );
        resultSubmitted = false;
    }
}

async function winGame() {
    gameRunning = false;

    // 1. Show the popup IMMEDIATELY so it stays on screen while saving to the database
    winPopup.style.display = "flex";

    // 2. Submit results in the background
    const completionTime = (performance.now() - gameStartTime) / 1000;
    await submitResult(true, completionTime);
}

async function failGame() {
    gameRunning = false;

    await submitResult(false, null);

    messageTitle.textContent = "💀 YOU FAILED 💀";

    messageText.innerHTML =
        "<strong>YOU HAVE FAILED THE FINAL TEST.</strong>" +
        "<br><br>" +
        "You ran out of bullets before destroying all the targets.";

    messageTitle.classList.add("failure");
    messageTitle.scrollIntoView({ behavior: "smooth" });
}
