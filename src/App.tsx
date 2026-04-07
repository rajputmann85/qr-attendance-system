import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Search,
  GraduationCap,
  Lock,
  ArrowRight,
  LogOut,
  Trash2,
  FileSpreadsheet,
  Keyboard,
  RefreshCw,
  Play,
  Download,
  History,
  CheckCircle,
  Scan,
  Mail,
  BookOpen,
  Calendar,
} from "lucide-react";

const App = () => {
  // Navigation & Auth State
  const [userRole, setUserRole] = useState(null);
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeStudent, setActiveStudent] = useState(null);

  // Data State
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Forms State
  const [loginData, setLoginData] = useState({ id: "", password: "" });
  const [formData, setFormData] = useState({
    name: "",
    enrollNo: "",
    parentEmail: "",
  });
  const [manualEnroll, setManualEnroll] = useState("");
  const [currentSubject, setCurrentSubject] = useState("Mathematics");
  const [historyLookup, setHistoryLookup] = useState("");

  // Refs for Camera, Canvas and Download
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cardRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Load Libraries
  useEffect(() => {
    const s1 = document.createElement("script");
    s1.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s1.async = true;
    document.body.appendChild(s1);

    const s2 = document.createElement("script");
    s2.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    s2.async = true;
    document.body.appendChild(s2);

    // SheetJS for Excel
    const s3 = document.createElement("script");
    s3.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s3.async = true;
    document.body.appendChild(s3);

    return () => {
      document.body.removeChild(s1);
      document.body.removeChild(s2);
      document.body.removeChild(s3);
    };
  }, []);

  // Persistence
  useEffect(() => {
    const savedStudents = localStorage.getItem("qr_attendance_students");
    const savedAttendance = localStorage.getItem("qr_attendance_logs");
    if (savedStudents) {
      try {
        setStudents(JSON.parse(savedStudents));
      } catch (e) {}
    }
    if (savedAttendance) {
      try {
        setAttendance(JSON.parse(savedAttendance));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("qr_attendance_students", JSON.stringify(students));
    localStorage.setItem("qr_attendance_logs", JSON.stringify(attendance));
  }, [students, attendance]);

  const showMsg = (text, type = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Mark Attendance Logic
  const markAttendance = (enroll) => {
    if (!enroll) return;
    const student = students.find((s) => s.enrollNo.trim() === enroll.trim());
    if (!student) {
      showMsg("Student not found", "error");
      return false;
    }

    const today = new Date().toLocaleDateString();
    const isAlreadyPresent = attendance.find(
      (a) =>
        a.enrollNo === student.enrollNo &&
        a.subject === currentSubject &&
        new Date(a.timestamp).toLocaleDateString() === today
    );

    if (isAlreadyPresent) {
      showMsg("Already marked for " + currentSubject, "error");
      return false;
    }

    const entry = {
      id: crypto.randomUUID(),
      name: student.name,
      enrollNo: student.enrollNo,
      subject: currentSubject,
      parentEmail: student.parentEmail,
      timestamp: new Date().toISOString(),
    };

    setAttendance((prev) => [entry, ...prev]);
    showMsg(`Present: ${student.name} (${currentSubject})`);

    // Simulate Parent Notification
    console.log(
      `Notification sent to ${student.parentEmail}: Student ${student.name} is present for ${currentSubject} lecture.`
    );

    return true;
  };

  // Export to Excel by Date
  const exportToExcel = () => {
    if (!window.XLSX) return;

    // Group attendance by date
    const dates = [
      ...new Set(
        attendance.map((a) => new Date(a.timestamp).toLocaleDateString())
      ),
    ];

    dates.forEach((date) => {
      const dailyData = attendance
        .filter((a) => new Date(a.timestamp).toLocaleDateString() === date)
        .map((a) => ({
          Name: a.name,
          Enrollment: a.enrollNo,
          Subject: a.subject,
          Time: new Date(a.timestamp).toLocaleTimeString(),
          Date: date,
          Parent_Email: a.parentEmail,
        }));

      const ws = window.XLSX.utils.json_to_sheet(dailyData);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      window.XLSX.writeFile(wb, `Attendance_${date.replace(/\//g, "-")}.xlsx`);
    });

    showMsg("Excel files generated by date!");
  };

  // Scanning Loop
  useEffect(() => {
    let animationFrameId;
    const scanQRCode = () => {
      if (
        activeTab === "scan" &&
        isStreaming &&
        videoRef.current &&
        canvasRef.current &&
        window.jsQR
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
          const code = window.jsQR(
            imageData.data,
            imageData.width,
            imageData.height,
            {
              inversionAttempts: "dontInvert",
            }
          );

          if (code) {
            const success = markAttendance(code.data);
            if (success) {
              setIsStreaming(false);
              setTimeout(() => setIsStreaming(true), 3000);
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanQRCode);
    };

    if (activeTab === "scan" && isTeacherAuthenticated) {
      scanQRCode();
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    activeTab,
    isStreaming,
    isTeacherAuthenticated,
    students,
    currentSubject,
  ]);

  const handleRegister = (e) => {
    e.preventDefault();
    const existing = students.find((s) => s.enrollNo === formData.enrollNo);
    if (existing) {
      setActiveStudent(existing);
      setActiveTab("qr_result");
      return;
    }
    const newStudent = {
      id: crypto.randomUUID(),
      name: formData.name.toUpperCase(),
      enrollNo: formData.enrollNo,
      parentEmail: formData.parentEmail,
      createdAt: new Date().toISOString(),
    };
    setStudents((prev) => [...prev, newStudent]);
    setActiveStudent(newStudent);
    setActiveTab("qr_result");
    showMsg("Registration Successful!");
  };

  const downloadIDCard = async () => {
    if (!cardRef.current || !window.html2canvas) return;
    showMsg("Generating Image...");
    try {
      const canvas = await window.html2canvas(cardRef.current, {
        useCORS: true,
        scale: 3,
      });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `ID_${activeStudent.enrollNo}.png`;
      link.click();
    } catch (err) {
      showMsg("Error downloading", "error");
    }
  };

  // Camera logic
  useEffect(() => {
    let stream = null;
    if (activeTab === "scan" && isTeacherAuthenticated) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().then(() => setIsStreaming(true));
          }
        });
    }
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [activeTab, isTeacherAuthenticated, retryCount]);

  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-6">
          <div
            onClick={() => {
              setUserRole("student");
              setActiveTab("register");
            }}
            className="bg-white p-12 rounded-[2.5rem] shadow-sm border border-slate-200 cursor-pointer hover:shadow-xl transition-all"
          >
            <div className="bg-indigo-600 w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6">
              <Users size={28} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Student Portal
            </h2>
            <p className="text-slate-500 mb-8">
              Register, check history & download ID.
            </p>
            <div className="flex items-center gap-2 text-indigo-600 font-bold">
              Go to Portal <ArrowRight size={18} />
            </div>
          </div>
          <div
            onClick={() => {
              setUserRole("teacher");
              setActiveTab("login");
            }}
            className="bg-slate-900 p-12 rounded-[2.5rem] shadow-2xl cursor-pointer hover:-translate-y-1 transition-all"
          >
            <div className="bg-white/10 w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 border border-white/20">
              <Lock size={28} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Faculty Admin
            </h2>
            <p className="text-slate-400 mb-8">
              Manage database & scan QR codes.
            </p>
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              Login <ArrowRight size={18} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF] pb-12 font-sans text-slate-900">
      <nav className="bg-white border-b sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <GraduationCap size={20} />
            </div>
            <h1 className="font-bold text-slate-900 text-lg">SafeAttend.</h1>
          </div>
          <button
            onClick={() => {
              setUserRole(null);
              setIsTeacherAuthenticated(false);
              setActiveStudent(null);
              setActiveTab("register");
            }}
            className="text-slate-400 font-bold text-xs uppercase flex items-center gap-2"
          >
            <LogOut size={16} /> Exit
          </button>
        </div>
      </nav>

      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100]">
          <div
            className={`px-6 py-3 rounded-2xl shadow-xl border font-bold text-sm bg-white ${
              notification.type === "error"
                ? "text-rose-600 border-rose-100"
                : "text-emerald-600 border-emerald-100"
            }`}
          >
            {notification.text}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-6">
        {userRole === "student" && (
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit mx-auto mb-10">
            <button
              onClick={() => setActiveTab("register")}
              className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                activeTab === "register" || activeTab === "qr_result"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Registration
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                activeTab === "history"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Check History
            </button>
          </div>
        )}

        {userRole === "student" && activeTab === "register" && (
          <div className="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] border border-slate-200">
            <h2 className="text-2xl font-bold mb-8 text-slate-800">
              Student Register
            </h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. RAHUL SHARMA"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 font-bold uppercase"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">
                  Enrollment No
                </label>
                <input
                  type="text"
                  placeholder="e.g. 240346..."
                  required
                  value={formData.enrollNo}
                  onChange={(e) =>
                    setFormData({ ...formData, enrollNo: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">
                  Parents Email (For Alerts)
                </label>
                <input
                  type="email"
                  placeholder="parents@example.com"
                  required
                  value={formData.parentEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, parentEmail: e.target.value })
                  }
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 font-bold"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4.5 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg mt-4 hover:bg-indigo-700"
              >
                GENERATE ID CARD
              </button>
            </form>
          </div>
        )}

        {userRole === "student" && activeTab === "history" && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-6">Attendance Lookup</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Enrollment No"
                  className="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:border-indigo-500"
                  value={historyLookup}
                  onChange={(e) => setHistoryLookup(e.target.value)}
                />
              </div>
            </div>

            {historyLookup && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <History size={20} className="text-indigo-600" /> Attendance
                  Records
                </h3>
                <div className="space-y-3">
                  {attendance.filter((a) => a.enrollNo === historyLookup)
                    .length > 0 ? (
                    attendance
                      .filter((a) => a.enrollNo === historyLookup)
                      .map((log) => (
                        <div
                          key={log.id}
                          className="flex justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {log.subject}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">
                              {new Date(log.timestamp).toLocaleDateString()} at{" "}
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex items-center text-emerald-600 font-black text-[10px] uppercase tracking-wider">
                            PRESENT <CheckCircle size={14} className="ml-1" />
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-center text-slate-300 text-xs italic py-8">
                      No records found for this enrollment.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {userRole === "student" &&
          activeTab === "qr_result" &&
          activeStudent && (
            <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
              <div
                ref={cardRef}
                className="bg-white p-10 rounded-[3rem] text-center border border-slate-100 shadow-2xl relative overflow-hidden min-h-[580px] flex flex-col items-center"
              >
                <div className="absolute top-0 left-0 w-full h-4 bg-indigo-600" />
                <div className="mt-8 bg-indigo-600 p-4 rounded-2xl text-white inline-block shadow-lg">
                  <GraduationCap size={32} />
                </div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-8 mb-4">
                  STUDENT ID CARD
                </p>
                <div className="bg-[#f8faff] p-8 rounded-[2.5rem] border border-indigo-50 flex justify-center mb-8 w-full max-w-[260px]">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${activeStudent.enrollNo}`}
                    alt="QR"
                    className="w-44 h-44"
                    crossOrigin="anonymous"
                  />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                  {activeStudent.name}
                </h3>
                <div className="bg-indigo-600 w-full py-4 rounded-[2rem] text-white font-black text-lg shadow-xl shadow-indigo-100 mb-6">
                  {activeStudent.enrollNo}
                </div>
                <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase mb-6">
                  <Mail size={12} /> {activeStudent.parentEmail}
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.1em]">
                  SAFEATTEND SYSTEM PASS
                </p>
              </div>
              <button
                onClick={downloadIDCard}
                className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <Download size={20} /> SAVE ID TO PHONE
              </button>
            </div>
          )}

        {userRole === "teacher" &&
          activeTab === "login" &&
          !isTeacherAuthenticated && (
            <div className="max-w-md mx-auto bg-white p-10 rounded-[2.5rem] border border-slate-200">
              <h2 className="text-2xl font-bold mb-6 text-slate-800">
                Faculty Login
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (loginData.password === "1234") {
                    setIsTeacherAuthenticated(true);
                    setActiveTab("dashboard");
                  }
                }}
                className="space-y-4"
              >
                <input
                  type="text"
                  placeholder="Admin ID"
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none"
                  onChange={(e) =>
                    setLoginData({ ...loginData, id: e.target.value })
                  }
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none"
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                />
                <button
                  type="submit"
                  className="w-full py-4.5 bg-slate-900 text-white font-bold rounded-2xl mt-4"
                >
                  Login
                </button>
              </form>
            </div>
          )}

        {isTeacherAuthenticated && (
          <div className="space-y-6">
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit mx-auto mb-8">
              {["dashboard", "scan", "logs"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                    activeTab === tab
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "dashboard" && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-8 flex justify-between items-center border-b">
                  <h2 className="font-bold flex items-center gap-2">
                    <Users size={20} className="text-indigo-600" /> Students
                    Database
                  </h2>
                  <input
                    type="text"
                    placeholder="Search name..."
                    className="px-4 py-2 bg-slate-50 border rounded-xl outline-none focus:border-indigo-500"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
                      <tr>
                        <th className="px-8 py-4">Student Info</th>
                        <th className="px-8 py-4">Parent Email</th>
                        <th className="px-8 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students
                        .filter((s) =>
                          s.name.includes(searchTerm.toUpperCase())
                        )
                        .map((s) => (
                          <tr
                            key={s.id}
                            className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-8 py-5">
                              <div className="font-bold text-slate-800">
                                {s.name}
                              </div>
                              <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                                {s.enrollNo}
                              </div>
                            </td>
                            <td className="px-8 py-5 text-sm text-slate-500">
                              {s.parentEmail}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <button
                                onClick={() =>
                                  setStudents(
                                    students.filter((x) => x.id !== s.id)
                                  )
                                }
                                className="p-2 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-500 transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "scan" && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-indigo-600 p-6 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl shadow-indigo-100">
                  <div className="flex items-center gap-3">
                    <BookOpen size={24} />
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-70">
                        Current Subject
                      </p>
                      <select
                        className="bg-transparent font-bold text-xl outline-none"
                        value={currentSubject}
                        onChange={(e) => setCurrentSubject(e.target.value)}
                      >
                        <option className="text-slate-900" value="Mathematics">
                          Mathematics
                        </option>
                        <option className="text-slate-900" value="Physics">
                          Physics
                        </option>
                        <option className="text-slate-900" value="Chemistry">
                          Chemistry
                        </option>
                        <option className="text-slate-900" value="Programming">
                          Programming
                        </option>
                        <option className="text-slate-900" value="English">
                          English
                        </option>
                      </select>
                    </div>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-[10px] font-bold uppercase opacity-70">
                      Date
                    </p>
                    <p className="font-bold text-xl">
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-slate-900 p-8 rounded-[3rem] text-center relative overflow-hidden shadow-2xl">
                    <div className="aspect-square bg-black rounded-3xl overflow-hidden relative mb-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 border-[30px] border-black/40"></div>
                      <div className="absolute inset-[30px] border-2 border-indigo-500 rounded-xl">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.8)] animate-scan-line"></div>
                      </div>
                      {!isStreaming && (
                        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                          <button
                            onClick={() => setRetryCount((c) => c + 1)}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg"
                          >
                            <Play fill="white" size={16} /> Start Scanner
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-200 flex flex-col justify-center shadow-sm">
                    <h3 className="font-bold mb-6 flex items-center gap-2">
                      <Keyboard size={20} className="text-indigo-600" /> Manual
                      Attendance
                    </h3>
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Student Enrollment No"
                        className="w-full p-5 bg-slate-50 border rounded-2xl font-bold outline-none focus:border-indigo-500"
                        value={manualEnroll}
                        onChange={(e) => setManualEnroll(e.target.value)}
                      />
                      <button
                        onClick={() => markAttendance(manualEnroll)}
                        className="w-full py-5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg"
                      >
                        Mark Present
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "logs" && (
              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-8 flex justify-between items-center border-b flex-wrap gap-4">
                  <h2 className="font-bold flex items-center gap-2">
                    <Calendar size={20} className="text-indigo-600" />{" "}
                    Attendance Records
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={exportToExcel}
                      className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all"
                    >
                      <FileSpreadsheet size={16} /> Export Excel (by Date)
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="px-8 py-4">Student & Subject</th>
                        <th className="px-8 py-4">Date & Time</th>
                        <th className="px-8 py-4">Parents Notified</th>
                        <th className="px-8 py-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((a) => (
                        <tr
                          key={a.id}
                          className="border-b last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-8 py-5">
                            <div className="font-bold text-slate-800">
                              {a.name}
                            </div>
                            <div className="text-[10px] text-indigo-500 font-bold tracking-wider">
                              {a.enrollNo} • {a.subject}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-xs font-bold text-slate-700">
                              {new Date(a.timestamp).toLocaleDateString()}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold">
                              {new Date(a.timestamp).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail size={12} /> {a.parentEmail}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right font-black text-emerald-500 text-[10px] tracking-widest">
                            PRESENT
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    +
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes scan-line {
          0% { top: 0% }
          100% { top: 100% }
        }
        .animate-scan-line {
          position: absolute;
          animation: scan-line 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
