import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function Profile() {
  const { user, logout } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const navigate = useNavigate();

  // Form state
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
    doctor_notes: ""
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
    if (!recordId) {
      console.error("Error: Record ID is undefined");
      return;
    }
  
    try {
      const res = await fetch(`http://127.0.0.1:5000/delete-record/${recordId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${user.token}`,
        },
      });
  
      const data = await res.json();
      console.log("Delete Record Response:", data);
  
      if (data.success) {
        setRecords(records.filter(record => record._id !== recordId));
      } else {
        console.error("Failed to delete record:", data.error);
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
      console.log("Form being sent:", form);

      const res = await fetch("http://127.0.0.1:5000/add-record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      console.log("Add Record Response:", data);
      
      if (res.ok) {
        setRecords([...records, form]); // Optimistically update UI
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
          doctor_notes: ""
        });
      } else {
        console.error("Error adding record:", data);
      }
    } catch (error) {
      console.error("Error adding record:", error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Profile</h2>
      {user ? <p>Email: {user.email}</p> : <p>Loading user info...</p>}

      <h3>Medical Records</h3>
      <ul>
  {records.map((record, index) => (
    <li key={record._id || index}>
      <div
        onClick={() =>
          setExpandedRecord(expandedRecord === index ? null : index)
        }
        style={{
          cursor: "pointer",
          borderBottom: "1px solid #ccc",
          padding: "5px",
        }}
      >
        <strong>{record.date}</strong> -{" "}
        {record.symptoms.length > 30
          ? record.symptoms.substring(0, 30) + "..."
          : record.symptoms}
      </div>

      {expandedRecord === index && (
        <div
          style={{
            background: "#f4f4f4",
            padding: "10px",
            marginTop: "5px",
            borderRadius: "5px",
          }}
        >
          <h4>Medical Record Details</h4>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td><strong>Date:</strong></td>
                <td>{record.date}</td>
              </tr>
              <tr>
                <td><strong>Symptoms:</strong></td>
                <td>{record.symptoms}</td>
              </tr>
              <tr>
                <td><strong>Diagnosed Diseases:</strong></td>
                <td>{record.diagnosed_diseases}</td>
              </tr>
              <tr>
                <td><strong>Severity:</strong></td>
                <td>{record.severity}</td>
              </tr>
              <tr>
                <td><strong>Duration:</strong></td>
                <td>{record.duration}</td>
              </tr>
              <tr>
                <td><strong>Current Medications:</strong></td>
                <td>{record.current_medications}</td>
              </tr>
              <tr>
                <td><strong>Past Medications:</strong></td>
                <td>{record.past_medications}</td>
              </tr>
              <tr>
                <td><strong>Allergies:</strong></td>
                <td>{record.allergies}</td>
              </tr>
              <tr>
                <td><strong>Past Surgeries:</strong></td>
                <td>{record.past_surgeries}</td>
              </tr>
              <tr>
                <td><strong>Family History:</strong></td>
                <td>{record.family_history}</td>
              </tr>
              <tr>
                <td><strong>Lifestyle:</strong></td>
                <td>{record.lifestyle}</td>
              </tr>
              <tr>
                <td><strong>Doctor Notes:</strong></td>
                <td>{record.doctor_notes}</td>
              </tr>
            </tbody>
          </table>
          <button
            onClick={() => deleteRecord(record._id)}
            style={{
              marginTop: "10px",
              padding: "5px 10px",
              background: "red",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            Delete
          </button>
          <button
            onClick={() => setExpandedRecord(null)}
            style={{
              marginTop: "10px",
              padding: "5px 10px",
              background: "gray",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      )}
    </li>
  ))}
</ul>

      <h3>Add Medical Record</h3>
      <form onSubmit={(e) => { e.preventDefault(); addRecord(); }}>
        <input name="date" type="date" value={form.date} onChange={handleChange} required />
        <input name="symptoms" placeholder="Symptoms" value={form.symptoms} onChange={handleChange} required />
        <input name="diagnosed_diseases" placeholder="Diagnosed Diseases" value={form.diagnosed_diseases} onChange={handleChange} />
        <select name="severity" value={form.severity} onChange={handleChange}>
          <option value="">Severity</option>
          <option value="Mild">Mild</option>
          <option value="Moderate">Moderate</option>
          <option value="Severe">Severe</option>
        </select>
        <input name="duration" placeholder="Duration" value={form.duration} onChange={handleChange} />
        <input name="current_medications" placeholder="Current Medications" value={form.current_medications} onChange={handleChange} />
        <input name="past_medications" placeholder="Past Medications" value={form.past_medications} onChange={handleChange} />
        <input name="allergies" placeholder="Allergies" value={form.allergies} onChange={handleChange} />
        <input name="past_surgeries" placeholder="Past Surgeries" value={form.past_surgeries} onChange={handleChange} />
        <input name="family_history" placeholder="Family History" value={form.family_history} onChange={handleChange} />
        <input name="lifestyle" placeholder="Lifestyle (smoking, exercise, diet)" value={form.lifestyle} onChange={handleChange} />
        <textarea name="doctor_notes" placeholder="Doctor's Notes" value={form.doctor_notes} onChange={handleChange}></textarea>
        <button type="submit">Add Record</button>
      </form>

      <button onClick={() => { logout(); navigate("/"); }} style={{ marginTop: "20px", color: "red" }}>
        Logout
      </button>
    </div>
  );
}


