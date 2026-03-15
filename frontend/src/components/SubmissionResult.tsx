import React,{useEffect,useState} from "react"
import {getSubmission} from "../api/api"

export default function SubmissionResult({id}:{id:number}){

 const [data,setData]=useState<any>(null)

 useEffect(()=>{

  getSubmission(id).then(res=>{
   setData(res.data)
  })

 },[id])

 if(!data) return null

 return(

  <div>

   Status: {data.status}

  </div>

 )

}
