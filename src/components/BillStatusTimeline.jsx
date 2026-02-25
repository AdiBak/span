import React from 'react';

const BillStatusTimeline = ({ stages }) => {
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

  return (
    <div className="d-flex flex-row w-100 overflow-auto my-2" style={{ borderRadius: '4px' }}>
      {stages.map((stage, index) => (
        <div 
          key={index} 
          className={`flex-fill text-center p-1 border-end border-white ${getStageStyles(stage.state)}`}
          style={{ minWidth: '85px' }} 
        >
          <div className="fw-bold" style={{ fontSize: '0.65rem', lineHeight: '1.1', whiteSpace: 'nowrap' }}>
            {stage.label}
          </div>
          <div style={{ fontSize: '0.6rem', marginTop: '2px', whiteSpace: 'nowrap' }}>
            {stage.date ? stage.date : '—'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BillStatusTimeline;