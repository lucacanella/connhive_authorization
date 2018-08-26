/**
 * Utilities
 * @file profile.js
 */

const NANOSECONDS_TO_MS = 1 / 1000000
    , profiling = {}
    ;

var profilingCount = 0;

module.exports = {
    profileStart(label) {
        let time = process.hrtime();
        profiling[profilingCount] = {
            label: label,
            time: time
        };
        this.log(this.LOG.PROFILING, 'Start', label, profilingCount, time);
        return profilingCount++;
    },
    /**
     * Calculates elapsed time and logs results.
     * @param {int} idx a string that identifies the method being profiled
     * @param {array[int]} start start time as of process.hrtime() call
     */
    profileEnd(idx) {
        let profile = profiling[idx];
        if(!profile) {
            this.log(this.LOG.WARNING, 'Missing profile key', idx);
            return;
        }
        let start = profile.time
          , end = process.hrtime()
          , elapsedMs = (end[0] - start[0]) * 1000 + (end[1] - start[1]) * NANOSECONDS_TO_MS;
        this.log(this.LOG.PROFILING, 'End', profile.label, idx, elapsedMs, 'ms');
        profiling[idx] = null;
    },
    /**
     * Log levels
     */
    LOG: {
        ERROR: 1,
        WARNING: 2,
        INFO: 4,
        VERBOSE: 16,
        DEBUG: 64,
        PROFILING: 128
    },
    /**
     * Logs something.
     */
    log(level, ...args) {
        args.unshift(level);
        console.log.apply(console, args);
    }
};