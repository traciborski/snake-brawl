const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const botScoreElement = document.getElementById('botScore');
const highScoreElement = document.getElementById('highScore');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [
    { x: 10, y: 10 }
];
let bot = [
    { x: 20, y: 20 }
];
let food = {};
let botFood = {};
let dx = 0;
let dy = 0;
let botDx = 0;
let botDy = 0;
let score = 0;
let botScore = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameRunning = false;
let gameInterval;
let bullets = [];
let botBullets = [];
let lastShotTime = 0;
let botLastShotTime = 0;
const shotCooldown = 300;
let explosions = [];

highScoreElement.textContent = highScore;

function generateFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    
    // Sprawdzenie kolizji z graczem
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            generateFood();
            return;
        }
    }
    
    // Sprawdzenie kolizji z botem
    for (let segment of bot) {
        if (segment.x === food.x && segment.y === food.y) {
            generateFood();
            return;
        }
    }
    
    // Sprawdzenie kolizji z botFood
    if (botFood.x === food.x && botFood.y === food.y) {
        generateFood();
        return;
    }
}

function generateBotFood() {
    botFood = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    
    // Sprawdzenie kolizji z botem
    for (let segment of bot) {
        if (segment.x === botFood.x && segment.y === botFood.y) {
            generateBotFood();
            return;
        }
    }
    
    // Sprawdzenie kolizji z graczem
    for (let segment of snake) {
        if (segment.x === botFood.x && segment.y === botFood.y) {
            generateBotFood();
            return;
        }
    }
    
    // Sprawdzenie kolizji z food
    if (food.x === botFood.x && food.y === botFood.y) {
        generateBotFood();
        return;
    }
}

function drawGame() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Rysowanie gracza (Leon - żółty zadymiarz)
    for (let i = 0; i < snake.length; i++) {
        const segment = snake[i];
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;
        
        if (i === 0) {
            // Głowa - Leon (żółty z czarnym konturem)
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(x + 2, y + 2, gridSize - 4, gridSize - 4);
            ctx.fillStyle = '#333';
            ctx.fillRect(x + 4, y + 4, 4, 4); // lewe oko
            ctx.fillRect(x + 12, y + 4, 4, 4); // prawe oko
            ctx.fillRect(x + 6, y + 10, 8, 4); // usta
        } else {
            // Ciało - dym (szary z przezroczystością)
            const opacity = Math.max(0.3, 1 - (i * 0.1));
            ctx.fillStyle = `rgba(150, 150, 150, ${opacity})`;
            ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
            
            // Dodanie efektu dymu
            ctx.fillStyle = `rgba(200, 200, 200, ${opacity * 0.5})`;
            ctx.fillRect(x + 3, y + 3, gridSize - 6, gridSize - 6);
        }
    }
    
    // Rysowanie bota (Hugo - czerwony)
    for (let i = 0; i < bot.length; i++) {
        const segment = bot[i];
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;
        
        if (i === 0) {
            // Głowa - Hugo (czerwony z czarnym konturem)
            ctx.fillStyle = '#FF4444';
            ctx.fillRect(x + 2, y + 2, gridSize - 4, gridSize - 4);
            ctx.fillStyle = '#333';
            ctx.fillRect(x + 4, y + 4, 4, 4); // lewe oko
            ctx.fillRect(x + 12, y + 4, 4, 4); // prawe oko
            ctx.fillRect(x + 6, y + 10, 8, 4); // usta
        } else {
            // Ciało - czerwony dym
            const opacity = Math.max(0.3, 1 - (i * 0.1));
            ctx.fillStyle = `rgba(200, 100, 100, ${opacity})`;
            ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
            
            // Dodanie efektu dymu
            ctx.fillStyle = `rgba(255, 150, 150, ${opacity * 0.5})`;
            ctx.fillRect(x + 3, y + 3, gridSize - 6, gridSize - 6);
        }
    }
    
    // Jedzenie gracza - power cube (niebieski/złoty)
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4);
    ctx.fillStyle = '#FFA500';
    ctx.fillRect(food.x * gridSize + 4, food.y * gridSize + 4, gridSize - 8, gridSize - 8);
    
    // Jedzenie bota - power cube (czerwony)
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(botFood.x * gridSize + 2, botFood.y * gridSize + 2, gridSize - 4, gridSize - 4);
    ctx.fillStyle = '#CC0000';
    ctx.fillRect(botFood.x * gridSize + 4, botFood.y * gridSize + 4, gridSize - 8, gridSize - 8);
    
    // Rysowanie pocisków gracza (żółte)
    ctx.fillStyle = '#FFFF00';
    for (let bullet of bullets) {
        ctx.fillRect(bullet.x * gridSize + 6, bullet.y * gridSize + 6, 8, 8);
    }
    
    // Rysowanie pocisków bota (czerwone)
    ctx.fillStyle = '#FF0000';
    for (let bullet of botBullets) {
        ctx.fillRect(bullet.x * gridSize + 6, bullet.y * gridSize + 6, 8, 8);
    }
    
    // Rysowanie wybuchów
    for (let explosion of explosions) {
        const progress = explosion.age / explosion.maxAge;
        const size = explosion.size * (1 - progress);
        const opacity = 1 - progress;
        
        // Zewnętrzny krąg (pomarańczowy)
        ctx.fillStyle = `rgba(255, 165, 0, ${opacity})`;
        ctx.beginPath();
        ctx.arc(explosion.x * gridSize + gridSize/2, explosion.y * gridSize + gridSize/2, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Wewnętrzny krąg (żółty)
        ctx.fillStyle = `rgba(255, 255, 0, ${opacity})`;
        ctx.beginPath();
        ctx.arc(explosion.x * gridSize + gridSize/2, explosion.y * gridSize + gridSize/2, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Środkowy krąg (biały)
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(explosion.x * gridSize + gridSize/2, explosion.y * gridSize + gridSize/2, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function moveSnake() {
    if (dx === 0 && dy === 0) return;
    
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }
    
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            gameOver();
            return;
        }
    }
    
    snake.unshift(head);
    
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        generateFood();
    } else {
        snake.pop();
    }
}

function shootBullet() {
    if (dx === 0 && dy === 0) return;
    
    const currentTime = Date.now();
    if (currentTime - lastShotTime < shotCooldown) return;
    
    bullets.push({
        x: snake[0].x,
        y: snake[0].y,
        dx: dx,
        dy: dy
    });
    
    lastShotTime = currentTime;
}

function moveBot() {
    if (botDx === 0 && botDy === 0) {
        // Ustawienie początkowego kierunku
        botDx = Math.random() > 0.5 ? 1 : -1;
        botDy = 0;
    }
    
    const head = { x: bot[0].x + botDx, y: bot[0].y + botDy };
    
    // Sprawdzenie kolizji ze ścianami
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        // Zmiana kierunku przy kolizji ze ścianą
        if (botDx !== 0) {
            botDx = 0;
            botDy = Math.random() > 0.5 ? 1 : -1;
        } else {
            botDy = 0;
            botDx = Math.random() > 0.5 ? 1 : -1;
        }
        return;
    }
    
    // Sprawdzenie kolizji z samym sobą
    for (let segment of bot) {
        if (head.x === segment.x && head.y === segment.y) {
            // Losowa zmiana kierunku
            const directions = [
                { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
                { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
            ];
            const newDir = directions[Math.floor(Math.random() * directions.length)];
            botDx = newDir.dx;
            botDy = newDir.dy;
            return;
        }
    }
    
    bot.unshift(head);
    
    // Sprawdzenie czy bot zjadł swoje jedzenie
    if (head.x === botFood.x && head.y === botFood.y) {
        botScore += 10;
        botScoreElement.textContent = botScore;
        generateBotFood();
    } else {
        bot.pop();
    }
    
    // AI: Losowe zmiany kierunku co jakiś czas
    if (Math.random() < 0.05) { // 5% szans na zmianę kierunku
        const directions = [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
        ];
        const newDir = directions[Math.floor(Math.random() * directions.length)];
        // Nie pozwalaj na odwrócenie się
        if ((newDir.dx !== -botDx || newDir.dy !== -botDy) && (newDir.dx !== 0 || newDir.dy !== 0)) {
            botDx = newDir.dx;
            botDy = newDir.dy;
        }
    }
}

function botShoot() {
    if (botDx === 0 && botDy === 0) return;
    
    const currentTime = Date.now();
    if (currentTime - botLastShotTime < shotCooldown * 2) return; // Bot strzela rzadziej
    
    botBullets.push({
        x: bot[0].x,
        y: bot[0].y,
        dx: botDx,
        dy: botDy
    });
    
    botLastShotTime = currentTime;
}

function updateBullets() {
    // Aktualizacja pocisków gracza
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const oldX = bullet.x;
        const oldY = bullet.y;
        
        // Sprawdzenie kolizji na ścieżce ruchu (3 kroki)
        let hitFood = false;
        let hitBot = false;
        
        for (let step = 1; step <= 3; step++) {
            const checkX = oldX + bullet.dx * step;
            const checkY = oldY + bullet.dy * step;
            
            // Kolizja z jedzeniem
            if (checkX === food.x && checkY === food.y) {
                score += 10;
                scoreElement.textContent = score;
                
                const tail = snake[snake.length - 1];
                snake.push({ x: tail.x, y: tail.y });
                
                const explosionSize = Math.random() > 0.3 ? 15 : 25;
                explosions.push({
                    x: food.x,
                    y: food.y,
                    size: explosionSize,
                    age: 0,
                    maxAge: 20
                });
                
                generateFood();
                hitFood = true;
                break;
            }
            
            // Kolizja z botem
            for (let segmentIndex = 0; segmentIndex < bot.length; segmentIndex++) {
                const segment = bot[segmentIndex];
                if (checkX === segment.x && checkY === segment.y) {
                    if (segmentIndex === 0) {
                        // Trafienie w głowę - bonus za zestrzelenie
                        score += 50;
                        scoreElement.textContent = score;
                        
                        explosions.push({
                            x: checkX,
                            y: checkY,
                            size: 30,
                            age: 0,
                            maxAge: 30
                        });
                        
                        // Reset bota
                        bot = [{ x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) }];
                        botDx = 0;
                        botDy = 0;
                    } else {
                        // Trafienie w ogon - obcięcie ogona
                        score += 20;
                        scoreElement.textContent = score;
                        
                        // Odjęcie punktów botowi
                        const removedSegments = bot.length - segmentIndex;
                        botScore = Math.max(0, botScore - (removedSegments * 10));
                        botScoreElement.textContent = botScore;
                        
                        explosions.push({
                            x: checkX,
                            y: checkY,
                            size: 20,
                            age: 0,
                            maxAge: 25
                        });
                        
                        // Obcięcie ogona od miejsca trafienia
                        bot = bot.slice(0, segmentIndex);
                    }
                    hitBot = true;
                    break;
                }
            }
            if (hitBot) break;
        }
        
        if (hitFood || hitBot) {
            bullets.splice(i, 1);
            continue;
        }
        
        bullet.x += bullet.dx * 3;
        bullet.y += bullet.dy * 3;
        
        if (bullet.x < 0 || bullet.x >= tileCount || bullet.y < 0 || bullet.y >= tileCount) {
            bullets.splice(i, 1);
        }
    }
    
    // Aktualizacja pocisków bota
    for (let i = botBullets.length - 1; i >= 0; i--) {
        const bullet = botBullets[i];
        const oldX = bullet.x;
        const oldY = bullet.y;
        
        let hitFood = false;
        let hitPlayer = false;
        
        for (let step = 1; step <= 3; step++) {
            const checkX = oldX + bullet.dx * step;
            const checkY = oldY + bullet.dy * step;
            
            // Kolizja z jedzeniem
            if (checkX === food.x && checkY === food.y) {
                botScore += 10;
                botScoreElement.textContent = botScore;
                
                const tail = bot[bot.length - 1];
                bot.push({ x: tail.x, y: tail.y });
                
                const explosionSize = Math.random() > 0.3 ? 15 : 25;
                explosions.push({
                    x: food.x,
                    y: food.y,
                    size: explosionSize,
                    age: 0,
                    maxAge: 20
                });
                
                generateFood();
                hitFood = true;
                break;
            }
            
            // Kolizja z graczem
            for (let segmentIndex = 0; segmentIndex < snake.length; segmentIndex++) {
                const segment = snake[segmentIndex];
                if (checkX === segment.x && checkY === segment.y) {
                    if (segmentIndex === 0) {
                        // Trafienie w głowę - game over
                        explosions.push({
                            x: checkX,
                            y: checkY,
                            size: 30,
                            age: 0,
                            maxAge: 30
                        });
                        
                        gameOver("Bot wygrał!");
                    } else {
                        // Trafienie w ogon - obcięcie ogona
                        botScore += 20;
                        botScoreElement.textContent = botScore;
                        
                        // Odjęcie punktów graczowi
                        const removedSegments = snake.length - segmentIndex;
                        score = Math.max(0, score - (removedSegments * 10));
                        scoreElement.textContent = score;
                        
                        explosions.push({
                            x: checkX,
                            y: checkY,
                            size: 20,
                            age: 0,
                            maxAge: 25
                        });
                        
                        // Obcięcie ogona od miejsca trafienia
                        snake = snake.slice(0, segmentIndex);
                    }
                    hitPlayer = true;
                    break;
                }
            }
            if (hitPlayer) break;
        }
        
        if (hitFood || hitPlayer) {
            botBullets.splice(i, 1);
            continue;
        }
        
        bullet.x += bullet.dx * 3;
        bullet.y += bullet.dy * 3;
        
        if (bullet.x < 0 || bullet.x >= tileCount || bullet.y < 0 || bullet.y >= tileCount) {
            botBullets.splice(i, 1);
        }
    }
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].age++;
        if (explosions[i].age >= explosions[i].maxAge) {
            explosions.splice(i, 1);
        }
    }
}

function gameLoop() {
    if (!gameRunning) return;
    
    moveSnake();
    moveBot();
    
    // Bot strzela losowo
    if (Math.random() < 0.1) { // 10% szans na strzał co klatkę
        botShoot();
    }
    
    updateBullets();
    updateExplosions();
    drawGame();
}

function startGame() {
    gameRunning = true;
    score = 0;
    botScore = 0;
    scoreElement.textContent = score;
    botScoreElement.textContent = botScore;
    snake = [{ x: 10, y: 10 }];
    bot = [{ x: 20, y: 20 }];
    dx = 0;
    dy = 0;
    botDx = 0;
    botDy = 0;
    bullets = [];
    botBullets = [];
    lastShotTime = 0;
    botLastShotTime = 0;
    explosions = [];
    
    generateFood();
    generateBotFood();
    drawGame();
    
    gameOverElement.style.display = 'none';
    startButton.style.display = 'none';
    restartButton.style.display = 'inline-block';
    
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 100);
}

function gameOver(message = "Game Over!") {
    gameRunning = false;
    clearInterval(gameInterval);
    
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('snakeHighScore', highScore);
    }
    
    finalScoreElement.textContent = `Leon: ${score} | Hugo: ${botScore}`;
    document.querySelector('#gameOver h2').textContent = message;
    gameOverElement.style.display = 'block';
    restartButton.style.display = 'none';
    startButton.style.display = 'inline-block';
}

function handleKeyPress(e) {
    const key = e.key.toLowerCase();
    
    if (key === 'escape') {
        startGame();
        return;
    }
    
    if (!gameRunning) return;
    
    if ((key === 'arrowleft' || key === 'a') && dx !== 1) {
        dx = -1;
        dy = 0;
    } else if ((key === 'arrowright' || key === 'd') && dx !== -1) {
        dx = 1;
        dy = 0;
    } else if ((key === 'arrowup' || key === 'w') && dy !== 1) {
        dx = 0;
        dy = -1;
    } else if ((key === 'arrowdown' || key === 's') && dy !== -1) {
        dx = 0;
        dy = 1;
    } else if (key === ' ') {
        shootBullet();
    }
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
document.addEventListener('keydown', handleKeyPress);

drawGame();