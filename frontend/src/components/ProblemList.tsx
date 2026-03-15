import React,{useEffect,useState} from "react"
import {getProblems} from "../api/api"

export default function ProblemList(){

 const [problems,setProblems]=useState<any[]>([])

 useEffect(()=>{

  getProblems().then(res=>{
   setProblems(res.data)
  })

 },[])

 return(

  <div>

   <h2>Problems</h2>

   <ul>

    {problems.map(p=>(
      <li key={p.id}>
        {p.title}
      </li>
    ))}

   </ul>

  </div>

 )

}
