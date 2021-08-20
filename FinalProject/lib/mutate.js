function mutateString (mutator, val) 
{
    // We want to update up to 10% of the lines in the file, so determine how many lines that would be
    // and then randomly select a number between 1 and that number of lines. This is how many lines we'll modify.
    var maxLinesToModify = Math.round( 0.10 * val.split('\n').length );
    var numLinesToModify = mutator.random().integer(1, maxLinesToModify);

    var linesModified = 0;
    var equalsInFile = true;
    var zeroesInFile = true;
    var stringsInFile = true;
    var lessThanInFile = true;
    var logicalAndInFile = true;
    var returnStatementInFile = true;
    while ((linesModified < numLinesToModify) && 
    (equalsInFile || zeroesInFile || stringsInFile || lessThanInFile || logicalAndInFile || returnStatementInFile)) {
        // Swap "==" with "!="
        if (mutator.random().bool(0.2) && linesModified < numLinesToModify) {
            if (val.indexOf('==') !== -1) {
                //console.log('Replacing == with !=')
                val = val.replace('==', '!=');
                linesModified++;
            } else {
                //if (equalsInFile) console.log('== does not exist in the file')
                equalsInFile = false;
            }
        }

        // Swap 0 with 1
        if (mutator.random().bool(0.2) && linesModified < numLinesToModify) {
            if (val.indexOf('0') !== -1) {
                //console.log('Replacing 0 with 1')
                val = val.replace('0', '1');
                linesModified++;
            } else {
                //if (zeroesInFile) console.log('0 does not exist in the file')
                zeroesInFile = false;
            }
        }

        // Change content of strings in code
        if (mutator.random().bool(0.2) && linesModified < numLinesToModify) {
            // To avoid just replacing the same string multiple times, we match any string
            // not equal to fuzz and then replace the string with "fuzz," allowing us to
            // avoid replacing it again in future iterations.
            if (/"\b(?!fuzz\b)\w+"/.test(val)) {
                //console.log('Changing content of a string')
                val = val.replace(/"\b(?!fuzz\b)\w+"/, `"fuzz"`);
                linesModified++;
            } else {
                //if (stringsInFile) console.log('There are no strings in the file')
                stringsInFile = false;
            }
        }

        // Swap < with >
        if (mutator.random().bool(0.2) && linesModified < numLinesToModify) {
            // Match only when the character is preceded and followed by whitespace, which
            // makes it less likely that we'll replace this character when it's being used with generics.
            if (/\s+<\s+/.test(val)) {
                //console.log('Swapping < with >')
                val = val.replace(/\s+<\s+/, '>');
                linesModified++;
            } else {
                //if (lessThanInFile) console.log('< does not exist in the file')
                lessThanInFile = false;
            }
        }

        // Swap && with ||
        if (mutator.random().bool(0.2) && linesModified < numLinesToModify) {
            if (val.indexOf('&&') != -1) {
                //console.log('Swapping && with ||')
                val = val.replace('&&', '||');
                linesModified++;
            } else {
                //if (logicalAndInFile) console.log('&& does not exist in the file')
                logicalAndInFile = false;
            }
        }

        // Replace "return someValue;" or "return object.method();" with "return null;"
        if (mutator.random().bool(0.2) && linesModified < numLinesToModify) {
            if (/return\s+\b(?!null\b)[\w\.\(\)<>,\s]+;/.test(val)) {
                var match = /return\s+\b(?!null\b)[\w\.\(\)<>,\s]+;/.exec(val);
                var matchedString = match[0];
                //console.log(`Replacing '${matchedString}' with 'return null;'`);
                val = val.replace(matchedString, 'return null;');
                linesModified++;
            } else {
                //if (returnStatementInFile) console.log('There are no non-null return statements in the file')
                returnStatementInFile = false;
            }
        }
    }
    if (linesModified === 0) {
        return undefined; // If we couldn't actually modify anything, return undefined to indicate that.
    } else {
        return val;
    }
}

exports.mutateString = mutateString;
