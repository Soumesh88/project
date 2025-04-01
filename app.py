from flask import Flask
from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId

from langgraph.graph import START, StateGraph, END
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Sequence, Any, Literal
from typing_extensions import TypedDict
from langchain_openai import ChatOpenAI
from langgraph.types import Command
from enum import Enum
from langgraph.checkpoint.memory import MemorySaver

from sentence_transformers import SentenceTransformer
import pandas as pd
import faiss
from langchain_core.prompts import ChatPromptTemplate

import sys
import os, getpass
from dotenv import load_dotenv

import random
import string

def generate_random_string(length: int) -> str:
    # Define the characters to choose from
    characters = string.ascii_letters + string.digits
    # Generate a random string
    random_string = ''.join(random.choice(characters) for _ in range(length))
    return random_string

# Example usage
random_thread_id = generate_random_string(10)

load_dotenv()

def _set_env(var: str):
    if not os.environ.get(var):
        os.environ[var] = getpass.getpass(f"{var}: ")

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "langchain-academy"
_set_env("OPENAI_API_KEY")
_set_env("LANGCHAIN_API_KEY")
_set_env("MONGO_URI")

model = SentenceTransformer("all-MiniLM-L6-v2")  # Fast and accurate

df = pd.read_csv("merged_dataset.csv")

index = faiss.read_index("symptom_faiss.index")

def retrieve_diseases(user_input, model, index, top_k=10):
    # Encode user symptoms
    user_embedding = model.encode(user_input).reshape(1, -1)

    # Search FAISS index
    distances, indices = index.search(user_embedding, top_k)

    # Get top-matching diseases
    results = df.iloc[indices[0]][["diseases", "symptoms"]]
    return results.to_string(), df.iloc[indices[0]][["diseases"]]["diseases"].tolist()

class MedicalRecord(BaseModel):
    id: str = Field(alias="_id")
    date: str
    symptoms: str
    diagnosed_diseases: str
    severity: str
    duration: str
    current_medications: str
    past_medications: str
    allergies: str
    past_surgeries: str
    family_history: str
    lifestyle: str
    doctor_notes: str

class Input(TypedDict):
    user_query: str
    symptoms: Optional[List[str]] = None
    final_answer: Optional[str] = None
    diseases: Optional[str] = None
    previous_records: Optional[List[MedicalRecord]] = None
    conversation_summary: Optional[List[str]] = None
    disease_list: Optional[str] = None

class Source(str, Enum):
    Medical_Query = "Medical Query"
    Generic = "Generic"

base_model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

def supervisor(input : Input)-> Command[Literal["Analysis", "Help Desk"]]:
    class LLMOutput(TypedDict):
        category: Source
    summary = input.get("conversation_summary", [])
    if len(summary) == 0:
        conversation_summary = ""
    else:
        conversation_summary = f"Summary of previous conversation with user: {"/n".join(summary)}"
    print(input)
    system_msg = """You are a supervisor routing user query. You have to analyze the provided user query and decide where to route the user query by deciding the category of the query, keeping the following instructions in mind:
                 1. If the user query is requesting for medical assistance or diagnosis related to their symptoms, then assign the category as Medical Query.
                 2. If the user query is of any type other than specified above, then assign the category as Generic.
                 {conversation_summary}
                 Return as output the category of the user query, which is one of [Medical Query, Generic]
                 """
    messages = [
        ("system", system_msg),
        ("user", input["user_query"])
    ]
    response = base_model.with_structured_output(LLMOutput).invoke(ChatPromptTemplate.from_messages(messages).invoke({"conversation_summary": conversation_summary}))
    if response["category"] == "Medical Query":
        return Command(goto="Analysis", update={
        "user_query":  input["user_query"],
        "diseases": None
       })
    return Command(goto="Help Desk", update={
        "user_query":  input["user_query"],
        "diseases": None,
        "disease_list": None
    })

def help_desk(input : Input):
    summary = input.get("conversation_summary", [])
    if len(summary) == 0:
        conversation_summary = ""
    else:
        conversation_summary = f"Summary of previous conversation with user: {"/n".join(summary)}"
    system_msg = """You are an expert medical examiner. You have been provided a generic user query.
    Previous conversation summary: {conversation_summary}
    If the user query is related to previous conversation, then return a brief response to the user's query keeping the summary in mind.
    If the user query is completely generic, then return a brief and precise response saying that you can't help with the query, and they should ask about medical assistance instead.
    """
    messages = [
        ("system", system_msg),
        ("user", input["user_query"])
    ]
    response  = base_model.invoke(ChatPromptTemplate.from_messages(messages).invoke({
        "conversation_summary": conversation_summary
    }))
    return {
        "final_answer": response.content
    }

def analysis(input : Input):
    class LLMOutput(TypedDict):
        symptoms: List[str]
    summary = input.get("conversation_summary", [])
    if len(summary) == 0:
        conversation_summary = ""
    else:
        conversation_summary = f"Conversation summary with user, consider the previous symptoms in determining the symptoms: {"/n".join(summary)}"
    system_msg = """You are an expert medical examiner.
    You have been provided a user query for medical diagnosis. You have to analyze the query and 
    determine the primary symptoms being experienced by the user.
    {conversation_summary}
    Return a list of symptoms being experienced by the user.
    """

    messages = [
        ("system", system_msg),
        ("user", input["user_query"])
    ]
    response = base_model.with_structured_output(LLMOutput).invoke(ChatPromptTemplate.from_messages(messages).invoke({
        "conversation_summary": conversation_summary
    }))
    print(response)
    return{
        "symptoms": response['symptoms']
    }
    

def summarise(records):
    system_msg = """You are an expert medical examiner. You have been provided a list of past medical records of the user.
    Medical Records: {records}
    You have to provide a concise summary of the medical records, keeping any information which will be useful for future medical diagnosis of the user.
    Return the medical summary, without any other comments.
    """
    messages = [
        ("system", system_msg)
    ]
    response  = base_model.invoke(ChatPromptTemplate.from_messages(messages).invoke({"records": records}))
    return response.content

def diagnosis(input : Input):
    symptoms = ",".join(input["symptoms"])
    diseases, disease_list = retrieve_diseases(symptoms, model, index)
    print(disease_list)
    records = input["previous_records"]
    summary = input.get("conversation_summary", [])
    if len(records) == 0:
        records_summary = ""
    else:
        records_summary = "- Following are the previous medical records of the user, use them if necessary in the diagnosis: " + summarise(records)
    if len(summary) == 0:
        conversation_summary = ""
    else:
        conversation_summary = f"- Conversation summary with user, consider the following if relevant in determining the diagnosis: {"/n".join(summary)}"
    print(records_summary)
    system_msg = """You are an expert medical examiner.
    You have been provided a user query for medical diagnosis, a list of displayed symptoms, as well as a list of diseases that might be likely affecting the patient according to their displayed symptoms.

    **User query:**  
    {query}

    **Symptoms:**
    {symptoms}

    **Possible Diseases:**  
    {diseases}

    ### Instructions:  
    - Provide a structured diagnosis using **Markdown formatting**, after evaluating the possible diseases with the user query.  
    - Use headings (`###`), bold text (`**bold**`), and bullet points (`-`) for readability.  
    - Ensure the response is detailed but concise.
    {records_summary}
    {conversation_summary}

    **Return your response in Markdown format.**
    """
    messages = [
        ("system", system_msg)
    ]
    response  = base_model.invoke(ChatPromptTemplate.from_messages(messages).invoke({
                "query": input["user_query"],
                "diseases": diseases,
                "records_summary": records_summary,
                "conversation_summary": conversation_summary,
                "symptoms": symptoms
    }))
    summary = input.get("conversation_summary", [])
    current_summary = f"User asked: {input['user_query']}"
    current_summary = current_summary + "\n" + f"Previous symptoms + {input['symptoms']}"
    current_summary = current_summary + "\n" + f"Previous diagnosis + {response.content}"
    summary.append(current_summary) 

    return{
        "diseases": diseases,
        "final_answer": response.content,
        "disease_list": disease_list
    }

def conversation_summarise(input: Input):
    summary = input.get("conversation_summary", [])
    current_summary = f"User asked: {input['user_query']}"
    current_summary = current_summary + "\n" + f"Determined symptoms + {input['symptoms']}"
    current_summary = current_summary + "\n" + f"Provided diagnosis + {input['final_answer']}"

    system_msg = """You are an expert medical examiner. You have had a conversation with the user which involved user query, determining symptoms and providing diagnosis.
    
    Conversation Details: {conversation}

    You have to generate a precise summary of this conversation, which must include the user query, the determined symptoms, and the diagnosis in brief and to the point.
    Return only the generated summary, without any other comments.
    """
    messages = [
        ("system", system_msg)
    ]

    response  = base_model.invoke(ChatPromptTemplate.from_messages(messages).invoke({
                "conversation": current_summary
    }))
    print(response.content)
    summary.append(response.content)
    return{
        "conversation_summary": summary
    }

builder = StateGraph(Input)

builder.add_node("Analysis", analysis)
builder.add_node("Diagnosis", diagnosis)
builder.add_node("Help Desk", help_desk)
builder.add_node("Supervisor", supervisor)
builder.add_node("Summarizer", conversation_summarise)

builder.add_edge(START, "Supervisor")
builder.add_edge("Help Desk", END)
builder.add_edge("Analysis", "Diagnosis")
builder.add_edge("Diagnosis", "Summarizer")
builder.add_edge("Summarizer", END)

checkpointer = MemorySaver()

MedBot = builder.compile(checkpointer=checkpointer)

app = Flask(__name__)
CORS(app)

app.config['JWT_SECRET_KEY'] = "your_secret_key_here"
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

client = MongoClient(os.environ["MONGO_URI"])
db = client["chatbotDB"]
users_collection = db["users"]
records_collection = db["patient_records"]

def fetch_user_records(email):
    records = list(records_collection.find({"email": email}, {"email": 0}))

    # Convert ObjectId to string
    for record in records:
        record["_id"] = str(record["_id"])
    return records

@app.route('/', methods=['POST'])
@jwt_required()
def home():
    try:
       data = request.json  # Extract JSON data from request
       message = data.get('message')  # Extract the "message" field
       current_user = get_jwt_identity()

       raw_records = fetch_user_records(current_user)
       records = []
       for record in raw_records:
          record["_id"] = str(record["_id"])
          records.append(MedicalRecord(**record))
       # Use the extracted message in MedBot
       pu = MedBot.invoke({"user_query": message, "previous_records": records}, config={"configurable": {"thread_id": random_thread_id}})
       print(pu)
       diseases_list = pu.get("disease_list", None)
       if diseases_list is None:
          return jsonify({"final_answer": pu["final_answer"]})
       # Return the response
       return jsonify({"final_answer": pu["final_answer"], "diseases": diseases_list})
    except Exception as e:
          return jsonify({"final_answer": "I'm sorry, some error has occurred. Please try again"})

@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    # Check if email exists
    if users_collection.find_one({"email": email}):
        return jsonify({"error": "User already exists!"}), 400

    # Hash password
    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')

    # Insert user into MongoDB
    users_collection.insert_one({"name": name, "email": email, "password": hashed_pw})
    
    return jsonify({"message": "User registered successfully!"}), 201


@app.route("/login", methods=["POST"])
def login():
    global random_thread_id
    random_thread_id = generate_random_string(10)
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = users_collection.find_one({"email": email})

    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    # ✅ Include email inside the JWT payload
    access_token = create_access_token(identity = email)

    return jsonify({"message": "Login successful!", "token": access_token}), 200

@app.route("/user", methods=["GET"])
@jwt_required()
def get_user():
    current_user = get_jwt_identity()
    user = users_collection.find_one({"email": current_user}, {"_id": 0, "password": 0})  # Exclude password
    return jsonify(user), 200

@app.route("/records", methods=["GET"])
@jwt_required()
def get_records():
    current_user = get_jwt_identity()
    records = fetch_user_records(current_user)
    return jsonify({"records": records}), 200


@app.route("/add-record", methods=["POST"])
@jwt_required()
def add_record():
    try:
        identity = get_jwt_identity()
        current_user = identity.get("email") if isinstance(identity, dict) else identity
        
        data = request.json
        print("Received data:", data)  # Debugging log

        # Ensure all required fields are present
        required_fields = [
            "date", "symptoms", "diagnosed_diseases", "severity", "duration",
            "current_medications", "past_medications", "allergies", "past_surgeries",
            "family_history", "lifestyle", "doctor_notes"
        ]

        # Check if any required field is missing or empty
        missing_fields = [field for field in required_fields if field not in data or not data[field]]
        if missing_fields:
            print("Missing fields:", missing_fields)  # Debugging
            return jsonify({"error": f"Missing required fields: {missing_fields}"}), 400

        # Store the record in MongoDB
        data["email"] = current_user  # Associate record with user
        records_collection.insert_one(data)

        return jsonify({"success": True, "message": "Record added successfully!"}), 201
    except Exception as e:
        print(f"Error in add_record: {str(e)}")
        return jsonify({"error": str(e)}), 422

@app.route("/delete-record/<record_id>", methods=["DELETE"])
@jwt_required()
def delete_record(record_id):
    try:
        identity = get_jwt_identity()
        current_user = identity["email"] if isinstance(identity, dict) else identity
        
        result = records_collection.delete_one({"_id": ObjectId(record_id), "email": current_user})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Record not found"}), 404

        return jsonify({"success": True, "message": "Record deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
