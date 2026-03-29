import { useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import axios from 'axios';



function App() {

  const value = `//hello from anuj and enjoy coding`;

  const [code, setCode] = useState("");
  const [input, setInput] = useState(""); 
  const [output, setOutput] = useState("");

  const submitCode = async () => {
    console.log("In queue");
    try {
      const response = await axios.post('http://localhost:5000/submit', {
        input: input,
        code: code,
        language: "cpp",
      });
      console.log('Submission Response:', response.data.data.output);
      setOutput(response.data.data.output);

    } catch (error) {
      console.log('Submission Error:', error);
    }
  }


  return <>
    <Editor
      height="80vh"
      defaultLanguage="cpp"
      defaultValue={value}
      theme="vs-dark"
      onChange={(value) => setCode(value)}
    />

    <div>
      <h3 className="bg-amber-800">Input:</h3>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} />
      <h3>Output:</h3>
      <pre>{output}</pre>
    </div>

    <button className="btn btn-primary" onClick={submitCode}>Submit</button>
  </>
}


export default App;