import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { 
  Map as MapIcon, List, CheckSquare, CreditCard, Menu, X, 
  ChevronLeft, ChevronRight, Navigation, Droplets, 
  AlertTriangle, Home, Plane, Car, Utensils, Camera, ShoppingBag, 
  Info, Ticket, ArrowRight, ZoomIn, Search, ThermometerSun, Fuel, HeartPulse,
  Calendar, Grip, Cloud, CloudRain, Sun, CloudLightning, CloudSnow, Wind
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// -----------------------------------------------------------------------------
// 📅 TRIP CONFIGURATION
// -----------------------------------------------------------------------------
const TRIP_START_DATE = new Date('2026-02-15'); // 出發日

// -----------------------------------------------------------------------------
// 🎨 EARTH TONE PALETTE (大地色系 - 蔬菜家專屬)
// -----------------------------------------------------------------------------
const THEME = {
  darkOlive: '#7C6A0A',
  olive: '#9B944C',
  sage: '#ABA96D',
  lightSage: '#BABD8D',
  beige: '#DDCCAA',
  lightTan: '#EDC287',
  sand: '#FDB863',       // 按鈕主色 (Option A)
  orange: '#FCA732',
  vibrantOrange: '#FA9500',
  burntOrange: '#EB6424', // 側邊按鈕色
  bg: '#F9F7F2',          // 奇數天背景 (極淡米)
  linen: '#EBE5D5',       // 偶數天背景 (亞麻沙色)
};

// -----------------------------------------------------------------------------
// 🔴 DATA LINKS
// -----------------------------------------------------------------------------
const ITINERARY_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSea9DwhEPWU3oMr8aB5QYGcB4yYOC0J3_mFWJUpEArIymCYcmvDAjR9AZVkP9NAThyZP3Hhmoke8Su/pub?gid=2128409720&single=true&output=csv"; 
const SUMMARY_URL   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSea9DwhEPWU3oMr8aB5QYGcB4yYOC0J3_mFWJUpEArIymCYcmvDAjR9AZVkP9NAThyZP3Hhmoke8Su/pub?gid=660305729&single=true&output=csv"; 
const EXPENSES_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSea9DwhEPWU3oMr8aB5QYGcB4yYOC0J3_mFWJUpEArIymCYcmvDAjR9AZVkP9NAThyZP3Hhmoke8Su/pub?gid=0&single=true&output=csv"; 
const CHECKLIST_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSea9DwhEPWU3oMr8aB5QYGcB4yYOC0J3_mFWJUpEArIymCYcmvDAjR9AZVkP9NAThyZP3Hhmoke8Su/pub?gid=184339256&single=true&output=csv"; 
const SETTINGS_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSea9DwhEPWU3oMr8aB5QYGcB4yYOC0J3_mFWJUpEArIymCYcmvDAjR9AZVkP9NAThyZP3Hhmoke8Su/pub?gid=61190251&single=true&output=csv"; 

const FLOWCHART_IMAGE_URL = "https://drive.google.com/file/d/1-d4xNJI3DrLjDKN2lXwci62cVCfbU7GW/view?usp=drive_link"; 
const INTRO_VIDEO_URL = ""; 

// -----------------------------------------------------------------------------
// 🛠️ HELPERS & COMPONENTS
// -----------------------------------------------------------------------------

const fixGoogleLink = (url, type = 'link') => {
  if (!url) return null;
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/\/d\/(.*?)\/view/) || url.match(/id=(.*?)(&|$)/);
    if (idMatch) {
      const id = idMatch[1];
      if (type === 'image') return `https://lh3.googleusercontent.com/d/${id}=w1000`;
    }
  }
  if (type === 'link' && !url.startsWith('http')) return `https://${url}`;
  return url;
};

// Weather Fetcher (Open-Meteo with Weather Code)
const fetchWeather = async (lat, lng) => {
  if (!lat || !lng) return null;
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=1`);
    const data = await res.json();
    if (data.daily) {
      return {
        max: Math.round(data.daily.temperature_2m_max[0]),
        min: Math.round(data.daily.temperature_2m_min[0]),
        code: data.daily.weather_code[0] // WMO Weather Code
      };
    }
  } catch (e) { console.error("Weather fetch failed", e); }
  return null;
};

// WMO Weather Code to Icon Helper
const getWeatherIcon = (code) => {
  if (code === undefined) return <ThermometerSun size={20} color={THEME.olive} />;
  if (code <= 1) return <Sun size={20} color="#F59E0B" />; // Clear/Mainly Clear
  if (code <= 3) return <Cloud size={20} color="#78716C" />; // Partly Cloudy/Overcast
  if (code <= 48) return <Wind size={20} color="#A8A29E" />; // Fog
  if (code <= 67) return <CloudRain size={20} color="#3B82F6" />; // Rain
  if (code <= 77) return <CloudSnow size={20} color="#60A5FA" />; // Snow
  if (code <= 82) return <CloudRain size={20} color="#1D4ED8" />; // Showers
  if (code <= 86) return <CloudSnow size={20} color="#93C5FD" />; // Snow Showers
  if (code <= 99) return <CloudLightning size={20} color="#7C3AED" />; // Thunderstorm
  return <ThermometerSun size={20} color={THEME.olive} />;
};

const getTripStatus = () => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const start = new Date(TRIP_START_DATE);
  start.setHours(0,0,0,0);

  const diffTime = today - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  if (diffDays < 0) {
    return { status: 'before', val: Math.abs(diffDays) }; 
  } else {
    return { status: 'during', val: diffDays + 1 }; 
  }
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (emoji) => L.divIcon({
  html: `<div style="background-color: ${THEME.bg}; border-color: ${THEME.darkOlive}" class="flex items-center justify-center w-9 h-9 rounded-full shadow-lg text-xl border-2">${emoji}</div>`,
  className: 'custom-marker-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

const getCategoryIcon = (category, title = "") => {
  if (category?.includes('Transport')) return title.includes('✈️') ? <Plane size={18} color={THEME.burntOrange} /> : <Car size={18} color={THEME.orange} />;
  if (category?.includes('Stay')) return <Home size={18} color={THEME.darkOlive} />;
  if (category?.includes('Food')) return <Utensils size={18} color={THEME.olive} />;
  if (category?.includes('Activity')) return <Camera size={18} color={THEME.burntOrange} />;
  if (category?.includes('Shopping')) return <ShoppingBag size={18} color={THEME.sand} />;
  return <Info size={18} color={THEME.sage} />;
};

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 10, { duration: 1.5 });
  }, [center, map]);
  return null;
};

const TextZoomModal = ({ isOpen, content, onClose, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-md">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#F9F7F2] w-full max-w-lg max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden relative flex flex-col">
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-white/50">
           <h3 className="font-bold text-lg" style={{ color: THEME.olive }}>{title}</h3>
        </div>
        <div className="p-8 overflow-y-auto">
          <p className="text-2xl leading-loose font-medium whitespace-pre-line" style={{ color: THEME.darkOlive }}>{content}</p>
        </div>
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-white/30 backdrop-blur-md border border-white/50 shadow-[0_4px_6px_rgba(0,0,0,0.1)] hover:bg-white/50 active:scale-95 transition-all">
          <X size={28} color={THEME.darkOlive} strokeWidth={2.5} />
        </button>
      </motion.div>
    </div>
  );
};

const BloodPressureModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <HeartPulse size={32} className="text-red-500 animate-pulse" />
        </div>
        <h3 className="text-xl font-black text-stone-800 mb-2">系統警告</h3>
        <p className="text-stone-600 font-medium mb-6 leading-relaxed">偵測到血壓可能升高，<br/>真的要打開看花了多少錢嗎？</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-300">[先不要]</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-200">[深呼吸三次]</button>
        </div>
      </motion.div>
    </div>
  );
};

// 📅 快速天數選單 (修改：顯示日期)
const DaySelectorModal = ({ isOpen, onClose, summaryData, currentDay, onSelect }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[10002] flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-sm" onClick={onClose}>
        <motion.div 
           initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
           className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
           onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg" style={{ color: THEME.darkOlive }}>跳轉到哪一天？</h3>
              <button onClick={onClose}><X size={24} color={THEME.sage} /></button>
          </div>
          <div className="grid grid-cols-4 gap-3">
             {summaryData.map((day, i) => (
                 <button 
                    key={i}
                    onClick={() => onSelect(i)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all border ${currentDay === i ? 'scale-105 shadow-md text-white border-transparent' : 'bg-stone-50 border-stone-100 hover:bg-stone-100'}`}
                    style={{ backgroundColor: currentDay === i ? THEME.orange : undefined }}
                 >
                    {/* 顯示日期 (例如 2/15) */}
                    <span className="text-xs font-bold opacity-80 mb-0.5">D{day.Day}</span>
                    <span className={`text-sm font-black ${currentDay === i ? 'text-white' : 'text-stone-600'}`}>
                      {day.Date ? day.Date.split('/')[1] + '/' + day.Date.split('/')[2] : '-'}
                    </span>
                 </button>
             ))}
          </div>
        </motion.div>
      </div>
    );
};

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

export default function App() {
  const [view, setView] = useState('intro');
  const [data, setData] = useState({ itinerary: [], summary: [], expenses: [], checklist: [], settings: {} });
  const [dayIndex, setDayIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [itineraryMode, setItineraryMode] = useState('list');
  const [checklistState, setChecklistState] = useState({});
  const [zoomModal, setZoomModal] = useState({ open: false, content: '', title: '' });
  const [backpackTab, setBackpackTab] = useState('Check');
  const [videoError, setVideoError] = useState(false); 
  const [weatherData, setWeatherData] = useState({}); 
  const [showExpenses, setShowExpenses] = useState(false);
  const [expenseWarning, setExpenseWarning] = useState(false);
  const [showDaySelector, setShowDaySelector] = useState(false);

  const tripStatus = getTripStatus();

  useEffect(() => {
    const savedChecklist = localStorage.getItem('nz_checklist');
    if (savedChecklist) setChecklistState(JSON.parse(savedChecklist));

    const fetchData = async () => {
      const fetchCsv = (url) => new Promise((resolve) => {
        if (!url) return resolve([]);
        Papa.parse(url, { download: true, header: true, complete: (r) => resolve(r.data), error: () => resolve([]) });
      });

      const [itin, summ, exp, check, sett] = await Promise.all([
        fetchCsv(ITINERARY_URL), fetchCsv(SUMMARY_URL), fetchCsv(EXPENSES_URL), fetchCsv(CHECKLIST_URL), fetchCsv(SETTINGS_URL)
      ]);

      const settingsMap = {};
      sett.forEach(row => { if(row.Tab_ID && row.Display_Name) settingsMap[row.Tab_ID] = row.Display_Name });

      const validSummary = summ.filter(r => r.Date);
      
      if (tripStatus.status === 'during' && validSummary.length > 0) {
          const targetIndex = Math.min(tripStatus.val - 1, validSummary.length - 1);
          setDayIndex(Math.max(0, targetIndex));
      }

      setData({
        itinerary: itin.filter(r => r.Date),
        summary: validSummary,
        expenses: exp.filter(r => r.Item),
        checklist: check.filter(r => r.Content),
        settings: settingsMap
      });

      const weatherCache = {};
      for (const day of summ) {
        if (day.Start_Lat && day.Start_Lng && !weatherCache[day['Weather City']]) {
          const w = await fetchWeather(day.Start_Lat, day.Start_Lng);
          if (w) weatherCache[day['Weather City']] = w;
        }
      }
      setWeatherData(weatherCache);
    };
    fetchData();
  }, []);

  const handleChecklistToggle = (itemContent) => {
    const newState = { ...checklistState, [itemContent]: !checklistState[itemContent] };
    setChecklistState(newState);
    localStorage.setItem('nz_checklist', JSON.stringify(newState));
  };

  const jumpToItineraryDay = (dayNum) => {
    setView('itinerary');
    setItineraryMode('list');
    setTimeout(() => {
      const element = document.getElementById(`day-${dayNum}`);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const getTabName = (id, defaultName) => data.settings[id] || defaultName;

  const currentSummary = data.summary[dayIndex] || {};
  const currentItinerary = data.itinerary.filter(i => i.Date === currentSummary.Date);
  const currentWeather = weatherData[currentSummary['Weather City']];

  const mapCenter = currentSummary.Start_Lat && currentSummary.Start_Lng 
    ? [parseFloat(currentSummary.Start_Lat), parseFloat(currentSummary.Start_Lng)] 
    : [-41.2865, 174.7762]; 

  const expensesData = useMemo(() => {
    const categories = {};
    let total = 0;
    data.expenses.forEach(e => {
      const amount = parseFloat((e.Final_TWD || "0").replace(/[$,NT]/g, ''));
      if (!isNaN(amount)) {
        total += amount;
        categories[e.Category || 'Other'] = (categories[e.Category || 'Other'] || 0) + amount;
      }
    });
    return { total, chart: Object.keys(categories).map(k => ({ name: k, value: categories[k] })) };
  }, [data.expenses]);

  const PIE_COLORS = [THEME.darkOlive, THEME.burntOrange, THEME.sand, THEME.olive, THEME.sage, THEME.beige];

  const checkFuelLogic = () => {
    const distStr = currentSummary['Drive Info'] || "";
    const distMatch = distStr.match(/(\d+)\s*km/);
    const dist = distMatch ? parseInt(distMatch[1]) : 0;

    const keywords = ['milford', 'cook', 'tekapo'];
    const scanText = (
      (currentSummary.Highlight || "") + 
      (currentSummary['Drive Info'] || "") + 
      (currentSummary['Memo'] || "") + 
      (currentSummary['End_Loc'] || "")
    ).toLowerCase();

    const isRemote = keywords.some(k => scanText.includes(k));

    if (isRemote) return { type: 'remote', msg: '⚠️ 進入偏遠地區！請在起點加滿油！' };
    if (dist > 200) return { type: 'long', msg: '⛽ 檢查剩餘油量' };
    return null;
  };
  const fuelAlert = checkFuelLogic();

  // -------------------------
  // UI COMPONENTS
  // -------------------------

  const SystemMenu = () => (
    <>
      <button onClick={() => setMenuOpen(!menuOpen)} style={{ color: THEME.darkOlive, backgroundColor: 'rgba(255,255,255,0.9)' }} className="fixed top-4 right-4 z-[9999] p-3 backdrop-blur-md border border-stone-200 rounded-full shadow-xl hover:scale-105 transition-all">
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: -20, x: 20 }} animate={{ opacity: 1, scale: 1, y: 0, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} style={{ backgroundColor: 'rgba(255,255,255,0.98)' }} className="fixed top-20 right-4 z-[9998] w-64 backdrop-blur-xl border border-stone-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <button onClick={() => { setView('intro'); setMenuOpen(false); }} className="px-5 py-4 border-b border-stone-100 bg-stone-50/50 text-left hover:bg-stone-100 transition-colors">
               <h3 className="text-sm font-black tracking-wide" style={{ color: THEME.darkOlive }}>蔬菜去露營<br/><span className="text-xs font-normal" style={{ color: THEME.olive }}>2026南島大冒險</span></h3>
            </button>
            {[
              { id: 'dashboard', label: getTabName('dashboard', '旅程儀表'), icon: <MapIcon size={18} /> },
              { id: 'itinerary', label: getTabName('itinerary', '行程手帳'), icon: <List size={18} /> },
              { id: 'backpack',  label: getTabName('backpack', '背包清單'), icon: <CheckSquare size={18} /> },
              { id: 'expenses',  label: getTabName('expenses', '旅費統計'), icon: <CreditCard size={18} /> },
            ].map(item => (
              <button key={item.id} onClick={() => { setView(item.id); setMenuOpen(false); }} className={`flex items-center gap-3 px-5 py-4 text-sm font-bold transition-colors ${view === item.id ? 'bg-[#F9F7F2] border-l-4' : 'hover:bg-stone-50'}`} style={{ color: view === item.id ? THEME.darkOlive : THEME.olive, borderColor: THEME.burntOrange }}>
                {item.icon} {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  // 1. DASHBOARD
  if (view === 'dashboard') {
    return (
      <div className="h-screen w-full flex flex-col relative overflow-hidden font-sans" style={{ backgroundColor: THEME.bg }}>
        <SystemMenu />
        <div className="h-[45%] relative z-0">
          <MapContainer center={mapCenter} zoom={6} className="w-full h-full" zoomControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='© OpenStreetMap' />
            <MapUpdater center={mapCenter} />
            {currentItinerary.map((stop, idx) => stop.Lat && (
              <Marker key={idx} position={[parseFloat(stop.Lat), parseFloat(stop.Lng)]} icon={createCustomIcon(stop.Category?.includes('Stay') ? '🏠' : stop.Category?.includes('Food') ? '🍔' : '📍')}>
                <Popup>{stop.Title}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="h-[55%] bg-white rounded-t-[2.5rem] -mt-8 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <button disabled={dayIndex === 0} onClick={() => setDayIndex(prev => Math.max(0, prev - 1))} className="p-2 rounded-full bg-stone-100 disabled:opacity-30"><ChevronLeft color={THEME.darkOlive}/></button>
            <div className="flex items-center gap-2">
                <button onClick={() => jumpToItineraryDay(currentSummary.Day)} className="text-center group active:scale-95 transition-transform">
                  <h2 className="text-2xl font-black tracking-wide" style={{ color: THEME.darkOlive }}>{currentSummary.Date || 'Loading...'}</h2>
                  <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mt-1 inline-flex items-center gap-1" style={{ backgroundColor: THEME.beige, color: THEME.darkOlive }}>
                    Day {currentSummary.Day || '-'} <ArrowRight size={12} />
                  </span>
                </button>
                {/* 📅 日期選擇器 */}
                <button onClick={() => setShowDaySelector(true)} className="p-2 rounded-full bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all">
                    <Calendar size={18} color={THEME.olive} />
                </button>
            </div>
            <button disabled={dayIndex >= data.summary.length - 1} onClick={() => setDayIndex(prev => Math.min(data.summary.length - 1, prev + 1))} className="p-2 rounded-full bg-stone-100 disabled:opacity-30"><ChevronRight color={THEME.darkOlive}/></button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pb-20 px-1">
            {currentSummary.Date ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Weather with Icon */}
                  <div className="rounded-2xl p-4 border flex items-center gap-3 shadow-sm" style={{ backgroundColor: THEME.bg, borderColor: THEME.beige }}>
                    <div className="p-2 bg-white rounded-full">
                       {getWeatherIcon(currentWeather?.code)}
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase opacity-60" style={{ color: THEME.darkOlive }}>{currentSummary['Weather City']}</p>
                        {currentWeather ? (
                             <p className="font-bold text-xs whitespace-nowrap" style={{ color: THEME.darkOlive }}>
                                🔺{currentWeather.max}° 🔻{currentWeather.min}°
                             </p>
                        ) : (
                             <p className="font-bold text-sm" style={{ color: THEME.darkOlive }}>Loading...</p>
                        )}
                    </div>
                  </div>
                  <div className="rounded-2xl p-4 border flex items-center gap-3 shadow-sm" style={{ backgroundColor: THEME.bg, borderColor: THEME.beige }}>
                    <div className="p-2 bg-white rounded-full"><Droplets size={20} color={THEME.burntOrange} /></div>
                    <div>
                      <p className="text-xs font-bold uppercase opacity-60" style={{ color: THEME.darkOlive }}>Stress Lvl</p>
                      <div className="flex text-xs font-bold" style={{ color: THEME.burntOrange }}>{Array.from({ length: parseInt(currentSummary.StressLevel) || 1 }).map((_, i) => <span key={i}>●</span>)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-2xl p-5 border shadow-sm" style={{ backgroundColor: '#fff', borderColor: THEME.olive }}>
                  <h3 className="text-xs uppercase font-bold mb-2 flex items-center gap-2" style={{ color: THEME.olive }}><Navigation size={14} /> Drive Info</h3>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-mono font-bold" style={{ color: THEME.darkOlive }}>{currentSummary['Drive Info']}</p>
                    {fuelAlert && (
                      <div className={`text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 ${fuelAlert.type === 'remote' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-amber-100 text-amber-700 animate-pulse'}`}>
                        {fuelAlert.type === 'long' && <Fuel size={12} />}
                        {fuelAlert.type === 'remote' && <AlertTriangle size={12} />}
                        {fuelAlert.msg}
                      </div>
                    )}
                  </div>
                  
                  {currentSummary['Road Warning'] && (
                    <div 
                      onClick={() => setZoomModal({ open: true, content: currentSummary['Road Warning'], title: 'Road Warning' })}
                      className="mt-3 bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg text-xs text-amber-800 font-bold flex items-start gap-2 whitespace-pre-line relative cursor-pointer active:scale-[0.98]"
                    >
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" /> 
                      {currentSummary['Road Warning']}
                      <div className="absolute top-1 right-1 opacity-40"><Search size={12}/></div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl p-5 shadow-lg text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${THEME.olive}, ${THEME.darkOlive})` }}>
                  <h3 className="text-xs uppercase text-emerald-100 font-bold mb-1 relative z-10">✨ Highlight</h3>
                  <p className="text-lg font-bold leading-relaxed relative z-10">{currentSummary.Highlight}</p>
                </div>

                {currentSummary.Memo && (
                    <div onClick={() => setZoomModal({ open: true, content: currentSummary.Memo, title: 'Today Memo' })} className="rounded-2xl p-5 border shadow-sm relative cursor-pointer active:scale-[0.98] transition-transform hover:bg-stone-50" style={{ backgroundColor: THEME.bg, borderColor: THEME.lightSage }}>
                      <div className="absolute top-4 right-4 text-stone-300"><ZoomIn size={16} /></div>
                      <h3 className="text-xs uppercase font-bold mb-2 flex items-center gap-2" style={{ color: THEME.olive }}>📝 Memo</h3>
                      <p className="text-sm font-medium whitespace-pre-line" style={{ color: THEME.darkOlive }}>{currentSummary.Memo}</p>
                    </div>
                )}
              </>
            ) : <div className="text-center p-10 text-stone-400">請填入 CSV 連結</div>}
          </div>
        </div>
        <TextZoomModal isOpen={zoomModal.open} content={zoomModal.content} title={zoomModal.title} onClose={() => setZoomModal({ ...zoomModal, open: false })} />
        <DaySelectorModal 
           isOpen={showDaySelector} 
           onClose={() => setShowDaySelector(false)} 
           summaryData={data.summary}
           currentDay={dayIndex}
           onSelect={(i) => { setDayIndex(i); setShowDaySelector(false); }}
        />
      </div>
    );
  }

  // 2. ITINERARY
  if (view === 'itinerary') {
    const groupedItinerary = data.itinerary.reduce((acc, item) => {
      const day = item.Day || '0';
      if (!acc[day]) acc[day] = []; acc[day].push(item); return acc;
    }, {});
    
    const timelineDays = data.summary.map(s => s.Day);

    return (
      <div className="min-h-screen pb-20 flex" style={{ backgroundColor: THEME.bg }}>
        <SystemMenu />
        
        {itineraryMode === 'list' && (
           <div className="w-12 sticky top-0 h-screen flex flex-col items-center py-20 gap-2 z-30 overflow-y-auto no-scrollbar border-r" style={{ borderColor: THEME.beige, backgroundColor: 'rgba(255,255,255,0.5)' }}>
             {timelineDays.map(day => {
               const isEven = parseInt(day) % 2 === 0;
               return (
                <button key={day} onClick={() => document.getElementById(`day-${day}`)?.scrollIntoView({ behavior: 'smooth' })} className="w-8 h-8 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 transition-all hover:scale-110" style={{ backgroundColor: THEME.burntOrange, color: '#fff', opacity: isEven ? 0.7 : 1 }}>
                  D{day}
                </button>
               )
             })}
           </div>
        )}

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b px-4 py-4 flex items-center justify-between shadow-sm pr-28" style={{ borderColor: THEME.beige }}>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: THEME.darkOlive }}>
                {/* 移除 List icon */}
                {getTabName('itinerary', '行程手帳')}
            </h2>
            <div className="bg-stone-100 rounded-lg p-1 flex shrink-0">
              <button onClick={() => setItineraryMode('list')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${itineraryMode === 'list' ? 'bg-white shadow-sm' : 'text-stone-400'}`} style={{ color: itineraryMode === 'list' ? THEME.darkOlive : null }}>全行程</button>
              <button onClick={() => setItineraryMode('flow')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${itineraryMode === 'flow' ? 'bg-white shadow-sm' : 'text-stone-400'}`} style={{ color: itineraryMode === 'flow' ? THEME.darkOlive : null }}>小新圖</button>
            </div>
          </header>

          <div className="max-w-2xl mx-auto">
            {itineraryMode === 'flow' ? (
              <div className="p-4 m-4 bg-white rounded-2xl shadow-sm border min-h-[50vh] flex items-center justify-center" style={{ borderColor: THEME.beige }}>
                {FLOWCHART_IMAGE_URL ? <img src={fixGoogleLink(FLOWCHART_IMAGE_URL, 'image')} alt="Flow" className="w-full rounded-lg" /> : <p className="text-stone-400">尚無流程圖連結</p>}
              </div>
            ) : (
              Object.entries(groupedItinerary).map(([day, items]) => {
                const isEven = parseInt(day) % 2 === 0;
                const cardBg = isEven ? THEME.linen : '#fff';
                
                return (
                  <div key={day} id={`day-${day}`} className="py-8 scroll-mt-20 border-b-2 border-dashed border-stone-300/50">
                    <div className="px-4 mb-6 flex items-baseline gap-3">
                      <h3 className="text-4xl font-black opacity-20" style={{ color: THEME.darkOlive }}>Day {day}</h3>
                      <p className="text-sm font-bold uppercase tracking-widest" style={{ color: THEME.olive }}>{items[0].Date}</p>
                    </div>
                    <div className="space-y-6 relative px-4">
                      <div className="absolute left-10 top-4 bottom-4 w-0.5" style={{ backgroundColor: THEME.beige }} />
                      {items.map((item, idx) => (
                        <motion.div key={idx} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative pl-14">
                          <div className="absolute left-8 top-0 -translate-x-1/2 bg-white border-4 rounded-full z-10" style={{ borderColor: THEME.bg }}>
                            {getCategoryIcon(item.Category, item.Title)}
                          </div>
                          <div className="rounded-2xl p-5 shadow-[0_2px_15px_rgba(0,0,0,0.03)] border hover:shadow-md transition-shadow relative" style={{ backgroundColor: cardBg, borderColor: THEME.beige }}>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-lg" style={{ color: THEME.darkOlive }}>{item.Title}</h4>
                              <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ backgroundColor: THEME.beige, color: THEME.darkOlive }}>{item.Time ? item.Time.replace(/:00$/, '') : ''}</span>
                            </div>
                            <div onClick={() => setZoomModal({ open: true, content: item.Description, title: item.Title })} className="mb-4 p-3 rounded-xl border bg-opacity-30 relative cursor-pointer active:scale-[0.98] transition-transform hover:bg-stone-50" style={{ backgroundColor: THEME.bg, borderColor: THEME.lightSage }}>
                              <ZoomIn size={14} className="absolute top-2 right-2 opacity-30" color={THEME.darkOlive}/>
                              <p className="text-sm whitespace-pre-line leading-relaxed font-medium line-clamp-4" style={{ color: THEME.darkOlive }}>{item.Description}</p>
                            </div>
                            {item.ImageURL && <div className="mb-4 rounded-xl overflow-hidden shadow-sm"><img src={fixGoogleLink(item.ImageURL, 'image')} className="w-full h-40 object-cover" onError={(e) => e.target.style.display = 'none'} /></div>}
                            <div className="flex flex-wrap gap-2 relative z-50">
                              {item.GoogleMapLink && (
                                <a href={fixGoogleLink(item.GoogleMapLink)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer border border-blue-100 shadow-sm">
                                  <Navigation size={14} /> 導航
                                </a>
                              )}
                              {item.VoucherLink && (
                                <a href={fixGoogleLink(item.VoucherLink)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-80 transition-colors cursor-pointer shadow-sm" style={{ backgroundColor: THEME.sand, color: '#fff' }}>
                                  <Ticket size={14} /> 憑證
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <TextZoomModal isOpen={zoomModal.open} content={zoomModal.content} title={zoomModal.title} onClose={() => setZoomModal({ ...zoomModal, open: false })} />
      </div>
    );
  }

  // 3. BACKPACK
  if (view === 'backpack') {
    const items = data.checklist.filter(i => i.Type === (backpackTab === 'Check' ? 'Check' : 'Info'));
    return (
      <div className="min-h-screen pb-20" style={{ backgroundColor: THEME.bg }}>
        <SystemMenu />
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b shadow-sm" style={{ borderColor: THEME.beige }}>
            <div className="px-6 py-4 flex items-center gap-2">
                <CheckSquare color={THEME.burntOrange} /> 
                <h2 className="text-xl font-bold" style={{ color: THEME.darkOlive }}>{getTabName('backpack', '背包清單')}</h2>
            </div>
            <div className="flex px-4 pb-2 gap-2">
                <button onClick={() => setBackpackTab('Check')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${backpackTab === 'Check' ? 'shadow-sm' : 'opacity-50 hover:opacity-80'}`} style={{ backgroundColor: backpackTab === 'Check' ? THEME.olive : '#e5e5e5', color: backpackTab === 'Check' ? '#fff' : THEME.darkOlive }}>真的都有帶嗎？</button>
                <button onClick={() => setBackpackTab('Info')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${backpackTab === 'Info' ? 'shadow-sm' : 'opacity-50 hover:opacity-80'}`} style={{ backgroundColor: backpackTab === 'Info' ? THEME.burntOrange : '#e5e5e5', color: backpackTab === 'Info' ? '#fff' : THEME.darkOlive }}>通通給我看三遍！</button>
            </div>
        </header>
        <div className="p-4 max-w-2xl mx-auto space-y-3">
          {items.length > 0 ? items.map((item, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }} className={`p-4 rounded-2xl border transition-all flex items-start gap-4 shadow-sm ${backpackTab === 'Info' ? 'bg-amber-50 border-amber-100 cursor-pointer' : checklistState[item.Content] ? 'opacity-50 grayscale' : 'bg-white'}`} style={{ borderColor: backpackTab === 'Check' ? THEME.beige : undefined }} onClick={() => { if(backpackTab === 'Check') handleChecklistToggle(item.Content); else setZoomModal({ open: true, content: item.Note, title: item.Content }); }}>
              {backpackTab === 'Check' && <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checklistState[item.Content] ? 'bg-emerald-500 border-emerald-500' : ''}`} style={{ borderColor: THEME.olive, backgroundColor: checklistState[item.Content] ? THEME.olive : '#fff' }}>{checklistState[item.Content] && <CheckSquare size={16} className="text-white" />}</div>}
              {backpackTab === 'Info' && <AlertTriangle className="text-amber-500 w-6 h-6 shrink-0" />}
              <div className="flex-1">
                  <p className={`font-bold text-lg ${checklistState[item.Content] ? 'line-through' : ''}`} style={{ color: THEME.darkOlive }}>{item.Content}</p>
                  {item.Note && <p className="text-sm mt-1 font-medium" style={{ color: THEME.olive }}>{item.Note}</p>}
              </div>
              {backpackTab === 'Info' && <Search size={16} className="text-amber-300 mt-1" />}
            </motion.div>
          )) : <div className="text-center py-10 text-stone-400 font-bold">目前沒有項目</div>}
        </div>
        <TextZoomModal isOpen={zoomModal.open} content={zoomModal.content} title={zoomModal.title} onClose={() => setZoomModal({ ...zoomModal, open: false })} />
      </div>
    );
  }

  // 4. EXPENSES
  if (view === 'expenses') {
    return (
      <div className="min-h-screen pb-20" style={{ backgroundColor: THEME.bg }}>
        <SystemMenu />
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-6 py-4 border-b shadow-sm" style={{ borderColor: THEME.beige }}>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: THEME.darkOlive }}>
                <CreditCard color={THEME.burntOrange} /> {getTabName('expenses', '旅費統計')}
            </h2>
        </header>
        <div className="p-4 max-w-2xl mx-auto">
          <div onClick={() => { if(showExpenses) setShowExpenses(false); else setExpenseWarning(true); }} className="rounded-3xl p-8 mb-8 shadow-xl text-center text-white relative overflow-hidden cursor-pointer active:scale-95 transition-transform" style={{ background: `linear-gradient(to right, ${THEME.darkOlive}, ${THEME.olive})` }}>
             <p className="text-white/60 text-xs mb-2 uppercase tracking-widest font-bold">Total Spent (TWD)</p>
             <h3 className="text-5xl font-black tracking-tight">{showExpenses ? `$${expensesData.total.toLocaleString()}` : '$ *****'}</h3>
             <p className="text-xs text-white/50 mt-2">({showExpenses ? '點擊隱藏' : '點擊查看詳情'})</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border mb-8 h-72 shadow-sm" style={{ borderColor: THEME.beige }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expensesData.chart} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {expensesData.chart.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} itemStyle={{ color: THEME.darkOlive, fontWeight: 'bold' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <h3 className="text-xs font-bold uppercase mb-4 ml-2 tracking-widest" style={{ color: THEME.olive }}>Recent Transactions</h3>
          <div className="space-y-3">
            {data.expenses.slice(0, 20).map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm" style={{ borderColor: THEME.beige }}>
                <div><p className="font-bold text-sm" style={{ color: THEME.darkOlive }}>{item.Item}</p><p className="text-xs font-medium mt-0.5" style={{ color: THEME.sage }}>{item.Date} • {item.Category}</p></div>
                <div className="text-right"><p className="font-mono font-bold" style={{ color: THEME.burntOrange }}>{item.Final_TWD}</p><p className="text-[10px] px-2 py-0.5 rounded-full inline-block mt-1" style={{ backgroundColor: THEME.bg, color: THEME.olive }}>{item.Payer}</p></div>
              </div>
            ))}
          </div>
        </div>
        <BloodPressureModal isOpen={expenseWarning} onCancel={() => setExpenseWarning(false)} onConfirm={() => { setExpenseWarning(false); setShowExpenses(true); }} />
      </div>
    );
  }

  // INTRO (乾淨版)
  if (view === 'intro') {
    if (INTRO_VIDEO_URL && !videoError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black">
          <video src={fixGoogleLink(INTRO_VIDEO_URL, 'image')} autoPlay muted playsInline onEnded={() => setView('dashboard')} onError={() => setVideoError(true)} className="w-full h-full object-cover" />
          <button onClick={() => setView('dashboard')} className="absolute bottom-10 right-10 text-white/50 border border-white/30 px-4 py-2 rounded-full text-xs">Skip</button>
        </div>
      );
    }
    
    const isBefore = tripStatus.status === 'before';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#F9F7F2]">
        {FLOWCHART_IMAGE_URL && (
          <div className="absolute inset-0 z-0">
             <img src={fixGoogleLink(FLOWCHART_IMAGE_URL, 'image')} className="w-full h-full object-cover opacity-100" alt="bg" />
             <div className="absolute inset-0 bg-[#F9F7F2] opacity-85 backdrop-blur-[2px]" />
          </div>
        )}

        <div className="relative z-10 text-center p-6 w-full max-w-sm mx-auto flex flex-col items-center">
          <h1 className="text-6xl font-black mb-1 tracking-tight" style={{ color: THEME.darkOlive }}>Kia Ora!</h1>
          <h2 className="text-2xl font-bold mb-12" style={{ color: THEME.burntOrange }}>蔬菜去露營:紐西蘭篇</h2>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-stone-200 space-y-3 w-full mb-10">
               <div className={`py-1.5 px-3 rounded-lg text-white text-sm font-bold shadow-sm ${isBefore ? 'bg-[#FCA732]' : 'bg-[#7C6A0A]'}`}>
                 {isBefore 
                   ? `⏳ 距離紐西蘭冒險還有 ${tripStatus.val} 天` 
                   : `🎉 旅程進行中：Day ${tripStatus.val}`}
               </div>

               <div className="text-stone-700 py-1">
                 {isBefore ? (
                   <p className="text-lg font-bold">📍 目前距離大雪山：75 km</p>
                 ) : (
                   <div>
                     <p className="text-xl font-black" style={{ color: THEME.darkOlive }}>📍 距離大雪山 9,128 km</p>
                     <p className="text-xs font-bold text-stone-500 mt-1">= 去 120 次大雪山</p>
                   </div>
                 )}
               </div>
          </div>

          <button onClick={() => setView('dashboard')} className="group relative px-8 py-3 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95">
            <div className="absolute inset-0 rounded-full bg-orange-100 opacity-60 blur-md group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-[#FDB863] text-[#7C6A0A] font-black text-lg px-6 py-2 rounded-full border-2 border-[#7C6A0A]/10 shadow-sm flex items-center gap-2">
               Start Engine 🚐
            </div>
          </button>
        </div>
      </div>
    );
  }
  
  return null;
}