import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, query, deleteDoc } from 'firebase/firestore';
import { 
  Settings, TrendingUp, PieChart as PieChartIcon, Factory, Save, 
  History, Trash2, Zap, CheckCircle2, Sparkles, Loader2, 
  MessageSquare, LayoutDashboard, Database, Info, Cpu
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'pump-tco-pro-max';

const App = () => {
  const apiKey = ""; // Gemini API Key
  const [user, setUser] = useState(null);
  const [inputs, setInputs] = useState({
    initialCost: 150000,
    powerRating: 22,
    operatingHours: 6000,
    electricityCost: 4.50,
    maintenanceCost: 15000,
    lifecycle: 10
  });

  const [savedRecords, setSavedRecords] = useState([]);
  const [recordName, setRecordName] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- Auth & Data Fetching (Cloud) ---
  useEffect(() => {
    const initAuth = async () => {
      await signInAnonymously(auth);
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'records');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedRecords(docs);
    }, (err) => console.error("Firestore Error:", err));
    return () => unsubscribe();
  }, [user]);

  // --- Calculations ---
  const results = useMemo(() => {
    const pwr = parseFloat(inputs.powerRating) || 0;
    const hrs = parseFloat(inputs.operatingHours) || 0;
    const cost = parseFloat(inputs.electricityCost) || 0;
    const life = parseFloat(inputs.lifecycle) || 1;
    const init = parseFloat(inputs.initialCost) || 0;
    const maint = parseFloat(inputs.maintenanceCost) || 0;

    const annualEnergy = pwr * hrs * cost;
    const totalEnergy = annualEnergy * life;
    const totalMaint = maint * life;
    const totalTCO = init + totalEnergy + totalMaint;

    return {
      totalEnergyCost: totalEnergy,
      totalMaintenanceCost: totalMaint,
      totalTCO,
      averageYearlyCost: totalTCO / life,
      percentages: {
        initial: (init / (totalTCO || 1)) * 100,
        energy: (totalEnergy / (totalTCO || 1)) * 100,
        maintenance: (totalMaint / (totalTCO || 1)) * 100
      }
    };
  }, [inputs]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/,/g, '');
    if (cleanValue !== '' && !/^\d*\.?\d*$/.test(cleanValue)) return;
    setInputs(prev => ({ ...prev, [name]: cleanValue === '' ? 0 : Number(cleanValue) }));
  };

  const saveToCloud = async () => {
    if (!user || !recordName.trim()) return;
    const docId = Date.now().toString();
    const recordRef = doc(db, 'artifacts', appId, 'users', user.uid, 'records', docId);
    await setDoc(recordRef, {
      name: recordName,
      inputs,
      results,
      createdAt: new Date().toISOString()
    });
    setRecordName('');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const deleteFromCloud = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'records', id));
  };

  const generateAiAnalysis = async () => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    const prompt = `Analyze TCO: Initial ${inputs.initialCost}, Motor ${inputs.powerRating}kW, Ops ${inputs.operatingHours}h/yr, Rate ${inputs.electricityCost}, Life ${inputs.lifecycle}yr. Total: ${results.totalTCO}. Give 3 specific tips in Thai for an engineer to reduce costs.`;
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      setAiAnalysis(data.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch (e) {
      setAiAnalysis("ไม่สามารถวิเคราะห์ได้ในขณะนี้");
    } finally {
      setIsAiLoading(false);
    }
  };

  const formatNum = (v) => new Intl.NumberFormat('th-TH').format(v || 0);
  const formatCurr = (v) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(v || 0);

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-300 font-sans selection:bg-blue-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-900/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 blur-[150px] rounded-full" />
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={20} /> <span className="font-bold">บันทึกข้อมูลสำเร็จ</span>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12 relative z-10">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-600/30 rotate-3">
              <Factory className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter italic uppercase">PUMP TCO <span className="text-blue-500 font-normal">PRO</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enterprise Cloud Sync Active</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col lg:items-end text-slate-500">
             <span className="text-[10px] font-black uppercase tracking-widest">User Identity</span>
             <span className="text-xs font-mono truncate max-w-[200px]">{user?.uid || 'Anonymous'}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Input Dashboard */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-10 text-blue-400">
                <LayoutDashboard size={20} />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Parameter Set</h2>
              </div>

              <div className="space-y-8">
                <CustomInput label="ราคาเครื่อง + ติดตั้ง" name="initialCost" value={inputs.initialCost} onChange={handleInputChange} unit="฿" />
                
                <div className="grid grid-cols-2 gap-6">
                   <CustomInput label="มอเตอร์ (kW)" name="powerRating" value={inputs.powerRating} onChange={handleInputChange} unit="kW" />
                   <CustomInput label="รันเครื่อง/ปี" name="operatingHours" value={inputs.operatingHours} onChange={handleInputChange} unit="HR" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <CustomInput label="ค่าไฟ/หน่วย" name="electricityCost" value={inputs.electricityCost} onChange={handleInputChange} unit="฿" />
                  <CustomInput label="ซ่อมบำรุง/ปี" name="maintenanceCost" value={inputs.maintenanceCost} onChange={handleInputChange} unit="฿" />
                </div>

                <div className="pt-4">
                  <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                    <span>อายุโครงการ</span>
                    <span className="text-blue-500 text-lg font-mono">{inputs.lifecycle} ปี</span>
                  </div>
                  <input type="range" name="lifecycle" min="1" max="25" value={inputs.lifecycle} onChange={handleInputChange} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600" />
                </div>

                <div className="pt-8 border-t border-white/5 flex gap-3">
                  <input 
                    type="text" placeholder="ชื่อโครงการ..." value={recordName} onChange={(e) => setRecordName(e.target.value)}
                    className="flex-1 bg-black/40 border border-slate-800 rounded-2xl px-5 py-4 text-sm focus:border-blue-500/50 outline-none text-white transition-all"
                  />
                  <button onClick={saveToCloud} disabled={!recordName.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 px-6 rounded-2xl text-white transition-all active:scale-95 shadow-lg shadow-blue-600/20">
                    <Save size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* History */}
            {savedRecords.length > 0 && (
              <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Database size={14} className="text-blue-500" /> Cloud Records
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {savedRecords.map(rec => (
                    <div key={rec.id} onClick={() => { setInputs(rec.inputs); setAiAnalysis(null); }} className="group bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center hover:bg-blue-600/10 hover:border-blue-500/30 transition-all cursor-pointer">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-200 truncate">{rec.name}</p>
                        <p className="text-[10px] font-mono text-blue-500 mt-1">{formatCurr(rec.results.totalTCO)}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteFromCloud(rec.id); }} className="text-slate-700 hover:text-red-500 p-2 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Visualization Panel */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Hero Result */}
            <div className="bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 rounded-[3.5rem] p-8 md:p-16 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-5 scale-[2.5] -rotate-12 transition-transform duration-700 group-hover:rotate-0"><TrendingUp size={200} /></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 mb-8">
                  <Zap size={12} /> Total Cost of Ownership
                </div>
                
                {/* Fixed Typography: Using Responsive Font Size and Clamp */}
                <div className="flex flex-col md:flex-row md:items-baseline gap-4 mb-16">
                   <h2 className="text-[clamp(2.5rem,8vw,8rem)] font-black tracking-tighter leading-none">
                     {formatCurr(results.totalTCO)}
                   </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 pt-10 border-t border-white/10">
                  <Metric label="Energy (OpEx)" val={formatCurr(results.totalEnergyCost)} />
                  <Metric label="Maint. (OpEx)" val={formatCurr(results.totalMaintenanceCost)} />
                  <Metric label="Avg / Year" val={formatCurr(results.averageYearlyCost)} bold />
                </div>
              </div>
            </div>

            {/* AI Engineering Insights */}
            <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-8 md:p-10 shadow-xl relative">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20 animate-pulse">
                    <Cpu size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white italic tracking-tight uppercase">AI Insights</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Machine Learning Analysis</p>
                  </div>
                </div>
                
                <button 
                  onClick={generateAiAnalysis} disabled={isAiLoading}
                  className="w-full md:w-auto flex items-center justify-center gap-3 bg-white text-black hover:bg-blue-500 hover:text-white px-8 py-4 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-xl"
                >
                  {isAiLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                  วิเคราะห์ด้วย AI
                </button>
              </div>

              <div className="bg-black/30 rounded-[2.5rem] p-8 border border-white/5">
                {aiAnalysis ? (
                  <div className="text-sm md:text-lg leading-relaxed text-slate-300 font-medium whitespace-pre-wrap">
                    {aiAnalysis}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 opacity-30 italic text-sm">
                    <MessageSquare className="mb-3" /> กดปุ่มเพื่อรับคำแนะนำเชิงเทคนิค
                  </div>
                )}
              </div>
            </div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900/60 border border-white/5 rounded-[3rem] p-10">
                <h3 className="text-[10px] font-black text-slate-500 mb-8 uppercase tracking-widest flex items-center gap-2">
                  <PieChartIcon size={14} /> Cost Distribution
                </h3>
                <div className="space-y-8">
                  <ProgressRow label="Purchase (CapEx)" p={results.percentages.initial} color="bg-slate-700" />
                  <ProgressRow label="Energy Consumption" p={results.percentages.energy} color="bg-blue-500" />
                  <ProgressRow label="Maintenance Cost" p={results.percentages.maintenance} color="bg-emerald-500" />
                </div>
              </div>

              <div className="bg-blue-600/5 border border-blue-500/10 rounded-[3rem] p-10 flex flex-col justify-center text-center md:text-left relative overflow-hidden">
                <div className="absolute top-4 right-4 text-blue-500/20"><Info size={40} /></div>
                <h4 className="text-lg font-black text-white mb-3 italic">Engineer's Verdict</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {results.percentages.energy > 80 
                    ? "ค่าไฟสูงเกิน 80% ของต้นทุนรวม! การเปลี่ยนเป็นปั๊มประสิทธิภาพสูง (IE4/IE5) หรือใช้ Inverter จะลดค่าไฟลงได้มหาศาล และคืนทุนได้เร็วมาก" 
                    : "ต้นทุนค่อนข้างสมดุล ควรเน้นไปที่การบำรุงรักษาเชิงป้องกันเพื่อยืดอายุการใช้งานเครื่องจักรให้นานที่สุด"}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- Helper Components ---

const CustomInput = ({ label, name, value, onChange, unit }) => (
  <div className="group">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block group-focus-within:text-blue-500 transition-colors">{label}</label>
    <div className="relative">
      <input 
        type="text" name={name} 
        value={new Intl.NumberFormat().format(value || 0)} 
        onChange={onChange} inputMode="decimal"
        className="w-full bg-black/40 border border-slate-800 rounded-2xl py-4 px-6 text-sm md:text-base font-bold text-white focus:border-blue-500/50 outline-none transition-all pr-14"
      />
      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 uppercase tracking-tighter">{unit}</div>
    </div>
  </div>
);

const Metric = ({ label, val, bold }) => (
  <div className="min-w-0">
    <p className="text-[10px] text-blue-100/40 uppercase font-black tracking-widest mb-2">{label}</p>
    <p className={`text-xl md:text-2xl font-black truncate ${bold ? 'text-emerald-400' : 'text-white'}`}>{val}</p>
  </div>
);

const ProgressRow = ({ label, p, color }) => (
  <div className="space-y-3">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
      <span className="text-slate-500">{label}</span>
      <span className="text-white font-mono">{p.toFixed(1)}%</span>
    </div>
    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
      <div style={{ width: `${p}%` }} className={`h-full ${color} rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.3)]`} />
    </div>
  </div>
);

export default App;