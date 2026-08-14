import React from 'react';
import { Link } from 'react-router-dom';

/**
 * KILTIKONET — Institutional atoms
 * Design system centralisé. Aucun autre composant ne doit
 * dupliquer ces primitives. Toutes les couleurs viennent des
 * tokens CSS (--kk-*).
 */

// Palette accessible en JS pour styles inline
export const K = {
  paper: 'var(--kk-paper)',
  ivory: 'var(--kk-ivory)',
  ink: 'var(--kk-ink)',
  ash: 'var(--kk-ash)',
  panel: 'var(--kk-panel)',
  bone: 'var(--kk-bone)',
  dust: 'var(--kk-dust)',
  mist: 'var(--kk-mist)',
  gold: 'var(--kk-gold)',
  rust: 'var(--kk-rust)',
  data: 'var(--kk-data)',
  ruleLight: 'var(--kk-rule-light)',
  ruleDark: 'var(--kk-rule-dark)',
  serif: 'var(--kk-serif)',
  sans: 'var(--kk-sans)',
  mono: 'var(--kk-mono)',
};

/** Trait horizontal fin, style archive/catalogue */
export const Rule = ({ dark = false, className = '' }) => (
  <div
    className={`w-full h-px ${className}`}
    style={{ background: dark ? K.ruleDark : K.ruleLight }}
  />
);

/** Bandeau documentaire de tête (index / date / coord) */
export const ArchiveBar = ({ left, center, right, dark = false }) => (
  <div
    className="px-6 md:px-12 lg:px-20 pt-24 md:pt-28 pb-6 flex flex-wrap justify-between items-baseline gap-4 text-[10px] md:text-xs font-mono uppercase tracking-[0.22em]"
    style={{ color: dark ? K.mist : K.dust }}
    data-testid="archive-bar"
  >
    <span>{left}</span>
    {center && <span>{center}</span>}
    <span>{right}</span>
  </div>
);

/** Numérotation de section (01 —— IDENTITÉ) */
export const SectionIndex = ({ n, label, tone = 'dark' }) => (
  <div
    className="flex items-baseline gap-4 mb-8 md:mb-12"
    style={{ color: tone === 'dark' ? K.ink : K.paper }}
    data-testid={`section-index-${n}`}
  >
    <span className="text-xs font-mono tracking-[0.2em]" style={{ opacity: 0.5 }}>
      {n} ——
    </span>
    <span className="text-xs uppercase tracking-[0.25em] font-medium" style={{ opacity: 0.7 }}>
      {label}
    </span>
  </div>
);

/** Small label (accroche typographique institutionnelle) */
export const Label = ({ n, children, tone = 'dark' }) => (
  <div
    className="text-[10px] font-mono uppercase tracking-[0.22em]"
    style={{ color: tone === 'dark' ? K.dust : K.mist }}
  >
    {n && <span style={{ color: K.gold, opacity: 0.85, marginRight: 8 }}>{n} ——</span>}
    {children}
  </div>
);

/** Data lineage — la signature institutionnelle */
export const Source = ({ children, tone = 'dark' }) => (
  <div
    className="text-[10px] font-mono lowercase tracking-wider mt-1"
    style={{ color: tone === 'dark' ? K.dust : K.mist, opacity: 0.65 }}
    data-testid="data-lineage"
  >
    src · {children}
  </div>
);

/** Cellule métrique institutionnelle (chiffre + label + source) */
export const Metric = ({ label, value, source, testId, breakdown, tone = 'dark' }) => {
  const displayValue =
    value === null || value === undefined || value === ''
      ? '—'
      : typeof value === 'number'
      ? Number(value).toLocaleString('fr-FR')
      : value;

  const isEmpty = displayValue === '—';
  const textColor = tone === 'dark' ? K.ink : K.paper;
  const emptyColor = tone === 'dark' ? K.dust : K.mist;

  return (
    <div
      className="py-6 md:py-8"
      style={{ borderTop: `1px solid ${tone === 'dark' ? K.ruleLight : K.ruleDark}` }}
      data-testid={testId}
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.22em]" style={{ color: emptyColor }}>
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-4 flex-wrap">
        <div
          style={{
            fontFamily: K.serif,
            fontSize: 'clamp(2.4rem, 4.5vw, 4rem)',
            lineHeight: 1,
            color: isEmpty ? emptyColor : textColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {displayValue}
        </div>
        {breakdown && (
          <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: emptyColor }}>
            {breakdown}
          </div>
        )}
      </div>
      {source && <Source tone={tone}>{source}</Source>}
    </div>
  );
};

/** Ligne d'index éditoriale (col-span-12 grid, numérotée) */
export const IndexRow = ({ id, label, name, description, tone = 'dark', testId }) => (
  <div
    className="grid grid-cols-12 gap-4 py-8 md:py-10"
    style={{ borderTop: `1px solid ${tone === 'dark' ? K.ruleLight : K.ruleDark}` }}
    data-testid={testId}
  >
    <div className="col-span-2 md:col-span-1">
      <span className="text-xs font-mono tracking-widest" style={{ color: tone === 'dark' ? K.dust : K.mist }}>
        {id}
      </span>
    </div>
    <div className="col-span-10 md:col-span-3">
      {label && (
        <div className="text-xs uppercase tracking-widest font-mono mb-1" style={{ color: K.rust }}>
          {label}
        </div>
      )}
      <div
        style={{
          fontFamily: K.serif,
          fontSize: '1.5rem',
          lineHeight: 1.1,
          color: tone === 'dark' ? K.ink : K.paper,
        }}
      >
        {name}
      </div>
    </div>
    <div className="col-span-12 md:col-span-8 md:pl-8">
      {typeof description === 'string' ? (
        <p style={{ color: tone === 'dark' ? K.bone : K.mist, fontSize: '15px', lineHeight: 1.65 }}>
          {description}
        </p>
      ) : (
        description
      )}
    </div>
  </div>
);

/** Lien éditorial (souligné, sans fioriture SaaS) */
export const EditorialLink = ({ to, children, tone = 'dark', testId, external = false }) => {
  const style = {
    color: tone === 'dark' ? K.ink : K.paper,
    borderBottom: `1px solid ${tone === 'dark' ? K.ink : K.paper}`,
  };
  const inner = (
    <>
      {children}
      <span style={{ fontFamily: 'monospace', fontSize: 11 }}>→</span>
    </>
  );
  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 text-sm font-medium"
        style={style}
        data-testid={testId}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-3 text-sm font-medium"
      style={style}
      data-testid={testId}
    >
      {inner}
    </Link>
  );
};

/** Bloc titre monumental (H1 institutionnel) */
export const MonumentalHeading = ({ children, italic, tone = 'dark', as = 'h1', maxWidth = '18ch' }) => {
  const Tag = as;
  const color = tone === 'dark' ? K.ink : K.paper;
  const italicColor = tone === 'dark' ? K.bone : '#B8B0A0';
  return (
    <Tag
      style={{
        fontFamily: K.serif,
        fontWeight: 400,
        fontSize: 'clamp(2.6rem, 6.5vw, 6rem)',
        lineHeight: 0.94,
        letterSpacing: '-0.035em',
        color,
        maxWidth,
      }}
    >
      {children}
      {italic && (
        <>
          <br />
          <span style={{ fontStyle: 'italic', color: italicColor }}>{italic}</span>
        </>
      )}
    </Tag>
  );
};

/** Meta line (dates, coord — style catalogue) */
export const MetaLine = ({ items, tone = 'dark' }) => (
  <div
    className="flex flex-wrap gap-x-8 gap-y-2 text-xs font-mono tracking-wider"
    style={{ color: tone === 'dark' ? K.dust : K.mist, opacity: 0.85 }}
  >
    {items.map((it, i) => (
      <span key={i} className="uppercase" data-testid={`meta-${i}`}>
        {it.label} <span style={{ color: tone === 'dark' ? K.ink : K.paper }}>{it.value}</span>
      </span>
    ))}
  </div>
);
