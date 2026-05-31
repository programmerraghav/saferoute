import React from 'react';

export function PotholeCard({ complaint }) {
  const c = complaint || {};
  const severity = c.severity || 0;
  
  // Resolve colors and labels
  let sevColor = 'green';
  let sevLabel = 'LOW';
  if (severity >= 7) { sevColor = 'red'; sevLabel = 'HIGH'; }
  else if (severity >= 4) { sevColor = 'amber'; sevLabel = 'MEDIUM'; }
  
  const statusColors = {
    reported: 'red',
    in_progress: 'amber',
    resolved: 'green'
  };
  const statusColor = statusColors[c.status] || 'muted';
  const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'Unknown Date';

  return (
    <div className={`card card-${sevColor} flex-col gap-4`}>
      <div className="flex justify-between items-center">
        <span className="font-mono text-xs text-muted">#{c.complaint_id?.substring(0, 8) || '---'}</span>
        <span className={`badge badge-${statusColor}`} style={{textTransform: 'uppercase'}}>{c.status?.replace('_', ' ') || 'Unknown'}</span>
      </div>
      
      <div>
        <h3 className="heading-md" style={{marginBottom: 'var(--space-1)'}}>{c.road_name || 'Unknown Location'}</h3>
        <p className="text-sm text-secondary">{c.city || ''}</p>
      </div>

      <div className="grid-2">
        <div>
          <p className="text-xs text-muted mb-1">Severity</p>
          <div className="flex items-center gap-2">
            <span className={`badge badge-${sevColor}`}>{severity}/10</span>
            <span className="text-xs font-semibold">{sevLabel}</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Type</p>
          <p className="text-sm font-semibold">{c.pothole_type || 'Unknown'}</p>
        </div>
      </div>

      {c.description && (
        <div>
          <p className="text-xs text-muted mb-1">Description</p>
          <p className="text-sm line-clamp-2">{c.description}</p>
        </div>
      )}

      {c.image_url && (
        <div style={{
          width: '100%', height: '140px', 
          backgroundImage: `url(${c.image_url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          borderRadius: 'var(--radius)'
        }} />
      )}

      <div className="divider" style={{marginBlock: 'var(--space-2)'}} />
      
      <div className="flex justify-between items-center text-xs text-muted">
        <span className="flex items-center gap-1">📅 {dateStr}</span>
        {c.reported_by_name && <span>👤 {c.reported_by_name.split(' ')[0]}</span>}
      </div>
    </div>
  );
}

export default PotholeCard;
