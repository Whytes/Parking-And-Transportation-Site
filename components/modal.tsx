"use client";

export function Modal({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="page-head" style={{ marginBottom: "1.25rem" }}>
          <h3>{title}</h3>
          <button className="button-secondary" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
