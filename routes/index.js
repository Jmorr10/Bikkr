var express = require('express');
var router = express.Router();
const Events = require('../bin/event_types');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('main', { title: 'Express', constants: JSON.stringify(Events) });
});

module.exports = router;
