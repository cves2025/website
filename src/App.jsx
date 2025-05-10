import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [date,setDate] = useState(new Date())
  useEffect(()=>{
    setInterval(() => {
      setDate(new Date());
    }, 1000);
  },[])
  const formatDate = (date) =>{
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    return formatter.format(date);
  }
  return (
    <>
      <div>
        <h1 className='capitalize'>Children's Valley English School</h1>
      </div>
      <h1 className='capitalize'>coming soon</h1>
      <div className="card">
          {formatDate(date)}
      </div>
      
    </>
  )
}

export default App
