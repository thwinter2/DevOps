require('yargs')
  .usage('$0 <cmd> [args]')
  .command('area [type]', "calc area", (yargs) => 
  {
    yargs.positional('type', {
      type: 'string',
      default: 'rect',
      choices: ['rect','circle'],
      describe: 'The type of shape to calculate area.'
    })
    .option("w", {
      describe: "The width of the area.",
      type: "number"
    })
    .option("h", {
      describe: "The height of the area.",
      type: "number"
    })
    .option("r", {
      describe: "The radius of the circle.",
      type: "number"
    })
    .option("v", {
      describe: "Print out all arguments received.",
      type: "boolean"
    })
  }, function (argv) { calc(argv) } )
  .help()
  .argv

function calc(argv) {
  // Unpack into variables
  let {w,h,r,v,type} = argv;

  if( type == "rect") {
    console.log( `Area: ${w * h}`);
  }

  else if( type == "circle") {
    console.log( `Area: ${Math.PI * Math.pow(r,2)}`);
  }

  if(v){
    console.log(JSON.parse(JSON.stringify(argv)));
  }
}
