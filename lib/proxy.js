const http = require('http');
const httpProxy = require('http-proxy');

const BLUE  = `http://192.168.44.25:3000`;
const GREEN = `http://192.168.44.30:3000`;

class Production
{
    constructor()
    {
        this.TARGET = BLUE;
        // After 60 seconds, switch to the green deployment.
        setTimeout( function() { this.TARGET = GREEN }.bind(this), 60000);
    }

    async proxy()
    {
        let options = {};
        let proxy = httpProxy.createProxyServer(options);
        let self = this;
        // Redirect requests to the active TARGET (BLUE or GREEN)
        let server  = http.createServer(function(req, res)
        {
            // callback for redirecting requests.
            proxy.web( req, res, {target: self.TARGET } );
        });
        server.listen(3090);
   }
}

let prod = new Production();
prod.proxy();
