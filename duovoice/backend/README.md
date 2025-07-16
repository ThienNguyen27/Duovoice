# 1. Create + activate virtual environment
```bash
python3 -m venv venv (if not created virtual env)
source venv/bin/activate
```
# 2. Install Python dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```
# 3. Launch FastAPI dev server
```bash
uvicorn app:app --reload
```
# 4. Test API
run and visit http://localhost:8000/docs#/default/