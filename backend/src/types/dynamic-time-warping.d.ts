declare module 'dynamic-time-warping' {
    class DynamicTimeWarping {
        constructor(
            series1: number[],
            series2: number[],
            distanceFunction: (a: number, b: number) => number
        );
        getDistance(): number;
        getPath(): number[][];
    }
    export = DynamicTimeWarping;
}
