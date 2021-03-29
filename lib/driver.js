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

const traverseDirs = function(dir, filePaths = []) {

    fs.readdirSync(dir).forEach((file) => {

        const filePath = path.resolve(dir, file);

        // If file is a directory, traverse it as well
        if (fs.statSync(filePath).isDirectory()) {
            return traverseDirs(filePath, filePaths);
        }

        // Add to result if file is not a directory
        filePaths.push(filePath);
    });
    return filePaths;
};

let seeds = traverseDirs('/home/vagrant/iTrust2-v8/iTrust2/src/main/java/edu/ncsu/csc/iTrust2');

for (var i = 1; i <= iterations; i++) {
    // Toggle between seed files
    let idx = ((i % seeds.length) + seeds.length) % seeds.length;

    // apply random mutation to seed input
    let s = seeds[ idx ];
    console.log(`Mutating file: ${s}`);
    let mutatedString = mutater.str(fs.readFileSync(s, 'utf-8'));
    console.log(`Mutated file:\n${mutatedString}`)
}