"""General pages, the application shell, and diagnostics."""

from datetime import datetime

from flask import Blueprint, flash, jsonify, redirect, render_template, request, session, url_for

from config.database import DB_NAME, is_connected

main_bp = Blueprint("main", __name__)


# ---------------------------------------------------------------------------
# Shared template data
# ---------------------------------------------------------------------------

NAV_ITEMS = [
    {"id": "dashboard", "label": "Dashboard", "endpoint": "main.dashboard", "icon": "grid"},
    {"id": "transactions", "label": "Transactions", "endpoint": "main.transactions", "icon": "swap"},
    {"id": "cash", "label": "Cash Management", "endpoint": "main.cash", "icon": "wallet"},
    {"id": "banks", "label": "Bank Accounts", "endpoint": "main.banks", "icon": "bank"},
    {"id": "budgets", "label": "Budgets", "endpoint": "main.budgets", "icon": "pie"},
    {"id": "reports", "label": "Reports & Analytics", "endpoint": "main.reports", "icon": "chart"},
    {"id": "goals", "label": "Savings Goals", "endpoint": "main.goals", "icon": "target"},
    {"id": "recurring", "label": "Recurring Payments", "endpoint": "main.recurring", "icon": "repeat"},
    {"id": "insights", "label": "Smart Insights", "endpoint": "main.insights", "icon": "sparkles"},
    {"id": "settings", "label": "Settings", "endpoint": "main.settings", "icon": "settings"},
    {"id": "profile", "label": "Profile", "endpoint": "main.profile", "icon": "user"},
]

SAMPLE = {
    "user": {
        "name": "Aarav Sharma",
        "email": "aarav.sharma@example.com",
        "initials": "AS",
        "member_since": "March 2024",
    },
    "summary": {
        "balance": 252050.0,
        "physical_cash": 12480.0,
        "online_balance": 239570.0,
        "income": 132500.0,
        "expenses": 58940.0,
        "saved": 73560.0,
        "income_change": 12.4,
        "expense_change": -6.8,
        "saved_change": 18.2,
    },
    "transactions": [
        {"id": 1, "date": "18 Nov 2026", "date_iso": "2026-11-18", "name": "Swiggy", "description": "Dinner order", "category": "Food & Dining", "type": "expense", "amount": 842.0, "method": "UPI", "mode": "Online", "account": "HDFC Bank ••4821", "notes": "Team dinner", "status": "Completed", "icon": "utensils", "uncategorized": False},
        {"id": 2, "date": "17 Nov 2026", "date_iso": "2026-11-17", "name": "Salary Credit", "description": "Monthly salary", "category": "Income", "type": "income", "amount": 125000.0, "method": "NEFT", "mode": "Online", "account": "HDFC Bank ••4821", "notes": "November payroll", "status": "Completed", "icon": "briefcase", "uncategorized": False},
        {"id": 3, "date": "16 Nov 2026", "date_iso": "2026-11-16", "name": "Ravi Kumar", "description": "Shared trip expenses", "category": "Transfer", "type": "expense", "amount": 2500.0, "method": "UPI", "mode": "Online", "account": "HDFC Bank ••4821", "notes": "", "status": "Completed", "icon": "send", "uncategorized": False},
        {"id": 4, "date": "15 Nov 2026", "date_iso": "2026-11-15", "name": "Amazon India", "description": "Home essentials", "category": "Shopping", "type": "expense", "amount": 4299.0, "method": "Card", "mode": "Online", "account": "ICICI Bank ••9073", "notes": "", "status": "Completed", "icon": "bag", "uncategorized": False},
        {"id": 5, "date": "14 Nov 2026", "date_iso": "2026-11-14", "name": "Electricity Bill", "description": "November bill", "category": "Utilities", "type": "expense", "amount": 2140.0, "method": "AutoPay", "mode": "Online", "account": "ICICI Bank ••9073", "notes": "", "status": "Completed", "icon": "bolt", "uncategorized": False},
        {"id": 6, "date": "12 Nov 2026", "date_iso": "2026-11-12", "name": "Interest Credit", "description": "Savings interest", "category": "Savings", "type": "income", "amount": 1280.0, "method": "Bank", "mode": "Online", "account": "SBI ••1129", "notes": "", "status": "Completed", "icon": "trend", "uncategorized": False},
        {"id": 7, "date": "10 Nov 2026", "date_iso": "2026-11-10", "name": "Netflix", "description": "Monthly plan", "category": "Subscriptions", "type": "expense", "amount": 649.0, "method": "AutoPay", "mode": "Online", "account": "ICICI Bank ••9073", "notes": "", "status": "Completed", "icon": "play", "uncategorized": False},
        {"id": 8, "date": "08 Nov 2026", "date_iso": "2026-11-08", "name": "Petrol Pump", "description": "Fuel", "category": "Transport", "type": "expense", "amount": 3200.0, "method": "Card", "mode": "Online", "account": "HDFC Bank ••4821", "notes": "", "status": "Completed", "icon": "car", "uncategorized": False},
        {"id": 9, "date": "06 Nov 2026", "date_iso": "2026-11-06", "name": "Local Tea Stall", "description": "Cash purchase", "category": "", "type": "expense", "amount": 180.0, "method": "Cash", "mode": "Cash", "account": "Cash in hand", "notes": "Needs a category", "status": "Completed", "icon": "wallet", "uncategorized": True},
        {"id": 10, "date": "03 Nov 2026", "date_iso": "2026-11-03", "name": "Freelance Payment", "description": "Design work", "category": "Income", "type": "income", "amount": 18500.0, "method": "UPI", "mode": "Online", "account": "ICICI Bank ••9073", "notes": "Client: studio north", "status": "Completed", "icon": "briefcase", "uncategorized": False},
    ],
    "transaction_categories": [
        "Food & Dining", "Shopping", "Transport", "Utilities", "Entertainment",
        "Subscriptions", "Health", "Housing", "Transfer", "Savings", "Income", "Other",
    ],
    "transaction_methods": ["UPI", "Card", "Net Banking", "AutoPay", "NEFT", "Cash", "Bank"],
    "transaction_accounts": ["HDFC Bank ••4821", "ICICI Bank ••9073", "SBI ••1129", "UPI Lite", "Cash in hand"],
    "accounts": [
        {"name": "HDFC Bank", "type": "Savings Account", "number": "•••• 4821", "balance": 124850.0, "color": "emerald", "icon": "bank", "primary": True},
        {"name": "ICICI Bank", "type": "Current Account", "number": "•••• 9073", "balance": 68420.0, "color": "blue", "icon": "bank", "primary": False},
        {"name": "State Bank of India", "type": "Savings Account", "number": "•••• 1129", "balance": 42300.0, "color": "violet", "icon": "bank", "primary": False},
        {"name": "UPI Lite", "type": "Digital Wallet", "number": "aarav@upi", "balance": 5000.0, "color": "amber", "icon": "wallet", "primary": False},
    ],
    "cash": {
        "in_hand": 12480.0,
        "opening_balance": 11760.0,
        "actual_balance": 11800.0,
        "last_counted": "16 Nov 2026",
        "categories": [
            "Bank withdrawal", "Cash income", "Refund", "Groceries", "Food & Dining",
            "Transport", "Shopping", "Bills & Utilities", "Transfer to bank", "Other",
        ],
        "denominations": [
            {"note": "₹2,000", "count": 4, "value": 8000.0},
            {"note": "₹500", "count": 6, "value": 3000.0},
            {"note": "₹100", "count": 12, "value": 1200.0},
            {"note": "₹50", "count": 4, "value": 200.0},
            {"note": "₹20", "count": 4, "value": 80.0},
        ],
        "activity": [
            {"id": 1, "date": "16 Nov 2026", "date_iso": "2026-11-16", "description": "Cash withdrawal — HDFC ATM", "category": "Bank withdrawal", "type": "in", "amount": 5000.0, "notes": ""},
            {"id": 2, "date": "12 Nov 2026", "date_iso": "2026-11-12", "description": "Groceries — local store", "category": "Groceries", "type": "out", "amount": 1280.0, "notes": "Weekly vegetables"},
            {"id": 3, "date": "05 Nov 2026", "date_iso": "2026-11-05", "description": "Cash deposited to HDFC", "category": "Transfer to bank", "type": "out", "amount": 3000.0, "notes": ""},
        ],
    },
    "budgets": [
        {"category": "Food & Dining", "spent": 8420.0, "limit": 12000.0, "icon": "utensils", "color": "emerald"},
        {"category": "Shopping", "spent": 6750.0, "limit": 10000.0, "icon": "bag", "color": "blue"},
        {"category": "Transport", "spent": 3200.0, "limit": 5000.0, "icon": "car", "color": "violet"},
        {"category": "Utilities", "spent": 4180.0, "limit": 6000.0, "icon": "bolt", "color": "amber"},
        {"category": "Entertainment", "spent": 2490.0, "limit": 3000.0, "icon": "play", "color": "rose"},
    ],
    "goals": [
        {"name": "Emergency Fund", "saved": 180000.0, "target": 200000.0, "deadline": "Mar 2027", "icon": "shield", "color": "emerald"},
        {"name": "Japan Trip", "saved": 65000.0, "target": 150000.0, "deadline": "Dec 2027", "icon": "plane", "color": "blue"},
        {"name": "New Laptop", "saved": 38000.0, "target": 80000.0, "deadline": "Aug 2027", "icon": "laptop", "color": "violet"},
    ],
    "recurring": [
        {"name": "Monthly Rent", "category": "Housing", "amount": 18000.0, "due": "01 Dec 2026", "auto": True, "icon": "home"},
        {"name": "Netflix", "category": "Entertainment", "amount": 649.0, "due": "18 Nov 2026", "auto": True, "icon": "play"},
        {"name": "Electricity Bill", "category": "Utilities", "amount": 2400.0, "due": "05 Dec 2026", "auto": False, "icon": "bolt"},
        {"name": "Mutual Fund SIP", "category": "Investments", "amount": 10000.0, "due": "10 Dec 2026", "auto": True, "icon": "trend"},
        {"name": "Gym Membership", "category": "Health", "amount": 1500.0, "due": "02 Dec 2026", "auto": False, "icon": "heart"},
    ],
    "insights": [
        {"tone": "positive", "icon": "trend", "title": "You spent 18% less on dining", "text": "Your food spending dropped from ₹10,270 to ₹8,420 this month. Small choices are adding up."},
        {"tone": "positive", "icon": "target", "title": "Savings rate improved to 28%", "text": "You saved ₹73,560 this month — ₹11,200 more than last month."},
        {"tone": "warning", "icon": "alert", "title": "Shopping is close to its budget", "text": "You have used 68% of your shopping budget with 9 days left in the month."},
        {"tone": "info", "icon": "repeat", "title": "3 payments due in the next 10 days", "text": "Rent, electricity and your SIP are coming up. Keep ₹31,900 ready."},
    ],
}


def _group_indian(digits: str) -> str:
    if len(digits) <= 3:
        return digits
    last_three = digits[-3:]
    rest = digits[:-3]
    groups = []
    while rest:
        groups.append(rest[-2:])
        rest = rest[:-2]
    return ",".join(reversed(groups)) + "," + last_three


@main_bp.app_template_filter("inr")
def inr(value) -> str:
    """Format an amount with Indian digit grouping, e.g. ₹2,48,560.00."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return value
    sign = "-" if number < 0 else ""
    whole, fraction = f"{abs(number):.2f}".split(".")
    return f"{sign}₹{_group_indian(whole)}.{fraction}"


@main_bp.app_template_filter("percent")
def percent(part, whole) -> int:
    """Return a rounded percentage, guarding against a zero denominator."""
    try:
        return round(float(part) / float(whole) * 100) if whole else 0
    except (TypeError, ValueError, ZeroDivisionError):
        return 0


@main_bp.context_processor
def inject_shell_context():
    return {
        "nav_items": NAV_ITEMS,
        "sample": SAMPLE,
        "current_date": datetime.now().strftime("%A, %d %B %Y"),
    }


@main_bp.before_request
def require_login_for_app_pages():
    public_endpoints = {"main.index", "main.terms", "main.health", "main.db_test"}
    if request.endpoint not in public_endpoints and not session.get("user_id"):
        flash("Please sign in or create an account to view your dashboard.", "error")
        return redirect(url_for("auth.login", next=request.path))


def render_page(template: str, page_id: str, title: str, **context):
    return render_template(template, page_id=page_id, page_title=title, **context)


# ---------------------------------------------------------------------------
# Marketing / health routes
# ---------------------------------------------------------------------------


@main_bp.route("/")
def index():
    """Render the Rupeevo welcome page."""
    return render_template("index.html")


@main_bp.route("/terms")
def terms():
    """Render the terms referenced by the registration form."""
    return render_template("terms.html")


@main_bp.route("/health")
def health():
    """Simple liveness check that does not touch the database."""
    return jsonify({"status": "ok"})


@main_bp.route("/db-test")
def db_test():
    """Report whether the rupeevo database can be reached."""
    if not is_connected():
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Unable to connect to the database.",
                }
            ),
            503,
        )

    return jsonify(
        {
            "status": "success",
            "message": "Connected to the database successfully.",
            "database": DB_NAME,
        }
    )


# ---------------------------------------------------------------------------
# Application screens
# ---------------------------------------------------------------------------


@main_bp.route("/dashboard")
def dashboard():
    return render_page("dashboard.html", "dashboard", "Dashboard")


@main_bp.route("/transactions")
def transactions():
    return render_page("transactions.html", "transactions", "Transactions")


@main_bp.route("/cash")
def cash():
    return render_page("cash.html", "cash", "Cash Management")


@main_bp.route("/banks")
def banks():
    return render_page("banks.html", "banks", "Bank Accounts")


@main_bp.route("/budgets")
def budgets():
    return render_page("budgets.html", "budgets", "Budgets")


@main_bp.route("/reports")
def reports():
    return render_page("reports.html", "reports", "Reports & Analytics")


@main_bp.route("/goals")
def goals():
    return render_page("goals.html", "goals", "Savings Goals")


@main_bp.route("/recurring")
def recurring():
    return render_page("recurring.html", "recurring", "Recurring Payments")


@main_bp.route("/insights")
def insights():
    return render_page("insights.html", "insights", "Smart Insights")


@main_bp.route("/settings")
def settings():
    return render_page("settings.html", "settings", "Settings")


@main_bp.route("/profile")
def profile():
    return render_page("profile.html", "profile", "Profile")
