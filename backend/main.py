from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models import SessionLocal, Problem, Submission
import json

app = FastAPI()

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
    problems = db.query(Problem).all()
    return [{"id": p.id, "title": p.title} for p in problems]

@app.get("/problems/{problem_id}")
def get_problem(problem_id: int):
    db = SessionLocal()
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return problem

@app.post("/submissions")
def create_submission(submission: SubmissionCreate):
    db = SessionLocal()
    db_submission = Submission(
        problem_id=submission.problem_id,
        code=submission.code,
        language=submission.language,
        status="pending"
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    return {"id": db_submission.id, "status": "pending"}

@app.get("/submissions/{submission_id}")
def get_submission(submission_id: int):
    db = SessionLocal()
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
