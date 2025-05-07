# routes/helpers.py

import datetime as dt
import secrets
import string


def new_report_id(prefix: str) -> str:
    """
    Generate an 8-char report_id: 2-char prefix + 6 random uppercase letters/digits.
    """
    alphabet = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"{prefix}{suffix}"


def first_day(d: dt.date) -> dt.date:
    """
    Return the first day of the month for the given date.
    """
    return d.replace(day=1)


def last_day(d: dt.date) -> dt.date:
    """
    Return the last day of the month for the given date.
    """
    # move to the 1st of next month, then step back one day
    next_month = d.replace(day=28) + dt.timedelta(days=4)
    return next_month.replace(day=1) - dt.timedelta(days=1)


def month_label(d: dt.date) -> str:
    """
    Turn a date into a YYYY-MM label. E.g. date(2025,4,1) → "2025-04".
    Adjust strftime if you prefer "Apr 2025" or "04-2025".
    """
    return d.strftime("%Y-%m")


def last_completed_month() -> dt.date:
    """
    Return the first day of the most recently fully completed month.
    E.g. if today is May 8, 2025 → returns date(2025,4,1).
    """
    today = dt.date.today()
    first_of_this_month = today.replace(day=1)
    last_month_end = first_of_this_month - dt.timedelta(days=1)
    return last_month_end.replace(day=1)
