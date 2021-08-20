
function mutateString (mutator, val) {

    if(mutator.random().bool(0.50))
    {
        // Step 3. Replace single quotes strings with integers
        val = val.replace(/'\w+'/g, mutator.random().integer(0,25));
    }

    var array = val.split('');
    //array.reverse(); //all fails

    do {
        if( mutator.random().bool(0.25) )
        {
            // Step 1. Randomly remove a random set of characters, from a random start position.
            array.splice(mutator.random().integer(0,25), mutator.random().integer(0,25));
        }
        if( mutator.random().bool(0.25) )
        {
            // Step 2. Randomly add a set of characters.
            array.splice(mutator.random().integer(0,25), 0, mutator.random().string(10));
        }
    } while(mutator.random().bool(0.25))

    return array.join('');
}

exports.mutateString = mutateString;
