"""Self-test of Web Push sending: a fake browser device + a mock push service, inside the backend container."""
import base64, json, os, threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import http_ece
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from app.core.config import settings
from app.services import webpush

print("vapid configured:", webpush.configured())

# --- a "device": its own key pair and auth secret, exactly what a browser's subscription holds ---
dev_key = ec.generate_private_key(ec.SECP256R1())
pub = dev_key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
auth = os.urandom(16)
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
seen = {}
status_to_return = [201]


class Mock(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("content-length", 0))
        seen["body"] = self.rfile.read(n)
        seen["headers"] = {k.lower(): v for k, v in self.headers.items()}
        self.send_response(status_to_return[0])
        self.end_headers()

    def log_message(self, *a):
        pass


srv = HTTPServer(("127.0.0.1", 9977), Mock)
threading.Thread(target=srv.serve_forever, daemon=True).start()
info = {"endpoint": "http://127.0.0.1:9977/push/abc", "keys": {"p256dh": b64(pub), "auth": b64(auth)}}

payload = {"title": "Amina", "body": "Habari! Uko tayari?", "url": "/chat?c=direct%3Aa_b", "tag": "direct:a_b"}
result = webpush._send_one(info, json.dumps(payload, ensure_ascii=False), "direct:a_b")
print("send result (None = accepted):", result)
h = seen["headers"]
print("Authorization starts with 'vapid':", h.get("authorization", "").lower().startswith("vapid"))
print("Content-Encoding:", h.get("content-encoding"), "| Urgency:", h.get("urgency"), "| TTL:", h.get("ttl"), "| Topic length:", len(h.get("topic", "")))
plain = http_ece.decrypt(seen["body"], private_key=dev_key, auth_secret=auth)
print("decrypted by the device:", json.loads(plain.decode()))

# --- a device that no longer exists: the push service answers 410, and we must recognise it ---
status_to_return[0] = 410
print("410 from the push service ->", webpush._send_one(info, json.dumps(payload), None))
status_to_return[0] = 500
print("500 from the push service ->", webpush._send_one(info, json.dumps(payload), None))

# --- which subscription addresses the server accepts (it calls them: an SSRF risk if too open) ---
for ep in [
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
    "https://web.push.apple.com/abc",
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://localhost/abc",
    "https://127.0.0.1/abc",
    "https://backend:8000/internal/push",
    "https://169.254.169.254/latest/meta-data",
    "https://evil.example.com/fcm.googleapis.com",
    "https://fcm.googleapis.com.evil.com/x",
]:
    print(("ACCEPT " if webpush.endpoint_ok(ep) else "reject ") + ep)
srv.shutdown()
