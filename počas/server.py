from flask import Flask, jsonify
from flask_cors import CORS
import requests
from requests.auth import HTTPBasicAuth

app = Flask(__name__)
# Povolenie CORS, aby React/TypeScript frontend mohol komunikovať s týmto Python serverom
CORS(app)

# Konfigurácia pripojenia na meteostanicu
METEO_API_URL = "https://projekttb.sksnr.sk/data/api.php?source=0&sort=timestamp&dir=desc&limit=1"
USERNAME = "sks"
PASSWORD = "kolbe"

@app.route('/api/live', methods=['GET'])
def get_live_data():
    try:
        # Python sa na pozadí bezpečne autorizuje meno/heslom a stiahne dáta
        response = requests.get(
            METEO_API_URL, 
            auth=HTTPBasicAuth(USERNAME, PASSWORD),
            timeout=5
        )
        response.raise_for_status()
        
        # Vráti dáta tvojmu frontendu vo formáte JSON
        return jsonify(response.json())
        
    except Exception as e:
        return jsonify({"error": "Nepodarilo sa stiahnuť dáta", "details": str(e)}), 500

if __name__ == '__main__':
    print("==================================================")
    # Server pobeží na http://127.0.0.1:5000/api/live
    print(" Python backend úspešne štartuje na porte 5000...")
    print("==================================================")
    app.run(debug=True, port=5000)