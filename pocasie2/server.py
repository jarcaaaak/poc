from flask import Flask, jsonify
from flask_cors import CORS
import requests
from requests.auth import HTTPBasicAuth

app = Flask(__name__)
CORS(app)

# Konfigurácia pripojenia na meteostanicu - limit sme zvýšili na 30 záznamov pre graf!
METEO_API_URL = "https://projekttb.sksnr.sk/data/api.php?source=0&sort=timestamp&dir=desc&limit=30"
USERNAME = "sks"      # <--- TU MAJ SVOJE SKUTOČNÉ MENO
PASSWORD = "kolbe"    # <--- TU MAJ SVOJE SKUTOČNÉ HESLO

@app.route('/api/live', methods=['GET'])
def get_live_data():
    try:
        response = requests.get(
            METEO_API_URL, 
            auth=HTTPBasicAuth(USERNAME, PASSWORD),
            timeout=5
        )
        response.raise_for_status()
        # Vráti frontend-u kompletné pole posledných 30 meraní
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": "Nepodarilo sa stiahnuť dáta", "details": str(e)}), 500

@app.route('/api/camera1', methods=['GET'])
def get_camera1():
    try:
        response = requests.get(
            "https://projekttb.sksnr.sk/data/camera.php?cam=0", 
            auth=HTTPBasicAuth(USERNAME, PASSWORD),
            timeout=5
        )
        response.raise_for_status()
        # Vrátime stiahnutý obrazový obsah priamo do prehliadača
        return response.content, 200, {'Content-Type': 'image/jpeg'}
    except Exception as e:
        return jsonify({"error": "Kamera 1 nedostupná", "details": str(e)}), 500

@app.route('/api/camera2', methods=['GET'])
def get_camera2():
    try:
        response = requests.get(
            "https://projekttb.sksnr.sk/data/camera.php?cam=1", 
            auth=HTTPBasicAuth(USERNAME, PASSWORD),
            timeout=5
        )
        response.raise_for_status()
        return response.content, 200, {'Content-Type': 'image/jpeg'}
    except Exception as e:
        return jsonify({"error": "Kamera 2 nedostupná", "details": str(e)}), 500

if __name__ == '__main__':
    print("==================================================")
    print("🚀 Python server úspešne beží na http://127.0.0.1:5000")
    print("==================================================")
    app.run(host='127.0.0.1', port=5000, debug=True)