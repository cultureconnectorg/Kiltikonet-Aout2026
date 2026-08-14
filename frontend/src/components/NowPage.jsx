import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SEO from './SEO';
import { K, Rule, ArchiveBar, SectionIndex, Metric, Source, Label } from './kilti/atoms';
import InstitutionalFooter from './kilti/InstitutionalFooter';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * /now — Fenêtre publique éditoriale sur ce qui vit
 * dans l'infrastructure Kiltikonet. Ni dashboard, ni marketing.
 * Uniquement des données réelles agrégées, sans PII, avec data lineage.
 */
export default function NowPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/api/observatory/public/now`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.message || 'unavailable'))
      .finally(() => setLoaded(true));
  }, []);

  const dm = data?.digital_memory;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8);
  const year = now.getFullYear();

  return (
    <div
      className="min-h-screen"
      style={{ background: K.ink, color: K.paper, fontFamily: K.sans }}
      data-testid="now-page"
    >
      <SEO
        title="Maintenant — Fenêtre publique sur le réseau"
        description="Kiltikonet maintenant : une fenêtre publique sobre sur l'activité réelle de l'infrastructure. Aucune donnée personnelle. Data lineage visible sur chaque métrique."
        path="/now"
      />

      {/* Bandeau documentaire sombre */}
      <div
        className="px-6 md:px-12 lg:px-20 pt-24 md:pt-28 pb-6 flex flex-wrap justify-between items-baseline gap-4 text-[10px] md:text-xs font-mono uppercase tracking-[0.22em]"
        style={{ color: 'var(--kk-mist)' }}
        data-testid="archive-bar"
      >
        <span>Kiltikonet / Now / {year}</span>
        <span>Live · public aggregate · no PII</span>
        <span>{dateStr} · {timeStr} UTC</span>
      </div>

      <div className="px-6 md:px-12 lg:px-20"><Rule dark /></div>

      {/* HERO */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 md:pt-28 pb-16 md:pb-24" data-testid="now-hero">
        <Label n="01" tone="light">
          Digital Memory · Aggregate
        </Label>
        <h1
          className="mt-8 mb-12 max-w-5xl"
          style={{
            fontFamily: K.serif,
            fontWeight: 400,
            fontSize: 'clamp(3rem, 7vw, 7rem)',
            lineHeight: 0.94,
            letterSpacing: '-0.035em',
            color: K.paper,
          }}
          data-testid="now-title"
        >
          Kiltikonet <br />
          <span style={{ fontStyle: 'italic', color: 'var(--kk-mist)' }}>maintenant.</span>
        </h1>
        <p className="max-w-2xl" style={{ color: 'var(--kk-mist)', lineHeight: 1.7, fontSize: '15px' }}>
          Une fenêtre publique sobre. Chaque chiffre ci-dessous provient d'une source
          réelle, la déclare explicitement, et ne mesure rien qui puisse identifier une
          personne. Ni dashboard, ni promesse — un simple relevé.
        </p>
      </section>

      {/* METRICS */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24" data-testid="now-metrics">
        {!loaded ? (
          <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'var(--kk-mist)' }}>
            reading db…
          </div>
        ) : error ? (
          <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'var(--kk-mist)' }}>
            unavailable · service temporarily unreachable
          </div>
        ) : dm ? (
          <div className="grid md:grid-cols-2 gap-x-12">
            <Metric
              label="Traces enregistrées"
              value={dm.recorded_events}
              source="db.analytics_events (canonical)"
              tone="light"
              testId="now-metric-events"
            />
            <Metric
              label="Inscriptions"
              value={dm.registrations}
              source="db.registrations"
              tone="light"
              testId="now-metric-registrations"
            />
            <Metric
              label="Activité workspace"
              value={dm.workspace_activity}
              source="db.workspace_logs"
              tone="light"
              testId="now-metric-workspace"
            />
            <Metric
              label="Identités actives"
              value={dm.cultural_identities_active}
              source="db.registrations (distinct)"
              tone="light"
              testId="now-metric-identities"
            />
          </div>
        ) : (
          <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'var(--kk-mist)' }}>
            no aggregate data available yet
          </div>
        )}

        <div className="mt-16">
          <Source tone="light">
            observatory/public/now · aggregated · no personal data exposed
          </Source>
        </div>
      </section>

      {/* PRINCIPE */}
      <section className="px-6 md:px-12 lg:px-20 py-16 md:py-24" data-testid="now-principle">
        <SectionIndex n="02" label="Principe" tone="light" />
        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-6">
            <h2
              style={{
                fontFamily: K.serif,
                fontWeight: 400,
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                color: K.paper,
              }}
            >
              Chaque chiffre <br />
              <span style={{ fontStyle: 'italic', color: 'var(--kk-mist)' }}>
                indique sa source.
              </span>
            </h2>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <p style={{ color: 'var(--kk-mist)', lineHeight: 1.75, fontSize: '15px' }}>
              Kiltikonet ne fabrique pas de statistique marketing. Si une donnée n'est pas
              vérifiée, elle apparaît comme « — ». Si elle est disponible, elle apparaît
              avec sa source exacte (nom de collection, endpoint).
            </p>
            <p className="mt-6" style={{ color: 'var(--kk-mist)', lineHeight: 1.75, fontSize: '15px' }}>
              L'agrégation publique ne divulgue jamais l'identité d'un acteur, d'une session
              ou d'un visiteur. Elle relève simplement ce que l'infrastructure a enregistré.
            </p>
          </div>
        </div>
      </section>

      <InstitutionalFooter variant="dark" />
    </div>
  );
}
