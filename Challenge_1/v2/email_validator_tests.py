#!/usr/bin/env python3
"""
Test Suite for Email Validator
Usage: python test_email_validator.py
"""

import unittest
from email_validator_cli import validate_email


class TestEmailValidation(unittest.TestCase):
    """Comprehensive test cases for email validation."""
    
    def test_valid_simple_emails(self):
        """Test simple valid email addresses."""
        valid_emails = [
            "user@example.com",
            "test@domain.co.uk",
            "admin@subdomain.example.com",
            "john.doe@company.org",
            "a@b.co",
        ]
        for email in valid_emails:
            with self.subTest(email=email):
                is_valid, _ = validate_email(email)
                self.assertTrue(is_valid, f"{email} should be valid")
    
    def test_valid_plus_addressing(self):
        """Test plus addressing (email aliases)."""
        valid_emails = [
            "user+tag@example.com",
            "name+filter@domain.org",
            "admin+test+multiple@site.com",
        ]
        for email in valid_emails:
            with self.subTest(email=email):
                is_valid, _ = validate_email(email)
                self.assertTrue(is_valid, f"{email} should be valid")
    
    def test_valid_special_characters(self):
        """Test valid special characters in local part."""
        valid_emails = [
            "user_name@example.com",
            "first-last@domain.com",
            "user.name@example.com",
            "user_name-123@test.org",
        ]
        for email in valid_emails:
            with self.subTest(email=email):
                is_valid, _ = validate_email(email)
                self.assertTrue(is_valid, f"{email} should be valid")
    
    def test_valid_subdomains(self):
        """Test emails with multiple subdomains."""
        valid_emails = [
            "user@mail.company.com",
            "admin@deep.sub.domain.example.org",
            "test@a.b.c.d.com",
        ]
        for email in valid_emails:
            with self.subTest(email=email):
                is_valid, _ = validate_email(email)
                self.assertTrue(is_valid, f"{email} should be valid")
    
    def test_invalid_missing_parts(self):
        """Test emails missing required parts."""
        invalid_emails = [
            "",
            "@example.com",
            "user@",
            "userexample.com",
            "@",
        ]
        for email in invalid_emails:
            with self.subTest(email=email):
                is_valid, _ = validate_email(email)
                self.assertFalse(is_valid, f"{email} should be invalid")
    
    def test_invalid_multiple_at_symbols(self):
        """Test emails with multiple @ symbols."""
        invalid_emails = [
            "user@@example.com",
            "user@domain@example.com",
            "@@example.com",
        ]
        for email in invalid_emails:
            with self.subTest(email=email):
                is_valid, _ = validate_email(email)
                self.assertFalse(is_valid, f"{email} should be invalid")
    
    def test_invalid_local_part(self):
        """Test invalid local part formats."""
        invalid_emails = [
            ".user@example.com",  # starts with dot
            "user.@example.com",  # ends with dot
            "user..name@example.com",  # consecutive dots
            "user@name@example.com",  # @ in local part
            "user name@example.com",  # space
            "user#name@example.com",  # invalid character
        ]
        for email in invalid_emails:
            with self.subTest(email=email):
                is_valid, _ = validate_email(email)
                self.assertFalse(is_valid, f"{email} should be invalid")
    
    def test_invalid_domain_part(self):
        """Test invalid domain formats."""
        invalid_emails = [
            "user@.example.com",  # starts with dot
            "user@example.com.",  # ends with dot
            "user@example..com",  # consecutive dots
            "user@example",  # no TLD
            "user@.com",  # missing domain
            "user@domain-.com",  # hyphen at end
            "user@-domain.com",  # hyphen at start
        ]
        for email in invalid_emails:
            with self.subTest(email=email):
                is_valid, _ = validate_email(email)
                self.assertFalse(is_valid, f"{email} should be invalid")
    
    def test_invalid_tld(self):
        """Test invalid top-level domains."""
        invalid_emails = [
            "user@example.c",  # TLD too short
            "user@example.123",  # numeric TLD
        ]
        for email in invalid_emails:
            with self.subTest(email=email):
                is_valid, _ = validate_email(email)
                self.assertFalse(is_valid, f"{email} should be invalid")
    
    def test_length_constraints(self):
        """Test email length constraints."""
        # Local part too long (>64 chars)
        long_local = "a" * 65 + "@example.com"
        is_valid, msg = validate_email(long_local)
        self.assertFalse(is_valid)
        self.assertIn("Local part", msg)
        
        # Total length too long (>254 chars)
        long_email = "user@" + "a" * 250 + ".com"
        is_valid, msg = validate_email(long_email)
        self.assertFalse(is_valid)
        
        # Domain label too long (>63 chars)
        long_label = "user@" + "a" * 64 + ".com"
        is_valid, msg = validate_email(long_label)
        self.assertFalse(is_valid)
    
    def test_edge_cases(self):
        """Test edge cases and boundary conditions."""
        # Minimum valid email
        is_valid, _ = validate_email("a@b.co")
        self.assertTrue(is_valid)
        
        # Numbers in domain
        is_valid, _ = validate_email("user@domain123.com")
        self.assertTrue(is_valid)
        
        # Numbers in local part
        is_valid, _ = validate_email("user123@domain.com")
        self.assertTrue(is_valid)
        
        # None input
        is_valid, _ = validate_email(None)
        self.assertFalse(is_valid)
        
        # Whitespace handling
        is_valid, _ = validate_email("  user@example.com  ")
        self.assertTrue(is_valid)
    
    def test_real_world_examples(self):
        """Test real-world email patterns."""
        valid_emails = [
            "support@github.com",
            "noreply@google.com",
            "hello+spam@stripe.com",
            "admin@mail.company.co.uk",
            "user_123@test-domain.org",
        ]
        for email in valid_emails:
            with self.subTest(email=email):
                is_valid, _ = validate_email(email)
                self.assertTrue(is_valid, f"{email} should be valid")


def run_tests():
    """Run all tests and display results."""
    print("=" * 70)
    print("EMAIL VALIDATOR TEST SUITE")
    print("=" * 70)
    print()
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestEmailValidation)
    
    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print()
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
