//configure
require('dotenv').config();

//imports
const redis = require('redis')
    , utils = require('./utils/core')
    , Data = require ('./data-layer/Data')
    ;

//constants
const REDIS_PORT = process.env.REDIS_PORT
    , REDIS_HOST = process.env.REDIS_HOST
    ;

if( parseInt(process.env.CONFIG_DEBUG) ) {
  utils.log( 
      utils.LOG.DEBUG,
      'Env',
      process.env
  );
}

//const redisClient = redis.createClient(REDIS_PORT, REDIS_HOST);

var dataLayer = new Data();
utils.log(utils.LOG.DEBUG, 'Datalayer created.');
var pIdx = utils.profileStart('index');
dataLayer
  .createUser('Luca')
  .then(() => {
    return Promise.all([
      dataLayer.createResourceGroup('Books'),
      dataLayer.createResource('Book 1'),
      dataLayer.createResource('Book 2'),
      dataLayer.createResource('Book 3')
    ]);
  })
  .then(() => { 
    return Promise.all([
      dataLayer.grantGroupCapability('Luca', 'read', 'Books'),
      dataLayer.grantUserCapability('Luca', 'read', 'Book 3'),
      dataLayer.addResourceToGroup('Book 1', 'Books'),
      dataLayer.addResourceToGroup('Book 2', 'Books'),
      dataLayer.addResourceToGroup('Book 3', 'Books'),
      dataLayer.denyUserAccessToResource('Luca', 'Book 1')
    ]);
  })
  .then(() => {
    return dataLayer.checkIfUserCan('Luca', 'read', 'Book 1');
  })
  .then((lucaCan) => {
    if(lucaCan) {
      utils.log(utils.LOG.DEBUG, 'Luca can read Book 1 already.');
      return true;
    } else {
      return dataLayer.grantUserCapability('Luca', 'read', 'Book 1')
        .catch((e) => {
          if(e.message === 'USER_ACCESS_DENIED') {
            utils.log(utils.LOG.DEBUG, 'Luca\'s access to Book 1 is denied!');
          } else {
            console.error(e);
          }
        });
    }
  })
  .then(() => {
    return dataLayer.checkIfUserCan('Luca', 'read', 'Book 2')
      .then((lucaCan) => {
        if(lucaCan) {
          utils.log(utils.LOG.DEBUG, 'Luca can read Book 2.');
        } else {
          utils.log(utils.LOG.DEBUG, 'Luca has no access to Book 2.');
        }
      });
  })
  .then(() => {
    return dataLayer.revokeCapability('Luca', 'read', 'Book 3');
  })
  .then((r) => {
    if(r) {
      utils.log(utils.LOG.DEBUG, 'Luca\'s read capability has been revoked on Book 3.');
    } else {
      utils.log(utils.LOG.DEBUG, 'No need to revoke capability.');
    }
  })
  .then((res) => {
    utils.log(utils.LOG.DEBUG, 'End');
    utils.profileEnd(pIdx);
    try {
      dataLayer.close();
    } catch (e2) {
      console.error(e2);
    }
  })
  .catch((e) => {
    console.error(e);
    try {
      dataLayer.close();
    } catch (e2) {
      console.error(e2);
    }
  })
  ;