from flask import Flask
from flask import Flask, request, jsonify
from flask_cors import CORS 

from langgraph.graph import START, StateGraph, END
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Sequence, Any, Literal
from typing_extensions import TypedDict
from langchain_openai import ChatOpenAI
from langgraph.types import Command
from enum import Enum

from sentence_transformers import SentenceTransformer
import pandas as pd
import faiss
from langchain_core.prompts import ChatPromptTemplate

import sys
import os, getpass
from dotenv import load_dotenv
load_dotenv()

def _set_env(var: str):
    if not os.environ.get(var):
        os.environ[var] = getpass.getpass(f"{var}: ")

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "langchain-academy"
_set_env("OPENAI_API_KEY")
_set_env("LANGCHAIN_API_KEY")

model = SentenceTransformer("all-MiniLM-L6-v2")  # Fast and accurate

df = pd.read_csv("processed_symptom_disease.csv")

index = faiss.read_index("symptom_faiss.index")

def retrieve_diseases(user_input, model, df, index, top_k=10):
    # Encode user symptoms
    user_embedding = model.encode(user_input).reshape(1, -1)

    # Search FAISS index
    distances, indices = index.search(user_embedding, top_k)

    # Get top-matching diseases
    results = df.iloc[indices[0]][["diseases", "symptoms"]]
    return results

class Input(TypedDict):
    user_query: str
    symptoms: Optional[List[str]] = None
    final_answer: Optional[str] = None
    diseases: Optional[str] = None

class Source(str, Enum):
    Medical_Query = "Medical Query"
    Generic = "Generic"

base_model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

def supervisor(input : Input)-> Command[Literal["Analysis", "Help Desk"]]:
    class LLMOutput(TypedDict):
        category: Source
    system_msg = """You are a supervisor routing user query. You have to analyze the provided user query and decide where to route the user query by deciding the category of the query, keeping the following instructions in mind:
                 1. If the user query is requesting for medical assistance or diagnosis related to their symptoms, then assign the category as Medical Query.
                 2. If the user query is of any type other than specified above, then assign the category as Generic.
                 Return as output the category of the user query, which is one of [Medical Query, Generic]
                 """
    messages = [
        ("system", system_msg),
        ("user", input["user_query"])
    ]
    response = base_model.with_structured_output(LLMOutput).invoke(messages)
    print(response)
    if response["category"] == "Medical Query":
        return Command(goto="Analysis", update={
        "user_query":  input["user_query"]
       })
    return Command(goto="Help Desk", update={
        "user_query":  input["user_query"]
    })

def help_desk(input : Input):
    system_msg = """You are an expert medical examiner. You have been provided a generic user query. You have to return a short and brief response explaining to the user that their query can't be answered, and that they should inquire about medical diagnosis instead"""
    messages = [
        ("system", system_msg),
        ("user", input["user_query"])
    ]
    response  = base_model.invoke(ChatPromptTemplate.from_messages(messages).invoke({}))
    return {
        "final_answer": response.content
    }

def analysis(input : Input):
    class LLMOutput(TypedDict):
        symptoms = List[str]
    system_msg = """You are an expert medical examiner.
    You have been provided a user query for medical diagnosis. You have to analyze the query and 
    determine the primary symptoms being experienced by the user.
    Return a list of symptoms being experienced by the user."""
    messages = [
        ("system", system_msg),
        ("user", input["user_query"])
    ]
    response = base_model.with_structured_output(LLMOutput).invoke(messages)
    print(response['symptoms'])
    return{
        "symptoms": response['symptoms']
    }

def diagnosis(input : Input):
    symptoms = ",".join(input["symptoms"])
    diseases = retrieve_diseases(symptoms, model, df, index)
    system_msg = """You are an expert medical examiner.
    You have been provided a user query for medical diagnosis, as well as a list of diseases which might be likely affecting the patient according to their displayed symptoms.
    User query: {query}
    Diseases: {diseases}
    Aanalyze the user query and diseases and provide a detailed possible diagnosis to the user"""
    messages = [
        ("system", system_msg)
    ]
    response  = base_model.invoke(ChatPromptTemplate.from_messages(messages).invoke({
                "query": input["user_query"],
                "diseases": diseases
    }))
    return{
        "diseases": diseases,
        "final_answer": response.content
    }

builder = StateGraph(Input)

builder.add_node("Analysis", analysis)
builder.add_node("Diagnosis", diagnosis)
builder.add_node("Help Desk", help_desk)
builder.add_node("Supervisor", supervisor)

builder.add_edge(START, "Supervisor")
builder.add_edge("Help Desk", END)
builder.add_edge("Analysis", "Diagnosis")
builder.add_edge("Diagnosis", END)

MedBot = builder.compile()

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['POST'])
def home():
    data = request.json  # Extract JSON data from request
    message = data.get('message')  # Extract the "message" field

    # Use the extracted message in MedBot
    pu = MedBot.invoke({"user_query": message})
    
    # Return the response
    return jsonify({"response": pu["diagnosis"]}) 

if __name__ == '__main__':
    app.run(debug=True)
