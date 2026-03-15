import React,{useState} from "react"
import {createSubmission} from "../api/api"

export default function SubmitForm({problemId}:{problemId:number}){

 const [code,setCode]=useState("")

 const submit=async()=>{

  await createSubmission({
   problem_id:problemId,
   code:code,
   language:"python"
  })

  alert("submitted")

 }

 return(

  <div>

   <textarea
    rows={10}
    cols={60}
    value={code}
    onChange={(e)=>setCode(e.target.value)}
   />

   <br/>

   <button onClick={submit}>
    Submit
   </button>

  </div>

 )

}
