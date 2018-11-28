var express = require('express');
var router = express.Router();
const Events = require('../bin/event_types');

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('teacher_main', { title: 'Teacher - Main', constants: JSON.stringify(Events) });
});

module.exports = router;
