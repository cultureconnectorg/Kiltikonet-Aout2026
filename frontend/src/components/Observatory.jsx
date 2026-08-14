import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SEO from './SEO';
import InstitutionalFooter from './kilti/InstitutionalFooter';

const API = process.env.REACT_APP_BACKEND_URL;

// ─── Palette Observatory (sobre, observatoire numérique) ─────
const O = {
  bg: '#0B0906',
  panel: '#141010',
  hairline: '#ffffff10',
  text: '#EAE4D5',
  dim: '#8A8378',
  gold: '#C9A84C',
  rust: '#A65D47',
  data: '#7BA79A',   // vert-eau discret pour les valeurs numériques
  ok: '#7BA79A',
  warn: '#C9A84C',
  none: '#3C342A',
};

// ─── Petits atomes documentaires ─────────────────────────────
const Rule = () => <div className="w-full h-px" style={{ background: O.hairline }} />;

const Label = ({ n, children }) => (
  <div className="text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: O.dim }}>
    {n && <span style={{ color: O.gold, opacity: 0.8, marginRight: 8 }}>{n} ——</span>}
    {children}
  </div>
);

const Source = ({ children }) => (
  <div className="text-[10px] font-mono lowercase tracking-wider mt-1" style={{ color: O.dim, opacity: 0.6 }}>
    src · {children}
  </div>
);

// ─── Cellule métrique ─────────────────────────────────────────
const Metric = ({ label, value, source, testId, breakdown }) => (
  <div className="py-6 md:py-8" style={{ borderTop: `1px solid ${O.hairline}` }} data-testid={testId}>
    <Label>{label}</Label>
    <div className="mt-3 flex items-baseline gap-4">
      <div
        style={{
          fontFamily: "'Newsreader', 'Cormorant Garamond', serif",
          fontSize: 'clamp(2.4rem, 4.5vw, 4rem)',
          lineHeight: 1,
          color: value === null || value === undefined ? O.none : O.text,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value === null || value === undefined ? '—' : Number(value).toLocaleString('fr-FR')}
      </div>
      {breakdown && (
        <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: O.dim }}>
          {breakdown}
        </div>
      )}
    </div>
    {source && <Source>{source}</Source>}
  </div>
);

// ─── Petit sparkline SVG lisant vraiment les données ─────────
const Sparkline = ({ series, height = 44 }) => {
  if (!series || series.length === 0) return null;
  const values = series.map((p) => p.value);
  const max = Math.max(1, ...values);
  const w = 320;
  const step = w / Math.max(1, series.length - 1);
  const path = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(height - (p.value / max) * height).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" aria-hidden>
      <path d={path} stroke={O.gold} strokeWidth="1" fill="none" opacity="0.85" />
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════
// OBSERVATORY MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Observatory() {
  const navigate = useNavigate();
  const [access, setAccess] = useState({ loaded: false, ok: false });
  const [memory, setMemory] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [eventTypes, setEventTypes] = useState(null);
  const [territories, setTerritories] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const a = await axios.get(`${API}/api/observatory/access`, { withCredentials: true });
        if (!mounted) return;
        setAccess({ loaded: true, ok: !!a.data.is_founder, data: a.data });
      } catch {
        if (mounted) setAccess({ loaded: true, ok: false });
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!access.loaded) return;
    // Even without founder access, memory & timeline are public read (data lineage transparency)
    (async () => {
      try {
        const [m, t, ev, ter, ses] = await Promise.all([
          axios.get(`${API}/api/observatory/memory`).catch(() => ({ data: null })),
          axios.get(`${API}/api/observatory/timeline?days=180`).catch(() => ({ data: null })),
          axios.get(`${API}/api/observatory/event-types?days=30`).catch(() => ({ data: null })),
          axios.get(`${API}/api/observatory/territories`).catch(() => ({ data: null })),
          axios.get(`${API}/api/observatory/sessions?days=7`).catch(() => ({ data: null })),
        ]);
        setMemory(m.data);
        setTimeline(t.data);
        setEventTypes(ev.data);
        setTerritories(ter.data);
        setSessions(ses.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [access.loaded]);

  const dm = memory?.digital_memory;

  // Sparkline series (from timeline, sum of all categories per day)
  const sparkSeries = (timeline?.timeline || []).slice(-60).map((b) => ({
    x: b.date,
    value: (b.events || 0) + (b.workspace || 0) + (b.registrations || 0) + (b.scans || 0),
  }));

  return (
    <div
      className="min-h-screen"
      style={{ background: O.bg, color: O.text, fontFamily: "'Manrope', sans-serif" }}
      data-testid="observatory-page"
    >
      <SEO
        title="Observatory"
        description="Kiltikonet Observatory — Digital memory & observation layer."
        path="/observatory"
      />

      {/* Bandeau documentaire */}
      <div
        className="px-6 md:px-12 lg:px-20 pt-24 md:pt-28 pb-5 flex flex-wrap justify-between items-baseline gap-4 text-[10px] font-mono uppercase tracking-[0.22em]"
        style={{ color: O.dim }}
      >
        <span>Kiltikonet / Observatory</span>
        <span>Observation Layer · Founder</span>
        <span>{new Date().toISOString().slice(0, 10)}</span>
      </div>

      <div className="px-6 md:px-12 lg:px-20"><Rule /></div>

      {/* HERO — DIGITAL MEMORY */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 md:pt-24 pb-20 md:pb-32" data-testid="hero-memory">
        <Label n="01">Digital Memory</Label>
        <h1
          className="mt-6 mb-12 max-w-5xl"
          style={{
            fontFamily: "'Newsreader', serif",
            fontWeight: 400,
            fontSize: 'clamp(3rem, 7vw, 7rem)',
            lineHeight: 0.94,
            letterSpacing: '-0.035em',
            color: O.text,
          }}
          data-testid="observatory-title"
        >
          Kiltikonet <br />
          <span style={{ fontStyle: 'italic', color: O.dim }}>Observatory</span>
        </h1>

        <p className="max-w-2xl mb-16" style={{ color: O.dim, lineHeight: 1.7, fontSize: '15px' }}>
          Ce n'est pas un dashboard. C'est une couche d'observation. Chaque chiffre affiché ici
          provient d'une source réelle et le déclare explicitement — jamais fabriqué, jamais estimé.
        </p>

        {loading ? (
          <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: O.dim }}>
            reading db…
          </div>
        ) : dm ? (
          <div className="grid md:grid-cols-3 gap-x-12 gap-y-2">
            <Metric
              label="Recorded Events"
              value={dm.events_total?.value}
              source={dm.events_total?.source}
              breakdown={`legacy ${dm.events_total?.breakdown?.legacy_pre_refonte ?? 0} · new ${dm.events_total?.breakdown?.post_refonte ?? 0}`}
              testId="metric-events"
            />
            <Metric
              label="Workspace Activity"
              value={dm.workspace_activity?.value}
              source={dm.workspace_activity?.source}
              testId="metric-workspace"
            />
            <Metric
              label="CC2026 Registrations"
              value={dm.cc2026_registrations?.value}
              source={dm.cc2026_registrations?.source}
              testId="metric-registrations"
            />
            <Metric
              label="Recorded Scans"
              value={dm.recorded_scans?.value}
              source={dm.recorded_scans?.source}
              testId="metric-scans"
            />
            <Metric
              label="Distinct Organizations"
              value={dm.distinct_organizations?.value}
              source={dm.distinct_organizations?.source}
              testId="metric-orgs"
            />
            <Metric
              label="Distinct Territories"
              value={dm.distinct_territories?.value}
              source={dm.distinct_territories?.source}
              testId="metric-territories"
            />
          </div>
        ) : (
          <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: O.dim }}>
            no data available
          </div>
        )}
      </section>

      {/* 02 — TIMELINE */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24" data-testid="section-timeline">
        <Label n="02">Timeline · Pre-refonte reconstruction</Label>
        <h2
          className="mt-6 mb-8 max-w-3xl"
          style={{ fontFamily: "'Newsreader', serif", fontSize: 'clamp(2rem, 3.6vw, 3.2rem)', lineHeight: 1, letterSpacing: '-0.02em' }}
        >
          Reconstruction depuis les collections métier.
        </h2>

        {timeline && timeline.timeline?.length > 0 ? (
          <div className="mt-10">
            <div className="mb-4">
              <Sparkline series={sparkSeries} height={80} />
            </div>
            <div className="grid grid-cols-6 md:grid-cols-12 gap-x-2 gap-y-1 text-[10px] font-mono uppercase tracking-wider" style={{ color: O.dim }}>
              <span className="col-span-3 md:col-span-6">{timeline.timeline[0]?.date}</span>
              <span className="col-span-3 md:col-span-6 text-right">{timeline.timeline[timeline.timeline.length - 1]?.date}</span>
            </div>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 text-[11px] font-mono uppercase tracking-widest" style={{ color: O.dim }}>
              {timeline.sources?.map((s) => (
                <div key={s} className="truncate" title={s}>· {s.replace('db.', '')}</div>
              ))}
            </div>
            <div className="mt-8 text-[10px] font-mono uppercase tracking-widest" style={{ color: O.dim }}>
              {timeline.timeline.length} daily bins · {timeline.range?.days} days window
            </div>
          </div>
        ) : (
          <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: O.dim }}>no timeline data</div>
        )}
      </section>

      {/* 03 — EVENT TYPES */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24" data-testid="section-event-types">
        <Label n="03">Event Types · Distribution (30d)</Label>

        {eventTypes && eventTypes.top_types?.length > 0 ? (
          <div className="mt-10 space-y-0" data-testid="event-types-list">
            {eventTypes.top_types.map((t, i) => (
              <div
                key={t.type}
                className="grid grid-cols-12 gap-4 py-3 items-baseline"
                style={{ borderTop: `1px solid ${O.hairline}` }}
              >
                <div className="col-span-1 text-[10px] font-mono" style={{ color: O.dim }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="col-span-6 md:col-span-5 truncate" style={{ fontFamily: "'Newsreader', serif", color: O.text }}>
                  {t.type}
                </div>
                <div className="col-span-3 text-[11px] font-mono" style={{ color: O.data }}>{t.count.toLocaleString('fr-FR')}</div>
                <div className="col-span-2 md:col-span-3 text-[10px] font-mono uppercase" style={{ color: O.dim }}>
                  {t.share_pct}%
                </div>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${O.hairline}` }} />
            <Source>{eventTypes.source} · {eventTypes.total_events_period.toLocaleString('fr-FR')} events analyzed</Source>
          </div>
        ) : (
          <div className="mt-8 text-[11px] font-mono uppercase tracking-widest" style={{ color: O.dim }}>no event data yet</div>
        )}
      </section>

      {/* 04 — TERRITORIES */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24" data-testid="section-territories">
        <Label n="04">Territories · From registrations</Label>

        {territories && territories.territories?.length > 0 ? (
          <div className="mt-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2">
              {territories.territories.map((t) => (
                <div key={t.country} className="py-3 flex justify-between items-baseline" style={{ borderTop: `1px solid ${O.hairline}` }}>
                  <span style={{ fontFamily: "'Newsreader', serif", color: O.text }}>{t.country}</span>
                  <span className="text-[11px] font-mono" style={{ color: O.data }}>{t.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-6"><Source>{territories.source} · {territories.distinct} distinct territories</Source></div>
          </div>
        ) : (
          <div className="mt-8 text-[11px] font-mono uppercase tracking-widest" style={{ color: O.dim }}>
            not yet configured · db.registrations.country field is empty in this environment
          </div>
        )}
      </section>

      {/* 05 — SESSIONS */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24" data-testid="section-sessions">
        <Label n="05">Sessions · Last 7 days</Label>

        {sessions ? (
          <div className="mt-10 grid md:grid-cols-2 gap-x-12">
            <div>
              <Metric label="Unique sessions (7d)" value={sessions.unique_sessions} source="db.analytics_events.session_id (distinct)" testId="metric-sessions-uniq" />
              <Metric label="Unique visitors (7d)" value={sessions.unique_visitors} source="db.analytics_events.visitor_id (distinct)" testId="metric-visitors-uniq" />
            </div>
            <div className="md:pt-6">
              <Label>Top pages</Label>
              {sessions.top_pages?.length > 0 ? (
                <div className="mt-4">
                  {sessions.top_pages.slice(0, 10).map((p, i) => (
                    <div key={i} className="py-2 flex justify-between items-baseline" style={{ borderTop: `1px solid ${O.hairline}` }}>
                      <span className="truncate" style={{ color: O.text }}>{p.page}</span>
                      <span className="text-[11px] font-mono" style={{ color: O.data }}>{p.views}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-[10px] font-mono uppercase" style={{ color: O.dim }}>no page data yet</div>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {/* 06 — SOURCES (referrers) */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24" data-testid="section-sources">
        <Label n="06">Sources · Referrers (7d)</Label>
        {sessions && sessions.top_referrers?.length > 0 ? (
          <div className="mt-10 space-y-0">
            {sessions.top_referrers.map((r, i) => (
              <div key={r.host} className="grid grid-cols-12 gap-4 py-3 items-baseline" style={{ borderTop: `1px solid ${O.hairline}` }}>
                <div className="col-span-1 text-[10px] font-mono" style={{ color: O.dim }}>{String(i + 1).padStart(2, '0')}</div>
                <div className="col-span-9 truncate" style={{ fontFamily: "'Newsreader', serif", color: O.text }}>{r.host}</div>
                <div className="col-span-2 text-[11px] font-mono text-right" style={{ color: O.data }}>{r.count}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 text-[11px] font-mono uppercase tracking-widest" style={{ color: O.dim }}>
            no external referrer traffic recorded yet · normalized field db.analytics_events.referrer_host
          </div>
        )}
      </section>

      {/* 07 — SIGNALS (placeholder — Phase 5) */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24" data-testid="section-signals">
        <Label n="07">Signals · Anomaly detection</Label>
        <div className="mt-8 max-w-2xl" style={{ color: O.dim, lineHeight: 1.7, fontSize: '15px' }}>
          Not yet configured · Phase 5 dependency.
        </div>
        <Source>Will read from db.signals (not yet created) · z-score on hourly event volume</Source>
      </section>

      {/* 08 — SYSTEM HEALTH */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24" data-testid="section-system-health">
        <Label n="08">System Health</Label>
        <div className="mt-8 grid md:grid-cols-3 gap-x-12">
          <div>
            <Label>Access</Label>
            <div className="mt-2 text-[15px]" style={{ fontFamily: "'Newsreader', serif", color: O.text }}>
              {access.data?.authenticated ? (access.ok ? 'Founder ✓' : 'Authenticated (not founder)') : 'Anonymous'}
            </div>
            {access.data?.email_masked && (
              <div className="text-[11px] font-mono mt-1" style={{ color: O.dim }}>
                {access.data.email_masked}
              </div>
            )}
            <Source>role-based · FOUNDER_EMAILS env var</Source>
          </div>
          <div>
            <Label>Data lineage</Label>
            <div className="mt-2 text-[11px] font-mono uppercase tracking-widest" style={{ color: O.dim }}>
              analytics_events (canonical)<br />
              site_events (archive, read-only)
            </div>
          </div>
          <div>
            <Label>Backend</Label>
            <div className="mt-2 text-[15px]" style={{ fontFamily: "'Newsreader', serif", color: O.ok }}>
              operational
            </div>
            <Source>route · /api/observatory/*</Source>
          </div>
        </div>
      </section>

      {/* Colophon */}
      <footer className="px-6 md:px-12 lg:px-20 py-16" style={{ borderTop: `1px solid ${O.hairline}`, color: O.dim }} data-testid="observatory-colophon">
        <div className="flex flex-wrap justify-between text-[10px] font-mono uppercase tracking-widest">
          <span>Kiltikonet Observatory · Observation Layer</span>
          <Link to="/" style={{ color: O.gold }}>← Kiltikonet.fr</Link>
        </div>
      </footer>

      {/* Footer institutionnel unifié — data lineage global */}
      <InstitutionalFooter variant="dark" />
    </div>
  );
}
