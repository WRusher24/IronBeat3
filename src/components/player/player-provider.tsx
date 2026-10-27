"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { apiFetch } from "@/lib/client-api";
import { isTrackLike, shuffleTracks } from "@/lib/tracks";
import type { Track } from "@/types";

export type RepeatMode = "off" | "all" | "one";

const PLAYER_STORAGE_KEY = "ironbeat:player:v1";
const SOURCE_CACHE_MS = 10 * 60_000;
const PERSIST_INTERVAL_MS = 6_000;
const SILENCE_SRC = "/silence.wav";

type AudioSourcesResponse = {
  videoId: string;
  sources: Array<{
    url: string;
    mimeType: string;
    kind: string;
  }>;
};

type SourceCacheEntry = {
  urls: string[];
  expiresAt: number;
};

type PlayQueueOptions = {
  shuffle?: boolean;
};

export type PlayerContextValue = {
  queue: Track[];
  current: Track | null;
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  isBlocked: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  repeat: RepeatMode;
  shuffle: boolean;
  isExpanded: boolean;
  playQueue: (
    tracks: Track[],
    startIndex?: number,
    options?: PlayQueueOptions,
  ) => void;
  playTrack: (track: Track) => void;
  playAt: (index: number) => void;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setRepeat: (mode: RepeatMode) => void;
  setShuffle: (enabled: boolean) => void;
  toggleShuffle: () => void;
  enqueue: (tracks: Track[] | Track) => void;
  removeFromQueue: (index: number) => void;
  clear: () => void;
  setExpanded: (expanded: boolean) => void;
  isCurrentTrack: (videoId: string) => boolean;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

function isRepeatMode(value: unknown): value is RepeatMode {
  return value === "off" || value === "all" || value === "one";
}

function readPersistedPlayer(): {
  queue: Track[];
  index: number;
  position: number;
  repeat: RepeatMode;
  shuffle: boolean;
} | null {
  try {
    const raw = window.localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const queue = Array.isArray(parsed.queue)
      ? parsed.queue.filter(isTrackLike).slice(0, 100)
      : [];

    if (queue.length === 0) {
      return null;
    }

    const rawIndex = Number(parsed.index ?? 0);
    const index = Number.isFinite(rawIndex)
      ? Math.min(Math.max(0, Math.floor(rawIndex)), queue.length - 1)
      : 0;

    const rawPosition = Number(parsed.position ?? 0);
    const position =
      Number.isFinite(rawPosition) && rawPosition > 0 ? rawPosition : 0;

    return {
      queue,
      index,
      position,
      repeat: isRepeatMode(parsed.repeat) ? parsed.repeat : "off",
      shuffle: Boolean(parsed.shuffle),
    };
  } catch {
    return null;
  }
}

function artworkFor(track: Track) {
  return [
    {
      src: `https://i.ytimg.com/vi/${track.videoId}/mqdefault.jpg`,
      sizes: "320x180",
      type: "image/jpeg",
    },
    {
      src: `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`,
      sizes: "480x360",
      type: "image/jpeg",
    },
    {
      src: `https://i.ytimg.com/vi/${track.videoId}/maxresdefault.jpg`,
      sizes: "1280x720",
      type: "image/jpeg",
    },
  ];
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [queue, setQueue] = useState<Track[]>([]);
  const queueRef = useRef<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const indexRef = useRef(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const playingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const blockedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const timeRef = useRef(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeatState] = useState<RepeatMode>("off");
  const repeatRef = useRef<RepeatMode>("off");
  const [shuffle, setShuffleState] = useState(false);
  const shuffleRef = useRef(false);
  const [isExpanded, setExpanded] = useState(false);

  const sourceUrlsRef = useRef<string[]>([]);
  const sourceIndexRef = useRef(0);
  const sourceCacheRef = useRef<Map<string, SourceCacheEntry>>(new Map());
  const loadTokenRef = useRef(0);
  const pendingSeekRef = useRef(0);
  const retriedProviderRef = useRef(false);
  const desiredPlayRef = useRef(false);
  const failedIdsRef = useRef<Set<string>>(new Set());
  const recordedRef = useRef<Set<string>>(new Set());
  const lastPositionUpdateRef = useRef(0);

  const applyQueue = useCallback((next: Track[]) => {
    queueRef.current = next;
    setQueue(next);
  }, []);

  const applyIndex = useCallback((next: number) => {
    indexRef.current = next;
    setCurrentIndex(next);
  }, []);

  const applyPlaying = useCallback((next: boolean) => {
    playingRef.current = next;
    setIsPlaying(next);
  }, []);

  const applyRepeat = useCallback((next: RepeatMode) => {
    repeatRef.current = next;
    setRepeatState(next);
  }, []);

  const applyShuffle = useCallback((next: boolean) => {
    shuffleRef.current = next;
    setShuffleState(next);
  }, []);

  const updateSessionMetadata = useCallback((track: Track) => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    if (typeof MediaMetadata === "undefined") {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: "IronBeat",
        artwork: artworkFor(track),
      });
    } catch {
      // Media Session metadata is a progressive enhancement.
    }
  }, []);

  const updatePositionState = useCallback(() => {
    const audio = audioRef.current;
    if (
      !audio ||
      typeof navigator === "undefined" ||
      !("mediaSession" in navigator) ||
      typeof navigator.mediaSession.setPositionState !== "function"
    ) {
      return;
    }

    const total =
      Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;

    if (!total) {
      return;
    }

    try {
      navigator.mediaSession.setPositionState({
        duration: total,
        position: Math.min(Math.max(0, audio.currentTime), total),
        playbackRate:
          Number.isFinite(audio.playbackRate) && audio.playbackRate > 0
            ? audio.playbackRate
            : 1,
      });
    } catch {
      // Some Safari versions throw for zero-duration media.
    }
  }, []);

  const recordPlay = useCallback((track: Track) => {
    if (recordedRef.current.has(track.videoId)) {
      return;
    }

    recordedRef.current.add(track.videoId);
    void apiFetch("/api/plays", {
      method: "POST",
      body: JSON.stringify({ track }),
      keepalive: true,
    }).catch(() => {
      // Play analytics must never block playback.
    });
  }, []);

  const fetchSources = useCallback(
    async (track: Track, refresh: boolean): Promise<string[]> => {
      const cached = sourceCacheRef.current.get(track.videoId);
      if (!refresh && cached && cached.expiresAt > Date.now()) {
        return cached.urls;
      }

      const payload = await apiFetch<AudioSourcesResponse>(
        `/api/audio/${track.videoId}${refresh ? "?refresh=1" : ""}`,
      );

      const urls = payload.sources
        .map((source) => source.url)
        .filter((url) => typeof url === "string" && /^https?:\/\//i.test(url));

      if (urls.length === 0) {
        throw new Error("No audio sources returned for this track.");
      }

      sourceCacheRef.current.set(track.videoId, {
        urls,
        expiresAt: Date.now() + SOURCE_CACHE_MS,
      });

      return urls;
    },
    [],
  );

  const attemptPlay = useCallback(async (token: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    desiredPlayRef.current = true;

    try {
      await audio.play();
      if (token !== loadTokenRef.current) {
        return;
      }
      blockedRef.current = false;
      setIsBlocked(false);
    } catch (playError) {
      if (token !== loadTokenRef.current) {
        return;
      }

      setIsLoading(false);
      const name = playError instanceof DOMException ? playError.name : "";

      if (name === "NotAllowedError") {
        blockedRef.current = true;
        setIsBlocked(true);
        setError(null);
      } else if (name !== "AbortError") {
        setError("Playback was interrupted. Tap play to retry.");
      }
    }
  }, []);

  const applySource = useCallback(
    (
      url: string,
      position: number,
      autoplay: boolean,
      token: number,
    ) => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      pendingSeekRef.current = Math.max(0, position);
      timeRef.current = Math.max(0, position);
      setCurrentTime(Math.max(0, position));
      audio.src = url;
      audio.load();

      if (autoplay) {
        void attemptPlay(token);
      }
    },
    [attemptPlay],
  );

  const startTrack = useCallback(
    async (track: Track, autoplay: boolean, position = 0) => {
      const token = ++loadTokenRef.current;
      desiredPlayRef.current = autoplay;
      retriedProviderRef.current = false;
      setIsLoading(true);
      setError(null);
      setIsBlocked(false);
      blockedRef.current = false;
      applyPlaying(false);
      setDuration(track.duration > 0 ? track.duration : 0);
      pendingSeekRef.current = Math.max(0, position);
      timeRef.current = Math.max(0, position);
      setCurrentTime(Math.max(0, position));
      updateSessionMetadata(track);

      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      sourceUrlsRef.current = [];
      sourceIndexRef.current = 0;

      try {
        const urls = await fetchSources(track, false);
        if (token !== loadTokenRef.current) {
          return;
        }

        sourceUrlsRef.current = urls;
        sourceIndexRef.current = 0;
        applySource(urls[0]!, position, autoplay, token);
      } catch {
        if (token !== loadTokenRef.current) {
          return;
        }

        setIsLoading(false);
        setError("Couldn't load this track. Try another one.");
      }
    },
    [applyPlaying, applySource, fetchSources, updateSessionMetadata],
  );

  const setActiveIndex = useCallback(
    (nextIndex: number, autoplay: boolean, position = 0) => {
      const track = queueRef.current[nextIndex];
      if (!track) {
        return;
      }

      applyIndex(nextIndex);
      void startTrack(track, autoplay, position);
    },
    [applyIndex, startTrack],
  );

  const seek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      const target = Number(seconds);
      if (!Number.isFinite(target)) {
        return;
      }

      if (
        audio &&
        audio.src &&
        Number.isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        const clamped = Math.min(
          Math.max(0, target),
          Math.max(0, audio.duration - 0.35),
        );
        try {
          audio.currentTime = clamped;
        } catch {
          return;
        }
        timeRef.current = clamped;
        setCurrentTime(clamped);
        updatePositionState();
      } else {
        const clamped = Math.max(0, target);
        pendingSeekRef.current = clamped;
        timeRef.current = clamped;
        setCurrentTime(clamped);
      }
    },
    [updatePositionState],
  );

  const goNext = useCallback(
    (auto = false) => {
      const currentQueue = queueRef.current;
      if (currentQueue.length === 0) {
        return;
      }

      if (currentQueue.length === 1) {
        if (repeatRef.current === "all" || repeatRef.current === "one") {
          setActiveIndex(0, true, 0);
        } else {
          applyPlaying(false);
          setIsLoading(false);
        }
        return;
      }

      let nextIndex: number;

      if (shuffleRef.current) {
        nextIndex = indexRef.current;
        for (let attempt = 0; attempt < 12 && nextIndex === indexRef.current; attempt += 1) {
          nextIndex = Math.floor(Math.random() * currentQueue.length);
        }
        if (nextIndex === indexRef.current) {
          nextIndex = (indexRef.current + 1) % currentQueue.length;
        }
      } else {
        nextIndex = indexRef.current + 1;
        if (nextIndex >= currentQueue.length) {
          if (repeatRef.current === "all") {
            nextIndex = 0;
          } else if (auto) {
            applyPlaying(false);
            setIsLoading(false);
            return;
          } else {
            nextIndex = 0;
          }
        }
      }

      if (!auto) {
        const targetTrack = currentQueue[nextIndex];
        if (targetTrack) {
          failedIdsRef.current.delete(targetTrack.videoId);
        }
      }

      setActiveIndex(nextIndex, true, 0);
    },
    [applyPlaying, setActiveIndex],
  );

  const goPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      seek(0);
      return;
    }

    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) {
      return;
    }

    let previousIndex = indexRef.current - 1;
    if (previousIndex < 0) {
      previousIndex =
        repeatRef.current === "all" ? currentQueue.length - 1 : 0;
    }

    setActiveIndex(previousIndex, true, 0);
  }, [seek, setActiveIndex]);

  const play = useCallback(() => {
    const track = queueRef.current[indexRef.current];
    const audio = audioRef.current;
    if (!track) {
      return;
    }

    if (!audio || !audio.src) {
      void startTrack(track, true, pendingSeekRef.current);
      return;
    }

    if (audio.ended) {
      audio.currentTime = 0;
    }

    void attemptPlay(loadTokenRef.current);
  }, [attemptPlay, startTrack]);

  const pause = useCallback(() => {
    desiredPlayRef.current = false;
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    const track = queueRef.current[indexRef.current];
    const audio = audioRef.current;
    if (!track) {
      return;
    }

    if (!audio || !audio.src) {
      void startTrack(track, true, pendingSeekRef.current);
      return;
    }

    if (audio.paused) {
      if (audio.ended) {
        audio.currentTime = 0;
      }
      void attemptPlay(loadTokenRef.current);
    } else {
      desiredPlayRef.current = false;
      audio.pause();
    }
  }, [attemptPlay, startTrack]);

  const playQueue = useCallback(
    (
      tracks: Track[],
      startIndex = 0,
      options?: PlayQueueOptions,
    ) => {
      const validTracks = tracks.filter(isTrackLike);
      if (validTracks.length === 0) {
        return;
      }

      let nextQueue = validTracks;
      let nextIndex = Math.min(
        Math.max(0, Math.floor(startIndex)),
        validTracks.length - 1,
      );

      if (options?.shuffle) {
        nextQueue = shuffleTracks(validTracks);
        nextIndex = 0;
      }

      failedIdsRef.current.clear();
      applyQueue(nextQueue);
      setActiveIndex(nextIndex, true, 0);
    },
    [applyQueue, setActiveIndex],
  );

  const playTrack = useCallback(
    (track: Track) => {
      playQueue([track], 0);
    },
    [playQueue],
  );

  const playAt = useCallback(
    (index: number) => {
      const target = queueRef.current[index];
      if (!target) {
        return;
      }
      failedIdsRef.current.delete(target.videoId);
      setActiveIndex(index, true, 0);
    },
    [setActiveIndex],
  );

  const setRepeat = useCallback(
    (mode: RepeatMode) => {
      if (!isRepeatMode(mode)) {
        return;
      }
      applyRepeat(mode);
    },
    [applyRepeat],
  );

  const setShuffle = useCallback(
    (enabled: boolean) => {
      applyShuffle(Boolean(enabled));
    },
    [applyShuffle],
  );

  const toggleShuffle = useCallback(() => {
    applyShuffle(!shuffleRef.current);
  }, [applyShuffle]);

  const enqueue = useCallback(
    (tracks: Track[] | Track) => {
      const incoming = (Array.isArray(tracks) ? tracks : [tracks]).filter(
        isTrackLike,
      );
      if (incoming.length === 0) {
        return;
      }

      const existingIds = new Set(
        queueRef.current.map((track) => track.videoId),
      );
      const additions = incoming.filter(
        (track) => !existingIds.has(track.videoId),
      );

      if (additions.length === 0) {
        return;
      }

      applyQueue([...queueRef.current, ...additions]);

      if (indexRef.current < 0) {
        setActiveIndex(0, true, 0);
      }
    },
    [applyQueue, setActiveIndex],
  );

  const clear = useCallback(() => {
    loadTokenRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }

    sourceUrlsRef.current = [];
    sourceIndexRef.current = 0;
    pendingSeekRef.current = 0;
    timeRef.current = 0;
    failedIdsRef.current.clear();
    desiredPlayRef.current = false;

    applyQueue([]);
    applyIndex(-1);
    applyPlaying(false);
    setIsLoading(false);
    setIsBlocked(false);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setExpanded(false);

    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      } catch {
        // Media Session cleanup is best-effort.
      }
    }

    try {
      window.localStorage.removeItem(PLAYER_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, [applyIndex, applyPlaying, applyQueue]);

  const removeFromQueue = useCallback(
    (index: number) => {
      const currentQueue = queueRef.current;
      if (index < 0 || index >= currentQueue.length) {
        return;
      }

      const nextQueue = currentQueue.filter(
        (_, trackIndex) => trackIndex !== index,
      );

      if (nextQueue.length === 0) {
        clear();
        return;
      }

      const wasCurrent = index === indexRef.current;
      const wasPlaying = playingRef.current;

      applyQueue(nextQueue);

      if (wasCurrent) {
        const nextIndex = Math.min(index, nextQueue.length - 1);
        applyIndex(nextIndex);
        const nextTrack = nextQueue[nextIndex];
        if (nextTrack) {
          void startTrack(nextTrack, wasPlaying, 0);
        }
      } else if (index < indexRef.current) {
        applyIndex(indexRef.current - 1);
      }
    },
    [applyIndex, applyQueue, clear, startTrack],
  );

  const persist = useCallback(() => {
    try {
      if (queueRef.current.length === 0 || indexRef.current < 0) {
        window.localStorage.removeItem(PLAYER_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(
        PLAYER_STORAGE_KEY,
        JSON.stringify({
          queue: queueRef.current.slice(0, 100),
          index: indexRef.current,
          position: timeRef.current,
          repeat: repeatRef.current,
          shuffle: shuffleRef.current,
        }),
      );
    } catch {
      // Ignore quota or privacy-mode failures.
    }
  }, []);

  const isCurrentTrack = useCallback(
    (videoId: string) =>
      queueRef.current[indexRef.current]?.videoId === videoId,
    [],
  );

  useEffect(() => {
    const saved = readPersistedPlayer();
    if (!saved) {
      return;
    }

    applyQueue(saved.queue);
    applyIndex(saved.index);
    applyRepeat(saved.repeat);
    applyShuffle(saved.shuffle);
    pendingSeekRef.current = saved.position;
    timeRef.current = saved.position;
    setCurrentTime(saved.position);
    const restoredTrack = saved.queue[saved.index];
    setDuration(restoredTrack?.duration ?? 0);
    if (restoredTrack) {
      updateSessionMetadata(restoredTrack);
    }
  }, [applyIndex, applyQueue, applyRepeat, applyShuffle, updateSessionMetadata]);

  useEffect(() => {
    const timer = window.setInterval(persist, PERSIST_INTERVAL_MS);
    const onHide = () => persist();

    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      persist();
    };
  }, [persist]);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    const navigation = navigator as Navigator & {
      audioSession?: { type?: string };
    };

    if (navigation.audioSession) {
      try {
        navigation.audioSession.type = "playback";
      } catch {
        // audioSession is a Safari progressive enhancement.
      }
    }
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    const session = navigator.mediaSession;
    const handlers: Array<{
      action: MediaSessionAction;
      handler: (details: MediaSessionActionDetails) => void;
    }> = [
      { action: "play", handler: () => play() },
      { action: "pause", handler: () => pause() },
      { action: "previoustrack", handler: () => goPrevious() },
      { action: "nexttrack", handler: () => goNext(false) },
      {
        action: "seekto",
        handler: (details) => {
          if (typeof details.seekTime === "number") {
            seek(details.seekTime);
          }
        },
      },
      {
        action: "seekbackward",
        handler: (details) => {
          const current = audioRef.current?.currentTime ?? timeRef.current;
          seek(current - (details.seekOffset ?? 10));
        },
      },
      {
        action: "seekforward",
        handler: (details) => {
          const current = audioRef.current?.currentTime ?? timeRef.current;
          seek(current + (details.seekOffset ?? 10));
        },
      },
      {
        action: "stop",
        handler: () => {
          pause();
        },
      },
    ];

    for (const entry of handlers) {
      try {
        session.setActionHandler(entry.action, entry.handler);
      } catch {
        // Unsupported actions are safely ignored.
      }
    }

    return () => {
      for (const entry of handlers) {
        try {
          session.setActionHandler(entry.action, null);
        } catch {
          // Ignore cleanup failures.
        }
      }
    };
  }, [goNext, goPrevious, pause, play, seek]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {
      // Ignore unsupported states.
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    let unlocked = false;

    const unlock = () => {
      if (unlocked || indexRef.current >= 0) {
        return;
      }

      audio.muted = true;
      audio.src = SILENCE_SRC;
      void audio
        .play()
        .then(() => {
          unlocked = true;
          audio.muted = false;
          if (indexRef.current >= 0) {
            return;
          }
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
          window.removeEventListener("pointerdown", unlock);
          window.removeEventListener("touchend", unlock);
          window.removeEventListener("keydown", unlock);
        })
        .catch(() => {
          audio.muted = false;
        });
    };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("touchend", unlock, { passive: true });
    window.addEventListener("keydown", unlock);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchend", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const onLoadedMetadata = () => {
      const track = queueRef.current[indexRef.current];
      const total =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : (track?.duration ?? 0);

      if (total > 0) {
        setDuration(total);
      }

      if (pendingSeekRef.current > 0) {
        const maxPosition =
          (Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : total) - 0.5;
        const target = Math.min(
          pendingSeekRef.current,
          Math.max(0, maxPosition),
        );
        if (target > 0) {
          try {
            audio.currentTime = target;
          } catch {
            // Ignore invalid seek positions.
          }
        }
        timeRef.current = target;
        setCurrentTime(target);
        pendingSeekRef.current = 0;
      }

      setIsLoading(false);
    };

    const onDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      const time = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      timeRef.current = time;
      setCurrentTime(time);

      const now = Date.now();
      if (now - lastPositionUpdateRef.current > 900) {
        lastPositionUpdateRef.current = now;
        updatePositionState();
      }
    };

    const onPlaying = () => {
      applyPlaying(true);
      setIsLoading(false);
      setIsBlocked(false);
      blockedRef.current = false;
      setError(null);

      const track = queueRef.current[indexRef.current];
      if (track) {
        failedIdsRef.current.delete(track.videoId);
        recordPlay(track);
      }
      updatePositionState();
    };

    const onPlay = () => {
      applyPlaying(true);
    };

    const onPause = () => {
      applyPlaying(false);
    };

    const onWaiting = () => {
      if (desiredPlayRef.current) {
        setIsLoading(true);
      }
    };

    const onCanPlay = () => {
      setIsLoading(false);
    };

    const onEnded = () => {
      applyPlaying(false);

      if (repeatRef.current === "one") {
        audio.currentTime = 0;
        void attemptPlay(loadTokenRef.current);
        return;
      }

      goNext(true);
    };

    const onError = () => {
      if (indexRef.current < 0) {
        return;
      }

      const track = queueRef.current[indexRef.current];
      if (!track) {
        return;
      }

      const rawSrc = audio.getAttribute("src");
      if (!rawSrc || rawSrc === SILENCE_SRC) {
        return;
      }

      applyPlaying(false);
      setIsLoading(false);

      const nextSourceIndex = sourceIndexRef.current + 1;
      if (nextSourceIndex < sourceUrlsRef.current.length) {
        sourceIndexRef.current = nextSourceIndex;
        setError(null);
        setIsLoading(true);
        pendingSeekRef.current = timeRef.current;
        applySource(
          sourceUrlsRef.current[nextSourceIndex]!,
          timeRef.current,
          desiredPlayRef.current,
          loadTokenRef.current,
        );
        return;
      }

      if (!retriedProviderRef.current) {
        retriedProviderRef.current = true;
        sourceCacheRef.current.delete(track.videoId);
        const token = loadTokenRef.current;
        setIsLoading(true);
        setError("Reconnecting audio…");

        void fetchSources(track, true)
          .then((urls) => {
            if (token !== loadTokenRef.current) {
              return;
            }
            sourceUrlsRef.current = urls;
            sourceIndexRef.current = 0;
            applySource(
              urls[0]!,
              timeRef.current,
              desiredPlayRef.current,
              token,
            );
          })
          .catch(() => {
            if (token !== loadTokenRef.current) {
              return;
            }
            failedIdsRef.current.add(track.videoId);
            setIsLoading(false);
            if (
              failedIdsRef.current.size < queueRef.current.length &&
              queueRef.current.length > 1
            ) {
              setError("This track isn't playable — skipping.");
              window.setTimeout(() => goNext(true), 900);
            } else {
              applyPlaying(false);
              setError("No playable tracks right now. Try another search.");
            }
          });
        return;
      }

      failedIdsRef.current.add(track.videoId);

      if (
        failedIdsRef.current.size < queueRef.current.length &&
        queueRef.current.length > 1
      ) {
        setError("This track isn't playable — skipping.");
        window.setTimeout(() => goNext(true), 600);
      } else {
        applyPlaying(false);
        setError("No playable tracks right now. Try another search.");
      }
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [
    applyPlaying,
    applySource,
    attemptPlay,
    fetchSources,
    goNext,
    recordPlay,
    updatePositionState,
  ]);

  const current = currentIndex >= 0 ? (queue[currentIndex] ?? null) : null;

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      current,
      currentIndex,
      isPlaying,
      isLoading,
      isBlocked,
      error,
      currentTime,
      duration,
      repeat,
      shuffle,
      isExpanded,
      playQueue,
      playTrack,
      playAt,
      toggle,
      play,
      pause,
      next: () => goNext(false),
      previous: goPrevious,
      seek,
      setRepeat,
      setShuffle,
      toggleShuffle,
      enqueue,
      removeFromQueue,
      clear,
      setExpanded,
      isCurrentTrack,
    }),
    [
      queue,
      current,
      currentIndex,
      isPlaying,
      isLoading,
      isBlocked,
      error,
      currentTime,
      duration,
      repeat,
      shuffle,
      isExpanded,
      playQueue,
      playTrack,
      playAt,
      toggle,
      play,
      pause,
      goNext,
      goPrevious,
      seek,
      setRepeat,
      setShuffle,
      toggleShuffle,
      enqueue,
      removeFromQueue,
      clear,
      isCurrentTrack,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        playsInline
        className="pointer-events-none fixed h-px w-px overflow-hidden opacity-0"
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used inside PlayerProvider.");
  }
  return context;
}
