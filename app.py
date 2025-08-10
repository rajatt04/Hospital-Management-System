from flask import Flask, request, jsonify, send_file, send_from_directory, Response
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson.objectid import ObjectId
from datetime import datetime
import os
import io
import csv

app = Flask(__name__)
CORS(app)

# MongoDB connection
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["hospital_db"]
patients = db["patients"]

# Create indexes
patients.create_index([("name", ASCENDING)])
patients.create_index([("department", ASCENDING)])

def patient_to_json(doc):
    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
    if isinstance(doc.get("admission_date"), datetime):
        doc["admission_date"] = doc["admission_date"].isoformat()
    return doc

# Create patient
@app.route("/patients", methods=["POST"])
def create_patient():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    required = ["name", "age", "gender", "department"]
    for r in required:
        if r not in data:
            return jsonify({"error": f"Missing field: {r}"}), 400

    patient = {
        "name": data["name"],
        "age": int(data.get("age", 0)),
        "gender": data.get("gender", ""),
        "department": data.get("department", ""),
        "phone": data.get("phone", ""),
        "address": data.get("address", ""),
        "notes": data.get("notes", ""),
        "admission_date": datetime.utcnow(),
        "status": data.get("status", "admitted")
    }

    res = patients.insert_one(patient)
    patient["_id"] = res.inserted_id
    return jsonify(patient_to_json(patient)), 201

# List patients
@app.route("/patients", methods=["GET"])
def list_patients():
    q = {}
    search = request.args.get("search")
    if search:
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    department = request.args.get("department")
    if department:
        q["department"] = department

    sort_by = request.args.get("sort_by", "admission_date")
    order = request.args.get("order", "desc")
    sort_dir = DESCENDING if order == "desc" else ASCENDING

    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(int(request.args.get("per_page", 10)), 100)

    total = patients.count_documents(q)
    cursor = patients.find(q).sort(sort_by, sort_dir).skip((page - 1) * per_page).limit(per_page)

    return jsonify({
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [patient_to_json(d) for d in cursor]
    })

# Get patient by ID
@app.route("/patients/<id>", methods=["GET"])
def get_patient(id):
    try:
        doc = patients.find_one({"_id": ObjectId(id)})
    except:
        return jsonify({"error": "Invalid id"}), 400
    if not doc:
        return jsonify({"error": "Not found"}), 404
    return jsonify(patient_to_json(doc))

# Update patient
@app.route("/patients/<id>", methods=["PUT"])
def update_patient(id):
    try:
        oid = ObjectId(id)
    except:
        return jsonify({"error": "Invalid id"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    up = {}
    for k in ("name", "age", "gender", "department", "phone", "address", "notes", "status"):
        if k in data:
            up[k] = data[k]
    if "age" in up:
        up["age"] = int(up["age"])

    res = patients.update_one({"_id": oid}, {"$set": up})
    if res.matched_count == 0:
        return jsonify({"error": "Not found"}), 404

    return jsonify(patient_to_json(patients.find_one({"_id": oid})))

# Delete patient
@app.route("/patients/<id>", methods=["DELETE"])
def delete_patient(id):
    try:
        oid = ObjectId(id)
    except:
        return jsonify({"error": "Invalid id"}), 400
    res = patients.delete_one({"_id": oid})
    return jsonify({"deleted": res.deleted_count})

# Import patients from CSV
@app.route("/import_csv", methods=["POST"])
def import_csv():
    file = request.files.get("file")
    if not file or not file.filename.endswith(".csv"):
        return jsonify({"error": "Invalid CSV file"}), 400

    stream = io.StringIO(file.stream.read().decode("utf-8"))
    reader = csv.DictReader(stream)

    inserted_count = 0
    for row in reader:
        name = row.get("name") or row.get("Name")
        age = row.get("age") or row.get("Age") or 0
        department = row.get("department") or row.get("Dept") or ""
        phone = row.get("phone") or row.get("Phone") or ""
        status = row.get("status") or row.get("Status") or "admitted"

        if name:
            patients.insert_one({
                "name": name,
                "age": int(age),
                "gender": row.get("gender") or row.get("Gender") or "",
                "department": department,
                "phone": phone,
                "address": row.get("address") or "",
                "notes": row.get("notes") or "",
                "admission_date": datetime.utcnow(),
                "status": status
            })
            inserted_count += 1

    return jsonify({"inserted": inserted_count}), 201

# Export patients to CSV
@app.route("/export_csv", methods=["GET"])
def export_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "name", "age", "gender", "department", "phone", "address", "notes", "admission_date", "status"])

    for patient in patients.find():
        adm_s = patient["admission_date"].isoformat() if isinstance(patient.get("admission_date"), datetime) else ""
        writer.writerow([
            str(patient["_id"]),
            patient.get("name", ""),
            patient.get("age", ""),
            patient.get("gender", ""),
            patient.get("department", ""),
            patient.get("phone", ""),
            patient.get("address", ""),
            patient.get("notes", ""),
            adm_s,
            patient.get("status", "")
        ])

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name="patients.csv"
    )

# Serve frontend
@app.route("/")
def home():
    return send_from_directory(".", "index.html")

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_file(filename):
    return send_from_directory('.', filename)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)