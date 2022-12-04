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
let battery;
let allPlayers = [];
let jumpMultiplier = 1;
const maxHeight = -10;
let isGameEnded = false;
let isGameAlreadyStarted = false;
let cloudImg;
let cloudsXpos;
let cloudStartPosX = 0;

function preload() {
  // classifier = ml5.soundClassifier("SpeechCommands18w", {
  //   probabilityThreshold: 0.7,
  // });
  createStartButton();
  cloudImg = loadImage('assets/clouds.png');
}

function setup() {
  myCanvas = createCanvas(windowWidth, windowHeight);
  const publicPixelFont = loadFont('assets/PublicPixel.ttf');
  textFont(publicPixelFont);

  world.gravity.y = 10;

  createFloor();
  createHealthBattery();
  drawBoulder();


  startButton.position(width /2, height /2);

  cloudsXpos = [
    cloudStartPosX,
    cloudStartPosX + cloudImg.width,
    cloudStartPosX + cloudImg.width * 2,
    cloudStartPosX + cloudImg.width * 3,
  ];
}

function keyPressed() {
  if (keyCode === 32) {
    // jump(character);
    endGame();
  }
}

function windowResized() {
  // resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  clear();
  if (boulder?.x < 0) {
    boulder.x = width;
  }
  if (character?.x < 0) {
    character.x = width / 2;
    character.y = height - 215;
  }

  text(`${allPlayers.length} players connected.`, (width / 2) - 100, 50);

  if (isGameEnded) {
    text('game over', (width / 2) - 50, height / 2);
  }

  if (isGameAlreadyStarted) {
    text('game already started', (width / 2) - 100, height / 2);
  }

  cloudsXpos.forEach((cX, i) => {
    image(cloudImg, cX, 0);
    cloudsXpos[i] -= 1;
  })
  if (cloudsXpos[0] < (-1 * (cloudImg.width ))) {
    cloudsXpos.shift();
    cloudsXpos.push(cloudStartPosX + cloudImg.width * 3 - 1);
  }
}

// socket functions
socket.on('emit jump', function (params) {
  console.log('jump', params)
  jumpMultiplier = params.jumpHeightPercentage;
  jump(character);
});

socket.on('all players', function ({ players }) {
  allPlayers = players;
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

// game functions
function createStartButton() {
  startButton = createButton("Start");
  startButton.style('background-color', 'black');
  startButton.style('color', 'white');
  startButton.style('border', 'none');
  startButton.style('padding', '10px 20px');
  startButton.style('font-family', 'sans-serif');
  startButton.mousePressed(() => socket.emit('start game'));
}

function createSky() {


}

function createFloor() {
  floor = new Sprite(width / 2, height - 100, width * 2, 200, "static");
  floor.color = "brown";
}

function createHealthBattery() {
  battery = new Sprite(125, 45, 150, 20);
  battery.addAni('drain', 'img/animated/battery_0001.png', 10);
  battery.ani.stop();
  battery.collider = 'static';
  battery.ani.noLoop();
  battery.ani.onComplete = () => {
    alert('dead');
    // character.hide();
  }
}

function startGame() {
  startButton.hide();
  setupModels();
  setupRTC();
  buildCharacter();
  startBoulder();
  isGameEnded = false;
  battery.goToFrame(0);
}

function endGame() {
  resetBoulder();
  character.visible = false;
  isGameEnded = true;
  startButton.show();
}

function drawBoulder() {
  boulder = new Sprite(loadImage('img/boulder.png'), width, height - floor.height);
  boulder.x = width + boulder.width;
  boulder.y = height - floor.height - (boulder.height / 2);
  boulder.diameter = 50;
  boulder.collider = 'kinematic';
}

function startBoulder() {
  boulder.vel.x = -5;
  boulder.rotationSpeed = -5;
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
  character = new Sprite(width / 2, height - floor.height, 34);
  character.addAni('right', 'img/animated/Character_right_0001.png', 6);
  character.addAni('left', 'img/animated/Character_left_0001.png', 6);
  character.addAni('damage', 'img/animated/Character_damage_0001.png', 3);
  character.addAni('dead', 'img/animated/Character_dead_0001.png', 5);
  character.ani = 'right';
  character.bounciness = 0;
  character.collide(boulder, setDamage);

  character.ani.play();
}

function setDamage() {
  battery.ani.nextFrame();
  character.ani = 'damage';
  character.x = width / 2;
  character.y = height - 216;
  character.collider = 'static';
  setTimeout(() => {
    character.collider = 'dynamic';
    character.ani = 'right';
  }, 1000);
  socket.emit('character damaged');
}

// lib functions
function setupModels() {
  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  mic.start(startPitch);

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
      const d = new Date();
      const params = {
        time: d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds(),
      };
      console.log(params)
      socket.emit('character jump', params)
    }
  }
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
    p5lm.on('data', (data, id) => {
      console.log(JSON.parse(data))
    });
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