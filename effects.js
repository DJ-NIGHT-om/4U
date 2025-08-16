// Confetti and other visual effects
(function() {
    'use strict';

    /* @tweakable The number of confetti particles to launch. */
    const particleCount = 200;
    /* @tweakable How wide the confetti spread is, in degrees. */
    const spread = 100;
    /* @tweakable The starting velocity of the confetti. */
    const startVelocity = 45;
    /* @tweakable The colors to use for the confetti particles. */
    const confettiColors = ['#4a90e2', '#f5a623', '#2dce89', '#f5365c', '#ffffff'];
    /* @tweakable How far offscreen the confetti should travel. 1 is the edge of the screen. */
    const scalar = 1.2;

    /**
     * Triggers a confetti animation to celebrate an achievement.
     */
    function triggerWelcomeConfetti() {
        if (typeof confetti !== 'function') {
            console.error('Confetti library is not loaded.');
            return;
        }

        function realisticLookingConfetti(angle, origin) {
            confetti({
                particleCount: particleCount,
                angle: angle,
                spread: spread,
                startVelocity: startVelocity,
                colors: confettiColors,
                origin: origin,
                scalar: scalar
            });
        }
        
        // Launch confetti from both sides of the screen
        realisticLookingConfetti(60, { x: 0 });
        realisticLookingConfetti(120, { x: 1 });
    }

    // Make function globally accessible
    window.triggerWelcomeConfetti = triggerWelcomeConfetti;

})();