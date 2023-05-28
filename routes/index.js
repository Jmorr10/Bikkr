var express = require('express');
var router = express.Router();
const Events = require('../bin/event_types');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('main', { title: 'Bikkr', constants: JSON.stringify(Events) });
});

/* GET home page. */
router.get('/nojs', function(req, res, next) {
  res.render('nojs', {});
});

/* GET home page. */
router.get('/outdated', function(req, res, next) {
  res.render('outdated', {});
});

router.get('/room/:room', function (req, res, next) {
  res.render('main', { title: 'Bikkr', constants: JSON.stringify(Events), urlRoom: req.params.room });
});

router.get('/qr/:room', function (req, res) {
  res.render('qr', { title: 'Room QR Code', constants: JSON.stringify(Events), layout: false, roomID: req.params.room });
});

module.exports = router;
