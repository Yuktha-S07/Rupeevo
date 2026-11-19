"""Authentication routes: sign in, registration and password reset UI."""

import re

from email_validator import EmailNotValidError, validate_email as validate_email_address
from flask import Blueprint, flash, redirect, render_template, request, session, url_for
from flask_wtf import FlaskForm
from mysql.connector import Error as MySQLError
from werkzeug.security import check_password_hash, generate_password_hash
from wtforms import BooleanField, PasswordField, StringField, SubmitField
from wtforms.validators import DataRequired, EqualTo, Length, ValidationError

from config.database import get_connection
from services.user_service import create_user, email_exists

auth_bp = Blueprint("auth", __name__)


# ---------------------------------------------------------------------------
# Reusable validators
# ---------------------------------------------------------------------------


def validate_email_format(form, field):
    """Validate the address format and store its normalized form."""
    try:
        result = validate_email_address(field.data, check_deliverability=False)
    except EmailNotValidError as exc:
        raise ValidationError(str(exc)) from exc
    field.data = result.normalized


def validate_mobile_number(form, field):
    """Accept a 10-digit Indian mobile number, with an optional +91 prefix."""
    digits = re.sub(r"\D", "", field.data or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[-10:]

    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise ValidationError("Enter a valid 10-digit Indian mobile number.")

    field.data = digits


# ---------------------------------------------------------------------------
# Forms
# ---------------------------------------------------------------------------


class LoginForm(FlaskForm):
    identifier = StringField(
        "Email address or username",
        validators=[DataRequired(message="Enter your email or username."), Length(max=255)],
    )
    password = PasswordField(
        "Password",
        validators=[DataRequired(message="Enter your password.")],
    )
    remember = BooleanField("Remember me for 30 days")
    submit = SubmitField("Sign in")


class RegistrationForm(FlaskForm):
    """Server-side validated registration form (CSRF handled by Flask-WTF)."""

    full_name = StringField(
        "Full name",
        validators=[
            DataRequired(message="Enter your full name."),
            Length(min=2, max=100, message="Use between 2 and 100 characters."),
        ],
    )
    email = StringField(
        "Email address",
        validators=[DataRequired(message="Enter your email address."), Length(max=255), validate_email_format],
    )
    mobile = StringField(
        "Mobile number",
        validators=[DataRequired(message="Enter your mobile number."), validate_mobile_number],
    )
    password = PasswordField(
        "Password",
        validators=[
            DataRequired(message="Create a password."),
            Length(min=8, max=128, message="Use at least 8 characters."),
        ],
    )
    confirm_password = PasswordField(
        "Confirm password",
        validators=[
            DataRequired(message="Confirm your password."),
            EqualTo("password", message="Passwords do not match."),
        ],
    )
    terms = BooleanField(
        "I agree to the Terms and Conditions",
        validators=[DataRequired(message="Please accept the terms to continue.")],
    )
    submit = SubmitField("Create account")


class ForgotPasswordForm(FlaskForm):
    email = StringField(
        "Email address",
        validators=[DataRequired(message="Enter your email address."), Length(max=255), validate_email_format],
    )
    submit = SubmitField("Send reset link")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    """Sign a user in using their email (or full name) and password hash."""
    if session.get("user_id"):
        return redirect(url_for("main.dashboard"))

    form = LoginForm()
    if form.validate_on_submit():
        identifier = form.identifier.data.strip()
        connection = None
        cursor = None
        try:
            connection = get_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT id, full_name, password_hash FROM users "
                "WHERE email = %s OR full_name = %s LIMIT 1",
                (identifier, identifier),
            )
            user = cursor.fetchone()
        except MySQLError:
            flash("We couldn't sign you in right now. Please try again.", "error")
            return render_template("login.html", form=form)
        finally:
            if cursor is not None:
                cursor.close()
            if connection is not None:
                connection.close()

        if user and check_password_hash(user["password_hash"], form.password.data):
            session.clear()
            session["user_id"] = user["id"]
            session["user_name"] = user["full_name"]
            session.permanent = bool(form.remember.data)
            flash(f"Welcome back, {user['full_name'].split(' ')[0]}!", "success")
            next_url = request.args.get("next")
            if next_url and next_url.startswith("/"):
                return redirect(next_url)
            return redirect(url_for("main.dashboard"))

        # Keep the message generic so we never reveal which identifiers exist.
        flash("That email/username or password doesn't look right.", "error")

    return render_template("login.html", form=form)


@auth_bp.route("/logout")
def logout():
    session.clear()
    flash("You have been signed out.", "success")
    return redirect(url_for("auth.login"))


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    """Create a new user in the existing rupeevo.users table."""
    if session.get("user_id"):
        return redirect(url_for("main.dashboard"))

    form = RegistrationForm()

    if form.validate_on_submit():
        try:
            if email_exists(form.email.data):
                flash("An account with that email already exists.", "error")
                return render_template("register.html", form=form)

            # Mobile is validated in the form but not persisted: the live
            # users table has no mobile column yet. Add one before storing it.
            user_id = create_user(
                form.full_name.data.strip(),
                form.email.data,
                generate_password_hash(form.password.data),
            )
        except MySQLError as exc:
            # 1062 is MySQL's duplicate-key error (email has a UNIQUE index).
            if getattr(exc, "errno", None) == 1062:
                flash("An account with that email already exists.", "error")
            else:
                # Keep database details out of the response.
                flash("The database is unavailable. Please try again later.", "error")
            return render_template("register.html", form=form)

        session.clear()
        session["user_id"] = user_id
        session["user_name"] = form.full_name.data.strip()
        flash("Your account is ready. Welcome to Rupeevo!", "success")
        return redirect(url_for("main.dashboard"))

    return render_template("register.html", form=form)


@auth_bp.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    """Show the reset-request form and a clear confirmation after submission."""
    form = ForgotPasswordForm()
    sent = False

    if form.validate_on_submit():
        # Email delivery is intentionally not wired up yet. The confirmation
        # is deliberately generic so account existence is never disclosed.
        sent = True

    return render_template("forgot_password.html", form=form, sent=sent)
