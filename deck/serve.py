#!/usr/bin/env python3
"""Tiny static file server for the Hermes build, with a shutdown hook.

Serves the front-end build and exposes POST/GET /__exit__ which the app's
in-UI "Quit" button calls. On exit it signals the whole launcher process
group (this server + the browser) so the kiosk closes cleanly — handy on a
Steam Deck where a fullscreen browser would otherwise be hard to escape.

Env:
  PORT       port to bind (default 4173)
  SERVE_DIR  directory to serve (default ./dist)
"""
import os
import signal
import threading
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = int(os.environ.get("PORT", "4173"))
SERVE_DIR = os.environ.get("SERVE_DIR", "dist")


class Handler(SimpleHTTPRequestHandler):
    def _is_exit(self) -> bool:
        return self.path.split("?", 1)[0] == "/__exit__"

    def _do_exit(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(b"bye")

        # Let the response flush, then terminate the launcher's process group
        # (browser + this server). Fall back to exiting just ourselves.
        def shutdown() -> None:
            try:
                os.killpg(os.getpgrp(), signal.SIGTERM)
            except Exception:
                os._exit(0)

        threading.Timer(0.3, shutdown).start()

    def do_GET(self) -> None:  # noqa: N802
        if self._is_exit():
            return self._do_exit()
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        if self._is_exit():
            return self._do_exit()
        self.send_response(404)
        self.end_headers()

    def log_message(self, *_args) -> None:
        pass  # keep the console quiet


if __name__ == "__main__":
    httpd = HTTPServer(("127.0.0.1", PORT), partial(Handler, directory=SERVE_DIR))
    print(f"Serving {SERVE_DIR} on http://127.0.0.1:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
