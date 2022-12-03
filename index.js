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

//Listen for individual clients/users to connect
io.on('connection', (socket) => {
    console.log('We have a new client: ' + socket.id);

    socket.on('new player', params => {
        players.push(params);
    });

    socket.on('submit data', params => {
        if (params.action === 'jump') {
            jumps[params.time] = jumps[params.time] ? jumps[params.time] + 1 : 1;
        }
        console.log(jumps);
        const d = new Date();
        const jumpHeightPercentage = (jumps[d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds()] || 1) / players.length;
        io.emit('emit jump', {jumpHeightPercentage});
    });
});
