const PROXY_CONFIG = [
  {
    context: ['/api/**'],
    target: 'http://localhost:8080',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    onProxyReq: function(proxyReq, req, res) {
      console.log('Proxying request to:', proxyReq.path);
      console.log('Target:', 'http://localhost:8080');
    },
    onError: function(err, req, res) {
      console.log('Proxy error:', err);
    }
  }
];

module.exports = PROXY_CONFIG;
