const fs = require('fs');
const path = require('path');
const Random = require('random-js');
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
        console.log(`\nMutating file: ${s}`);
        originalContent = fs.readFileSync(s, 'utf-8');
        mutatedString = mutater.str(originalContent);
        if (mutatedString === undefined) console.log(`The file could not be modified given the selected mutations. Selecting another file...`);
    }
    //console.log(`Mutated file:\n${mutatedString}`)
    fs.writeFileSync(s, mutatedString);

    return {filePath: s, originalContent: originalContent}
}

function getTestReports(testdir) {

    let testReportBase = `${testdir}/target/surefire-reports/`;
    const files = fs.readdirSync(testReportBase);
 
    const filenames = files.filter((file) => {
      return file.includes('.xml');
    });

    filenames.forEach(function(part, index) {
        filenames[index] = testReportBase + part;
    });
    return filenames;
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
        name:   `${testcase['$'].classname}.${testcase['$'].name}`, 
        status: testcase.hasOwnProperty('failure') || testcase.hasOwnProperty('error') ? "failed": "passed"
        });
    }    
    return tests;
}

( async () => {
    var mutationsCaught = 0;
    var finalResults = {};
    for (var i = 1; i <= iterations; i++) {
        var mutatedFileCompiles = false;
        var mutationCaught = false;
        var filePath;
        var originalContent;
    
        // Continue to select and mutate files until we get one that compiles cleanly.
        while (!mutatedFileCompiles) {
            var result = selectAndMutateFile();
            filePath = result.filePath;
            originalContent = result.originalContent;
            console.log(`Checking that mutated file compiles correctly...`);
            try {
                child_process.execSync('mvn compile 2>/dev/null', { cwd: testsuite_dir });
                mutatedFileCompiles = true;
            } catch(error) {
                console.log(`Mutated file failed to compile. Resetting original file state and selecting another file...`);
                //console.log(fs.readFileSync(filePath, 'utf-8'));
                fs.writeFileSync(filePath, originalContent);
            }
        }

        if ( !fs.existsSync('mutations') ) {
            fs.mkdirSync('mutations');
        }
        let iterationDirPath = path.join('mutations', `${i}`);
        if ( !fs.existsSync(iterationDirPath) ) {
            fs.mkdirSync(iterationDirPath);
        }
        let mutationFilePath = path.join('mutations', `${i}`, path.basename(filePath));
        fs.writeFileSync(mutationFilePath, fs.readFileSync(filePath, 'utf-8'));
    
        // Run tests and record results
        console.log(`Running tests...`);
        try {
            child_process.execSync('mvn clean test 2>/dev/null', { cwd: testsuite_dir });
        } catch(error) {
            // Just ignore errors - they can occur when tests fail due to mutations.
            //console.log('An error occurred when running the tests...');
        }
        let testReports = getTestReports(testsuite_dir);
        for (const testReport of testReports) {
            let tests = await getTestResults(testReport);
            for (let test of tests) {
                if (!(test.name in finalResults)) {
                    finalResults[test.name] = { failures: 0, mutations: []};
                }
                if (test.status === 'failed') {
                    mutationCaught = true;
                    finalResults[test.name].failures++;
                    finalResults[test.name].mutations.push(mutationFilePath);
                }
            }
        }
        if (mutationCaught) {
            mutationsCaught++;
        }
    
        // Restore original file content
        fs.writeFileSync(filePath, originalContent);
    
        // Drop database
        try {
            child_process.execSync(`mysql -u root -p${process.env.MYSQL_PASSWORD} -e "DROP DATABASE IF EXISTS iTrust2_test" 2>/dev/null`);
        } catch(error) {
            // If we can't drop the database, we want to exit here. The database being present across iterations could introduce errors that
            // would impact our analysis. 
            console.log(`An error occurred when trying to drop the database! Exiting with an error...`); process.exit(error.status);
        }
    }

    // Generate and print report
    var mutationCoverage = (mutationsCaught/iterations) * 100;
    
    var items = Object.keys(finalResults).map(function(key) {
        return [key, finalResults[key]];
    });
    items.sort((a,b) => b[1].failures - a[1].failures);

    sortedResults = {};
    for (let item of items) {
        sortedResults[item[0]] = item[1];
    }
    
    console.log(`\nOverall mutation coverage: ${mutationsCaught}/${iterations} (${mutationCoverage}%) mutations caught by the test suite.`)
    console.log(`\nUseful tests\n============\n`)
    Object.keys(sortedResults).forEach(function(test) {
        console.log(`${sortedResults[test].failures}/${iterations} ${test}`);
        for (let mutationFile of sortedResults[test].mutations) {
            console.log(`    - ${mutationFile}`);
        }
    });
})();
