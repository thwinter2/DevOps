const child = require('child_process');

result = child.spawnSync(`siege`, [`-b`, `-t60s`, `--content-type`, `"application/json"`, `'http://localhost:3090/preview`, `POST`, `</bakerx/survey.json'`], {shell:true, stdio: 'inherit'});
if( result.error ) { console.log(result.error); process.exit( result.status ); }