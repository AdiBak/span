import React, { useRef, useState, useEffect, useCallback } from 'react';

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

  const TimelineRowWithScrollbar = ({ label, rowStages, showLabel }) => {
    const scrollRef = useRef(null);
    const trackRef = useRef(null);
    const [thumbStyle, setThumbStyle] = useState({ width: '100%', left: 0 });
    const [showScrollbar, setShowScrollbar] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, scrollLeft: 0 });

    const updateThumb = useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const canScroll = scrollWidth > clientWidth;
      setShowScrollbar(canScroll);
      if (!canScroll) {
        setThumbStyle({ width: '100%', left: 0 });
        return;
      }
      const trackWidth = trackRef.current ? trackRef.current.clientWidth : clientWidth;
      const thumbWidth = Math.max(40, (clientWidth / scrollWidth) * trackWidth);
      const maxLeft = trackWidth - thumbWidth;
      const left = maxLeft <= 0 ? 0 : (scrollLeft / (scrollWidth - clientWidth)) * maxLeft;
      setThumbStyle({ width: `${thumbWidth}px`, left: `${left}px` });
    }, []);

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      updateThumb();
      const ro = new ResizeObserver(updateThumb);
      ro.observe(el);
      el.addEventListener('scroll', updateThumb);
      return () => {
        ro.disconnect();
        el.removeEventListener('scroll', updateThumb);
      };
    }, [updateThumb, rowStages]);

    useEffect(() => {
      if (showScrollbar && trackRef.current) updateThumb();
    }, [showScrollbar, updateThumb]);

    const onTrackClick = (e) => {
      if (e.target.closest('.bill-status-timeline-custom-scrollbar-thumb')) return;
      const track = trackRef.current;
      const el = scrollRef.current;
      if (!track || !el || !showScrollbar) return;
      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const thumbWidth = parseFloat(thumbStyle.width);
      const trackWidth = track.clientWidth;
      const maxLeft = trackWidth - thumbWidth;
      if (maxLeft <= 0) return;
      const frac = x / trackWidth;
      el.scrollLeft = frac * (el.scrollWidth - el.clientWidth);
    };

    const onThumbMouseDown = (e) => {
      e.preventDefault();
      if (!scrollRef.current) return;
      setIsDragging(true);
      dragStart.current = { x: e.clientX, scrollLeft: scrollRef.current.scrollLeft };
    };

    useEffect(() => {
      if (!isDragging) return;
      const onMove = (e) => {
        const el = scrollRef.current;
        const track = trackRef.current;
        if (!el || !track) return;
        const delta = e.clientX - dragStart.current.x;
        const trackWidth = track.clientWidth;
        const thumbWidth = parseFloat(thumbStyle.width);
        const maxLeft = trackWidth - thumbWidth;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 0 || maxLeft <= 0) return;
        const ratio = maxScroll / maxLeft;
        el.scrollLeft = dragStart.current.scrollLeft + delta * ratio;
      };
      const onUp = () => setIsDragging(false);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
    }, [isDragging, thumbStyle.width]);

    return (
      <div className={showLabel ? 'bill-status-timeline-chamber-row' : ''}>
        {showLabel && <div className="bill-status-timeline-row-label">{label}</div>}
        <div className="bill-status-timeline-row-scroll-wrapper" ref={scrollRef}>
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
        <div
          ref={trackRef}
          role="scrollbar"
          aria-hidden="true"
          className="bill-status-timeline-custom-scrollbar"
          style={{ display: showScrollbar ? 'block' : 'none' }}
          onMouseDown={onTrackClick}
        >
          <div
            className="bill-status-timeline-custom-scrollbar-thumb"
            style={{ width: thumbStyle.width, left: thumbStyle.left }}
            onMouseDown={onThumbMouseDown}
          />
        </div>
      </div>
    );
  };

  const renderRow = (label, rowStages, showLabel = false) => (
    <TimelineRowWithScrollbar label={label} rowStages={rowStages} showLabel={showLabel} />
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
