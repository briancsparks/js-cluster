
/**
 *
 */
const sg                      = require('sgsg');
const _                       = sg._;
const clusterLib              = require('../cluster');

const ServiceList             = clusterLib.ServiceList;

var lib = {};

lib.serviceLocations = lib.gsl = function(argv, context, callback) {
  var namespace   = sg.argvGet(argv, 'namespace,ns');
  var name        = sg.argvGet(argv, 'name');
  var redisHost   = sg.argvGet(argv, 'util-host,host')  || process.env.JS_CLUSTER_UTIL_IP   || process.env.SERVERASSIST_UTIL_IP;
  var redisPort   = sg.argvGet(argv, 'util-port,port')  || 6379;

  var serviceList = new ServiceList(namespace, redisHost, redisPort);

  return serviceList.getServiceLocations(name, function(err, result) {
    serviceList.quit();
    return callback(err, result);
  });
};


_.each(lib, (value, key) => {
  exports[key] = value;
});

