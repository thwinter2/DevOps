const fs = require('fs');
const path = require('path');
const Random = require('random-js');
const chalk = require('chalk');
const mutateStr = require('./mutate').mutateString;
const child_process = require('child_process');
const xml2js = require('xml2js');
const parser = new xml2js.Parser();
const Bluebird = require('bluebird');

const testsuite_dir = '/home/vagrant/iTrust2-v8/iTrust2/'

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

var seeds = traverseDirs('/home/vagrant/iTrust2-v8/iTrust2/src/main/java/edu/ncsu/csc/iTrust2');

function selectAndMutateFile() {
    var mutatedString;
    var s;
    var originalContent;

    while (mutatedString === undefined) {
        let idx = ((mutater.random().integer(1, seeds.length) % seeds.length) + seeds.length) % seeds.length;
        s = seeds[ idx ];
        console.log(`Mutating file: ${s}`);
        originalContent = fs.readFileSync(s, 'utf-8');
        //console.log(originalContent);
        mutatedString = mutater.str(originalContent);
        if (mutatedString === undefined) console.log(chalk.red(`The file could not be modified given the selected mutations. Selecting another file...`))
    }
    //console.log(`Mutated file:\n${mutatedString}`)
    fs.writeFileSync(s, mutatedString);

    return {filePath: s, originalContent: originalContent}
}

function getTestReport(testdir) {

    let testReportBase = `${testdir}/target/surefire-reports/`;
    const files = fs.readdirSync(testReportBase);
 
    const filename = files.find((file) => {
      // return the first xml file in directory
      return file.includes('.xml');
    });

    console.log( chalk.green(`Found test report ${filename}`) );
    return testReportBase + filename;
}

async function getTestResults(testReport) {
    var contents = fs.readFileSync(testReport)
    let xml2json = await Bluebird.fromCallback(cb => parser.parseString(contents, cb));
    let tests = readMavenXmlResults(xml2json);
    return tests;
}

function readMavenXmlResults(result) {
    var tests = [];
    for( var i = 0; i < result.testsuite['$'].tests; i++ ) {
        var testcase = result.testsuite.testcase[i];
        
        tests.push({
        name:   testcase['$'].name, 
        time:   testcase['$'].time, 
        status: testcase.hasOwnProperty('failure') ? "failed": "passed"
        });
    }    
    return tests;
}

( async () => {
    for (var i = 1; i <= iterations; i++) {
        var mutatedFileCompiles = false;
        var filePath;
        var originalContent;
    
        // Continue to select and mutate files until we get one that compiles cleanly.
        while (!mutatedFileCompiles) {
            var result = selectAndMutateFile();
            filePath = result.filePath;
            originalContent = result.originalContent;
            console.log(chalk.blueBright(`Checking that mutated file compiles correctly...`));
            try {
                child_process.execSync('mvn compile 2>/dev/null', { cwd: testsuite_dir });
                mutatedFileCompiles = true;
            } catch(error) {
                console.log(chalk.red(`Mutated file failed to compile. Resetting original file state and selecting another file...`));
                fs.writeFileSync(filePath, originalContent);
            }
        }
    
        // Run tests and record results
        console.log(chalk.blueBright(`Running tests...`));
        try {
            child_process.execSync('mvn clean test 2>/dev/null', { cwd: testsuite_dir });
        } catch(error) {
            console.log(error.stderr);
        }
        let testReport = getTestReport(testsuite_dir);
        let tests = await getTestResults(testReport);
    
        tests.forEach( e => console.log(e));
    
        // Restore original file content
        fs.writeFileSync(filePath, originalContent);
    
        // Drop database
        try {
            child_process.execSync(`mysql -u root -p${process.env.MYSQL_PASSWORD} -e "DROP DATABASE IF EXISTS iTrust2_test" 2>/dev/null`);
        } catch(error) {
            console.log(chalk.redBright(`An error occurred when trying to drop the database`))
        }
    }
})();
