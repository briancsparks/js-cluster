
/**
 *  Cluster management in pure Node.js. (Mostly service discovery for now.)
 */
var sg              = require('sgsg');
var _               = sg._;
var redisLib        = require('redis');

var lib = {};

lib._mkKey = function(namespace, name) {
  return ['service', namespace, name].join(':');
};

lib._registerService = function(redis, namespace, name, socket, ttl, callback) {
  var key = lib._mkKey(namespace, name);

  redis.set(key, socket, function(err, res) {
    redis.expire(key, ttl);
    return callback.apply(this, arguments);
  });
};

lib._getServiceLocation = function(redis, namespace, name, callback) {
  var key = lib._mkKey(namespace, name);
  redis.get(key, function(err, res) {
    if (err) { return callback(err); }
    return callback(err, [res]);
  });
};

lib.Service = function(namespace, host_, port_) {
  var self = this;

  var host  = host_ || 'localhost';
  var port  = port_ || 6379;

  var redis = redisLib.createClient(port, host);

  self.registerService = function(name, socket, ttl, callback) {
    return lib._registerService(redis, namespace, name, socket, ttl, callback);
  };

  self.getServiceLocation = function(name, callback) {
    return lib._getServiceLocation(redis, namespace, name, callback);
  };
};

_.each(lib, function(value, key) {
  exports[key] = value;
});


