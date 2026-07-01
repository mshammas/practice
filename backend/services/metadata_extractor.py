"""Fetch a URL and use Claude to extract song metadata from its content."""
import ipaddress
import json
import os
import socket
from typing import Any
from urllib.parse import urlparse

import anthropic
import httpx
from bs4 import BeautifulSoup

MAX_RESPONSE_BYTES = 2 * 1024 * 1024  # 2 MB
MAX_REDIRECTS = 5


def _validate_url(url: str) -> None:
    """Reject anything that isn't a plain http(s) URL pointing at a public host.

    Blocks SSRF via internal/loopback/link-local addresses (e.g. cloud metadata
    endpoints) since this URL is fully user-supplied and fetched server-side.
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Unsupported URL scheme: {parsed.scheme!r}")
    if not parsed.hostname:
        raise ValueError("URL is missing a hostname")

    try:
        infos = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror as exc:
        raise ValueError(f"Could not resolve host: {parsed.hostname}") from exc

    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ValueError(f"URL resolves to a disallowed address: {ip}")


async def fetch_page_text(url: str) -> str:
    _validate_url(url)
    headers = {"User-Agent": "Mozilla/5.0 (compatible; SongPractice/1.0)"}

    current_url = url
    async with httpx.AsyncClient(timeout=15) as client:
        for _ in range(MAX_REDIRECTS + 1):
            request = client.build_request("GET", current_url, headers=headers)
            response = await client.send(request, stream=True, follow_redirects=False)
            try:
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        raise ValueError("Redirect response with no Location header")
                    current_url = str(httpx.URL(current_url).join(location))
                    # Re-validate on every hop — the redirect target could point internal
                    # even if the original URL didn't.
                    _validate_url(current_url)
                    continue

                response.raise_for_status()
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > MAX_RESPONSE_BYTES:
                        raise ValueError("Response exceeded max size (2 MB)")
                html = body.decode(response.charset_encoding or "utf-8", errors="replace")
                break
            finally:
                await response.aclose()
        else:
            raise ValueError("Too many redirects")

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    return soup.get_text(separator=" ", strip=True)[:8000]


def extract_with_claude(text: str, url: str) -> dict[str, Any]:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": (
                "Extract song/music metadata from the webpage content below.\n"
                "Return ONLY a JSON object with these keys (null for unknown):\n"
                "title, artist, composer, lyricist, album, year (integer), language, tags (comma-separated genres/styles)\n\n"
                f"URL: {url}\n\nContent:\n{text}"
            ),
        }],
    )
    raw = msg.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


async def extract_metadata(url: str) -> dict[str, Any]:
    text = await fetch_page_text(url)
    return extract_with_claude(text, url)
