
const routes = require('express').Router();
const { v4: uuidv4 } = require('uuid');

// REDIS
const redis = require('redis');
let client = redis.createClient(6379, '192.168.44.81', {});
  
// Task 1 ===========================================
routes.post("/tape", (req, res) => {
    var key = uuidv4();
    client.set(key, req.body.message, (err, status) => {
        let reply = {};
        reply.success = status == "OK";
        reply.link = `http://localhost:3003/read/${key}`;
        res.json(reply);
    });
});

// Task 2 ============================================
routes.get("/read/:id", (req, res) => {
    client.get(req.params.id, (err, value) => {
        client.ttl(req.params.id, (err, ttl) => {
            if(ttl == -1) {
                client.expire(req.params.id, 10);
                ttl = 10;
            }
            
            let reply = {};
            reply.message = value;
            reply.ttl = `This message will self-destruct in ${ttl} seconds`;
            res.json(reply);
        });
    });
});

module.exports = routes;
