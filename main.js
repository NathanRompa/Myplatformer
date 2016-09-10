var canvas = document.getElementById("gameCanvas");
var context = canvas.getContext("2d");

var startFrameMillis = Date.now();
var endFrameMillis = Date.now();

// This function will return the time in seconds since the function 
// was last called
// You should only call this function once per frame
function getDeltaTime() {
	endFrameMillis = startFrameMillis;
	startFrameMillis = Date.now();

	// Find the delta time (dt) - the change in time since the last drawFrame
	// We need to modify the delta time to something we can use.
	// We want 1 to represent 1 second, so if the delta is in milliseconds
	// we divide it by 1000 (or multiply by 0.001). This will make our 
	// animations appear at the right speed, though we may need to use
	// some large values to get objects movement and rotation correct
	var deltaTime = (startFrameMillis - endFrameMillis) * 0.001;

	// validate that the delta is within range
	if (deltaTime > 1)
		deltaTime = 1;

	return deltaTime;
}



//-------------------- Don't modify anything above here
var SCREEN_WIDTH = canvas.width;
var SCREEN_HEIGHT = canvas.height;
var LAYER_COUNT = 3;
var MAP = { tw: 120, th: 15 };
var TILE = 35;
var TILESET_TILE = TILE * 2;
var TILESET_PADDING = 2;
var TILESET_SPACING = 2;
var TILESET_COUNT_X = 14;
var TILESET_COUNT_Y = 14;

var timer = 45;
var deathGruntTimer = 4;
var gameOverTimer = 7.3;
var gameOverReload = 20;
var splashTimer = 1;
var STATE_SPLASH = 0;
var STATE_GAME = 1;
var STATE_GAMEOVER = 2;
var STATE_WIN = 3;
var gameState = STATE_SPLASH;
var gameWon = false;
var gameOver = false;
var lives = 4;
var hitBuffer = 0;
var scoreLeft = 0;
var handiCap = 0;

var audioGameOver = new Audio("gameOver.mp3");
var audioDeathGrunt = new Audio("deathGrunt.wav");
var audioFallGrunt = new Audio("fallGrunt.wav");
var musicBackground = new Audio("encounter.mp3");
musicBackground.loop = true;
var musicWin = new Audio("musicWin.mp3");
musicWin.loop = true;
var musicIntro = new Audio("intro.mp3");
musicIntro.currentTime = 20;
musicIntro.loop = true;

// abitrary choice for 1m
var METER = TILE;
// very exaggerated gravity (6x)
var GRAVITY = METER * 9.8 * 6;
// max horizontal speed (10 tiles per second)
var MAXDX = METER * 10;
// max vertical speed (15 tiles per second)
var MAXDY = METER * 15;
// horizontal acceleration - take 1/2 second to reach maxdx
var ACCEL = MAXDX * 2;
// horizontal friction - take 1/6 second to stop from maxdx
var FRICTION = MAXDX * 6;
// (a large) instantaneous jump impulse
var JUMP = METER * 1500;

var ENEMY_MAXDX = METER * 5;
var ENEMY_ACCEL = ENEMY_MAXDX * 2;
var enemies = [];
var LAYER_COUNT = 3;
var LAYER_BACKGOUND = 0;
var LAYER_PLATFORMS = 1;
var LAYER_LADDERS = 2;
var LAYER_OBJECT_ENEMIES = 3;
var LAYER_OBJECT_TRIGGERS = 4;

// some variables to calculate the Frames Per Second (FPS - this tells use
// how fast our game is running, and allows us to make the game run at a 
// constant speed)
var fps = 0;
var fpsCount = 0;
var fpsTime = 0;

// load an image to draw
var chuckNorris = document.createElement("img");
chuckNorris.src = "hero.png";

var heartImage = document.createElement("img");
heartImage.src = "heartImage.png";

var player = new Player();
var keyboard = new Keyboard();
var bullets = new Bullet();

// Load the image to use for the level tiles
var tileset = document.createElement("img");
tileset.src = "tileset.png";

function intersects(x1, y1, w1, h1, x2, y2, w2, h2) {
    if (y2 + h2 < y1 ||
        x2 + w2 < x1 ||
        x2 > x1 + w1 ||
        y2 > y1 + h1) {
        return false;
    }
    return true;
}

function cellAtPixelCoord(layer, x, y) {
	if (x < 0 || x > SCREEN_WIDTH) // remove ‘|| y<0’
		return 1;
	// let the player drop of the bottom of the screen
	// (this means death)
	if (y > SCREEN_HEIGHT)
		return 0;
	return cellAtTileCoord(layer, p2t(x), p2t(y));
};

function cellAtTileCoord(layer, tx, ty) // remove ‘|| y<0’
{
	if (tx < 0 || tx >= MAP.tw)
		return 1;
	// let the player drop of the bottom of the screen
	// (this means death)
	if (ty >= MAP.th)
		return 0;
	return cells[layer][ty][tx];
};

function tileToPixel(tile) {
	return tile * TILE;
};
function pixelToTile(pixel) {
	return Math.floor(pixel / TILE);
};
function bound(value, min, max) {
	if (value < min)
		return min;
	if (value > max)
		return max;
	return value;
}

function drawMap() {
	var maxTiles = Math.floor(SCREEN_WIDTH / TILE) + 2;
	var tileX = pixelToTile(player.position.x);
	var offsetX = TILE + Math.floor(player.position.x % TILE);

	startX = tileX - Math.floor(maxTiles / 2);

	if (startX < - 1) {
		startX = 0;
		offsetX = 0;
	}
	if (startX > MAP.tw - maxTiles) {
		startX = MAP.tw - maxTiles + 1;
		offsetX = TILE;
	}

	worldOffsetX = startX * TILE + offsetX;

	for (var layerIdx = 0; layerIdx < LAYER_COUNT; layerIdx++) {
		for (var y = 0; y < level1.layers[layerIdx].height; y++) {
			var idx = y * level1.layers[layerIdx].width + startX;
			for (var x = startX; x < startX + maxTiles; x++) {
				if (level1.layers[layerIdx].data[idx] != 0) {
					// the tiles in the Tiled map are base 1 (meaning a value of 0 means no tile),
					// so subtract one from the tileset id to get the
					// correct tile
					var tileIndex = level1.layers[layerIdx].data[idx] - 1;
					var sx = TILESET_PADDING + (tileIndex % TILESET_COUNT_X) *
						(TILESET_TILE + TILESET_SPACING);
					var sy = TILESET_PADDING + (Math.floor(tileIndex / TILESET_COUNT_Y)) *
						(TILESET_TILE + TILESET_SPACING);
					context.drawImage(tileset, sx, sy, TILESET_TILE, TILESET_TILE,
						(x - startX) * TILE - offsetX, (y - 1) * TILE, TILESET_TILE, TILESET_TILE);
				}
				idx++;
			}
		}
	}

}

function drawBackground() {
	var gameBackground = document.createElement("img");
    gameBackground.src = "jungleBackground.png";
    context.drawImage(gameBackground, 0, 0)
}

var musicBackground;
var sfxFire;

var cells = []; // the array that holds our simplified collision data
function initialize() {
	// add enemies
	for (var layerIdx = 0; layerIdx < LAYER_COUNT; layerIdx++) { // initialize the collision map
		cells[layerIdx] = [];
		var idx = 0;
		for (var y = 0; y < level1.layers[layerIdx].height; y++) {
			cells[layerIdx][y] = [];
			for (var x = 0; x < level1.layers[layerIdx].width; x++) {
				if (level1.layers[layerIdx].data[idx] != 0) {
					// for each tile we find in the layer data, we need to create 4 collisions
					// (because our collision squares are 35x35 but the tile in the
					// level are 70x70)
					cells[layerIdx][y][x] = 1;
					cells[layerIdx][y - 1][x] = 1;
					cells[layerIdx][y - 1][x + 1] = 1;
					cells[layerIdx][y][x + 1] = 1;
				}
				else if (cells[layerIdx][y][x] != 1) {
					// if we haven't set this cell's value, then set it to 0 now
					cells[layerIdx][y][x] = 0;
				}
				idx++;
			}
		}
	}

	// initialize trigger layer in collision map
	cells[LAYER_OBJECT_TRIGGERS] = [];
	idx = 0;
	for (var y = 0; y < level1.layers[LAYER_OBJECT_TRIGGERS].height; y++) {
		cells[LAYER_OBJECT_TRIGGERS][y] = [];
		for (var x = 0; x < level1.layers[LAYER_OBJECT_TRIGGERS].width; x++) {
			if (level1.layers[LAYER_OBJECT_TRIGGERS].data[idx] != 0) {
				cells[LAYER_OBJECT_TRIGGERS][y][x] = 1;
				cells[LAYER_OBJECT_TRIGGERS][y - 1][x] = 1;
				cells[LAYER_OBJECT_TRIGGERS][y - 1][x + 1] = 1;
				cells[LAYER_OBJECT_TRIGGERS][y][x + 1] = 1;
			}
			else if (cells[LAYER_OBJECT_TRIGGERS][y][x] != 1) {
				// if we haven't set this cell's value, then set it to 0 now
				cells[LAYER_OBJECT_TRIGGERS][y][x] = 0;
			}
			idx++;
		}
	}



	musicBackgroundHowl = new Howl(
		{
			urls: ["encounter.mp3"],
			loop: true,
			buffer: true,
			volume: 0.5
		});
	sfxFire = new Howl(
		{
			urls: ["fireEffect.wav"],
			buffer: true,
			volume: 1,
			onend: function () {
				isSfxPlaying = false;
			}
		});

	// add enemies
	idx = 0;
	for (var y = 0; y < level1.layers[LAYER_OBJECT_ENEMIES].height; y++) {
		for (var x = 0; x < level1.layers[LAYER_OBJECT_ENEMIES].width; x++) {
			if (level1.layers[LAYER_OBJECT_ENEMIES].data[idx] != 0) {
				var px = tileToPixel(x);
				var py = tileToPixel(y);
				var e = new Enemy(px, py);
				enemies.push(e);
			}
			idx++;
		}
	}
}

function run() {
    context.fillStyle = "#ccc";
    context.fillRect(0, 0, canvas.width, canvas.height);

    var deltaTime = getDeltaTime();

    switch (gameState) {
        case STATE_SPLASH:
            runSplash(deltaTime);
            break;
        case STATE_GAME:
            runGame(deltaTime);
            break;
        case STATE_GAMEOVER:
            runGameOver(deltaTime);
            break;
		case STATE_WIN:
			runGameWon(deltaTime);
			break;
    }
}

function runSplash(deltaTime) {
    splashTimer -= deltaTime;
    if (keyboard.isKeyDown(keyboard.KEY_H) == true) {
        gameState = STATE_GAME;
		lives = 2;
		ENEMY_MAXDX = ENEMY_MAXDX + 3000;
		timer = timer - 20;
		handiCap = 100;
	}
    else if (keyboard.isKeyDown(keyboard.KEY_N) == true) {
		gameState = STATE_GAME;
		lives = 3;
		ENEMY_MAXDX = ENEMY_MAXDX + 1000;
		timer = timer - 10;
		handiCap = 50;
    }
	else if (keyboard.isKeyDown(keyboard.KEY_E) == true) {
		gameState = STATE_GAME;
		lives = 4;
		timer = 45;
		handiCap = 0;
		ENEMY_MAXDX = METER * 5;
	}
	
	musicIntro.play();
	musicWin.pause();
	musicBackground.load();
	audioGameOver.load();
	audioDeathGrunt.load();
	audioDeathGrunt.pause();
	audioGameOver.pause();
	deathGruntTimer = 4;
	gameOverTimer = 7.3;



    var Splash_Screen = document.createElement("img");
    Splash_Screen.src = "Splash_Screen.png";
    context.drawImage(Splash_Screen, 0, 0)

		gameWon = false;
	return;
}

function runGame(deltaTime) {
	player.update(deltaTime); // update the player before drawing the map

	for (var i = 0; i < enemies.length; i++) {
		enemies[i].update(deltaTime);
	}
	musicWin.load();
	musicIntro.pause();
	drawBackground();
	drawMap();
	player.draw();
	musicBackground.play();

	for (var i = 0; i < enemies.length; i++) {
		enemies[i].draw();
	}

	var hit = false;
	for (var i = 0; i < bullets.length; i++) {

		bullets[i].update(deltaTime);

		if (bullets[i].position.x - worldOffsetX < 0 ||
			bullets[i].position.x - worldOffsetX > SCREEN_WIDTH) {

			hit = true;
		}

		for (var j = 0; j < enemies.length; j++) {

			if (intersects(bullets[i].position.x, bullets[i].position.y, TILE, TILE,
				enemies[j].position.x, enemies[j].position.y, TILE, TILE) == true) {
				// kill both the bullet and the enemy
				enemies.splice(j, 1);
				hit = true;
				// increment the player score
				score += 1;
				break;
			}
		}
		if (hit == true) {
			bullets.splice(i, 1);
			break;
		}
	}

	for (var i = 0; i < bullets.length; i++) {
		bullets[i].draw();
	}


	// update the frame counter 
	fpsTime += deltaTime;
	fpsCount++;
	if (fpsTime >= 1) {
		fpsTime -= 1;
		fps = fpsCount;
		fpsCount = 0;
	}

	// score
	context.font = "32px Arial";
	context.fillStyle = "red";
	var timerText = "Time Left:" + timer.toFixed(0);
	context.fillText(timerText, 10, 75);

	for (var i = 0; i < enemies.length; i++) {
        if (intersects(
            player.position.x - player.width / 2, player.position.y -
            player.height / 2,
            player.width, player.height,
            enemies[i].position.x - enemies[i].width / 2, enemies[i].position.y -
            enemies[i].height / 2,
            enemies[i].width, enemies[i].height) == true && hitBuffer <= 0) {
			hitBuffer = 1;
			lives = lives - 1;
			audioFallGrunt.play();
        }
    }

	hitBuffer -= deltaTime;

	timer -= deltaTime;

	if (timer <= 0) {
		gameState = STATE_GAMEOVER;
	}

	// life counter
	for (var i = 0; i < lives; i++) {
		context.drawImage(heartImage, 10 + ((heartImage.width - 10) * i), 10);
	}

	if (player.position.y > canvas.height + 80) {
		lives = lives - 1
		audioFallGrunt.play();
		player.position.set(3 * TILE, 10 * TILE);
	}

	if (player.position.y > canvas.height) {
		audioFallGrunt.play();
	}

	if (lives <= 0) {
		player.position.set(3 * TILE, 10 * TILE);
		gameState = STATE_GAMEOVER;
	}
}

function runGameOver(deltaTime) {
	if (keyboard.isKeyDown(keyboard.KEY_ENTER) == true) {
        gameState = STATE_SPLASH;
		lives = 4;
		timer = 45;
	}

    var Game_over = document.createElement("img");
    Game_over.src = "SNAKE!.png";
    context.drawImage(Game_over, 0, 0)
	lives = 0

	musicBackground.pause();
	audioGameOver.play();
	audioDeathGrunt.play();
	musicIntro.currentTime = 20;

	gameOverTimer -= deltaTime;
	deathGruntTimer -= deltaTime;
	if (gameOverTimer == 0) {
		gameOverTimer = 0
		return;

	}
	if (gameOverTimer <= 0) {
		audioGameOver.pause();
	}

	if (deathGruntTimer <= 0) {
		audioDeathGrunt.pause();
	}
}

function runGameWon(deltaTime) {

	musicWin.play();
	musicIntro.currentTime = 20;

	if (keyboard.isKeyDown(keyboard.KEY_ENTER) == true) {
        gameState = STATE_SPLASH;
		lives = 4;
		timer = 45;
	}

    context.fillStyle = "#ccc";
    context.fillRect(0, 0, canvas.width, canvas.height);

	var gameWon = document.createElement("img");
    gameWon.src = "winScreen.png";
    context.drawImage(gameWon, 0, 0)

	musicBackground.pause();

	context.font = "42px Times New Roman";
	context.fillStyle = "red"
	scoreLeft = "Score:" + (timer + handiCap + (lives * 5)).toFixed(2);
	context.fillText(scoreLeft, SCREEN_WIDTH / 2 - 100, SCREEN_HEIGHT / 2 + 30);
}

initialize();

//-------------------- Don't modify anything below here

// This code will set up the framework so that the 'run' function is called 60 times per second.
// We have a some options to fall back on in case the browser doesn't support our preferred method.
(function () {
	var onEachFrame;
	if (window.requestAnimationFrame) {
		onEachFrame = function (cb) {
			var _cb = function () { cb(); window.requestAnimationFrame(_cb); }
			_cb();
		};
	} else if (window.mozRequestAnimationFrame) {
		onEachFrame = function (cb) {
			var _cb = function () { cb(); window.mozRequestAnimationFrame(_cb); }
			_cb();
		};
	} else {
		onEachFrame = function (cb) {
			setInterval(cb, 1000 / 60);
		}
	}

	window.onEachFrame = onEachFrame;
})();

window.onEachFrame(run);
