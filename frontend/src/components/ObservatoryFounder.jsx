import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SEO from './SEO';

const API = process.env.REACT_APP_BACKEND_URL;

// ═══ Palette Founder (sombre, plus dense qu'Observatory public) ══
const F = {
  bg: '#0B0906',
  panel: '#141010',
  hairline: '#ffffff10',
  hairlineStrong: '#ffffff20',
  text: '#EAE4D5',
  dim: '#8A8378',
  gold: '#C9A84C',
  rust: '#A65D47',
  data: '#7BA79A',
  ok: '#7BA79A',
  warn: '#C9A84C',
  err: '#A65D47',
  none: '#3C342A',
};

// ═══ Provenance labels — chaque donnée est catégorisée ══════════
const PROV = {
  OBSERVED: { color: '#7BA79A', label: 'OBSERVED' },
  RECONSTRUCTED: { color: '#C9A84C', label: 'RECONSTRUCTED' },
  LEGACY: { color: '#A65D47', label: 'LEGACY' },
  LIVE: { color: '#EAE4D5', label: 'LIVE' },
  NOT_CONFIGURED: { color: '#3C342A', label: 'NOT CONFIGURED' },
};

const Rule = () => <div className="w-full h-px" style={{ background: F.hairline }} />;

const NavItem = ({ n, label, active, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left py-3 px-4 transition-colors block"
    style={{
      borderLeft: active ? `2px solid ${F.gold}` : '2px solid transparent',
      background: active ? '#ffffff05' : 'transparent',
      color: active ? F.text : F.dim,
    }}
  >
    <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: F.gold, opacity: active ? 1 : 0.6 }}>
      {n}
    </div>
    <div style={{ fontFamily: "'Newsreader', serif", fontSize: '1.05rem', lineHeight: 1.1, marginTop: 2 }}>
      {label}
    </div>
  </button>
);

const Label = ({ n, children }) => (
  <div className="text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: F.dim }}>
    {n && <span style={{ color: F.gold, opacity: 0.8, marginRight: 8 }}>{n} ——</span>}
    {children}
  </div>
);

const Source = ({ children }) => (
  <div className="text-[10px] font-mono lowercase tracking-wider mt-1" style={{ color: F.dim, opacity: 0.65 }}>
    src · {children}
  </div>
);

// Provenance tag (OBSERVED / RECONSTRUCTED / LEGACY / LIVE / NOT CONFIGURED)
const Prov = ({ kind }) => {
  const p = PROV[kind] || PROV.NOT_CONFIGURED;
  return (
    <span
      className="inline-block text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5"
      style={{
        border: `1px solid ${p.color}`,
        color: p.color,
        lineHeight: 1,
      }}
    >
      {p.label}
    </span>
  );
};

const Metric = ({ label, value, source, provenance, breakdown, testId }) => {
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <div className="py-6 md:py-8" style={{ borderTop: `1px solid ${F.hairline}` }} data-testid={testId}>
      <div className="flex items-center gap-3">
        <Label>{label}</Label>
        {provenance && <Prov kind={provenance} />}
      </div>
      <div className="mt-3 flex items-baseline gap-4 flex-wrap">
        <div
          style={{
            fontFamily: "'Newsreader', serif",
            fontSize: 'clamp(2.4rem, 4.5vw, 4rem)',
            lineHeight: 1,
            color: isEmpty ? F.none : F.text,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {isEmpty ? '—' : Number(value).toLocaleString('fr-FR')}
        </div>
        {breakdown && (
          <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: F.dim }}>
            {breakdown}
          </div>
        )}
      </div>
      {source && <Source>{source}</Source>}
    </div>
  );
};

// Loading / Empty / Error primitive
const State = ({ children, kind = 'dim' }) => (
  <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: kind === 'err' ? F.err : F.dim }}>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// FOUNDER OBSERVATORY — full institutional memory
// ═══════════════════════════════════════════════════════════════
export default function ObservatoryFounder() {
  const navigate = useNavigate();
  const [section, setSection] = useState('01');
  const [access, setAccess] = useState({ loaded: false, ok: false, data: null });

  // Data buckets (each fetched from its endpoint)
  const [memory, setMemory] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [eventTypes, setEventTypes] = useState(null);
  const [territories, setTerritories] = useState(null);
  const [actors, setActors] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [conversion, setConversion] = useState(null);
  const [conversionErr, setConversionErr] = useState(null);
  const [network, setNetwork] = useState(null);
  const [networkErr, setNetworkErr] = useState(null);
  const [signals, setSignals] = useState(null);
  const [signalsErr, setSignalsErr] = useState(null);
  const [badges, setBadges] = useState(null);
  const [badgesErr, setBadgesErr] = useState(null);
  const [diffusion, setDiffusion] = useState(null);

  // ── Access gate ─────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const a = await axios.get(`${API}/api/observatory/access`, { withCredentials: true });
        if (!mounted) return;
        setAccess({ loaded: true, ok: !!a.data.is_founder, data: a.data });
      } catch {
        if (mounted) setAccess({ loaded: true, ok: false, data: null });
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Data fetch (only public reads if not founder ; all reads if founder) ─
  useEffect(() => {
    if (!access.loaded) return;

    // Public reads (always allowed)
    axios.get(`${API}/api/observatory/memory`).then(r => setMemory(r.data)).catch(() => {});
    axios.get(`${API}/api/observatory/timeline?days=365`).then(r => setTimeline(r.data)).catch(() => {});
    axios.get(`${API}/api/observatory/event-types?days=180`).then(r => setEventTypes(r.data)).catch(() => {});
    axios.get(`${API}/api/observatory/territories`).then(r => setTerritories(r.data)).catch(() => {});
    axios.get(`${API}/api/observatory/actors?limit=20`).then(r => setActors(r.data)).catch(() => {});
    axios.get(`${API}/api/observatory/sessions?days=30`).then(r => setSessions(r.data)).catch(() => {});

    // Founder-only reads
    if (access.ok) {
      axios.get(`${API}/api/observatory/badges?days=365`, { withCredentials: true })
        .then(r => setBadges(r.data)).catch(e => setBadgesErr(e?.response?.data?.detail || 'unavailable'));
      axios.get(`${API}/api/observatory/conversion?days=90`, { withCredentials: true })
        .then(r => setConversion(r.data)).catch(e => setConversionErr(e?.response?.data?.detail || 'unavailable'));
      axios.get(`${API}/api/observatory/network?days=90`, { withCredentials: true })
        .then(r => setNetwork(r.data)).catch(e => setNetworkErr(e?.response?.data?.detail || 'unavailable'));
      axios.get(`${API}/api/observatory/signals?days=180`, { withCredentials: true })
        .then(r => setSignals(r.data)).catch(e => setSignalsErr(e?.response?.data?.detail || 'unavailable'));
      axios.get(`${API}/api/observatory/diffusion?days=90`, { withCredentials: true })
        .then(r => setDiffusion(r.data)).catch(() => {});
    }
  }, [access.loaded, access.ok]);

  // ── Gate rendering ──────────────────────────────────────
  if (!access.loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: F.bg, color: F.dim }}>
        <State>authenticating…</State>
      </div>
    );
  }

  if (!access.ok) {
    return (
      <div className="min-h-screen" style={{ background: F.bg, color: F.text, fontFamily: "'Manrope', sans-serif" }} data-testid="founder-gate">
        <SEO title="Founder Observatory" description="Restricted institutional memory." path="/observatory/founder" />
        <div className="max-w-3xl mx-auto px-6 md:px-12 pt-32 md:pt-40 pb-24">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: F.dim }}>
            Kiltikonet / Observatory / Founder
          </div>
          <h1
            className="mt-6 mb-8"
            style={{
              fontFamily: "'Newsreader', serif",
              fontWeight: 400,
              fontSize: 'clamp(2.4rem, 5vw, 4rem)',
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}
          >
            Restricted. <br />
            <span style={{ fontStyle: 'italic', color: F.dim }}>Founder access required.</span>
          </h1>
          <p style={{ color: F.dim, lineHeight: 1.7, fontSize: '15px' }}>
            Cet espace expose la mémoire opérationnelle intégrale de Kiltikonet. Il est
            réservé au rôle « founder ». Aucune ouverture publique n'est prévue.
          </p>
          <div className="mt-10 text-[11px] font-mono uppercase tracking-widest" style={{ color: F.dim }}>
            {access.data?.authenticated ? 'authenticated · role insufficient' : 'not authenticated'}
          </div>
          <div className="mt-8 flex gap-6 text-[11px] font-mono uppercase tracking-widest">
            <Link to="/" style={{ color: F.gold }}>← Kiltikonet</Link>
            <Link to="/observatory" style={{ color: F.dim }}>Observatory (public)</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Sections ─────────────────────────────────────────────
  const NAV = [
    { n: '00', k: '00', label: 'Colophon' },
    { n: '01', k: '01', label: 'Memory' },
    { n: '02', k: '02', label: 'Timeline' },
    { n: '03', k: '03', label: 'Actors' },
    { n: '04', k: '04', label: 'Territories' },
    { n: '05', k: '05', label: 'Sessions & Funnels' },
    { n: '06', k: '06', label: 'Network' },
    { n: '07', k: '07', label: 'Signals' },
    { n: '08', k: '08', label: 'Access · System' },
  ];

  const dm = memory?.digital_memory;

  return (
    <div
      className="min-h-screen"
      style={{ background: F.bg, color: F.text, fontFamily: "'Manrope', sans-serif" }}
      data-testid="observatory-founder-page"
    >
      <SEO
        title="Founder Observatory"
        description="Kiltikonet — Institutional operational memory. Founder access only."
        path="/observatory/founder"
      />

      {/* Documentary bar */}
      <div
        className="px-6 md:px-12 lg:px-16 pt-8 pb-4 flex flex-wrap justify-between items-baseline gap-4 text-[10px] font-mono uppercase tracking-[0.22em]"
        style={{ color: F.dim, borderBottom: `1px solid ${F.hairline}` }}
      >
        <span>Kiltikonet / Observatory / Founder</span>
        <span>Institutional Memory · Read-only</span>
        <span>{new Date().toISOString().slice(0, 19).replace('T', ' · ')}</span>
      </div>

      <div className="grid grid-cols-12 min-h-[calc(100vh-60px)]">
        {/* NAV VERTICAL */}
        <aside
          className="col-span-12 md:col-span-3 lg:col-span-2 md:sticky md:top-0 md:h-screen py-6 md:py-10"
          style={{ borderRight: `1px solid ${F.hairline}` }}
          data-testid="founder-nav"
        >
          <div className="px-4 mb-6 text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: F.gold }}>
            Sections
          </div>
          {NAV.map(item => (
            <NavItem
              key={item.k}
              n={item.n}
              label={item.label}
              active={section === item.k}
              onClick={() => setSection(item.k)}
            />
          ))}
          <div className="mt-10 px-4 text-[10px] font-mono uppercase tracking-widest" style={{ color: F.dim }}>
            <div>Founder</div>
            <div style={{ color: F.text, marginTop: 2 }}>{access.data?.email_masked}</div>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10 px-6 md:px-12 lg:px-16 py-10 md:py-16">
          {/* 00 — COLOPHON */}
          {section === '00' && (
            <section data-testid="section-00-colophon">
              <Label n="00">Colophon</Label>
              <h2
                className="mt-6 mb-8 max-w-3xl"
                style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.025em' }}
              >
                Observatory n'est pas un tableau de bord.
              </h2>
              <div className="max-w-3xl space-y-4" style={{ color: F.dim, lineHeight: 1.7, fontSize: '15px' }}>
                <p>
                  C'est la mémoire numérique de Kiltikonet. Chaque donnée affichée provient
                  d'une source réelle. Chaque source est identifiable. Rien n'est estimé
                  pour donner une impression de profondeur.
                </p>
                <p>
                  Cinq provenances possibles pour chaque donnée : <Prov kind="LIVE" /> (mesurée à
                  l'instant), <Prov kind="OBSERVED" /> (mesurée historiquement), <Prov kind="RECONSTRUCTED" /> (dérivée à
                  partir de collections métier), <Prov kind="LEGACY" /> (importée d'un système antérieur), <Prov kind="NOT_CONFIGURED" /> (donnée non enregistrée dans l'infrastructure).
                </p>
                <p>
                  Smart Engine reste le système opérationnel/business historique. Observatory
                  s'y connecte uniquement via des adaptateurs read-only. Aucune collection
                  métier n'est déplacée, écrasée ou supprimée.
                </p>
              </div>
              <div className="mt-10">
                <Label>Doctrine · sources</Label>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] font-mono uppercase tracking-widest" style={{ color: F.dim }}>
                  <div>db.analytics_events (canonical)</div>
                  <div>db.workspace_logs</div>
                  <div>db.registrations</div>
                  <div>db.scan_events</div>
                  <div>db.cc_badges</div>
                  <div>db.team_notifications (via adapter)</div>
                </div>
              </div>
            </section>
          )}

          {/* 01 — MEMORY */}
          {section === '01' && (
            <section data-testid="section-01-memory">
              <Label n="01">Digital Memory</Label>
              <h2
                className="mt-6 mb-10 max-w-3xl"
                style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.025em' }}
              >
                Vue globale.
              </h2>
              {dm ? (
                <div className="grid md:grid-cols-3 gap-x-12">
                  <Metric label="Events total" value={dm.events_total?.value} source={dm.events_total?.source}
                    breakdown={`legacy ${dm.events_total?.breakdown?.legacy_pre_refonte ?? 0} · new ${dm.events_total?.breakdown?.post_refonte ?? 0}`}
                    provenance="OBSERVED" testId="fmetric-events" />
                  <Metric label="Workspace activity" value={dm.workspace_activity?.value} source={dm.workspace_activity?.source}
                    provenance="OBSERVED" testId="fmetric-workspace" />
                  <Metric label="Registrations CC2026" value={dm.cc2026_registrations?.value} source={dm.cc2026_registrations?.source}
                    provenance="OBSERVED" testId="fmetric-reg" />
                  <Metric label="Recorded scans" value={dm.recorded_scans?.value} source={dm.recorded_scans?.source}
                    provenance="OBSERVED" testId="fmetric-scans" />
                  <Metric label="Distinct organizations" value={dm.distinct_organizations?.value} source={dm.distinct_organizations?.source}
                    provenance="RECONSTRUCTED" testId="fmetric-orgs" />
                  <Metric label="Distinct territories" value={dm.distinct_territories?.value} source={dm.distinct_territories?.source}
                    provenance={dm.distinct_territories?.value === 0 ? "NOT_CONFIGURED" : "RECONSTRUCTED"}
                    testId="fmetric-territories" />
                </div>
              ) : <State>reading db…</State>}
            </section>
          )}

          {/* 02 — TIMELINE */}
          {section === '02' && (
            <section data-testid="section-02-timeline">
              <Label n="02">Timeline · 365 days</Label>
              <h2
                className="mt-6 mb-10 max-w-3xl"
                style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.025em' }}
              >
                Reconstruction historique par jour.
              </h2>
              {timeline?.timeline?.length > 0 ? (
                <>
                  <div className="mb-6 flex gap-4 items-center">
                    <Prov kind="LEGACY" />
                    <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: F.dim }}>
                      analytics_events · workspace_logs · registrations · scan_events
                    </span>
                  </div>
                  <TimelineSparkline data={timeline.timeline} />
                  <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-[11px] font-mono uppercase tracking-widest" style={{ color: F.dim }}>
                    {timeline.sources?.map(s => (
                      <div key={s} className="truncate">· {s.replace('db.', '')}</div>
                    ))}
                  </div>
                  <div className="mt-6 text-[10px] font-mono uppercase tracking-widest" style={{ color: F.dim }}>
                    {timeline.timeline.length} daily bins · from {timeline.timeline[0]?.date} to {timeline.timeline[timeline.timeline.length-1]?.date}
                  </div>
                </>
              ) : <State>no timeline data</State>}

              {eventTypes?.top_types?.length > 0 && (
                <div className="mt-16">
                  <Label>Distribution by event type (180d)</Label>
                  <div className="mt-6" data-testid="event-types-list-founder">
                    {eventTypes.top_types.map((t, i) => (
                      <div key={t.type} className="grid grid-cols-12 gap-4 py-3 items-baseline" style={{ borderTop: `1px solid ${F.hairline}` }}>
                        <div className="col-span-1 text-[10px] font-mono" style={{ color: F.dim }}>{String(i + 1).padStart(2, '0')}</div>
                        <div className="col-span-6 truncate" style={{ fontFamily: "'Newsreader', serif", color: F.text }}>{t.type}</div>
                        <div className="col-span-2 text-[11px] font-mono" style={{ color: F.data }}>{t.count.toLocaleString('fr-FR')}</div>
                        <div className="col-span-3 text-[10px] font-mono uppercase" style={{ color: F.dim }}>{t.share_pct}%</div>
                      </div>
                    ))}
                    <div style={{ borderTop: `1px solid ${F.hairline}` }} />
                    <Source>{eventTypes.source}</Source>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 03 — ACTORS */}
          {section === '03' && (
            <section data-testid="section-03-actors">
              <Label n="03">Actors · Organizations</Label>
              <h2
                className="mt-6 mb-10 max-w-3xl"
                style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.025em' }}
              >
                Cartographie des acteurs réels.
              </h2>
              {actors ? (
                <div className="grid md:grid-cols-2 gap-x-12">
                  <div>
                    <Metric label="Distinct organizations" value={actors.distinct_total} source={actors.source}
                      provenance="RECONSTRUCTED" testId="fmetric-actors-distinct" />
                    <Metric label="Public catalog size" value={actors.public_catalog_size} source="show_in_catalog=true"
                      provenance="OBSERVED" testId="fmetric-actors-public" />
                  </div>
                  <div className="md:pt-8">
                    <Label>Top actors</Label>
                    {actors.top_actors?.length > 0 ? (
                      <div className="mt-4" data-testid="top-actors-list">
                        {actors.top_actors.slice(0, 10).map((a, i) => (
                          <div key={i} className="py-2 flex justify-between items-baseline" style={{ borderTop: `1px solid ${F.hairline}` }}>
                            <span className="truncate" style={{ color: F.text, fontFamily: "'Newsreader', serif" }}>{a.name}</span>
                            <span className="text-[11px] font-mono" style={{ color: F.data }}>{a.registrations}</span>
                          </div>
                        ))}
                      </div>
                    ) : <State>no actor data</State>}
                  </div>
                </div>
              ) : <State>reading db…</State>}

              {/* Badges from Smart Engine adapter (founder-only) */}
              <div className="mt-16">
                <Label>Badges · via Smart Engine adapter</Label>
                {badges ? (
                  <div className="mt-6 grid md:grid-cols-3 gap-x-8">
                    <Metric label="Total badges" value={badges.total_badges} source={badges.source} provenance="OBSERVED" testId="fmetric-badges-total" />
                    <Metric label="Active FREK-IDs" value={badges.frek_ids_active} source={badges.source} provenance="OBSERVED" testId="fmetric-frekids" />
                    <Metric label="Avg impact score" value={badges.avg_impact_score} source={badges.source} provenance="RECONSTRUCTED" testId="fmetric-avg-impact" />
                  </div>
                ) : badgesErr ? (
                  <State kind="err">badges adapter: {badgesErr}</State>
                ) : <State>reading adapter…</State>}
              </div>
            </section>
          )}

          {/* 04 — TERRITORIES */}
          {section === '04' && (
            <section data-testid="section-04-territories">
              <Label n="04">Territories</Label>
              <h2
                className="mt-6 mb-10 max-w-3xl"
                style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.025em' }}
              >
                Territoires réellement présents dans la base.
              </h2>
              {territories?.territories?.length > 0 ? (
                <div>
                  <div className="mb-6 flex gap-4 items-center">
                    <Prov kind="OBSERVED" />
                    <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: F.dim }}>
                      db.registrations.country
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2">
                    {territories.territories.map(t => (
                      <div key={t.country} className="py-3 flex justify-between items-baseline" style={{ borderTop: `1px solid ${F.hairline}` }}>
                        <span style={{ fontFamily: "'Newsreader', serif", color: F.text }}>{t.country}</span>
                        <span className="text-[11px] font-mono" style={{ color: F.data }}>{t.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6"><Source>{territories.source} · {territories.distinct} distinct</Source></div>
                </div>
              ) : (
                <div>
                  <Prov kind="NOT_CONFIGURED" />
                  <div className="mt-4 max-w-2xl" style={{ color: F.dim, lineHeight: 1.7, fontSize: '15px' }}>
                    Le champ <code>db.registrations.country</code> n'est pas encore renseigné
                    dans cet environnement. Aucune reconstruction n'est effectuée : la donnée
                    doit venir d'une saisie réelle lors de l'inscription.
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 05 — SESSIONS & FUNNELS */}
          {section === '05' && (
            <section data-testid="section-05-sessions">
              <Label n="05">Sessions & Funnels · 30 days</Label>
              <h2
                className="mt-6 mb-10 max-w-3xl"
                style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.025em' }}
              >
                Visite → Interaction → Inscription.
              </h2>
              {sessions ? (
                <>
                  <div className="grid md:grid-cols-3 gap-x-12">
                    <Metric label="Unique sessions" value={sessions.unique_sessions} source="db.analytics_events.session_id (distinct)"
                      provenance="OBSERVED" testId="fmetric-sessions" />
                    <Metric label="Unique visitors" value={sessions.unique_visitors} source="db.analytics_events.visitor_id (distinct)"
                      provenance="OBSERVED" testId="fmetric-visitors" />
                    <Metric label="Top page (views)" value={sessions.top_pages?.[0]?.views} source="db.analytics_events.data.page"
                      provenance="OBSERVED" testId="fmetric-top-page-views" breakdown={sessions.top_pages?.[0]?.page} />
                  </div>
                  {sessions.top_pages?.length > 0 && (
                    <div className="mt-12">
                      <Label>Top pages</Label>
                      <div className="mt-4" data-testid="top-pages-list">
                        {sessions.top_pages.slice(0, 12).map((p, i) => (
                          <div key={i} className="py-2 flex justify-between items-baseline" style={{ borderTop: `1px solid ${F.hairline}` }}>
                            <span className="truncate" style={{ color: F.text }}>{p.page}</span>
                            <span className="text-[11px] font-mono" style={{ color: F.data }}>{p.views}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {sessions.top_referrers?.length > 0 && (
                    <div className="mt-12">
                      <Label>External referrers</Label>
                      <div className="mt-4" data-testid="top-referrers-list">
                        {sessions.top_referrers.map((r, i) => (
                          <div key={i} className="py-2 flex justify-between items-baseline" style={{ borderTop: `1px solid ${F.hairline}` }}>
                            <span className="truncate" style={{ color: F.text }}>{r.host}</span>
                            <span className="text-[11px] font-mono" style={{ color: F.data }}>{r.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : <State>reading db…</State>}

              {/* Conversion adapter (founder-only) */}
              <div className="mt-16" data-testid="conversion-block">
                <Label>Funnel · via Smart Engine adapter (90d)</Label>
                {conversion ? (
                  <div className="mt-6 grid md:grid-cols-4 gap-x-8">
                    {(conversion.funnel || []).map((step, i) => (
                      <Metric key={i} label={step.label || step.name || `Step ${i+1}`} value={step.count}
                        source={conversion.source} provenance="OBSERVED" testId={`fmetric-funnel-${i}`}
                        breakdown={step.share_pct ? `${step.share_pct}%` : null} />
                    ))}
                  </div>
                ) : conversionErr ? <State kind="err">conversion adapter: {conversionErr}</State> : <State>reading adapter…</State>}
              </div>
            </section>
          )}

          {/* 06 — NETWORK */}
          {section === '06' && (
            <section data-testid="section-06-network">
              <Label n="06">Network</Label>
              <h2
                className="mt-6 mb-10 max-w-3xl"
                style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.025em' }}
              >
                Représentation du réseau.
              </h2>
              {network ? (
                <div className="grid md:grid-cols-3 gap-x-12">
                  <Metric label="Nodes" value={network.nodes_total} source={network.source}
                    provenance="RECONSTRUCTED" testId="fmetric-net-nodes" />
                  <Metric label="Edges" value={network.edges_total} source={network.source}
                    provenance="RECONSTRUCTED" testId="fmetric-net-edges" />
                  <Metric label="Density" value={network.density} source={network.source}
                    provenance="RECONSTRUCTED" testId="fmetric-net-density" />
                </div>
              ) : networkErr ? (
                <div>
                  <Prov kind="NOT_CONFIGURED" />
                  <div className="mt-4 max-w-2xl" style={{ color: F.dim, lineHeight: 1.7, fontSize: '15px' }}>
                    network adapter: {networkErr}. La représentation du réseau nécessite des
                    interactions réelles entre acteurs. Aucune connexion n'est fabriquée.
                  </div>
                </div>
              ) : <State>reading adapter…</State>}

              {/* Diffusion (bonus) */}
              {diffusion && (
                <div className="mt-16">
                  <Label>Diffusion</Label>
                  <div className="mt-6 grid md:grid-cols-3 gap-x-8">
                    <Metric label="Diffusion signals" value={diffusion.signals_total} source={diffusion.source}
                      provenance="OBSERVED" testId="fmetric-diffusion" />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 07 — SIGNALS */}
          {section === '07' && (
            <section data-testid="section-07-signals">
              <Label n="07">Signals · Anomalies</Label>
              <h2
                className="mt-6 mb-10 max-w-3xl"
                style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.025em' }}
              >
                Historique des alertes.
              </h2>
              {signals ? (
                <div>
                  <div className="mb-6 flex gap-4 items-center flex-wrap">
                    <Prov kind="LEGACY" />
                    <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: F.dim }}>
                      {signals.source}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: F.dim }}>
                      · {signals.total_signals ?? signals.signals?.length ?? 0} signals
                    </span>
                  </div>
                  {(signals.signals || []).length > 0 ? (
                    <div data-testid="signals-list">
                      {(signals.signals || []).slice(0, 30).map((s, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 py-4 items-baseline" style={{ borderTop: `1px solid ${F.hairline}` }}>
                          <div className="col-span-1 text-[10px] font-mono" style={{ color: F.dim }}>{String(i + 1).padStart(2, '0')}</div>
                          <div className="col-span-3 truncate">
                            <span style={{ fontFamily: "'Newsreader', serif", color: F.text }}>
                              {s.type || s.rule || 'signal'}
                            </span>
                          </div>
                          <div className="col-span-5 truncate text-[12px]" style={{ color: F.dim }}>
                            {s.message || s.detail || s.text || ''}
                          </div>
                          <div className="col-span-2 text-[10px] font-mono uppercase" style={{
                            color: s.severity === 'high' ? F.err : s.severity === 'medium' ? F.warn : F.dim,
                          }}>
                            {s.severity || 'info'}
                          </div>
                          <div className="col-span-1 text-[10px] font-mono text-right" style={{ color: F.dim }}>
                            {(s.timestamp || s.created_at || '').slice(0, 10)}
                          </div>
                        </div>
                      ))}
                      <div style={{ borderTop: `1px solid ${F.hairline}` }} />
                    </div>
                  ) : (
                    <div>
                      <Prov kind="NOT_CONFIGURED" />
                      <div className="mt-4 max-w-2xl" style={{ color: F.dim, lineHeight: 1.7, fontSize: '15px' }}>
                        Aucune alerte enregistrée sur la période. Les règles Smart Engine
                        actives : traffic_spike, low_conversion, deadline_approaching,
                        registration_batch, error_spike.
                      </div>
                    </div>
                  )}
                </div>
              ) : signalsErr ? (
                <State kind="err">signals adapter: {signalsErr}</State>
              ) : <State>reading adapter…</State>}
            </section>
          )}

          {/* 08 — ACCESS · SYSTEM */}
          {section === '08' && (
            <section data-testid="section-08-access">
              <Label n="08">Access · System Health</Label>
              <h2
                className="mt-6 mb-10 max-w-3xl"
                style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.025em' }}
              >
                Gouvernance technique.
              </h2>
              <div className="grid md:grid-cols-3 gap-x-12">
                <div>
                  <Label>Access</Label>
                  <div className="mt-4 text-[15px]" style={{ fontFamily: "'Newsreader', serif", color: F.text }}>
                    Founder ✓
                  </div>
                  <div className="text-[11px] font-mono mt-1" style={{ color: F.dim }}>
                    {access.data?.email_masked}
                  </div>
                  <Source>role-based · FOUNDER_EMAILS env</Source>
                </div>
                <div>
                  <Label>Adapters</Label>
                  <div className="mt-4 space-y-1 text-[11px] font-mono uppercase tracking-widest" style={{ color: F.dim }}>
                    <div><span style={{ color: badges ? F.ok : F.err }}>●</span> badges</div>
                    <div><span style={{ color: conversion ? F.ok : F.err }}>●</span> conversion</div>
                    <div><span style={{ color: network ? F.ok : F.err }}>●</span> network</div>
                    <div><span style={{ color: signals ? F.ok : F.err }}>●</span> signals</div>
                    <div><span style={{ color: diffusion ? F.ok : F.err }}>●</span> diffusion</div>
                  </div>
                  <Source>services/observatory_adapters/*</Source>
                </div>
                <div>
                  <Label>Data lineage</Label>
                  <div className="mt-4 text-[11px] font-mono uppercase tracking-widest" style={{ color: F.dim }}>
                    analytics_events (canonical)<br />
                    site_events (archive)<br />
                    workspace_logs · registrations · scan_events · cc_badges
                  </div>
                  <Source>observatory/memory endpoint</Source>
                </div>
              </div>

              <div className="mt-12">
                <Label>Backend</Label>
                <div className="mt-4 text-[15px]" style={{ fontFamily: "'Newsreader', serif", color: F.ok }}>
                  operational
                </div>
                <Source>/api/observatory/*</Source>
              </div>
            </section>
          )}

          {/* Footer minimal */}
          <div className="mt-24 pt-8 flex flex-wrap justify-between text-[10px] font-mono uppercase tracking-widest" style={{ color: F.dim, borderTop: `1px solid ${F.hairline}` }}>
            <span>Founder Observatory · Read-only observation layer</span>
            <Link to="/observatory" style={{ color: F.dim }}>Observatory (public)</Link>
            <Link to="/" style={{ color: F.gold }}>← Kiltikonet.fr</Link>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Sparkline for Timeline section ────────────────────────
function TimelineSparkline({ data }) {
  if (!data || data.length === 0) return null;
  const rows = data.slice(-180).map(b => ({
    date: b.date,
    total: (b.events || 0) + (b.workspace || 0) + (b.registrations || 0) + (b.scans || 0),
    ev: b.events || 0, wk: b.workspace || 0, re: b.registrations || 0, sc: b.scans || 0,
  }));
  const max = Math.max(1, ...rows.map(r => r.total));
  const w = 900, h = 160;
  const step = w / Math.max(1, rows.length - 1);
  const path = rows.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i*step).toFixed(1)} ${(h - (p.total/max)*h).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" aria-hidden data-testid="founder-timeline-sparkline">
      <path d={path} stroke={F.gold} strokeWidth="1" fill="none" opacity="0.9" />
    </svg>
  );
}
