import unittest

from security import admin_token_is_configured, admin_token_matches


class RecommendationAdminSecurityTests(unittest.TestCase):
    def test_retrain_is_disabled_without_a_strong_secret(self):
        self.assertFalse(admin_token_is_configured(""))
        self.assertFalse(admin_token_is_configured("short-secret"))

    def test_retrain_rejects_an_invalid_secret(self):
        self.assertFalse(admin_token_matches(None, "a" * 48))
        self.assertFalse(admin_token_matches("b" * 48, "a" * 48))

    def test_retrain_accepts_the_configured_secret(self):
        token = "a" * 48
        self.assertTrue(admin_token_matches(token, token))


if __name__ == "__main__":
    unittest.main()
