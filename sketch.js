let audioContext;
let mic;
let pitch;
let button;
let classifier;
let character;
let floor;
let hop = 10;
let isJumping = false;
let myVideo;

function preload() {
  // Load SpeechCommands18w sound classifier model
  classifier = ml5.soundClassifier("SpeechCommands18w", {
    probabilityThreshold: 0.7,
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  world.gravity.y = 10;

  // create start button
  button = createButton("click me");
  button.position(0, 0);
  button.mousePressed(setupModels);

  const x = 250;
  const y = height;

  character = new Sprite(40, 0, 34);
  character.addAni('right', 'img/animated/Character_right_0001.png', 6);
  character.addAni('left', 'img/animated/Character_left_0001.png', 6);
  character.ani = 'right';
  character.ani.stop();

  floor = new Sprite(width / 2, height, width, 200, "static");
  floor.color = "brown";
}

let otherVideo;
function gotStream(stream, id) {
  // otherVideo = stream;
  //otherVideo.id and id are the same and unique identifier
  // otherVideo.hide();
}

function keyPressed() {
  if (keyCode === 32) {
    jump(character);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  clear();
}

function jump(sprite) {
  console.log("hop", hop);
  sprite.move("up", 3, hop).then(() => {
    isJumping = false;
  });
}

// helper functions

function setupModels() {
  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  // mic.start(startPitch);
  classifier.classify(gotResult);

  let constraints = { audio: true, video: false };
  myVideo = createCapture(constraints, function (stream) {
    let p5lm = new p5LiveMedia(this, "CAPTURE", stream, "jZQ64AMJc");
    p5lm.on("stream", gotStream);
  });
  myVideo.elt.muted = true;
  myVideo.hide();

  character.ani.play();
}

function gotResult(error, results) {
  if (error) {
    console.error(error);
  }
  switch (results[0].label) {
    case "up":
      if (!isJumping) {
        isJumping = true;
        jump(character);
      }
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

function startPitch() {
  pitch = ml5.pitchDetection("./model/", audioContext, mic.stream, modelLoaded);
}

function modelLoaded() {
  console.log("Model Loaded");
  getPitch();
}

function getPitch() {
  pitch.getPitch(function (err, frequency) {
    // console.log(frequency);
    if (frequency) {
      // console.log(frequency);
      if (frequency > 200) {
        // console.log(frequency);
        hop = frequency;
      }
    }
    getPitch();
  });
}
