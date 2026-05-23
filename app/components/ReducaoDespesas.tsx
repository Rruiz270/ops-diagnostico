"use client";

import { useState, useEffect, useMemo } from "react";

type Recomendacao = "CORTAR" | "REVISAR" | "INVESTIGAR" | "MANTER" | "FORNECEDOR" | "INFO";

interface Pessoa {
  nome: string;
  total_2026: number;
  n_pagamentos: number;
  ultimo_pgto: string | null;
  fontes: string[];
  cpf_cnpj?: string | null;
  status_portal?: string | null;
  categoria_excel?: string | null;
  alumni_teacher_id?: string;
  meetings_2026?: number;
  alunos_unicos_2026?: number;
  last_meeting?: string | null;
  rs_por_aula?: number;
  recomendacao: Recomendacao;
  motivo: string;
  meses?: Record<string, number>;
}

interface Consolidado {
  gerado_em: string;
  ano: string;
  totais: {
    pessoas: number;
    total_pago_2026: number;
    matched_alumni: number;
    por_recomendacao: Record<Recomendacao, { n: number; valor: number }>;
  };
  pessoas: Pessoa[];
}

const REC_COLORS: Record<Recomendacao, string> = {
  CORTAR: "bg-red-500/20 text-red-400 border-red-500/40",
  REVISAR: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  INVESTIGAR: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  MANTER: "bg-green-500/20 text-green-400 border-green-500/40",
  FORNECEDOR: "bg-slate-500/20 text-slate-400 border-slate-500/40",
  INFO: "bg-blue-500/20 text-blue-400 border-blue-500/40",
};

const REC_ORDER: Recomendacao[] = [
  "CORTAR",
  "REVISAR",
  "INVESTIGAR",
  "MANTER",
  "FORNECEDOR",
  "INFO",
];

function fmt(v: number): string {
  if (!v) return "—";
  return "R$" + Math.round(v).toLocaleString("pt-BR");
}

function daysAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 0) return "futuro";
  if (days === 0) return "hoje";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}a`;
}

export default function ReducaoDespesas() {
  const [data, setData] = useState<Consolidado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterRec, setFilterRec] = useState<Recomendacao | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"total" | "meetings" | "rs_aula">("total");
  const [hideZero, setHideZero] = useState(true);

  useEffect(() => {
    fetch("https://www.institutoi10.com.br/better-financeiro/pessoas_consolidado.json")
      .then((r) => r.json())
      .then((d: Consolidado) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let arr = data.pessoas;
    if (filterRec !== "ALL") arr = arr.filter((p) => p.recomendacao === filterRec);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((p) => p.nome.toLowerCase().includes(q));
    }
    if (hideZero) arr = arr.filter((p) => p.total_2026 >= 1000);
    arr = [...arr].sort((a, b) => {
      if (sortBy === "total") return b.total_2026 - a.total_2026;
      if (sortBy === "meetings") return (b.meetings_2026 || 0) - (a.meetings_2026 || 0);
      if (sortBy === "rs_aula") return (b.rs_por_aula || 0) - (a.rs_por_aula || 0);
      return 0;
    });
    return arr;
  }, [data, filterRec, search, sortBy, hideZero]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">Cruzando despesas × Alumni RDS × Excel snapshot...</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400">Erro ao carregar: {error}</p>
        <p className="text-xs text-slate-500 mt-2">
          Verifique se o arquivo pessoas_consolidado.json existe no
          financeiro-better. Ele é gerado pelo cron diário (script
          consolidate_pessoas.py).
        </p>
      </div>
    );
  }

  const totalFiltrado = filtered.reduce((s, p) => s + p.total_2026, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white">Redução de Despesas — Por Pessoa</h2>
        <p className="text-xs text-slate-500">
          Cruza despesas (Better + BMA folha) × atividade Alumni × status portal.
          Atualizado: {new Date(data.gerado_em).toLocaleString("pt-BR")}.
          BMA SOLUÇÕES wrapper excluído (double-counting com folha BMA).
        </p>
      </div>

      {/* Cards por recomendação */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <button
          onClick={() => setFilterRec("ALL")}
          className={`p-3 rounded-lg border text-left transition-all ${
            filterRec === "ALL"
              ? "bg-white/10 border-white/30"
              : "bg-[#1e293b] border-[#334155] hover:border-white/20"
          }`}
        >
          <div className="text-xs text-slate-400">Todas</div>
          <div className="text-sm font-bold text-white">{data.totais.pessoas} pessoas</div>
          <div className="text-xs text-slate-500">{fmt(data.totais.total_pago_2026)}</div>
        </button>
        {REC_ORDER.map((rec) => {
          const t = data.totais.por_recomendacao[rec];
          if (!t) return null;
          return (
            <button
              key={rec}
              onClick={() => setFilterRec(rec)}
              className={`p-3 rounded-lg border text-left transition-all ${
                filterRec === rec
                  ? REC_COLORS[rec] + " ring-2 ring-offset-1 ring-offset-[#0f172a]"
                  : "bg-[#1e293b] border-[#334155] hover:border-white/20"
              }`}
            >
              <div className={`text-xs ${filterRec === rec ? "" : "text-slate-400"}`}>{rec}</div>
              <div className={`text-sm font-bold ${filterRec === rec ? "" : "text-white"}`}>
                {t.n} pessoas
              </div>
              <div className={`text-xs ${filterRec === rec ? "" : "text-slate-500"}`}>{fmt(t.valor)}</div>
            </button>
          );
        })}
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 bg-[#1e293b] rounded-xl p-3 border border-[#334155] flex-wrap">
        <input
          type="text"
          placeholder="Buscar pessoa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-transparent border border-[#334155] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "total" | "meetings" | "rs_aula")}
          className="bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="total">Ordenar por: R$ total 2026</option>
          <option value="meetings">Ordenar por: # aulas</option>
          <option value="rs_aula">Ordenar por: R$/aula</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={hideZero}
            onChange={(e) => setHideZero(e.target.checked)}
            className="rounded"
          />
          Esconder &lt; R$1k
        </label>
        <span className="text-xs text-slate-500">
          {filtered.length} resultados · {fmt(totalFiltrado)}
        </span>
      </div>

      {/* Tabela */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#334155]">
                <th className="text-left px-3 py-3 text-xs font-medium text-slate-400 sticky left-0 bg-[#1e293b] z-10 min-w-[260px]">
                  Pessoa
                </th>
                <th className="text-left px-3 py-3 text-xs font-medium text-slate-400">Recom.</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-slate-400">R$ 2026</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-slate-400"># aulas</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-slate-400">R$/aula</th>
                <th className="text-right px-3 py-3 text-xs font-medium text-slate-400">Últ. aula</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-slate-400">Status</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-slate-400">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.nome} className="border-b border-[#334155]/50 hover:bg-white/5">
                  <td className="px-3 py-2 sticky left-0 bg-[#1e293b] z-10">
                    <div className="text-white font-medium">{p.nome}</div>
                    {p.cpf_cnpj && (
                      <div className="text-[10px] text-slate-500">{p.cpf_cnpj}</div>
                    )}
                    {p.categoria_excel && (
                      <div className="text-[10px] text-slate-500">{p.categoria_excel}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${REC_COLORS[p.recomendacao]}`}
                    >
                      {p.recomendacao}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-white font-mono">{fmt(p.total_2026)}</td>
                  <td className="px-3 py-2 text-right text-slate-300 font-mono">
                    {p.meetings_2026 !== undefined ? p.meetings_2026 : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300 font-mono">
                    {p.rs_por_aula ? fmt(p.rs_por_aula) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300 text-xs">
                    {daysAgo(p.last_meeting)}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {p.status_portal || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400 max-w-[300px]">
                    {p.motivo}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500 text-sm">
                    Nenhuma pessoa encontrada com os filtros atuais
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-500 space-y-1">
        <p>
          <strong>Heurística da recomendação:</strong>{" "}
          <span className="text-red-400">CORTAR</span> = portal INATIVO ou Alumni com zero aulas.{" "}
          <span className="text-amber-400">REVISAR</span> = última aula &gt;60d ou R$/aula muito alto.{" "}
          <span className="text-purple-400">INVESTIGAR</span> = FORA DO PORTAL com valor alto, ou função indefinida.{" "}
          <span className="text-green-400">MANTER</span> = ativo.{" "}
          <span className="text-slate-400">FORNECEDOR</span> = entidade jurídica (fora do escopo de corte).
        </p>
        <p>
          Fonte:{" "}
          <a
            href="https://www.institutoi10.com.br/better-financeiro/"
            className="text-blue-400 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            institutoi10.com.br/better-financeiro
          </a>{" "}
          (despesas + BMA folha) cruzado com Alumni RDS (meetings, users).
        </p>
      </div>
    </div>
  );
}
