from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl

# Create the HTTP server
server_address = ('', 8443)  # Using 8443 to avoid needing sudo
httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)

# Create SSL context
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain('./ssl/certificate.crt', './ssl/private.key')

# Wrap the socket with SSL
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print('Starting HTTPS server on port 8443...')
print('Note: You will need to accept the self-signed certificate in your browser')
print('Access the site at: https://localhost:8443')
httpd.serve_forever() 