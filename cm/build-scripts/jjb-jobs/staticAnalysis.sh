#!/bin/bash

FAILS=0

shopt -s globstar
for filename in ./server-side/**/*.js;
do
    if [[ "$filename" == *"node_modules"* ]]
        then
            continue
    fi

    node /bakerx/lib/analysis.js "${filename}"
    if [ $(echo $?) != 0 ] ; then
        let FAILS+=1;
    fi
    
done

exit $FAILS

