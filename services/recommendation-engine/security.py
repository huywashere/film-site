import secrets


MIN_ADMIN_TOKEN_LENGTH = 32


def admin_token_is_configured(expected: str) -> bool:
    return len(expected) >= MIN_ADMIN_TOKEN_LENGTH


def admin_token_matches(received: str | None, expected: str) -> bool:
    return (
        received is not None
        and admin_token_is_configured(expected)
        and secrets.compare_digest(received, expected)
    )
