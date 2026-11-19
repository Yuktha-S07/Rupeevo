"""Database configuration and connection helpers for Rupeevo."""

import os

import mysql.connector
from mysql.connector import Error

# Rupeevo only ever connects to this database. It is intentionally hardcoded
# so a mistyped DB_NAME in a local .env cannot point the app elsewhere.
DB_NAME = "rupeevo"


def get_db_config() -> dict:
    """Build MySQL connection settings from the environment / .env file."""
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "user": os.getenv("DB_USER", ""),
        "password": os.getenv("DB_PASSWORD", ""),
        "database": DB_NAME,
        "port": int(os.getenv("DB_PORT", "3306")),
    }


def get_connection():
    """Open a new connection to the rupeevo database."""
    return mysql.connector.connect(**get_db_config())


def is_connected() -> bool:
    """Return True when a simple query against rupeevo succeeds."""
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        return cursor.fetchone() is not None
    except Error:
        return False
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()
