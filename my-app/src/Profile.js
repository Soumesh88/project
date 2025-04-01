import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function Profile() {
  const { user, logout } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    date: "",
    symptoms: "",
    diagnosed_diseases: "",
    severity: "",
    duration: "",
    current_medications: "",
    past_medications: "",
    allergies: "",
    past_surgeries: "",
    family_history: "",
    lifestyle: "",
    doctor_notes: "",
  });

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/records", {
          headers: { Authorization: `Bearer ${user?.token}` },
        });
        const data = await res.json();
        setRecords(data.records || []);
      } catch (error) {
        console.error("Error fetching records:", error);
      }
    };

    if (user) fetchRecords();
  }, [user]);

  const deleteRecord = async (recordId) => {
    if (!recordId) return;

    try {
      const res = await fetch(`http://127.0.0.1:5000/delete-record/${recordId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setRecords(records.filter((record) => record._id !== recordId));
      }
    } catch (error) {
      console.error("Error deleting record:", error);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addRecord = async () => {
    if (!form.date || !form.symptoms) {
      alert("Date and Symptoms are required fields.");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:5000/add-record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setRecords([...records, form]);
        setForm({
          date: "",
          symptoms: "",
          diagnosed_diseases: "",
          severity: "",
          duration: "",
          current_medications: "",
          past_medications: "",
          allergies: "",
          past_surgeries: "",
          family_history: "",
          lifestyle: "",
          doctor_notes: "",
        });
      }
    } catch (error) {
      console.error("Error adding record:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile</h2>
        {user ? <p className="text-gray-600">Email: {user.email}</p> : <p>Loading user info...</p>}

        <h3 className="text-xl font-semibold mt-6">Medical Records</h3>
        <ul className="mt-3 space-y-2">
          {records.map((record, index) => (
            <li
              key={record._id || index}
              className="border p-3 rounded-lg shadow-sm bg-white cursor-pointer hover:bg-gray-100"
              onClick={() => setExpandedRecord(expandedRecord === index ? null : index)}
            >
              <strong>{record.date}</strong> - {record.symptoms.length > 30 ? record.symptoms.substring(0, 30) + "..." : record.symptoms}
            </li>
          ))}
        </ul>

        {expandedRecord !== null && (
          <div className="bg-gray-50 p-4 rounded-lg mt-3 shadow-inner">
            <h4 className="font-semibold">Medical Record Details</h4>
            <table className="w-full text-sm mt-2 border-collapse">
              <tbody>
                {Object.entries(records[expandedRecord]).map(([key, value]) => (
                  key !== "_id" && (
                    <tr key={key} className="border-t">
                      <td className="font-medium capitalize p-2">{key.replace("_", " ")}:</td>
                      <td className="p-2">{value || "N/A"}</td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-3">
              <button
                className="bg-red-500 text-white px-3 py-1 rounded-md mr-2 hover:bg-red-600"
                onClick={() => deleteRecord(records[expandedRecord]._id)}
              >
                Delete
              </button>
              <button
                className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600"
                onClick={() => setExpandedRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <h3 className="text-xl font-semibold mt-6">Add Medical Record</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addRecord();
          }}
          className="mt-3 space-y-3"
        >
          <input name="date" type="date" value={form.date} onChange={handleChange} required className="w-full p-2 border rounded-md" />
          <input name="symptoms" placeholder="Symptoms" value={form.symptoms} onChange={handleChange} required className="w-full p-2 border rounded-md" />
          <input name="diagnosed_diseases" placeholder="Diagnosed Diseases" value={form.diagnosed_diseases} onChange={handleChange} className="w-full p-2 border rounded-md" />
          <select name="severity" value={form.severity} onChange={handleChange} className="w-full p-2 border rounded-md">
            <option value="">Severity</option>
            <option value="Mild">Mild</option>
            <option value="Moderate">Moderate</option>
            <option value="Severe">Severe</option>
          </select>
          <input name="duration" placeholder="Duration" value={form.duration} onChange={handleChange} className="w-full p-2 border rounded-md" />
          <textarea name="doctor_notes" placeholder="Doctor's Notes" value={form.doctor_notes} onChange={handleChange} className="w-full p-2 border rounded-md"></textarea>
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600">
            Add Record
          </button>
        </form>

        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="w-full mt-4 text-red-500 hover:text-red-600 font-semibold"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
