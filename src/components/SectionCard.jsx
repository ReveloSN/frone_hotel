export default function SectionCard({ eyebrow, title, subtitle, children }) {
  return (
    <section className="section-card">
      <div className="section-card__header">
        {eyebrow ? <span className="eyebrow eyebrow--soft">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="section-card__body">{children}</div>
    </section>
  );
}
