import streamlit as st
import requests

st.set_page_config(page_title="Smart Business Dashboard", layout="wide")

st.title("Smart Business Analytics")

st.sidebar.header("Navigation")
page = st.sidebar.radio("Go to", ["Overview", "Sales", "Inventory"])

if page == "Overview":
    st.header("Business Overview")
    try:
        response = requests.get("http://127.0.0.1:5001/api/health")
        if response.status_code == 200:
            st.success("Flask Backend Connected")
        else:
            st.error("Flask Backend Error")
    except Exception as e:
        st.error(f"Backend Connection Failed: {e}")

elif page == "Sales":
    st.header("Sales Analytics")
    st.info("Sales data visualization coming soon.")

elif page == "Inventory":
    st.header("Inventory Management")
    st.info("Inventory tracking coming soon.")
