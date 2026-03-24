import React, { useState, useMemo } from 'react';
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
  Activity
} from 'lucide-react';

const App = () => {
  const [inputs, setInputs] = useState({
    initialCost: "150000",
    powerRating: "22",
    operatingHours: "6000",
    electricityCost: "4.50",
    maintenanceCost: "15000",
    lifecycle: "10"
  });

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

  const formatCurr = (v) => new Intl.NumberFormat('th-TH', { 
    style: 'currency', 
    currency: 'THB', 
    maximumFractionDigits: 0 
  }).format(v || 0);

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#030712] text-[#f8fafc] font-sans selection:bg-blue-500/30 lg:overflow-hidden flex flex-col">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-indigo-600/5 blur-[100px] rounded-full" />
      </div>

      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-3 md:p-5 lg:p-6 relative z-10 gap-3 md:gap-4">
        
        {/* Header - Compact */}
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
          
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/5 hover:bg-red-500/20 text-red-400 rounded-lg text-[8px] font-extrabold transition-all border border-red-500/10 uppercase tracking-widest active:scale-95"
          >
            <RotateCcw size={10} /> Reset Data
          </button>
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

        {/* MIDDLE: Massive Results */}
        <section className="flex-1 flex flex-col justify-center bg-linear-to-br from-blue-700 via-blue-900 to-slate-950 rounded-[2rem] p-5 md:p-6 lg:p-8 text-white shadow-2xl relative overflow-hidden group border border-white/10 shrink-0 min-h-0">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] scale-[2.5] pointer-events-none group-hover:rotate-6 transition-transform duration-1000">
            <Calculator size={100} />
          </div>
          
          <div className="relative z-10 w-full h-full flex flex-col justify-between overflow-hidden">
            <div className="inline-flex self-start items-center gap-2 px-2.5 py-1 bg-white/10 rounded-full border border-white/10 text-[7px] font-black uppercase tracking-[0.2em] text-blue-100 mb-2">
              <Activity size={8} className="text-blue-400" /> Life Cycle Total Cost Analysis
            </div>
            
            <div className="flex-1 flex items-center justify-center py-2 overflow-hidden">
              <div className="text-4xl md:text-6xl lg:text-[6.5vw] font-black tracking-tighter leading-none text-white transition-all duration-300 drop-shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex items-baseline gap-2 whitespace-nowrap overflow-hidden">
                {formatCurr(results.totalTCO)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 mt-2 shrink-0">
              <DisplayItem label="พลังงานสะสม" value={formatCurr(results.totalEnergyCost)} />
              <DisplayItem label="ซ่อมบำรุงสะสม" value={formatCurr(results.totalMaintenanceCost)} />
              <DisplayItem label="เฉลี่ยต้นทุน/ปี" value={formatCurr(results.averageYearlyCost)} highlight />
            </div>
          </div>
        </section>

        {/* BOTTOM: Side-by-Side Analysis */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-auto lg:h-[180px] shrink-0 min-h-0">
          <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-white/5 flex flex-col shadow-lg overflow-hidden">
            <h3 className="text-[8px] font-black text-slate-500 mb-3 uppercase tracking-[0.2em] flex items-center gap-2 shrink-0">
              <PieChartIcon size={12} className="text-blue-500" /> Cost Distribution
            </h3>
            <div className="flex-1 flex flex-col justify-around min-h-0">
              <BarProgress label="จัดซื้อ (CapEx)" p={results.percentages.initial} color="#475569" />
              <BarProgress label="พลังงาน (OpEx)" p={results.percentages.energy} color="#3b82f6" />
              <BarProgress label="ซ่อมบำรุง (Maint)" p={results.percentages.maintenance} color="#10b981" />
            </div>
          </div>

          <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-5 flex flex-col shadow-lg overflow-hidden">
            <h4 className="text-base font-black text-white mb-1.5 tracking-tight uppercase flex items-center gap-2 shrink-0">
              Engineering Verdict
            </h4>
            <div className="flex-1 flex items-center overflow-y-auto pr-1">
              <p className="text-[13px] md:text-sm text-slate-300 leading-snug font-medium">
                {results.totalTCO <= 0 ? "กรุณากรอกข้อมูลเพื่อเริ่มการวิเคราะห์..." :
                 results.percentages.energy > 80 
                  ? "ค่าไฟสูงถึง 80%+ ของต้นทุนทั้งหมด! แนะนำปั๊มรุ่น Premium Efficiency เพื่อจุดคุ้มทุนที่รวดเร็วที่สุด" 
                  : "โครงสร้างต้นทุนมีความสมดุล แนะนำให้พิจารณาแผนบำรุงรักษาเชิงป้องกันเพื่อลดความเสี่ยงในการ Breakdown"}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[7px] font-black text-blue-500 uppercase tracking-[0.2em] border-t border-blue-500/10 pt-2 shrink-0">
              Technical Insights Data <ArrowRight size={10} />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

// --- Sub-components (Optimized for space) ---

const InputBox = ({ label, name, value, onChange, unit }) => {
  const displayValue = useMemo(() => {
    if (value === '' || value === undefined) return '';
    const strVal = String(value);
    const parts = strVal.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
  }, [value]);

  return (
    <div className="space-y-1 w-full">
      <label className="text-[7px] font-extrabold text-slate-500 uppercase tracking-[0.15em] block ml-1">{label}</label>
      <div className="relative group">
        <input 
          type="text" name={name} 
          value={displayValue} 
          placeholder="0"
          onChange={onChange} inputMode="decimal"
          className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-white font-bold outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all text-[13px]"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1 py-0.5 rounded text-[7px] font-black text-slate-700 uppercase">
          {unit}
        </div>
      </div>
    </div>
  );
};

const DisplayItem = ({ label, value, highlight }) => (
  <div className="min-w-0">
    <p className="text-[7px] text-blue-200/30 uppercase font-black tracking-[0.15em] mb-0.5">{label}</p>
    <p className={`text-[13px] md:text-base font-black truncate ${highlight ? 'text-emerald-400' : 'text-white'}`}>
      {value}
    </p>
  </div>
);

const BarProgress = ({ label, p, color }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[7px] font-black uppercase tracking-[0.1em]">
      <span className="text-slate-500">{label}</span>
      <span className="text-white font-mono">{p.toFixed(1)}%</span>
    </div>
    <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
      <div 
        style={{ width: `${p}%`, backgroundColor: color }} 
        className="h-full rounded-full transition-all duration-700 shadow-sm" 
      />
    </div>
  </div>
);

export default App;