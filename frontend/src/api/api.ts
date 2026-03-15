import axios from "axios"

const API = axios.create({
  baseURL: "http://localhost:8000"
})

export const getProblems = () => API.get("/problems")

export const createSubmission = (data:any) =>
  API.post("/submissions", data)

export const getSubmission = (id:number) =>
  API.get(`/submissions/${id}`)
