/* 
    scripted.js
    
    JavaScript library for scripted animations build on html, css and javascript.
    
    Copyright (C) 2023 - present: Stephan Cieszynski

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

class scripted {

    static labels = {}

    static play = async (by, from) => {
        console.assert(!isNaN(by), '<by> has to be a number');
        console.assert(0 <= ~~by, '<by> has to be a positive number');
        // helper to synchronize all animations
        let currentTime = 0;

        document
            .getAnimations()
            .forEach((animation) => {
                // synchronize and seek
                currentTime = animation.currentTime = scripted.labels?.[from] ?? from ?? animation.currentTime;
                animation.play();
            });

        return Promise.resolve(
            document.body
                .animate([], { duration: Math.abs(by) })
                .finished.then((e) => {
                    // set currentTime to the exact value
                    currentTime += by;
                    document
                        .getAnimations()
                        .forEach((animation) => {
                            animation.pause();
                            // synchronize currentTime
                            animation.currentTime = currentTime;
                        });
                    return currentTime;
                }));
    }

    static tween = (element, ...args) => {
        console.assert(element instanceof HTMLElement);

        const tweens = args.pop();
        const pseudoElement = args.pop();   // could be null

        const options = { duration: 0, pseudoElement: pseudoElement, fill: 'forwards' };
        const keyFrames = [];

        Object
            .entries(tweens)
            // sort in descending order to obtain
            // the highest time value for calculating the duration
            .sort(([keyA, ObjA], [keyB, objB]) => { return keyB - keyA })
            .forEach(([timeOrOpts, data], idx) => {
                // distinct between times and options
                if (isNaN(timeOrOpts)) {
                    options[timeOrOpts] = data;
                } else {
                    // idx==0: the first entry give the highest
                    // time value for calculating the duration
                    if (!idx) { options.duration = timeOrOpts * 1; }

                    // calculate offset relative by time / duration
                    data.offset = timeOrOpts / options.duration;
                    keyFrames.push(data);
                }
            });

        // sort keyframes by offset in ascending order,
        // otherwise creating KeyframeEffect raises an error
        keyFrames.sort((a, b) => a.offset - b.offset);

        const keyframeEffect = new KeyframeEffect(element, keyFrames, options);
        const animation = new Animation(keyframeEffect);
        animation.pause();

        return animation;
    }

    static group = (time, ...args) => {
        console.assert(!isNaN(time));
        console.assert(args.every((arg) => ['Array', 'Animation'].includes(arg.constructor.name)));

        const animations = []

        for (const arg of args) {
            if (Array.isArray(arg)) {
                arg.forEach((anim) => {
                    const timing = anim.effect.getComputedTiming();
                    timing.delay += time;
                    anim.effect.updateTiming(timing);
                    animations.push(anim);
                });
            } else {
                const timing = arg.effect.getComputedTiming();
                timing.delay += time;
                arg.effect.updateTiming(timing);
                animations.push(arg);
            }
        }

        return animations;
    }

    static sequence = (time, ...args) => {
        console.assert(!isNaN(time));
        console.assert(args.every((arg) => ['Array', 'Animation', 'String'].includes(arg.constructor.name)));

        const animations = []

        for (const arg of args) {
            if (Array.isArray(arg)) {
                let duration = 0;

                arg.forEach((anim) => {
                    const timing = anim.effect.getComputedTiming();
                    timing.delay += time;
                    duration = Math.max(duration, timing.duration);
                    anim.effect.updateTiming(timing);
                    animations.push(anim);
                });

                time += duration;
            } else switch (arg.constructor.name) {
                case 'String':
                    console.log(arg, time)
                    scripted.labels[arg] = time;
                    break;
                default:
                    const timing = arg.effect.getComputedTiming();
                    timing.delay += time;
                    time += timing.duration;
                    arg.effect.updateTiming(timing);
                    animations.push(arg);
            }
        }

        return animations;
    }
}