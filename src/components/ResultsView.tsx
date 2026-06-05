import { AlertCircle } from 'lucide-react';
import { AnalysisResponse } from '../types';
import { EmptySection } from './EmptySection';

interface ResultsViewProps {
  result: AnalysisResponse;
}

export function ResultsView({ result }: ResultsViewProps) {
  if (!result.summary) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-amber-light border border-amber/20 rounded-xl text-amber-text text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">The model returned a partial response.</p>
            <p className="mt-1">Some sections may be missing. Try analyzing again with chunked mode or a different model with a larger context window.</p>
          </div>
        </div>
        {result.paper_title && (
          <header>
            <h1 className="font-serif font-medium text-ink leading-tight tracking-tight max-w-[70ch]" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', textWrap: 'balance' }}>
              {result.paper_title}
            </h1>
          </header>
        )}
        {result.layman_explanation && (
          <section>
            <h2 className="text-xs font-semibold text-steel tracking-[0.06em] uppercase mb-3">In Plain Language</h2>
            <p className="text-ink text-lg leading-[1.7] font-medium" style={{ textWrap: 'pretty' }}>{result.layman_explanation}</p>
          </section>
        )}
        {result.key_concepts && result.key_concepts.length > 0 && (
          <section>
            <h2 className="font-serif text-xl font-medium text-ink mb-5">Key Concepts</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.key_concepts.map((concept, idx) => (
                <div key={idx} className="bg-fog rounded-lg p-4">
                  <dt className="text-sm font-semibold text-ink mb-1.5">{concept.term}</dt>
                  <dd className="text-base text-ink leading-[1.65]">{concept.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    );
  }

  return (
    <article className="flex flex-col divide-y divide-border max-w-[1000px]">

      {/* Paper Title */}
      <header className="pb-8">
        <h1
          className="font-serif font-medium text-ink leading-tight tracking-tight max-w-[70ch]"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', textWrap: 'balance' }}
        >
          {result.paper_title || 'Untitled Paper'}
        </h1>
      </header>

      {/* Layman Explanation */}
      <section className="py-8">
        <h2 className="text-xs font-semibold text-steel tracking-[0.06em] uppercase mb-3">
          In Plain Language
        </h2>
        <p className="text-ink text-lg leading-[1.7] font-medium" style={{ textWrap: 'pretty' }}>
          {result.layman_explanation}
        </p>
      </section>

      {/* Abstract + Methodology */}
      <section className="py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
          <div>
            <h2 className="font-serif text-xl font-medium text-ink mb-3" style={{ textWrap: 'balance' }}>Abstract Overview</h2>
            <p className="text-base text-ink leading-[1.7]" style={{ textWrap: 'pretty' }}>
              {result.summary.abstract}
            </p>
          </div>
          <div>
            <h2 className="font-serif text-xl font-medium text-ink mb-3" style={{ textWrap: 'balance' }}>Methodology</h2>
            <p className="text-base text-ink leading-[1.7]" style={{ textWrap: 'pretty' }}>
              {result.summary.methodology}
            </p>
          </div>
        </div>
      </section>

      {/* Contributions + Limitations */}
      <section className="py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
          <div>
            <h2 className="font-serif text-xl font-medium text-ink mb-4" style={{ textWrap: 'balance' }}>Contributions</h2>
            <ul className="space-y-3">
              {result.summary.contributions.map((item, i) => (
                <li key={i} className="text-base text-ink leading-[1.7] flex gap-3">
                  <span className="mt-[11px] shrink-0 w-1.5 h-1.5 rounded-full bg-steel" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-serif text-xl font-medium text-ink mb-4" style={{ textWrap: 'balance' }}>Limitations</h2>
            <ul className="space-y-3">
              {result.summary.limitations.map((item, i) => (
                <li key={i} className="text-base text-ink leading-[1.7] flex gap-3">
                  <span className="mt-[11px] shrink-0 w-1.5 h-1.5 rounded-full bg-amber" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Evidence-Backed Findings */}
      <section className="py-8">
        <h2 className="font-serif text-xl font-medium text-ink mb-5" style={{ textWrap: 'balance' }}>Evidence-Backed Findings</h2>
        {result.evidence_backed_findings.length === 0 ? (
          <EmptySection label="evidence-backed findings" />
        ) : (
          <div className="space-y-6">
            {result.evidence_backed_findings.map((finding, idx) => (
              <div key={idx} className="flex flex-col gap-2.5">
                <p className="text-base font-semibold text-ink leading-[1.5]">
                  {finding.claim}
                </p>
                <blockquote className="bg-fog rounded-lg py-3.5 px-4 text-base text-muted italic leading-[1.65]">
                  &ldquo;{finding.source_excerpt}&rdquo;
                </blockquote>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Key Concepts */}
      <section className="py-8">
        <h2 className="font-serif text-xl font-medium text-ink mb-5" style={{ textWrap: 'balance' }}>Key Concepts</h2>
        {result.key_concepts.length === 0 ? (
          <EmptySection label="key concepts" />
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.key_concepts.map((concept, idx) => (
              <div key={idx} className="bg-fog rounded-lg p-4">
                <dt className="text-sm font-semibold text-ink mb-1.5">{concept.term}</dt>
                <dd className="text-base text-ink leading-[1.65]">{concept.definition}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Research Questions */}
      {result.research_questions && result.research_questions.length > 0 && (
        <section className="py-8">
          <h2 className="font-serif text-xl font-medium text-ink mb-4" style={{ textWrap: 'balance' }}>Research Questions</h2>
          <ol className="space-y-3 list-none">
            {result.research_questions.map((q, i) => (
              <li key={i} className="text-base text-ink leading-[1.7] flex gap-3">
                <span className="text-muted font-semibold shrink-0 tabular-nums mt-[1px]">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Datasets Used */}
      {result.datasets_used && result.datasets_used.length > 0 && (
        <section className="py-8">
          <h2 className="font-serif text-xl font-medium text-ink mb-4" style={{ textWrap: 'balance' }}>Datasets Used</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.datasets_used.map((ds, i) => (
              <div key={i} className="bg-fog rounded-lg p-4">
                <div className="text-sm font-semibold text-ink mb-1.5">{ds.name}</div>
                <div className="text-base text-ink leading-[1.65]">{ds.description}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Work */}
      {result.related_work && result.related_work.length > 0 && (
        <section className="py-8">
          <h2 className="font-serif text-xl font-medium text-ink mb-4" style={{ textWrap: 'balance' }}>Related Work</h2>
          <ul className="space-y-3">
            {result.related_work.map((item, i) => (
              <li key={i} className="text-base text-ink leading-[1.7] flex gap-3">
                <span className="mt-[11px] shrink-0 w-1.5 h-1.5 rounded-full bg-steel" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Comparison with Prior Work */}
      {result.comparison_with_prior_work && result.comparison_with_prior_work.length > 0 && (
        <section className="py-8">
          <h2 className="font-serif text-xl font-medium text-ink mb-5" style={{ textWrap: 'balance' }}>Comparison with Prior Work</h2>
          <div className="space-y-3">
            {result.comparison_with_prior_work.map((cmp, i) => (
              <div key={i} className="bg-fog rounded-lg p-4 flex gap-6 items-start">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-muted tracking-[0.04em] uppercase mb-1.5">Baseline</div>
                  <div className="text-base text-ink leading-[1.65]">{cmp.baseline}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-muted tracking-[0.04em] uppercase mb-1.5">Result</div>
                  <div className="text-base text-ink leading-[1.65]">{cmp.result}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Practical Applications */}
      {result.practical_applications && result.practical_applications.length > 0 && (
        <section className="py-8">
          <h2 className="font-serif text-xl font-medium text-ink mb-4" style={{ textWrap: 'balance' }}>Practical Applications</h2>
          <ul className="space-y-3">
            {result.practical_applications.map((item, i) => (
              <li key={i} className="text-base text-ink leading-[1.7] flex gap-3">
                <span className="mt-[11px] shrink-0 w-1.5 h-1.5 rounded-full bg-amber" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Future Work */}
      {result.future_work && result.future_work.length > 0 && (
        <section className="py-8">
          <h2 className="font-serif text-xl font-medium text-ink mb-4" style={{ textWrap: 'balance' }}>Future Work</h2>
          <ul className="space-y-3">
            {result.future_work.map((item, i) => (
              <li key={i} className="text-base text-ink leading-[1.7] flex gap-3">
                <span className="mt-[11px] shrink-0 w-1.5 h-1.5 rounded-full bg-steel" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
