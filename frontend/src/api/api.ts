import axios from "axios"

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
})

export const getProblems = () => API.get("/problems")
export const createProblem = (data: any) => API.post("/problems", data)
export const createSubmission = (data: any) => API.post("/submissions", data)
export const getSubmission = (id: number) => API.get(`/submissions/${id}`)
