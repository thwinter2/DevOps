const esprima = require("esprima");
const options = {tokens:true, tolerant: true, loc: true, range: true };
const fs = require("fs");
const chalk = require('chalk');

var failBuild = false;

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
	}

	if (failBuild) {
		process.exitCode = 1;
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
		// File level calculations
		// 1. Strings
		if( node.type == "Literal" && typeof node.value == "string" )
		{
			fileBuilder.Strings++;
		}

		// 2. Packages
		if( node.type == "CallExpression" && node.callee.type == "Identifier" && node.callee.name == "require")
		{
			fileBuilder.ImportCount++;			
		}

		if (node.type === 'FunctionDeclaration') 
		{
			var builder = new FunctionBuilder();

			builder.FunctionName = functionName(node);
			builder.StartLine    = node.loc.start.line;
			// Calculate function level properties.
			// 3. Parameters
			builder.ParameterCount = node.params.length;
			// 4. Method Length
			builder.Length = node.loc.end.line - node.loc.start.line;

			if (builder.Length > 100) {
				failBuild = true;
				console.log (
					chalk`{red.underline In File: ${fileBuilder.FileName}, Method: ${builder.FunctionName}}
*** Long method detected! Method length of ${builder.Length} exceeds maximum length of 100 lines! ***
	`);
			}

			// With new visitor(s)...
			// 5. CyclomaticComplexity
			traverseWithParents(node, function (child) 
			{
				if( child.type == "IfStatement" )
				{
					builder.SimpleCyclomaticComplexity++;				
				}
			});

			// 6. Halstead




			// 7. Message Chains
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


			// 7. Maximum Nesting Depth
			//  MaxNestingDepth: The max depth of scopes (nested ifs, loops, etc).
			//  Note: The suggested strategy is to:
			// 	Visit nodes until reaching a leaf node: childrenLength(node) == 0.
			// 	Tranverse up the tree from the leaf using node.parent.
			// 	Count the number of parents that are decision nodes.
			// 	Stop when reaching the top of FunctionDeclaration.
			// 	Keep the max depth.
			traverseWithParents(node.body, function (child) 
			{
				var nestCount = 0;
				if( childrenLength(child) == 0  )
				{

					traverseWithParents(child.parent, function (parent) 
					{
						if (isDecision(parent)) {
							nestCount++;
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
		this.ParameterCount  = 0;
		// The number of lines.
		this.Length = 0;
		// Number of if statements/loops + 1
		this.SimpleCyclomaticComplexity = 1;
		// Number of unique symbols + operators
		this.Halstead = 0;
		// The max depth of scopes (nested ifs, loops, etc)
		this.MaxNestingDepth    = 0;
		// The max length of message chains. Ex: a.thing would be 1.
		this.MaxMessageChain    = 0;
		// The max number of conditions if one decision statement.
		this.MaxConditions      = 0;
	}

	threshold() {

        const thresholds = {
            SimpleCyclomaticComplexity: [{t: 10, color: 'red'}, {t: 4, color: 'yellow'}],
            Halstead: [{t: 10, color: 'red'}, {t: 3, color: 'yellow'}],
            ParameterCount: [{t: 10, color: 'red'}, {t: 3, color: 'yellow'}],
            Length: [{t: 100, color: 'red'}, {t: 10, color: 'yellow'} ]
        }

        const showScore = (id, value) => {
            let scores = thresholds[id];
            const lowestThreshold = {t: 0, color: 'green'};
            const score = scores.sort( (a,b) => {a.t - b.t}).find(score => score.t <= value) || lowestThreshold;
            return score.color;
        };

        this.Halstead = chalk`{${showScore('Halstead', this.Halstead)} ${this.Halstead}}`;
        this.Length = chalk`{${showScore('Length', this.Length)} ${this.Length}}`;
        this.ParameterCount = chalk`{${showScore('ParameterCount', this.ParameterCount)} ${this.ParameterCount}}`;
        this.SimpleCyclomaticComplexity = chalk`{${showScore('SimpleCyclomaticComplexity', this.SimpleCyclomaticComplexity)} ${this.SimpleCyclomaticComplexity}}`;

	}

	report()
	{
		this.threshold();

		console.log(
chalk`{blue.underline ${this.FunctionName}}(): at line #${this.StartLine}
Parameters: ${this.ParameterCount}\tLength: ${this.Length}
Cyclomatic: ${this.SimpleCyclomaticComplexity}\tHalstead: ${this.Halstead}
MaxDepth: ${this.MaxNestingDepth}\tMaxConditions: ${this.MaxConditions}
MaxMessageChain: ${this.MaxMessageChain}\tMaxConditions: ${this.MaxConditions}\n`
);
	}
};

// A builder for storing file level information.
function FileBuilder()
{
	this.FileName = "";
	// Number of strings in a file.
	this.Strings = 0;
	// Number of imports in a file.
	this.ImportCount = 0;

	this.report = function()
	{
		console.log (
			chalk`{magenta.underline ${this.FileName}}
Packages: ${this.ImportCount}
Strings ${this.Strings}
`);

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
