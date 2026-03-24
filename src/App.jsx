import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Factory,
  Save,
  History,
  Trash2,
  Eraser,
  Zap,
  Info,
  CheckCircle2,
  Sparkles,
  Loader2,
  MessageSquare
} from 'lucide-react';

const App = () => {
  // --- Gemini API Setup ---
  const apiKey = ""; 

  // ข้อมูล Input
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

  // Load / Save LocalStorage
  useEffect(() => {
    const localData = localStorage.getItem('pump_tco_history');
    if (localData) {
      try { setSavedRecords(JSON.parse(localData)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pump_tco_history', JSON.stringify(savedRecords));
  }, [savedRecords]);

  // คำนวณ TCO
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

  // Gemini AI Analysis
  const generateAiAnalysis = async (retryCount = 0) => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    const systemPrompt = "คุณคือผู้เชี่ยวชาญด้านวิศวกรรมปั๊มน้ำ วิเคราะห์ข้อมูล TCO และสรุปคำแนะนำสั้นๆ แต่ทรงพลัง";
    const userPrompt = `วิเคราะห์ TCO: ราคา:${inputs.initialCost}, มอเตอร์:${inputs.powerRating}kW, รัน:${inputs.operatingHours}ชม/ปี, ค่าไฟ:${inputs.electricityCost}, อายุ:${inputs.lifecycle}ปี, รวม:${results.totalTCO}บาท. สรุป 3 หัวข้อ: ความคุ้มค่า, จุดระวัง, เทคนิคประหยัดพลังงาน`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) setAiAnalysis(text);
    } catch (error) {
      if (retryCount < 3) {
        setTimeout(() => generateAiAnalysis(retryCount + 1), 1000);
      } else {
        setAiAnalysis("ไม่สามารถติดต่อ AI ได้ในขณะนี้");
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/,/g, '');
    if (cleanValue !== '' && !/^\d*\.?\d*$/.test(cleanValue)) return;
    setInputs(prev => ({ ...prev, [name]: cleanValue === '' ? 0 : cleanValue }));
    setAiAnalysis(null);
  };

  const saveRecord = () => {
    if (!recordName.trim()) return;
    const newRecord = {
      id: Date.now(),
      name: recordName,
      inputs: { ...inputs },
      results: { ...results },
      date: new Date().toLocaleDateString('th-TH')
    };
    setSavedRecords([newRecord, ...savedRecords]);
    setRecordName('');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { 
    style: 'currency', 
    currency: 'THB', 
    maximumFractionDigits: 0 
  }).format(val || 0);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans antialiased overflow-x-hidden">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold">บันทึกสำเร็จ</span>
        </div>
      )}

      {/* Main Container - Full Width on Large Screens */}
      <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 lg:p-12">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-white/5 pb-8">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl shadow-blue-500/20">
              <Factory className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter italic uppercase">Pump TCO <span className="text-blue-500">Max</span></h1>
              <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Enterprise Grade Analysis • Full Screen Optimized</p>
            </div>
          </div>
        </header>

        {/* Desktop Grid (4:8) | Mobile Stack (1:1) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Inputs & History */}
          <div className="lg:col-span-4 space-y-8">
            <section className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-6 md:p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-500" /> ข้อมูลตัวแปร
                </h2>
                <button onClick={() => setInputs({initialCost:0, powerRating:0, operatingHours:0, electricityCost:0, maintenanceCost:0, lifecycle:1})} className="text-[10px] text-slate-600 hover:text-red-400 font-bold uppercase">
                  Reset
                </button>
              </div>

              <div className="space-y-6">
                <InputField label="ราคาเครื่อง + ติดตั้ง" name="initialCost" value={inputs.initialCost} onChange={handleInputChange} unit="บาท" />
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <InputField label="กำลังมอเตอร์" name="powerRating" value={inputs.powerRating} onChange={handleInputChange} unit="kW" />
                  <InputField label="รันเครื่อง/ปี" name="operatingHours" value={inputs.operatingHours} onChange={handleInputChange} unit="ชม." />
                </div>
                <InputField label="อัตราค่าไฟฟ้า" name="electricityCost" value={inputs.electricityCost} onChange={handleInputChange} unit="฿/kWh" />
                <InputField label="ค่าซ่อมบำรุง/ปี" name="maintenanceCost" value={inputs.maintenanceCost} onChange={handleInputChange} unit="บาท" />
                
                <div className="pt-4">
                  <div className="flex justify-between text-[10px] font-black mb-4 text-slate-500 uppercase tracking-widest">
                    <span>ระยะเวลาโครงการ</span>
                    <span className="text-blue-400 font-mono text-base">{inputs.lifecycle} ปี</span>
                  </div>
                  <input type="range" name="lifecycle" min="1" max="25" value={inputs.lifecycle} onChange={handleInputChange} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-3">
                  <input type="text" placeholder="ตั้งชื่อโปรเจกต์..." value={recordName} onChange={(e) => setRecordName(e.target.value)} className="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none text-white" />
                  <button onClick={saveRecord} disabled={!recordName.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 px-6 py-3 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-white flex justify-center">
                    <Save size={20} />
                  </button>
                </div>
              </div>
            </section>

            {/* History - Hidden on very small screens or scrollable */}
            <section className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-6 md:p-8">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" /> ประวัติบันทึกล่าสุด
              </h2>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {savedRecords.map(rec => (
                  <div key={rec.id} className="group bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex justify-between items-center hover:border-blue-500/30 transition-all cursor-pointer">
                    <div onClick={() => { setInputs(rec.inputs); setAiAnalysis(null); }} className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-200 truncate">{rec.name}</p>
                      <p className="text-[10px] font-mono text-blue-400 mt-1">{formatCurrency(rec.results.totalTCO)}</p>
                    </div>
                    <button onClick={() => setSavedRecords(savedRecords.filter(r => r.id !== rec.id))} className="text-slate-700 hover:text-red-500 p-2">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Panel: Results & AI */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Massive Result Card */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 rounded-[3rem] p-8 md:p-16 text-white shadow-2xl relative overflow-hidden group border border-white/5">
              <div className="absolute top-0 right-0 p-10 opacity-5 scale-[2.5] text-white"><Factory size={200} /></div>
              
              <div className="relative z-10">
                <div className="px-4 py-1 bg-white/5 rounded-full inline-block text-[10px] font-black uppercase tracking-[0.4em] text-blue-300 mb-6 border border-white/10">
                  Total Life Cycle Cost (TCO)
                </div>
                {/* Fluid Typography for the main number */}
                <h2 className="text-5xl sm:text-7xl md:text-8xl xl:text-9xl font-black tracking-tighter mb-12 leading-none">
                  {formatCurrency(results.totalTCO)}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 pt-12 border-t border-white/10">
                  <StatItem label="ต้นทุนค่าพลังงาน" value={formatCurrency(results.totalEnergyCost)} icon={<Zap size={16}/>} />
                  <StatItem label="ต้นทุนซ่อมบำรุง" value={formatCurrency(results.totalMaintenanceCost)} />
                  <StatItem label="เฉลี่ยต้นทุนต่อปี" value={formatCurrency(results.averageYearlyCost)} highlight />
                </div>
              </div>
            </div>

            {/* AI Engineering Insights */}
            <div className="bg-[#0f172a] border-2 border-blue-500/20 rounded-[3rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tight">AI Engineering Insights</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Optimized by Gemini Pro Intelligence</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => generateAiAnalysis()}
                  disabled={isAiLoading}
                  className="w-full xl:w-auto flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black text-xs md:text-sm transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                >
                  {isAiLoading ? (
                    <><Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> กำลังประมวลผล...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 md:w-5 md:h-5" /> วิเคราะห์เชิงลึกด้วย AI</>
                  )}
                </button>
              </div>

              <div className="relative min-h-[160px] bg-slate-950/50 rounded-[2rem] p-6 md:p-8 border border-white/5">
                {aiAnalysis ? (
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-wrap font-medium text-sm md:text-base leading-relaxed text-slate-300">
                      {aiAnalysis}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="w-10 h-10 text-slate-800 mb-4" />
                    <p className="text-slate-500 text-sm italic">กดปุ่มเพื่อรับคำแนะนำการประหยัดพลังงานระดับมืออาชีพ</p>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-8 md:p-10">
                <h3 className="text-[10px] font-black text-slate-400 mb-10 uppercase tracking-[0.2em] flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-blue-500" /> Cost Breakdown
                </h3>
                <div className="space-y-8">
                  <PercentageBar label="Capex (Initial)" percent={results.percentages.initial} color="bg-slate-600" />
                  <PercentageBar label="Energy (Operating)" percent={results.percentages.energy} color="bg-blue-500" />
                  <PercentageBar label="Maintenance (Opex)" percent={results.percentages.maintenance} color="bg-emerald-500" />
                </div>
              </div>

              <div className="bg-blue-600/5 border border-blue-500/10 rounded-[2.5rem] p-8 md:p-10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 text-blue-400">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-white mb-2 italic tracking-tight">Financial Summary</h4>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  {results.percentages.energy > 70 
                    ? "ค่าพลังงานสูงเกิน 70% การลงทุนในปั๊มคุณภาพสูงและระบบควบคุมอัจฉริยะจะช่วยลดต้นทุนรวมได้อย่างมหาศาล" 
                    : "โครงสร้างต้นทุนมีความสมดุล ควรให้ความสำคัญกับการยืดอายุการใช้งานผ่านการบำรุงรักษาเชิงรุก"}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">
          Professional Asset Management Tool • Version 2.5
        </footer>
      </div>
    </div>
  );
};

// Sub-components
const InputField = ({ label, name, value, onChange, unit }) => (
  <div className="group">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 block group-focus-within:text-blue-500 transition-colors">{label}</label>
    <div className="relative">
      <input 
        type="text" 
        name={name} 
        value={new Intl.NumberFormat().format(value || 0)} 
        onChange={onChange} 
        inputMode="decimal" 
        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3.5 px-5 text-sm md:text-base font-bold text-white focus:border-blue-500 outline-none transition-all pr-14" 
      />
      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-600 uppercase">{unit}</span>
    </div>
  </div>
);

const StatItem = ({ label, value, highlight, icon }) => (
  <div className="min-w-0">
    <p className="text-[10px] text-blue-100/40 uppercase font-black tracking-widest mb-2 flex items-center gap-2 truncate">{icon} {label}</p>
    <p className={`text-xl md:text-2xl xl:text-3xl font-black tracking-tight ${highlight ? 'text-emerald-400' : 'text-white'} truncate`}>{value}</p>
  </div>
);

const PercentageBar = ({ label, percent, color }) => (
  <div className="space-y-3">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
      <span className="text-slate-500">{label}</span>
      <span className="text-white font-mono">{percent.toFixed(1)}%</span>
    </div>
    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
      <div 
        style={{ width: `${percent}%` }} 
        className={`h-full ${color} transition-all duration-1000 ease-out`} 
      />
    </div>
  </div>
);

export default App;