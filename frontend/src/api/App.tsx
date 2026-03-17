import React, { useEffect, useRef, useState } from "react"
import Editor from "@monaco-editor/react"
import { createProblem, createSubmission, getSubmission } from "./api/api"

type TestResult = {
  input: string
  status: string
  expected?: string
  actual?: string
  error?: string
}

const DEFAULT_CODE = `import sys

def solve():
    data = sys.stdin.read().strip().split()
    if not data:
        return
    nums = list(map(int, data))
    print(sum(nums))

if __name__ == "__main__":
    solve()
`

const DEFAULT_TESTS = `{
  "1 2 3\\n": "6",
  "10\\n20\\n": "30"
}`

function App() {
  const [code, setCode] = useState<string>(DEFAULT_CODE)
  const [tests, setTests] = useState<string>(DEFAULT_TESTS)
  const [status, setStatus] = useState<string>("idle")
  const [submissionId, setSubmissionId] = useState<number | null>(null)
  const [results, setResults] = useState<TestResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollAttempts = useRef<number>(0)
  const MAX_POLLS = 20

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const parseTests = () => {
    const parsed = JSON.parse(tests)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Тесты должны быть JSON-объектом вида { \"input\": \"expected\" }")
    }
    return parsed
  }

  const runCode = async () => {
    if (pollRef.current) clearTimeout(pollRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setError(null)
    setResults([])
    setStatus("pending")
    setRunning(true)

    let parsedTests: Record<string, string>
    try {
      parsedTests = parseTests()
    } catch (e: any) {
      setError(e.message || "Не получилось распарсить тесты")
      setRunning(false)
      setStatus("idle")
      return
    }

    try {
      const problemRes = await createProblem({
        title: `Ad-hoc run ${new Date().toISOString()}`,
        description: "Запуск из веб-интерфейса",
        test_cases: parsedTests,
      })

      const submissionRes = await createSubmission({
        problem_id: problemRes.data.id,
        code,
        language: "python",
      })

      const subId = submissionRes.data.id
      setSubmissionId(subId)
      setStatus("processing")
      pollAttempts.current = 0

      timeoutRef.current = setTimeout(() => {
        if (pollRef.current) clearTimeout(pollRef.current)
        setStatus("time_limit_exceeded")
        setError("Превышено время ожидания результата (30 секунд).")
        setRunning(false)
      }, 30000)

      const poll = async () => {
        pollAttempts.current += 1
        try {
          const { data } = await getSubmission(subId)
          if (!["pending", "processing"].includes(data.status)) {
            if (pollRef.current) clearTimeout(pollRef.current)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            setStatus(data.status)
            setSubmissionId(subId)
            try {
              const parsedResult = typeof data.result === "string" ? JSON.parse(data.result || "[]") : data.result || []
              setResults(parsedResult)
            } catch {
              setError("Не удалось распарсить результат воркера")
            }
            setRunning(false)
            return
          }
          setStatus(data.status)
        } catch {
          setError("Не удалось получить статус отправки")
          setRunning(false)
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          if (pollRef.current) clearTimeout(pollRef.current)
          return
        }

        if (pollAttempts.current >= MAX_POLLS) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          setStatus("backend_unavailable")
          setError("Воркер не ответил.")
          setRunning(false)
          return
        }

        pollRef.current = setTimeout(poll, 1000)
      }

      pollRef.current = setTimeout(poll, 1000)
    } catch (err: any) {
      setError("Ошибка при создании задачи или отправке кода")
      setRunning(false)
      setStatus("idle")
    }
  }

  const verdictColor = (verdict: string) => {
    switch (verdict) {
      case "accepted": return "#22c55e"
      case "wrong_answer": return "#ef4444"
      case "runtime_error": return "#ef4444"
      case "time_limit_exceeded": return "#f59e0b"
      default: return "#a1a1aa"
    }
  }

  return (
    <div style={{
      height: "100vh",
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr",
      background: "#0f172a",
      color: "#e5e7eb",
      gap: "1px",
    }}>
      <div style={{ display: "flex", flexDirection: "column", padding: "16px", background: "#0b1220" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 600 }}>Код</div>
            <div style={{ fontSize: "12px", color: "#9ca3af" }}>Python</div>
          </div>
          <div style={{
            padding: "6px 10px",
            borderRadius: 8,
            background: "#111827",
            border: "1px solid #1f2937",
            fontSize: 12,
            color: "#9ca3af",
          }}>
            {submissionId ? `Submission #${submissionId}` : "Без отправки"}
          </div>
        </div>
        <div style={{ flex: 1, borderRadius: 12, overflow: "hidden", border: "1px solid #1f2937" }}>
          <Editor
            language="python"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value ?? "")}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
              fontSize: 14,
              smoothScrolling: true,
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", padding: "16px", background: "#0b1220" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 600 }}>Автотесты</div>
            <div style={{ fontSize: "12px", color: "#9ca3af" }}>JSON {`{ "ввод": "ожидаемый вывод" }`}</div>
          </div>
          <button
            onClick={runCode}
            disabled={running}
            style={{
              background: running ? "#374151" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "10px 16px",
              cursor: running ? "not-allowed" : "pointer",
              fontWeight: 700,
              boxShadow: "0 8px 16px rgba(37,99,235,0.25)",
            }}
          >
            {running ? "Запуск..." : "Запустить"}
          </button>
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateRows: "2fr 1.2fr", gap: 12 }}>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1f2937" }}>
            <Editor
              language="json"
              theme="vs-dark"
              value={tests}
              onChange={(value) => setTests(value ?? "")}
              options={{
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: "on",
              }}
            />
          </div>

          <div style={{
            borderRadius: 12,
            border: "1px solid #1f2937",
            background: "#0f172a",
            padding: "12px 14px",
            overflow: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: verdictColor(status),
                boxShadow: `0 0 0 4px ${verdictColor(status)}22`,
              }} />
              <div style={{ fontWeight: 700 }}>{status === "idle" ? "Готов к запуску" : status.toUpperCase()}</div>
            </div>

            {error && <div style={{ color: "#fca5a5", marginBottom: 8, fontSize: 13 }}>{error}</div>}

            {results.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {results.map((res, idx) => (
                  <div key={idx} style={{
                    border: "1px solid #1f2937",
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: "#111827",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ color: "#9ca3af", fontSize: 12 }}>Тест {idx + 1}</div>
                      <div style={{ color: verdictColor(res.status.toLowerCase()), fontWeight: 700 }}>{res.status}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      <div>Ввод: <code>{res.input}</code></div>
                      {res.expected && <div>Ожидалось: <code>{res.expected}</code></div>}
                      {res.actual && <div>Получено: <code>{res.actual}</code></div>}
                      {res.error && <div>Ошибка: <code>{res.error}</code></div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>Тут появятся результаты после запуска.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
