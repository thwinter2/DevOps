const fs = require('fs');
const path = require('path');
const Random = require('random-js');
const chalk = require('chalk');
const mutateStr = require('./mutate').mutateString;

class mutater {
    static random() {
        return mutater._random || fuzzer.seed(0)
    }
    
    static seed (kernel) {
        mutater._random = new Random.Random(Random.MersenneTwister19937.seed(kernel));
        return mutater._random;
    }

    static str( str )
    {
        return mutateStr(this, str);        
    }

};

let args = process.argv.slice(2);
const iterations = args[0];

mutater.seed(0);

for (var i = 1; i <= iterations; i++) {
    console.log(`Iteration ${i}`)
}