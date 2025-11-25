// hooks/useAnimationPlayback.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import { type AppState, type AppAction } from '../types';

interface UseAnimationPlaybackProps {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
}

export const useAnimationPlayback = ({ state, dispatch }: UseAnimationPlaybackProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const animationFrameRef = useRef<number | undefined>();
    const lastTimeRef = useRef<number>(0);
    const playbackProgressRef = useRef<number>(0);
    const currentFramePairRef = useRef<{ from: number; to: number }>({ from: 0, to: 1 });

    const animate = useCallback((timestamp: number) => {
        if (!isPlaying || state.frames.length < 2) {
            animationFrameRef.current = undefined;
            return;
        }
        
        if (lastTimeRef.current === 0) {
            lastTimeRef.current = timestamp;
        }
        
        const deltaTime = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;
        
        playbackProgressRef.current += (deltaTime / 2000) * playbackSpeed;
        
        if (playbackProgressRef.current >= 1) {
            const nextFromIndex = (currentFramePairRef.current.to) % state.frames.length;
            const nextToIndex = (nextFromIndex + 1) % state.frames.length;
            
            currentFramePairRef.current = { from: nextFromIndex, to: nextToIndex };
            playbackProgressRef.current = 0;
            
            dispatch({ type: "SET_CURRENT_FRAME", frameIndex: nextFromIndex });
            
            if (nextFromIndex === 0) {
                setIsPlaying(false);
                return;
            }
        }
        
        dispatch({
            type: "INTERPOLATE_FRAMES",
            fromIndex: currentFramePairRef.current.from,
            toIndex: currentFramePairRef.current.to,
            t: playbackProgressRef.current,
        });
        
        animationFrameRef.current = requestAnimationFrame(animate);
    }, [isPlaying, state.frames.length, playbackSpeed, dispatch]);

    useEffect(() => {
        if (isPlaying && state.frames.length >= 2) {
            lastTimeRef.current = 0;
            playbackProgressRef.current = 0;
            currentFramePairRef.current = { 
                from: state.currentFrameIndex, 
                to: (state.currentFrameIndex + 1) % state.frames.length 
            };
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = undefined;
            }
        }
        
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, animate, state.frames.length, state.currentFrameIndex]);

    return {
        isPlaying,
        setIsPlaying,
        playbackSpeed,
        setPlaybackSpeed,
        currentFramePairRef,
    };
};