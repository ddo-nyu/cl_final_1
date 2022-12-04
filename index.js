//Initialize the express 'app' object
let express = require('express');
const bodyParser = require('body-parser');
let app = express();

app.use('/', express.static('public'));
app.use(express.json({limit: '10mb', extended: true}));

/*-----Database------*/
// let datastore = require('nedb');
// const {response} = require('express');
// let db = new datastore('yearbook.db');
// db.loadDatabase();

/*-----HTTP Server------*/
let http = require('http');
let server = http.createServer(app);

//'port' variable allowd for deployment
let port = process.env.PORT || 3002;

server.listen(port, () => {
    console.log('Server listening at port: ' + port);
});

/*-----Sockets------*/
//Socket.io Code
//Initialize socket.io
let io = require('socket.io');
io = new io.Server(server);

const players = [];
const jumps = {};
let hasStarted = false;
let health = 9;

io.on('connection', (socket) => {
    console.log('We have a new player: ' + socket.id);
    players.push(socket.id);
    io.emit('new player', { playerId: socket.id });
    io.emit('all players', { players });

    if (hasStarted) {
        io.to(socket.id).emit('game already started');
    }

    socket.on('character jump', params => {
        jumps[params.time] = jumps[params.time] ? jumps[params.time] + 1 : 1;
        const d = new Date();
        const jumpHeightPercentage = (jumps[d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds()] || 1) / players.length;
        io.emit('emit jump', {jumpHeightPercentage});
    });

    socket.on('character damaged', params => {
        health = health - 1;
        if (health < 1) {
            io.emit('game ended');
            health = 9;
            hasStarted = false;
        }
    });

    socket.on('start game', function () {
        io.emit('game started');
        hasStarted = true;
        health = 9;
    });

    socket.on('disconnect', function() {
        console.log('Got disconnect!');

        const i = players.indexOf(socket.id);
        players.splice(i, 1);
        io.emit('all players', { players });

        if (players.length < 1) {
            health = 9;
            hasStarted = false;
        }
    });
});
