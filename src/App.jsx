import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  Calculator, 
  Settings, 
  Zap, 
  Wrench, 
  Clock, 
  Coins, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Info,
  RefreshCcw,
  Factory,
  Save,
  History,
  Trash2,
  ExternalLink,
  Loader2,
  Eraser
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDzXTKNRMMZv8p0hl8np_kC86YmnlenIt0",
  authDomain: "pump-tco-calculator.firebaseapp.com",
  projectId: "pump-tco-calculator",
  storageBucket: "pump-tco-calculator.firebasestorage.app",
  messagingSenderId: "697088863146",
  appId: "1:697088863146:web:2b8eefe8b060ba80c919d3"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'pump-tco-calculator';

const App = () => {
  const [user, setUser] = useState(null);
  const [savedRecords, setSavedRecords] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [recordName, setRecordName] = useState('');
  
  // Empty State for Reset
  const emptyInputs = {
    initialCost: 0,
    powerRating: 0,
    operatingHours: 0,
    electricityCost: 0,
    maintenanceCost: 0,
    lifecycle: 1
  };

  // Input States (Keep as numbers for calculation)
  const [inputs, setInputs] = useState({
    initialCost: 150000,
    powerRating: 22,
    operatingHours: 6000,
    electricityCost: 4.50,
    maintenanceCost: 15000,
    lifecycle: 10
  });

  // 1. Authentication Setup
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Data Fetching
  useEffect(() => {
    if (!user) return;

    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'calculations');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedRecords(docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Formatting helpers
  const formatDisplayValue = (val) => {
    if (val === undefined || val === null || val === '' || val === 0) return '';
    const parts = val.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
  };

  const parseDisplayValue = (val) => {
    return val.replace(/,/g, '');
  };

  // Calculation Logic
  const results = useMemo(() => {
    const annualEnergyCost = (parseFloat(inputs.powerRating) || 0) * (parseFloat(inputs.operatingHours) || 0) * (parseFloat(inputs.electricityCost) || 0);
    const totalEnergyCost = annualEnergyCost * (parseFloat(inputs.lifecycle) || 0);
    const totalMaintenanceCost = (parseFloat(inputs.maintenanceCost) || 0) * (parseFloat(inputs.lifecycle) || 0);
    const totalTCO = (parseFloat(inputs.initialCost) || 0) + totalEnergyCost + totalMaintenanceCost;
    const averageYearlyCost = totalTCO / (parseFloat(inputs.lifecycle) || 1);

    return {
      annualEnergyCost,
      totalEnergyCost,
      totalMaintenanceCost,
      totalTCO,
      averageYearlyCost,
      percentages: {
        initial: ((parseFloat(inputs.initialCost) || 0) / (totalTCO || 1)) * 100,
        energy: (totalEnergyCost / (totalTCO || 1)) * 100,
        maintenance: (totalMaintenanceCost / (totalTCO || 1)) * 100
      }
    };
  }, [inputs]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = parseDisplayValue(value);
    
    // Allow only numbers and one decimal point
    if (cleanValue !== '' && !/^\d*\.?\d*$/.test(cleanValue)) return;

    setInputs(prev => ({ 
      ...prev, 
      [name]: cleanValue === '' ? 0 : cleanValue 
    }));
  };

  const resetInputs = () => {
    setInputs(emptyInputs);
  };

  const saveCalculation = async () => {
    if (!user || !recordName.trim()) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'calculations'), {
        name: recordName,
        inputs,
        results,
        createdAt: serverTimestamp()
      });
      setRecordName('');
    } catch (error) {
      console.error("Save Error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecord = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'calculations', id));
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      </div>

      <main className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-900/20">
              <Factory className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Pump TCO Engine <span className="text-blue-500 font-normal">Pro</span></h1>
              <p className="text-slate-500 text-sm">วิเคราะห์ต้นทุนพลังงานและการจัดรูปแบบตัวเลข</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">User Identity</p>
              <p className="text-xs text-blue-400 font-mono">{user?.uid || 'Authenticating...'}</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                  <Settings className="w-4 h-4" /> Parameters
                </h2>
                <button 
                  onClick={resetInputs}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-red-400/30"
                >
                  <Eraser className="w-3 h-3" /> ล้างข้อมูล
                </button>
              </div>
              
              <div className="space-y-4">
                <InputField 
                  label="ราคาเครื่องและการติดตั้ง" 
                  name="initialCost" 
                  value={formatDisplayValue(inputs.initialCost)} 
                  onChange={handleInputChange} 
                  unit="บาท" 
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputField 
                    label="กำลังไฟฟ้า (kW)" 
                    name="powerRating" 
                    value={formatDisplayValue(inputs.powerRating)} 
                    onChange={handleInputChange} 
                    unit="kW" 
                  />
                  <InputField 
                    label="ชม. ใช้งาน/ปี" 
                    name="operatingHours" 
                    value={formatDisplayValue(inputs.operatingHours)} 
                    onChange={handleInputChange} 
                    unit="Hrs" 
                  />
                </div>
                <InputField 
                  label="ค่าไฟฟ้าต่อหน่วย" 
                  name="electricityCost" 
                  value={formatDisplayValue(inputs.electricityCost)} 
                  onChange={handleInputChange} 
                  unit="บาท" 
                />
                <InputField 
                  label="ค่าบำรุงรักษา/ปี" 
                  name="maintenanceCost" 
                  value={formatDisplayValue(inputs.maintenanceCost)} 
                  onChange={handleInputChange} 
                  unit="บาท" 
                />
                
                <div className="pt-4 border-t border-white/5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-2">
                    <span>อายุการใช้งาน</span>
                    <span className="text-blue-400">{inputs.lifecycle} ปี</span>
                  </div>
                  <input type="range" name="lifecycle" min="1" max="25" value={inputs.lifecycle} onChange={handleInputChange} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>

                <div className="pt-6 flex gap-2">
                  <input 
                    type="text" 
                    placeholder="ชื่อรายการบันทึก..." 
                    value={recordName}
                    onChange={(e) => setRecordName(e.target.value)}
                    className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                  <button 
                    onClick={saveCalculation}
                    disabled={isSaving || !recordName}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                <History className="w-4 h-4" /> ประวัติการคำนวณ
              </h2>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {savedRecords.length === 0 ? (
                  <p className="text-xs text-slate-600 italic text-center py-8">ไม่มีรายการที่บันทึกไว้</p>
                ) : (
                  savedRecords.map((rec) => (
                    <div key={rec.id} className="group bg-slate-800/30 border border-slate-800 p-3 rounded-2xl flex items-center justify-between hover:border-blue-500/50 transition-all">
                      <button 
                        onClick={() => setInputs(rec.inputs)}
                        className="text-left flex-1"
                      >
                        <p className="text-sm font-bold text-slate-200 truncate">{rec.name}</p>
                        <p className="text-[10px] text-slate-500">{formatCurrency(rec.results.totalTCO)}</p>
                      </button>
                      <button 
                        onClick={() => deleteRecord(rec.id)}
                        className="text-slate-600 hover:text-red-400 p-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-gradient-to-br from-blue-700 to-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <p className="text-blue-100/50 text-xs font-bold uppercase tracking-[0.2em] mb-4">Total Cost of Ownership</p>
                <h2 className="text-5xl md:text-8xl font-black tracking-tighter mb-10">
                  {formatCurrency(results.totalTCO)}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 border-t border-white/10">
                  <ResultStat label="ต้นทุนพลังงานรวม" value={formatCurrency(results.totalEnergyCost)} />
                  <ResultStat label="ค่าซ่อมบำรุงรวม" value={formatCurrency(results.totalMaintenanceCost)} />
                  <ResultStat label="เฉลี่ยต่อปี" value={formatCurrency(results.averageYearlyCost)} highlight />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8">
                <h3 className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-widest flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4" /> สัดส่วนค่าใช้จ่าย (%)
                </h3>
                <div className="space-y-6">
                  <MiniProgress label="ตัวเครื่อง" percent={results.percentages.initial} color="bg-slate-400" />
                  <MiniProgress label="ไฟฟ้า" percent={results.percentages.energy} color="bg-blue-500" />
                  <MiniProgress label="ซ่อมบำรุง" percent={results.percentages.maintenance} color="bg-emerald-500" />
                </div>
              </div>

              <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 flex flex-col justify-center items-center text-center">
                <div className="p-4 bg-emerald-500/10 rounded-full mb-4">
                  <TrendingUp className="w-8 h-8 text-emerald-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">บทวิเคราะห์</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {results.totalTCO > 0 ? (
                    <>
                      ต้นทุนปั๊มตัวนี้ส่วนใหญ่มาจาก <strong>{results.percentages.energy > 50 ? 'พลังงานไฟฟ้า' : 'ค่าตัวเครื่อง'}</strong> 
                      {results.percentages.energy > 50 
                        ? ' แนะนำให้เลือกปั๊มที่มีประสิทธิภาพสูงเพื่อลดต้นทุน' 
                        : ' ค่าเครื่องเป็นต้นทุนหลัก ควรเน้นการต่อรองราคาจัดซื้อ'}
                    </>
                  ) : (
                    "กรุณากรอกข้อมูลเพื่อเริ่มการวิเคราะห์ต้นทุน"
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Sub Components ---
const InputField = ({ label, name, value, onChange, unit }) => (
  <div>
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">{label}</label>
    <div className="relative">
      <input 
        type="text" 
        name={name} 
        value={value} 
        onChange={onChange}
        inputMode="decimal"
        placeholder="0"
        className="w-full bg-slate-800/40 border border-slate-800 rounded-xl py-2.5 px-4 text-white font-bold focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-700"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 uppercase">{unit}</span>
    </div>
  </div>
);

const ResultStat = ({ label, value, highlight }) => (
  <div>
    <p className="text-[10px] text-blue-100/40 uppercase font-bold mb-1">{label}</p>
    <p className={`text-xl font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
  </div>
);

const MiniProgress = ({ label, percent, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs font-bold">
      <span className="text-slate-500">{label}</span>
      <span className="text-white">{isNaN(percent) ? '0.0' : percent.toFixed(1)}%</span>
    </div>
    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
      <div style={{ width: `${isNaN(percent) ? 0 : percent}%` }} className={`h-full ${color} transition-all duration-1000`} />
    </div>
  </div>
);

export default App;