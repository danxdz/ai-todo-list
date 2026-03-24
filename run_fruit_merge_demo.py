#!/usr/bin/env python3
"""
Serve fruit-merge-3d-demo.html over HTTP (avoids file:// CORS / import map issues).

Usage:
  python run_fruit_merge_demo.py
  python run_fruit_merge_demo.py --port 8765 --no-browser
"""

from __future__ import annotations

import argparse
import contextlib
import os
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="HTTP server for the 3D fruit merge demo.")
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Bind address (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8765,
        help="Port (default: 8765)",
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

    demo = root / "fruit-merge-3d-demo.html"
    if not demo.is_file():
        print(f"Missing {demo.name} under {root}", file=sys.stderr)
        return 1

    os.chdir(root)

    class Handler(SimpleHTTPRequestHandler):
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

    url = f"http://{args.host}:{args.port}/fruit-merge-3d-demo.html?v=6"
    print(f"Serving {root}")
    print(f"Open: {url}")
    print("Press Ctrl+C to stop.")

    if not args.no_browser:
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
