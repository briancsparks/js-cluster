
/**
 *  Cluster management in pure Node.js. (Mostly service discovery for now.)
 */
var sg              = require('sgsg');
var _               = sg._;
var redisLib        = require('redis');

var minutes         = sg.minutes;

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
      return redis.expire(key, 60, function(err, res) {
        return callback.apply(this, arguments);
      });
    });
  });
};

lib._getServiceLocations = function(redis, namespace, name, callback) {
  var key = lib._mkKey(namespace, name);

  // Get all the members of the set -- all the instances of the service
  return redis.smembers(key, function(keysErr, keys) {
    if (keysErr)                  { return callback(keysErr); }
    if (sg.numKeys(keys) === 0)   { return callback(null, []); }

    return redis.mget(keys, function(err, res) {
      return callback(err, _.compact(res), key);
    });
  });
};

// The old, confusing name
lib._getServiceLocation = lib._getServiceLocations;

var ServiceList = lib.ServiceList = function(namespace, redisHost_, redisPort_) {
  var self = this;

  var redisHost  = redisHost_ || 'localhost';
  var redisPort  = redisPort_ || 6379;
  var index      = 0;

  var redis = redisLib.createClient(redisPort, redisHost);

  self.registerService = function(name, socket, uniq, ttl, callback) {
    return lib._registerService(redis, namespace, name, socket, uniq, ttl, callback);
  };

  self.getServiceLocations = function(name, callback) {
    return lib._getServiceLocations(redis, namespace, name, callback);
  };

  self.getServiceLocation = self.getServiceLocations;

  self.getOneServiceLocation = function(name, callback) {
    return self.getServiceLocations(name, function(err, services, key) {
      if (err) { return callback(err); }

      if (++index >= services.length) {
        index = 0;
      }

      return callback(null, services[index], key);
    });
  };

  // Aliases
  self.getOneService  = self.getOneServiceLocation;

  self.waitForOneServiceLocation = function(name, def, callback) {
    return sg.until((again, last, count, elapsed) => {
      return self.getOneServiceLocation(name, (err, location, key) => {
        if (err || !location) {
          console.error(`Waiting for ${name} service, elapsed: ${elapsed}`);
          if (elapsed < 30*minutes) { return again(5000); }

          /* otherwise */
          console.error(`Waited too long for ${name}, using default: ${def}`);
          return last(def);
        }

        return last(location, key);
      });

    }, function(location, key) {
      return callback(null, location, key);
    });
  };

  self.waitForOneService = self.waitForOneServiceLocation;

  self.quit = function() {
    redis.quit();
  };
};

// The old, confusing name
var Service = lib.Service = ServiceList;

var getServiceLocations = lib.getServiceLocations = function(serviceListList, name, callback) {
  var serviceLocations, key, error;

  return sg.__each(serviceListList, function(serviceList, nextService) {

    // Once we have serviceLocations, do not need to look for more
    if (serviceLocations) { return nextService(); }

    return serviceList.getServiceLocations(name, function(err, results, key_) {
      error = error || err;
      if (!err && results.length > 0) {
        serviceLocations = _.map(results, function(str) { return str.replace(/[/]$/g, ''); });
        key              = key_;
      }

      return nextService();
    });

  }, function() {
    if (error) { return callback(error); }
    return callback(null, serviceLocations || [], key);
  });
};

// The old, confusing name
var getServices = lib.getServices = getServiceLocations;

lib.ServiceLists = function(redisHost_, redisPort_) {
  var self  = this;

  var redisHost  = redisHost_ || 'localhost';
  var redisPort  = redisPort_ || 6379;
  var index      = 0;

  var serviceListList = [];
  self.numServices = function() {
    return serviceListList.length;
  };

  self.addService = function(serviceList) {
    serviceListList.push(serviceList);
  };

  self.add = function(namespace) {
    self.addService(new ServiceList(namespace, redisHost, redisPort));
  };

  self.getServiceLocations = function(name, callback) {
    return getServiceLocations(serviceListList, name, callback);
  };

  self.getOneServiceLocation = function(name, callback) {
    return getServiceLocations(serviceListList, name, function(err, services, key) {
      if (err) { return callback(err); }

      if (++index >= services.length) {
        index = 0;
      }

      return callback(null, services[index], key);
    });
  };

  self.waitForOneServiceLocation = function(name, def, callback) {
    return sg.until(function(again, last, count, elapsed) {
      return self.getOneServiceLocation(name, function(err, location, key) {
        if (!sg.ok(err, location)) {
          console.error(`Waiting for ${name} service, elapsed: ${elapsed}`);
          if (elapsed < 30*minutes)   { return again(5000); }

          /* otherwise -- we have waited too long. */
          console.error(`Waited too long for ${name}, using default: ${def}`);
          return last(def);
        }

        // Finally got it
        return last(location, key);
      });

    }, /*until:done*/ function(location, key) {
      return callback(null, location, key);
    });
  };

  // Aliases
  self.getServices    = self.getServiceLocations;
  self.getOneService  = self.getOneServiceLocation;

  self.quit = function() {
    _.each(serviceListList, function(serviceList) {
      serviceList.quit();
    });
  };
};

// Alias
lib.ServiceListList = lib.ServiceLists;

// The old, confusing name
lib.Services = lib.ServiceLists;

_.each(lib, function(value, key) {
  exports[key] = value;
});


