from langgraph.graph import START, StateGraph, END
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Sequence, Any
from typing_extensions import TypedDict
from langchain_openai import ChatOpenAI

from sentence_transformers import SentenceTransformer
import pandas as pd
import faiss
from langchain_core.prompts import ChatPromptTemplate

import sys
import os, getpass

def _set_env(var: str):
    if not os.environ.get(var):
        os.environ[var] = getpass.getpass(f"{var}: ")

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
    diagnosis: Optional[str] = None
    diseases: Optional[str] = None

base_model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

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
        "diagnosis": response.content
    }


builder = StateGraph(Input)

builder.add_node("Analysis", analysis)
builder.add_node("Diagnosis", diagnosis)

builder.add_edge(START, "Analysis")
builder.add_edge("Analysis", "Diagnosis")
builder.add_edge("Diagnosis", END)

MedBot = builder.compile()

pu = MedBot.invoke(
    {
        "user_query": "Feeling really tired lately, and I have a fever with chills. Also, my throat is sore."
    }
)

print(pu)