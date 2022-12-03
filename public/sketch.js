const socket = io();

let playerId;
let audioContext;
let mic;
let pitch;
let button;
let classifier;
let character;
let floor;
let hop = 100;
let myAudio;
let otherPlayers = [];
let myCanvas;
let canvasStream
let p5lm;
let hasStarted = false;
let isJumping = false;
let speechRec;
let log;
let battery;
let players = [];
let jumpMultiplier = 1;

// function preload() {
//   classifier = ml5.soundClassifier("SpeechCommands18w", {
//     probabilityThreshold: 0.7,
//   });
// }

socket.on('emit jump', function (params) {
  console.log('jump', params)
  jumpMultiplier = params.jumpHeightPercentage;
  jump(character);
});

function setup() {
  playerId = guidGenerator();
  socket.emit('new player', {
    playerId,
  })

  myCanvas = createCanvas(windowWidth, windowHeight);

  world.gravity.y = 10;

  // let inp = createInput('');
  // inp.position(0, 0);
  // inp.size(100);
  // inp.input(myInputEvent);

  // create start button
  button = createButton("Start");
  button.position(width /2, height /2);
  button.mousePressed(startGame);

  floor = new Sprite(width / 2, height - 100, width * 2, 200, "static");
  floor.color = "brown";

  battery = new Sprite(125, 50, 150, 20);
  battery.addAni('drain', 'img/animated/battery_0001.png', 10);
  battery.ani.stop();
  battery.collider = 'static';
  battery.ani.noLoop();
  battery.ani.onComplete = () => {
    alert('dead');
    // character.hide();
  }

  drawLogs();


}

function drawLogs() {
  log = new Sprite(loadImage('img/boulder.png'), width, height - 225);
  log.x = width;
  log.y = height - 225;
  log.diameter = 50;
  log.collider = 'kinematic';
}

function startLogs() {
  log.vel.x = -5;
  log.rotationSpeed = -5;
}

function keyPressed() {
  if (keyCode === 32) {
    jump(character);
  }
}

// function windowResized() {
//   resizeCanvas(windowWidth, windowHeight);
// }

function draw() {
  clear();
  if (log?.x < 0) {
    log.x = width;
  }
  if (character?.x < 0) {
    character.x = width / 2;
    character.y = height - 215;
  }

  Object.keys(otherPlayers).forEach((id, i) => {
    text(id, width / 2, (i * 10)+ 50);
  })
}

const maxHeight = -10;
const maxFrequency = 800;

function jump(sprite) {
  if (!isJumping) {
    isJumping = true;
    const j = maxHeight * jumpMultiplier;
    console.log('jumping at', j);
    sprite.velocity.y = j;
    isJumping = false;
  }
}

// helper functions
function startGame() {
  button.hide();
  if (!hasStarted) {
    setupModels();
    setupRTC();
    buildCharacter();
    // startLogs();
    hasStarted = true;
  }
}

function buildCharacter() {
  character = new Sprite(width / 2, height - 215, 34);
  character.addAni('right', 'img/animated/Character_right_0001.png', 6);
  character.addAni('left', 'img/animated/Character_left_0001.png', 6);
  character.addAni('damage', 'img/animated/Character_damage_0001.png', 3);
  character.addAni('dead', 'img/animated/Character_dead_0001.png', 5);
  character.ani = 'right';
  character.bounciness = 0;
  character.collide(log, setDamage);

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
}

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
        playerId,
        action: 'jump',
        // timestamp: new Date().getTime(),
        // hours: d.getHours(),
        // minutes: d.getMinutes(),
        // seconds: d.getSeconds(),
        time: d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds(),
      };
      console.log(params)
      socket.emit('submit data', params)
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

      audioTracks.forEach((at, i) => {
        players.push('player ' + i);
      })
    }

    // Give the canvas stream to SimpleSimplePeer as a "CAPTURE" stream
    p5lm = new p5LiveMedia(this, "CAPTURE", canvasStream, "SimpleSimplePeerAdvancedTest");
    p5lm.on('stream', gotStream);
    p5lm.on('data', parseData);
  });
  myAudio.elt.muted = true;
  myAudio.hide();
}

function gotStream(stream, id) {
  otherPlayers[id] = stream;
  otherPlayers[id].hide();
  // otherPlayers[id] = stream.getAudioTracks()[0];
}

function parseData(data, id) {
  console.log(JSON.parse(data))
}

function parseCommand(error, results) {
  if (error) {
    console.error(error);
  }
  switch (results[0].label) {
    case "up":
      jump(character);
      break;
    case "right":
      character.ani = "right";
      break;
    case "left":
      character.ani = "left";
      break;
    default:
      break;
  }
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
          // jump(character);

          // p5lm.send(JSON.stringify({
          //   playerId,
          //   action: 'jump',
          //   frequency,
          // }));

          socket.emit('send data', {
            playerId,
            frequency,
            action: 'jump'
          })
        }
      }
    }
    getPitch();
  });
}

function guidGenerator() {
  var S4 = function() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  };
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}