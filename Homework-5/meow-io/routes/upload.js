const multer = require('multer');
const fs = require('fs');

const db = require('../data/db');
const redis = require('redis');
const client = redis.createClient(6379, '127.0.0.1', {});

var express = require('express');
var router = express.Router();

/* GET users listing. */
const upload = multer({ dest: './uploads/' })

router.post('/', upload.single('image'), function (req, res) {
  console.log(req.body) // form fields
  console.log(req.file) // form files

  if (req.file.fieldname === 'image') {
    fs.readFile(req.file.path, async function (err, data) {
      if (err) throw err;
        var img = new Buffer.from(data).toString('base64');
        client.rpush("pic_queue", img);
        client.lpush("cat_pic", img);
        client.ltrim("cat_pic", 0 , 4);
//      await db.cat(img);
      res.send('Ok');

    });
  }
});

module.exports = router;