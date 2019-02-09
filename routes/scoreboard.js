var express = require('express');
var router = express.Router();
const Events = require('../bin/event_types');

/* GET users listing. */
router.get('/', function(req, res) {
    res.render('scoreboard', { title: 'Scoreboard', constants: JSON.stringify(Events) });
});

module.exports = router;
