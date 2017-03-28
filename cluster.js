
/**
 *  Cluster management in pure Node.js. (Mostly service discovery for now.)
 */
var sg              = require('sgsg');
var _               = sg._;
var redisLib        = require('redis');

var lib = {};

var _mkKey = lib._mkKey = function(namespace, name) {
  return ['service', namespace, name].join(':');
};

lib._mkUniqKey = function(namespace, name, uniq) {
  return [_mkKey(namespace, name), uniq].join(':');
};

lib._registerService = function(redis, namespace, name, socket, uniq, ttl, callback) {
  var key     = lib._mkKey(namespace, name);
  var uniqKey = lib._mkUniqKey(namespace, name, uniq);

  return redis.psetex(uniqKey, ttl, socket, function(err, res) {
    return redis.sadd(key, uniqKey, function(err, res) {
      return callback.apply(this, arguments);
    });
  });
};

lib._getServiceLocation = function(redis, namespace, name, callback) {
  var key = lib._mkKey(namespace, name);

  // Get all the members of the set -- all the instances of the service
  return redis.smembers(key, function(err, keys) {
    if (err) { return callback(err); }
    return redis.mget(keys, function(err, res) {
      return callback(err, _.compact(res));
    });
  });
};

var Service = lib.Service = function(namespace, host_, port_) {
  var self = this;

  var host  = host_ || 'localhost';
  var port  = port_ || 6379;

  var redis = redisLib.createClient(port, host);

  self.registerService = function(name, socket, uniq, ttl, callback) {
    return lib._registerService(redis, namespace, name, socket, uniq, ttl, callback);
  };

  self.getServiceLocation = function(name, callback) {
    return lib._getServiceLocation(redis, namespace, name, callback);
  };
};

var getServices = lib.getServices = function(serviceList, name, callback) {
  var services, error;

  return sg.__each(serviceList, function(clusterService, nextService) {

    // Once we have services, do not need to look for more
    if (services) { return nextService(); }

    return clusterService.getServiceLocation(name, function(err, results) {
      error = error || err;
      if (!err && results.length > 0) {
        services = _.map(results, function(str) { return str.replace(/[/]$/g, ''); });
      }

      return nextService();
    });

  }, function() {
    if (error) { return callback(error); }
    return callback(null, services);
  });
};

lib.Services = function(host_, port_) {
  var self  = this;

  var host  = host_ || 'localhost';
  var port  = port_ || 6379;
  var index = 0;

  var serviceList = [];
  self.add = function(namespace) {
    serviceList.push(new Service(namespace, host, port));
  };

  self.getServices = function(name, callback) {
    return getServices(serviceList, name, callback);
  };

  self.getOneService = function(name, callback) {
    return getServices(serviceList, name, function(err, services) {
      if (err) { return callback(err); }

      if (++index >= services.length) {
        index = 0;
      }

      return callback(null, services[index]);
    });
  };
};

_.each(lib, function(value, key) {
  exports[key] = value;
});


