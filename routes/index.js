var express = require('express');
var router = express.Router();
const Events = require('../bin/event_types');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('main', { title: 'Boinkikurenshuu', constants: JSON.stringify(Events) });
});

/* GET home page. */
router.get('/nojs', function(req, res, next) {
  res.render('nojs', {});
});

/* GET home page. */
router.get('/outdated', function(req, res, next) {
  res.render('outdated', {});
});

module.exports = router;
