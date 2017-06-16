
/**
 *  A web page to watch TMI.
 */
var sg              = require('sgsg');
var _               = sg._;
var libDebug        = require('debug');
var clusterLib      = require('../');
var app             = require('express')();
var http            = require('http').Server(app);
var io              = require('socket.io')(http);
var ioRedis         = require('socket.io-redis');
var urlLib          = require('url');
var bodyParser      = require('body-parser');

var debug           = libDebug('jsc-ws');
var dbgdata         = libDebug('jsc-ws:data');
var dbgconnect      = libDebug('jsc-ws:connections');
var ARGV            = sg.ARGV();
var ns              = sg.argvGet(ARGV, 'namespace,ns');

var myIp            = process.env.SERVERASSIST_INTERNAL_IP;
var myColor         = process.env.SERVERASSIST_COLOR;
var myStack         = process.env.SERVERASSIST_STACK;
var utilIp          = 'localhost';

var ServiceList     = clusterLib.ServiceList;
var myServices      = new ServiceList(['serverassist', myColor, myStack].join('-'), process.env.SERVERASSIST_UTIL_IP);

if (ns) {
  if (process.env[ns.toUpperCase()+'_UTIL_IP']) {
    utilIp = process.env[ns.toUpperCase()+'_UTIL_IP'];
  }
}

// ---------- Start the server ----------
var redisParams = {host: utilIp, port: 6379};
debug(redisParams);
io.adapter(ioRedis(redisParams));

// ---------- Handle socket.io ----------
io.on('connection', function(socket){
  dbgconnect('a user connected');

  socket.on('event', function(evt) {
    dbgdata('event: ', evt);
    io.emit('event', evt);
  });

  socket.on('trace', function(evt) {
    dbgdata('trace: ', evt);
    io.emit('trace', evt);
  });

  socket.on('gauge', function(gauge) {
    dbgdata('gauge: ', gauge);
    io.emit('gauge', gauge);
  });

  socket.on('state', function(state) {
    dbgdata('state: ', state);
    io.emit('state', state);
  });

  socket.on('info', function(msg) {
    dbgdata('info: ', msg);
    io.emit('info', msg);
  });

  socket.on('disconnect', function() {
    dbgconnect('disconnected');
  });
});

// ---------- The Handlers ----------
var sanitize = function(obj_) {
  var obj = sg.smartAttrs(obj_ || {});

  if (!obj.tags)              { return obj; }

  var arr = obj.tags;
  if (_.isString(obj.tags)) {
    arr = obj.tags.split(/[, ]+/g);
  }

  // Turn a string into tags: 'foo, bar, baz=quxx'
  obj.tags = sg.reduce(arr, {}, function(m, str) {
    var result   = {};
    var parts    = str.split(/[=] ?/g);
    var key      = parts.shift();

    if (parts.length <= 0) {
      return sg.kv(m, key, true);
    }

    return sg.kv(m, key, parts.join('='));
  });

  return obj;
};

var sendEvent = function(name, value, value2) {
  data = _.extend({name:name}, value, value2 || {});
  data = sanitize(data);

  dbgdata('sending event: '+name, data);
  io.emit('event', data);
};

var sendTrace = function(name, value, value2, value3) {
  data = _.extend({name:name}, value, value2 || {}, value3 || {});
  data = sanitize(data);

  dbgdata('sending trace: '+name, data);
  io.emit('trace', data);
};

var sendGauge = function(name, value, values, values2) {
  var data = _.extend({name:name, value:value}, values, values2 || {});
  data[name] = value;

  data = sanitize(data);

  dbgdata('sending gauge: '+name, value, data);
  io.emit('gauge', data);
};

var sendState = function(name, state, state2) {
  var data = _.extend({name:name}, state, state2 || {});
  data = sanitize(data);

  dbgdata('sending state: '+name, data);
  io.emit('state', data);
};

// ---------- Handle HTTP ----------------
app.use(bodyParser.json());

app.get('/event/:name', function(req, res) {
  var url = urlLib.parse(req.url, true);
  sendEvent(req.params.name, url.query);
  res.end('OK');
});

app.post('/event/:name', function(req, res) {
  var url = urlLib.parse(req.url, true);
  sendEvent(req.params.name, url.query, req.body || {});
  res.end('OK');
});

app.get('/trace/:id', function(req, res) {
  var url = urlLib.parse(req.url, true);
  sendTrace(req.params.id, req.params, url.query);
  res.end('OK');
});

app.post('/trace/:id', function(req, res) {
  var url = urlLib.parse(req.url, true);
  sendTrace(req.params.id, req.params, url.query, req.body || {});
  res.end('OK');
});

app.get('/gauge/:name/:value', function(req, res) {
  var url = urlLib.parse(req.url, true);
  sendGauge(req.params.name, req.params.value, url.query);
  res.end('OK');
});

app.post('/gauge/:name/:value', function(req, res) {
  var url = urlLib.parse(req.url, true);
  sendGauge(req.params.name, req.params.value, url.query, req.body || {});
  res.end('OK');
});

app.get('/state/:name', function(req, res) {
  var url = urlLib.parse(req.url, true);
  sendState(req.params.name, url.query);
  res.end('OK');
});

app.post('/state/:name', function(req, res) {
  var url = urlLib.parse(req.url, true);
  sendState(req.params.name, url.query, req.body || {});
  res.end('OK');
});

app.get('/tmi', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var port = ARGV.port || 54321;
http.listen(port, function(){
  debug('listening on *:'+port);

  // Register my service into the cluster
  registerAsService();
  function registerAsService() {
    myServices.registerService('tmi_server', 'http://'+myIp+':'+port+'/tmi', myIp, 4000, function(){});
    myServices.registerService('tmi_socketio', 'http://'+myIp+':'+port, myIp, 4000, function(){});
    setTimeout(registerAsService, 750);
  }
});

