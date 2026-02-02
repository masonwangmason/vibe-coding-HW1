#!/usr/bin/env python3
"""
CLI Email Validation Tool
Usage: python email_validator.py <email_address>
"""

import re
import sys


def validate_email(email):
    """
    Validates an email address according to RFC 5322 standards with practical constraints.
    
    Args:
        email (str): The email address to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not email or not isinstance(email, str):
        return False, "Email cannot be empty"
    
    email = email.strip()
    
    # Check overall length (RFC 5321: max 254 characters)
    if len(email) > 254:
        return False, "Email exceeds maximum length of 254 characters"
    
    # Check for exactly one @ symbol
    if email.count('@') != 1:
        return False, "Email must contain exactly one @ symbol"
    
    # Split into local and domain parts
    try:
        local, domain = email.rsplit('@', 1)
    except ValueError:
        return False, "Invalid email format"
    
    # Validate local part (before @)
    if not local or len(local) > 64:
        return False, "Local part must be 1-64 characters"
    
    # Local part pattern: allows alphanumeric, dots, plus signs, hyphens, underscores
    # Must not start or end with a dot, no consecutive dots
    local_pattern = r'^[a-zA-Z0-9]+([._+-][a-zA-Z0-9]+)*$'
    if not re.match(local_pattern, local):
        return False, "Local part contains invalid characters or format"
    
    # Check for consecutive dots
    if '..' in local:
        return False, "Local part cannot contain consecutive dots"
    
    # Validate domain part (after @)
    if not domain or len(domain) < 3:
        return False, "Domain part is too short"
    
    # Domain can contain subdomains
    # Pattern: alphanumeric and hyphens, separated by dots
    # Must end with valid TLD (2+ characters)
    domain_pattern = r'^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
    if not re.match(domain_pattern, domain):
        return False, "Domain contains invalid characters or format"
    
    # Check each domain label length (max 63 characters per label)
    labels = domain.split('.')
    for label in labels:
        if len(label) > 63:
            return False, "Domain label exceeds 63 characters"
        if label.startswith('-') or label.endswith('-'):
            return False, "Domain labels cannot start or end with hyphen"
    
    # Check TLD is at least 2 characters
    tld = labels[-1]
    if len(tld) < 2:
        return False, "Top-level domain must be at least 2 characters"
    
    return True, "Valid email address"


def main():
    """Main CLI interface for email validation."""
    if len(sys.argv) != 2:
        print("Usage: python email_validator.py <email_address>")
        print("Example: python email_validator.py user@example.com")
        sys.exit(1)
    
    email = sys.argv[1]
    is_valid, message = validate_email(email)
    
    status = "✓ VALID" if is_valid else "✗ INVALID"
    print(f"{status}: {email}")
    print(f"Reason: {message}")
    
    sys.exit(0 if is_valid else 1)


if __name__ == "__main__":
    main()
