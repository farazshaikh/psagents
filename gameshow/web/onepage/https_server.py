from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:3000')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
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
server_address = ('', 8443)  # Using 8443 to avoid needing sudo
httpd = HTTPServer(server_address, CORSRequestHandler)

# Create SSL context
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('./ssl/certificate.crt', './ssl/private.key')

# Wrap the socket with SSL
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print('Starting HTTPS server on port 8443...')
print('Note: You will need to accept the self-signed certificate in your browser')
print('Access the site at: https://localhost:8443')
httpd.serve_forever()
