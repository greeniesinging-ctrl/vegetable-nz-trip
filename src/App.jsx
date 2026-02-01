import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { 
  Map as MapIcon, List, CheckSquare, CreditCard, X, 
  ChevronLeft, ChevronRight, Navigation, Droplets, 
  AlertTriangle, Home, Plane, Car, Utensils, Camera, ShoppingBag, 
  Info, Ticket, ArrowRight, ZoomIn, Search, ThermometerSun, Fuel, HeartPulse,
  Calendar, Cloud, CloudRain, Sun, CloudLightning, CloudSnow, Wind, Star,
  Copy, Check, ExternalLink, Tent, Minus
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// -----------------------------------------------------------------------------
// 📅 TRIP CONFIGURATION
// -----------------------------------------------------------------------------
const TRIP_START_DATE = new Date('2026-02-15'); 

// -----------------------------------------------------------------------------
// 🤣 SURVIVAL QUOTES
// -----------------------------------------------------------------------------
const QUOTES = {
  before: {
    def: "📍 即將距離大雪山 9,128 km",
    7: "😱 真的假的？行李箱還是空的？",
    6: "😱 真的假的？行李箱還是空的？",
    5: "😱 真的假的？行李箱還是空的？",
    4: "😱 真的假的？行李箱還是空的？",
    3: "🛂 護照找不找得到？現在找還來得及！",
    2: "🛂 護照找不找得到？現在找還來得及！",
    1: "🚀 Are You Ready? 明天就要飛了！",
    0: "✈️ 坐穩了！屁股準備爛掉吧！"
  },
  during: {
    1: "生存第 1 天：飛機餐好吃嗎？屁股還好嗎？",
    2: "生存第 2 天：雨刷跟方向燈有沒有一直打錯？",
    3: "生存第 3 天：靠左開！靠左開！全車複誦一遍！",
    6: "生存第 6 天：今天喉嚨有喊破嗎？🪂",
    14: "生存第 14 天：Big Six 完好無缺嗎？"
  }
};

// -----------------------------------------------------------------------------
// 🎨 THEME & COLORS
// -----------------------------------------------------------------------------
const THEME = {
  darkOlive: '#7C6A0A',
  olive: '#9B944C',
  sage: '#ABA96D',
  beige: '#DDCCAA',
  sand: '#FDB863',
  orange: '#FCA732',
  burntOrange: '#EB6424',
  bg: '#F9F7F2',
  white: '#FFFFFF',
  catTransport: '#A8A29E',
  catFood: '#F97316',
  catActivity: '#10B981',
  catStay: '#3B82F6',
  catShop: '#F59E0B'
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
// 🛠️ HELPERS
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

// 🖼️ Helper: STRICTLY NO PLACEHOLDERS
const getItineraryImage = (item) => {
  if (item.ImageURL) return fixGoogleLink(item.ImageURL, 'image');
  return null; 
};

const fetchWeather = async (lat, lng) => {
  if (!lat || !lng) return null;
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=1`);
    const data = await res.json();
    if (data.daily) {
      return {
        max: Math.round(data.daily.temperature_2m_max[0]),
        min: Math.round(data.daily.temperature_2m_min[0]),
        code: data.daily.weather_code[0]
      };
    }
  } catch (e) { console.error("Weather fetch failed", e); }
  return null;
};

const getWeatherIcon = (code) => {
  if (code === undefined) return <ThermometerSun size={20} color={THEME.olive} />;
  if (code <= 1) return <Sun size={20} color="#F59E0B" />; 
  if (code <= 3) return <Cloud size={20} color="#78716C" />; 
  if (code <= 48) return <Wind size={20} color="#A8A29E" />; 
  if (code <= 67) return <CloudRain size={20} color="#3B82F6" />; 
  if (code <= 77) return <CloudSnow size={20} color="#60A5FA" />; 
  if (code <= 82) return <CloudRain size={20} color="#1D4ED8" />; 
  if (code <= 86) return <CloudSnow size={20} color="#93C5FD" />; 
  if (code <= 99) return <CloudLightning size={20} color="#7C3AED" />; 
  return <ThermometerSun size={20} color={THEME.olive} />;
};

const getTripStatus = () => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const start = new Date(TRIP_START_DATE);
  start.setHours(0,0,0,0);
  const diffTime = today - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  if (diffDays < 0) return { status: 'before', val: Math.abs(diffDays) }; 
  return { status: 'during', val: diffDays + 1 }; 
};

const getSurvivalQuote = (status, val, todayHighlight) => {
    if (status === 'before') {
        if (val > 8) return QUOTES.before.def;
        return QUOTES.before[val] || QUOTES.before.def;
    } else {
        const specificQuote = QUOTES.during[val];
        if (specificQuote) return specificQuote;
        return todayHighlight ? `✨ 今日重點：${todayHighlight}` : "Adventure Time!";
    }
};

const getCategoryColor = (category) => {
    if (category?.includes('Transport')) return THEME.catTransport;
    if (category?.includes('Food')) return THEME.catFood;
    if (category?.includes('Activity')) return THEME.catActivity;
    if (category?.includes('Stay')) return THEME.catStay;
    if (category?.includes('Shopping')) return THEME.catShop;
    return THEME.olive; 
};

const getCategoryIcon = (category, title = "", color = "#fff", size = 18) => {
  if (category?.includes('Transport')) return title.includes('✈️') ? <Plane size={size} color={color} /> : <Car size={size} color={color} />;
  if (category?.includes('Stay')) return <Home size={size} color={color} />;
  if (category?.includes('Food')) return <Utensils size={size} color={color} />;
  if (category?.includes('Activity')) return <Camera size={size} color={color} />;
  if (category?.includes('Shopping')) return <ShoppingBag size={size} color={color} />;
  return <Info size={size} color={color} />;
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (emoji) => L.divIcon({
  html: `<div style="background-color: ${THEME.bg}; border-color: ${THEME.darkOlive}" class="flex items-center justify-center w-9 h-9 rounded-full shadow-lg text-xl border-2">${emoji}</div>`,
  className: 'custom-marker-icon', iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36]
});

// Map Helpers
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 10, { duration: 1.5 }); }, [center, map]);
  return null;
};

// 🔥 FORCE RESIZE when container height changes
const MapResizer = ({ isExpanded }) => {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 550); // Wait for transition to finish
        return () => clearTimeout(timer);
    }, [isExpanded, map]);
    return null;
};

// 🔥 AUTO RECENTER when collapsing (Returning to default view)
const MapResetOnCollapse = ({ isExpanded, center }) => {
    const map = useMap();
    useEffect(() => {
        if (!isExpanded && center) {
            // When collapsing, fly back to the original center
            const timer = setTimeout(() => {
                map.flyTo(center, 10, { duration: 1.5 });
            }, 100); 
            return () => clearTimeout(timer);
        }
    }, [isExpanded, center, map]);
    return null;
};

// 🔥 CLICK TO SHRINK
const MapClicker = ({ onClick }) => {
    useMapEvents({
        click: () => onClick(),
    });
    return null;
};

// -----------------------------------------------------------------------------
// 🧩 SUB-COMPONENTS
// -----------------------------------------------------------------------------

const CopyButton = ({ text, className }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className={`p-1.5 rounded-full bg-stone-100 border border-stone-200 shadow-sm active:scale-90 transition-all ${className}`}>
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-stone-500" />}
        </button>
    );
};

// 📱 Bottom Nav (Icon Only)
const BottomNav = ({ currentView, onChange }) => (
    <div className="fixed bottom-0 left-0 right-0 z-[5000] bg-white border-t border-stone-200 pb-safe h-16 px-4 flex justify-around items-center shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        {[
            { id: 'intro', icon: <Tent size={28} /> },
            { id: 'dashboard', icon: <MapIcon size={28} /> },
            { id: 'itinerary', icon: <List size={28} /> },
            { id: 'backpack', icon: <CheckSquare size={28} /> },
            { id: 'expenses', icon: <CreditCard size={28} /> },
        ].map(item => (
            <button 
                key={item.id} 
                onClick={() => onChange(item.id)}
                className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all ${currentView === item.id ? '-translate-y-2 shadow-lg shadow-orange-200' : 'opacity-40 hover:opacity-100'}`}
                style={{ backgroundColor: currentView === item.id ? THEME.burntOrange : 'transparent', color: currentView === item.id ? '#fff' : THEME.darkOlive }}
            >
                {item.icon}
            </button>
        ))}
    </div>
);

const TextZoomModal = ({ isOpen, content, onClose, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-md">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#F9F7F2] w-full max-w-lg max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden relative flex flex-col">
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-white/50"><h3 className="font-bold text-lg" style={{ color: THEME.olive }}>{title}</h3></div>
        {/* 🔥 FIX 3: TEXT ZOOMED TO 2XL */}
        <div className="p-8 overflow-y-auto"><p className="text-2xl leading-loose font-bold whitespace-pre-line" style={{ color: THEME.darkOlive }}>{content}</p></div>
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-white/30 backdrop-blur-md border border-white/50 shadow-sm"><X size={28} color={THEME.darkOlive} /></button>
      </motion.div>
    </div>
  );
};

const BloodPressureModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl">
        <HeartPulse size={48} className="text-red-500 mx-auto mb-4 animate-pulse" />
        <h3 className="text-xl font-black text-stone-800 mb-2">警告</h3>
        <p className="text-stone-600 font-medium mb-6">真的要看花了多少錢嗎？<br/>心臟準備好了？</p>
        <div className="flex gap-3"><button onClick={onCancel} className="flex-1 py-3 bg-stone-200 rounded-xl font-bold text-stone-600">先不要</button><button onClick={onConfirm} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold">深呼吸三次了</button></div>
      </motion.div>
    </div>
  );
};

const DaySelectorModal = ({ isOpen, onClose, summaryData, currentDay, onSelect }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-[10002] flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg" style={{ color: THEME.darkOlive }}>跳轉到哪一天？</h3><button onClick={onClose}><X size={24} color={THEME.sage} /></button></div>
          <div className="grid grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
             {summaryData.map((day, i) => (
                 <button key={i} onClick={() => onSelect(i)} className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all border ${currentDay === i ? 'scale-105 shadow-md text-white border-transparent' : 'bg-stone-50 border-stone-100'}`} style={{ backgroundColor: currentDay === i ? THEME.orange : undefined }}>
                    <span className="text-xs font-bold opacity-80 mb-0.5">D{day.Day}</span>
                    <span className={`text-sm font-black ${currentDay === i ? 'text-white' : 'text-stone-600'}`}>{day.Date ? day.Date.split('/')[1] + '/' + day.Date.split('/')[2] : '-'}</span>
                 </button>
             ))}
          </div>
        </motion.div>
      </div>
    );
};

// -----------------------------------------------------------------------------
// 🚀 MAIN APP
// -----------------------------------------------------------------------------

export default function App() {
  const [view, setView] = useState('intro');
  const [data, setData] = useState({ itinerary: [], summary: [], expenses: [], checklist: [], settings: {} });
  const [dayIndex, setDayIndex] = useState(0);
  const [itineraryMode, setItineraryMode] = useState('list');
  const [checklistState, setChecklistState] = useState({});
  const [zoomModal, setZoomModal] = useState({ open: false, content: '', title: '' });
  const [backpackTab, setBackpackTab] = useState('Check');
  const [videoError, setVideoError] = useState(false); 
  const [weatherData, setWeatherData] = useState({}); 
  const [showExpenses, setShowExpenses] = useState(false);
  const [expenseWarning, setExpenseWarning] = useState(false);
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); 
  
  // 🔥 Ref for Touch Logic
  const touchStartRef = useRef(0);

  const tripStatus = getTripStatus();

  // Reset function logic
  const handleStartEngine = () => {
      // Logic to find today's index
      const todayStatus = getTripStatus();
      if (todayStatus.status === 'during' && data.summary.length > 0) {
          const targetIndex = Math.min(todayStatus.val - 1, data.summary.length - 1);
          setDayIndex(Math.max(0, targetIndex));
      } else {
          setDayIndex(0); // Before trip or error, default to day 1
      }
      setView('dashboard');
  };

  // Global Reset Logic: Reset states when view changes
  useEffect(() => {
      setIsExpanded(false);
      window.scrollTo(0,0);
  }, [view]);

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

      // Initial day index setting also happens here for first load
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

  // 🎫 Filter Today's Vouchers
  const todaysVouchers = currentItinerary.filter(i => i.VoucherLink);

  const mapCenter = currentSummary.Start_Lat && currentSummary.Start_Lng 
    ? [parseFloat(currentSummary.Start_Lat), parseFloat(currentSummary.Start_Lng)] 
    : [-41.2865, 174.7762]; 

  const expensesData = useMemo(() => {
    let total = 0; const categories = {};
    data.expenses.forEach(e => {
      const amount = parseFloat((e.Final_TWD || "0").replace(/[$,NT]/g, ''));
      if (!isNaN(amount)) { total += amount; categories[e.Category || 'Other'] = (categories[e.Category || 'Other'] || 0) + amount; }
    });
    return { total, chart: Object.keys(categories).map(k => ({ name: k, value: categories[k] })) };
  }, [data.expenses]);

  const PIE_COLORS = [THEME.darkOlive, THEME.burntOrange, THEME.sand, THEME.olive, THEME.sage, THEME.beige];

  const checkFuelLogic = () => {
    const distStr = currentSummary['Drive Info'] || "";
    const distMatch = distStr.match(/(\d+)\s*km/);
    const dist = distMatch ? parseInt(distMatch[1]) : 0;
    const keywords = ['milford', 'cook', 'tekapo'];
    const scanText = ((currentSummary.Highlight || "") + (currentSummary['Drive Info'] || "") + (currentSummary['Memo'] || "") + (currentSummary['End_Loc'] || "")).toLowerCase();
    const isRemote = keywords.some(k => scanText.includes(k));
    if (isRemote) return { type: 'remote', msg: '⚠️ 進入偏遠地區！請在起點加滿油！' };
    if (dist > 200) return { type: 'long', msg: '⛽ 檢查剩餘油量' };
    return null;
  };
  const fuelAlert = checkFuelLogic();

  // -----------------------------------------------------------------------------
  // VIEW RENDERERS
  // -----------------------------------------------------------------------------

  // 1. DASHBOARD
  if (view === 'dashboard') {
    return (
      <div className="h-screen w-full flex flex-col relative overflow-hidden font-sans pb-16" style={{ backgroundColor: THEME.bg }}>
        
        {/* 🔥 FIX 1: HEADER WITHOUT ICON */}
        <header className="absolute top-0 left-0 right-0 z-[2000] bg-white/90 backdrop-blur-md border-b px-6 py-3 flex items-center justify-between shadow-sm h-14" style={{ borderColor: THEME.beige }}>
            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Icon removed */}
                <h2 className="text-base font-bold" style={{ color: THEME.darkOlive }}>{getTabName('dashboard', '旅程儀表')}</h2>
            </div>
            
            {currentSummary.Highlight && (
               <div className="flex-1 flex items-center justify-end gap-1.5 ml-3">
                  <Star size={12} className="text-orange-500 fill-orange-500 flex-shrink-0"/>
                  <span className="text-xs font-bold text-orange-600 text-right break-words leading-tight">{currentSummary.Highlight}</span>
               </div>
            )}
        </header>

        {/* MAP AREA (Dynamic Height) */}
        <div 
            className={`w-full relative z-0 transition-all duration-500 ease-in-out ${isExpanded ? 'h-[15%]' : 'h-[45%]'}`} 
        >
          <div className="w-full h-full pt-14"> 
            <MapContainer center={mapCenter} zoom={6} className="w-full h-full" zoomControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='© OpenStreetMap' />
                <MapUpdater center={mapCenter} />
                <MapResizer isExpanded={isExpanded} /> 
                <MapResetOnCollapse isExpanded={isExpanded} center={mapCenter} /> 
                <MapClicker onClick={() => setIsExpanded(false)} /> 
                {currentItinerary.map((stop, idx) => stop.Lat && (
                <Marker key={idx} position={[parseFloat(stop.Lat), parseFloat(stop.Lng)]} icon={createCustomIcon(stop.Category?.includes('Stay') ? '🏠' : stop.Category?.includes('Food') ? '🍔' : '📍')}>
                    <Popup>{stop.Title}</Popup>
                </Marker>
                ))}
            </MapContainer>
          </div>
        </div>

        {/* INFO SHEET (Dynamic Height) */}
        <div 
            className={`bg-white rounded-t-[2rem] relative z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] flex flex-col transition-all duration-500 ease-in-out ${isExpanded ? 'h-[85%] -mt-0' : 'h-[55%] -mt-6'}`}
            // 🔥 TOUCH GESTURE LOGIC (Restored)
            onTouchStart={(e) => { touchStartRef.current = e.touches[0].clientY; }}
            onTouchEnd={(e) => {
                const touchEnd = e.changedTouches[0].clientY;
                const diff = touchStartRef.current - touchEnd; 
                const container = e.currentTarget.querySelector('.scroll-container'); 
                const isAtTop = container ? container.scrollTop === 0 : true;
                
                if (!isExpanded && diff > 50) {
                     setIsExpanded(true);
                }
                if (isExpanded && isAtTop && diff < -50) {
                    setIsExpanded(false);
                }
            }}
        >
          {/* Drag Handle */}
          <div 
            className="w-full h-6 flex items-center justify-center cursor-pointer shrink-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
             <div className="w-12 h-1.5 bg-stone-200 rounded-full" />
          </div>

          <div 
            className="scroll-container flex-1 overflow-y-auto px-6 pb-4" 
            onScroll={(e) => { 
                if(e.currentTarget.scrollTop > 50 && !isExpanded) setIsExpanded(true); 
            }}
          >
            
            {/* HEADER: Date Selector */}
            <div className="flex items-center justify-between w-full mb-6">
                <button disabled={dayIndex === 0} onClick={() => setDayIndex(prev => Math.max(0, prev - 1))} className="p-2 rounded-full bg-stone-100 disabled:opacity-30"><ChevronLeft color={THEME.darkOlive}/></button>
                <div className="flex items-center gap-2">
                    <button onClick={() => jumpToItineraryDay(currentSummary.Day)} className="text-center group active:scale-95 transition-transform">
                        <h2 className="text-2xl font-black tracking-wide" style={{ color: THEME.darkOlive }}>{currentSummary.Date || 'Loading...'}</h2>
                        <span className="text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1 mt-1" style={{ backgroundColor: THEME.beige, color: THEME.darkOlive }}>
                        Day {currentSummary.Day || '-'} <ArrowRight size={10} />
                        </span>
                    </button>
                    <button onClick={() => setShowDaySelector(true)} className="p-2 rounded-full bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all"><Calendar size={18} color={THEME.olive} /></button>
                </div>
                <button disabled={dayIndex >= data.summary.length - 1} onClick={() => setDayIndex(prev => Math.min(data.summary.length - 1, prev + 1))} className="p-2 rounded-full bg-stone-100 disabled:opacity-30"><ChevronRight color={THEME.darkOlive}/></button>
            </div>

            {/* 🎫 Quick Wallet */}
            {todaysVouchers.length > 0 && (
                <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
                    {todaysVouchers.map((v, i) => (
                        <a key={i} href={fixGoogleLink(v.VoucherLink)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 bg-stone-900 text-white rounded-xl shadow-md shrink-0 active:scale-95 transition-transform">
                        <Ticket size={16} className="text-orange-400" />
                        <span className="text-xs font-bold truncate max-w-[120px]">{v.Title}</span>
                        <ExternalLink size={12} className="opacity-50" />
                        </a>
                    ))}
                </div>
            )}

            {currentSummary.Date ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl p-4 border flex items-center gap-3 shadow-sm" style={{ backgroundColor: THEME.bg, borderColor: THEME.beige }}>
                    <div className="p-2 bg-white rounded-full">{getWeatherIcon(currentWeather?.code)}</div>
                    <div>
                        <p className="text-xs font-bold uppercase opacity-60" style={{ color: THEME.darkOlive }}>{currentSummary['Weather City']}</p>
                        {/* 🔥 FIX 2: WEATHER FONT BIGGER (text-lg) */}
                        {currentWeather ? <p className="font-bold text-lg whitespace-nowrap" style={{ color: THEME.darkOlive }}>🔺{currentWeather.max}° 🔻{currentWeather.min}°</p> : <p className="font-bold text-sm" style={{ color: THEME.darkOlive }}>Loading...</p>}
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
                  <div className="flex items-center justify-between">
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
                  </div>
                  <div className="mt-2 flex items-center justify-between p-2 bg-stone-50 rounded-lg border border-stone-100">
                      <span className="text-xs text-stone-500 font-mono truncate mr-2">{currentSummary['End_Loc'] || '無特定地址'}</span>
                      {currentSummary['End_Loc'] && <CopyButton text={currentSummary['End_Loc']} />}
                  </div>
                  
                  {currentSummary['Road Warning'] && (
                    <div onClick={() => setZoomModal({ open: true, content: currentSummary['Road Warning'], title: 'Road Warning' })} className="mt-3 bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg text-xs text-amber-800 font-bold flex items-start gap-2 whitespace-pre-line relative cursor-pointer active:scale-[0.98]">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {currentSummary['Road Warning']}
                    </div>
                  )}
                </div>

                {currentSummary.Memo && (
                    <div onClick={() => setZoomModal({ open: true, content: currentSummary.Memo, title: 'Today Memo' })} className="rounded-2xl p-5 border shadow-sm relative cursor-pointer active:scale-[0.98] transition-transform hover:bg-stone-50" style={{ backgroundColor: THEME.bg, borderColor: THEME.lightSage }}>
                      <div className="absolute top-4 right-4 text-stone-300"><ZoomIn size={16} /></div>
                      <h3 className="text-xs uppercase font-bold mb-2 flex items-center gap-2" style={{ color: THEME.olive }}>📝 Memo</h3>
                      <p className="text-sm font-bold whitespace-pre-line" style={{ color: THEME.darkOlive }}>{currentSummary.Memo}</p>
                    </div>
                )}
              </div>
            ) : <div className="text-center p-10 text-stone-400">請填入 CSV 連結</div>}
          </div>
        </div>
        <BottomNav currentView={view} onChange={setView} />
        <TextZoomModal isOpen={zoomModal.open} content={zoomModal.content} title={zoomModal.title} onClose={() => setZoomModal({ ...zoomModal, open: false })} />
        <DaySelectorModal isOpen={showDaySelector} onClose={() => setShowDaySelector(false)} summaryData={data.summary} currentDay={dayIndex} onSelect={(i) => { setDayIndex(i); setShowDaySelector(false); }} />
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
      <div className="min-h-screen pb-24 flex" style={{ backgroundColor: THEME.bg }}>
        {itineraryMode === 'list' && (
           <div className="w-12 sticky top-0 h-screen flex flex-col items-center py-20 gap-2 z-30 overflow-y-auto no-scrollbar border-r" style={{ borderColor: THEME.beige, backgroundColor: 'rgba(255,255,255,0.5)' }}>
             {timelineDays.map(day => {
               const isEven = parseInt(day) % 2 === 0;
               return (
                <button 
                    key={day} 
                    onClick={() => document.getElementById(`day-${day}`)?.scrollIntoView({ behavior: 'smooth' })} 
                    className="w-8 h-8 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 transition-all hover:scale-110 mb-2 border border-orange-200" 
                    style={{ backgroundColor: isEven ? '#fff7ed' : '#ffedd5', color: '#c2410c' }}
                >D{day}</button>
               )
             })}
           </div>
        )}

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between shadow-sm pr-2" style={{ borderColor: THEME.beige }}>
            <div className="flex items-center gap-3">
               {/* 🔥 FIX 1: HEADER WITHOUT ICON */}
               <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: THEME.darkOlive }}>{getTabName('itinerary', '行程手帳')}</h2>
            </div>
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
                const daySummary = data.summary.find(s => s.Day === day) || {};
                
                return (
                  <div key={day} id={`day-${day}`} className="py-8 scroll-mt-20 border-b-2 border-dashed border-stone-300/50">
                    <div className="px-4 mb-6">
                      <div className="flex items-baseline gap-3 mb-2">
                        <h3 className="text-3xl font-black text-stone-800 tracking-tighter">Day {day}</h3>
                        <span className="text-stone-500 font-bold text-sm tracking-widest">{items[0].Date}</span>
                      </div>
                      <h4 className="text-xl font-bold leading-tight" style={{ color: THEME.darkOlive }}>{daySummary.Highlight || `Adventure Day ${day}`}</h4>
                    </div>
                    <div className="space-y-4 px-4"> 
                      {items.map((item, idx) => {
                        const catColor = getCategoryColor(item.Category);
                        const currentHour = new Date().getHours();
                        const itemHour = item.Time ? parseInt(item.Time.split(':')[0]) : -1;
                        const isActive = tripStatus.status === 'during' && tripStatus.val.toString() === day && currentHour >= itemHour && currentHour < (itemHour + 2);
                        const displayImage = getItineraryImage(item);

                        return (
                        <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, y: 10 }} 
                            whileInView={{ opacity: 1, y: 0 }} 
                            viewport={{ once: true }} 
                            className={`relative rounded-2xl overflow-hidden bg-white shadow-sm border transition-all ${isActive ? 'ring-2 ring-offset-2 ring-orange-400 scale-[1.02]' : ''}`}
                            style={{ borderColor: THEME.beige }}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: catColor }} />
                          
                          <div className="pl-6 p-4">
                              <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-3">
                                      {item.Time && (
                                          <div className="flex flex-col">
                                              <span className="text-xl font-black font-mono tracking-tight" style={{ color: THEME.darkOlive }}>{item.Time.replace(/:00$/, '')}</span>
                                          </div>
                                      )}
                                      <div className="p-1.5 rounded-full bg-stone-100">
                                          {getCategoryIcon(item.Category, item.Title, catColor, 20)}
                                      </div>
                                  </div>
                                  {isActive && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">🔥 NOW</span>}
                              </div>

                              <h4 className="font-bold text-lg leading-tight mb-2" style={{ color: THEME.darkOlive }}>{item.Title}</h4>
                              
                              <div onClick={() => setZoomModal({ open: true, content: item.Description, title: item.Title })} className="mb-3 text-sm text-stone-600 line-clamp-2 active:opacity-60 cursor-pointer">
                                  {item.Description}
                              </div>

                              {displayImage && (
                                <div className="mb-3 rounded-lg overflow-hidden h-36 w-full relative group">
                                    <img src={displayImage} className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={(e) => e.target.style.display = 'none'} />
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
                                  {item.GoogleMapLink && (
                                    <div className="flex items-center gap-1">
                                        <a href={fixGoogleLink(item.GoogleMapLink)} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-200">
                                            <Navigation size={14} /> 導航
                                        </a>
                                        <CopyButton text={item.Title} className="bg-stone-50" />
                                    </div>
                                  )}
                                  {item.VoucherLink && <a href={fixGoogleLink(item.VoucherLink)} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm" style={{ backgroundColor: THEME.sand }}><Ticket size={14} /> 憑證</a>}
                              </div>
                          </div>
                        </motion.div>
                      )})}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <BottomNav currentView={view} onChange={setView} />
        <TextZoomModal isOpen={zoomModal.open} content={zoomModal.content} title={zoomModal.title} onClose={() => setZoomModal({ ...zoomModal, open: false })} />
      </div>
    );
  }

  // 3. BACKPACK
  if (view === 'backpack') {
    const items = data.checklist.filter(i => i.Type === (backpackTab === 'Check' ? 'Check' : 'Info'));
    return (
      <div className="min-h-screen pb-24" style={{ backgroundColor: THEME.bg }}>
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b shadow-sm px-6 py-4 flex flex-col justify-center" style={{ borderColor: THEME.beige }}>
            <div className="flex items-center gap-3 mb-3">
                <CheckSquare size={20} color={THEME.burntOrange} /> 
                <h2 className="text-xl font-bold" style={{ color: THEME.darkOlive }}>{getTabName('backpack', '背包清單')}</h2>
            </div>
            <div className="flex px-0 pb-0 gap-2">
                <button onClick={() => setBackpackTab('Check')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${backpackTab === 'Check' ? 'shadow-sm' : 'opacity-50 hover:opacity-80'}`} style={{ backgroundColor: backpackTab === 'Check' ? THEME.olive : '#e5e5e5', color: backpackTab === 'Check' ? '#fff' : THEME.darkOlive }}>真的都有帶嗎？</button>
                <button onClick={() => setBackpackTab('Info')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${backpackTab === 'Info' ? 'shadow-sm' : 'opacity-50 hover:opacity-80'}`} style={{ backgroundColor: backpackTab === 'Info' ? THEME.burntOrange : '#e5e5e5', color: backpackTab === 'Info' ? '#fff' : THEME.darkOlive }}>通通給我看三遍！</button>
            </div>
        </header>
        <div className="p-4 max-w-2xl mx-auto space-y-3">
          {items.length > 0 ? items.map((item, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }} className={`p-4 rounded-2xl border transition-all flex items-start gap-4 shadow-sm ${backpackTab === 'Info' ? 'bg-amber-50 border-amber-100 cursor-pointer' : checklistState[item.Content] ? 'opacity-50 grayscale' : 'bg-white'}`} style={{ borderColor: backpackTab === 'Check' ? THEME.beige : undefined }} onClick={() => { if(backpackTab === 'Check') handleChecklistToggle(item.Content); else setZoomModal({ open: true, content: item.Note, title: item.Content }); }}>
              {backpackTab === 'Check' && <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checklistState[item.Content] ? 'bg-emerald-500 border-emerald-500' : ''}`} style={{ borderColor: THEME.olive, backgroundColor: checklistState[item.Content] ? THEME.olive : '#fff' }}>{checklistState[item.Content] && <Check size={16} className="text-white" />}</div>}
              {backpackTab === 'Info' && <AlertTriangle className="text-amber-500 w-6 h-6 shrink-0" />}
              <div className="flex-1"><p className={`font-bold text-lg ${checklistState[item.Content] ? 'line-through' : ''}`} style={{ color: THEME.darkOlive }}>{item.Content}</p>{item.Note && <p className="text-sm mt-1 font-medium" style={{ color: THEME.olive }}>{item.Note}</p>}</div>
            </motion.div>
          )) : <div className="text-center py-10 text-stone-400 font-bold">目前沒有項目</div>}
        </div>
        <BottomNav currentView={view} onChange={setView} />
        <TextZoomModal isOpen={zoomModal.open} content={zoomModal.content} title={zoomModal.title} onClose={() => setZoomModal({ ...zoomModal, open: false })} />
      </div>
    );
  }

  // 4. EXPENSES
  if (view === 'expenses') {
    return (
      <div className="min-h-screen pb-24" style={{ backgroundColor: THEME.bg }}>
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-6 py-4 border-b shadow-sm flex items-center justify-start gap-3" style={{ borderColor: THEME.beige }}>
            <CreditCard size={20} color={THEME.burntOrange} /> 
            <h2 className="text-xl font-bold" style={{ color: THEME.darkOlive }}>{getTabName('expenses', '旅費統計')}</h2>
        </header>
        <div className="p-4 max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl p-6 border mb-8 h-72 shadow-sm" style={{ borderColor: THEME.beige }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expensesData.chart} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{expensesData.chart.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}</Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} itemStyle={{ color: THEME.darkOlive, fontWeight: 'bold' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <h3 className="text-xs font-bold uppercase mb-4 ml-2 tracking-widest" style={{ color: THEME.olive }}>Recent Transactions</h3>
          <div className="space-y-3 mb-8">
            {data.expenses.slice(0, 20).map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm" style={{ borderColor: THEME.beige }}>
                <div><p className="font-bold text-sm" style={{ color: THEME.darkOlive }}>{item.Item}</p><p className="text-xs font-medium mt-0.5" style={{ color: THEME.sage }}>{item.Date} • {item.Category}</p></div>
                <div className="text-right"><p className="font-mono font-bold" style={{ color: THEME.burntOrange }}>{item.Final_TWD}</p><p className="text-[10px] px-2 py-0.5 rounded-full inline-block mt-1" style={{ backgroundColor: THEME.bg, color: THEME.olive }}>{item.Payer}</p></div>
              </div>
            ))}
          </div>
          <div onClick={() => { if(showExpenses) setShowExpenses(false); else setExpenseWarning(true); }} className="rounded-3xl p-8 shadow-xl text-center text-white relative overflow-hidden cursor-pointer active:scale-95 transition-transform" style={{ background: `linear-gradient(to right, ${THEME.darkOlive}, ${THEME.olive})` }}>
             <p className="text-white/60 text-xs mb-2 uppercase tracking-widest font-bold">Total Spent (TWD)</p>
             <h3 className="text-5xl font-black tracking-tight">{showExpenses ? `$${expensesData.total.toLocaleString()}` : '$ *****'}</h3>
             <p className="text-xs text-white/50 mt-2">({showExpenses ? '點擊隱藏' : '點擊查看詳情'})</p>
          </div>
        </div>
        <BottomNav currentView={view} onChange={setView} />
        <BloodPressureModal isOpen={expenseWarning} onCancel={() => setExpenseWarning(false)} onConfirm={() => { setExpenseWarning(false); setShowExpenses(true); }} />
      </div>
    );
  }

  // INTRO
  if (view === 'intro') {
    if (INTRO_VIDEO_URL && !videoError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black">
          <video src={fixGoogleLink(INTRO_VIDEO_URL, 'image')} autoPlay muted playsInline onEnded={handleStartEngine} onError={() => setVideoError(true)} className="w-full h-full object-cover" />
          <button onClick={handleStartEngine} className="absolute bottom-10 right-10 text-white/50 border border-white/30 px-4 py-2 rounded-full text-xs">Skip</button>
        </div>
      );
    }
    const isBefore = tripStatus.status === 'before';
    const survivalQuote = getSurvivalQuote(tripStatus.status, tripStatus.val, currentSummary.Highlight);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#F9F7F2]">
        {FLOWCHART_IMAGE_URL && (
          <div className="absolute inset-0 z-0">
             <img src={fixGoogleLink(FLOWCHART_IMAGE_URL, 'image')} className="w-full h-full object-cover opacity-100" alt="bg" />
             <div className="absolute inset-0 bg-[#F9F7F2] opacity-85 backdrop-blur-[2px]" />
          </div>
        )}
        <div className="relative z-10 text-center p-6 w-full max-w-sm mx-auto flex flex-col items-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} className="text-6xl font-black mb-1 tracking-tight" style={{ color: THEME.darkOlive }}>Kia Ora!</motion.h1>
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.8 }} className="text-2xl font-bold mb-10" style={{ color: THEME.burntOrange }}>蔬菜去露營:紐西蘭篇</motion.h2>
          
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.2, type: 'spring' }} className="mb-6 flex flex-col items-center justify-center w-48 h-48 rounded-full border-4 shadow-xl bg-white/50 backdrop-blur-sm relative" style={{ borderColor: THEME.orange }}>
               {isBefore ? (
                   <div className="flex flex-col items-center justify-center w-full h-full">
                      <span className="text-8xl font-black tracking-tighter leading-none pb-2" style={{ color: THEME.darkOlive }}>{tripStatus.val}</span>
                      <span className="text-xs font-bold uppercase tracking-widest mt-0 text-stone-500">Days to Go</span>
                   </div>
               ) : (
                   <div className="flex flex-col items-center justify-center w-full h-full">
                      <span className="text-6xl font-black tracking-tighter leading-none pb-1" style={{ color: THEME.darkOlive }}>Day {tripStatus.val}</span>
                      <span className="text-xs font-bold uppercase tracking-widest mt-1 text-stone-500">Survival Mode</span>
                   </div>
               )}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="bg-white/60 backdrop-blur-sm px-6 py-3 rounded-xl shadow-sm mb-10 max-w-xs border border-white/50">
             <p className="text-sm font-bold text-stone-700 leading-relaxed">
               {survivalQuote}
             </p>
          </motion.div>

          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2 }} onClick={handleStartEngine} className="group relative px-8 py-3 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95">
            <div className="absolute inset-0 rounded-full bg-orange-100 opacity-60 blur-md group-hover:opacity-100 transition-opacity animate-pulse"></div>
            <div className="relative bg-[#FDB863] text-[#7C6A0A] font-black text-lg px-6 py-2 rounded-full border-2 border-[#7C6A0A]/10 shadow-sm flex items-center gap-2">Start Engine 🚐</div>
          </motion.button>
        </div>
      </div>
    );
  }
  return null;
}