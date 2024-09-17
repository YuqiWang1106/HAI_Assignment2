from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import os
from dotenv import load_dotenv
import json


# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Mount the static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to restrict allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load OpenAI API key from environment variable
openai.api_key = os.getenv("OPENAI_API_KEY")


# 定义接收的 prompt
class Prompt(BaseModel):
    prompt: str



@app.post("/generate_chart")
async def reply_message(prompt: Prompt):
    try:
        # Call the OpenAI API
        chat_completion = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a data visualization assistant responsible for generating Vega-Lite specifications. Vega-Lite is a high-level grammar of interactive graphics that produces JSON specifications for data visualizations.You are responsible for converting user requests into valid Vega-Lite specifications in JSON format, based on the dataset provided."},
                {"role": "user", "content": prompt.prompt}
            ],
            response_format = {"type": "json_object"} 
        )
        # Extract the response content
        ai_reply = chat_completion.choices[0].message['content']
        print("AI-REPLY:", ai_reply)


        try:
            vega_lite_spec = json.loads(ai_reply)

#  Exception
        except json.JSONDecodeError as e:
            print("JSON decode error:", str(e))
            # 如果解析失败，设置为空字典
            vega_lite_spec = {}

        print("Vega-Lite Spec: ",vega_lite_spec)
        # 返回 JSON 给前端
        return {"vegaLiteSpec": vega_lite_spec}




        # if not vega_lite_spec:
        #     # AI 返回了空的 JSON 对象
        #     return {"vegaLiteSpec": None}
        # else:
        #     return {"vegaLiteSpec": vega_lite_spec}



    except Exception as e:
        # Log the exception for debugging
        print("JSON decode error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate_description")
async def generate_description(prompt: Prompt):
    try:
        # 调用 OpenAI API 生成图表说明
        chat_completion = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a data visualization assistant responsible for generating concise descriptions of charts based on the data and user requests. "
                        "Your descriptions should be clear, informative, and match the user's request."
                    )
                },
                {"role": "user", "content": prompt.prompt}
            ]
        )
        # 提取 AI 回复内容
        ai_reply = chat_completion.choices[0].message['content']

        print("AI-REPLY:", ai_reply)

        # 返回描述给前端
        return {"description": ai_reply.strip()}

    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(status_code=500, detail="An error occurred while generating the description.")







# Root endpoint
@app.get("/")
async def read_root():
    return FileResponse('static/index.html')
