"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Download,
  FileSpreadsheet, FileText, Filter, LogOut, Menu, Plus, Printer, Search,
  ShieldCheck, Trash2, UserRound, UsersRound, X,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import Image from "next/image";

type Operator = "Marcos Gabriel" | "Everton Douglas";
type View = "dashboard" | "records" | "reports";
type PrintRecord = {
  id: number; printDate: string; requester: string; sector: string; segment: string;
  material: string; pageSize: string; pagesPerCopy: number; copies: number;
  printMode: string; printedFaces: number; sheetsUsed: number; authorized: boolean;
  operator: Operator; notes: string; createdAt: string;
};

const emptyForm = {
  printDate: new Date().toISOString().slice(0, 10), requester: "", sector: "Coordenação",
  segment: "EFAF", material: "", pageSize: "A4", pagesPerCopy: 1, copies: 1,
  printMode: "simplex", authorized: true, notes: "",
};

const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; };
const today = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [records, setRecords] = useState<PrintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [start, setStart] = useState(monthStart());
  const [end, setEnd] = useState(today());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      const saved = window.localStorage.getItem("print-operator") as Operator | null;
      if (saved === "Marcos Gabriel" || saved === "Everton Douglas") setOperator(saved);
      try {
        const response = await fetch("/api/prints", { cache: "no-store" });
        if (!response.ok) throw new Error();
        setRecords(await response.json());
      } catch { toast.error("Não foi possível carregar os registros."); }
      finally { setLoading(false); }
    })();
  }, []);

  function login(name: Operator) { window.localStorage.setItem("print-operator", name); setOperator(name); }
  function logout() { window.localStorage.removeItem("print-operator"); setOperator(null); setView("dashboard"); }

  const currentMonth = useMemo(() => records.filter(r => r.printDate >= monthStart() && r.printDate <= today()), [records]);
  const totals = useMemo(() => ({
    services: currentMonth.length,
    sheets: currentMonth.reduce((sum, r) => sum + r.sheetsUsed, 0),
    faces: currentMonth.reduce((sum, r) => sum + r.printedFaces, 0),
    copies: currentMonth.reduce((sum, r) => sum + r.copies, 0),
  }), [currentMonth]);
  const filtered = useMemo(() => { const q = search.toLowerCase(); return records.filter(r => !q || [r.requester, r.material, r.sector, r.segment, r.operator].some(v => v.toLowerCase().includes(q))); }, [records, search]);
  const reportRows = useMemo(() => records.filter(r => r.printDate >= start && r.printDate <= end), [records, start, end]);
  const previewFaces = Number(form.pagesPerCopy || 0) * Number(form.copies || 0);
  const previewSheets = (form.printMode === "duplex" ? Math.ceil(Number(form.pagesPerCopy || 0) / 2) : Number(form.pagesPerCopy || 0)) * Number(form.copies || 0);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!operator) return; setSaving(true);
    try {
      const response = await fetch("/api/prints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, operator }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setRecords(prev => [data, ...prev]); setForm({ ...emptyForm, printDate: today() }); setModal(false);
      toast.success("Impressão registrada com sucesso.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }

  async function removeRecord(id: number) {
    if (!window.confirm("Excluir este registro de impressão?")) return;
    const response = await fetch(`/api/prints/${id}`, { method: "DELETE" });
    if (response.ok) { setRecords(prev => prev.filter(r => r.id !== id)); toast.success("Registro excluído."); }
    else toast.error("Não foi possível excluir.");
  }

  function exportExcel() {
    if (!reportRows.length) { toast.error("Não há registros no período selecionado."); return; }
    const totalSheets = reportRows.reduce((s, r) => s + r.sheetsUsed, 0);
    const totalFaces = reportRows.reduce((s, r) => s + r.printedFaces, 0);
    const escape = (value: unknown) => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const rows = reportRows.map(r => `<Row>${[
      formatDate(r.printDate),r.requester,r.sector,r.segment,r.material,r.pageSize,r.pagesPerCopy,r.copies,
      r.printMode === "duplex" ? "Frente e verso" : "Somente frente",r.printedFaces,r.sheetsUsed,
      r.authorized ? "Sim" : "Não",r.operator,r.notes,
    ].map(v => `<Cell><Data ss:Type="${typeof v === "number" ? "Number" : "String"}">${escape(v)}</Data></Cell>`).join("")}</Row>`).join("");
    const headers = ["Data","Solicitante","Setor","Segmento","Material","Papel","Páginas/arquivo","Cópias","Modo","Faces impressas","Folhas utilizadas","Autorizada","Responsável TI","Observações"];
    const summary = `<Row><Cell><Data ss:Type="String">RESUMO DO PERÍODO</Data></Cell></Row><Row><Cell><Data ss:Type="String">Data inicial</Data></Cell><Cell><Data ss:Type="String">${formatDate(start)}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Data final</Data></Cell><Cell><Data ss:Type="String">${formatDate(end)}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Total de serviços</Data></Cell><Cell><Data ss:Type="Number">${reportRows.length}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Faces impressas</Data></Cell><Cell><Data ss:Type="Number">${totalFaces}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Folhas utilizadas</Data></Cell><Cell><Data ss:Type="Number">${totalSheets}</Data></Cell></Row>`;
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#093B74" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="Resumo"><Table>${summary}</Table></Worksheet><Worksheet ss:Name="Registros"><Table><Row ss:StyleID="Header">${headers.map(h=>`<Cell><Data ss:Type="String">${h}</Data></Cell>`).join("")}</Row>${rows}</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url;
    link.download = `Relatorio_Impressoes_${start}_a_${end}.xls`; link.click(); URL.revokeObjectURL(url);
    toast.success("Relatório do Excel gerado.");
  }

  if (!operator) return <Login onLogin={login} />;

  return <div className="app-shell">
    <Toaster richColors position="top-right" />
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <button className="mobile-close" onClick={() => setMobileMenu(false)} aria-label="Fechar menu"><X size={20}/></button>
      <div className="brand"><div className="brand-mark"><Printer size={23}/></div><div><strong>PrintControl</strong><span>Coleguium Dom Bosco</span></div></div>
      <nav><Nav icon={<BarChart3/>} label="Visão geral" active={view === "dashboard"} onClick={() => {setView("dashboard");setMobileMenu(false)}}/><Nav icon={<ClipboardList/>} label="Registros" active={view === "records"} onClick={() => {setView("records");setMobileMenu(false)}}/><Nav icon={<FileSpreadsheet/>} label="Relatórios" active={view === "reports"} onClick={() => {setView("reports");setMobileMenu(false)}}/></nav>
      <div className="sidebar-info"><ShieldCheck size={18}/><p><strong>Controle interno</strong><span>Dados organizados e prontos para consulta.</span></p></div>
      <div className="user-card"><div className="avatar">{operator.split(" ").map(n=>n[0]).slice(0,2).join("")}</div><div><strong>{operator}</strong><span>Suporte de TI</span></div><button onClick={logout} title="Sair"><LogOut size={18}/></button></div>
    </aside>
    <main className="content">
      <header className="topbar"><button className="menu-button" onClick={() => setMobileMenu(true)}><Menu/></button><div><span className="eyebrow">CONTROLE DE IMPRESSÕES</span><h1>{view === "dashboard" ? "Visão geral" : view === "records" ? "Histórico de registros" : "Gerar relatório"}</h1></div><button className="primary-button" onClick={() => setModal(true)}><Plus size={18}/> Nova impressão</button></header>
      {view === "dashboard" && <Dashboard totals={totals} records={records} onNew={() => setModal(true)} onRecords={() => setView("records")} onReports={() => setView("reports")} loading={loading}/>} 
      {view === "records" && <Records records={filtered} search={search} setSearch={setSearch} loading={loading} onDelete={removeRecord}/>} 
      {view === "reports" && <Reports start={start} end={end} setStart={setStart} setEnd={setEnd} rows={reportRows} onExport={exportExcel}/>} 
    </main>
    {modal && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false); }}><div className="modal-card" role="dialog" aria-modal="true"><div className="modal-header"><div><span className="eyebrow">NOVO REGISTRO</span><h2>Registrar impressão colorida</h2></div><button onClick={() => setModal(false)} aria-label="Fechar"><X/></button></div><form onSubmit={submit}>
      <div className="form-grid"><Field label="Data da impressão"><input type="date" value={form.printDate} onChange={e=>setForm({...form,printDate:e.target.value})} required/></Field><Field label="Solicitante"><input value={form.requester} onChange={e=>setForm({...form,requester:e.target.value})} placeholder="Nome do colaborador" required/></Field><Field label="Setor solicitante"><select value={form.sector} onChange={e=>setForm({...form,sector:e.target.value})}><option>Coordenação</option><option>Setor Administrativo</option></select></Field><Field label="Segmento"><select value={form.segment} onChange={e=>setForm({...form,segment:e.target.value})}><option>Educação Infantil</option><option>EFAI</option><option>EFAF</option><option>Ensino Médio</option><option>Administrativo</option></select></Field><Field label="Material impresso" wide><input value={form.material} onChange={e=>setForm({...form,material:e.target.value})} placeholder="Ex.: Avaliação de Ciências" required/></Field><Field label="Tamanho do papel"><select value={form.pageSize} onChange={e=>setForm({...form,pageSize:e.target.value})}><option>A4</option><option>A3</option><option>Ofício</option><option>Outro</option></select></Field><Field label="Páginas do arquivo"><input type="number" min="1" value={form.pagesPerCopy} onChange={e=>setForm({...form,pagesPerCopy:Number(e.target.value)})} required/></Field><Field label="Quantidade de cópias"><input type="number" min="1" value={form.copies} onChange={e=>setForm({...form,copies:Number(e.target.value)})} required/></Field><Field label="Modo de impressão"><select value={form.printMode} onChange={e=>setForm({...form,printMode:e.target.value})}><option value="simplex">Somente frente</option><option value="duplex">Frente e verso</option></select></Field><Field label="Autorização da diretora"><select value={form.authorized ? "yes" : "no"} onChange={e=>setForm({...form,authorized:e.target.value === "yes"})}><option value="yes">Sim, autorizada</option><option value="no">Não autorizada</option></select></Field><Field label="Observações" wide><textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Opcional"/></Field></div>
      <div className="calculation"><div><Printer/><span><b>{formatNumber(previewFaces)}</b> faces coloridas</span></div><ChevronRight/><div><FileText/><span><b>{formatNumber(previewSheets)}</b> folhas utilizadas</span></div></div>
      <div className="modal-footer"><span>Registro feito por <strong>{operator}</strong></span><div><button type="button" className="ghost-button" onClick={() => setModal(false)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? "Salvando..." : "Salvar registro"}</button></div></div>
    </form></div></div>}
  </div>;
}

function Login({ onLogin }: { onLogin: (name: Operator) => void }) { return <main className="login-page"><Toaster richColors position="top-right"/><section className="login-panel"><div className="login-copy"><Image src="/logo-coleguium.png" alt="Coleguium Dom Bosco Parauapebas" width={210} height={210}/><div><span className="login-badge"><Printer size={15}/> Gestão de impressão colorida</span><h1>Controle simples.<br/>Relatórios em segundos.</h1><p>Registre o uso de papel e encontre qualquer informação quando a direção precisar.</p></div><div className="login-stats"><div><ShieldCheck/><span><b>Acesso interno</b>Somente equipe de TI</span></div><div><FileSpreadsheet/><span><b>Relatórios prontos</b>Por qualquer período</span></div></div></div><div className="login-card"><div className="login-icon"><UserRound/></div><span className="eyebrow">IDENTIFICAÇÃO</span><h2>Quem está acessando?</h2><p>Selecione seu usuário para identificar os registros realizados.</p><div className="user-options"><button onClick={()=>onLogin("Marcos Gabriel")}><span className="avatar">MG</span><span><b>Marcos Gabriel</b><small>Suporte de TI</small></span><ChevronRight/></button><button onClick={()=>onLogin("Everton Douglas")}><span className="avatar alt">ED</span><span><b>Everton Douglas</b><small>Suporte de TI</small></span><ChevronRight/></button></div><div className="secure-note"><ShieldCheck size={17}/> Ambiente restrito à equipe autorizada</div></div></section></main>; }
function Nav({icon,label,active,onClick}:{icon:React.ReactNode;label:string;active:boolean;onClick:()=>void}) { return <button className={`nav-item ${active?"active":""}`} onClick={onClick}>{icon}<span>{label}</span></button>; }
function Field({label,wide,children}:{label:string;wide?:boolean;children:React.ReactNode}) { return <label className={wide?"field wide":"field"}><span>{label}</span>{children}</label>; }
function Dashboard({totals,records,onNew,onRecords,onReports,loading}:{totals:{services:number;sheets:number;faces:number;copies:number};records:PrintRecord[];onNew:()=>void;onRecords:()=>void;onReports:()=>void;loading:boolean}) { const recent=records.slice(0,5);return <div className="page-stack"><section className="welcome"><div><span>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"})}</span><h2>Acompanhe o consumo deste mês</h2><p>Todos os números são atualizados a cada novo registro.</p></div><div className="welcome-art"><Printer/></div></section><section className="metrics"><Metric icon={<ClipboardList/>} label="Serviços realizados" value={totals.services}/><Metric icon={<FileText/>} label="Folhas utilizadas" value={totals.sheets}/><Metric icon={<Printer/>} label="Faces coloridas" value={totals.faces}/><Metric icon={<UsersRound/>} label="Total de cópias" value={totals.copies}/></section><section className="dashboard-grid"><div className="panel recent-panel"><div className="panel-title"><div><h3>Últimas impressões</h3><p>Registros mais recentes da equipe</p></div><button onClick={onRecords}>Ver histórico <ChevronRight size={16}/></button></div>{loading?<div className="empty-state">Carregando registros...</div>:recent.length?<div className="record-list">{recent.map(r=><RecordRow key={r.id} record={r}/>)}</div>:<div className="empty-state"><div className="empty-icon"><Printer/></div><h4>Nenhuma impressão registrada</h4><p>Use o botão “Nova impressão” para começar.</p></div>}</div><div className="quick-actions"><div className="panel action-primary"><div><Plus/></div><h3>Novo registro</h3><p>Informe os dados da impressão realizada.</p><button onClick={onNew}>Registrar impressão <ChevronRight/></button></div><div className="panel action-secondary"><div><FileSpreadsheet/></div><h3>Relatório por período</h3><p>Gere a planilha pronta para a direção.</p><button onClick={onReports}>Gerar relatório <ChevronRight/></button></div></div></section></div>; }
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:number}) { return <article className="metric-card"><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{formatNumber(value)}</strong><small>no mês atual</small></div></article>; }
function RecordRow({record,onDelete}:{record:PrintRecord;onDelete?:(id:number)=>void}) { return <div className="record-row"><div className="record-icon"><FileText/></div><div className="record-main"><strong>{record.material}</strong><span>{record.requester} · {record.sector} · {record.segment}</span></div><div className="record-numbers"><strong>{formatNumber(record.sheetsUsed)} folhas</strong><span>{record.copies} cópias · {record.pageSize}</span></div><div className="record-date"><strong>{formatDate(record.printDate)}</strong><span>por {record.operator.split(" ")[0]}</span></div>{onDelete&&<button className="delete-button" onClick={()=>onDelete(record.id)} title="Excluir"><Trash2/></button>}</div>; }
function Records({records,search,setSearch,loading,onDelete}:{records:PrintRecord[];search:string;setSearch:(v:string)=>void;loading:boolean;onDelete:(id:number)=>void}) { return <section className="panel records-panel"><div className="records-toolbar"><div><h2>Todos os registros</h2><p>{records.length} {records.length===1?"registro encontrado":"registros encontrados"}</p></div><label className="search-box"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar solicitante ou material"/></label></div><div className="record-list large">{loading?<div className="empty-state">Carregando...</div>:records.length?records.map(r=><RecordRow key={r.id} record={r} onDelete={onDelete}/>):<div className="empty-state"><Search/><h4>Nenhum registro encontrado</h4><p>Tente alterar o termo da busca.</p></div>}</div></section>; }
function Reports({start,end,setStart,setEnd,rows,onExport}:{start:string;end:string;setStart:(v:string)=>void;setEnd:(v:string)=>void;rows:PrintRecord[];onExport:()=>void}) { const sheets=rows.reduce((s,r)=>s+r.sheetsUsed,0);const faces=rows.reduce((s,r)=>s+r.printedFaces,0);return <div className="reports-grid"><section className="panel report-builder"><div className="report-icon"><FileSpreadsheet/></div><span className="eyebrow">EXPORTAÇÃO EM EXCEL</span><h2>Escolha o período do relatório</h2><p>A planilha incluirá o resumo e todos os registros detalhados.</p><div className="date-grid"><Field label="Data inicial"><div className="date-input"><CalendarDays/><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></div></Field><Field label="Data final"><div className="date-input"><CalendarDays/><input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></div></Field></div><button className="export-button" onClick={onExport}><Download/> Baixar relatório em Excel</button></section><section className="panel report-preview"><div className="panel-title"><div><h3>Resumo do período</h3><p>{formatDate(start)} até {formatDate(end)}</p></div><Filter/></div><div className="preview-metrics"><div><span>Serviços</span><strong>{rows.length}</strong></div><div><span>Folhas utilizadas</span><strong>{formatNumber(sheets)}</strong></div><div><span>Faces coloridas</span><strong>{formatNumber(faces)}</strong></div></div><div className="included-list"><h4>O arquivo incluirá</h4><p><CheckCircle2/> Resumo geral do período</p><p><CheckCircle2/> Registros detalhados por data</p><p><CheckCircle2/> Solicitante, setor e segmento</p><p><CheckCircle2/> Responsável do TI e autorização</p></div></section></div>; }
