from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow all origins for testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', '*')
        self.send_header('Access-Control-Allow-Headers', '*')

        # Aggressive no-cache headers for ALL responses
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, private')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Surrogate-Control', 'no-store')
        self.send_header('Clear-Site-Data', '"cache"')

        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Force revalidation for all GET requests
        self.protocol_version = 'HTTP/1.1'
        super().do_GET()

# Create the HTTP server
server_address = ('0.0.0.0', 8443)  # Listen on all interfaces
httpd = HTTPServer(server_address, CORSRequestHandler)

# Create SSL context
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('./ssl/certificate.crt', './ssl/private.key')

# Wrap the socket with SSL
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print('Starting HTTPS server on port 8443...')
print('Note: You will need to accept the self-signed certificate in your browser')
print('Server allows all CORS origins (*) - FOR TESTING ONLY')
httpd.serve_forever()
