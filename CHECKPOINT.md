# Checkpoint

## Automatically configure a build environment and build job for iTrust (thwinter)

## Implement a test suite analysis for detecting useful tests (anmcgill)

I've completed the Test Suite Analysis and Fuzzing workshops in preparation for working on this part of the project. 

Based on the code provided in the Fuzzing workshop, we've begun to put together an initial implementation of an automated code fuzzer. In addition to the required mutations, we've selected these two additional mutations:

1. Replace instances of && with ||
2. Remove any instances of ! when the operator is used to negate a condition. For example, '!someVar' would be replaced with 'someVar'.

We've created an initial implementation of the useful-tests command. The command clones the iTrust repo with the given credentials and launches a driver.js script on the VM. The driver.js script currently just recursively reads from the cloned iTrust repo to generate a list of Java files and calls the mutation function on random files for the given number of iterations. The mutated file content is currently just being printed to the console to help with testing, but we aren't running anything through Maven yet.

The mutation function currently determines the number of lines that would constitute 10% of the source file, randomly selects a number of lines between one and that 10% threshold, and then attempts to apply mutations until we've modified enough lines to reach our randomly-selected number of lines or run out of mutations to apply. It then returns the modified string.

The remaining work is to clean up the mutation function logic and address any errors in it, re-evalute the driver code (is executing a script via Node on the VM the right way to go about this?), and implement logic to handle the test analysis part of this task, which will include running the tests via Maven, handling mutations that would prevent compilation, and resetting test cases between runs.

Once all of that is done, we'll need to run the analysis for 1,000 iterations and document our results.

## Implement a static analysis for checkbox.io (sawalter)
