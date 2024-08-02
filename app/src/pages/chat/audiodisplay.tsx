import { Mic } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';

const AudioDisplay = ({
     volume,
     recording,
     startRecording,
     stopRecording,
     threshold,
     onThresholdChange,
     audioOn,
     setAudioOn,
     autoRecord,
     setAutoRecord
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
      {audioOn && <>
        {autoRecord && 
        <div className={'audiodisplay-recording-container'}>
          <div className={recording ? "audiodisplay-recording on" : "audiodisplay-recording"}></div>
        </div>
        }
        {!autoRecord && 
        <Button 
          className={"audiodisplay-recording-button"}
          onClick={(e) => {
            if (!recording) {
              startRecording()
            } else {
              stopRecording();
            }
          }}
        >
          <div className={!recording ? "audiodisplay-recording on" : "audiodisplay-recording"}></div>
        </Button>}

        <div className="audiodisplay-gauge" ref={gaugeRef}>
          <div className={(volume * 100 > threshold) ? "audiodisplay-gauge-bar blue" : "audiodisplay-gauge-bar"} style={{ width: `${volume * 100}%` }}></div>
          {autoRecord && <div
            className="audiodisplay-gauge-cursor"
            style={{ left: `${threshold}%` }}
            onMouseDown={handleMouseDown}
          ></div>}
        </div>
        <Button
            className={'audiodisplay-autobutton'}
            onClick={(e) => {
              console.log(autoRecord);
              setAutoRecord(!autoRecord);
            }}
          >{!autoRecord ? 'Manual' : 'Auto'}</Button> 
      </>}
      <div className="audiodisplay-micbutton-container">
        <Button
            className={'bg-emerald-500 hover:bg-emerald-700 on'}
            onClick={(e) => {
              setAudioOn(!audioOn);
            }}
          ><Mic></Mic></Button> 
        </div>
    </div>
  );
};

export default AudioDisplay;