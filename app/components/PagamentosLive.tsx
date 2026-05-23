"use client";

import { useState, useEffect } from "react";

interface Fornecedor {
  nome: string;
  meses: Record<string, number>;
  total: number;
}

interface ResumoMensal {
  mes: string;
  receita: number;
  despesa: number;
  resultado: number;
  inadimplencia: number;
  bma: number;
}

interface ApiData {
  ok: boolean;
  atualizado: string;
  mesesAtivos: string[];
  fornecedores: Fornecedor[];
  resumoMensal: ResumoMensal[];
  totais: { totalGeral: number; totalFornecedores: number; totalRegistros: number };
}

function fmt(v: number): string {
  if (v === 0) return "-";
  return "R$" + v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function PagamentosLive() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [minTotal, setMinTotal] = useState(1000);

  useEffect(() => {
    fetch("/api/financeiro")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">Carregando dados ao vivo do Financeiro Better...</div>
      </div>
    );
  }

  if (error || !data?.ok) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400">Erro ao carregar: {error || "API retornou erro"}</p>
      </div>
    );
  }

  const filtered = data.fornecedores.filter((f) => {
    if (f.total < minTotal) return false;
    if (search && !f.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const meses = data.mesesAtivos;
  const mesLabels = meses.map((m) => m.split("/")[0]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Pagamentos 2026 — Dados ao Vivo</h2>
          <p className="text-xs text-slate-500">
            Fonte: institutoi10.com.br/better-financeiro | Atualizado: {new Date(data.atualizado).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs">
            {data.totais.totalFornecedores} fornecedores
          </span>
          <span className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-xs">
            {data.totais.totalRegistros} registros
          </span>
        </div>
      </div>

      {data.resumoMensal.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {data.resumoMensal.filter(m => m.receita > 0 || m.despesa > 0).map((m) => (
            <div key={m.mes} className="bg-[#1e293b] rounded-lg p-3 border border-[#334155]">
              <p className="text-xs text-slate-500 mb-1">{m.mes}</p>
              <p className="text-xs text-green-400">Rec: {fmt(m.receita)}</p>
              <p className="text-xs text-red-400">Desp: {fmt(m.despesa)}</p>
              <p className={`text-sm font-bold ${m.resultado >= 0 ? "text-green-400" : "text-red-400"}`}>
                {m.resultado >= 0 ? "+" : ""}{fmt(m.resultado)}
              </p>
              {m.inadimplencia > 0 && (
                <p className="text-[10px] text-amber-400 mt-0.5">Pend: {fmt(m.inadimplencia)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 bg-[#1e293b] rounded-xl p-3 border border-[#334155]">
        <input
          type="text"
          placeholder="Buscar fornecedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border border-[#334155] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <select
          value={minTotal}
          onChange={(e) => setMinTotal(Number(e.target.value))}
          className="bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value={0}>Todos</option>
          <option value={500}>Min R$500</option>
          <option value={1000}>Min R$1.000</option>
          <option value={5000}>Min R$5.000</option>
          <option value={10000}>Min R$10.000</option>
          <option value={50000}>Min R$50.000</option>
        </select>
        <span className="text-xs text-slate-500">{filtered.length} resultados</span>
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="text-left px-3 py-3 text-xs font-medium text-slate-400 sticky left-0 bg-[#1e293b] z-10 min-w-[250px]">
                  Fornecedor
                </th>
                {mesLabels.map((m, i) => (
                  <th key={i} className="text-right px-3 py-3 text-xs font-medium text-slate-400 min-w-[100px]">
                    {m}
                  </th>
                ))}
                <th className="text-right px-3 py-3 text-xs font-medium text-white bg-slate-800/50 min-w-[120px]">
                  Acum. 2026
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => {
                const isHighlight = f.total > 50000;
                return (
                  <tr
                    key={f.nome}
                    className={`border-b border-[#334155]/50 hover:bg-slate-800/30 transition-colors ${
                      isHighlight ? "bg-red-500/5" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-slate-300 sticky left-0 bg-[#1e293b] z-10 font-medium text-xs truncate max-w-[300px]">
                      <span className="text-slate-600 mr-1">{i + 1}.</span>
                      {f.nome}
                    </td>
                    {meses.map((m) => {
                      const val = f.meses[m] || 0;
                      return (
                        <td key={m} className="px-3 py-2 text-right text-xs font-mono">
                          <span className={val > 0 ? "text-slate-300" : "text-slate-700"}>
                            {fmt(val)}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-mono bg-slate-800/30">
                      <span className={`text-xs font-bold ${isHighlight ? "text-red-400" : "text-white"}`}>
                        {fmt(f.total)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#475569] bg-slate-800/50">
                <td className="px-3 py-3 text-white font-bold text-xs sticky left-0 bg-slate-800/80 z-10">
                  TOTAL
                </td>
                {meses.map((m) => {
                  const total = filtered.reduce((s, f) => s + (f.meses[m] || 0), 0);
                  return (
                    <td key={m} className="px-3 py-3 text-right text-xs font-mono font-bold text-white">
                      {fmt(total)}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-right text-xs font-mono font-bold text-amber-400">
                  {fmt(filtered.reduce((s, f) => s + f.total, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
