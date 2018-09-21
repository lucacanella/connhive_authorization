//configure
require('dotenv').config();

//imports
const redis = require('redis')
    , utils = require('./utils/core')
    , Data = require ('./data-layer/Data')
    , express = require('express')
    , bodyParser = require('body-parser')
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

app = express();

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.SERVER_PORT || 80;
var router = express.Router();

router.get('/can/:user/:do_what/:on_resource', (req, res) => {
    let username = req.params.user
      , do_what = req.params.do_what
      , resource = req.params.on_resource
      ;
    dataLayer
        .checkIfUserCan(username, do_what, resource)
        .then((resData) => { 
            res.json({
                req: `Can ${username} ${do_what} ${resource}?`,
                res: resData
            }); 
        });
});

router.get('/create_user/:user', (req, res) => {
    let username = req.params.user
      ;
    dataLayer
        .createUser(username)
        .then((resData) => {
            resData.toJson().then((jsonData) => { 
                res.json({
                    req: `Create user with name: ${username}`,
                    res: jsonData
                });
            });
        });
});

router.get('/what_resources_can/:user/:do_what', (req, res) => {
    let username = req.params.user
      , do_what = req.params.do_what
      ;
    res.status(501).json({
        req: `What resources can ${username} ${do_what}?`,
        err: `Not implemented`
    }); 
});

app.use('/', router);

app.listen(port);
