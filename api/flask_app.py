import os
import sys

# Add the backend_flask directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend_flask')))

from app import app as flask_app

# Vercel needs the app object to be named 'app'
app = flask_app
