const socket = io();

let startButton;
let character;
let floor;
let myCanvas;
let isJumping = false;
let speechRec;
let boulder;
let allPlayers = [];
let jumpMultiplier = 1;
const maxHeight = -6;
let isGameEnded = false;
let isGameAlreadyStarted = false;
let floorImg;
let heartImg;
let floorXpos = [];
let hasGameStarted = false;
let heartXpos;
let isMasterPlayer = false;
let characterText = '';
let characterPhrases = [
    'huh?',
    'what did you say?',
    "i didn't hear you",
    'zzz...',
];

function preload() {
  createStartButton();
  floorImg = loadImage('assets/ground_0001.png');
  heartImg = loadImage('assets/heart.png');
}

function setup() {
  myCanvas = createCanvas(1000, 700);

  if (windowWidth < myCanvas.width) {
    const ratio = windowWidth / myCanvas.width;
    document.querySelector('main').style.transform = `scale(${ratio})`;
  }


  const publicPixelFont = loadFont('assets/PublicPixel.ttf');
  textFont(publicPixelFont);

  world.gravity.y = 10;

  createFloor();
  drawBoulder();

  startButton.position(windowWidth / 2 - (startButton.width / 2), windowHeight / 2 - (startButton.height / 2), 'fixed');

  floorXpos = [
    0,
    floorImg.width,
    floorImg.width * 2,
    floorImg.width * 3,
    floorImg.width * 4,
  ]

  setFullHealth();
}

function keyPressed() {
  // if (keyCode === 32) {
  //   emitJump();
  // }
}

function windowResized() {
  // resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  clear();
  background('#98f6fe');

  if (hasGameStarted) {
    heartXpos.forEach(h => image(heartImg, h, 20));
  }

  if (boulder?.x < -20) {
    boulder.x = width;
  }

  if (character?.x < 0) {
    character.x = width / 2;
    character.y = height - 215;
  }

  text(`${allPlayers.length} players connected.`, (width / 2) - 100, 50);

  if (isGameEnded) {
    text('game over', (width / 2) - 50, (height / 2) - 50);
  }

  if (isGameAlreadyStarted) {
    text('game already started', (width / 2) - 100, height / 2);
  }

  floorXpos.forEach((fX, i) => {
    image(floorImg, fX, height - floorImg.height);
    if (hasGameStarted) {
      floorXpos[i] -= 0.5;
    }
  });
  if (floorXpos[0] < (-1 * (floorImg.width ))) {
    floorXpos.shift();
    floorXpos.push(floorImg.width * 4 - 1);
  }

  if (character) {
    text(characterText, character.x + 25, character.y - 25);
  }
}

// socket functions
socket.on('emit jump', function (params) {
  if (character) {
    console.log('jump', params)
    jumpMultiplier = params.jumpHeightPercentage;
    jump(character);
  }
});

socket.on('all players', function ({ players }) {
  allPlayers = players;
});

socket.on('master player', function () {
  isMasterPlayer = true;
});

socket.on('game started', function () {
  startGame();
});

socket.on('game ended', function () {
  endGame();
});

socket.on('game already started', function () {
  startButton.hide();
  isGameAlreadyStarted = true;
})

socket.on('character damage', function ({ health }) {
  setDamage(health);
  heartXpos.pop();
});

socket.on('master player', function (params) {
  isMasterPlayer = params.isMasterPlayer || false;
})

// game functions
function setFullHealth() {
  heartXpos = [
    20,
    20 + heartImg.width,
    20 + heartImg.width * 2,
    20 + heartImg.width * 3,
    20 + heartImg.width * 4,
  ];
}

function resizeMain() {
  const main = document.querySelector('main');

  if (main.offsetWidth > windowWidth) {
    const ratio = (windowWidth - 40) / main.offsetWidth;
    main.style.transform = `scale(${ratio})`;
  }
}

function createStartButton() {
  startButton = createButton("Start");
  startButton.style('background-color', 'black');
  startButton.style('color', 'white');
  startButton.style('border', 'none');
  startButton.style('padding', '10px 20px');
  startButton.style('font-family', 'sans-serif');
  startButton.mousePressed(() => socket.emit('start game'));
}

function createFloor() {
  floor = new Sprite(width / 2, height - (floorImg.height / 2), width * 2, 150, "static");
  floor.visible = false;
}

function startGame() {
  hasGameStarted = true;
  isGameEnded = false;

  setFullHealth();
  startButton.hide();
  buildCharacter();
  startBoulder();

  setupModels();
}

function endGame() {
  resetBoulder();
  character.visible = false;
  isGameEnded = true;
  hasGameStarted = false;
  startButton.show();
  character = null;
}

function drawBoulder() {
  boulder = new Sprite(loadImage('img/boulder.png'), width, height - floor.height);
  boulder.x = width + boulder.width;
  boulder.y = height - floor.height - (boulder.height / 2);
  boulder.diameter = 50;
  boulder.collider = 'kinematic';
}

function startBoulder() {
  boulder.vel.x = -3;
  boulder.rotationSpeed = -3;
}

function resetBoulder() {
  boulder.vel.x = 0;
  boulder.rotationSpeed = 0;
  boulder.x = width + boulder.width;
}

function jump(sprite) {
  if (!isJumping) {
    isJumping = true;
    const j = maxHeight * jumpMultiplier;
    console.log('jumping at', j);
    sprite.velocity.y = j;
    isJumping = false;
    // characterText = '';
  }
}

function buildCharacter() {
  character = new Sprite();
  character.height = 34;
  character.width = 34;
  character.x = width / 2;
  character.y = height - floor.height - (character.height / 2) - 40;

  character.addAni('right', 'img/animated/Character_right_0001.png', 6);
  character.addAni('left', 'img/animated/Character_left_0001.png', 6);
  character.addAni('damage', 'img/animated/Character_damage_0001.png', 3);
  character.addAni('dead', 'img/animated/Character_dead_0001.png', 5);
  character.ani = 'right';
  character.bounciness = 0;

  if (isMasterPlayer) {
    character.collide(boulder, () => {
      socket.emit('character damaged');
    });
  }

  character.ani.play();
}

function resetCharacterPosition() {
  character.remove();
  buildCharacter();
}

function setDamage() {
  character.collider = 'static';
  character.ani = 'damage';

  setTimeout(() => {
    character.collider = 'dynamic';
    resetCharacterPosition();
    character.ani = 'right';
  }, 2000);
}

// lib functions
function setupModels() {
  speechRec = new p5.SpeechRec();
  speechRec.onResult = gotSpeech;
  let continuous = false;
  let interimResults = false;
  speechRec.start(continuous, interimResults);
  speechRec.onEnd = restart;
}

function restart(){
  speechRec.start();
}

function gotSpeech() {
  console.log(speechRec?.resultString, ', confidence', speechRec?.resultConfidence);
  if ((speechRec?.resultConfidence > 0.5) && speechRec?.resultString.includes('jump')) {
    characterText = 'ok!';
    emitJump();
  } else {
    const phrase = characterPhrases[round(random(0, characterPhrases.length))];
    characterText = phrase;
  }
}

function emitJump() {
  const d = luxon.DateTime.now().setZone("America/New_York");
  const t = d.toFormat('HH:mm:ss');
  const params = { time: t };
  socket.emit('character jump', params)
}
