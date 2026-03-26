#!/usr/bin/env python3
"""
Serve the project over HTTP (avoids file:// CORS / import map issues).
"/" redirects to index.html (mode picker: marbles vs periodic stack).

Local:
  python run_fruit_merge_demo.py
  python run_fruit_merge_demo.py --port 8765 --no-browser

Render / cloud:
  Set PORT (Render does this automatically). The server binds 0.0.0.0 and uses PORT.
  Start command: python run_fruit_merge_demo.py
"""

from __future__ import annotations

import argparse
import contextlib
import os
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def _default_host_port() -> tuple[str, int]:
    """Render and similar platforms inject PORT; must listen on all interfaces."""
    if os.environ.get("PORT"):
        return "0.0.0.0", int(os.environ["PORT"])
    return "127.0.0.1", 8765


def main() -> int:
    default_host, default_port = _default_host_port()

    parser = argparse.ArgumentParser(description="HTTP server for stack games (menu at index.html).")
    parser.add_argument(
        "--host",
        default=default_host,
        help=f"Bind address (default: {default_host}; 0.0.0.0 when PORT env is set)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=default_port,
        help=f"Port (default: {default_port}; from PORT env on Render)",
    )
    parser.add_argument(
        "--directory",
        type=Path,
        default=None,
        help="Directory to serve (default: directory containing this script)",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Do not open a browser tab",
    )
    args = parser.parse_args()

    root = (args.directory or Path(__file__).resolve().parent).resolve()
    if not root.is_dir():
        print(f"Not a directory: {root}", file=sys.stderr)
        return 1

    index = root / "index.html"
    if not index.is_file():
        print(f"Missing {index.name} under {root}", file=sys.stderr)
        return 1

    os.chdir(root)

    class Handler(SimpleHTTPRequestHandler):
        def do_GET(self) -> None:
            root = self.path.split("?", 1)[0]
            if root == "/":
                self.send_response(302)
                self.send_header("Location", "/index.html")
                self.end_headers()
                return
            super().do_GET()

        def end_headers(self) -> None:
            # Avoid stale demo when iterating locally (browser aggressive caching)
            if self.path.endswith(".html"):
                self.send_header("Cache-Control", "no-store, max-age=0")
                self.send_header("Pragma", "no-cache")
            super().end_headers()

        def log_message(self, fmt: str, *log_args: object) -> None:
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % log_args))

    # Threading avoids blocking the main thread if we open the browser after serve_forever
    # (we actually open before serve_forever, but threading is still nicer for multiple tabs)
    httpd = ThreadingHTTPServer((args.host, args.port), Handler)

    print(f"Serving {root}")
    print(f"Listening on http://{args.host}:{args.port}/")
    if args.host == "0.0.0.0":
        print("Deploy: open your Render service URL ( / redirects to the demo HTML ).")
    else:
        print(f"Demo: http://{args.host}:{args.port}/fruit-merge-3d-demo.html")
    print("Press Ctrl+C to stop.")

    if not args.no_browser and args.host not in ("0.0.0.0", "::"):
        url = f"http://127.0.0.1:{args.port}/"
        with contextlib.suppress(OSError):
            webbrowser.open(url)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
    finally:
        httpd.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
