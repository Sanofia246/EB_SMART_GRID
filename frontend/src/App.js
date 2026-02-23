import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function App() {
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [stats, setStats] = useState({ peakTime: "Pending", ecoTime: "Pending", totalBill: 0 });

  const formatTimeRange = (hourStr) => {
    const h = parseInt(hourStr);
    if (isNaN(h)) return "Pending";
    if (h >= 6 && h <= 10) return "06:00 - 10:00";
    if (h >= 18 && h <= 22) return "18:00 - 22:00";
    const start = h < 10 ? `0${h}:00` : `${h}:00`;
    const end = (h + 1) < 10 ? `0${h + 1}:00` : `${h + 1}:00`;
    return `${start} - ${end}`;
  };

  useEffect(() => {
    fetch('http://localhost:5000/api/daily')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const loadKey = Object.keys(data[0]).find(k => k.includes('kVAh') || k === 'yhat' || k === 'predicted_kVAh');
          const hourKey = Object.keys(data[0]).find(k => k.includes('hour') || k === 'ds' || k.includes('str'));
          let peakRow = data[0], ecoRow = data[0];
          data.forEach(row => {
            if (parseFloat(row[loadKey]) > parseFloat(peakRow[loadKey])) peakRow = row;
            if (parseFloat(row[loadKey]) < parseFloat(ecoRow[loadKey])) ecoRow = row;
          });
          setDailyData(data.map(d => ({ hour: d[hourKey], val: parseFloat(d[loadKey]) || 0 })));
          setStats(prev => ({ ...prev, peakTime: formatTimeRange(peakRow[hourKey]), ecoTime: `${ecoRow[hourKey]}:00` }));
        }
      }).catch(err => console.error("Daily fetch error:", err));

    fetch('http://localhost:5000/api/monthly')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setMonthlyData(data);
          const total = data.reduce((acc, curr) => acc + (parseFloat(curr.predicted_price) || 0), 0);
          setStats(prev => ({ ...prev, totalBill: total.toFixed(2) }));
        }
      }).catch(err => console.error("Monthly fetch error:", err));
  }, []);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("TNEB SMART GRID - MONTHLY FORECAST", 14, 22);
    const tableRows = monthlyData.map(row => [row.date || 'N/A', `Rs. ${row.predicted_price || 0}`]);
    autoTable(doc, {
      startY: 55,
      head: [['Date', 'Estimated Cost']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [243, 198, 35], textColor: [0, 0, 0] },
    });
    doc.save("TNEB_Smart_Bill.pdf");
  };

  return (
    <div style={{ backgroundColor: '#0A0C10', color: '#E2E8F0', minHeight: '100vh', padding: 'clamp(15px, 5vw, 30px)', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        flexDirection: window.innerWidth < 600 ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: window.innerWidth < 600 ? 'flex-start' : 'center', 
        gap: '20px',
        marginBottom: '40px' 
      }}>
        <h1 style={{ color: '#F3C623', margin: 0, fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}>⚡ TNEB AI DASHBOARD</h1>
        <button onClick={downloadPDF} style={{ padding: '12px 24px', background: '#F3C623', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: window.innerWidth < 600 ? '100%' : 'auto' }}>
          📥 DOWNLOAD BILL PDF
        </button>
      </div>

      {/* Stats Grid - Auto Responsive */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px', 
        marginBottom: '40px' 
      }}>
        <StatBox title="🚨 PEAK WINDOW" value={stats.peakTime} sub="Avoid Heavy Usage" color="#EF4444" />
        <StatBox title="✅ ECO HOUR" value={stats.ecoTime} sub="Best for Washing" color="#10B981" />
        <StatBox title="💰 EST. TOTAL BILL" value={`Rs. ${stats.totalBill}`} sub="Next 30 Days" color="#F3C623" />
      </div>

      {/* Charts Grid - Stacks on mobile */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', 
        gap: '20px' 
      }}>
        <ChartContainer title="Next 24 Hours Demand (kVAh)">
          <AreaChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="hour" stroke="#8B949E" fontSize={12} />
            <YAxis stroke="#8B949E" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#161B22', border: 'none' }} />
            <Area type="monotone" dataKey="val" stroke="#F3C623" fill="#F3C623" fillOpacity={0.1}/>
          </AreaChart>
        </ChartContainer>

        <ChartContainer title="30-Day Cost Trend">
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" hide />
            <YAxis stroke="#8B949E" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#161B22', border: 'none' }} />
            <Bar dataKey="predicted_price" fill="#10B981" />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

const StatBox = ({ title, value, sub, color }) => (
  <div style={{ background: '#161B22', padding: '25px', borderRadius: '12px', borderTop: `4px solid ${color}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
    <p style={{ color: '#8B949E', margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</p>
    <h2 style={{ fontSize: '1.4rem', margin: '10px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</h2>
    <p style={{ color, fontSize: '0.8rem', fontWeight: 'bold' }}>{sub}</p>
  </div>
);

const ChartContainer = ({ title, children }) => (
  <div style={{ background: '#161B22', padding: '20px', borderRadius: '12px', height: '350px', minWidth: '0' }}>
    <h3 style={{ marginBottom: '20px', fontSize: '1rem', color: '#8B949E' }}>{title}</h3>
    <div style={{ width: '100%', height: '80%' }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  </div>
);

export default App;