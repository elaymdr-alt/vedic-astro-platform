"""Subscription logic for AstroBinesh."""
from backend.models import User

def get_report_limit(user: User) -> int:
    """Returns daily report generation limit based on subscription status."""
    if user.subscription_status == "lifetime":
        return 50
    if user.subscription_status == "pro":
        return 10
    return 2  # Free tier

def can_generate_report(user: User, current_count: int) -> bool:
    """Checks if user has reached their daily limit."""
    return current_count < get_report_limit(user)
