// Simple notification sound using Web Audio API
export function playNotificationSound() {
    if (typeof window === "undefined") return;

    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create a simple beep sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // Frequency in Hz
        oscillator.type = "sine";
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        // Audio not supported or blocked
        console.log("Audio notification not available");
    }
}

// Success sound - two quick beeps
export function playSuccessSound() {
    if (typeof window === "undefined") return;

    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const playBeep = (time: number, frequency: number) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = "sine";
            
            gainNode.gain.setValueAtTime(0.2, time);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
            
            oscillator.start(time);
            oscillator.stop(time + 0.15);
        };
        
        playBeep(audioContext.currentTime, 600);
        playBeep(audioContext.currentTime + 0.15, 900);
    } catch (e) {
        console.log("Audio notification not available");
    }
}

