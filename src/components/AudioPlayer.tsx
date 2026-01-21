"use client";

import { useState, useRef } from "react";

interface AudioPlayerProps {
  audioUrl?: string | null;
  ipa?: string | null;
  syllables?: string | null;
}

export default function AudioPlayer({
  audioUrl,
  ipa,
  syllables,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlay = async () => {
    if (!audioUrl || !audioRef.current) return;

    try {
      setError(false);
      if (isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Audio playback error:", err);
      setError(true);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const handleError = () => {
    setError(true);
    setIsPlaying(false);
  };

  return (
    <div className="flex items-center gap-4">
      {audioUrl && (
        <>
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={handleEnded}
            onError={handleError}
            preload="none"
          />
          <button
            type="button"
            onClick={handlePlay}
            disabled={error}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
              error
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                : isPlaying
                ? "bg-blue-600 text-white"
                : "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800"
            }`}
            aria-label={isPlaying ? "Заустави" : "Слушај изговор"}
            title={error ? "Аудио није доступан" : isPlaying ? "Заустави" : "Слушај изговор"}
          >
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
                />
              </svg>
            )}
          </button>
        </>
      )}

      {(ipa || syllables) && (
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          {ipa && (
            <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              /{ipa}/
            </span>
          )}
          {syllables && (
            <span className="text-sm">
              {syllables}
            </span>
          )}
        </div>
      )}

      {!audioUrl && !ipa && !syllables && (
        <span className="text-sm text-gray-400 dark:text-gray-500 italic">
          Изговор није доступан
        </span>
      )}
    </div>
  );
}
