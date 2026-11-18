import os
import secrets

from dotenv import load_dotenv
from flask import Flask
from flask_wtf.csrf import CSRFProtect

from routes.auth import auth_bp
from routes.main import main_bp

load_dotenv()

csrf = CSRFProtect()


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY") or secrets.token_hex(32)
    csrf.init_app(app)
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    return app


app = create_app()


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(debug=debug)
