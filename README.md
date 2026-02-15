# AgriConnect Project

This project consists of a Node.js/Express backend for the main application and API, a Flask backend for data analysis and forecasting, and a Streamlit dashboard for visualization.

## Prerequisites

-   **Node.js** (v14 or higher recommended)
-   **Python** (v3.8 or higher recommended)
-   **npm** (usually comes with Node.js)

## Setup

1.  **Install Node.js Dependencies:**
    ```bash
    npm install
    ```

2.  **Install Python Dependencies:**
    Navigate to the `backend_flask` directory and install the required packages. It is recommended to use a virtual environment.
    ```bash
    cd backend_flask
    pip install -r requirements.txt
    cd ..
    ```

## Running the Application

To run the entire application stack (Node.js server, Flask backend, and Streamlit dashboard) concurrently, use the following command from the root directory:

```bash
npm start
```

This command executes:
-   `npm run server`: Starts the **Node.js/Express server** on `http://localhost:3001`.
-   `npm run flask`: Starts the **Flask backend** on `http://localhost:5001`.
-   `npm run streamlit`: Starts the **Streamlit dashboard** (usually on `http://localhost:8501`).

## Project Structure

-   **Root**: Contains the Node.js application (`server.js`, `routes/`, `models/`, `public/`).
-   **backend_flask**: Contains the Flask application (`app.py`) and Streamlit dashboard (`dashboard/dashboard_ui.py`).
-   **public**: Static files served by the Node.js server.

## Verification

You can verify the different components are running by accessing their respective URLs or running the provided verification scripts (e.g., `./verify_phase4.sh`).
