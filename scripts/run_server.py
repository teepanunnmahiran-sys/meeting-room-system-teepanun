import sys
import os
import uvicorn

# Ensure project root is in python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    print(f"Starting Enterprise Meeting Room Booking System on http://localhost:{port}")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
