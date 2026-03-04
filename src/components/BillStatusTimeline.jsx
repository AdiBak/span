import React from 'react';

const BillStatusTimeline = ({ stages, houseStages, senateStages }) => {
  const getStageStyles = (state) => {
    switch (state) {
      case 'completed':
      case 'current':
        return 'bg-primary text-white';
      case 'pending':
        return 'bg-light text-secondary';
      case 'dead':
        return 'bg-danger text-white';
      default:
        return 'bg-light text-secondary';
    }
  };

  const renderRow = (label, rowStages, showLabel = false) => (
    <div className={showLabel ? 'bill-status-timeline-chamber-row' : ''}>
      {showLabel && <div className="bill-status-timeline-row-label">{label}</div>}
      <div className="bill-status-timeline-row">
        {rowStages.map((stage, index) => (
          <div
            key={index}
            className={`bill-status-timeline-block ${getStageStyles(stage.state)}`}
          >
            <div className="bill-status-timeline-stage-name">{stage.label}</div>
            <div className="bill-status-timeline-stage-date">{stage.date || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (houseStages && senateStages && houseStages.length > 0 && senateStages.length > 0) {
    return (
      <div className="bill-status-timeline">
        {renderRow('House', houseStages, true)}
        {renderRow('Senate', senateStages, true)}
      </div>
    );
  }

  if (stages && stages.length > 0) {
    return (
      <div className="bill-status-timeline">
        {renderRow(null, stages, false)}
      </div>
    );
  }

  return null;
};

export default BillStatusTimeline;