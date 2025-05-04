from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
import ssl
import threading
import mimetypes
import os
import urllib.parse
import sys

# Force UTF-8 encoding for all text responses
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Ensure proper MIME types are registered
mimetypes.add_type('text/html', '.html')
mimetypes.add_type('video/mp4', '.mp4')
mimetypes.add_type('video/webm', '.webm')
mimetypes.add_type('video/ogg', '.ogg')
mimetypes.add_type('text/vtt', '.vtt')

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Force UTF-8 encoding
        self.encoding = 'utf-8'
        super().__init__(*args, **kwargs)

    def log_message(self, format, *args):
        """Override to provide more detailed logging."""
        sys.stderr.write(f"[DEBUG] {self.address_string()} - {format%args}\n")
        sys.stderr.write(f"[DEBUG] Path: {self.path}\n")
        sys.stderr.write(f"[DEBUG] Headers: {self.headers}\n")

    def send_response(self, code, message=None):
        """Override to log response codes."""
        super().send_response(code, message)
        sys.stderr.write(f"[DEBUG] Sending response: {code} {message or ''}\n")

    def send_header(self, keyword, value):
        """Override to log headers being sent."""
        super().send_header(keyword, value)
        sys.stderr.write(f"[DEBUG] Sending header: {keyword}: {value}\n")

    def do_GET(self):
        """Handle GET requests with strict path handling."""
        sys.stderr.write(f"\n[DEBUG] Handling GET request for path: {self.path}\n")
        sys.stderr.write(f"[DEBUG] User Agent: {self.headers.get('User-Agent')}\n")

        # Normalize the path
        path = self.translate_path(self.path)
        sys.stderr.write(f"[DEBUG] Translated path: {path}\n")

        # Special handling for root path
        if self.path == '/' or self.path == '':
            try:
                index_path = os.path.join(os.getcwd(), 'index.html')
                if os.path.exists(index_path):
                    sys.stderr.write(f"[DEBUG] Serving root index.html: {index_path}\n")
                    with open(index_path, 'rb') as f:
                        content = f.read()
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.send_header('Content-Length', str(len(content)))
                    self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                    self.send_header('X-Content-Type-Options', 'nosniff')
                    self.end_headers()
                    self.wfile.write(content)
                    return
            except Exception as e:
                sys.stderr.write(f"[ERROR] Error serving root index.html: {str(e)}\n")
                self.send_error(500, f"Internal server error: {str(e)}")
                return

        # Handle directory paths
        if os.path.isdir(path):
            if not self.path.endswith('/'):
                # Redirect to path with trailing slash
                new_path = self.path + '/'
                sys.stderr.write(f"[DEBUG] Redirecting to: {new_path}\n")
                self.send_response(301)
                new_url = f'https://{self.headers.get("Host", "")}{new_path}'
                self.send_header('Location', new_url)
                self.send_header('Content-Length', '0')
                self.end_headers()
                return

            # Try to serve index.html from directory
            index_path = os.path.join(path, 'index.html')
            if os.path.exists(index_path):
                sys.stderr.write(f"[DEBUG] Serving directory index.html: {index_path}\n")
                with open(index_path, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

            # Generate directory listing
            try:
                sys.stderr.write(f"[DEBUG] Generating directory listing for: {path}\n")
                listing = self.list_directory(path)
                if listing:
                    return
            except Exception as e:
                sys.stderr.write(f"[ERROR] Error generating directory listing: {str(e)}\n")
                self.send_error(500, f"Error listing directory: {str(e)}")
                return

        # Handle regular files
        try:
            # Check file existence
            if not os.path.exists(path):
                sys.stderr.write(f"[DEBUG] File not found: {path}\n")
                self.send_error(404, "File not found")
                return

            # Get content type
            ctype = self.guess_type(path)
            sys.stderr.write(f"[DEBUG] Content-Type for {path}: {ctype}\n")

            # Open and send the file
            with open(path, 'rb') as f:
                fs = os.fstat(f.fileno())
                content_length = fs[6]

                self.send_response(200)
                self.send_header('Content-Type', ctype)
                self.send_header('Content-Length', str(content_length))
                self.send_header('Last-Modified', self.date_time_string(fs.st_mtime))
                self.end_headers()

                # Send the file in chunks
                while True:
                    buf = f.read(64 * 1024)
                    if not buf:
                        break
                    self.wfile.write(buf)

        except Exception as e:
            sys.stderr.write(f"[ERROR] Error serving file {path}: {str(e)}\n")
            self.send_error(500, f"Error serving file: {str(e)}")

    def list_directory(self, path):
        """Generate a simple, mobile-friendly directory listing."""
        try:
            entries = os.listdir(path)
        except OSError as e:
            sys.stderr.write(f"[ERROR] Cannot list directory {path}: {str(e)}\n")
            self.send_error(404, "No permission to list directory")
            return None

        # Filter and sort entries
        entries = sorted(e for e in entries if not e.startswith('.'))

        # Send response headers
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()

        # Create directory listing HTML
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Directory: {urllib.parse.unquote(self.path)}</title>
            <style>
                body {{ font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 15px; }}
                a {{ display: block; padding: 10px; margin: 5px 0; text-decoration: none; color: #007AFF;
                     background: #f8f9fa; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <h2>Directory: {urllib.parse.unquote(self.path)}</h2>
        """

        # Add parent directory link
        if self.path != '/':
            parent = os.path.dirname(self.path.rstrip('/'))
            if not parent:
                parent = '/'
            html += f'<a href="{parent}">📁 ..</a>\n'

        # Add directory entries
        for entry in entries:
            entry_path = os.path.join(self.path, entry)
            display_name = entry
            if os.path.isdir(os.path.join(path, entry)):
                display_name = f"📁 {entry}/"
            else:
                display_name = f"📄 {entry}"
            html += f'<a href="{urllib.parse.quote(entry_path)}">{display_name}</a>\n'

        html += "</body></html>"
        self.wfile.write(html.encode(self.encoding))
        return True

    def end_headers(self):
        """Add security and CORS headers."""
        # Only allow specific origins in production
        if self.headers.get('Origin'):
            # For development, you can keep '*' but for production
            # you should list specific allowed origins
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Type')
            self.send_header('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges')

        # Security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        
        # Cache control based on file type
        if self.path.endswith(('.mp4', '.webm', '.ogg')):
            # Cache media files for 1 year
            self.send_header('Cache-Control', 'public, max-age=31536000')
        elif self.path.endswith(('.html', '.htm')):
            # No cache for HTML files
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        else:
            # Default cache policy
            self.send_header('Cache-Control', 'public, max-age=3600')
        
        super().end_headers()

def run_server(port=8443, bind="0.0.0.0"):
    server_address = (bind, port)
    httpd = ThreadedHTTPServer(server_address, CORSRequestHandler)

    # Set up SSL with strong security settings
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.maximum_version = ssl.TLSVersion.TLSv1_3
    context.set_ciphers('ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384')
    
    try:
        context.load_cert_chain('./ssl/certificate.crt', './ssl/private.key')
    except Exception as e:
        print(f"Error loading SSL certificates: {e}")
        print("Please ensure valid SSL certificates are present in the ./ssl directory")
        sys.exit(1)

    # Enable OCSP stapling
    context.verify_flags = ssl.VERIFY_X509_STRICT
    context.verify_mode = ssl.CERT_REQUIRED
    context.load_verify_locations('/etc/ssl/certs/ca-certificates.crt')
    context.options |= (
        ssl.OP_NO_SSLv2 | 
        ssl.OP_NO_SSLv3 | 
        ssl.OP_NO_TLSv1 | 
        ssl.OP_NO_TLSv1_1 |
        ssl.OP_NO_COMPRESSION |
        ssl.OP_CIPHER_SERVER_PREFERENCE |
        ssl.OP_SINGLE_DH_USE |
        ssl.OP_SINGLE_ECDH_USE
    )

    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

    print(f'Starting HTTPS server on {bind}:{port}...')
    print(f'Using TLS {context.maximum_version.name}')
    print('Note: Server is configured with production-grade security settings')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down server...')
        httpd.server_close()
    except Exception as e:
        print(f"\nServer error: {e}")
        httpd.server_close()
        sys.exit(1)

if __name__ == '__main__':
    run_server()
