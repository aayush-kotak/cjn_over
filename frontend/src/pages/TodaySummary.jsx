import { useState, useEffect } from 'react';
import { showToast } from '../components/Toast';
import { apiFetch } from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import EditTransactionModal from '../components/EditTransactionModal';

const getTodayDate = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => { try { return new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return d||''; } };

// ── Detail Modal ──────────────────────────────────────────────
function DetailModal({ title, icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <h2 className="text-lg font-black text-primary-dark">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold transition-colors text-lg">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Clickable Card ────────────────────────────────────────────
function ClickCard({ icon, label, value, gradient, onClick, badge }) {
  return (
    <button onClick={onClick}
      className={`bg-gradient-to-br ${gradient} text-white p-5 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all w-full text-left relative cursor-pointer`}>
      {badge > 0 && (
        <span className="absolute top-2 right-2 bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge} entries</span>
      )}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-white/80">{label}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-white/70 mt-1.5">👆 Tap to view all entries</p>
    </button>
  );
}

export default function TodaySummary() {
  const [summary, setSummary]             = useState(null);
  const [history, setHistory]             = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [activeModal, setActiveModal]     = useState(null);

  const [editTarget, setEditTarget]       = useState(null);   // { type, entry }
  const [deleteTarget, setDeleteTarget]   = useState(null);   // { type, entry }
  const [deleteSaving, setDeleteSaving]  = useState(false);

  const isAdmin = (() => {
    try { return localStorage.getItem('cjn_role') === 'admin'; } catch { return false; }
  })();

  // PDF modal
  const [showPdfModal, setShowPdfModal]   = useState(false);
  const [pdfFrom, setPdfFrom]             = useState(getTodayDate());
  const [pdfTo, setPdfTo]                 = useState(getTodayDate());

  // Expense form
  const [expDesc, setExpDesc]             = useState('');
  const [expAmt, setExpAmt]               = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [labourers, setLabourers]         = useState(1);

  // ── Fetch today summary ───────────────────────────────────
  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await apiFetch(`/api/summary/today-summary?date=${getTodayDate()}`);
      if (!res || !res.ok) throw new Error('Failed');
      setSummary(await res.json());
    } catch { showToast('Failed to load summary', 'error'); }
    finally  { setLoadingSummary(false); }
  };

  // ── Fetch day history ─────────────────────────────────────
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiFetch('/api/summary/day-history');
      if (!res || !res.ok) throw new Error('Failed');
      setHistory(await res.json());
    } catch { showToast('Failed to load history', 'error'); }
    finally  { setLoadingHistory(false); }
  };

  useEffect(() => { fetchSummary(); fetchHistory(); }, []);

  const openEdit = (type, entry) => {
    setDeleteTarget(null);
    // Align types with EditTransactionModal
    const modalType = type === 'cash' ? 'cash-sale' : (type === 'debit' ? 'debit-sale' : type);
    setEditTarget({ type: modalType, entry });
  };

  const onEditSave = () => {
    setEditTarget(null);
    fetchSummary();
    fetchHistory();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { type, entry } = deleteTarget;

    setDeleteSaving(true);
    try {
      let url = null;
      if (type === 'cash') url = `/api/cash-sale/${entry.id}`;
      if (type === 'debit') url = `/api/debit-sale/${entry.id}`;
      if (type === 'credit') url = `/api/credit/${entry.id}`;
      if (type === 'expenses') url = `/api/expenses/${entry.id}`;

      const res = await apiFetch(url, { method: 'DELETE' });
      if (!res || !res.ok) {
        const data = await res?.json();
        throw new Error(data?.error || 'Delete failed');
      }

      showToast('Deleted successfully!');
      setDeleteTarget(null);

      fetchSummary();
      fetchHistory();
    } catch (err) {
      showToast(err?.message || 'Delete failed', 'error');
    } finally {
      setDeleteSaving(false);
    }
  };

  // ── Add expense ───────────────────────────────────────────
  const handleAddExpense = async () => {
    if (!expDesc.trim() || !Number(expAmt)) {
      showToast('Enter expense description and amount', 'error'); return;
    }
    setSavingExpense(true);
    try {
      const res = await apiFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ date: getTodayDate(), amount: Number(expAmt), category: expDesc.trim(), note: expDesc.trim() })
      });
      if (!res || !res.ok) throw new Error('Failed');
      showToast('Expense saved!');
      setExpDesc(''); setExpAmt('');
      fetchSummary(); fetchHistory();
    } catch { showToast('Failed to save expense', 'error'); }
    finally  { setSavingExpense(false); }
  };

  // ── PDF GENERATOR ─────────────────────────────────────────
  const handleGeneratePdf = async () => {
    if (!pdfFrom || !pdfTo) { showToast('Select both dates', 'error'); return; }
    if (pdfFrom > pdfTo)    { showToast('From date cannot be after To date', 'error'); return; }
    setShowPdfModal(false);
    setGeneratingPdf(true);
    try {
      if (!window.jspdf) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const res = await apiFetch(`/api/summary/range?from=${pdfFrom}&to=${pdfTo}`);
      if (!res || !res.ok) throw new Error('Server error: ' + (res?.status || 'unknown'));
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Server returned non-JSON. Restart server.'); }

      const { summaries=[], cashEntries=[], debitEntries=[], creditEntries=[], expenses=[] } = data;
      if (!summaries.length && !cashEntries.length && !debitEntries.length && !creditEntries.length) {
        showToast('No data found for selected date range', 'error');
        setGeneratingPdf(false); return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
      const PW=210, MG=12, CW=PW-MG*2; let y=0;
      const fmt     = n => 'Rs.'+Number(n||0).toLocaleString('en-IN');
      const checkBr = (need=12) => { if (y+need>278) { doc.addPage(); y=16; } };
      const fillRect = (x,ry,w,h,rgb) => { doc.setFillColor(...rgb); doc.rect(x,ry,w,h,'F'); };
      const txt = (str,x,ry,opts={}) => {
        doc.setFontSize(opts.size||8); doc.setFont('helvetica',opts.bold?'bold':'normal');
        doc.setTextColor(...(opts.color||[30,30,30]));
        doc.text(String(str??'-'),x,ry,{maxWidth:opts.maxW,align:opts.align||'left'});
      };

      // Header
      fillRect(0,0,PW,34,[22,101,52]);
      txt('CJN PVT LTD',PW/2,11,{size:20,bold:true,color:[255,255,255],align:'center'});
      txt('CATTLE FEED SHOP — BUSINESS REPORT',PW/2,19,{size:9,color:[187,247,208],align:'center'});
      txt(`${fmtDate(pdfFrom)}  to  ${fmtDate(pdfTo)}`,PW/2,27,{size:8,color:[255,255,255],align:'center'});
      y=40;

      const gCash=summaries.reduce((s,d)=>s+(d.total_cash||0),0);
      const gDebit=summaries.reduce((s,d)=>s+(d.total_debit||0),0);
      const gCredit=summaries.reduce((s,d)=>s+(d.total_credit||0),0);
      const gExp=summaries.reduce((s,d)=>s+(d.total_expenses||0),0);
      const gNet=gCash+gCredit-gExp;

      const cards=[
        {label:'TOTAL CASH',val:fmt(gCash),bg:[209,250,229],tc:[21,128,61]},
        {label:'TOTAL DEBIT',val:fmt(gDebit),bg:[254,226,226],tc:[185,28,28]},
        {label:'TOTAL CREDIT',val:fmt(gCredit),bg:[254,243,199],tc:[146,64,14]},
        {label:'TOTAL EXPENSES',val:fmt(gExp),bg:[255,237,213],tc:[180,60,0]},
        {label:'NET BALANCE',val:fmt(gNet),bg:[220,252,231],tc:[22,101,52]},
        {label:'ACTIVE DAYS',val:String(summaries.length),bg:[219,234,254],tc:[29,78,216]},
      ];
      const cW2=(CW-6)/3; let cx=MG;
      cards.forEach((c,i)=>{
        if(i>0&&i%3===0){cx=MG;y+=22;}
        fillRect(cx,y,cW2,19,c.bg); doc.setDrawColor(200,200,200); doc.setLineWidth(0.3); doc.rect(cx,y,cW2,19,'S');
        txt(c.label,cx+cW2/2,y+7,{size:6.5,color:[100,100,100],align:'center'});
        txt(c.val,cx+cW2/2,y+15,{size:10,bold:true,color:c.tc,align:'center'});
        cx+=cW2+3;
      });
      y+=26;
      doc.setDrawColor(22,101,52); doc.setLineWidth(0.5); doc.line(MG,y,PW-MG,y); y+=6;

      // Day summary table
      checkBr(20); fillRect(MG,y,CW,8,[22,101,52]);
      txt('  DAY-BY-DAY SUMMARY',MG+2,y+5.5,{size:10,bold:true,color:[255,255,255]}); y+=10;
      const dX=[MG+2,MG+36,MG+68,MG+100,MG+132,MG+160],dW=[32,30,30,30,26,26];
      fillRect(MG,y,CW,7,[34,139,70]);
      ['Date','Cash','Debit','Credit','Expenses','Net Total'].forEach((h,i)=>txt(h,dX[i],y+4.8,{size:7.5,bold:true,color:[255,255,255],maxW:dW[i],align:i>0?'right':'left'}));
      y+=7;
      summaries.forEach((day,ri)=>{
        checkBr(8); fillRect(MG,y,CW,7,ri%2===0?[248,252,248]:[255,255,255]);
        doc.setDrawColor(220,230,220); doc.setLineWidth(0.3); doc.rect(MG,y,CW,7,'S');
        const net=(day.total_cash||0)+(day.total_credit||0)-(day.total_expenses||0);
        [fmtDate(day.date),fmt(day.total_cash),fmt(day.total_debit),fmt(day.total_credit),fmt(day.total_expenses),fmt(net)]
          .forEach((v,i)=>txt(v,dX[i],y+4.8,{size:7.5,bold:i===5,color:i===5?[22,101,52]:[30,30,30],maxW:dW[i],align:i>0?'right':'left'}));
        y+=7;
      });
      checkBr(9); fillRect(MG,y,CW,8,[22,101,52]);
      txt('PERIOD TOTALS',MG+2,y+5.5,{size:8,bold:true,color:[255,255,255]});
      txt(fmt(gNet),PW-MG-2,y+5.5,{size:8,bold:true,color:[255,255,255],align:'right'}); y+=12;

      // Debit entries
      checkBr(20); fillRect(MG,y,CW,8,[185,28,28]);
      txt('  DEBIT SALE ENTRIES (with Bag Details)',MG+2,y+5.5,{size:10,bold:true,color:[255,255,255]}); y+=10;
      if(!debitEntries.length){txt('No debit entries.',MG+4,y+5,{size:9,color:[160,160,160]});y+=12;}
      else {
        const byd={};
        debitEntries.forEach(e=>{if(!byd[e.date])byd[e.date]=[];byd[e.date].push(e);});
        Object.keys(byd).sort().forEach(date=>{
          checkBr(18); fillRect(MG,y,CW,7,[255,235,235]); doc.setDrawColor(220,180,180); doc.setLineWidth(0.3); doc.rect(MG,y,CW,7,'S');
          txt(`  ${fmtDate(date)}`,MG+2,y+4.8,{size:9,bold:true,color:[185,28,28]}); y+=7;
          const dCX=[MG+2,MG+48,MG+95,MG+118,MG+142,MG+164];
          fillRect(MG,y,CW,6.5,[220,60,60]);
          ['Customer','Bag Name','Qty','Rate','Subtotal','Note'].forEach((h,i)=>txt(h,dCX[i],y+4.5,{size:7,bold:true,color:[255,255,255],maxW:44,align:i>=2?'right':'left'}));
          y+=6.5;
          let dt=0;
          byd[date].forEach((entry,ri)=>{
            const bags=Array.isArray(entry.bags)?entry.bags:[];
            if(bags.length>0){
              bags.forEach((bag,bi)=>{
                checkBr(7); const sub=(Number(bag.numberOfBags)||0)*(Number(bag.pricePerBag)||0);
                fillRect(MG,y,CW,6.5,(ri+bi)%2===0?[255,248,248]:[255,255,255]);
                doc.setDrawColor(235,220,220); doc.setLineWidth(0.2); doc.rect(MG,y,CW,6.5,'S');
                [bi===0?(entry.customer_name||'-'):'',bag.bagName||'-',String(bag.numberOfBags||0),fmt(bag.pricePerBag),fmt(sub),bi===0?(entry.note||'-'):'']
                  .forEach((v,i)=>txt(v,dCX[i],y+4.5,{size:7.5,maxW:44,align:i>=2?'right':'left'}));
                y+=6.5;
              });
            } else {
              checkBr(7); fillRect(MG,y,CW,6.5,ri%2===0?[255,248,248]:[255,255,255]);
              doc.setDrawColor(235,220,220); doc.setLineWidth(0.2); doc.rect(MG,y,CW,6.5,'S');
              [entry.customer_name||'-','-','-','-',fmt(entry.amount),entry.note||'-']
                .forEach((v,i)=>txt(v,dCX[i],y+4.5,{size:7.5,maxW:44,align:i>=2?'right':'left'}));
              y+=6.5;
            }
            dt+=Number(entry.amount)||0;
          });
          checkBr(7); fillRect(MG,y,CW,7,[255,225,225]); doc.setDrawColor(200,150,150); doc.setLineWidth(0.3); doc.rect(MG,y,CW,7,'S');
          txt('Day Total Debit:',MG+2,y+4.8,{size:8,bold:true,color:[185,28,28]});
          txt(fmt(dt),PW-MG-2,y+4.8,{size:8,bold:true,color:[185,28,28],align:'right'}); y+=9;
        });
        checkBr(9); fillRect(MG,y,CW,8,[185,28,28]);
        txt(`GRAND TOTAL DEBIT (${debitEntries.length} entries)`,MG+2,y+5.5,{size:8.5,bold:true,color:[255,255,255]});
        txt(fmt(gDebit),PW-MG-2,y+5.5,{size:8.5,bold:true,color:[255,255,255],align:'right'}); y+=12;
      }

      // Credit entries
      checkBr(20); fillRect(MG,y,CW,8,[146,64,14]);
      txt('  CREDIT RECEIVED ENTRIES',MG+2,y+5.5,{size:10,bold:true,color:[255,255,255]}); y+=10;
      if(!creditEntries.length){txt('No credit entries.',MG+4,y+5,{size:9,color:[160,160,160]});y+=12;}
      else {
        const byc={};
        creditEntries.forEach(e=>{if(!byc[e.date])byc[e.date]=[];byc[e.date].push(e);});
        Object.keys(byc).sort().forEach(date=>{
          checkBr(18); fillRect(MG,y,CW,7,[255,248,230]); doc.setDrawColor(220,200,160); doc.setLineWidth(0.3); doc.rect(MG,y,CW,7,'S');
          txt(`  ${fmtDate(date)}`,MG+2,y+4.8,{size:9,bold:true,color:[146,64,14]}); y+=7;
          fillRect(MG,y,CW,6.5,[200,100,20]);
          txt('Customer Name',MG+2,y+4.5,{size:7,bold:true,color:[255,255,255],maxW:96});
          txt('Date',MG+100,y+4.5,{size:7,bold:true,color:[255,255,255],maxW:38});
          txt('Amount',MG+140,y+4.5,{size:7,bold:true,color:[255,255,255],maxW:24,align:'right'});
          txt('Note',MG+166,y+4.5,{size:7,bold:true,color:[255,255,255],maxW:22}); y+=6.5;
          let ct=0;
          byc[date].forEach((entry,ri)=>{
            checkBr(7); fillRect(MG,y,CW,6.5,ri%2===0?[255,252,240]:[255,255,255]);
            doc.setDrawColor(235,220,190); doc.setLineWidth(0.2); doc.rect(MG,y,CW,6.5,'S');
            txt(entry.customer_name||'-',MG+2,y+4.5,{size:7.5,maxW:96});
            txt(fmtDate(entry.date),MG+100,y+4.5,{size:7.5,maxW:38});
            txt(fmt(entry.amount),MG+140,y+4.5,{size:7.5,maxW:24,align:'right'});
            txt(entry.note||'-',MG+166,y+4.5,{size:7.5,maxW:22}); y+=6.5;
            ct+=Number(entry.amount)||0;
          });
          checkBr(7); fillRect(MG,y,CW,7,[255,240,200]); doc.setDrawColor(220,200,140); doc.setLineWidth(0.3); doc.rect(MG,y,CW,7,'S');
          txt('Day Total Credit:',MG+2,y+4.8,{size:8,bold:true,color:[146,64,14]});
          txt(fmt(ct),PW-MG-2,y+4.8,{size:8,bold:true,color:[146,64,14],align:'right'}); y+=9;
        });
        checkBr(9); fillRect(MG,y,CW,8,[146,64,14]);
        txt(`GRAND TOTAL CREDIT (${creditEntries.length} entries)`,MG+2,y+5.5,{size:8.5,bold:true,color:[255,255,255]});
        txt(fmt(gCredit),PW-MG-2,y+5.5,{size:8.5,bold:true,color:[255,255,255],align:'right'}); y+=12;
      }

      // Cash entries
      checkBr(20); fillRect(MG,y,CW,8,[6,95,70]);
      txt('  CASH SALE ENTRIES',MG+2,y+5.5,{size:10,bold:true,color:[255,255,255]}); y+=10;
      if(!cashEntries.length){txt('No cash entries.',MG+4,y+5,{size:9,color:[160,160,160]});y+=12;}
      else {
        fillRect(MG,y,CW,6.5,[20,130,90]);
        txt('Date',MG+2,y+4.5,{size:7,bold:true,color:[255,255,255],maxW:30});
        txt('Customer',MG+36,y+4.5,{size:7,bold:true,color:[255,255,255],maxW:56});
        txt('Bags Info',MG+96,y+4.5,{size:7,bold:true,color:[255,255,255],maxW:60});
        txt('Amount',MG+160,y+4.5,{size:7,bold:true,color:[255,255,255],maxW:26,align:'right'}); y+=6.5;
        cashEntries.forEach((entry,ri)=>{
          const bi=Array.isArray(entry.bags)&&entry.bags.length>0?entry.bags.map(b=>`${b.bagName}x${b.numberOfBags}@${b.pricePerBag}`).join(', '):'-';
          checkBr(7); fillRect(MG,y,CW,7,ri%2===0?[240,253,244]:[255,255,255]);
          doc.setDrawColor(200,230,210); doc.setLineWidth(0.2); doc.rect(MG,y,CW,7,'S');
          txt(fmtDate(entry.date),MG+2,y+4.8,{size:7.5,maxW:32});
          txt(entry.customer_name||'-',MG+36,y+4.8,{size:7.5,maxW:58});
          txt(bi,MG+96,y+4.8,{size:7.5,maxW:62});
          txt(fmt(entry.amount),MG+160,y+4.8,{size:7.5,maxW:26,align:'right'}); y+=7;
        });
        checkBr(9); fillRect(MG,y,CW,8,[6,95,70]);
        txt(`GRAND TOTAL CASH (${cashEntries.length} entries)`,MG+2,y+5.5,{size:8.5,bold:true,color:[255,255,255]});
        txt(fmt(gCash),PW-MG-2,y+5.5,{size:8.5,bold:true,color:[255,255,255],align:'right'}); y+=12;
      }

      // Expenses
      checkBr(20); fillRect(MG,y,CW,8,[124,45,18]);
      txt('  EXPENSES (KHARCHO)',MG+2,y+5.5,{size:10,bold:true,color:[255,255,255]}); y+=10;
      if(!expenses.length){txt('No expenses.',MG+4,y+5,{size:9,color:[160,160,160]});y+=12;}
      else {
        fillRect(MG,y,CW,6.5,[160,60,20]);
        txt('Date',MG+2,y+4.5,{size:7,bold:true,color:[255,255,255],maxW:30});
        txt('Description',MG+36,y+4.5,{size:7,bold:true,color:[255,255,255],maxW:120});
        txt('Amount',MG+160,y+4.5,{size:7,bold:true,color:[255,255,255],maxW:26,align:'right'}); y+=6.5;
        expenses.forEach((entry,ri)=>{
          checkBr(7); fillRect(MG,y,CW,7,ri%2===0?[255,247,237]:[255,255,255]);
          doc.setDrawColor(230,210,190); doc.setLineWidth(0.2); doc.rect(MG,y,CW,7,'S');
          txt(fmtDate(entry.date),MG+2,y+4.8,{size:7.5,maxW:32});
          txt(entry.category||entry.note||'-',MG+36,y+4.8,{size:7.5,maxW:122});
          txt(fmt(entry.amount),MG+160,y+4.8,{size:7.5,maxW:26,align:'right'}); y+=7;
        });
        checkBr(9); fillRect(MG,y,CW,8,[124,45,18]);
        txt(`GRAND TOTAL EXPENSES (${expenses.length} entries)`,MG+2,y+5.5,{size:8.5,bold:true,color:[255,255,255]});
        txt(fmt(gExp),PW-MG-2,y+5.5,{size:8.5,bold:true,color:[255,255,255],align:'right'}); y+=12;
      }

      // Final box
      checkBr(30); fillRect(MG,y,CW,26,[22,101,52]);
      txt('FINAL NET BALANCE FOR PERIOD',PW/2,y+8,{size:11,bold:true,color:[255,255,255],align:'center'});
      txt(`Cash ${fmt(gCash)}  +  Credit ${fmt(gCredit)}  −  Expenses ${fmt(gExp)}`,PW/2,y+15,{size:8,color:[187,247,208],align:'center'});
      txt(fmt(gNet),PW/2,y+23,{size:16,bold:true,color:[255,255,255],align:'center'}); y+=32;

      // Footer on all pages
      const tp=doc.internal.getNumberOfPages();
      for(let p=1;p<=tp;p++){
        doc.setPage(p); doc.setDrawColor(200,200,200); doc.setLineWidth(0.3); doc.line(MG,288,PW-MG,288);
        doc.setFontSize(6.5); doc.setFont('helvetica','normal'); doc.setTextColor(150,150,150);
        doc.text(`CJN PVT LTD  |  ${fmtDate(pdfFrom)} to ${fmtDate(pdfTo)}  |  ${new Date().toLocaleString('en-IN')}`,MG,292);
        doc.text(`Page ${p}/${tp}`,PW-MG,292,{align:'right'});
      }

      doc.save(`CJN_Report_${pdfFrom}_to_${pdfTo}.pdf`);
      showToast('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF error:', err);
      showToast('Failed: ' + err.message, 'error');
    } finally { setGeneratingPdf(false); }
  };

  const totalBags       = summary?.totalBags || 0;
  const totalLabourCost = totalBags * 3;
  const perLabour       = labourers > 0 ? totalLabourCost / labourers : 0;
  const todayExpenses   = summary?.entries?.expense  || [];
  const cashEntries     = summary?.entries?.cash     || [];
  const debitEntries    = summary?.entries?.debit    || [];
  const creditEntries   = summary?.entries?.credit   || [];
  const todayStr        = getTodayDate();
  const minDateStr      = new Date(new Date().setFullYear(new Date().getFullYear()-3)).toISOString().slice(0,10);

  if (loadingSummary) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-text-secondary font-medium">Loading today's summary...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* ── DETAIL MODALS ─────────────────────────────────── */}
      {activeModal === 'cash' && (
        <DetailModal title="Today's Cash Sale Entries" icon="💰" onClose={() => setActiveModal(null)}>
          {cashEntries.length === 0 ? (
            <div className="text-center py-12"><div className="text-4xl mb-2">💰</div><p className="text-text-secondary font-medium">No cash sales recorded today</p></div>
          ) : (
            <>
              <div className="space-y-3">
                {cashEntries.map((entry, i) => {
                  const bags = Array.isArray(entry.bags) ? entry.bags : [];
                  const totalQty = bags.reduce((s,b) => s+(Number(b.numberOfBags)||0), 0);
                  return (
                    <div key={entry.id||i} className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-black text-primary-dark text-sm">👤 {entry.customer_name||'CASH CUSTOMER'}</p>
                          <p className="text-xs text-text-secondary mt-0.5">📅 {fmtDate(entry.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-600 text-lg">Rs.{Number(entry.amount).toLocaleString('en-IN')}</p>
                          <p className="text-xs text-text-secondary">{totalQty} bags total</p>
                          {isAdmin && (
                            <div className="mt-2 flex gap-2 justify-end">
                              <button onClick={() => openEdit('cash', entry)} className="p-1.5 hover:bg-white rounded transition-colors text-sm" title="Edit">✏️</button>
                              <button onClick={() => setDeleteTarget({ type: 'cash', entry })} className="p-1.5 hover:bg-white rounded transition-colors text-sm" title="Delete">🗑️</button>
                            </div>
                          )}
                        </div>
                      </div>
                      {bags.length > 0 && (
                        <div className="border-t border-green-200 pt-2 mt-2">
                          <table className="w-full text-xs"><thead><tr className="text-text-secondary"><th className="text-left py-1">Bag Name</th><th className="text-center py-1">Qty</th><th className="text-right py-1">Price/Bag</th><th className="text-right py-1">Subtotal</th></tr></thead>
                            <tbody>{bags.map((bag, bi) => (<tr key={bi} className="border-t border-green-100"><td className="py-1 font-medium">{bag.bagName}</td><td className="py-1 text-center">{bag.numberOfBags}</td><td className="py-1 text-right">Rs.{Number(bag.pricePerBag).toLocaleString('en-IN')}</td><td className="py-1 text-right font-bold text-emerald-600">Rs.{((Number(bag.numberOfBags)||0)*(Number(bag.pricePerBag)||0)).toLocaleString('en-IN')}</td></tr>))}</tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-4 bg-emerald-600 text-white rounded-xl flex justify-between items-center">
                <span className="font-bold">Total Cash ({cashEntries.length} entries)</span>
                <span className="text-xl font-black">Rs.{(summary?.totalCash||0).toLocaleString('en-IN')}</span>
              </div>
            </>
          )}
        </DetailModal>
      )}

      {activeModal === 'credit' && (
        <DetailModal title="Today's Credit Received Entries" icon="📥" onClose={() => setActiveModal(null)}>
          {creditEntries.length === 0 ? (
            <div className="text-center py-12"><div className="text-4xl mb-2">📥</div><p className="text-text-secondary font-medium">No credit received today</p></div>
          ) : (
            <>
              <div className="space-y-3">
                {creditEntries.map((entry, i) => (
                  <div key={entry.id||i} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="font-black text-primary-dark text-sm">👤 {entry.customer_name||'-'}</p>
                      <p className="text-xs text-text-secondary mt-0.5">📅 {fmtDate(entry.date)}</p>
                      {entry.note && <p className="text-xs text-text-secondary mt-0.5">📝 {entry.note}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="font-black text-amber-600 text-xl">Rs.{Number(entry.amount).toLocaleString('en-IN')}</p>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button onClick={() => openEdit('credit', entry)} className="p-1.5 hover:bg-white rounded transition-colors text-sm" title="Edit">✏️</button>
                          <button onClick={() => setDeleteTarget({ type: 'credit', entry })} className="p-1.5 hover:bg-white rounded transition-colors text-sm" title="Delete">🗑️</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-amber-600 text-white rounded-xl flex justify-between items-center">
                <span className="font-bold">Total Credit ({creditEntries.length} entries)</span>
                <span className="text-xl font-black">Rs.{(summary?.totalCredit||0).toLocaleString('en-IN')}</span>
              </div>
            </>
          )}
        </DetailModal>
      )}

      {activeModal === 'debit' && (
        <DetailModal title="Today's Debit Sale Entries" icon="📤" onClose={() => setActiveModal(null)}>
          {debitEntries.length === 0 ? (
            <div className="text-center py-12"><div className="text-4xl mb-2">📤</div><p className="text-text-secondary font-medium">No debit sales recorded today</p></div>
          ) : (
            <>
              <div className="space-y-3">
                {debitEntries.map((entry, i) => {
                  const bags = Array.isArray(entry.bags) ? entry.bags : [];
                  const totalQty = bags.reduce((s,b) => s+(Number(b.numberOfBags)||0), 0);
                  return (
                    <div key={entry.id||i} className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-black text-primary-dark text-sm">👤 {entry.customer_name||'-'}</p>
                          <p className="text-xs text-text-secondary mt-0.5">📅 {fmtDate(entry.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-red-600 text-lg">Rs.{Number(entry.amount).toLocaleString('en-IN')}</p>
                          <p className="text-xs text-text-secondary">{totalQty} bags total</p>
                          {isAdmin && (
                            <div className="mt-2 flex gap-2 justify-end">
                              <button onClick={() => openEdit('debit', entry)} className="p-1.5 hover:bg-white rounded transition-colors text-sm" title="Edit">✏️</button>
                              <button onClick={() => setDeleteTarget({ type: 'debit', entry })} className="p-1.5 hover:bg-white rounded transition-colors text-sm" title="Delete">🗑️</button>
                            </div>
                          )}
                        </div>
                      </div>
                      {bags.length > 0 && (
                        <div className="border-t border-red-200 pt-2 mt-2">
                          <table className="w-full text-xs"><thead><tr className="text-text-secondary"><th className="text-left py-1">Bag Name</th><th className="text-center py-1">Qty</th><th className="text-right py-1">Price/Bag</th><th className="text-right py-1">Subtotal</th></tr></thead>
                            <tbody>{bags.map((bag, bi) => (<tr key={bi} className="border-t border-red-100"><td className="py-1 font-medium">{bag.bagName}</td><td className="py-1 text-center">{bag.numberOfBags}</td><td className="py-1 text-right">Rs.{Number(bag.pricePerBag).toLocaleString('en-IN')}</td><td className="py-1 text-right font-bold text-red-600">Rs.{((Number(bag.numberOfBags)||0)*(Number(bag.pricePerBag)||0)).toLocaleString('en-IN')}</td></tr>))}</tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-4 bg-red-600 text-white rounded-xl flex justify-between items-center">
                <span className="font-bold">Total Debit ({debitEntries.length} entries)</span>
                <span className="text-xl font-black">Rs.{(summary?.totalDebit||0).toLocaleString('en-IN')}</span>
              </div>
            </>
          )}
        </DetailModal>
      )}

      {/* Edit Modal */}
      {isAdmin && editTarget && (
        <EditTransactionModal
          type={editTarget.type}
          entry={editTarget.entry}
          onSave={onEditSave}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {/* Delete Confirmation */}
      {isAdmin && deleteTarget && (
        <ConfirmModal
          title={`Delete ${deleteTarget.type.replace('-', ' ')}?`}
          confirmText="Yes, Delete Permanently"
          loading={deleteSaving}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        >
          <div className="space-y-3">
            <p className="text-sm text-text-secondary font-medium italic">Warning: This will permanently remove the record and re-adjust the balances.</p>
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <p className="text-sm"><strong>Type:</strong> <span className="capitalize">{deleteTarget.type}</span></p>
              <p className="text-sm"><strong>Amount:</strong> ₹{Number(deleteTarget.entry.amount).toLocaleString('en-IN')}</p>
              <p className="text-sm"><strong>Date:</strong> {fmtDate(deleteTarget.entry.date)}</p>
            </div>
          </div>
        </ConfirmModal>
      )}

      {/* ── PDF MODAL ─────────────────────────────────────── */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-500 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">📄</div>
                <div><h2 className="text-lg font-black text-white">Download PDF Report</h2><p className="text-xs text-red-100">Select the date range</p></div>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-primary-dark mb-1.5 uppercase">From Date *</label>
                  <input type="date" value={pdfFrom} onChange={e=>setPdfFrom(e.target.value)} min={minDateStr} max={pdfTo||todayStr}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white focus:border-red-500 outline-none text-sm font-medium"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary-dark mb-1.5 uppercase">To Date *</label>
                  <input type="date" value={pdfTo} onChange={e=>setPdfTo(e.target.value)} min={pdfFrom||minDateStr} max={todayStr}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-white focus:border-red-500 outline-none text-sm font-medium"/>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs font-bold text-text-secondary uppercase mb-2">Quick Select</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {label:'Today',        from:todayStr, to:todayStr},
                    {label:'Last 7 Days',  from:new Date(Date.now()-6*86400000).toISOString().slice(0,10), to:todayStr},
                    {label:'This Month',   from:new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10), to:todayStr},
                    {label:'Last 30 Days', from:new Date(Date.now()-29*86400000).toISOString().slice(0,10), to:todayStr},
                  ].map(q=>(
                    <button key={q.label} onClick={()=>{setPdfFrom(q.from);setPdfTo(q.to);}}
                      className="text-xs font-bold py-2 px-3 bg-gray-50 border-2 border-border text-text-secondary hover:bg-primary/10 hover:border-primary hover:text-primary rounded-xl transition-all">
                      📅 {q.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={()=>setShowPdfModal(false)} className="flex-1 py-3 border-2 border-border text-text-secondary font-bold rounded-xl hover:bg-bg transition-colors">Cancel</button>
                <button onClick={handleGeneratePdf} disabled={!pdfFrom||!pdfTo}
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-black rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  <span>📥</span> Generate & Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAGE HEADER ───────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">📊</div>
          <div>
            <h1 className="text-2xl font-black text-primary-dark">Today's Summary</h1>
            <p className="text-sm text-text-secondary">{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
        </div>
        <button onClick={()=>setShowPdfModal(true)} disabled={generatingPdf}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-black rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60">
          {generatingPdf ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Generating...</> : <><span className="text-lg">📄</span> Download PDF Report</>}
        </button>
      </div>

      {/* ── SUMMARY CARDS ─────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-primary-dark mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-primary rounded-full"></span>
          Today's Total Sales Summary
          <span className="text-xs font-normal text-text-secondary ml-1">(tap any card to view entries)</span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <ClickCard icon="💰" label="Total Cash Collected"  value={`Rs.${(summary?.totalCash||0).toLocaleString('en-IN')}`}  gradient="from-emerald-600 to-green-500"  badge={cashEntries.length}                          onClick={() => setActiveModal('cash')} />
          <ClickCard icon="📥" label="Total Credit Received" value={`Rs.${(summary?.totalCredit||0).toLocaleString('en-IN')}`} gradient="from-amber-600 to-yellow-500"   badge={creditEntries.length}                        onClick={() => setActiveModal('credit')} />
          <ClickCard icon="📦" label="Total Bags Sold"       value={totalBags}                                                  gradient="from-teal-600 to-cyan-500"                                                            onClick={() => {}} />
          <ClickCard icon="📈" label="Combined Revenue"      value={`Rs.${((summary?.totalCash||0)+(summary?.totalCredit||0)).toLocaleString('en-IN')}`} gradient="from-indigo-600 to-blue-500" badge={cashEntries.length+creditEntries.length} onClick={() => setActiveModal('combined')} />
          <ClickCard icon="📤" label="Debit Done (Per Day)"  value={`Rs.${(summary?.totalDebit||0).toLocaleString('en-IN')}`}  gradient="from-red-600 to-rose-500"      badge={debitEntries.length}                         onClick={() => setActiveModal('debit')} />
        </div>
      </section>

      {/* ── EXPENSES ──────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-primary-dark mb-4 flex items-center gap-2"><span className="w-1.5 h-6 bg-warning rounded-full"></span>Today's Kharcho (Expenses)</h2>
        <div className="bg-white rounded-2xl shadow-md border border-border p-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <input type="text" value={expDesc} onChange={e=>setExpDesc(e.target.value)} placeholder="Expense description"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none text-sm font-medium"/>
            <input type="number" min="1" value={expAmt} onChange={e=>setExpAmt(e.target.value)} placeholder="Amount (Rs.)"
              className="w-full sm:w-36 px-4 py-3 rounded-xl border-2 border-border focus:border-primary outline-none text-sm font-medium"/>
            <button onClick={handleAddExpense} disabled={savingExpense}
              className="px-6 py-3 bg-gradient-to-r from-warning to-amber-400 text-primary-dark font-bold rounded-xl hover:shadow-lg transition-all text-sm disabled:opacity-50 whitespace-nowrap">
              {savingExpense ? '...' : '+ Add'}
            </button>
          </div>
          {todayExpenses.length > 0 ? (
            <div className="space-y-2 mb-4">
              {todayExpenses.map((exp,i) => (
                <div key={exp.id||i} className="flex justify-between items-center py-2 px-3 bg-bg rounded-xl">
                  <span className="text-sm font-medium text-text">{exp.category||exp.note||'Expense'}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-danger">-Rs.{Number(exp.amount).toLocaleString('en-IN')}</span>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button onClick={() => openEdit('expenses', exp)} className="p-1.5 hover:bg-white rounded transition-colors text-sm" title="Edit">✏️</button>
                        <button onClick={() => setDeleteTarget({ type: 'expenses', entry: exp })} className="p-1.5 hover:bg-white rounded transition-colors text-sm" title="Delete">🗑️</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-text-secondary text-center py-3 mb-4">No expenses today</p>}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center py-2 px-4 bg-red-50 rounded-xl">
              <span className="font-bold text-danger text-sm">Total Expenses</span>
              <span className="font-black text-danger">Rs.{(summary?.totalExpenses||0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-primary to-primary-light text-white rounded-xl">
              <span className="font-bold text-sm">Final Total (Cash + Credit − Expenses)</span>
              <span className="text-xl font-black">Rs.{(summary?.finalTotal||0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── LABOUR ────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-primary-dark mb-4 flex items-center gap-2"><span className="w-1.5 h-6 bg-primary-light rounded-full"></span>Labour Calculation</h2>
        <div className="bg-white rounded-2xl shadow-md border border-border p-6">
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-bg rounded-xl"><p className="text-xs text-text-secondary font-semibold uppercase mb-1">Total Bags</p><p className="text-2xl font-black text-primary-dark">{totalBags}</p></div>
            <div className="text-center p-4 bg-bg rounded-xl"><p className="text-xs text-text-secondary font-semibold uppercase mb-1">Rate / Bag</p><p className="text-2xl font-black text-primary-dark">Rs.3</p></div>
            <div className="text-center p-4 bg-gold/20 rounded-xl"><p className="text-xs text-text-secondary font-semibold uppercase mb-1">Total Labour</p><p className="text-2xl font-black text-primary-dark">Rs.{totalLabourCost.toLocaleString('en-IN')}</p></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-primary-dark mb-1.5">No. of Labourers</label>
              <select value={labourers} onChange={e=>setLabourers(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm font-medium">
                {[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n} Labourer{n>1?'s':''}</option>)}
              </select>
            </div>
            <div className="flex-1 text-center p-4 bg-gradient-to-r from-primary to-primary-light text-white rounded-xl">
              <p className="text-xs font-semibold uppercase mb-1 text-green-100">Per Labourer</p>
              <p className="text-3xl font-black">Rs.{perLabour.toLocaleString('en-IN',{maximumFractionDigits:2})}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DAY HISTORY ───────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-primary-dark mb-4 flex items-center gap-2"><span className="w-1.5 h-6 bg-earth rounded-full"></span>Complete Day History</h2>
        <div className="bg-white rounded-2xl shadow-md border border-border overflow-hidden">
          {loadingHistory ? (
            <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div><p className="text-sm text-text-secondary">Loading...</p></div>
          ) : history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-dark text-white">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-right py-3 px-4 font-semibold">Cash</th>
                    <th className="text-right py-3 px-4 font-semibold">Debit</th>
                    <th className="text-right py-3 px-4 font-semibold">Credit</th>
                    <th className="text-right py-3 px-4 font-semibold">Expenses</th>
                    <th className="text-right py-3 px-4 font-semibold">Final Total</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((day,i)=>(
                    <tr key={day.date} className={`border-b border-border ${i%2===0?'bg-white':'bg-bg'} hover:bg-primary/5 transition-colors`}>
                      <td className="py-3 px-4 font-medium">{new Date(day.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-semibold">Rs.{(day.totalCash||0).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-red-500 font-semibold">Rs.{(day.totalDebit||0).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-amber-600 font-semibold">Rs.{(day.totalCredit||0).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-danger font-semibold">Rs.{(day.expenses||0).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-black text-primary-dark">Rs.{(day.finalTotal||0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center"><div className="text-4xl mb-2">📅</div><p className="text-text-secondary font-medium">No history yet. Start recording sales!</p></div>
          )}
        </div>
      </section>
    </div>
  );
}