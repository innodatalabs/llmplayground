import React, { useRef } from 'react';

const AudioDisplay = ({
     volume,
     recording,
     threshold,
     listening,
     onListeningChange,
     onThresholdChange 
  }) => {

  const gaugeRef = useRef(null);

  const handleMouseMove = (e) => {
    if (gaugeRef.current) {
      const gaugeRect = gaugeRef.current.getBoundingClientRect();
      const newThreshold = ((e.clientX - gaugeRect.left) / gaugeRect.width) * 100;
      onThresholdChange(Math.min(Math.max(newThreshold, 0), 100));
    }
  };

  const handleMouseDown = (e) => {
    handleMouseMove(e);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="audiodisplay-container">
      <div className={recording ? "audiodisplay-recording on" : "audiodisplay-recording"}></div>
      <div className="audiodisplay-gauge" ref={gaugeRef}>
        <div className={(volume * 100 > threshold) ? "audiodisplay-gauge-bar blue" : "audiodisplay-gauge-bar"} style={{ width: `${volume * 100}%` }}></div>
        <div
          className="audiodisplay-gauge-cursor"
          style={{ left: `${threshold}%` }}
          onMouseDown={handleMouseDown}
        ></div>
      </div>
    </div>
  );
};

export default AudioDisplay;