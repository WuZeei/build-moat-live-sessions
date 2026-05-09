from urllib.parse import quote, urlparse

MAX_URL_LENGTH = 2048

BLOCKED_DOMAINS = {
    "evil.com",
    "malware.example.com",
    "phishing.example.com",
}


def is_blocked_domain(hostname: str | None) -> bool:
    if hostname is None:
        return True
    return hostname.lower() in BLOCKED_DOMAINS


def _force_https_scheme(url: str) -> str:
    """Upgrade http→https; if no scheme present, prepend https://."""
    if url.startswith("https://"):
        return url
    if url.startswith("http://"):
        return "https://" + url[len("http://") :]
    return "https://" + url


def validate_url(url: str) -> str:
    """Format check, normalization, and blocklist validation.

    Design decision: normalization keeps the same destination URL mapping to
    the same token (no duplicates); blocklist validation prevents short links
    from becoming phishing vectors. Scheme is forced to https — http inputs
    are upgraded and missing-scheme inputs default to https://.
    """
    if not url or not url.strip():
        raise ValueError("URL must not be empty")

    # 1. Force https scheme (covers http upgrade and missing-scheme cases)
    url = _force_https_scheme(url.strip())

    # 2. Parse and ensure URL has a hostname (rejects "https://" alone, "https:///path", etc.)
    parsed = urlparse(url)
    if not parsed.hostname or "." not in parsed.hostname:
        raise ValueError("URL must have a valid hostname")

    # 3. Blocklist validation
    if is_blocked_domain(parsed.hostname):
        raise ValueError("URL is blocked")

    # 4. Length validation
    if len(url) > MAX_URL_LENGTH:
        raise ValueError(f"URL length must not exceed {MAX_URL_LENGTH}")

    # 5. Normalize: percent-encode non-ASCII, lowercase, strip trailing slash
    normalized = quote(url, safe=":/?#[]@!$&'()*+,;=%~")
    normalized = normalized.lower()
    if normalized.endswith("/"):
        normalized = normalized.rstrip("/")

    return normalized
