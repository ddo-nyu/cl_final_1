let audioContext;
let mic;
let pitch;
let button;
let classifier;
let character;
let floor;
let hop = 50;
let myAudio;
let p5lmDATA;
let otherVideo;
let myCanvas;
let canvasStream
let p5lm;

function preload() {
  classifier = ml5.soundClassifier("SpeechCommands18w", {
    probabilityThreshold: 0.7,
  });
}

function setup() {
  myCanvas = createCanvas(windowWidth, windowHeight);

  world.gravity.y = 10;

  // create start button
  button = createButton("Start");
  button.position(0, 0);
  button.mousePressed(setupLibs);

  floor = new Sprite(width / 2, height, width, 200, "static");
  floor.color = "brown";
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
  sprite.move("up", 3, hop);
}

// helper functions
function setupLibs() {
  setupModels();
  // setupRTC();
  buildCharacter();
}

function buildCharacter() {
  character = new Sprite(40, 0, 34);
  character.addAni('right', 'img/animated/Character_right_0001.png', 6);
  character.addAni('left', 'img/animated/Character_left_0001.png', 6);
  character.ani = 'right';
  character.ani.play();
}

async function setupModels() {
  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  // mic.start(startPitch);
  classifier.classify(parseCommand);
}

function setupRTC() {
  // Use constraints to request audio from createCapture
  let constraints = {
    audio: true
  };

  // Need to use the callback to get at the audio/video stream
  myAudio = createCapture(constraints, async function(stream) {
    console.log(stream)


    // Get a stream from the canvas to send
    canvasStream = myCanvas.elt.captureStream(15);

    // Extract the audio tracks from the stream
    let audioTracks = stream.getAudioTracks();

    // Use the first audio track, add it to the canvas stream
    if (audioTracks.length > 0) {
      canvasStream.addTrack(audioTracks[0]);
      // pitch = ml5.pitchDetection("./model/", audioContext, canvasStream, modelLoaded);


      const mediaRecorder = new MediaRecorder(canvasStream);
      const recognizer = speechCommands.create('BROWSER_FFT');
      await recognizer.ensureModelLoaded();
      const modelInputShape = await recognizer.modelInputShape();
      console.log('modelInputShape', modelInputShape)
      console.log(recognizer.params().sampleRateHz);
      console.log(recognizer.params().fftSize);
      const x = tf.tensor4d(mediaRecorder, [1].concat(recognizer.modelInputShape().slice(1)));
      const output = await recognizer.recognize(x);
      // output has the same format as `result` in the online streaming example
      // above: the `scores` field contains the probabilities of the words.

      tf.dispose([x, output]);
    }

    // Give the canvas stream to SimpleSimplePeer as a "CAPTURE" stream
    p5lm = new p5LiveMedia(this, "CAPTURE", canvasStream, "SimpleSimplePeerAdvancedTest");
    p5lm.on('stream', gotStream);
    p5lm.on('data', parseData);
  });
  myAudio.elt.muted = true;
  myAudio.hide();
}

function gotStream(stream) {
  otherVideo = stream;
  otherVideo.hide();
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
  getPitch();
}

function getPitch() {
  pitch.getPitch(function (err, frequency) {
    if (frequency) {
      // console.log('frequency', frequency);
      p5lm.send(JSON.stringify({ frequency }));
    }
    getPitch();
  });
}
