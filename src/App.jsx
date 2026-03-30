import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Factory, 
  RotateCcw, 
  Zap, 
  LayoutDashboard, 
  Info, 
  ArrowRight,
  Calculator,
  Activity,
  Save,
  Trash2,
  Check,
  X,
  FileDown
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { generatePdf } from './generatePdf';

// --- Interactive Sidebar Components ---
const App = () => {
  const [inputs, setInputs] = useState({
    initialCost: "150000",
    powerRating: "22",
    operatingHours: "6000",
    electricityCost: "4.50",
    maintenanceCost: "15000",
    lifecycle: "10"
  });

  const [savedScenarios, setSavedScenarios] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [simName, setSimName] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const chartRef = useRef(null);

  const results = useMemo(() => {
    const pwr = parseFloat(inputs.powerRating) || 0;
    const hrs = parseFloat(inputs.operatingHours) || 0;
    const cost = parseFloat(inputs.electricityCost) || 0;
    const life = Math.max(parseFloat(inputs.lifecycle) || 0, 0);
    const init = parseFloat(inputs.initialCost) || 0;
    const maint = parseFloat(inputs.maintenanceCost) || 0;

    const annualEnergy = pwr * hrs * cost;
    const totalEnergy = annualEnergy * life;
    const totalMaint = maint * life;
    const totalTCO = init + totalEnergy + totalMaint;

    return {
      totalEnergyCost: totalEnergy,
      totalMaintenanceCost: totalMaint,
      totalTCO: totalTCO || 0,
      averageYearlyCost: life > 0 ? totalTCO / life : 0,
      percentages: {
        initial: totalTCO > 0 ? (init / totalTCO) * 100 : 0,
        energy: totalTCO > 0 ? (totalEnergy / totalTCO) * 100 : 0,
        maintenance: totalTCO > 0 ? (totalMaint / totalTCO) * 100 : 0
      }
    };
  }, [inputs]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/,/g, '');
    if (cleanValue !== '' && !/^\d*\.?\d*$/.test(cleanValue)) return;
    setInputs(prev => ({ ...prev, [name]: cleanValue }));
  };

  const handleReset = () => {
    setInputs({ 
      initialCost: "", 
      powerRating: "", 
      operatingHours: "", 
      electricityCost: "", 
      maintenanceCost: "", 
      lifecycle: "1" 
    });
  };

  const confirmSave = () => {
    const finalName = simName.trim() || `Simulation ${savedScenarios.length + 1}`;
    const newScenario = {
      id: Date.now(),
      name: finalName,
      inputs: { ...inputs },
      results: { ...results }
    };
    setSavedScenarios([...savedScenarios, newScenario]);
    setIsSaving(false);
    setSimName("");
  };

  const handleRemoveScenario = (id) => {
    setSavedScenarios(savedScenarios.filter(s => s.id !== id));
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      let logoDataUrl = null;
      try {
        const resp = await fetch(`/logo.png?t=${Date.now()}`);
        if (resp.ok) {
          const blob = await resp.blob();
          logoDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.warn('Failed to pre-load logo:', e);
      }

      await generatePdf({
        inputs,
        results,
        chartData,
        savedScenarios,
        breakevenMessages,
        chartElement: chartRef.current,
        logoDataUrl
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const chartData = useMemo(() => {
    const maxLife = Math.max(
      parseFloat(inputs.lifecycle) || 1,
      ...savedScenarios.map(s => parseFloat(s.inputs.lifecycle) || 1)
    );
    const years = Math.min(Math.max(maxLife, 1), 25);
    let data = [];
    
    let currentCumulative = parseFloat(inputs.initialCost) || 0;
    let savedCumulative = savedScenarios.map(s => parseFloat(s.inputs.initialCost) || 0);

    const pwr = parseFloat(inputs.powerRating) || 0;
    const hrs = parseFloat(inputs.operatingHours) || 0;
    const cost = parseFloat(inputs.electricityCost) || 0;
    const maint = parseFloat(inputs.maintenanceCost) || 0;
    const currentYearly = (pwr * hrs * cost) + maint;

    let year0 = { year: 0, "Current Setup": currentCumulative };
    savedScenarios.forEach((s, idx) => {
      year0[s.name] = savedCumulative[idx];
    });
    data.push(year0);

    for (let y = 1; y <= years; y++) {
      let yearData = { year: y };
      currentCumulative += currentYearly;
      yearData["Current Setup"] = currentCumulative;

      savedScenarios.forEach((s, idx) => {
        const spwr = parseFloat(s.inputs.powerRating) || 0;
        const shrs = parseFloat(s.inputs.operatingHours) || 0;
        const scost = parseFloat(s.inputs.electricityCost) || 0;
        const smaint = parseFloat(s.inputs.maintenanceCost) || 0;
        savedCumulative[idx] += (spwr * shrs * scost) + smaint;
        yearData[s.name] = savedCumulative[idx];
      });
      data.push(yearData);
    }
    return data;
  }, [inputs, savedScenarios]);

  const breakevenMessages = useMemo(() => {
    if (savedScenarios.length === 0) return [];
    let messages = [];
    savedScenarios.forEach(s => {
      let oldCost = parseFloat(s.inputs.initialCost) || 0;
      let newCost = parseFloat(inputs.initialCost) || 0;
      
      const oldYearly = ((parseFloat(s.inputs.powerRating) || 0) * (parseFloat(s.inputs.operatingHours) || 0) * (parseFloat(s.inputs.electricityCost) || 0)) + (parseFloat(s.inputs.maintenanceCost) || 0);
      const newYearly = ((parseFloat(inputs.powerRating) || 0) * (parseFloat(inputs.operatingHours) || 0) * (parseFloat(inputs.electricityCost) || 0)) + (parseFloat(inputs.maintenanceCost) || 0);
      
      const yearDiff = oldYearly - newYearly;
      const costDiff = newCost - oldCost;
      
      if (yearDiff > 0 && costDiff > 0) {
        const beYear = costDiff / yearDiff;
        if (beYear > 0 && beYear <= 25) {
          messages.push(`เทียบกับ ${s.name}: จุดคุ้มทุนในปีที่ ${beYear.toFixed(1)}`);
        }
      } else if (yearDiff < 0 && costDiff < 0) {
         const beYear = costDiff / yearDiff;
         if (beYear > 0 && beYear <= 25) { 
           messages.push(`${s.name} จะคุ้มทุนเร็วกว่าในปีที่ ${beYear.toFixed(1)}`);
         }
      }
    });
    return messages;
  }, [inputs, savedScenarios]);

  const chartColors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const formatCurr = (v) => new Intl.NumberFormat('th-TH', { 
    style: 'currency', 
    currency: 'THB', 
    maximumFractionDigits: 0 
  }).format(v || 0);

  return (
    <div className="min-h-screen w-full bg-[#030712] text-[#f8fafc] font-sans selection:bg-blue-500/30 flex flex-col">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-indigo-600/5 blur-[100px] rounded-full" />
      </div>

      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-3 md:p-5 lg:p-6 relative z-10 gap-3 md:gap-4">
        
        <header className="flex flex-row justify-between items-center bg-slate-900/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/5 shadow-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Factory className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tighter text-white uppercase leading-none">
                PUMP TCO <span className="text-blue-500">MASTER</span>
              </h1>
              <p className="text-[7px] font-bold text-slate-500 tracking-[0.2em] uppercase mt-1">Industrial Intelligence Unit</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isSaving ? (
              <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
                <input 
                  type="text" 
                  autoFocus
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmSave();
                    if (e.key === 'Escape') setIsSaving(false);
                  }}
                  placeholder={`Simulation ${savedScenarios.length + 1}`}
                  className="bg-black/60 border border-blue-500/50 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 w-32 md:w-40 transition-all font-bold placeholder:text-slate-600"
                />
                <button 
                  onClick={confirmSave}
                  className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 rounded-lg transition-colors border border-emerald-500/20 shadow-sm"
                  title="Confirm Save"
                >
                  <Check size={12} strokeWidth={3} />
                </button>
                <button 
                  onClick={() => setIsSaving(false)}
                  className="p-1.5 bg-slate-500/20 text-slate-400 hover:bg-slate-500/40 rounded-lg transition-colors border border-white/10 shadow-sm"
                  title="Cancel"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setSimName("");
                  setIsSaving(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[8px] font-extrabold transition-all border border-blue-500/20 uppercase tracking-widest active:scale-95 shadow-sm"
              >
                <Save size={10} /> Save Sim
              </button>
            )}
            <button 
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[8px] font-extrabold transition-all border border-emerald-500/20 uppercase tracking-widest active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-wait"
            >
              <FileDown size={10} />
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
            <button 
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/5 hover:bg-red-500/20 text-red-400 rounded-lg text-[8px] font-extrabold transition-all border border-red-500/10 uppercase tracking-widest active:scale-95"
            >
              <RotateCcw size={10} /> Reset
            </button>
          </div>
        </header>

        {/* TOP: Parameter Setup */}
        <section className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 shadow-lg shrink-0 overflow-hidden">
          <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
            <LayoutDashboard size={12} className="text-blue-400" />
            <h2 className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Parameter Setup</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <InputBox label="ราคาจัดซื้อ (CapEx)" name="initialCost" value={inputs.initialCost} onChange={handleInputChange} unit="บาท" />
            <InputBox label="มอเตอร์ (kW)" name="powerRating" value={inputs.powerRating} onChange={handleInputChange} unit="kW" />
            <InputBox label="รัน (ชม./ปี)" name="operatingHours" value={inputs.operatingHours} onChange={handleInputChange} unit="Hr" />
            <InputBox label="ค่าไฟ (฿/Unit)" name="electricityCost" value={inputs.electricityCost} onChange={handleInputChange} unit="฿/u" />
            <InputBox label="บำรุงรักษา/ปี" name="maintenanceCost" value={inputs.maintenanceCost} onChange={handleInputChange} unit="บาท" />
          </div>

          <div className="bg-black/30 p-3 rounded-xl border border-white/5 mt-3 flex items-center gap-5">
            <div className="shrink-0 min-w-[90px]">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest block">อายุโครงการ</span>
              <span className="text-blue-400 font-black text-lg leading-none">{inputs.lifecycle || 0} <span className="text-[9px] text-slate-600">ปี</span></span>
            </div>
            <input 
              type="range" name="lifecycle" min="1" max="25" 
              value={inputs.lifecycle || 1} onChange={handleInputChange} 
              className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
            />
          </div>
        </section>

        {/* MIDDLE: 2-Column Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-4 shrink-0 min-h-0">
          
          {/* Main TCO Results (3/4 width) */}
          <section className="lg:col-span-3 relative flex flex-col justify-center bg-linear-to-br from-blue-700 via-blue-900 to-slate-950 rounded-[2rem] p-6 lg:p-10 text-white shadow-2xl overflow-hidden group border border-white/5 min-h-[250px] md:min-h-[300px]">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-10 mix-blend-overlay pointer-events-none" />
            <div className="absolute -top-10 -right-10 p-6 opacity-[0.03] scale-[3] pointer-events-none transition-transform duration-[3000ms] ease-out group-hover:rotate-12">
              <Calculator size={150} strokeWidth={1} />
            </div>
            
            <div className="relative z-10 w-full flex flex-col items-start justify-start text-left pt-3 md:pt-4 pl-4 md:pl-6 lg:pl-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-blue-100 mb-4 backdrop-blur-sm">
                <Activity size={10} className="text-blue-400 animate-pulse" /> Life Cycle Total Cost Analysis
              </div>
              
              <div className="text-xs md:text-sm font-black text-blue-300 uppercase tracking-[0.6em] mb-3 drop-shadow-sm opacity-80">
                TOTAL COST OF OWNERSHIP
              </div>
              
              <div className="relative group/total cursor-default">
                <div className="absolute -inset-16 bg-blue-500/10 blur-[80px] rounded-full opacity-0 group-hover/total:opacity-100 transition-opacity duration-1000" />
                <div className="text-5xl md:text-7xl lg:text-9xl tracking-tighter leading-none text-white flex items-center gap-3 whitespace-nowrap drop-shadow-[0_25px_60px_rgba(30,58,138,0.4)] transition-all duration-700 group-hover/total:scale-[1.01] group-hover/total:text-blue-50" style={{ fontFamily: '"Inter", sans-serif', fontWeight: 900 }}>
                  <span className="bg-linear-to-b from-white via-white to-blue-100 bg-clip-text text-transparent">
                    ฿{(results.totalTCO || 0).toLocaleString('th-TH')}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Cards Sidebar (1/4 width) */}
          <aside className="lg:col-span-1 flex flex-col gap-3 md:gap-3.5">
            <InteractiveCard 
              icon={<Zap size={22} />} 
              label="พลังงานสะสม" 
              value={formatCurr(results.totalEnergyCost)} 
              colorClass="text-blue-400" 
            />
            <InteractiveCard 
              icon={<Factory size={22} />} 
              label="ซ่อมบำรุงสะสม" 
              value={formatCurr(results.totalMaintenanceCost)} 
              colorClass="text-indigo-400" 
            />
            <InteractiveCard 
              icon={<TrendingUp size={22} />} 
              label="เฉลี่ยต้นทุน/ปี" 
              value={formatCurr(results.averageYearlyCost)} 
              colorClass="text-emerald-400" 
              highlight 
            />
          </aside>
        </div>

        {/* BOTTOM: Side-by-Side Analysis */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-auto lg:h-[180px] shrink-0 min-h-0">
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-white/5 flex flex-col shadow-lg overflow-hidden group">
            <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2 shrink-0 group-hover:text-blue-400 transition-colors">
              <PieChartIcon size={14} className="group-hover:rotate-12 transition-transform" /> Cost Distribution
            </h3>
            <div className="flex-1 flex flex-col justify-around min-h-0">
              <BarProgress label="จัดซื้อ (CapEx)" p={results.percentages.initial} color="#475569" />
              <BarProgress label="พลังงาน (OpEx)" p={results.percentages.energy} color="#3b82f6" />
              <BarProgress label="ซ่อมบำรุง (Maint)" p={results.percentages.maintenance} color="#10b981" />
            </div>
          </div>

          <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-5 flex flex-col shadow-lg overflow-hidden relative group">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />
            <h4 className="text-base font-black text-white mb-1.5 tracking-tight uppercase flex items-center gap-2 shrink-0 relative z-10">
              Engineering Verdict
            </h4>
            <div className="flex-1 flex items-center relative z-10 overflow-y-auto pr-1 text-pretty">
              <p className="text-[13px] md:text-sm text-slate-300 leading-snug font-medium">
                {results.totalTCO <= 0 ? "กรุณากรอกข้อมูลเพื่อเริ่มการวิเคราะห์..." :
                 results.percentages.energy > 80 
                  ? "ค่าไฟสูงถึง 80%+ ของต้นทุนทั้งหมด! แนะนำปั๊มรุ่น Premium Efficiency เพื่อจุดคุ้มทุนที่รวดเร็วที่สุด" 
                  : "โครงสร้างต้นทุนมีความสมดุล แนะนำให้พิจารณาแผนบำรุงรักษาเชิงป้องกันเพื่อลดความเสี่ยงในการ Breakdown"}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[7px] font-black text-blue-500 uppercase tracking-[0.2em] border-t border-blue-500/10 pt-2 shrink-0 relative z-10">
              Technical Insights Data <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </section>

        {/* CHART: BREAKEVEN & TCO TREND */}
        <section ref={chartRef} className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-white/5 shadow-lg shrink-0 w-full animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Lifecycle Cost & Breakeven</h2>
            </div>
            {breakevenMessages.length > 0 && (
              <div className="flex flex-col items-start md:items-end gap-2">
                {breakevenMessages.map((msg, i) => (
                  <div key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[9px] md:text-[10px] font-medium text-slate-300 tracking-wide backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    {msg}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="h-[250px] w-full text-xs font-medium">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="year" stroke="#ffffff40" tick={{ fill: '#ffffff60' }} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="#ffffff40" 
                  tick={{ fill: '#ffffff60' }} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff10', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                  itemStyle={{ color: '#fff' }} 
                  formatter={(value) => formatCurr(value)} 
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                
                <Line 
                  type="monotone" 
                  dataKey="Current Setup" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2 }} 
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} 
                />
                {savedScenarios.map((s, idx) => (
                  <Line 
                    key={s.id}
                    type="monotone" 
                    dataKey={s.name} 
                    stroke={chartColors[idx % chartColors.length]} 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={{ r: 3 }} 
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* SAVED SIMULATIONS TABLE */}
        {savedScenarios.length > 0 && (
          <section className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/5 shadow-lg shrink-0 mt-2 mb-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Save size={14} className="text-blue-400" />
                <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-400">Saved Simulations</h2>
              </div>
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">
                {savedScenarios.length} {savedScenarios.length === 1 ? 'Simulation' : 'Simulations'}
              </div>
            </div>
            <div className="overflow-x-auto w-full pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500 font-bold uppercase tracking-[0.1em] text-[8px] md:text-[9px]">
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">CapEx</th>
                    <th className="py-2 px-3">kW</th>
                    <th className="py-2 px-3">Hr/Yr</th>
                    <th className="py-2 px-3">฿/u</th>
                    <th className="py-2 px-3">Maint/Yr</th>
                    <th className="py-2 px-3">Life</th>
                    <th className="py-2 px-3 text-blue-400 text-right">Total TCO</th>
                    <th className="py-2 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {savedScenarios.map((scenario) => (
                    <tr key={scenario.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">{scenario.name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{formatCurr(scenario.inputs.initialCost)}</td>
                      <td className="py-2.5 px-3 text-slate-400">{scenario.inputs.powerRating}</td>
                      <td className="py-2.5 px-3 text-slate-400">{scenario.inputs.operatingHours}</td>
                      <td className="py-2.5 px-3 text-slate-400">{scenario.inputs.electricityCost}</td>
                      <td className="py-2.5 px-3 text-slate-400">{formatCurr(scenario.inputs.maintenanceCost)}</td>
                      <td className="py-2.5 px-3 text-slate-400">{scenario.inputs.lifecycle} Yrs</td>
                      <td className="py-2.5 px-3 font-black text-blue-400 text-right">{formatCurr(scenario.results.totalTCO)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button 
                          onClick={() => handleRemoveScenario(scenario.id)}
                          className="text-red-400/70 hover:text-red-400 p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all"
                          title="Delete Simulation"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

// --- Sub-components ---

const InputBox = ({ label, name, value, onChange, unit }) => {
  const displayValue = useMemo(() => {
    if (value === '' || value === undefined) return '';
    const strVal = String(value).replace(/,/g, '');
    const parts = strVal.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
  }, [value]);

  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">{label}</label>
      <div className="relative group">
        <input 
          type="text" name={name} 
          value={displayValue} 
          placeholder="0"
          onChange={onChange} inputMode="decimal"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-black outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-2xl tracking-tight"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[9px] font-black text-slate-500 uppercase bg-white/5 border border-white/5">
          {unit}
        </div>
      </div>
    </div>
  );
};

const InteractiveCard = ({ icon, label, value, colorClass, highlight }) => (
  <div className={`flex-1 flex flex-col p-4 md:p-5 rounded-[1.5rem] border transition-all duration-500 group cursor-default relative overflow-hidden ${
    highlight 
      ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_10px_40px_rgba(16,185,129,0.1)] hover:bg-emerald-500/15' 
      : 'bg-slate-900/40 border-white/5 hover:bg-slate-900/60 hover:border-white/10 shadow-lg'
  } hover:-translate-y-1`}>
    {/* Internal glow effect */}
    <div className={`absolute top-0 left-0 w-16 h-16 blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${highlight ? 'bg-emerald-400' : 'bg-blue-400'}`} />
    
    <div className="flex items-center gap-3 mb-3 relative z-10">
      <div className={`p-2 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${
        highlight ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 ' + colorClass
      }`}>
        {icon}
      </div>
      <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate ${
        highlight ? 'text-emerald-300' : 'text-slate-400 group-hover:text-slate-200 transition-colors'
      }`}>
        {label}
      </p>
    </div>
    
    <div className={`text-xl md:text-2xl lg:text-3xl font-black truncate tracking-tighter relative z-10 ${
      highlight ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-white'
    }`}>
      {value}
    </div>
  </div>
);

const BarProgress = ({ label, p, color }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-baseline">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-xs font-black text-white font-mono">{p.toFixed(1)}%</span>
    </div>
    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
      <div 
        style={{ width: `${p}%`, backgroundColor: color }} 
        className="h-full rounded-full transition-all duration-700 shadow-sm" 
      />
    </div>
  </div>
);

export default App;