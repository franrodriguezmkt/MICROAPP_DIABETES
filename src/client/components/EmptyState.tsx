type EmptyStateProps = {
  title: string;
  description: string;
  headingId?: string;
};

export function EmptyState({
  title,
  description,
  headingId,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__illustration" aria-hidden="true">
        <span />
      </div>
      <h2 id={headingId}>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
