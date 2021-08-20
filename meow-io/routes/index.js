var express = require('express');
var router = express.Router();

const db = require('../data/db');
const redis = require('redis');
//let client = redis.createClient(6379, '127.0.0.1',{});
/* GET home page. */
router.get('/', async function(req, res, next) {

  let client = redis.createClient(6379, '127.0.0.1', {});
  client.get("FRONT_PAGE_FACTS", async function(err, cached_facts){
         //let facts = cached_facts || (await db.votes()).slice(0,100);
         if(cached_facts){
                 facts = JSON.parse(cached_facts);
         }
         else{
                 const facts = (await db.votes()).slice(0, 100);
                 client.set("FRONT_PAGE_FACTS", JSON.stringify(facts));
                 client.expire("FRONT_PAGE_FACTS", 10);
         }
         res.render('index',
        { recentFlag: getFlag('ON'),
         title: 'meow.io',
         recentUploads: await db.recentCats(5),
         bestFacts: facts
         });
         client.quit();
  });
});

function getFlag(value)
{
  // force undefined flags to be OFF.
  if( value == undefined)
    return false;
  if( value == 'ON' )
    return true;
  if( value == 'OFF')
    return false;
  // any other value is automatically off.
  return false;
}

module.exports = router;
