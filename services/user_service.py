"""Database operations for Rupeevo users."""

from config.database import get_connection


def email_exists(email: str) -> bool:
    """Return True when the email is already registered."""
    connection = get_connection()
    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM users WHERE email = %s LIMIT 1", (email,))
        return cursor.fetchone() is not None
    finally:
        if cursor is not None:
            cursor.close()
        connection.close()


def create_user(full_name: str, email: str, password_hash: str) -> int:
    """Insert a user and return its new id.

    ``created_at`` is supplied by the existing table's DEFAULT value.
    """
    connection = get_connection()
    cursor = None
    try:
        cursor = connection.cursor()
        cursor.execute(
            "INSERT INTO users (full_name, email, password_hash) "
            "VALUES (%s, %s, %s)",
            (full_name, email, password_hash),
        )
        connection.commit()
        return cursor.lastrowid
    except Exception:
        connection.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        connection.close()
