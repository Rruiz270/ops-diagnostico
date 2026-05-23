"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  colaboradores,
  cruzamentos,
  atividadesManuais,
  planoAcao,
  matrizAtividades,
  dadosFinanceiros,
  resumoFinanceiro,
} from "../data/operational-data";

const PagamentosLive = dynamic(() => import("./PagamentosLive"), { ssr: false });
const ReducaoDespesas = dynamic(() => import("./ReducaoDespesas"), { ssr: false });

type Tab = "resumo" | "reducao" | "pagamentos" | "cruzamentos" | "manuais" | "roi" | "plano" | "financeiro";

const TAB_LABELS: Record<Tab, string> = {
  resumo: "Visao Geral",
  reducao: "Reducao Despesas",
  pagamentos: "Pagamentos Live",
  financeiro: "Financeiro",
  cruzamentos: "Cruzamentos",
  manuais: "Atividades Manuais",
  roi: "ROI Automacao",
  plano: "Plano de Acao",
};

const IMPACTO_COLORS = {
  critico: "bg-red-500/20 text-red-400 border-red-500/30",
  alto: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  medio: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const PRIORIDADE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "P1 - Urgente", color: "bg-red-500/20 text-red-400" },
  2: { label: "P2 - Importante", color: "bg-amber-500/20 text-amber-400" },
  3: { label: "P3 - Planejado", color: "bg-blue-500/20 text-blue-400" },
};

const CATEGORIA_ICONS: Record<string, string> = {
  automacao: "⚡",
  redistribuicao: "🔄",
  sistema: "🖥",
  processo: "📋",
};

const DIFICULDADE_COLORS = {
  baixa: "text-green-400",
  media: "text-amber-400",
  alta: "text-red-400",
};

function getNomeById(id: string) {
  return colaboradores.find((c) => c.id === id)?.nome ?? id;
}

function getCorById(id: string) {
  return colaboradores.find((c) => c.id === id)?.cor ?? "#6B7280";
}

const totalHorasManuais = atividadesManuais.reduce(
  (s, a) => s + a.horasSemana,
  0
);
const totalHorasAposAutomacao = atividadesManuais.reduce(
  (s, a) => s + a.horasAposAutomacao,
  0
);
const totalHorasEconomizadas = totalHorasManuais - totalHorasAposAutomacao;
const totalHorasPlano = planoAcao.reduce(
  (s, a) => s + a.horasEconomizadas,
  0
);

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="bg-[#1e293b] rounded-xl p-5 border border-[#334155] hover:border-[#475569] transition-colors">
      <p className="text-sm text-slate-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function PersonBadge({ id }: { id: string }) {
  const cor = getCorById(id);
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
      style={{
        backgroundColor: cor + "20",
        color: cor,
        borderColor: cor + "40",
      }}
    >
      {getNomeById(id)}
    </span>
  );
}

function TabResumo() {
  const crossingMap = new Map<string, Set<string>>();
  cruzamentos.forEach((c) => {
    c.pessoas.forEach((p) => {
      if (!crossingMap.has(p)) crossingMap.set(p, new Set());
      c.pessoas
        .filter((x) => x !== p)
        .forEach((x) => crossingMap.get(p)!.add(x));
    });
  });

  const manualMap = new Map<string, number>();
  atividadesManuais.forEach((a) => {
    a.responsaveis.forEach((r) => {
      manualMap.set(r, (manualMap.get(r) || 0) + a.horasSemana / a.responsaveis.length);
    });
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Cruzamentos Detectados"
          value={String(cruzamentos.length)}
          sub={`${cruzamentos.filter((c) => c.impacto === "critico").length} criticos`}
          accent="text-red-400"
        />
        <SummaryCard
          label="Horas Manuais / Semana"
          value={`${totalHorasManuais}h`}
          sub="Equivalente a 1.5 funcionarios"
          accent="text-amber-400"
        />
        <SummaryCard
          label="Economia Potencial"
          value={`${totalHorasEconomizadas}h`}
          sub={`${Math.round((totalHorasEconomizadas / totalHorasManuais) * 100)}% de reducao`}
          accent="text-green-400"
        />
        <SummaryCard
          label="Acoes no Plano"
          value={String(planoAcao.length)}
          sub={`${planoAcao.filter((a) => a.prioridade === 1).length} P1 urgentes`}
          accent="text-blue-400"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold mb-4 text-white">
            Carga Manual por Pessoa
          </h3>
          <div className="space-y-3">
            {colaboradores
              .filter((c) => manualMap.has(c.id))
              .sort((a, b) => (manualMap.get(b.id) || 0) - (manualMap.get(a.id) || 0))
              .map((c) => {
                const hours = manualMap.get(c.id) || 0;
                const pct = (hours / totalHorasManuais) * 100;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="w-28 text-sm text-slate-300 truncate">
                      {c.nome}
                    </span>
                    <div className="flex-1 bg-slate-700/50 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-white"
                        style={{
                          width: `${Math.max(pct, 8)}%`,
                          backgroundColor: c.cor,
                        }}
                      >
                        {hours.toFixed(1)}h
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold mb-4 text-white">
            Rede de Cruzamentos
          </h3>
          <div className="space-y-3">
            {colaboradores
              .filter((c) => crossingMap.has(c.id))
              .sort(
                (a, b) =>
                  (crossingMap.get(b.id)?.size || 0) -
                  (crossingMap.get(a.id)?.size || 0)
              )
              .map((c) => {
                const partners = crossingMap.get(c.id)!;
                return (
                  <div key={c.id} className="flex items-start gap-3">
                    <span
                      className="w-28 text-sm font-medium shrink-0 pt-0.5"
                      style={{ color: c.cor }}
                    >
                      {c.nome}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[...partners].map((p) => (
                        <PersonBadge key={p} id={p} />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
        <h3 className="text-lg font-semibold mb-4 text-white">
          Mapa de Atividades por Colaborador
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {colaboradores
            .filter((c) => matrizAtividades[c.id]?.length)
            .map((c) => (
              <div
                key={c.id}
                className="rounded-lg p-4 border border-[#334155] bg-slate-800/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: c.cor }}
                  />
                  <span className="font-medium text-sm text-white">
                    {c.nome}
                  </span>
                  <span className="text-xs text-slate-500">
                    {matrizAtividades[c.id].length} ativ.
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{c.cargo}</p>
                <ul className="text-xs text-slate-400 space-y-0.5">
                  {matrizAtividades[c.id].map((a, i) => (
                    <li key={i} className="truncate">
                      • {a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function TabCruzamentos() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-[#1e293b] rounded-xl p-4 border border-[#334155] mb-6">
        <p className="text-sm text-slate-400">
          <span className="text-white font-medium">{cruzamentos.length} cruzamentos</span>{" "}
          identificados onde multiplas pessoas executam a mesma atividade sem coordenacao.
          Cada cruzamento gera retrabalho, inconsistencia e confusao sobre responsabilidade.
        </p>
      </div>

      {cruzamentos
        .sort((a, b) => {
          const order = { critico: 0, alto: 1, medio: 2 };
          return order[a.impacto] - order[b.impacto];
        })
        .map((c) => (
          <div
            key={c.id}
            className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden hover:border-[#475569] transition-colors"
          >
            <button
              className="w-full p-5 text-left flex items-start gap-4"
              onClick={() =>
                setExpanded(expanded === c.id ? null : c.id)
              }
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base font-semibold text-white">
                    {c.atividade}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium border ${IMPACTO_COLORS[c.impacto]}`}
                  >
                    {c.impacto.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-3">{c.descricao}</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.pessoas.map((p) => (
                    <PersonBadge key={p} id={p} />
                  ))}
                </div>
              </div>
              <span className="text-slate-500 text-xl mt-1">
                {expanded === c.id ? "−" : "+"}
              </span>
            </button>

            {expanded === c.id && (
              <div className="px-5 pb-5 border-t border-[#334155] pt-4 space-y-4 animate-fade-in">
                <div>
                  <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
                    Problema
                  </h4>
                  <p className="text-sm text-slate-300">{c.problema}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">
                    Recomendacao
                  </h4>
                  <p className="text-sm text-slate-300">{c.recomendacao}</p>
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

function TabManuais() {
  const [sortBy, setSortBy] = useState<"horas" | "economia" | "dificuldade">(
    "horas"
  );

  const sorted = [...atividadesManuais].sort((a, b) => {
    if (sortBy === "horas") return b.horasSemana - a.horasSemana;
    if (sortBy === "economia")
      return (
        b.horasSemana -
        b.horasAposAutomacao -
        (a.horasSemana - a.horasAposAutomacao)
      );
    const order = { baixa: 0, media: 1, alta: 2 };
    return order[a.dificuldadeAutomacao] - order[b.dificuldadeAutomacao];
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-400">
          <span className="text-white font-medium">
            {totalHorasManuais}h/semana
          </span>{" "}
          gastas em atividades manuais.{" "}
          <span className="text-green-400 font-medium">
            {totalHorasEconomizadas}h
          </span>{" "}
          podem ser eliminadas.
        </p>
        <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
          {(["horas", "economia", "dificuldade"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                sortBy === s
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {s === "horas"
                ? "Mais horas"
                : s === "economia"
                  ? "Maior economia"
                  : "Mais facil"}
            </button>
          ))}
        </div>
      </div>

      {sorted.map((a) => {
        const economia = a.horasSemana - a.horasAposAutomacao;
        const pctEconomia = Math.round(
          (economia / a.horasSemana) * 100
        );
        return (
          <div
            key={a.id}
            className="bg-[#1e293b] rounded-xl p-5 border border-[#334155] hover:border-[#475569] transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {a.atividade}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {a.frequencia}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-400">
                  {a.horasSemana}h
                  <span className="text-sm text-slate-500 font-normal">
                    /sem
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-400 mb-3">
              {a.descricaoDetalhada}
            </p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {a.responsaveis.map((r) => (
                <PersonBadge key={r} id={r} />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-800/50 rounded-lg p-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                  Dificuldade
                </p>
                <p
                  className={`text-sm font-medium ${DIFICULDADE_COLORS[a.dificuldadeAutomacao]}`}
                >
                  {a.dificuldadeAutomacao.charAt(0).toUpperCase() +
                    a.dificuldadeAutomacao.slice(1)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                  Economia
                </p>
                <p className="text-sm font-medium text-green-400">
                  {economia}h/sem ({pctEconomia}%)
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                  Prazo
                </p>
                <p className="text-sm font-medium text-blue-400">
                  {a.prazoImplementacao}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#334155]">
              <p className="text-xs text-slate-500 mb-1">Solucao sugerida</p>
              <p className="text-sm text-slate-300">{a.solucaoSugerida}</p>
              <p className="text-xs text-blue-400 mt-1">
                Ferramenta: {a.ferramentaSugerida}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabROI() {
  const sortedByROI = [...atividadesManuais].sort((a, b) => {
    const roiA =
      (a.horasSemana - a.horasAposAutomacao) /
      (a.dificuldadeAutomacao === "baixa"
        ? 1
        : a.dificuldadeAutomacao === "media"
          ? 2
          : 3);
    const roiB =
      (b.horasSemana - b.horasAposAutomacao) /
      (b.dificuldadeAutomacao === "baixa"
        ? 1
        : b.dificuldadeAutomacao === "media"
          ? 2
          : 3);
    return roiB - roiA;
  });

  const custoHoraColaborador = 35;
  const economiaMensal = totalHorasEconomizadas * 4 * custoHoraColaborador;
  const economiaAnual = economiaMensal * 12;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Horas Manuais Atuais"
          value={`${totalHorasManuais}h`}
          sub="por semana"
          accent="text-red-400"
        />
        <SummaryCard
          label="Horas Apos Automacao"
          value={`${totalHorasAposAutomacao}h`}
          sub="por semana"
          accent="text-blue-400"
        />
        <SummaryCard
          label="Horas Economizadas"
          value={`${totalHorasEconomizadas}h`}
          sub={`${Math.round((totalHorasEconomizadas / totalHorasManuais) * 100)}% de reducao semanal`}
          accent="text-green-400"
        />
        <SummaryCard
          label="Economia Anual Estimada"
          value={`R$${economiaAnual.toLocaleString("pt-BR")}`}
          sub={`~R$${custoHoraColaborador}/h x ${totalHorasEconomizadas}h/sem x 48 sem`}
          accent="text-emerald-400"
        />
      </div>

      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
        <h3 className="text-lg font-semibold mb-4 text-white">
          Ranking ROI (Economia / Dificuldade)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Prioridade calculada: maior economia com menor dificuldade primeiro
        </p>

        <div className="space-y-3">
          {sortedByROI.map((a, i) => {
            const economia = a.horasSemana - a.horasAposAutomacao;
            const pct = (economia / totalHorasEconomizadas) * 100;
            const econMensal = economia * 4 * custoHoraColaborador;

            return (
              <div
                key={a.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i < 3
                      ? "bg-green-500/20 text-green-400"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {a.atividade}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-xs ${DIFICULDADE_COLORS[a.dificuldadeAutomacao]}`}
                    >
                      {a.dificuldadeAutomacao}
                    </span>
                    <span className="text-xs text-slate-600">|</span>
                    <span className="text-xs text-slate-500">
                      {a.prazoImplementacao}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-400">
                    -{economia}h/sem
                  </p>
                  <p className="text-xs text-slate-500">
                    R${econMensal.toLocaleString("pt-BR")}/mes
                  </p>
                </div>
                <div className="w-20 bg-slate-700/50 rounded-full h-3 shrink-0 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
        <h3 className="text-lg font-semibold mb-4 text-white">
          Antes vs Depois por Atividade
        </h3>
        <div className="space-y-4">
          {sortedByROI.map((a) => {
            const economia = a.horasSemana - a.horasAposAutomacao;
            return (
              <div key={a.id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-400">{a.atividade}</span>
                  <span className="text-xs text-green-400">
                    -{economia}h/sem
                  </span>
                </div>
                <div className="flex gap-1 h-6">
                  <div
                    className="bg-red-500/40 rounded-l flex items-center justify-center text-[10px] text-red-300 font-medium"
                    style={{
                      width: `${(a.horasSemana / totalHorasManuais) * 100}%`,
                    }}
                  >
                    {a.horasSemana}h
                  </div>
                  <div
                    className="bg-green-500/40 rounded-r flex items-center justify-center text-[10px] text-green-300 font-medium"
                    style={{
                      width: `${Math.max((a.horasAposAutomacao / totalHorasManuais) * 100, 2)}%`,
                    }}
                  >
                    {a.horasAposAutomacao}h
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500/40" /> Antes
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500/40" /> Depois
          </span>
        </div>
      </div>
    </div>
  );
}

function TabPlano() {
  const [filterPrioridade, setFilterPrioridade] = useState<number | null>(null);
  const [filterCategoria, setFilterCategoria] = useState<string | null>(null);

  const filtered = planoAcao.filter((a) => {
    if (filterPrioridade && a.prioridade !== filterPrioridade) return false;
    if (filterCategoria && a.categoria !== filterCategoria) return false;
    return true;
  });

  const categorias = [...new Set(planoAcao.map((a) => a.categoria))];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterPrioridade(null)}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            !filterPrioridade
              ? "bg-white/10 text-white border-white/20"
              : "border-[#334155] text-slate-500 hover:text-white"
          }`}
        >
          Todas
        </button>
        {[1, 2, 3].map((p) => (
          <button
            key={p}
            onClick={() =>
              setFilterPrioridade(filterPrioridade === p ? null : p)
            }
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filterPrioridade === p
                ? PRIORIDADE_LABELS[p].color + " border-transparent"
                : "border-[#334155] text-slate-500 hover:text-white"
            }`}
          >
            {PRIORIDADE_LABELS[p].label}
          </button>
        ))}
        <span className="text-slate-700">|</span>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              setFilterCategoria(filterCategoria === cat ? null : cat)
            }
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filterCategoria === cat
                ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                : "border-[#334155] text-slate-500 hover:text-white"
            }`}
          >
            {CATEGORIA_ICONS[cat]} {cat}
          </button>
        ))}
      </div>

      <div className="bg-[#1e293b] rounded-xl p-4 border border-[#334155]">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-red-400">
              {planoAcao.filter((a) => a.prioridade === 1).length}
            </p>
            <p className="text-xs text-slate-500">Acoes P1</p>
            <p className="text-xs text-green-400">
              {planoAcao
                .filter((a) => a.prioridade === 1)
                .reduce((s, a) => s + a.horasEconomizadas, 0)}
              h/sem economizadas
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">
              {planoAcao.filter((a) => a.prioridade === 2).length}
            </p>
            <p className="text-xs text-slate-500">Acoes P2</p>
            <p className="text-xs text-green-400">
              {planoAcao
                .filter((a) => a.prioridade === 2)
                .reduce((s, a) => s + a.horasEconomizadas, 0)}
              h/sem economizadas
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">
              {planoAcao.filter((a) => a.prioridade === 3).length}
            </p>
            <p className="text-xs text-slate-500">Acoes P3</p>
            <p className="text-xs text-green-400">
              {planoAcao
                .filter((a) => a.prioridade === 3)
                .reduce((s, a) => s + a.horasEconomizadas, 0)}
              h/sem economizadas
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((a) => (
          <div
            key={a.id}
            className="bg-[#1e293b] rounded-xl p-5 border border-[#334155] hover:border-[#475569] transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {CATEGORIA_ICONS[a.categoria]}
                </span>
                <h3 className="text-base font-semibold text-white">
                  {a.titulo}
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORIDADE_LABELS[a.prioridade].color}`}
              >
                {PRIORIDADE_LABELS[a.prioridade].label}
              </span>
            </div>

            <p className="text-sm text-slate-400 mb-3">{a.descricao}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Prazo</span>
                <p className="text-blue-400 font-medium">{a.prazo}</p>
              </div>
              <div>
                <span className="text-slate-500">Responsavel</span>
                <p className="text-white font-medium">{a.responsavel}</p>
              </div>
              <div>
                <span className="text-slate-500">Economia</span>
                <p className="text-green-400 font-medium">
                  {a.horasEconomizadas > 0
                    ? `${a.horasEconomizadas}h/sem`
                    : "Estrutural"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Dependencias</span>
                <p className="text-slate-300">
                  {a.dependencias.length > 0
                    ? a.dependencias
                        .map(
                          (d) =>
                            planoAcao.find((p) => p.id === d)?.titulo.slice(
                              0,
                              25
                            ) || d
                        )
                        .join(", ")
                    : "Nenhuma"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
        <h3 className="text-lg font-semibold mb-4 text-white">
          Timeline de Implementacao
        </h3>
        <div className="space-y-2">
          {[
            "Semana 1",
            "Semana 1-2",
            "Semana 2-3",
            "Semana 2-4",
            "Semana 3-4",
            "Semana 3-6",
            "Semana 4-6",
            "Semana 4-8",
            "Semana 6-8",
          ].map((prazo) => {
            const acoes = planoAcao.filter((a) => a.prazo === prazo);
            if (acoes.length === 0) return null;
            return (
              <div key={prazo} className="flex items-start gap-3">
                <span className="w-24 text-xs text-blue-400 font-mono shrink-0 pt-1">
                  {prazo}
                </span>
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {acoes.map((a) => (
                    <span
                      key={a.id}
                      className={`px-2 py-1 rounded text-xs ${PRIORIDADE_LABELS[a.prioridade].color}`}
                    >
                      {a.titulo}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  ativo: "bg-green-500/20 text-green-400 border-green-500/30",
  demissao_planejada: "bg-red-500/20 text-red-400 border-red-500/30",
  em_avaliacao: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  demitido: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const STATUS_LABELS = {
  ativo: "Ativo",
  demissao_planejada: "Demissao Planejada",
  em_avaliacao: "Em Avaliacao",
  demitido: "Demitido",
};

function TabFinanceiro() {
  const { meses, economiaDemissoes, professoresPJ } = resumoFinanceiro;
  const ultimoMes = meses[meses.length - 1];
  const totalEconomiaMensal = economiaDemissoes.fase1.mensal + economiaDemissoes.fase2.mensal + economiaDemissoes.fase3.mensal;
  const totalEconomiaAnual = economiaDemissoes.fase1.anual + economiaDemissoes.fase2.anual + economiaDemissoes.fase3.anual;
  const totalRescisao = economiaDemissoes.fase1.rescisao;
  const totalProfessores = professoresPJ.reduce((s, p) => s + p.custoMensal, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Resultado Mai/2026"
          value={`-R$${Math.abs(ultimoMes.resultado).toLocaleString("pt-BR")}`}
          sub="Prejuizo no mes"
          accent="text-red-400"
        />
        <SummaryCard
          label="Inadimplencia"
          value={`R$${ultimoMes.inadimplencia.toLocaleString("pt-BR")}`}
          sub="Cresceu 307% desde Jan"
          accent="text-amber-400"
        />
        <SummaryCard
          label="Economia c/ Cortes"
          value={`R$${totalEconomiaMensal.toLocaleString("pt-BR")}/m`}
          sub={`R$${totalEconomiaAnual.toLocaleString("pt-BR")}/ano`}
          accent="text-green-400"
        />
        <SummaryCard
          label="Custo Rescisoes"
          value={`R$${totalRescisao.toLocaleString("pt-BR")}`}
          sub={`Payback em ${Math.ceil(totalRescisao / totalEconomiaMensal)} meses`}
          accent="text-blue-400"
        />
      </div>

      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
        <h3 className="text-lg font-semibold mb-4 text-white">Evolucao Financeira 2026</h3>
        <div className="space-y-3">
          {meses.map((m) => {
            const maxVal = Math.max(...meses.map(x => Math.max(x.receita, x.despesa)));
            return (
              <div key={m.m} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span className="w-16 font-mono">{m.m.split("/")[0]}</span>
                  <span className={m.resultado >= 0 ? "text-green-400" : "text-red-400"}>
                    {m.resultado >= 0 ? "+" : ""}R${m.resultado.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="flex gap-1 h-5">
                  <div
                    className="bg-green-500/40 rounded-l flex items-center justify-end pr-1 text-[9px] text-green-300"
                    style={{ width: `${(m.receita / maxVal) * 100}%` }}
                  >
                    R${(m.receita / 1000).toFixed(0)}k
                  </div>
                  <div
                    className="bg-red-500/40 rounded-r flex items-center justify-end pr-1 text-[9px] text-red-300"
                    style={{ width: `${(m.despesa / maxVal) * 100}%` }}
                  >
                    R${(m.despesa / 1000).toFixed(0)}k
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/40" /> Receita</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/40" /> Despesa</span>
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
        <h3 className="text-lg font-semibold mb-4 text-white">Folha de Pagamento por Colaborador</h3>
        <div className="space-y-2">
          {colaboradores
            .filter((c) => dadosFinanceiros[c.id])
            .sort((a, b) => (dadosFinanceiros[b.id]?.custoTotalEstimado || 0) - (dadosFinanceiros[a.id]?.custoTotalEstimado || 0))
            .map((c) => {
              const fin = dadosFinanceiros[c.id];
              if (!fin) return null;
              const maxCusto = Math.max(...Object.values(dadosFinanceiros).map(f => f.custoTotalEstimado));
              return (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <div className="w-36 shrink-0">
                    <span className="text-sm text-slate-300">{c.nome}</span>
                  </div>
                  <div className="flex-1 bg-slate-700/50 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-white"
                      style={{
                        width: `${Math.max((fin.custoTotalEstimado / maxCusto) * 100, 10)}%`,
                        backgroundColor: fin.status === "demissao_planejada" ? "#ef4444" : fin.status === "em_avaliacao" ? "#f59e0b" : c.cor,
                      }}
                    >
                      R${fin.custoTotalEstimado.toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${STATUS_COLORS[fin.status]}`}>
                    {STATUS_LABELS[fin.status]}
                  </span>
                </div>
              );
            })}
        </div>
        <div className="mt-4 pt-4 border-t border-[#334155] grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500">Folha Total</p>
            <p className="text-lg font-bold text-white">
              R${Object.values(dadosFinanceiros).reduce((s, f) => s + f.custoTotalEstimado, 0).toLocaleString("pt-BR")}/mes
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Marcados p/ Demissao</p>
            <p className="text-lg font-bold text-red-400">
              R${Object.values(dadosFinanceiros).filter(f => f.status === "demissao_planejada").reduce((s, f) => s + f.custoTotalEstimado, 0).toLocaleString("pt-BR")}/mes
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Em Avaliacao</p>
            <p className="text-lg font-bold text-amber-400">
              R${Object.values(dadosFinanceiros).filter(f => f.status === "em_avaliacao").reduce((s, f) => s + f.custoTotalEstimado, 0).toLocaleString("pt-BR")}/mes
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold mb-4 text-white">Plano de Demissoes</h3>
          {[
            { fase: "Fase 1 (Semana 1)", data: economiaDemissoes.fase1, color: "red" },
            { fase: "Fase 2 (30 dias)", data: economiaDemissoes.fase2, color: "amber" },
            { fase: "Fase 3 (60 dias)", data: economiaDemissoes.fase3, color: "amber" },
          ].map(({ fase, data, color }) => (
            <div key={fase} className="mb-4 p-3 rounded-lg bg-slate-800/50">
              <p className={`text-sm font-medium text-${color}-400 mb-2`}>{fase}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {data.pessoas.map((id) => <PersonBadge key={id} id={id} />)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Economia mensal</span>
                  <p className="text-green-400 font-medium">R${data.mensal.toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <span className="text-slate-500">Economia anual</span>
                  <p className="text-green-400 font-medium">R${data.anual.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold mb-4 text-white">Professores CLT/PJ (BMA)</h3>
          <p className="text-xs text-slate-500 mb-3">Verificar se fazem atividades alem de dar aula</p>
          <div className="space-y-2">
            {professoresPJ.sort((a, b) => b.custoMensal - a.custoMensal).map((p) => (
              <div key={p.nome} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                <span className="text-sm text-slate-300">{p.nome}</span>
                <span className="text-sm font-medium text-amber-400">R${p.custoMensal.toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[#334155]">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Total professores CLT</span>
              <span className="text-sm font-bold text-amber-400">R${totalProfessores.toLocaleString("pt-BR")}/mes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-xl p-6 border border-red-500/30">
        <h3 className="text-lg font-semibold mb-2 text-red-400">Alerta: Receita em Queda</h3>
        <p className="text-sm text-slate-400 mb-4">
          Receita caiu 65% de Jan a Mai (R$823k para R$287k). Cortes de custo sao necessarios mas insuficientes.
          Resultado medio 2026 e -R$67k/mes. Mesmo com todos os cortes listados (-R$30k), ainda faltam ~R$37k/mes para equilibrar.
          Precisa atacar receita e inadimplencia (R$172k pendentes) simultaneamente.
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-red-500/10">
            <p className="text-2xl font-bold text-red-400">-R$67k</p>
            <p className="text-xs text-slate-500">Prejuizo medio/mes</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10">
            <p className="text-2xl font-bold text-green-400">-R$30k</p>
            <p className="text-xs text-slate-500">Economia c/ cortes</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10">
            <p className="text-2xl font-bold text-amber-400">-R$37k</p>
            <p className="text-xs text-slate-500">Gap restante</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("resumo");
  const ultimoMes = resumoFinanceiro.meses[resumoFinanceiro.meses.length - 1];

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <header className="border-b border-[#1e293b] bg-[#0f172a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">
                Better Ops Diagnostico
              </h1>
              <p className="text-xs text-slate-500">
                Mapeamento operacional + financeiro | 23/05/2026
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse-slow">
                Resultado: -R${Math.abs(ultimoMes.resultado).toLocaleString("pt-BR")}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {totalHorasManuais}h/sem manuais
              </span>
              <span className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                {totalHorasEconomizadas}h economia potencial
              </span>
            </div>
          </div>

          <nav className="flex gap-1">
            {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  tab === t
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === "resumo" && <TabResumo />}
        {tab === "reducao" && <ReducaoDespesas />}
        {tab === "pagamentos" && <PagamentosLive />}
        {tab === "financeiro" && <TabFinanceiro />}
        {tab === "cruzamentos" && <TabCruzamentos />}
        {tab === "manuais" && <TabManuais />}
        {tab === "roi" && <TabROI />}
        {tab === "plano" && <TabPlano />}
      </main>

      <footer className="border-t border-[#1e293b] py-4 mt-8">
        <p className="text-center text-xs text-slate-600">
          Better Ops Diagnostico v2.0 | Dados financeiros reais BMA Mai/2026 |
          Apenas para uso interno
        </p>
      </footer>
    </div>
  );
}
