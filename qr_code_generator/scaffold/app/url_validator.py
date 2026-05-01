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


def validate_url(url: str) -> str:
    """Format check, normalization, and blocklist validation.

    Design decision: normalization keeps the same destination URL mapping to
    the same token (no duplicates); blocklist validation prevents short links
    from becoming phishing vectors.
    """
    parsed = urlparse(url)

    # 1. Blocklist validation
    if is_blocked_domain(parsed.hostname):
        raise ValueError("URL is blocked")

    # 2. Length validation
    if len(url) > MAX_URL_LENGTH:
        raise ValueError(f"URL length must not exceed {MAX_URL_LENGTH}")

    # 3. Scheme validation: must start with http:// or https://
    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must start with http:// or https://")

    # 4. Normalize: percent-encode non-ASCII, lowercase, upgrade http→https, strip trailing slash
    normalized = quote(url, safe=":/?#[]@!$&'()*+,;=%~")
    normalized = normalized.lower()
    if normalized.startswith("http://"):
        normalized = "https://" + normalized[len("http://") :]
    if normalized.endswith("/"):
        normalized = normalized.rstrip("/")

    return normalized
