const socket = io();

let audioContext;
let mic;
let pitch;
let startButton;
let classifier;
let character;
let floor;
let hop = 100;
let myAudio;
let otherPlayers = [];
let myCanvas;
let canvasStream
let p5lm;
let isJumping = false;
let speechRec;
let boulder;
let allPlayers = [];
let jumpMultiplier = 1;
const maxHeight = -6;
let isGameEnded = false;
let isGameAlreadyStarted = false;
let cloudImg;
let floorImg;
let heartImg;
let floorXpos = [];
let cloudsXpos;
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
  // classifier = ml5.soundClassifier("SpeechCommands18w", {
  //   probabilityThreshold: 0.7,
  // });
  createStartButton();
  cloudImg = loadImage('assets/clouds.png');
  floorImg = loadImage('assets/ground_0001.png');
  heartImg = loadImage('assets/heart.png');
}

function setup() {
  myCanvas = createCanvas(1000, 700);
  // myCanvas.position((windowWidth / 2) - (myCanvas.width / 2), (windowHeight / 2) - (myCanvas.height / 2));

  const publicPixelFont = loadFont('assets/PublicPixel.ttf');
  textFont(publicPixelFont);

  world.gravity.y = 10;

  createFloor();
  drawBoulder();

  startButton.position(windowWidth / 2 - (startButton.width / 2), windowHeight / 2 - (startButton.height / 2), 'fixed');

  cloudsXpos = [
    0,
    cloudImg.width,
    cloudImg.width * 2,
    cloudImg.width * 3,
    cloudImg.width * 4,
  ];

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
  if (keyCode === 32) {
    jump(character);
  }
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

  if (boulder?.x < 0) {
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

  cloudsXpos.forEach((cX, i) => {
    // image(cloudImg, cX, 0);
    cloudsXpos[i] -= 1;
  })
  if (cloudsXpos[0] < (-1 * (cloudImg.width))) {
    cloudsXpos.push(cloudImg.width * 4 - 1);
    cloudsXpos.shift();
  }

  floorXpos.forEach((fX, i) => {
    image(floorImg, fX, height - floorImg.height);
    if (hasGameStarted) {
      floorXpos[i] -= 0.5;
    }
  });
  if (floorXpos[0] < (-1 * (floorImg.width ))) {
    floorXpos.shift();
    floorXpos.push(cloudImg.width * 4 - 1);
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

function createRetartButton() {
  startButton = createButton("Restart");
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
  setFullHealth();
  startButton.hide();
  setupModels();
  // setupRTC();
  buildCharacter();
  startBoulder();
  hasGameStarted = true;
  isGameEnded = false;
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
  }
}

function buildCharacter() {
  character = new Sprite();
  character.height = 34;
  character.width = 34;
  resetCharacterPosition();

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
  character.x = width / 2;
  character.y = height - floor.height - (character.height / 2);
}

function setDamage() {
  character.collider = 'static';
  character.ani = 'damage';
  resetCharacterPosition();

  setTimeout(() => {
    character.collider = 'dynamic';
    character.ani = 'right';
  }, 2000);
}

// lib functions
function setupModels() {
  audioContext = getAudioContext();
  // mic = new p5.AudioIn();
  // mic.start(startPitch);

  speechRec = new p5.SpeechRec();
  speechRec.onResult = gotSpeech;
  let continuous = false;
  let interimResults = false;
  speechRec.start(continuous, interimResults);
  speechRec.onEnd = restart;
}

function startPitch() {
  pitch = ml5.pitchDetection('./model/', audioContext , mic.stream, modelLoaded);
}

function restart(){
  speechRec.start();
}

function gotSpeech() {
  if (speechRec?.resultConfidence > 0.7) {
    if (speechRec?.resultString.includes('jump')) {
      characterText = '';
      const d = luxon.DateTime.now().setZone("America/New_York");
      const t = d.toFormat('HH:mm:ss');
      const params = {
        time: t,
      };
      console.log(params)
      socket.emit('character jump', params)
    }
  }
  const phrase = characterPhrases[round(random(0, characterPhrases.length))];
  characterText = phrase;
}

function setupRTC() {
  // Use constraints to request audio from createCapture
  let constraints = {
    audio: true
  };

  // Need to use the callback to get at the audio/video stream
  myAudio = createCapture(constraints, async function(stream) {
    console.log(stream);
    // Get a stream from the canvas to send
    canvasStream = myCanvas.elt.captureStream(15);

    // Extract the audio tracks from the stream
    let audioTracks = stream.getAudioTracks();

    // Use the first audio track, add it to the canvas stream
    if (audioTracks.length > 0) {
      canvasStream.addTrack(audioTracks[0]);
    }

    // Give the canvas stream to SimpleSimplePeer as a "CAPTURE" stream
    p5lm = new p5LiveMedia(this, "CAPTURE", canvasStream, "SimpleSimplePeerAdvancedTest");
    p5lm.on('stream', gotStream);
    // p5lm.on('data', (data, id) => {
    //   console.log(JSON.parse(data))
    // });
  });
  myAudio.elt.muted = true;
  myAudio.hide();
}

function gotStream(stream, id) {
  otherPlayers[id] = stream;
  otherPlayers[id].hide();
}

function modelLoaded() {
  console.log("PitchDetection Model Loaded");
  // getPitch();
}

function getPitch() {
  pitch.getPitch(function (err, frequency) {
    if (frequency) {
      if (speechRec?.resultConfidence > 0.7) {
        if (speechRec?.resultString.includes('jump')) {

        }
      }
    }
    getPitch();
  });
}