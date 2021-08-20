
const routes = require('express').Router();

// Add your route here...

routes.get('/test', (req, res) => {
    
    res.send('hi');
});

routes.get('/dayofweek', (req, res) => {
    let day = new Date().getDay();
    res.send(day.toString());
});

module.exports = routes;
