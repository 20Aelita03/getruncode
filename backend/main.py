from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models import SessionLocal, Problem, Submission
import json
import pika
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProblemCreate(BaseModel):
    title: str
    description: str
    test_cases: dict

class SubmissionCreate(BaseModel):
    problem_id: int
    code: str
    language: str = "python"

@app.get("/")
def root():
    return {"message": "Code Grader API is running"}

@app.get("/problems")
def get_problems():
    db = SessionLocal()
    try:
        problems = db.query(Problem).all()
        return [{"id": p.id, "title": p.title} for p in problems]
    finally:
        db.close()

@app.get("/problems/{problem_id}")
def get_problem(problem_id: int):
    db = SessionLocal()
    try:
        problem = db.query(Problem).filter(Problem.id == problem_id).first()
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        return problem
    finally:
        db.close()

@app.post("/problems")
def create_problem(problem: ProblemCreate):
    db = SessionLocal()
    try:
        db_problem = Problem(
            title=problem.title,
            description=problem.description,
            test_cases=problem.test_cases
        )
        db.add(db_problem)
        db.commit()
        db.refresh(db_problem)
        return db_problem
    finally:
        db.close()

@app.post("/submissions")
def create_submission(submission: SubmissionCreate):
    db = SessionLocal()
    try:
        db_submission = Submission(
            problem_id=submission.problem_id,
            code=submission.code,
            language=submission.language,
            status="pending"
        )
        db.add(db_submission)
        db.commit()
        db.refresh(db_submission)

        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host='rabbitmq'))
            channel = connection.channel()
            channel.queue_declare(queue='task_queue', durable=True)
            message = json.dumps({"submission_id": db_submission.id})
            channel.basic_publish(
                exchange='',
                routing_key='task_queue',
                body=message,
                properties=pika.BasicProperties(delivery_mode=2)
            )
            connection.close()
            print(f" [x] Отправлена задача {db_submission.id} в очередь")
        except Exception as e:
            print(f" [!] Ошибка при отправке в RabbitMQ: {e}")

        return {"id": db_submission.id, "status": "pending"}
    finally:
        db.close()

@app.get("/submissions/{submission_id}")
def get_submission(submission_id: int):
    db = SessionLocal()
    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        return submission
    finally:
        db.close()
