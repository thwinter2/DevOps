const esprima = require("esprima");
const options = {tokens:true, tolerant: true, loc: true, range: true };
const fs = require("fs");
const chalk = require('chalk');
const { exit } = require("process");

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		// default value is self if no other script is provided.
		args = ['analysis.js'];
	}
	var filePath = args[0];

	console.log( "Parsing ast and running static analysis...");
	var builders = {};
	complexity(filePath, builders);
	console.log( "Complete.");


	// Report
	for( var node in builders )
	{
		var builder = builders[node];
		builder.report();

		if (builder.MaxMessageChain > 10) {
			console.log (
				chalk`{red.underline In File: ${filePath}, Method: ${builder.FunctionName}}
*** Long message chain detected! Longest chain length of ${builder.MaxMessageChain} exceeds maximum length of 10 chains! ***
`);
		}

		if (builder.MaxNestingDepth > 5) {
			console.log (
				chalk`{red.underline In File: ${filePath}, Method: ${builder.FunctionName}}
*** Long nesting depth detected! Depth of ${builder.MaxNestingDepth} exceeds maximum depth of 5! ***
`);
		}

	}

}



function complexity(filePath, builders)
{
	var buf = fs.readFileSync(filePath, "utf8");
	var ast = esprima.parse(buf, options);

	var i = 0;

	// Initialize builder for file-level information
	var fileBuilder = new FileBuilder();
	fileBuilder.FileName = filePath;
	builders[filePath] = fileBuilder;

	// Traverse program with a function visitor.
	traverseWithParents(ast, function (node) 
	{

		if (node.type === 'FunctionDeclaration') 
		{
			var builder = new FunctionBuilder();

			builder.FunctionName = functionName(node);
			builder.StartLine    = node.loc.start.line;
			// Calculate function level properties.

			// 1. Method Length
			builder.Length = node.loc.end.line - node.loc.start.line;

			if (builder.Length > 100) {
				failBuild = true;
				console.log (
					chalk`{red.underline In File: ${fileBuilder.FileName}, Method: ${builder.FunctionName}}
*** Long method detected! Method length of ${builder.Length} exceeds maximum length of 100 lines! ***
	`);
			}

			// With new visitor(s)...

			// 2. Message Chains
			// Per https://discordapp.com/channels/776118414694940743/776801301823488001/825926703548596266 a.field represents a chain length of 1.
			traverseWithParents(node.body, function (child) 
			{
				var parentCount = 0;
				
				if( child.type == "Identifier"  )
				{
					traverseWithParents(child.parent, function (parent) 
					{
						if (parent.type == "Identifier") {
							parentCount++;
						}
					});


					if (parentCount > builder.MaxMessageChain) {
						builder.MaxMessageChain = parentCount - 1;

					}					
				}
			});


			// 3. Maximum Nesting Depth
			//  MaxNestingDepth: The max depth of scopes (nested ifs, loops, etc).
			//  Note: The suggested strategy is to:
			// 	Visit nodes until reaching a leaf node: childrenLength(node) == 0.
			// 	Tranverse up the tree from the leaf using node.parent.
			// 	Count the number of parents that are decision nodes.
			// 	Stop when reaching the top of FunctionDeclaration.
			// 	Keep the max depth.
			traverseWithParents(node.body, function (child) 
			{
								
				if ( childrenLength(child) == 0  )
				{
					var nestCount = 0;

					traverseWithParents(child.parent, function (parent) 
					{
						if (isDecision(parent)) {
							nestCount++;
							//console.log(parent.loc.start.line);
							//console.log(nestCount);
						}

					});

					if (nestCount > builder.MaxNestingDepth) {
						builder.MaxNestingDepth = nestCount;
					}	
				}
			});

			builders[builder.FunctionName] = builder;
		}

	});

}

// Represent a reusable "class" following the Builder pattern.
class FunctionBuilder
{
	constructor() {
		this.StartLine = 0;
		this.FunctionName = "";
		// The number of parameters for functions
		this.Length = 0;
		// The max depth of scopes (nested ifs, loops, etc)
		this.MaxNestingDepth    = 0;
		// The max length of message chains. Ex: a.thing would be 1.
		this.MaxMessageChain    = 0;
	}

	threshold() {

        const thresholds = {
            MaxNestingDepth: [{t: 5, color: 'red'}, {t: 3, color: 'yellow'}],
            MaxMessageChain: [{t: 10, color: 'red'}, {t: 3, color: 'yellow'}],
            Length: [{t: 100, color: 'red'}, {t: 10, color: 'yellow'} ]
        }

        const showScore = (id, value) => {
            let scores = thresholds[id];
            const lowestThreshold = {t: 0, color: 'green'};
            const score = scores.sort( (a,b) => {a.t - b.t}).find(score => score.t <= value) || lowestThreshold;
            return score.color;
        };

        this.Length = chalk`{${showScore('Length', this.Length)} ${this.Length}}`;
        this.MaxMessageChain = chalk`{${showScore('MaxMessageChain', this.MaxMessageChain)} ${this.MaxMessageChain}}`;
        this.MaxNestingDepth = chalk`{${showScore('MaxNestingDepth', this.MaxNestingDepth)} ${this.MaxNestingDepth}}`;

	}

	report()
	{
		this.threshold();

		console.log(
chalk`{blue.underline ${this.FunctionName}}(): at line #${this.StartLine}
Length: ${this.Length}
MaxDepth: ${this.MaxNestingDepth}
MaxMessageChain: ${this.MaxMessageChain}\n`
);
	}
};

// A builder for storing file level information.
function FileBuilder()
{
	this.FileName = "";

	this.report = function()
	{
// 		console.log (
// 			chalk`{magenta.underline ${this.FileName}}
// Packages: ${this.ImportCount}
// Strings ${this.Strings}
// `);

	}
}

// A function following the Visitor pattern.
// Annotates nodes with parent objects.
function traverseWithParents(object, visitor)
{
    var key, child;

    visitor.call(null, object);

    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null && key != 'parent') 
            {
            	child.parent = object;
					traverseWithParents(child, visitor);
            }
        }
    }
}

// Helper function for counting children of node.
function childrenLength(node)
{
	var key, child;
	var count = 0;
	for (key in node) 
	{
		if (node.hasOwnProperty(key)) 
		{
			child = node[key];
			if (typeof child === 'object' && child !== null && key != 'parent') 
			{
				count++;
			}
		}
	}	
	return count;
}

// Helper function for checking if a node is a "decision type node"
function isDecision(node)
{
	if( node.type == 'IfStatement' || node.type == 'ForStatement' || node.type == 'WhileStatement' ||
		 node.type == 'ForInStatement' || node.type == 'DoWhileStatement')
	{
		return true;
	}
	return false;
}

// Helper function for printing out function name.
function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "anon function @" + node.loc.start.line;
}

main();
exports.main = main;
